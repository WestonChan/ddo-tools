"""Decoder for ``{{Enhancement bonus|kind|magnitude[|implement]}}``.

The wiki's single most-used item template — 5,239 invocations across 5,011
cached pages — and until this module existed the pipeline stored **none** of
them. ``_METADATA_TEMPLATES`` listed it as "metadata, stored in dedicated
columns", and the only writer for that supposed column read an item-infobox
field (``enchantmentbonus``) the wiki has never used, so the router's metadata
step dropped every occurrence on the floor.

Semantics come from ``Template:Enhancement bonus``'s own source. It is two
``{{#switch:{{lc:{{{1}}}}}}}`` blocks — hence nine kinds from six letters, and
hence ``I`` and ``i`` being the same kind:

* **implement switch** — ``i``, ``ii``, ``io``, ``oi``, ``si`` render a
  Spellcasting Implement line worth ``{{{3|+{{#expr:{{{2|1}}}*3}}}}}``: param 3
  when supplied, the magnitude times three otherwise.
* **enhancement switch** — ``a`` gives Armor Class; ``s``/``si`` give Armor
  Class, attack and damage; ``w``/``i``/``ii`` give attack and damage;
  ``o``/``oi`` give an *Orb Bonus* rather than an enhancement bonus; ``io``'s
  branch is deliberately empty (implement only); anything else renders an
  editor-facing error.

Two shapes are easy to get wrong and both are real:

* **Magnitude 0 is the word "Masterwork"**, not ``+0``
  (``{{#ifeq:{{{2|0}}}|0|[[Masterwork]]|…}}``), on every branch except the orb
  one. It is a named item property whose meaning varies by kind — a weapon gains
  +1 to hit, armor sheds 1 armor check penalty — so it belongs in ``effects``,
  not as a bonus row that would sum to nothing.
* **Negative magnitudes are legitimate.** Cursed gear carries them and the
  template documents ``{{Enhancement bonus|w|-2}}`` as an example. The value and
  the generated name both have to keep the sign (ETL invariant 6).

This module answers "what does the template mean"; it resolves nothing against
the database and normalizes no strings — both belong to ``db/writers.py``
(invariant 3).
"""

from __future__ import annotations

from dataclasses import dataclass

from ..enums import BonusType, S
from .templates import iter_templates

# The four spellings that occur in the cache: "Enhancement bonus" (4,773),
# "Enhancement_bonus" (429), "enhancement bonus" (36), "enhancement_bonus" (1).
# MediaWiki treats underscore and space in a page name as the same character.
_TEMPLATE_NAME = "enhancement bonus"

#: The ``effects`` row a magnitude of 0 produces.
MASTERWORK_EFFECT = "Masterwork"

# Which stats the *enhancement* half of the template applies to, keyed by the
# lowercased kind. Order follows the template's own prose so the rows read the
# way the wiki renders them. An empty tuple is meaningful: ``io`` is
# "spellcasting implement only (no enhancement bonus)".
_ENHANCEMENT_STATS: dict[str, tuple[S, ...]] = {
    "a": (S.ARMOR_CLASS,),
    "s": (S.ARMOR_CLASS, S.ATTACK_BONUS, S.DAMAGE_BONUS),
    "si": (S.ARMOR_CLASS, S.ATTACK_BONUS, S.DAMAGE_BONUS),
    "w": (S.ATTACK_BONUS, S.DAMAGE_BONUS),
    "i": (S.ATTACK_BONUS, S.DAMAGE_BONUS),
    "ii": (S.ATTACK_BONUS, S.DAMAGE_BONUS),
    "o": (S.SAVING_THROWS,),
    "oi": (S.SAVING_THROWS,),
    "io": (),
}

# The first switch's case list, verbatim: ``|i|ii|io|oi|si``.
_IMPLEMENT_KINDS: frozenset[str] = frozenset({"i", "ii", "io", "oi", "si"})

# ``o``/``oi`` render "+N Orb Bonus", a distinct bonus type. Filed as
# Enhancement it would stack-replace a real enhancement bonus in the stats
# engine, which is a wrong answer rather than a missing one.
_ORB_KINDS: frozenset[str] = frozenset({"o", "oi"})

# Every enhancement branch is wrapped in ``{{#ifeq:{{{2|0}}}|0|[[Masterwork]]``
# except the orb one, which has no such guard.
_MASTERWORK_KINDS: frozenset[str] = frozenset(_ENHANCEMENT_STATS) - _ORB_KINDS - {"io"}

#: The template's implement default: ``{{#expr:{{{2}}}*3}}``.
_IMPLEMENT_MULTIPLIER = 3


@dataclass(frozen=True)
class EnhancementBonus:
    """One decoded invocation.

    ``bonuses`` uses the ``{"stat", "bonus_type", "value"}`` shape the item
    router's stat-bonus step already consumes, so the rows reach
    ``item_bonuses`` through the existing insert path rather than a parallel
    one. ``effects`` names ``item_effects`` rows (only ever ``Masterwork``).
    Either list may be empty while the invocation is still well-formed.
    """

    kind: str
    bonuses: tuple[dict, ...]
    effects: tuple[str, ...]


def _magnitude(raw: str) -> int | None:
    """Parse a magnitude parameter, or None when it is not a number.

    Accepts the leading ``+`` one cached page writes (``|a|+12``) and the
    leading ``-`` cursed gear needs. An empty or non-numeric magnitude is not an
    error the pipeline should raise on — the wiki renders those as a template
    error, and the right response is to store nothing.
    """
    text = raw.strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def parse_enhancement_bonus(text: str) -> EnhancementBonus | None:
    """Decode an ``{{Enhancement bonus|...}}`` invocation found in *text*.

    Returns None when *text* holds no such template, or when its kind is one the
    template itself rejects (the ``#default`` branch renders
    "Invalid Type Parameter"). Declining rather than returning an empty result
    matters: the router's later steps then get their normal shot at the string,
    and a malformed invocation ends up skipped as metadata instead of silently
    swallowed here.
    """
    template = _find(text)
    if template is None:
        return None

    params = template.positional()
    if not params:
        return None

    # {{lc:{{{1}}}}} — the switch folds case before matching, so "I" is "i".
    kind = params[0].strip().lower()
    if kind not in _ENHANCEMENT_STATS:
        return None

    magnitude = _magnitude(params[1]) if len(params) > 1 else None
    override = _magnitude(params[2]) if len(params) > 2 else None

    bonuses: list[dict] = []
    effects: list[str] = []

    # {{{3|+{{#expr:{{{2|1}}}*3}}}}} — param 3 replaces the computed default
    # outright. It is not the item's minimum level, however well 426 of the 459
    # three-param invocations happen to match one.
    if kind in _IMPLEMENT_KINDS:
        implement = override
        if implement is None and magnitude is not None:
            implement = magnitude * _IMPLEMENT_MULTIPLIER
        if implement is not None:
            bonuses.append({
                "stat": str(S.UNIVERSAL_SPELL_POWER),
                "bonus_type": str(BonusType.IMPLEMENT),
                "value": implement,
            })

    if magnitude == 0 and kind in _MASTERWORK_KINDS:
        effects.append(MASTERWORK_EFFECT)
    elif magnitude is not None:
        bonus_type = BonusType.ORB if kind in _ORB_KINDS else BonusType.ENHANCEMENT
        for stat in _ENHANCEMENT_STATS[kind]:
            bonuses.append({
                "stat": str(stat),
                "bonus_type": str(bonus_type),
                "value": magnitude,
            })

    return EnhancementBonus(
        kind=kind, bonuses=tuple(bonuses), effects=tuple(effects),
    )


def _find(text: str):
    """The first ``{{Enhancement bonus}}`` template in *text*, or None.

    Goes through ``iter_templates`` rather than a fresh ``\\{\\{...\\}\\}``
    regex (invariant 1): the brace counter is what keeps a nested template in
    its parent's parameter instead of ending the match early.
    """
    for template in iter_templates(text):
        if template.name.strip().lower().replace("_", " ") == _TEMPLATE_NAME:
            return template
    return None
