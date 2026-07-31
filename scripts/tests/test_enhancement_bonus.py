"""Tests for the ``{{Enhancement bonus|kind|magnitude[|implement]}}`` decoder.

Expectations are derived from ``Template:Enhancement bonus``'s own source (read
via ``action=raw``), not from the implementation. The template is a pair of
``{{#switch:{{lc:{{{1}}}}}}}`` blocks:

* the first fires for ``i``/``ii``/``io``/``oi``/``si`` and renders a
  Spellcasting Implement line worth ``{{{3|+{{#expr:{{{2|1}}}*3}}}}}`` — param 3
  when supplied, otherwise the magnitude times three;
* the second renders the enhancement bonus itself, and its branches are
  ``a`` (Armor Class), ``s``/``si`` (Armor Class, attack and damage rolls),
  ``w``/``i``/``ii`` (attack and damage rolls), ``o``/``oi`` (Orb Bonus) and
  ``io`` (deliberately empty — implement only).

``{{#ifeq:{{{2|0}}}|0|[[Masterwork]]|...}}`` guards every branch except the orb
one, so a magnitude of 0 renders the word "Masterwork" rather than ``+0``, and
``{{#ifexpr:{{{2|0}}}<0|...}}`` is what makes negative magnitudes a documented
shape rather than an accident.

Before this decoder existed the template was listed in ``_METADATA_TEMPLATES``
and every one of its 5,239 cached occurrences was dropped on the floor.
"""

from __future__ import annotations

import sqlite3

import pytest

from ddo_data.db import GameDB
from ddo_data.enums import BonusType, S
from ddo_data.wiki.enhancement_bonus import MASTERWORK_EFFECT, parse_enhancement_bonus


def _bonuses(text: str) -> list[dict]:
    result = parse_enhancement_bonus(text)
    assert result is not None, f"decoder declined {text!r}"
    return list(result.bonuses)


def _pairs(text: str) -> list[tuple[str, str, int]]:
    """``(stat, bonus_type, value)`` triples, order-independent comparisons."""
    return [(b["stat"], b["bonus_type"], b["value"]) for b in _bonuses(text)]


# ---------------------------------------------------------------------------
# 1-3, 6 — the enhancement half: which stats each kind touches
# ---------------------------------------------------------------------------


def test_weapon_kind_gives_attack_and_damage() -> None:
    """``|w`` renders "+N enhancement bonus to attack and damage rolls"."""
    assert sorted(_pairs("{{Enhancement bonus|w|5}}")) == sorted([
        (str(S.ATTACK_BONUS), str(BonusType.ENHANCEMENT), 5),
        (str(S.DAMAGE_BONUS), str(BonusType.ENHANCEMENT), 5),
    ])


def test_armor_kind_gives_armor_class_only() -> None:
    """``|a`` renders "+N enhancement bonus to Armor Class"."""
    assert _pairs("{{Enhancement bonus|a|3}}") == [
        (str(S.ARMOR_CLASS), str(BonusType.ENHANCEMENT), 3),
    ]


def test_shield_kind_gives_armor_class_attack_and_damage() -> None:
    """``|s`` renders "Armor Class, attack and damage rolls" — three stats."""
    assert sorted(_pairs("{{Enhancement bonus|s|4}}")) == sorted([
        (str(S.ARMOR_CLASS), str(BonusType.ENHANCEMENT), 4),
        (str(S.ATTACK_BONUS), str(BonusType.ENHANCEMENT), 4),
        (str(S.DAMAGE_BONUS), str(BonusType.ENHANCEMENT), 4),
    ])


def test_shield_implement_kind_gives_the_same_three_plus_an_implement() -> None:
    """``si`` is in *both* switches: the shield branch and the implement one."""
    assert sorted(_pairs("{{Enhancement bonus|si|4}}")) == sorted([
        (str(S.ARMOR_CLASS), str(BonusType.ENHANCEMENT), 4),
        (str(S.ATTACK_BONUS), str(BonusType.ENHANCEMENT), 4),
        (str(S.DAMAGE_BONUS), str(BonusType.ENHANCEMENT), 4),
        (str(S.UNIVERSAL_SPELL_POWER), str(BonusType.IMPLEMENT), 12),
    ])


def test_orb_kind_is_an_orb_bonus_not_an_enhancement_bonus() -> None:
    """``|o`` renders "+N Orb Bonus" — a different bonus type entirely.

    Storing it as Enhancement would let it stack-replace a real enhancement
    bonus; the template's popup calls it an "orb bonus" in its own words.
    """
    assert _pairs("{{Enhancement bonus|o|8}}") == [
        (str(S.SAVING_THROWS), str(BonusType.ORB), 8),
    ]


def test_orb_implement_kind_gives_an_orb_row_and_an_implement_row() -> None:
    assert sorted(_pairs("{{Enhancement bonus|oi|6}}")) == sorted([
        (str(S.SAVING_THROWS), str(BonusType.ORB), 6),
        (str(S.UNIVERSAL_SPELL_POWER), str(BonusType.IMPLEMENT), 18),
    ])


# ---------------------------------------------------------------------------
# 4-5 — the implement half
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("kind", ["i", "ii"])
def test_implement_kinds_add_universal_spell_power_to_attack_and_damage(
    kind: str,
) -> None:
    """``i`` and ``ii`` differ only in list markup; both are weapon+implement."""
    assert sorted(_pairs(f"{{{{Enhancement bonus|{kind}|2}}}}")) == sorted([
        (str(S.ATTACK_BONUS), str(BonusType.ENHANCEMENT), 2),
        (str(S.DAMAGE_BONUS), str(BonusType.ENHANCEMENT), 2),
        (str(S.UNIVERSAL_SPELL_POWER), str(BonusType.IMPLEMENT), 6),
    ])


def test_implement_only_kind_produces_no_enhancement_bonus() -> None:
    """``|io`` is "spellcasting implement only (no enhancement bonus)".

    Its branch in the second switch is literally empty, so an enhancement row
    here would be an invention rather than a recovery.
    """
    assert _pairs("{{Enhancement bonus|io|2}}") == [
        (str(S.UNIVERSAL_SPELL_POWER), str(BonusType.IMPLEMENT), 6),
    ]


# ---------------------------------------------------------------------------
# 7 — {{lc:}} folds the kind parameter
# ---------------------------------------------------------------------------


def test_uppercase_kind_folds_to_lowercase() -> None:
    """``{{#switch:{{lc:{{{1}}}}}}}`` means ``I`` and ``i`` are one kind."""
    assert sorted(_pairs("{{Enhancement bonus|I|2}}")) == sorted(
        _pairs("{{Enhancement bonus|i|2}}")
    )


# ---------------------------------------------------------------------------
# 8 — magnitude 0 renders Masterwork
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("kind", ["w", "a", "s", "si", "i", "ii"])
def test_zero_magnitude_is_masterwork_and_not_a_bonus(kind: str) -> None:
    """``{{#ifeq:{{{2|0}}}|0|[[Masterwork]]|...}}`` — 0 is a word, not a number.

    Masterwork is a named item property whose meaning is kind-dependent (a
    weapon gets +1 to hit, armor gets 1 less armor check penalty), so a ``+0``
    bonus row would both sum to nothing and misdescribe the item.
    """
    result = parse_enhancement_bonus(f"{{{{Enhancement bonus|{kind}|0}}}}")
    assert result is not None
    assert list(result.effects) == [MASTERWORK_EFFECT]
    enhancement_rows = [
        b for b in result.bonuses if b["bonus_type"] != str(BonusType.IMPLEMENT)
    ]
    assert enhancement_rows == []


def test_zero_magnitude_still_yields_the_implement_line() -> None:
    """The implement switch has no Masterwork branch — 0*3 is still rendered."""
    result = parse_enhancement_bonus("{{Enhancement bonus|i|0}}")
    assert result is not None
    assert [(b["stat"], b["value"]) for b in result.bonuses] == [
        (str(S.UNIVERSAL_SPELL_POWER), 0),
    ]


def test_zero_magnitude_on_an_orb_is_not_masterwork() -> None:
    """The ``o``/``oi`` branch has no ``#ifeq 0`` guard; it renders "+0 Orb Bonus"."""
    result = parse_enhancement_bonus("{{Enhancement bonus|o|0}}")
    assert result is not None
    assert list(result.effects) == []
    assert _pairs("{{Enhancement bonus|o|0}}") == [
        (str(S.SAVING_THROWS), str(BonusType.ORB), 0),
    ]


# ---------------------------------------------------------------------------
# 9 — negative magnitudes are real (cursed gear)
# ---------------------------------------------------------------------------


def test_negative_magnitude_keeps_its_sign() -> None:
    """``{{Enhancement bonus|w|-2}}`` is one of the template's own examples."""
    assert sorted(_pairs("{{Enhancement bonus|w|-2}}")) == sorted([
        (str(S.ATTACK_BONUS), str(BonusType.ENHANCEMENT), -2),
        (str(S.DAMAGE_BONUS), str(BonusType.ENHANCEMENT), -2),
    ])


def test_an_explicit_plus_sign_parses_as_positive() -> None:
    """One cached page writes the magnitude as ``+12``."""
    assert _pairs("{{Enhancement bonus|a|+12}}") == [
        (str(S.ARMOR_CLASS), str(BonusType.ENHANCEMENT), 12),
    ]


# ---------------------------------------------------------------------------
# 10-11 — the third parameter
# ---------------------------------------------------------------------------


def test_third_parameter_overrides_the_implement_value() -> None:
    """``{{Enhancement bonus|i|1|1}}`` is the template's own 3-param example.

    ``{{{3|+{{#expr:{{{2|1}}}*3}}}}}`` uses param 3 *instead of* the computed
    default, so this is +1 implement, not +3. Param 3 is not the item's minimum
    level, however closely the two happen to correlate.
    """
    assert sorted(_pairs("{{Enhancement bonus|i|1|1}}")) == sorted([
        (str(S.ATTACK_BONUS), str(BonusType.ENHANCEMENT), 1),
        (str(S.DAMAGE_BONUS), str(BonusType.ENHANCEMENT), 1),
        (str(S.UNIVERSAL_SPELL_POWER), str(BonusType.IMPLEMENT), 1),
    ])


def test_a_named_parameter_never_lands_in_a_positional_slot() -> None:
    """``nocat=TRUE`` is a named param; MediaWiki does not count it as slot 3.

    Treating it positionally would make the implement value unparseable and,
    worse, silently swallow the ``param2 * 3`` fallback.
    """
    assert sorted(_pairs("{{Enhancement bonus|i|5|nocat=TRUE}}")) == sorted(
        _pairs("{{Enhancement bonus|i|5}}")
    )
    implement = [
        b for b in _bonuses("{{Enhancement bonus|i|5|nocat=TRUE}}")
        if b["bonus_type"] == str(BonusType.IMPLEMENT)
    ]
    assert implement[0]["value"] == 15


# ---------------------------------------------------------------------------
# 12 — empty magnitude
# ---------------------------------------------------------------------------


def test_empty_magnitude_produces_no_enhancement_row() -> None:
    """``{{#expr:}}`` on an empty magnitude is a wiki error, not a zero."""
    result = parse_enhancement_bonus("{{Enhancement bonus|w|}}")
    assert result is not None
    assert list(result.bonuses) == []
    assert list(result.effects) == []


def test_empty_magnitude_still_yields_an_implement_from_param_three() -> None:
    """All 12 cached empty-magnitude uses are ``{{Enhancement bonus|io||N}}``.

    ``{{{3|...}}}`` never evaluates its default when param 3 is supplied, so the
    empty param 2 is inert and the implement line renders normally. Dropping
    these would lose every one of them.
    """
    assert _pairs("{{Enhancement bonus|io||15}}") == [
        (str(S.UNIVERSAL_SPELL_POWER), str(BonusType.IMPLEMENT), 15),
    ]


def test_a_missing_magnitude_does_not_raise() -> None:
    result = parse_enhancement_bonus("{{Enhancement bonus|w}}")
    assert result is not None
    assert list(result.bonuses) == []


# ---------------------------------------------------------------------------
# 13 — name variants, and declining what is not ours
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "name",
    ["Enhancement bonus", "Enhancement_bonus", "enhancement bonus", "enhancement_bonus"],
)
def test_every_cached_name_variant_is_recognized(name: str) -> None:
    """All four spellings occur in the cache (4,773 / 429 / 36 / 1)."""
    assert _pairs(f"{{{{{name}|w|5}}}}") == _pairs("{{Enhancement bonus|w|5}}")


def test_a_different_template_is_declined() -> None:
    assert parse_enhancement_bonus("{{Stat|Wisdom|14}}") is None


def test_an_unknown_kind_is_declined_so_the_router_can_skip_it() -> None:
    """The template's ``#default`` branch renders an Error, not game data.

    Declining (rather than returning an empty result) keeps the invocation
    flowing to the metadata step, which is where a malformed one belongs.
    """
    assert parse_enhancement_bonus("{{Enhancement bonus|q|5}}") is None
    assert parse_enhancement_bonus("{{Enhancement bonus}}") is None


def test_surrounding_prose_does_not_hide_the_template() -> None:
    assert _pairs("* {{Enhancement bonus|w|5}}") == _pairs("{{Enhancement bonus|w|5}}")


# ---------------------------------------------------------------------------
# 15 — round trip through the real writer
# ---------------------------------------------------------------------------

WIKITEXT = """{{Named item|Weapon
| name        = Testwright Longsword
| minlevel    = 12
| enhancements =
* {{Enhancement bonus|w|5}}
* {{Stat|STR|6}}
}}"""

CURSED_WIKITEXT = """{{Named item|Weapon
| name        = Testwright Cursed Blade
| enhancements =
* {{Enhancement bonus|w|-2}}
}}"""

ORB_WIKITEXT = """{{Named item|Shield
| name        = Testwright Orb
| enhancements =
* {{Enhancement bonus|oi|6|21}}
}}"""

MASTERWORK_WIKITEXT = """{{Named item|Armor
| name        = Testwright Plate
| enhancements =
* {{Enhancement bonus|a|0}}
}}"""


@pytest.fixture
def db() -> GameDB:
    game_db = GameDB(":memory:")
    game_db.__enter__()
    game_db.create_schema()
    return game_db


def _item_bonus_rows(conn: sqlite3.Connection, item: str) -> list[tuple]:
    return conn.execute(
        """
        SELECT s.name, bt.name, b.value, b.name, b.description
          FROM item_bonuses ib
          JOIN items i ON i.id = ib.item_id
          JOIN bonuses b ON b.id = ib.bonus_id
          LEFT JOIN stats s ON s.id = b.stat_id
          LEFT JOIN bonus_types bt ON bt.id = b.bonus_type_id
         WHERE i.name = ?
         ORDER BY s.name, bt.name
        """,
        (item,),
    ).fetchall()


def _insert_wikitext(db: GameDB, wikitext: str) -> None:
    from ddo_data.wiki.parsers import parse_item_wikitext

    parsed = parse_item_wikitext(wikitext)
    assert parsed is not None
    db.insert_items([parsed])


def test_insert_item_writes_the_enhancement_rows_from_wikitext(db: GameDB) -> None:
    """The whole point: cached wikitext in, ``item_bonuses`` rows out.

    Before this branch the router's metadata step swallowed the template and
    this item got the ``{{Stat|STR|6}}`` row only.
    """
    _insert_wikitext(db, WIKITEXT)

    rows = _item_bonus_rows(db.conn, "Testwright Longsword")
    assert [(r[0], r[1], r[2]) for r in rows] == [
        ("Attack Bonus", "Enhancement", 5),
        ("Damage Bonus", "Enhancement", 5),
        ("Strength", "Enhancement", 6),
    ]


def test_a_stored_enhancement_bonus_describes_itself_from_its_columns(
    db: GameDB,
) -> None:
    """Invariant 2: descriptions are generated, never raw template source."""
    _insert_wikitext(db, WIKITEXT)

    rows = _item_bonus_rows(db.conn, "Testwright Longsword")
    attack = next(r for r in rows if r[0] == "Attack Bonus")
    assert attack[4] == "+5 Enhancement bonus to Attack Bonus"
    assert "{{" not in (attack[4] or "")


def test_a_negative_magnitude_keeps_its_sign_in_the_generated_name(
    db: GameDB,
) -> None:
    """Invariant 6: 4c flipped 18 penalties to bonuses and the counts never moved."""
    _insert_wikitext(db, CURSED_WIKITEXT)

    rows = _item_bonus_rows(db.conn, "Testwright Cursed Blade")
    assert [(r[0], r[2], r[3]) for r in rows] == [
        ("Attack Bonus", -2, "Attack Bonus -2"),
        ("Damage Bonus", -2, "Damage Bonus -2"),
    ]


def test_the_orb_bonus_type_is_seeded_and_resolvable(db: GameDB) -> None:
    _insert_wikitext(db, ORB_WIKITEXT)

    rows = _item_bonus_rows(db.conn, "Testwright Orb")
    assert [(r[0], r[1], r[2]) for r in rows] == [
        ("Saving Throws", "Orb", 6),
        ("Universal Spell Power", "Implement", 21),
    ]


def test_masterwork_becomes_an_effect_row_not_a_bonus_row(db: GameDB) -> None:
    _insert_wikitext(db, MASTERWORK_WIKITEXT)

    assert _item_bonus_rows(db.conn, "Testwright Plate") == []
    effects = db.conn.execute(
        """
        SELECT e.name, e.modifier
          FROM item_effects ie
          JOIN items i ON i.id = ie.item_id
          JOIN effects e ON e.id = ie.effect_id
         WHERE i.name = 'Testwright Plate'
        """
    ).fetchall()
    assert effects == [("Masterwork", None)]
