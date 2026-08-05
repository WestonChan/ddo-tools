"""Tests for the augment-slot template decoder.

Expectations come from each template's own source (read via ``action=raw``,
invariant 7), not from the implementation:

* ``Template:Augment`` — ``{{{1|Colorless}}}`` folded through
  ``{{ucfirst:{{lc:...}}}}``, with a ``#switch`` whose cases are Blue,
  Colorless, Green, Orange, Purple (``violet`` aliased to it), Red, Yellow,
  Moon and Sun. ``nocat`` only suppresses category membership.
* ``Template:MoonSunAugment`` — deprecated, expands verbatim to
  ``{{Augment|{{{1}}}}}``. A pure alias, so it must decode identically.
* ``Template:Lamordia Slot`` / ``Template:Dino Slot`` — "{Type1} Slot ({Type2})"
  where Type2 names the augment pool. Dino's ``Set`` first parameter is the
  set-bonus slot and takes no pool.
* ``Template:Slaver's Slot`` — "{Legendary} Slaver's {Type} Slot"; parameter 2
  is empty (heroic) or ``Legendary``.

The canonical labels are the vocabulary ``augments.slot_color`` already speaks,
so ``test_family_labels_match_the_stored_augment_vocabulary`` derives its
expectations from the shipped database rather than from the composition
function it is checking.
"""

from __future__ import annotations

import re
import sqlite3
from pathlib import Path

import pytest

from ddo_data.wiki.augment_slots import (
    AugmentSlot,
    decompose_label,
    extract_augment_slots,
    known_slot_definitions,
    parse_augment_slot,
    parse_slot_color,
    slot_label,
)

_DB_PATH = Path(__file__).resolve().parents[2] / "public" / "data" / "ddo.db"


def _triple(text: str) -> tuple[str, str, str | None]:
    """``(family, variant, qualifier)`` for the first slot template in *text*."""
    slot = parse_augment_slot(text)
    assert slot is not None, f"decoder declined {text!r}"
    return (slot.family, slot.variant, slot.qualifier)


# ---------------------------------------------------------------------------
# 1-6 — the standard colour family
# ---------------------------------------------------------------------------


def test_a_colour_parameter_is_the_slot_colour() -> None:
    assert _triple("{{Augment|Red}}") == ("standard", "red", None)


def test_nocat_is_categorization_control_and_never_a_colour() -> None:
    """The 578-occurrence recovery: ``\\w+`` could not match past the pipe.

    ``nocat`` suppresses the template's category membership on pages that only
    mention a slot; it says nothing about the item, so the slot is a plain
    Purple one.
    """
    assert _triple("{{Augment|Purple|nocat=TRUE}}") == ("standard", "purple", None)
    assert _triple("{{Augment|purple|nocat=1}}") == ("standard", "purple", None)


def test_the_colour_parameter_is_case_folded() -> None:
    """``{{ucfirst:{{lc:{{{1|Colorless}}}}}}}`` — the template folds it first."""
    assert _triple("{{Augment|red}}") == _triple("{{Augment|Red}}")


@pytest.mark.parametrize("text", ["{{Augment}}", "{{Augment|}}"])
def test_a_missing_colour_defaults_to_colorless(text: str) -> None:
    """``{{{1|Colorless}}}`` supplies the default; an empty slot triggers it."""
    assert _triple(text) == ("standard", "colorless", None)


def test_violet_is_the_templates_own_alias_for_purple() -> None:
    """The ``#switch`` lists ``|violet`` beside ``|purple`` in one case."""
    assert _triple("{{Augment|violet}}") == ("standard", "purple", None)


@pytest.mark.parametrize("colour", ["Sun", "Moon"])
def test_moonsunaugment_is_a_pure_alias_for_augment(colour: str) -> None:
    """Its whole body is ``{{Augment|{{{1}}}}}`` — same slot, deprecated name."""
    assert _triple(f"{{{{MoonSunAugment|{colour}}}}}") == _triple(
        f"{{{{Augment|{colour}}}}}"
    )
    assert _triple(f"{{{{MoonSunAugment|{colour}}}}}") == (
        "standard", colour.lower(), None,
    )


def test_an_unknown_colour_is_declined() -> None:
    """Not in the ``#switch``: the template renders its ``#default`` error."""
    assert parse_augment_slot("{{Augment|Chartreuse}}") is None


# ---------------------------------------------------------------------------
# 7-11 — the crafting families
# ---------------------------------------------------------------------------


def test_a_lamordia_slot_carries_its_variant_and_its_pool() -> None:
    assert _triple("{{Lamordia Slot|Melancholic|Weapon}}") == (
        "lamordia", "melancholic", "weapon",
    )


def test_lamordia_parameters_are_case_folded_like_the_template_folds_them() -> None:
    assert _triple("{{Lamordia Slot|MISERABLE|armor}}") == (
        "lamordia", "miserable", "armor",
    )


def test_an_underscored_template_name_is_the_same_template() -> None:
    """MediaWiki reads ``_`` and a space in a page name as the same character."""
    assert _triple("{{Lamordia_Slot|Dolorous|Accessory}}") == (
        "lamordia", "dolorous", "accessory",
    )


def test_a_dino_slot_carries_its_variant_and_its_pool() -> None:
    assert _triple("{{Dino Slot|Scale|Weapon}}") == ("dino", "scale", "weapon")


@pytest.mark.parametrize("text", ["{{Dino Slot|Set}}", "{{Dino Slot|Set|}}"])
def test_the_dino_set_slot_takes_no_pool(text: str) -> None:
    """``Set`` is its own branch — a set-bonus slot, no augment pool.

    The second form has an empty positional parameter, which
    ``extract_template`` keeps rather than dropping; reading it as a pool would
    make the two forms disagree.
    """
    assert _triple(text) == ("dino", "set", None)


def test_a_slavers_slot_records_its_legendary_qualifier() -> None:
    assert _triple("{{Slaver's Slot|Prefix|Legendary}}") == (
        "slavers", "prefix", "legendary",
    )


def test_a_heroic_slavers_slot_has_no_qualifier() -> None:
    assert _triple("{{Slaver's Slot|Bonus}}") == ("slavers", "bonus", None)


# ---------------------------------------------------------------------------
# 12-14 — what the decoder must decline
# ---------------------------------------------------------------------------


def test_upgradeable_augment_is_not_a_slot() -> None:
    """The item *can be upgraded* to gain a slot; it does not carry one.

    It routes through the effects path as the potential effect
    ``Upgradeable Augment`` instead, so the slot decoder must not claim it.
    """
    assert parse_augment_slot("{{UpgradeableAugment|Primary}}") is None


def test_an_unknown_family_variant_is_declined() -> None:
    """Declining keeps a malformed invocation flowing to the metadata backstop
    rather than inventing a slot type nothing in the game grants."""
    assert parse_augment_slot("{{Dino Slot|Talon|Weapon}}") is None
    assert parse_augment_slot("{{Lamordia Slot|Cheerful|Weapon}}") is None


def test_a_non_slot_template_is_declined() -> None:
    assert parse_augment_slot("{{Stat|Wisdom|14}}") is None


def test_a_pool_the_template_does_not_define_is_declined() -> None:
    assert parse_augment_slot("{{Lamordia Slot|Woeful|Ring}}") is None


# ---------------------------------------------------------------------------
# 15 — extraction leaves the rest of the bullet alone
# ---------------------------------------------------------------------------


def test_extraction_returns_the_slots_and_the_untouched_remainder() -> None:
    """One bullet can hold a slot *and* a real enchantment.

    Consuming the whole entry because it starts with a slot template is how the
    multi-template bullets lost their enchantments; the remainder has to stay
    routable.
    """
    slots, remainder = extract_augment_slots(
        "{{Lamordia Slot|Woeful|Weapon}}, {{SpellPower|Radiance|84}}"
    )
    assert [s.label for s in slots] == ["lamordia: woeful (weapon)"]
    assert remainder == "{{SpellPower|Radiance|84}}"


def test_extraction_finds_every_slot_in_one_entry() -> None:
    slots, remainder = extract_augment_slots(
        "{{Augment|Green}} {{MoonSunAugment|Sun}} {{Dino Slot|Fang|Armor}}"
    )
    assert [s.label for s in slots] == [
        "green", "sun", "isle of dread: fang (armor)",
    ]
    assert remainder == ""


def test_extraction_collapses_the_separators_it_orphans() -> None:
    """Lifting a slot from between two enchantments leaves both its commas."""
    slots, remainder = extract_augment_slots(
        "Deathblock, {{Augment|Colorless}}, Vorpal"
    )
    assert [s.label for s in slots] == ["colorless"]
    assert remainder == "Deathblock, Vorpal"


def test_extraction_leaves_an_entry_with_no_slots_intact() -> None:
    slots, remainder = extract_augment_slots("{{Stat|Wisdom|14}}")
    assert slots == []
    assert remainder == "{{Stat|Wisdom|14}}"


def test_a_declined_invocation_is_left_in_the_remainder() -> None:
    """An unknown variant must not vanish — the metadata step still sees it."""
    slots, remainder = extract_augment_slots("{{Dino Slot|Talon|Weapon}}")
    assert slots == []
    assert remainder == "{{Dino Slot|Talon|Weapon}}"


# ---------------------------------------------------------------------------
# 19 — the labels are the vocabulary the augments table already speaks
# ---------------------------------------------------------------------------


def _invocation_for(slot_color: str) -> str | None:
    """The template invocation an ``augments.slot_color`` value describes.

    The mapping runs label -> template, the opposite direction from the code
    under test, so the expected strings are the database's own and not the
    composition function's output reflected back.
    """
    if slot_color == "isle of dread: set bonus":
        return "{{Dino Slot|Set}}"
    match = re.fullmatch(r"(lamordia|isle of dread): (\w+) \((\w+)\)", slot_color)
    if match is None:
        return None
    family, variant, pool = match.groups()
    name = "Lamordia Slot" if family == "lamordia" else "Dino Slot"
    return f"{{{{{name}|{variant}|{pool}}}}}"


@pytest.mark.skipif(not _DB_PATH.exists(), reason="shipped database not built")
def test_family_labels_match_the_stored_augment_vocabulary() -> None:
    """A slot's label must equal the ``slot_color`` of the augments that fit it.

    That string equality *is* the slot -> candidate-augments join the detail
    view runs, which is why no family column was added: a mismatch of one
    character silently empties a dropdown rather than raising anything.
    """
    conn = sqlite3.connect(f"file:{_DB_PATH}?mode=ro", uri=True)
    try:
        stored = [
            row[0] for row in conn.execute(
                "SELECT DISTINCT slot_color FROM augments WHERE slot_color LIKE '%: %'"
            )
        ]
    finally:
        conn.close()

    assert stored, "no compound slot_color values in augments — census changed"
    for slot_color in stored:
        invocation = _invocation_for(slot_color)
        assert invocation is not None, f"unmapped augments vocabulary: {slot_color!r}"
        slot = parse_augment_slot(invocation)
        assert slot is not None, f"decoder declined {invocation!r}"
        assert slot.label == slot_color


# ---------------------------------------------------------------------------
# The legacy `augmentslot =` infobox field
# ---------------------------------------------------------------------------


def test_a_legacy_colour_word_decodes_like_the_template_parameter() -> None:
    assert parse_slot_color("Blue") == AugmentSlot("standard", "blue")


@pytest.mark.parametrize(
    "value", ["One colorless augment slot", "White", "", "  "],
)
def test_a_legacy_value_outside_the_vocabulary_declines(value: str) -> None:
    """The field is free text, and a value from outside the vocabulary has no
    `augment_slot_types` row to resolve to — the writer would drop the socket."""
    assert parse_slot_color(value) is None


def test_a_standard_colour_label_is_the_bare_colour() -> None:
    """Unchanged from the 7,054 rows already stored — no family prefix."""
    assert parse_augment_slot("{{Augment|Red}}").label == "red"  # type: ignore[union-attr]


def test_slavers_labels_follow_the_same_prefixed_pattern() -> None:
    """Slave Lords crafting is shard-based, so no augment carries these labels;
    the pattern is kept consistent so every family reads the same way."""
    assert AugmentSlot("slavers", "prefix", "legendary").label == (
        "slaver's: prefix (legendary)"
    )
    assert AugmentSlot("slavers", "bonus", None).label == "slaver's: bonus"


# ---------------------------------------------------------------------------
# The closed vocabulary, enumerated and read back
#
# `augment_slot_types` stores the vocabulary as rows, so two operations that the
# label-only design never needed become part of the decoder's contract:
# enumerating every definition the grammar can produce (what validation mirrors)
# and reading a stored label back into its parts (what the writer resolves and
# what the shape migration decomposes).
# ---------------------------------------------------------------------------


def test_every_enumerated_definition_composes_its_own_label() -> None:
    """The enumeration and the composer are the same grammar or neither is
    trustworthy: a definitions row whose label disagrees with its columns would
    let the augments-side display fallback and the FK point different ways."""
    for label, family, variant, qualifier in known_slot_definitions():
        assert slot_label(family, variant, qualifier) == label


def test_the_enumeration_covers_every_colour_and_family_combination() -> None:
    # 9 colours, 4 Lamordia variants x 3 pools, 4 Dino variants x 3 pools plus
    # the poolless Set slot, and 5 Slaver's variants heroic and legendary.
    assert len(known_slot_definitions()) == 9 + 12 + 13 + 10
    labels = {label for label, *_ in known_slot_definitions()}
    assert "red" in labels
    assert "lamordia: woeful (armor)" in labels
    assert "isle of dread: set bonus" in labels
    assert "slaver's: suffix (legendary)" in labels
    # UpgradeableAugment is a potential effect, not a socket (D9).
    assert not any(label.startswith("upgradeable") for label in labels)


def test_the_enumeration_holds_no_duplicate_labels() -> None:
    """The label is the definitions table's UNIQUE key, so a grammar that
    composed two rows onto one string would fail the insert rather than the
    test that should have caught it."""
    labels = [label for label, *_ in known_slot_definitions()]
    assert len(labels) == len(set(labels))


def test_a_stored_label_decomposes_back_into_the_slot_it_came_from() -> None:
    for label, family, variant, qualifier in known_slot_definitions():
        assert decompose_label(label) == AugmentSlot(family, variant, qualifier)


@pytest.mark.parametrize(
    "label",
    [
        "melancholic (weapon)",   # family prefix dropped
        "lamordia melancholic",   # colon dropped
        "Green",                  # not folded at the writer boundary
        "isle_of_dread: fang",    # underscored prefix
        "chartreuse",             # not a colour the game has
        "lamordia: talon (weapon)",  # variant the template never defines
        "lamordia: woeful (helmet)",  # pool the template never defines
        "isle of dread: set bonus (weapon)",  # the Set slot takes no pool
        "",
    ],
)
def test_a_label_outside_the_vocabulary_does_not_decompose(label: str) -> None:
    """Nothing composed this, so nothing may read it back: the shape migration
    would otherwise invent a definitions row for a value no augment matches."""
    assert decompose_label(label) is None


@pytest.mark.skipif(not _DB_PATH.exists(), reason="shipped database not built")
def test_every_label_the_shipped_database_stores_decomposes() -> None:
    """The in-place shape migration reads exactly these strings.

    Expectations come from the database rather than the decoder: a label the
    migration cannot decompose is data it would have to drop or guess at.
    """
    conn = sqlite3.connect(f"file:{_DB_PATH}?mode=ro", uri=True)
    try:
        stored = [
            row[0] for row in conn.execute(
                "SELECT DISTINCT label FROM augment_slot_types"
            )
        ] if _has_definitions_table(conn) else [
            row[0] for row in conn.execute(
                "SELECT DISTINCT slot_type FROM item_augment_slots"
            )
        ]
    finally:
        conn.close()

    assert stored, "no stored slot vocabulary — census changed"
    undecodable = [label for label in stored if decompose_label(label) is None]
    assert undecodable == []


@pytest.mark.skipif(not _DB_PATH.exists(), reason="shipped database not built")
def test_every_stored_definition_recomposes_its_own_label() -> None:
    """The shipped `augment_slot_types` rows, checked column-against-label.

    `label` is what the augments-side display fallback is matched against and
    family/variant/qualifier are what consumers read, so the two must describe
    one socket. This is the property over real rows rather than over generated
    ones: it catches a definition written by a path the enumeration does not
    model — the shape migration decomposing a stored label, or a future writer.
    """
    conn = sqlite3.connect(f"file:{_DB_PATH}?mode=ro", uri=True)
    try:
        if not _has_definitions_table(conn):
            pytest.skip("shipped database predates augment_slot_types")
        rows = conn.execute(
            "SELECT label, family, variant, qualifier FROM augment_slot_types ORDER BY id"
        ).fetchall()
    finally:
        conn.close()

    assert rows, "no stored definitions — census changed"
    mismatched = [
        (label, family, variant, qualifier)
        for label, family, variant, qualifier in rows
        if slot_label(family, variant, qualifier) != label
    ]
    assert mismatched == []


def _has_definitions_table(conn: sqlite3.Connection) -> bool:
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'augment_slot_types'"
    ).fetchone() is not None
