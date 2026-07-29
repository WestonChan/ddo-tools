"""Tests for the post-import data validation assertions (db/validate.py).

Every assertion here gets a test that it *fires* on crafted bad data, not only
that it passes on good data — an assertion nobody has watched fail is an
assertion that might be inert. The six added in Phase 4c (A1-A6) guard the bug
class that phase fixed, so a regression shows up as a failed build rather than
as wrong numbers in the UI months later.

Note the module under test is ``ddo_data.db.validate``; ``test_validate.py``
covers the unrelated ``dat_parser.validate``.
"""

from __future__ import annotations

import sqlite3

import pytest

from ddo_data.db import GameDB
from ddo_data.db.validate import validate_database


def _result(conn: sqlite3.Connection, name: str):
    """The single ValidationResult named *name*."""
    matches = [r for r in validate_database(conn) if r.name == name]
    assert len(matches) == 1, f"{name} not registered exactly once: {matches}"
    return matches[0]


@pytest.fixture
def conn() -> sqlite3.Connection:
    db = GameDB(":memory:")
    db.__enter__()
    db.create_schema()
    return db.conn


# ---------------------------------------------------------------------------
# A1 — an enchantment name may not sit in both bonuses and effects
# ---------------------------------------------------------------------------


def test_a1_fires_when_a_name_is_in_both_tables(conn: sqlite3.Connection) -> None:
    """Two tables claiming one enchantment means one of them has it wrong.

    This is how the {{Save|Spell}} bug surfaced: a spell *saving throw* bonus
    and Spell *Resistance* effects shared the name "Spell Resistance", and 18
    items looked like they carried the same enchantment twice.
    """
    conn.execute("INSERT INTO effects (name) VALUES ('Sneak Attack Dice')")
    conn.execute(
        "INSERT INTO bonuses (name, value) VALUES ('Sneak Attack Dice +3', 3)"
    )

    result = _result(conn, "enchantment_not_in_both_tables")

    assert not result.passed
    assert result.severity == "error"
    assert result.failures[0]["name"] == "Sneak Attack Dice"


def test_a1_stays_silent_for_an_allowlisted_name(conn: sqlite3.Connection) -> None:
    """The 7 legitimately-shared names must not fire, or the check gets deleted.

    Concealment's effects rows are named *sources* (Blurry, Dusk, Lesser
    Displacement) while its bonus row is the numeric miss chance — both real.
    """
    conn.execute("INSERT INTO effects (name, modifier) VALUES ('Concealment', 'Blurry')")
    conn.execute("INSERT INTO bonuses (name, value) VALUES ('Concealment +25', 25)")

    assert _result(conn, "enchantment_not_in_both_tables").passed


def test_a1_allowlist_records_a_reason_for_every_entry(conn: sqlite3.Connection) -> None:
    """A bare exemption list rots; the reason is what keeps it honest."""
    from ddo_data.db.validate import DUAL_TABLE_ALLOWLIST

    assert DUAL_TABLE_ALLOWLIST
    for name, reason in DUAL_TABLE_ALLOWLIST.items():
        assert reason and len(reason) > 20, f"{name} has no usable reason"


def test_a1_passes_on_an_empty_database(conn: sqlite3.Connection) -> None:
    assert _result(conn, "enchantment_not_in_both_tables").passed


# ---------------------------------------------------------------------------
# A2 — {{Save|X|N}} must resolve to a Save stat
# ---------------------------------------------------------------------------


def test_a2_passes_on_the_shipped_save_mapping(conn: sqlite3.Connection) -> None:
    assert _result(conn, "save_templates_resolve_to_save_stats").passed


def test_a2_fires_when_a_save_param_points_at_a_non_save_stat(
    conn: sqlite3.Connection, monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reproduce the real bug: `spell` -> Spell Resistance, not Spell Save."""
    from ddo_data.dat_parser import effects as effects_module

    broken = dict(effects_module._SAVE_ABBREVS)
    broken["spell"] = "Spell Resistance"
    monkeypatch.setattr(effects_module, "_SAVE_ABBREVS", broken)

    result = _result(conn, "save_templates_resolve_to_save_stats")

    assert not result.passed
    assert result.severity == "error"
    assert any(f["stat"] == "Spell Resistance" for f in result.failures)


# ---------------------------------------------------------------------------
# A3 — no unexpanded template text in bonuses.description
# ---------------------------------------------------------------------------


def test_a3_fires_on_an_unexpanded_template(conn: sqlite3.Connection) -> None:
    conn.execute(
        "INSERT INTO bonuses (name, description) VALUES "
        "('Fire Resistance +30', '{{Elemental Resistance|Fire|30}}')"
    )

    result = _result(conn, "bonus_descriptions_expanded")

    assert not result.passed
    assert result.severity == "error"


def test_a3_passes_on_expanded_prose(conn: sqlite3.Connection) -> None:
    conn.execute(
        "INSERT INTO bonuses (name, description) VALUES "
        "('Fire Resistance +30', '+30 Enhancement bonus to Fire Resistance')"
    )

    assert _result(conn, "bonus_descriptions_expanded").passed


# ---------------------------------------------------------------------------
# A3b — the same rule for the columns that *name* things
#
# A3 watched `description` only, which is why four bonus names shipped as raw
# wikitext and 380 crafting option names shipped ending in "<br />".
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "bad_name",
    [
        "[[True Seeing (enhancement)|True Seeing]]",
        "This can stack up to {{HELstats|3|L=6}} times.",
        "A 5% chance on hit to [[Bluff]] your target.",
    ],
)
def test_a3b_fires_on_markup_in_a_bonus_name(
    conn: sqlite3.Connection, bad_name: str,
) -> None:
    conn.execute("INSERT INTO bonuses (name) VALUES (?)", (bad_name,))

    result = _result(conn, "names_are_free_of_markup")

    assert not result.passed
    assert result.severity == "error"
    assert any(f["value"] == bad_name for f in result.failures)


def test_a3b_fires_on_a_line_break_in_a_crafting_option_name(
    conn: sqlite3.Connection,
) -> None:
    conn.execute(
        "INSERT INTO crafting_options (system_id, tier, name) "
        "VALUES (28, 'Eldritch Rune', 'Eldritch Rune of Striding<br />')"
    )

    result = _result(conn, "names_are_free_of_markup")

    assert not result.passed
    assert any(f["source_table"] == "crafting_options" for f in result.failures)


def test_a3b_passes_on_plain_names(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO bonuses (name) VALUES ('True Seeing')")
    conn.execute(
        "INSERT INTO crafting_options (system_id, tier, name) "
        "VALUES (28, 'Eldritch Rune', 'Eldritch Rune of Striding')"
    )
    conn.execute("INSERT INTO item_materials (name) VALUES ('Cold Iron')")

    assert _result(conn, "names_are_free_of_markup").passed


def test_a3b_ignores_descriptions(conn: sqlite3.Connection) -> None:
    """Markup in a description is Phase 4m's problem, not this assertion's."""
    conn.execute(
        "INSERT INTO crafting_options (system_id, tier, name, description) "
        "VALUES (28, 'Rune', 'Rune of Fire', '<font color=red>See note 1</font>')"
    )

    assert _result(conn, "names_are_free_of_markup").passed


# ---------------------------------------------------------------------------
# A4 — magnitudes stay out of effects.modifier
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("modifier", ["59", "+91", "-20", "15%", "{{Stat"])
def test_a4_fires_on_a_magnitude_in_the_type_column(
    conn: sqlite3.Connection, modifier: str,
) -> None:
    """`effects.modifier` is the bonus type; a number there is the 4c bug."""
    conn.execute(
        "INSERT INTO effects (name, modifier) VALUES ('Incite', ?)", (modifier,)
    )

    result = _result(conn, "effect_modifier_is_not_a_magnitude")

    assert not result.passed, modifier
    assert result.severity == "error"


def test_a4_passes_on_a_real_bonus_type(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO effects (name, modifier) VALUES ('Incite', 'Insightful')")
    conn.execute("INSERT INTO effects (name, modifier) VALUES ('Vorpal', NULL)")

    assert _result(conn, "effect_modifier_is_not_a_magnitude").passed


def test_a4_tolerates_an_ordinal_modifier(conn: sqlite3.Connection) -> None:
    """{{Burns|3rd}} is a tier, not a magnitude — 44 items use it.

    An assertion that can never pass gets deleted, so the pattern has to match
    bare magnitudes only, exactly like the parser's own.
    """
    conn.execute("INSERT INTO effects (name, modifier) VALUES ('Burns', '3rd')")

    assert _result(conn, "effect_modifier_is_not_a_magnitude").passed


# ---------------------------------------------------------------------------
# A5 — nothing may be sourced from a wiki maintenance template
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("name", ["bug", "Bug", "InlineWht", "Orphan", "Nearly Finished"])
def test_a5_fires_on_a_maintenance_template_row(
    conn: sqlite3.Connection, name: str,
) -> None:
    conn.execute("INSERT INTO effects (name) VALUES (?)", (name,))

    result = _result(conn, "no_maintenance_template_rows")

    assert not result.passed, name
    assert result.severity == "error"


def test_a5_fires_on_a_maintenance_named_bonus(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO bonuses (name) VALUES ('InlineWht')")

    assert not _result(conn, "no_maintenance_template_rows").passed


def test_a5_passes_on_real_enchantments(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO effects (name) VALUES ('Vorpal')")
    conn.execute("INSERT INTO bonuses (name, value) VALUES ('Strength +7', 7)")

    assert _result(conn, "no_maintenance_template_rows").passed


# ---------------------------------------------------------------------------
# A6 — orphan counts, reported as a warning
# ---------------------------------------------------------------------------


def test_a6_fires_as_a_warning_above_the_baseline(conn: sqlite3.Connection) -> None:
    """Orphans are 4m's job; this must inform the build, not fail it."""
    from ddo_data.db.validate import ORPHAN_BASELINE

    for i in range(ORPHAN_BASELINE["bonuses"] + 5):
        conn.execute("INSERT INTO bonuses (name, value) VALUES (?, ?)", (f"Junk +{i}", i))

    result = _result(conn, "orphan_rows_within_baseline")

    assert not result.passed
    assert result.severity == "warning"


def test_a6_passes_at_or_below_the_baseline(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO bonuses (name, value) VALUES ('Strength +7', 7)")

    assert _result(conn, "orphan_rows_within_baseline").passed


def test_a6_does_not_fail_the_build(conn: sqlite3.Connection) -> None:
    """`validate-db` exits 1 only on errors, so A6 must never be one."""
    from ddo_data.db.validate import ORPHAN_BASELINE

    for i in range(ORPHAN_BASELINE["effects"] + 5):
        conn.execute("INSERT INTO effects (name) VALUES (?)", (f"Junk {i}",))

    errors = [
        r for r in validate_database(conn)
        if not r.passed and r.severity == "error"
    ]

    assert "orphan_rows_within_baseline" not in {r.name for r in errors}


def test_a_bonus_referenced_by_a_consumer_is_not_an_orphan(
    conn: sqlite3.Connection,
) -> None:
    """An orphan is a row *no* consumer table points at."""
    from ddo_data.db.validate import count_orphans

    conn.execute("INSERT INTO items (id, name) VALUES (1, 'Sword')")
    conn.execute("INSERT INTO bonuses (id, name, value) VALUES (1, 'Strength +7', 7)")
    conn.execute("INSERT INTO bonuses (id, name, value) VALUES (2, 'Lonely +1', 1)")
    conn.execute(
        "INSERT INTO item_bonuses (item_id, bonus_id, sort_order) VALUES (1, 1, 0)"
    )

    counts = count_orphans(conn)

    assert counts["bonuses"] == 1
