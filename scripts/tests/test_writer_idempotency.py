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


# The three (name, modifier) pairs the shipped database holds under the two
# misrouted template names, plus one real effect that must survive the repair.
_MISROUTED_EFFECTS = [
    ("UpgradeableAugment", "Primary"),
    ("UpgradeableAugment", "Secondary"),
    ("Slaver's Slot", "Prefix"),
]


def _seed_misrouted_augment_effects(db: GameDB) -> None:
    """Recreate the pre-repair rows the old effect parser wrote."""
    db.insert_items([{
        "name": "Testwright Relic",
        "equipment_slot": "Trinket",
        "enchantments": ["Vorpal"],
    }])
    item_id = db.conn.execute(
        "SELECT id FROM items WHERE name = 'Testwright Relic'"
    ).fetchone()[0]
    for offset, (name, modifier) in enumerate(_MISROUTED_EFFECTS, start=1):
        db.conn.execute(
            "INSERT INTO effects (name, modifier) VALUES (?, ?)", (name, modifier)
        )
        effect_id = db.conn.execute(
            "SELECT id FROM effects WHERE name = ? AND modifier = ?", (name, modifier)
        ).fetchone()[0]
        db.conn.execute(
            "INSERT INTO item_effects (item_id, effect_id, value, sort_order, "
            "data_source) VALUES (?, ?, NULL, ?, 'wiki')",
            (item_id, effect_id, offset),
        )
    db.conn.commit()


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
                # One invocation per output shape the template has: an
                # enhancement pair, an orb bonus plus an implement, and a
                # magnitude of 0 that lands in `effects` as Masterwork.
                "{{Enhancement bonus|w|-2}}",
                "{{Enhancement bonus|oi|6|21}}",
                "{{Enhancement bonus|a|0}}",
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

    def test_enhancement_bonus_values_converge_as_well_as_counts(self) -> None:
        """Rebuilding must not move a single value, not just a single count.

        `{{Enhancement bonus|w|-2}}` is cursed gear, and 4c's sign flip proved
        that a normalization pass can invert a negative bonus on every build
        while the row counts sit perfectly still. The Masterwork row is here for
        the same reason from the other side: a magnitude of 0 must keep landing
        in `effects` rather than drifting into a `+0` bonus row.
        """
        db = _fresh_db()
        rows = []
        for _ in range(3):
            self._write_everything(db)
            rows.append(sorted(db.conn.execute(
                """
                SELECT s.name, bt.name, b.value, b.name, b.description
                  FROM item_bonuses ib
                  JOIN bonuses b ON b.id = ib.bonus_id
                  LEFT JOIN stats s ON s.id = b.stat_id
                  LEFT JOIN bonus_types bt ON bt.id = b.bonus_type_id
                 WHERE bt.name IN ('Enhancement', 'Implement', 'Orb')
                   AND s.name IN ('Attack Bonus', 'Damage Bonus',
                                  'Saving Throws', 'Universal Spell Power')
                """
            ).fetchall()))

        assert rows[0] == rows[1] == rows[2], "a rebuild pass rewrites values"
        assert rows[0] == sorted([
            ("Attack Bonus", "Enhancement", -2, "Attack Bonus -2",
             "-2 Enhancement penalty to Attack Bonus"),
            ("Damage Bonus", "Enhancement", -2, "Damage Bonus -2",
             "-2 Enhancement penalty to Damage Bonus"),
            ("Saving Throws", "Orb", 6, "Saving Throws +6",
             "+6 Orb bonus to Saving Throws"),
            ("Universal Spell Power", "Implement", 21,
             "Universal Spell Power +21",
             "+21 Implement bonus to Universal Spell Power"),
        ])

    def test_masterwork_stays_an_effect_across_rebuilds(self) -> None:
        db = _fresh_db()
        for _ in range(2):
            self._write_everything(db)

        assert db.conn.execute(
            "SELECT COUNT(*) FROM item_effects ie JOIN effects e ON e.id = ie.effect_id "
            "WHERE e.name = 'Masterwork'"
        ).fetchone()[0] == 1


class TestAugmentSlotsAreRewrittenPerItem:
    """`item_augment_slots` is keyed on (item_id, sort_order) — position only.

    That makes `INSERT OR IGNORE` actively wrong for this table: recognizing a
    newly-decoded family slot inserts it *before* the colour slots that were
    already stored, every later slot re-lands at a shifted offset, and the old
    value stays behind at the offset it used to hold. The whole list is rewritten
    per item instead, which is safe because `augment_id` is NULL on every row.
    """

    GREEN_ONLY = {
        "name": "Testwright Circlet",
        "equipment_slot": "Head",
        "enchantments": [],
        "augment_slots": ["green"],
    }
    WITH_FAMILY_SLOT = {
        **GREEN_ONLY,
        "augment_slots": ["lamordia: melancholic (accessory)", "green"],
    }

    def _slots(self, db: GameDB) -> list[tuple[int, str]]:
        return db.conn.execute(
            "SELECT ias.sort_order, t.label FROM item_augment_slots ias "
            "JOIN items i ON i.id = ias.item_id "
            "JOIN augment_slot_types t ON t.id = ias.slot_id "
            "WHERE i.name = 'Testwright Circlet' ORDER BY ias.sort_order"
        ).fetchall()

    def test_a_new_slot_at_the_front_leaves_no_ghost_behind(self) -> None:
        db = _fresh_db()
        db.insert_items([self.GREEN_ONLY])
        db.insert_items([self.WITH_FAMILY_SLOT])

        assert self._slots(db) == [
            (0, "lamordia: melancholic (accessory)"), (1, "green"),
        ]

    def test_repeated_writes_converge(self) -> None:
        db = _fresh_db()
        seen = []
        for _ in range(3):
            db.insert_items([self.WITH_FAMILY_SLOT])
            seen.append(self._slots(db))

        assert seen[0] == seen[1] == seen[2]
        assert len(seen[0]) == 2

    def test_a_shortened_list_drops_the_slots_that_went_away(self) -> None:
        """A wiki edit removing a slot must remove the row, not orphan it."""
        db = _fresh_db()
        db.insert_items([self.WITH_FAMILY_SLOT])
        db.insert_items([self.GREEN_ONLY])

        assert self._slots(db) == [(0, "green")]

    def test_an_empty_list_clears_every_stored_slot(self) -> None:
        """A wiki edit removing the last slot has to reach the database.

        This is the case that rules out "skip the delete when the incoming list
        is empty" as a way to protect multi-version pages from each other.
        """
        db = _fresh_db()
        db.insert_items([self.WITH_FAMILY_SLOT])

        db.insert_items([{**self.GREEN_ONLY, "augment_slots": []}])

        assert self._slots(db) == []

    def test_an_item_dict_without_the_key_leaves_the_stored_slots_alone(self) -> None:
        """The binary parser never produces `augment_slots`.

        Its dicts describe the same items, so a blanket rewrite would delete the
        wiki-sourced slots on every build.
        """
        db = _fresh_db()
        db.insert_items([self.WITH_FAMILY_SLOT])

        db.insert_items([{
            "name": "Testwright Circlet",
            "equipment_slot": "Head",
            "dat_id": "0x1234",
            "enchantments": [],
        }])

        assert self._slots(db) == [
            (0, "lamordia: melancholic (accessory)"), (1, "green"),
        ]

    def test_a_slot_label_resolves_case_insensitively(self) -> None:
        """Case is folded at the writer boundary, before the label identifies its
        definitions row — otherwise `Green` would define a second green socket
        that no augment (whose `slot_color` is lower-case) is ever matched to."""
        db = _fresh_db()
        db.insert_items([{**self.GREEN_ONLY, "augment_slots": ["Green", " Blue "]}])

        assert self._slots(db) == [(0, "green"), (1, "blue")]


class TestARouterChangeLeavesNoStaleRows:
    """Adding a row to an item shifts `sort_order`, which is part of the PK.

    `item_bonuses` is keyed on (item_id, bonus_id, sort_order), so `INSERT OR
    IGNORE` only recognises a row it has already written *at the same offset*.
    The moment a new routing step emits rows before the existing ones, every
    later enchantment lands at a fresh offset and the old copy stays behind.
    Rebuilding the shipped database after adding the {{Enhancement bonus}} step
    produced 7,972 such ghosts — real rows, correct values, silently doubling
    every affected item's enchantment list.

    Row counts alone cannot catch this: it only shows up when the *writer*
    changes, which is precisely when a "did the counts move?" check is expected
    to see movement.
    """

    BASE = {
        "name": "Shifting Blade",
        "equipment_slot": "Main Hand",
        "enchantments": ["{{Stat|STR|6}}", "{{Stat|CON|4}}"],
    }
    WITH_EXTRA = {
        **BASE,
        "enchantments": [
            "{{Enhancement bonus|w|5}}", "{{Stat|STR|6}}", "{{Stat|CON|4}}",
        ],
    }

    def _pairs(self, db: GameDB) -> list[tuple]:
        return db.conn.execute(
            """
            SELECT b.name, COUNT(*) AS copies, MIN(ib.sort_order)
              FROM item_bonuses ib
              JOIN bonuses b ON b.id = ib.bonus_id
             GROUP BY ib.item_id, ib.bonus_id
             ORDER BY b.name
            """
        ).fetchall()

    def test_a_new_routing_step_does_not_double_the_later_rows(self) -> None:
        db = _fresh_db()
        db.insert_items([self.BASE])
        db.insert_items([self.WITH_EXTRA])

        db.repair_stored_rows()

        copies = {name: n for name, n, _ in self._pairs(db)}
        assert copies == {
            "Attack Bonus +5": 1,
            "Damage Bonus +5": 1,
            "Strength +6": 1,
            "Constitution +4": 1,
        }

    def test_the_surviving_copy_is_the_one_the_current_writer_produced(self) -> None:
        """Keep the highest offset — the freshest write — or this never settles.

        Keeping the lowest reads as "first wins" and looks tidier, but the
        writer re-inserts at its own offset on the next run, so the repair would
        delete the same rows again on every build forever, and the shipped
        display order would stay frozen at the superseded parser's layout.
        """
        db = _fresh_db()
        db.insert_items([self.BASE])
        db.insert_items([self.WITH_EXTRA])

        db.repair_stored_rows()

        offsets = {name: offset for name, _, offset in self._pairs(db)}
        assert offsets["Attack Bonus +5"] == 0
        assert offsets["Damage Bonus +5"] == 1
        assert offsets["Strength +6"] == 2
        assert offsets["Constitution +4"] == 3

    def test_a_third_pass_deletes_nothing(self) -> None:
        """Convergence: once repaired, the writer stops producing ghosts."""
        db = _fresh_db()
        db.insert_items([self.BASE])
        db.insert_items([self.WITH_EXTRA])
        db.repair_stored_rows()

        db.insert_items([self.WITH_EXTRA])

        assert db.repair_stored_rows()["duplicate_item_bonuses_deleted"] == 0

    def test_the_repair_reports_zero_on_a_clean_database(self) -> None:
        db = _fresh_db()
        db.insert_items([self.WITH_EXTRA])
        db.repair_stored_rows()

        assert db.repair_stored_rows()["duplicate_item_bonuses_deleted"] == 0

    def test_the_same_shift_is_repaired_in_item_effects(self) -> None:
        """`item_effects` is keyed the same way and shifts for the same reason.

        A magnitude of 0 emits a Masterwork effect at offset 0, so every other
        effect on those items moved down a slot on the rebuild.
        """
        db = _fresh_db()
        db.insert_items([{
            "name": "Shifting Plate",
            "equipment_slot": "Body",
            "enchantments": ["Vorpal", "{{Bane|Evil Outsider|4}}"],
        }])
        db.insert_items([{
            "name": "Shifting Plate",
            "equipment_slot": "Body",
            "enchantments": [
                "{{Enhancement bonus|a|0}}", "Vorpal", "{{Bane|Evil Outsider|4}}",
            ],
        }])

        db.repair_stored_rows()

        rows = db.conn.execute(
            """
            SELECT e.name, ie.value, COUNT(*)
              FROM item_effects ie JOIN effects e ON e.id = ie.effect_id
             GROUP BY ie.item_id, ie.effect_id, COALESCE(ie.value, -1)
             ORDER BY e.name
            """
        ).fetchall()
        assert [(n, v, c) for n, v, c in rows] == [
            ("Bane", 4, 1), ("Masterwork", None, 1), ("Vorpal", None, 1),
        ]

    def test_the_misrouted_augment_templates_are_deleted(self) -> None:
        """`UpgradeableAugment` and `Slaver's Slot` became junk `item_effects`.

        Neither was in `_METADATA_TEMPLATES`, so the effect parser read them as
        weapon effects: 72 + 30 junction rows in the shipped database, under
        effect names that are template invocations rather than game concepts.
        The stale state cannot be produced through the writer any more — the
        parsers that made it are gone — so it is constructed the way the old
        writer wrote it.
        """
        db = _fresh_db()
        _seed_misrouted_augment_effects(db)

        deleted = db.repair_stored_rows()["misrouted_augment_effects_deleted"]

        assert deleted == 3
        assert db.conn.execute(
            "SELECT COUNT(*) FROM effects "
            "WHERE lower(name) IN ('upgradeableaugment', \"slaver's slot\")"
        ).fetchone()[0] == 0
        assert _count(db.conn, "item_effects") == 1, "an unrelated effect was deleted"

    def test_the_misrouted_deletion_is_idempotent(self) -> None:
        db = _fresh_db()
        _seed_misrouted_augment_effects(db)
        db.repair_stored_rows()

        assert db.repair_stored_rows()["misrouted_augment_effects_deleted"] == 0

    def test_the_canonical_upgradeable_effect_survives_the_repair(self) -> None:
        """The repair targets the raw template name, not the concept.

        `{{UpgradeableAugment|Primary}}` now stores `Upgradeable Augment`, and
        deleting that on the next build would undo the fix it is here to
        support.
        """
        db = _fresh_db()
        _seed_misrouted_augment_effects(db)
        db.insert_items([{
            "name": "Epic Testwright Locket",
            "equipment_slot": "Trinket",
            "enchantments": ["{{UpgradeableAugment|Primary}}"],
        }])

        db.repair_stored_rows()

        assert db.conn.execute(
            "SELECT e.name, e.modifier FROM item_effects ie "
            "JOIN effects e ON e.id = ie.effect_id "
            "JOIN items i ON i.id = ie.item_id "
            "WHERE i.name = 'Epic Testwright Locket'"
        ).fetchall() == [("Upgradeable Augment", "Primary")]

    def test_an_augments_slot_id_is_backfilled_from_its_slot_colour(self) -> None:
        """`augments.slot_color` is the wiki-sourced display fallback; `slot_id`
        is what the candidate query joins on.

        `insert_augments` uses INSERT OR IGNORE, so the 1,279 rows already
        stored never get the FK from a re-scrape — the repair pass is the only
        thing that can reach them.
        """
        db = _fresh_db()
        db.insert_items([{
            "name": "Testwright Circlet",
            "equipment_slot": "Head",
            "enchantments": [],
            "augment_slots": ["lamordia: melancholic (accessory)", "sun"],
        }])
        db.conn.execute(
            "INSERT INTO augments (name, slot_color) VALUES "
            "('Melancholic Charisma', 'lamordia: melancholic (accessory)'), "
            "('Solar Gem of Abjuration', 'sun')"
        )

        backfilled = db.repair_stored_rows()["augment_slot_ids_backfilled"]

        assert backfilled == 2
        assert db.conn.execute(
            "SELECT a.name, t.label FROM augments a "
            "JOIN augment_slot_types t ON t.id = a.slot_id ORDER BY a.name"
        ).fetchall() == [
            ("Melancholic Charisma", "lamordia: melancholic (accessory)"),
            ("Solar Gem of Abjuration", "sun"),
        ]

    def test_the_slot_id_backfill_is_idempotent(self) -> None:
        db = _fresh_db()
        db.insert_items([{
            "name": "Testwright Circlet", "equipment_slot": "Head",
            "enchantments": [], "augment_slots": ["sun"],
        }])
        db.conn.execute("INSERT INTO augments (name, slot_color) VALUES ('Solar Gem', 'sun')")
        db.repair_stored_rows()

        assert db.repair_stored_rows()["augment_slot_ids_backfilled"] == 0

    def test_a_slot_colour_with_no_definition_stays_null(self) -> None:
        """The definitions table only holds sockets some item actually carries.

        A `slot_color` naming none of them (or naming nothing in the vocabulary
        at all) leaves the FK NULL rather than inventing a definition — the
        display fallback still renders, which is the whole point of keeping it.
        """
        db = _fresh_db()
        db.conn.execute(
            "INSERT INTO augments (name, slot_color) VALUES "
            "('Unsocketable Gem', 'chartreuse'), ('Orphan Gem', 'moon')"
        )

        assert db.repair_stored_rows()["augment_slot_ids_backfilled"] == 0
        assert db.conn.execute(
            "SELECT COUNT(*) FROM augments WHERE slot_id IS NOT NULL"
        ).fetchone()[0] == 0

    def test_two_magnitudes_of_one_effect_are_not_collapsed(self) -> None:
        """`item_effects.value` sits outside the key: Bane 2 and Bane 4 differ."""
        db = _fresh_db()
        db.insert_items([{
            "name": "Twin Bane",
            "equipment_slot": "Main Hand",
            "enchantments": ["{{Bane|Evil Outsider|2}}", "{{Bane|Undead|4}}"],
        }])

        db.repair_stored_rows()

        values = sorted(
            r[0] for r in db.conn.execute(
                "SELECT ie.value FROM item_effects ie JOIN effects e "
                "ON e.id = ie.effect_id WHERE e.name = 'Bane'"
            )
        )
        assert values == [2, 4]
