"""Decoder for the wiki's augment-slot templates.

Six template families describe the sockets an item carries, and until this
module existed the pipeline recognized one shape of one of them. The single
extractor was ``re.search(r"\\{\\{[Aa]ugment\\|(\\w+)\\}\\}")``, which cannot
match past a second parameter — so ``{{Augment|Purple|nocat=TRUE}}`` (578
occurrences) was dropped alongside every crafting family: ``Lamordia Slot``
(1,055), ``MoonSunAugment`` (540), ``Dino Slot`` (441) and ``Slaver's Slot``
(30). The first three were listed in ``_METADATA_TEMPLATES`` as "stored
elsewhere" while nothing stored them; the last fell through to the effect
parser and became 30 junk ``item_effects`` rows.

Semantics come from each template's own source (invariant 7):

* **``Augment``** — one parameter, the colour, defaulting to ``Colorless``
  (``{{{1|Colorless}}}``) and folded through ``{{ucfirst:{{lc:...}}}}`` before a
  ``#switch`` matches it. ``violet`` shares purple's branch. ``nocat`` is
  categorization control with no data meaning. The popup's colour-acceptance
  rules (orange sockets take orange/red/yellow gems, and so on) are picker facts
  for Phase 8, not per-item data.
* **``MoonSunAugment``** — deprecated; its whole body is ``{{Augment|{{{1}}}}}``.
  A pure alias, decoded identically rather than as a family of its own.
* **``Lamordia Slot|Type1|Type2``** — Viktranium Experiment crafting. Type1 is
  the slot variant, Type2 names which augment pool fits it.
* **``Dino Slot|Type1|Type2``** — Isle of Dread dinosaur-bone crafting, same
  shape, plus a ``Set`` branch that is the set-bonus slot and takes no pool.
* **``Slaver's Slot|Type|Prefix``** — Slave Lords crafting; parameter 2 is empty
  (heroic) or ``Legendary``.

``UpgradeableAugment`` is deliberately **not** here. It marks an item that *can
be upgraded* at the Fountain of Necrotic Might to gain a slot, not one that
carries a slot today, so it routes through the effects path as the potential
effect ``Upgradeable Augment``.

The vocabulary is the whole point of the module, and it is closed: 44 sockets,
each stored once as an ``augment_slot_types`` row that both ``item_augment_slots``
and ``augments`` point at by id. The label is composed here (``slot_label``),
enumerated here (``known_slot_definitions``) and read back here
(``decompose_label``), so no consumer ever parses one. The strings match
``augments.slot_color`` — ``lamordia: miserable (weapon)``,
``isle of dread: set bonus``, ``sun`` — deliberately: that wiki-sourced column is
the display fallback the definitions row is recognized by when the FK is
backfilled.

This module answers "what does the template mean"; it resolves nothing against
the database and normalizes no strings — both belong to ``db/writers.py``
(invariant 3).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .templates import iter_templates

# Two or more list separators in a row, left behind when a slot template is
# lifted out from between two enchantments.
_SEPARATOR_RUN_RE = re.compile(r"(?:\s*[,;]\s*){2,}")

# ---------------------------------------------------------------------------
# The grammar, one table per family
# ---------------------------------------------------------------------------

#: ``Template:Augment``'s ``#switch`` cases, lower-cased.
STANDARD_COLORS: frozenset[str] = frozenset({
    "blue", "colorless", "green", "orange", "purple", "red", "yellow",
    "moon", "sun",
})

# ``|purple|violet =`` is one case in the switch, so the two spellings are the
# same socket rather than two colours.
_COLOR_ALIASES: dict[str, str] = {"violet": "purple"}

#: ``{{{1|Colorless}}}`` — an absent or empty colour is not an error.
_DEFAULT_COLOR = "colorless"

# Which augment pool a family slot draws from. Both crafting families use the
# same three, because the pool is a property of the item kind, not the family.
_POOLS: frozenset[str] = frozenset({"accessory", "armor", "weapon"})


@dataclass(frozen=True)
class _Family:
    """One crafting family's parameter grammar and label prefix."""

    name: str
    prefix: str
    variants: frozenset[str]
    qualifiers: frozenset[str]
    #: True when parameter 2 is part of the slot's identity (the augment pool)
    #: rather than an optional grade.
    qualifier_required: bool


_FAMILIES: dict[str, _Family] = {
    "lamordia slot": _Family(
        name="lamordia",
        prefix="lamordia",
        variants=frozenset({"dolorous", "melancholic", "miserable", "woeful"}),
        qualifiers=_POOLS,
        qualifier_required=True,
    ),
    "dino slot": _Family(
        name="dino",
        # The wiki calls the family "Dino" and the labels "Isle of Dread"; the
        # label is what `augments.slot_color` stores, so it wins.
        prefix="isle of dread",
        variants=frozenset({"claw", "fang", "horn", "scale", "set"}),
        qualifiers=_POOLS,
        qualifier_required=True,
    ),
    "slaver's slot": _Family(
        name="slavers",
        prefix="slaver's",
        variants=frozenset({"augment", "bonus", "extra", "prefix", "suffix"}),
        qualifiers=frozenset({"legendary"}),
        qualifier_required=False,
    ),
}

# The two template names that decode to a bare colour. MoonSunAugment expands
# to {{Augment|{{{1}}}}} verbatim, so it is an alias and not a family.
_STANDARD_TEMPLATES: frozenset[str] = frozenset({"augment", "moonsunaugment"})

#: Family variants that are a slot in their own right and take no qualifier.
#: ``{{Dino Slot|Set}}`` is the set-bonus socket, whose stored label carries no
#: pool because no pool applies.
_STANDALONE_LABELS: dict[tuple[str, str], str] = {
    ("dino", "set"): "isle of dread: set bonus",
}

_PREFIX_BY_FAMILY: dict[str, str] = {f.name: f.prefix for f in _FAMILIES.values()}

_FAMILY_BY_PREFIX: dict[str, _Family] = {f.prefix: f for f in _FAMILIES.values()}

#: Reverse of ``_STANDALONE_LABELS`` — the label back to the slot it names.
_STANDALONE_BY_LABEL: dict[str, tuple[str, str]] = {
    label: key for key, label in _STANDALONE_LABELS.items()
}

#: One ``augment_slot_types`` row: ``(label, family, variant, qualifier)``.
SlotDefinition = tuple[str, str, str, str | None]


def slot_label(family: str, variant: str, qualifier: str | None) -> str:
    """Compose the canonical ``augment_slot_types.label`` value.

    The one place the vocabulary is defined. Standard colours stay bare, the
    way the already-stored rows are written; family slots carry a ``prefix: ``
    so the label reads as a whole thought on its own — it is also the string
    ``augments.slot_color`` speaks, which is what lets the definitions row and
    the wiki-sourced display fallback be recognized as the same socket.
    """
    override = _STANDALONE_LABELS.get((family, variant))
    if override is not None:
        return override
    if family == "standard":
        return variant
    prefix = _PREFIX_BY_FAMILY[family]
    if qualifier:
        return f"{prefix}: {variant} ({qualifier})"
    return f"{prefix}: {variant}"


@dataclass(frozen=True)
class AugmentSlot:
    """One decoded slot invocation.

    ``family`` is ``standard`` for a colour socket and the crafting family's
    short name otherwise; ``variant`` is the colour or the family's first
    parameter; ``qualifier`` is the augment pool (Lamordia/Dino) or the
    ``Legendary`` grade (Slaver's), all lower-cased the way the templates fold
    them.
    """

    family: str
    variant: str
    qualifier: str | None = None

    @property
    def label(self) -> str:
        """The canonical string stored in ``augment_slot_types.label``."""
        return slot_label(self.family, self.variant, self.qualifier)


def known_slot_definitions() -> tuple[SlotDefinition, ...]:
    """Every socket the grammar can describe, as ``augment_slot_types`` rows.

    The vocabulary is closed and small (44 sockets), so it can be stated in
    full — which is what ``db/validate.py`` asserts the stored definitions
    against. Rows are still written lazily, one per socket actually seen on an
    item, so the table says which sockets *exist* rather than which could.
    """
    definitions: list[SlotDefinition] = [
        (color, "standard", color, None) for color in sorted(STANDARD_COLORS)
    ]
    for family in sorted(_FAMILIES.values(), key=lambda f: f.name):
        for variant in sorted(family.variants):
            if (family.name, variant) in _STANDALONE_LABELS:
                qualifiers: list[str | None] = [None]
            elif family.qualifier_required:
                qualifiers = sorted(family.qualifiers)  # type: ignore[assignment]
            else:
                # Parameter 2 is a grade rather than the slot's identity, so
                # both the plain and the qualified socket exist.
                qualifiers = [None, *sorted(family.qualifiers)]
            definitions.extend(
                (slot_label(family.name, variant, q), family.name, variant, q)
                for q in qualifiers
            )
    return tuple(definitions)


def decompose_label(label: str) -> AugmentSlot | None:
    """Read a canonical label back into the slot it names — ``slot_label``'s inverse.

    Two callers need this. The writer resolves a decoded slot's label to an
    ``augment_slot_types`` row, and has to supply the family columns when that
    row is new; the in-place shape migration has nothing *but* the stored labels
    to rebuild the definitions from.

    Exact rather than forgiving: only a string ``slot_label`` could have
    composed decodes here. ``Green`` and ``violet`` are declined even though the
    template decoder accepts both, because normalization belongs at the writer
    boundary (invariant 3) — a label reaching this function unnormalized was
    never composed by this module, and folding it silently would let the
    migration invent a definitions row for a value outside the vocabulary.
    """
    standalone = _STANDALONE_BY_LABEL.get(label)
    if standalone is not None:
        return AugmentSlot(*standalone)

    prefix, separator, rest = label.partition(": ")
    if not separator:
        return AugmentSlot("standard", label) if label in STANDARD_COLORS else None

    family = _FAMILY_BY_PREFIX.get(prefix)
    if family is None:
        return None

    variant, qualifier = rest, None
    if rest.endswith(")"):
        variant, bracket, tail = rest.rpartition(" (")
        if not bracket:
            return None
        qualifier = tail[:-1]

    if variant not in family.variants:
        return None
    if (family.name, variant) in _STANDALONE_LABELS:
        # The Set slot has exactly one label, matched above. Anything else
        # claiming that variant is carrying a pool it cannot have.
        return None
    if qualifier is None:
        return None if family.qualifier_required else AugmentSlot(family.name, variant)
    if qualifier not in family.qualifiers:
        return None
    return AugmentSlot(family.name, variant, qualifier)


def parse_augment_slot(text: str) -> AugmentSlot | None:
    """Decode the first augment-slot template in *text*, or None.

    Returns None when *text* holds no slot template and when one is malformed —
    an unknown colour, variant or pool. Declining rather than guessing keeps the
    invocation flowing to the router's metadata step, which is where the wiki's
    own ``#default`` error branches belong.
    """
    for template in iter_templates(text):
        slot = _decode(template.name, template.positional())
        if slot is not None:
            return slot
    return None


def parse_slot_color(value: str) -> AugmentSlot | None:
    """Decode a bare colour word, for the legacy ``augmentslot=`` infobox field.

    That field predates the templates and holds a plain word rather than an
    invocation, but it feeds the same column, so it has to speak the same
    vocabulary — an unrecognized value like ``One colorless augment slot`` has
    no ``augment_slot_types`` row to resolve to, and the writer would drop the
    socket rather than store it. Anything outside the ``{{Augment}}`` switch
    declines here instead, where the value is still visible. No page in the
    cache still uses the field, so declining costs nothing today and stays safe
    if one comes back.
    """
    if not value.strip():
        return None
    return _decode_color([value])


def extract_augment_slots(text: str) -> tuple[list[AugmentSlot], str]:
    """Split *text* into the slots it declares and everything else.

    One wiki bullet can hold a slot template *and* a real enchantment
    (``{{Lamordia Slot|Woeful|Weapon}}, {{SpellPower|Radiance|84}}``). Consuming
    the whole entry on a slot match is how those enchantments were lost, so the
    remainder comes back for the caller to keep routing. An invocation the
    decoder declines stays in the remainder too — nothing disappears here.
    """
    slots: list[AugmentSlot] = []
    kept: list[str] = []
    cursor = 0
    for template in iter_templates(text):
        slot = _decode(template.name, template.positional())
        if slot is None:
            continue
        # `iter_templates` walks left to right and reports each invocation's
        # exact source, so searching forward from the cursor finds this
        # occurrence and not an identical earlier one.
        start = text.find(template.raw, cursor)
        if start == -1:
            continue
        slots.append(slot)
        kept.append(text[cursor:start])
        cursor = start + len(template.raw)
    kept.append(text[cursor:])

    remainder = " ".join("".join(kept).split())
    # Removing a slot from between two enchantments leaves the punctuation that
    # separated it from both — "Deathblock, , Vorpal". The survivors are still
    # one list, so the run of separators collapses to one.
    remainder = _SEPARATOR_RUN_RE.sub(", ", remainder)
    return slots, remainder.strip(" ,;")


def _decode(name: str, params: list[str]) -> AugmentSlot | None:
    """Decode one template invocation by name and positional parameters."""
    key = name.strip().lower().replace("_", " ")
    if key in _STANDARD_TEMPLATES:
        return _decode_color(params)
    family = _FAMILIES.get(key)
    if family is None:
        return None
    return _decode_family(family, params)


def _decode_color(params: list[str]) -> AugmentSlot | None:
    raw = params[0].strip().lower() if params else ""
    color = _COLOR_ALIASES.get(raw, raw) or _DEFAULT_COLOR
    if color not in STANDARD_COLORS:
        return None
    return AugmentSlot("standard", color)


def _decode_family(family: _Family, params: list[str]) -> AugmentSlot | None:
    if not params:
        return None
    variant = params[0].strip().lower()
    if variant not in family.variants:
        return None
    qualifier = params[1].strip().lower() if len(params) > 1 else ""

    if (family.name, variant) in _STANDALONE_LABELS:
        # {{Dino Slot|Set}} and {{Dino Slot|Set|}} are the same slot: the empty
        # positional parameter is a trailing pipe, not a pool.
        return None if qualifier else AugmentSlot(family.name, variant)

    if not qualifier:
        return None if family.qualifier_required else AugmentSlot(family.name, variant)
    if qualifier not in family.qualifiers:
        return None
    return AugmentSlot(family.name, variant, qualifier)
