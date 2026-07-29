"""Idempotency of the insert writers: a second pass must add no rows.

This is a correctness property, not a nicety. ddowiki's AWS WAF answers every
non-browser client with HTTP 202 and an empty body, so category enumeration is
dead and ``build-db`` cannot rebuild from scratch — it *updates* the shipped
``public/data/ddo.db`` in place. Every run therefore replays the same scrape
over rows that are already there, and a writer that appends instead of matching
makes the committed database grow without bound.

``crafting_options`` is the table that proved it: the shipped database held
1,119 distinct option rows in exactly four identical copies each, one per
historical build, and the next run would have made it five.

The contract each test pins is the same: **given the same scraped input, the
second write leaves the row count where the first one put it.** Input is built
through the real writer with the shapes the scrapers emit, so a writer cannot
pass by matching on a key the pipeline never produces.
"""

from __future__ import annotations

import sqlite3

from ddo_data.db import GameDB

# Both systems are seeded by `create_schema`, so the fixture's FKs are the ones
# `collect_crafting_systems` really resolves.
GREEN_STEEL = 12
THUNDER_FORGED = 28

# One option per shape the crafting-system scrapers emit: a plain tier option,
# two options that share a tier, and an option whose tier is a rune group.
# `collect_crafting_systems` returns exactly these four keys.
CRAFTING_OPTIONS_FIXTURE = [
    {
        "system_id": GREEN_STEEL,
        "tier": "Tier 1",
        "name": "Air - Martial",
        "description": "+1 Enhancement bonus to Dexterity",
    },
    {
        "system_id": GREEN_STEEL,
        "tier": "Tier 1",
        "name": "Earth - Martial",
        "description": "+1 Enhancement bonus to Constitution",
    },
    {
        "system_id": GREEN_STEEL,
        "tier": "Tier 2",
        "name": "Lightning II",
        "description": "On Hit: 4d6 electric damage",
    },
    {
        "system_id": THUNDER_FORGED,
        "tier": "Eldritch Rune",
        "name": "Eldritch Rune of Striding",
        "description": "+15% Enhancement bonus to Striding",
    },
]


def _fresh_db() -> GameDB:
    db = GameDB(":memory:")
    db.__enter__()
    db.create_schema()
    return db


def _count(conn: sqlite3.Connection, table: str) -> int:
    return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


class TestCraftingOptionsIdempotency:
    """``insert_crafting_options`` must match existing rows, not append copies."""

    def test_a_second_pass_adds_no_rows(self) -> None:
        db = _fresh_db()
        db.insert_crafting_options(CRAFTING_OPTIONS_FIXTURE)
        after_first = _count(db.conn, "crafting_options")

        db.insert_crafting_options(CRAFTING_OPTIONS_FIXTURE)

        assert after_first == len(CRAFTING_OPTIONS_FIXTURE)
        assert _count(db.conn, "crafting_options") == after_first

    def test_a_second_pass_reports_nothing_inserted(self) -> None:
        """The returned count is what the CLI prints; it must not overstate."""
        db = _fresh_db()
        db.insert_crafting_options(CRAFTING_OPTIONS_FIXTURE)
        assert db.insert_crafting_options(CRAFTING_OPTIONS_FIXTURE) == 0

    def test_a_rescrape_updates_a_changed_description_in_place(self) -> None:
        """A reworded wiki cell edits the row it belongs to, not a new one.

        14 option descriptions changed spelling when writer-boundary
        normalization landed. Without this, each became a second row carrying
        the same (system, tier, name) identity.
        """
        db = _fresh_db()
        db.insert_crafting_options(CRAFTING_OPTIONS_FIXTURE)

        reworded = [dict(CRAFTING_OPTIONS_FIXTURE[0], description="+1 Dexterity")]
        db.insert_crafting_options(reworded)

        rows = db.conn.execute(
            "SELECT description FROM crafting_options "
            "WHERE system_id = ? AND tier = 'Tier 1' AND name = 'Air - Martial'",
            (GREEN_STEEL,),
        ).fetchall()
        assert rows == [("+1 Dexterity",)]

    def test_two_systems_may_share_an_option_name(self) -> None:
        """Identity is (system, tier, name) — a shared name is not a duplicate."""
        db = _fresh_db()
        db.insert_crafting_options([
            dict(CRAFTING_OPTIONS_FIXTURE[0], system_id=1),
            dict(CRAFTING_OPTIONS_FIXTURE[0], system_id=2),
        ])
        assert _count(db.conn, "crafting_options") == 2


class TestCraftingSeedIdempotency:
    """``seed_crafting_data`` replays the same JSON seed on every build."""

    TABLES = (
        "crafting_recipes",
        "crafting_recipe_ingredients",
        "crafting_ingredients",
        "crafting_system_items",
    )

    def test_a_second_seed_adds_no_rows(self) -> None:
        db = _fresh_db()
        db.seed_crafting_data()
        after_first = {t: _count(db.conn, t) for t in self.TABLES}

        db.seed_crafting_data()

        assert {t: _count(db.conn, t) for t in self.TABLES} == after_first
        assert after_first["crafting_recipes"] > 0, "the seed file must have loaded"


class TestSchemaVersionIdempotency:
    """``create_schema`` runs on every build; the version marker is not a log."""

    def test_reapplying_the_schema_leaves_one_version_row(self) -> None:
        db = _fresh_db()
        db.create_schema()
        db.create_schema()
        assert _count(db.conn, "schema_version") == 1


class TestRepairPassesAgree:
    """The repair passes must converge, not take turns rewriting each other.

    Row counts can be stable while values oscillate, and that is just as broken:
    whichever pass the build happens to run last decides what ships.
    """

    def test_a_penalty_keeps_its_sign_across_repeated_passes(self) -> None:
        """`Constitution -2` is a penalty; relabelling it `+2` inverts the data.

        `collapse_value_variants` groups spellings by dropping punctuation, which
        made "-2" and "+2" the same key and folded 18 penalties onto their bonus
        twins — then `renormalize_bonus_names` rebuilt them from `value` and put
        the sign back, forever.
        """
        db = _fresh_db()
        db.insert_set_bonus_effects([{
            "name": "Cursed Regalia",
            "bonuses": [
                {"min_pieces": 2, "text": "{{Stat|CON|2}}"},
                {"min_pieces": 3, "text": "{{Stat|CON|-2}}"},
            ],
        }])

        seen = []
        for _ in range(3):
            # The order `build-db` runs them in: whatever the last pass leaves
            # behind is what ships.
            db.renormalize_bonus_names()
            db.normalize_stored_text()
            db.collapse_value_variants()
            seen.append(sorted(
                r[0] for r in db.conn.execute(
                    "SELECT name FROM bonuses WHERE stat_id IS NOT NULL"
                )
            ))

        assert seen[0] == seen[1] == seen[2], "the passes disagree, so they loop"
        assert seen[0] == ["Constitution +2", "Constitution -2"]

    def test_punctuation_variants_still_collapse(self) -> None:
        """The sign fix must not stop `Self-Reliant`/`Self Reliant` merging."""
        db = _fresh_db()
        conn = db.conn
        conn.execute(
            "INSERT INTO enhancement_trees (id, name, tree_type, ap_pool) "
            "VALUES (1, 'Falconry', 'universal', 'heroic')"
        )
        for i, name in enumerate(
            ["Self-Reliant", "Self-Reliant", "Self Reliant"], start=1
        ):
            conn.execute(
                "INSERT INTO enhancements (id, tree_id, name, tier) VALUES (?, 1, ?, ?)",
                (i, name, i),
            )

        db.collapse_value_variants()

        names = {r[0] for r in conn.execute("SELECT name FROM enhancements")}
        assert names == {"Self-Reliant"}


class TestWholeBuildIdempotency:
    """Every writer the build replays leaves the row counts where they were.

    ``crafting_options`` was the table that grew, but the property has to hold
    table-wide: the build re-runs each writer over the same cached scrape, so any
    writer that appends is the same bug waiting for a different table.
    """

    ITEM_FIXTURE = [
        {
            "name": "Legendary Bracers of Deception",
            "equipment_slot": "Wrists",
            "item_type": "Clothing",
            "minimum_level": 29,
            "enchantments": [
                "{{Deception|7}}",
                "{{Stat|WIS|14}}",
                "{{Tactics|Combat Mastery|11}}",
                "Vorpal",
            ],
            "augment_slots": ["Yellow", "Colorless"],
            "quests": ["The Chronoscope"],
        },
    ]

    SET_FIXTURE = [
        {
            "name": "Seasons of the Feywild",
            "bonuses": [
                {"min_pieces": 2, "text": "{{Stat|CHA|3}}"},
                {"min_pieces": 3, "text": "[[True Seeing (enhancement)|True Seeing]]"},
            ],
        },
    ]

    UNIQUE_ENCHANTMENT_FIXTURE = [
        {
            "name": "Deception",
            "effect": "+X enhancement bonus to hit and +Y to damage for any hit "
                      "that would qualify as a sneak attack.",
            "wiki_url": "https://ddowiki.com/page/Deception",
        },
        {
            "name": "Combat Mastery",
            "effect": "+X Enhancement bonus to the DC to resist the character's "
                      "Trip, Sunder and Stunning Blow attempts.",
            "wiki_url": "https://ddowiki.com/page/Combat_Mastery",
        },
    ]

    def _write_everything(self, db: GameDB) -> None:
        """One full pass of the writers `build-db` replays on every run."""
        db.insert_unique_enchantments(self.UNIQUE_ENCHANTMENT_FIXTURE)
        db.insert_items(self.ITEM_FIXTURE)
        db.insert_set_bonus_effects(self.SET_FIXTURE)
        db.insert_crafting_options(CRAFTING_OPTIONS_FIXTURE)
        db.insert_quest_loot([
            {
                "quest_name": "The Chronoscope",
                "item_name": "Legendary Bracers of Deception",
                "loot_type": "chest",
            },
        ])
        db.populate_rarity(["Legendary Bracers of Deception"])
        db.repair_stored_rows()
        db.populate_enchantment_descriptions()
        db.renormalize_bonus_names()
        db.normalize_stored_text()
        db.collapse_value_variants()

    def test_no_table_grows_on_a_second_build(self) -> None:
        db = _fresh_db()
        self._write_everything(db)
        tables = [
            "items", "bonuses", "effects", "item_bonuses", "item_effects",
            "item_augment_slots", "set_bonuses", "set_bonus_items",
            "set_bonus_bonuses", "unique_enchantments", "quest_loot",
            "crafting_options",
        ]
        after_first = {t: _count(db.conn, t) for t in tables}

        self._write_everything(db)

        after_second = {t: _count(db.conn, t) for t in tables}
        assert after_second == after_first
        # A pass that wrote nothing at all would satisfy the equality above.
        assert after_first["bonuses"] > 0
        assert after_first["crafting_options"] == len(CRAFTING_OPTIONS_FIXTURE)
