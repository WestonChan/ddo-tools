"""Integration tests for the DDO game database module."""

from __future__ import annotations

import sqlite3

import pytest

from ddo_data.db import GameDB


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _tables(conn: sqlite3.Connection) -> set[str]:
    """Return set of table names in the database."""
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()
    return {r[0] for r in rows}


def _count(conn: sqlite3.Connection, table: str) -> int:
    return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


# ---------------------------------------------------------------------------
# Schema tests
# ---------------------------------------------------------------------------


def test_create_schema_tables() -> None:
    """create_schema() creates all expected core tables."""
    with GameDB(":memory:") as db:
        db.create_schema()
        tables = _tables(db.conn)

    expected = {
        "stats", "bonus_types", "skills", "damage_types",
        "weapon_proficiencies", "weapon_types", "equipment_slots", "spell_schools",
        "classes", "races", "items", "feats", "enhancements", "enhancement_trees",
        "effects", "item_effects", "filigrees",
        "bonuses", "item_bonuses", "augment_bonuses", "enhancement_bonuses",
        "set_bonus_bonuses",
        "item_weapon_stats", "item_armor_stats", "item_augment_slots",
        "feat_bonus_classes", "feat_past_life_stats", "schema_version",
    }
    assert expected.issubset(tables)


def test_create_schema_seeds_reference_data() -> None:
    """create_schema() seeds reference tables with DDO game data."""
    with GameDB(":memory:") as db:
        db.create_schema()
        conn = db.conn
        assert _count(conn, "stats") >= 6        # at least 6 ability scores
        assert _count(conn, "skills") == 21      # 21 DDO skills
        assert _count(conn, "bonus_types") >= 10
        assert _count(conn, "damage_types") >= 10
        assert _count(conn, "weapon_proficiencies") == 3
        assert _count(conn, "spell_schools") == 9


def test_create_schema_idempotent() -> None:
    """Calling create_schema() twice does not raise and does not duplicate seed data."""
    with GameDB(":memory:") as db:
        db.create_schema()
        first_stats = _count(db.conn, "stats")
        db.create_schema()
        assert _count(db.conn, "stats") == first_stats


# ---------------------------------------------------------------------------
# insert_items tests
# ---------------------------------------------------------------------------


MINIMAL_ITEM: dict = {
    "name": "Ring of the Stalker",
    "minimum_level": 10,
    "description": "A ring for stalkers.",
    "enchantments": [],
    "augment_slots": [],
}


def test_insert_items_basic() -> None:
    """Basic item fields round-trip through items table."""
    with GameDB(":memory:") as db:
        db.create_schema()
        count = db.insert_items([MINIMAL_ITEM])
        assert count == 1
        row = db.conn.execute(
            "SELECT name, minimum_level, description FROM items WHERE name = ?",
            ("Ring of the Stalker",),
        ).fetchone()
    assert row is not None
    assert row[0] == "Ring of the Stalker"
    assert row[1] == 10
    assert row[2] == "A ring for stalkers."


def test_insert_items_weapon() -> None:
    """Weapon fields go to item_weapon_stats."""
    weapon = {
        "name": "Sword of Fire",
        "item_type": "Weapon",
        "damage": "1d8+5",
        "critical": "19-20/x2",
        "weapon_type": "Longsword",
        "proficiency": "Martial",
        "handedness": "One-handed",
        "enchantments": [],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        count = db.insert_items([weapon])
        assert count == 1
        row = db.conn.execute(
            "SELECT damage, critical, weapon_type, proficiency, handedness "
            "FROM item_weapon_stats iws "
            "JOIN items i ON iws.item_id = i.id "
            "WHERE i.name = ?",
            ("Sword of Fire",),
        ).fetchone()
    assert row is not None
    assert row[0] == "1d8+5"
    assert row[2] == "Longsword"
    assert row[4] == "One-handed"


def test_insert_items_weapon_handedness_normalised() -> None:
    """Handedness strings are normalised to schema CHECK values."""
    weapon = {
        "name": "Big Axe",
        "damage": "1d12",
        "handedness": "two-handed",  # lowercase, hyphenated
        "enchantments": [],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([weapon])
        row = db.conn.execute(
            "SELECT handedness FROM item_weapon_stats iws "
            "JOIN items i ON iws.item_id = i.id WHERE i.name = ?",
            ("Big Axe",),
        ).fetchone()
    assert row is not None
    assert row[0] == "Two-handed"


def test_insert_items_armor() -> None:
    """Armor fields go to item_armor_stats."""
    armor = {
        "name": "Full Plate",
        "item_type": "Armor",
        "armor_bonus": 8,
        "max_dex_bonus": 1,
        "enchantments": [],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([armor])
        row = db.conn.execute(
            "SELECT armor_bonus, max_dex_bonus "
            "FROM item_armor_stats ias "
            "JOIN items i ON ias.item_id = i.id WHERE i.name = ?",
            ("Full Plate",),
        ).fetchone()
    assert row is not None
    assert row[0] == 8
    assert row[1] == 1


def test_insert_items_augment_slots() -> None:
    """augment_slots list creates item_augment_slots rows with correct sort_order."""
    item = {
        "name": "Augmented Ring",
        "augment_slots": ["Blue", "Yellow", "Colorless"],
        "enchantments": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        rows = db.conn.execute(
            "SELECT sort_order, slot_type FROM item_augment_slots ias "
            "JOIN items i ON ias.item_id = i.id "
            "WHERE i.name = ? ORDER BY sort_order",
            ("Augmented Ring",),
        ).fetchall()
    assert len(rows) == 3
    assert rows[0] == (0, "Blue")
    assert rows[1] == (1, "Yellow")
    assert rows[2] == (2, "Colorless")


def test_insert_items_enchantments_go_to_effects() -> None:
    """Plain text enchantments route to item_effects as named effects."""
    item = {
        "name": "Magic Ring",
        "enchantments": ["Strength +6", "Insightful Dexterity +3"],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        rows = db.conn.execute(
            """SELECT e.name FROM item_effects ie
               JOIN effects e ON ie.effect_id = e.id
               JOIN items i ON ie.item_id = i.id
               WHERE i.name = ? ORDER BY ie.sort_order""",
            ("Magic Ring",),
        ).fetchall()
    assert len(rows) == 2
    assert rows[0][0] == "Strength +6"
    assert rows[1][0] == "Insightful Dexterity +3"


def test_insert_items_item_category_mapped() -> None:
    """item_type 'ring' is mapped to item_category 'Jewelry'."""
    item = {
        "name": "Some Ring",
        "item_type": "Ring",
        "enchantments": [],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        row = db.conn.execute(
            "SELECT item_category FROM items WHERE name = ?", ("Some Ring",)
        ).fetchone()
    assert row is not None
    assert row[0] == "Jewelry"


def test_insert_items_idempotent() -> None:
    """Inserting the same item twice does not raise or create duplicate rows."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([MINIMAL_ITEM])
        db.insert_items([MINIMAL_ITEM])
        assert _count(db.conn, "items") == 1


def test_insert_items_skips_missing_name() -> None:
    """Items with no name are skipped without raising."""
    with GameDB(":memory:") as db:
        db.create_schema()
        count = db.insert_items([{"name": None, "enchantments": [], "augment_slots": []}])
    assert count == 0


def test_insert_items_slot_id_resolved_from_equipment_slot() -> None:
    """equipment_slot name is resolved to slot_id FK via equipment_slots seed."""
    item = {
        "name": "Sword of Testing",
        "equipment_slot": "Main Hand",
        "enchantments": [],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        row = db.conn.execute(
            "SELECT slot_id, equipment_slot FROM items WHERE name = ?",
            ("Sword of Testing",),
        ).fetchone()
        # Confirm the FK resolved to the seeded "Main Hand" row
        main_hand_id = db.conn.execute(
            "SELECT id FROM equipment_slots WHERE name = 'Main Hand'"
        ).fetchone()[0]
    assert row is not None
    assert row[0] == main_hand_id
    assert row[1] == "Main Hand"


def test_insert_items_slot_id_null_when_slot_unknown() -> None:
    """equipment_slot with no matching seed row leaves slot_id NULL."""
    item = {
        "name": "Mystery Item",
        "equipment_slot": "Unknown Slot",
        "enchantments": [],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        row = db.conn.execute(
            "SELECT slot_id FROM items WHERE name = ?", ("Mystery Item",)
        ).fetchone()
    assert row is not None
    assert row[0] is None


def test_insert_items_slot_id_null_when_slot_absent() -> None:
    """Item with no equipment_slot key at all gets slot_id NULL (not an error)."""
    item = {
        "name": "Slotless Gem",
        "enchantments": [],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        row = db.conn.execute(
            "SELECT slot_id, equipment_slot FROM items WHERE name = ?", ("Slotless Gem",)
        ).fetchone()
    assert row is not None
    assert row[0] is None
    assert row[1] is None


def test_insert_items_off_hand_codes_resolve_to_same_slot() -> None:
    """Binary slot codes 13 and 16 both map to 'Off Hand' and share the same slot_id FK."""
    shield = {"name": "Tower Shield", "equipment_slot": "Off Hand", "enchantments": [], "augment_slots": []}
    offhand = {"name": "Orb of Fire", "equipment_slot": "Off Hand", "enchantments": [], "augment_slots": []}
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([shield, offhand])
        rows = db.conn.execute(
            "SELECT slot_id FROM items WHERE name IN ('Tower Shield', 'Orb of Fire') ORDER BY name"
        ).fetchall()
    assert len(rows) == 2
    assert rows[0][0] == rows[1][0]   # both resolve to the same slot_id
    assert rows[0][0] is not None


def test_insert_items_bonus_pass_a_with_known_stat() -> None:
    """_bonuses with a resolvable stat name creates a bonuses row with stat_id set."""
    item = {
        "name": "Ring of Haggling",
        "enchantments": [],
        "augment_slots": [],
        "_bonuses": [
            {
                "entry_type": 53,
                "stat_def_id": 376,
                "stat": "Haggle",
                "magnitude": 15,
                "bonus_type_code": 0x0100,
                "bonus_type": "Enhancement",
            }
        ],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        row = db.conn.execute(
            """
            SELECT b.name, b.value, b.stat_id, b.bonus_type_id
            FROM item_bonuses ib
            JOIN bonuses b ON b.id = ib.bonus_id
            JOIN items i ON i.id = ib.item_id
            WHERE i.name = ?
            """,
            ("Ring of Haggling",),
        ).fetchone()
        haggle_stat_id = db.conn.execute(
            "SELECT id FROM stats WHERE name = 'Haggle'"
        ).fetchone()[0]
        enhancement_bt_id = db.conn.execute(
            "SELECT id FROM bonus_types WHERE name = 'Enhancement'"
        ).fetchone()[0]
    assert row is not None
    assert row[0] == "Haggle +15"
    assert row[1] == 15
    assert row[2] == haggle_stat_id
    assert row[3] == enhancement_bt_id


def test_insert_items_pass_b_sort_order_offset() -> None:
    """Pass B enchantments start at sort_order = len(_bonuses), not 0."""
    item = {
        "name": "Fancy Glove",
        "enchantments": ["Fire Resistance +20", "Proof Against Poison"],
        "augment_slots": [],
        "_bonuses": [
            {
                "entry_type": 53,
                "stat_def_id": 376,
                "stat": "Haggle",
                "magnitude": 5,
                "bonus_type_code": 0x0100,
                "bonus_type": "Enhancement",
            },
            {
                "entry_type": 53,
                "stat_def_id": 1941,
                "stat": "Spell Points",
                "magnitude": 50,
                "bonus_type_code": 0x0100,
                "bonus_type": "Enhancement",
            },
        ],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        rows = db.conn.execute(
            """
            SELECT ib.sort_order, b.name, b.stat_id
            FROM item_bonuses ib
            JOIN bonuses b ON b.id = ib.bonus_id
            JOIN items i ON i.id = ib.item_id
            WHERE i.name = ?
            ORDER BY ib.sort_order
            """,
            ("Fancy Glove",),
        ).fetchall()
    # Pass A: sort_orders 0 and 1 (both stats known)
    assert rows[0][0] == 0
    assert rows[0][2] is not None   # stat_id resolved
    assert rows[1][0] == 1
    assert rows[1][2] is not None
    # Pass B: "Fire Resistance +20" and "Proof Against Poison" are plain text
    # → routed to item_effects (not bonuses)
    assert len(rows) == 2  # only Pass A bonuses


def test_insert_items_pass_b_parses_stat_template() -> None:
    """Wiki {{Stat|STR|7}} enchantment resolves to structured bonus with stat_id."""
    item = {
        "name": "Belt of Power",
        "enchantments": ["{{Stat|STR|7}}", "{{Ghostly}}"],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        rows = db.conn.execute(
            """
            SELECT b.name, b.stat_id, b.bonus_type_id, b.value
            FROM item_bonuses ib
            JOIN bonuses b ON b.id = ib.bonus_id
            JOIN items i ON i.id = ib.item_id
            WHERE i.name = ?
            ORDER BY ib.sort_order
            """,
            ("Belt of Power",),
        ).fetchall()
        # {{Stat|STR|7}} → bonuses table with resolved stat_id
        assert len(rows) == 1
        assert rows[0][0] == "Strength +7"
        stat_id = rows[0][1]
        assert stat_id is not None  # resolved from stats seed
        stat_name = db.conn.execute(
            "SELECT name FROM stats WHERE id = ?", (stat_id,)
        ).fetchone()[0]
        assert stat_name == "Strength"
        assert rows[0][2] is not None  # bonus_type_id (Enhancement)
        assert rows[0][3] == 7  # value
        # {{Ghostly}} → item_effects table (weapon effect, not a stat bonus)
        effect_rows = db.conn.execute(
            """
            SELECT e.name FROM item_effects ie
            JOIN effects e ON ie.effect_id = e.id
            JOIN items i ON ie.item_id = i.id
            WHERE i.name = ?
            """,
            ("Belt of Power",),
        ).fetchall()
        assert len(effect_rows) == 1
        assert effect_rows[0][0] == "Ghostly"


def test_insert_items_pass_b_parses_spellpower_template() -> None:
    """Wiki {{SpellPower|Devotion|30}} resolves to Positive Spell Power +30."""
    item = {
        "name": "Healing Focus",
        "enchantments": ["{{SpellPower|Devotion|30}}"],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        rows = db.conn.execute(
            """
            SELECT b.name, b.value
            FROM item_bonuses ib
            JOIN bonuses b ON b.id = ib.bonus_id
            JOIN items i ON i.id = ib.item_id
            WHERE i.name = ?
            """,
            ("Healing Focus",),
        ).fetchall()
    assert len(rows) == 1
    assert rows[0][0] == "Positive Spell Power +30"
    assert rows[0][1] == 30


def test_insert_items_effects_table() -> None:
    """Weapon effect templates create rows in effects + item_effects tables."""
    item = {
        "name": "Epic Sword",
        "enchantments": ["{{Vorpal}}", "{{Bane|Evil Outsider|4}}"],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        # Check effects reference table
        effects = db.conn.execute(
            "SELECT name, modifier FROM effects ORDER BY name"
        ).fetchall()
        assert ("Bane", "Evil Outsider") in effects
        assert ("Vorpal", None) in effects
        # Check item_effects junction
        rows = db.conn.execute(
            """
            SELECT e.name, e.modifier, ie.value, ie.sort_order
            FROM item_effects ie
            JOIN effects e ON ie.effect_id = e.id
            JOIN items i ON ie.item_id = i.id
            WHERE i.name = ?
            ORDER BY ie.sort_order
            """,
            ("Epic Sword",),
        ).fetchall()
        assert len(rows) == 2
        assert rows[0][0] == "Vorpal"
        assert rows[0][1] is None  # no modifier
        assert rows[0][2] is None  # no value
        assert rows[1][0] == "Bane"
        assert rows[1][1] == "Evil Outsider"
        assert rows[1][2] == 4  # value


def test_insert_items_pass_b_skips_metadata() -> None:
    """Metadata templates (augments, sets) don't go to bonuses or item_effects."""
    item = {
        "name": "Test Ring",
        "enchantments": [
            "{{Augment|Red}}",
            "{{Named item sets|Slave Lords}}",
            "{{Stat|STR|7}}",
        ],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        # Only the Stat template should create a bonus
        bonus_count = db.conn.execute(
            "SELECT COUNT(*) FROM item_bonuses"
        ).fetchone()[0]
        assert bonus_count == 1
        # No effects should be created
        effect_count = db.conn.execute(
            "SELECT COUNT(*) FROM item_effects"
        ).fetchone()[0]
        assert effect_count == 0


def test_insert_items_set_membership() -> None:
    """Items with set_name or {{Named item sets}} create set_bonuses + set_bonus_items rows."""
    items = [
        {
            "name": "Helm of the Stalker",
            "set_name": "Stalker Set",
            "enchantments": [],
            "augment_slots": [],
        },
        {
            "name": "Ring of the Stalker",
            "enchantments": ["{{Named item sets|Stalker Set}}"],
            "augment_slots": [],
        },
    ]
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items(items)
        # Should have 1 set
        sets = db.conn.execute("SELECT id, name FROM set_bonuses").fetchall()
        assert len(sets) == 1
        assert sets[0][1] == "Stalker Set"
        # Both items should be linked
        links = db.conn.execute("SELECT COUNT(*) FROM set_bonus_items").fetchone()[0]
        assert links == 2


# ---------------------------------------------------------------------------
# insert_feats tests
# ---------------------------------------------------------------------------


MINIMAL_FEAT: dict = {
    "name": "Power Attack",
    "description": "Trade attack bonus for damage.",
    "free": False,
    "passive": False,
    "active": True,
    "stance": False,
    "metamagic": False,
    "epic_destiny": False,
    "bonus_classes": [],
}


def test_insert_feats_basic() -> None:
    """Basic feat fields round-trip through feats table."""
    with GameDB(":memory:") as db:
        db.create_schema()
        count = db.insert_feats([MINIMAL_FEAT])
        assert count == 1
        row = db.conn.execute(
            "SELECT name, is_active, is_passive FROM feats WHERE name = ?",
            ("Power Attack",),
        ).fetchone()
    assert row is not None
    assert row[0] == "Power Attack"
    assert row[1] == 1   # is_active = True
    assert row[2] == 0   # is_passive = False


def test_insert_feats_boolean_flags() -> None:
    """All boolean flag fields are stored as 0/1 integers."""
    feat = {
        "name": "Empower Spell",
        "free": True,
        "passive": True,
        "active": False,
        "stance": False,
        "metamagic": True,
        "epic_destiny": False,
        "bonus_classes": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_feats([feat])
        row = db.conn.execute(
            "SELECT is_free, is_passive, is_active, is_stance, is_metamagic, is_epic_destiny "
            "FROM feats WHERE name = ?",
            ("Empower Spell",),
        ).fetchone()
    assert row == (1, 1, 0, 0, 1, 0)


def test_insert_feats_bonus_classes_with_known_class() -> None:
    """bonus_classes entries create feat_bonus_classes rows when class exists."""
    with GameDB(":memory:") as db:
        db.create_schema()
        # Fighter is pre-seeded in classes table
        feat = {
            "name": "Cleave",
            "active": True,
            "free": False, "passive": False, "stance": False,
            "metamagic": False, "epic_destiny": False,
            "bonus_classes": ["Fighter"],
        }
        db.insert_feats([feat])
        row = db.conn.execute(
            "SELECT f.name, c.name FROM feat_bonus_classes fbc "
            "JOIN feats f ON fbc.feat_id = f.id "
            "JOIN classes c ON fbc.class_id = c.id",
        ).fetchone()
    assert row is not None
    assert row[0] == "Cleave"
    assert row[1] == "Fighter"


def test_insert_feats_bonus_classes_unknown_class() -> None:
    """Unknown class names in bonus_classes are silently skipped."""
    feat = {
        "name": "Weapon Focus",
        "active": False, "free": False, "passive": True,
        "stance": False, "metamagic": False, "epic_destiny": False,
        "bonus_classes": ["Nonexistent Class", "Another Fake"],  # not in classes seed
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        count = db.insert_feats([feat])
        assert count == 1   # feat itself inserted
        bonus_count = _count(db.conn, "feat_bonus_classes")
    assert bonus_count == 0   # no junction rows (classes not in DB)


def test_insert_feats_past_life_subtype() -> None:
    """Past life feats populate feat_past_life_stats; class_id resolved by name."""
    with GameDB(":memory:") as db:
        db.create_schema()
        # Fighter is pre-seeded in classes table
        feat = {
            "name": "Past Life: Fighter",
            "passive": True,
            "free": False, "active": False, "stance": False,
            "metamagic": False, "epic_destiny": False,
            "past_life_type": "heroic",
            "past_life_class": "Fighter",
            "past_life_max_stacks": 3,
        }
        db.insert_feats([feat])
        row = db.conn.execute(
            """
            SELECT pls.past_life_type, pls.max_stacks, c.name
            FROM feat_past_life_stats pls
            JOIN feats f ON f.id = pls.feat_id
            LEFT JOIN classes c ON c.id = pls.class_id
            WHERE f.name = ?
            """,
            ("Past Life: Fighter",),
        ).fetchone()
    assert row == ("heroic", 3, "Fighter")


def test_insert_feats_idempotent() -> None:
    """Inserting the same feat twice does not raise or duplicate rows."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_feats([MINIMAL_FEAT])
        db.insert_feats([MINIMAL_FEAT])
        assert _count(db.conn, "feats") == 1


# ---------------------------------------------------------------------------
# insert_enhancement_trees tests
# ---------------------------------------------------------------------------


KENSEI_TREE: dict = {
    "name": "Kensei",
    "type": "class",
    "class_or_race": "Fighter",
    "enhancements": [
        {
            "name": "Weapon Specialization",
            "icon": "icon_kensei.png",
            "description": "You gain Weapon Specialization.",
            "ranks": 3,
            "ap_cost": 1,
            "progression": 0,
            "level": "Fighter Level 1",
            "prerequisite": None,
            "tier": "core",
        },
        {
            "name": "Strike With No Thought",
            "icon": None,
            "description": "Your attacks are faster.",
            "ranks": 1,
            "ap_cost": 2,
            "progression": 5,
            "level": "Fighter Level 3",
            "prerequisite": "Weapon Specialization",
            "tier": "1",
        },
    ],
}


def test_insert_enhancement_trees_basic() -> None:
    """Enhancement tree and its enhancements are inserted correctly."""
    with GameDB(":memory:") as db:
        db.create_schema()
        count = db.insert_enhancement_trees([KENSEI_TREE])
        assert count == 1
        tree = db.conn.execute(
            "SELECT name, tree_type, ap_pool FROM enhancement_trees WHERE name = ?",
            ("Kensei",),
        ).fetchone()
        assert tree is not None
        assert tree[0] == "Kensei"
        # Fighter is seeded in classes table, so class link resolves
        assert tree[1] == "class"
        assert tree[2] == "heroic"
        enh_count = _count(db.conn, "enhancements")
    assert enh_count == 2


def test_insert_enhancement_trees_class_link_resolved() -> None:
    """tree_type='class' links to class_id when class exists in classes table."""
    with GameDB(":memory:") as db:
        db.create_schema()
        # Fighter is pre-seeded in classes table
        db.insert_enhancement_trees([KENSEI_TREE])
        row = db.conn.execute(
            "SELECT t.tree_type, c.name FROM enhancement_trees t "
            "LEFT JOIN classes c ON t.class_id = c.id WHERE t.name = ?",
            ("Kensei",),
        ).fetchone()
    assert row is not None
    assert row[0] == "class"
    assert row[1] == "Fighter"


def test_insert_enhancement_trees_description() -> None:
    """Enhancement description is stored on the enhancements table."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_enhancement_trees([KENSEI_TREE])
        row = db.conn.execute(
            "SELECT description, max_ranks FROM enhancements WHERE name = ?",
            ("Weapon Specialization",),
        ).fetchone()
    assert row is not None
    assert row[0] == "You gain Weapon Specialization."
    assert row[1] == 3


def test_insert_enhancement_trees_max_ranks() -> None:
    """The ranks field from the dict maps to max_ranks column."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_enhancement_trees([KENSEI_TREE])
        row = db.conn.execute(
            "SELECT max_ranks FROM enhancements WHERE name = ?",
            ("Weapon Specialization",),
        ).fetchone()
    assert row is not None
    assert row[0] == 3


def test_insert_enhancement_trees_universal() -> None:
    """Universal trees have ap_pool='heroic' and no class_id/race_id."""
    tree = {
        "name": "Harper Agent",
        "type": "universal",
        "class_or_race": None,
        "enhancements": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_enhancement_trees([tree])
        row = db.conn.execute(
            "SELECT tree_type, ap_pool, class_id, race_id "
            "FROM enhancement_trees WHERE name = ?",
            ("Harper Agent",),
        ).fetchone()
    assert row is not None
    assert row[0] == "universal"
    assert row[1] == "heroic"
    assert row[2] is None
    assert row[3] is None


def test_insert_enhancement_trees_racial() -> None:
    """Racial trees have ap_pool='racial'."""
    tree = {
        "name": "Deepwood Stalker",
        "type": "racial",
        "class_or_race": "Elf",
        "enhancements": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        # Elf is pre-seeded in races table
        db.insert_enhancement_trees([tree])
        row = db.conn.execute(
            "SELECT tree_type, ap_pool FROM enhancement_trees WHERE name = ?",
            ("Deepwood Stalker",),
        ).fetchone()
    assert row is not None
    assert row[0] == "racial"
    assert row[1] == "racial"


def test_insert_enhancement_trees_idempotent() -> None:
    """Inserting the same tree twice does not raise or duplicate rows."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_enhancement_trees([KENSEI_TREE])
        db.insert_enhancement_trees([KENSEI_TREE])
        assert _count(db.conn, "enhancement_trees") == 1
        assert _count(db.conn, "enhancements") == 2


# ---------------------------------------------------------------------------
# quest_loot / loot_type tests
# ---------------------------------------------------------------------------


def _seed_loot_fixture(db: GameDB) -> None:
    """Two items and two quests to hang quest_loot rows off."""
    db.conn.executemany(
        "INSERT INTO items (id, name) VALUES (?, ?)",
        [(1, "Epic Nightmare"), (2, "Bloodrage Symbiont")],
    )
    db.conn.executemany(
        "INSERT INTO quests (id, name) VALUES (?, ?)",
        [(1, "The Master Artificer"), (2, "Haywire Foundry")],
    )
    db.conn.commit()


def _loot_type(db: GameDB, quest_id: int, item_id: int) -> str | None:
    row = db.conn.execute(
        "SELECT loot_type FROM quest_loot WHERE quest_id = ? AND item_id = ?",
        (quest_id, item_id),
    ).fetchone()
    return None if row is None else row[0]


def test_quest_loot_has_loot_type_column() -> None:
    """quest_loot carries loot_type so raid-ness lives in the DB."""
    with GameDB(":memory:") as db:
        db.create_schema()
        cols = {r[1] for r in db.conn.execute("PRAGMA table_info(quest_loot)")}
    assert "loot_type" in cols


def test_create_schema_adds_loot_type_to_preexisting_table() -> None:
    """An older DB gains loot_type on the next create_schema run.

    The DDL is all CREATE TABLE IF NOT EXISTS, so a database built before the
    column existed would silently keep the two-column shape and every
    loot_type query would fail. The already-committed public/data/ddo.db is
    exactly that case.
    """
    with GameDB(":memory:") as db:
        db.create_schema()
        # Roll quest_loot back to its pre-column shape, leaving the rest of the
        # schema intact — this is the state of the committed ddo.db.
        db.conn.executescript("""
            DROP TABLE quest_loot;
            CREATE TABLE quest_loot (
                quest_id INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
                item_id  INTEGER NOT NULL REFERENCES items(id),
                PRIMARY KEY (quest_id, item_id)
            );
        """)
        db.conn.commit()
        assert "loot_type" not in {
            r[1] for r in db.conn.execute("PRAGMA table_info(quest_loot)")
        }

        db.create_schema()

        assert "loot_type" in {
            r[1] for r in db.conn.execute("PRAGMA table_info(quest_loot)")
        }


def test_create_schema_migration_is_idempotent() -> None:
    """Re-running create_schema on an up-to-date DB doesn't raise."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.create_schema()
        cols = [r[1] for r in db.conn.execute("PRAGMA table_info(quest_loot)")]
    assert cols.count("loot_type") == 1


def test_quest_loot_rejects_unknown_loot_type() -> None:
    """The CHECK constraint pins loot_type to the LootType enum."""
    with GameDB(":memory:") as db:
        db.create_schema()
        _seed_loot_fixture(db)
        with pytest.raises(sqlite3.IntegrityError):
            db.conn.execute(
                "INSERT INTO quest_loot (quest_id, item_id, loot_type) VALUES (1, 1, 'bogus')"
            )


def test_insert_quest_loot_stores_loot_type() -> None:
    """A scraped raid entry lands with loot_type='raid'."""
    with GameDB(":memory:") as db:
        db.create_schema()
        _seed_loot_fixture(db)
        db.insert_quest_loot([{
            "quest_name": "The Master Artificer",
            "item_name": "Epic Nightmare",
            "loot_type": "raid",
        }])
        assert _loot_type(db, 1, 1) == "raid"


def test_insert_quest_loot_raid_overwrites_chest() -> None:
    """Raid wins when the same quest+item arrives as chest loot first.

    This is the precedence insert_quest_loot's docstring always claimed but
    never implemented (it used INSERT OR IGNORE into a 2-column table).
    """
    with GameDB(":memory:") as db:
        db.create_schema()
        _seed_loot_fixture(db)
        db.insert_quest_loot([
            {"quest_name": "The Master Artificer", "item_name": "Epic Nightmare",
             "loot_type": "chest"},
            {"quest_name": "The Master Artificer", "item_name": "Epic Nightmare",
             "loot_type": "raid"},
        ])
        assert _count(db.conn, "quest_loot") == 1
        assert _loot_type(db, 1, 1) == "raid"


def test_insert_quest_loot_chest_does_not_downgrade_raid() -> None:
    """A later chest entry must not clobber an existing raid tag.

    Guards the case where category ordering is disturbed or a re-run
    processes entries out of order — raid is strictly more specific.
    """
    with GameDB(":memory:") as db:
        db.create_schema()
        _seed_loot_fixture(db)
        db.insert_quest_loot([
            {"quest_name": "The Master Artificer", "item_name": "Epic Nightmare",
             "loot_type": "raid"},
            {"quest_name": "The Master Artificer", "item_name": "Epic Nightmare",
             "loot_type": "chest"},
        ])
        assert _loot_type(db, 1, 1) == "raid"


def test_insert_quest_loot_tolerates_missing_loot_type() -> None:
    """Entries without loot_type still insert (column is nullable)."""
    with GameDB(":memory:") as db:
        db.create_schema()
        _seed_loot_fixture(db)
        db.insert_quest_loot([{
            "quest_name": "Haywire Foundry",
            "item_name": "Bloodrage Symbiont",
        }])
        assert _loot_type(db, 2, 2) is None


def test_backfill_quest_loot_types_marks_raid_rows() -> None:
    """Backfill tags rows whose quest is a known raid, leaving others alone."""
    with GameDB(":memory:") as db:
        db.create_schema()
        _seed_loot_fixture(db)
        db.insert_quest_loot([
            {"quest_name": "The Master Artificer", "item_name": "Epic Nightmare"},
            {"quest_name": "Haywire Foundry", "item_name": "Bloodrage Symbiont"},
        ])

        updated = db.backfill_quest_loot_types(["The Master Artificer"])

        assert updated == 1
        assert _loot_type(db, 1, 1) == "raid"
        assert _loot_type(db, 2, 2) is None


def test_backfill_quest_loot_types_is_idempotent() -> None:
    """Running the backfill twice changes nothing the second time."""
    with GameDB(":memory:") as db:
        db.create_schema()
        _seed_loot_fixture(db)
        db.insert_quest_loot([
            {"quest_name": "The Master Artificer", "item_name": "Epic Nightmare"},
        ])
        assert db.backfill_quest_loot_types(["The Master Artificer"]) == 1
        assert db.backfill_quest_loot_types(["The Master Artificer"]) == 0


def test_backfill_quest_loot_types_ignores_unknown_quest_names() -> None:
    """A name matching no quest is skipped rather than raising.

    The raid list is hand-maintained, so a stale entry must not break a build
    — the frontend guardrail test is what surfaces the drift.
    """
    with GameDB(":memory:") as db:
        db.create_schema()
        _seed_loot_fixture(db)
        db.insert_quest_loot([
            {"quest_name": "The Master Artificer", "item_name": "Epic Nightmare"},
        ])
        updated = db.backfill_quest_loot_types(
            ["The Master Artificer", "Velah, the Crimson Dragon"]
        )
        assert updated == 1


def test_backfill_quest_loot_types_does_not_overwrite_scraped_types() -> None:
    """Authoritative scraped values win over the hand-maintained fallback.

    Once a real scrape populates loot_type, the backfill must be a no-op so
    it can stay wired into the build without degrading good data.
    """
    with GameDB(":memory:") as db:
        db.create_schema()
        _seed_loot_fixture(db)
        db.insert_quest_loot([
            {"quest_name": "Haywire Foundry", "item_name": "Bloodrage Symbiont",
             "loot_type": "chest"},
        ])
        # Pretend the hand list wrongly thinks Haywire Foundry is a raid.
        updated = db.backfill_quest_loot_types(["Haywire Foundry"])
        assert updated == 0
        assert _loot_type(db, 2, 2) == "chest"


# ---------------------------------------------------------------------------
# Bonus naming
# ---------------------------------------------------------------------------


def test_bonus_name_uses_a_single_sign() -> None:
    """A negative value produced 'Constitution +-2' — 17 shipped rows.

    The name participates in the bonuses unique index, so the malformed form is
    load-bearing rather than cosmetic.
    """
    item = {
        "name": "Cursed Ring",
        "enchantments": ["{{Stat|CON|-2}}"],
        "augment_slots": [],
    }
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([item])
        names = [
            r[0] for r in db.conn.execute(
                "SELECT name FROM bonuses WHERE value IS NOT NULL"
            )
        ]
    assert names == ["Constitution -2"]
    assert not any("+-" in n for n in names)


def test_bonus_name_uses_the_canonical_stat_spelling() -> None:
    """{{wizardry|195}} and {{Wizardry|195}} must reach one bonus row.

    `bonuses.name` shipped 27 case-variant groups because the name was built
    from the raw template parameter instead of the stat the FK resolved to.
    """
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([
            {"name": "Robe A", "enchantments": ["{{Wizardry|195}}"], "augment_slots": []},
            {"name": "Robe B", "enchantments": ["{{wizardry|195}}"], "augment_slots": []},
        ])
        rows = db.conn.execute(
            "SELECT name, stat_id FROM bonuses WHERE value = 195"
        ).fetchall()
    assert len(rows) == 1, rows
    assert rows[0][0] == "Wizardry +195"
    assert rows[0][1] is not None


def test_save_spell_bonus_resolves_to_the_spell_save_stat() -> None:
    """{{Save|Spell|4}} is a spell saving throw (stat 177), not Spell Resistance."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([
            {"name": "Cloak", "enchantments": ["{{Save|Spell|4}}"], "augment_slots": []},
        ])
        row = db.conn.execute(
            """
            SELECT b.name, s.name FROM bonuses b
            JOIN stats s ON s.id = b.stat_id
            WHERE b.value = 4
            """
        ).fetchone()
    assert row == ("Spell Save +4", "Spell Save")


def test_renormalize_bonus_names_rebuilds_stored_names() -> None:
    """Stored '+-N' names are repaired from the stat and value columns."""
    from ddo_data.db.writers import renormalize_bonus_names

    with GameDB(":memory:") as db:
        db.create_schema()
        db.conn.execute(
            "INSERT INTO bonuses (name, stat_id, value) VALUES ('Constitution +-2', 3, -2)"
        )
        changed = renormalize_bonus_names(db.conn)
        name = db.conn.execute("SELECT name FROM bonuses").fetchone()[0]
    assert changed == 1
    assert name == "Constitution -2"


# ---------------------------------------------------------------------------
# unique_enchantments
# ---------------------------------------------------------------------------


UNIQUE_ENCHANTMENT_FIXTURE = [
    {
        "name": "Deception",
        "effect": "+4 enhancement bonus to hit and +4 to damage for any hit "
                  "that would qualify as a sneak attack.",
        "wiki_url": "https://ddowiki.com/page/Deception",
    },
    {
        "name": "Blinding Fear",
        "effect": None,
        "wiki_url": "https://ddowiki.com/page/Blinding_Fear",
    },
]


def test_insert_unique_enchantments_stores_the_effect_text() -> None:
    from ddo_data.db.writers import insert_unique_enchantments

    with GameDB(":memory:") as db:
        db.create_schema()
        count = insert_unique_enchantments(db.conn, UNIQUE_ENCHANTMENT_FIXTURE)
        rows = db.conn.execute(
            "SELECT name, effect, wiki_url FROM unique_enchantments ORDER BY name"
        ).fetchall()
    assert count == 2
    assert rows[0][0] == "Blinding Fear"
    assert rows[0][1] is None, "an empty effect field stays NULL, never ''"
    assert rows[1][0] == "Deception"
    assert "sneak attack" in rows[1][1]


def test_insert_unique_enchantments_is_idempotent() -> None:
    from ddo_data.db.writers import insert_unique_enchantments

    with GameDB(":memory:") as db:
        db.create_schema()
        insert_unique_enchantments(db.conn, UNIQUE_ENCHANTMENT_FIXTURE)
        insert_unique_enchantments(db.conn, UNIQUE_ENCHANTMENT_FIXTURE)
        (count,) = db.conn.execute("SELECT COUNT(*) FROM unique_enchantments").fetchone()
    assert count == 2


def test_insert_unique_enchantments_skips_a_nameless_entry() -> None:
    """An item with no enchantments must not leave an empty row behind."""
    from ddo_data.db.writers import insert_unique_enchantments

    with GameDB(":memory:") as db:
        db.create_schema()
        count = insert_unique_enchantments(db.conn, [{"name": None, "effect": "x"}, {}])
        (rows,) = db.conn.execute("SELECT COUNT(*) FROM unique_enchantments").fetchone()
    assert count == 0
    assert rows == 0


def test_bonus_description_resolves_a_named_enchantment_page() -> None:
    """A named-enchantment bonus gets the page's effect text and the FK."""
    from ddo_data.db.writers import (
        insert_unique_enchantments,
        populate_enchantment_descriptions,
    )

    with GameDB(":memory:") as db:
        db.create_schema()
        insert_unique_enchantments(db.conn, UNIQUE_ENCHANTMENT_FIXTURE)
        db.insert_items([
            {"name": "Sneaky Dagger", "enchantments": ["{{Deception|6}}"],
             "augment_slots": []},
        ])
        populate_enchantment_descriptions(db.conn)
        row = db.conn.execute(
            """
            SELECT b.description, ue.name
            FROM bonuses b
            LEFT JOIN unique_enchantments ue ON ue.id = b.unique_enchantment_id
            WHERE b.value = 6
            """
        ).fetchone()
    assert row[1] == "Deception"
    assert "sneak attack" in row[0]
    assert "{{" not in row[0]


def test_bonus_description_expands_a_formatter_template_from_structure() -> None:
    """A {{Stat}} bonus describes itself from stat/value/bonus_type."""
    from ddo_data.db.writers import populate_enchantment_descriptions

    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([
            {"name": "Wise Hat", "enchantments": ["{{Stat|WIS|14}}"], "augment_slots": []},
        ])
        populate_enchantment_descriptions(db.conn)
        description = db.conn.execute(
            "SELECT description FROM bonuses WHERE value = 14"
        ).fetchone()[0]
    assert description == "+14 Enhancement bonus to Wisdom"
    assert "{{" not in description


def test_bonus_description_never_leaves_a_template_behind() -> None:
    """Whatever the shape, no description keeps raw wiki markup (assertion A3)."""
    from ddo_data.db.writers import populate_enchantment_descriptions

    with GameDB(":memory:") as db:
        db.create_schema()
        db.conn.execute(
            "INSERT INTO bonuses (name, description) VALUES "
            "('Mystery', '{{Totally Unknown Template|x}}')"
        )
        populate_enchantment_descriptions(db.conn)
        (description,) = db.conn.execute("SELECT description FROM bonuses").fetchone()
    assert description is None or "{{" not in description


def test_effect_links_to_its_unique_enchantment_page() -> None:
    from ddo_data.db.writers import (
        insert_unique_enchantments,
        populate_enchantment_descriptions,
    )

    with GameDB(":memory:") as db:
        db.create_schema()
        insert_unique_enchantments(db.conn, [
            {"name": "Blinding Fear", "effect": "On Hit: Blinds foe.",
             "wiki_url": "https://ddowiki.com/page/Blinding_Fear"},
        ])
        db.insert_items([
            {"name": "Scary Axe", "enchantments": ["{{Blinding Fear}}"],
             "augment_slots": []},
        ])
        populate_enchantment_descriptions(db.conn)
        row = db.conn.execute(
            """
            SELECT e.name, ue.name FROM effects e
            JOIN unique_enchantments ue ON ue.id = e.unique_enchantment_id
            """
        ).fetchone()
    assert row == ("Blinding Fear", "Blinding Fear")


def test_bonus_links_to_the_enchantment_page_named_after_its_stat() -> None:
    """A formatter template still has an enchantment identity: its stat's page.

    `{{Tactics|Combat Mastery|11}}` names the template "Tactics", which has no
    wiki page, so matching on the template alone left 112 bonuses unlinked even
    though `stats.name` and `unique_enchantments.name` agreed exactly.
    """
    from ddo_data.db.writers import (
        insert_unique_enchantments,
        populate_enchantment_descriptions,
    )

    with GameDB(":memory:") as db:
        db.create_schema()
        insert_unique_enchantments(db.conn, [{
            "name": "Combat Mastery",
            "effect": "+X Enhancement bonus to the DC to resist the character's "
                      "Trip, Sunder and Stunning Blow attempts.",
            "wiki_url": "https://ddowiki.com/page/Combat_Mastery",
        }])
        db.insert_items([
            {"name": "Tactician's Ring",
             "enchantments": ["{{Tactics|Combat Mastery|11}}"],
             "augment_slots": []},
        ])
        populate_enchantment_descriptions(db.conn)
        row = db.conn.execute(
            """
            SELECT b.name, ue.name, ue.wiki_url
              FROM bonuses b
              JOIN unique_enchantments ue ON ue.id = b.unique_enchantment_id
            """
        ).fetchone()
    assert row == (
        "Combat Mastery +11",
        "Combat Mastery",
        "https://ddowiki.com/page/Combat_Mastery",
    )


def test_a_named_enchantment_template_outranks_the_stat_name() -> None:
    """The template names a more specific identity, so it must win.

    `{{Sheltering|18|Insightful|Magical}}` resolves stat "Magical Sheltering"
    while the template points at the general "Sheltering" page; 136 shipped rows
    are linked the template's way and re-deriving them from the stat would
    silently move them.
    """
    from ddo_data.db.writers import (
        insert_unique_enchantments,
        populate_enchantment_descriptions,
    )

    with GameDB(":memory:") as db:
        db.create_schema()
        insert_unique_enchantments(db.conn, [
            {"name": "Sheltering", "effect": "Reduces incoming damage.",
             "wiki_url": "https://ddowiki.com/page/Sheltering"},
            {"name": "Magical Sheltering", "effect": "Reduces magical damage.",
             "wiki_url": "https://ddowiki.com/page/Magical_Sheltering"},
        ])
        db.insert_items([
            {"name": "Warded Cloak",
             "enchantments": ["{{Sheltering|18|Insightful|Magical}}"],
             "augment_slots": []},
        ])
        populate_enchantment_descriptions(db.conn)
        linked = db.conn.execute(
            """
            SELECT ue.name FROM bonuses b
              JOIN unique_enchantments ue ON ue.id = b.unique_enchantment_id
            """
        ).fetchone()
    assert linked == ("Sheltering",)


def test_a_bonus_with_no_stat_stays_unlinked() -> None:
    """A wrong FK is worse than a NULL one, so no name-shaped guessing.

    `Whirlwind Absorption +0` (description "Whirlwind 0 20 5") is a parse
    artifact with no resolved stat; its resemblance to an enchantment page name
    is not evidence of identity.
    """
    from ddo_data.db.writers import (
        insert_unique_enchantments,
        populate_enchantment_descriptions,
    )

    with GameDB(":memory:") as db:
        db.create_schema()
        insert_unique_enchantments(db.conn, [{
            "name": "Whirlwind Absorption", "effect": "Absorbs wind damage.",
            "wiki_url": "https://ddowiki.com/page/Whirlwind_Absorption",
        }])
        db.conn.execute(
            "INSERT INTO bonuses (name, description, value) VALUES "
            "('Whirlwind Absorption +0', 'Whirlwind 0 20 5', 0)"
        )
        populate_enchantment_descriptions(db.conn)
        (fk,) = db.conn.execute(
            "SELECT unique_enchantment_id FROM bonuses"
        ).fetchone()
    assert fk is None


# ---------------------------------------------------------------------------
# Rarity
# ---------------------------------------------------------------------------


def test_insert_items_stores_the_rare_flag_as_rarity() -> None:
    """The frontend compares `rarity !== 'Rare'`, so the exact string matters."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([
            {"name": "Rare Boot", "rare": True, "equipment_slot": "Feet"},
            {"name": "Plain Boot", "rare": False, "equipment_slot": "Feet"},
        ])
        rows = dict(db.conn.execute("SELECT name, rarity FROM items").fetchall())
    assert rows["Rare Boot"] == "Rare"
    assert rows["Plain Boot"] is None


def test_populate_rarity_multiplies_across_quest_loot() -> None:
    """Every mapping of a rare item is flagged, not just the item row."""
    from ddo_data.db.writers import populate_rarity

    with GameDB(":memory:") as db:
        db.create_schema()
        db.conn.executemany(
            "INSERT INTO items (id, name) VALUES (?, ?)",
            [(1, "Buckle of Secrets"), (2, "Plain Boot")],
        )
        db.conn.executemany(
            "INSERT INTO quests (id, name) VALUES (?, ?)",
            [(1, "Quest A"), (2, "Quest B")],
        )
        db.conn.executemany(
            "INSERT INTO quest_loot (quest_id, item_id) VALUES (?, ?)",
            [(1, 1), (2, 1), (1, 2)],
        )
        db.conn.commit()
        report = populate_rarity(db.conn, ["Buckle of Secrets"])
        rare_loot = db.conn.execute(
            "SELECT quest_id, item_id FROM quest_loot WHERE is_rare = 1 ORDER BY quest_id"
        ).fetchall()
        rarity = dict(db.conn.execute("SELECT name, rarity FROM items").fetchall())
    assert rarity["Buckle of Secrets"] == "Rare"
    assert rarity["Plain Boot"] is None
    assert rare_loot == [(1, 1), (2, 1)]
    assert report["items"] == 1


def test_populate_rarity_flags_augments_too() -> None:
    """80 of the wiki's rare-loot members are Gems, which live in `augments`."""
    from ddo_data.db.writers import populate_rarity

    with GameDB(":memory:") as db:
        db.create_schema()
        db.conn.execute(
            "INSERT INTO augments (name, slot_color) VALUES ('Lunar Gem of Foo', 'blue')"
        )
        db.conn.commit()
        report = populate_rarity(db.conn, ["Lunar Gem of Foo"])
        (is_rare,) = db.conn.execute("SELECT is_rare FROM augments").fetchone()
    assert is_rare == 1
    assert report["augments"] == 1


def test_populate_rarity_counts_names_it_could_not_place() -> None:
    """A rare name matching neither table is reported, not silently dropped."""
    from ddo_data.db.writers import populate_rarity

    with GameDB(":memory:") as db:
        db.create_schema()
        report = populate_rarity(db.conn, ["Nonexistent Thing"])
    assert report["unmatched"] == ["Nonexistent Thing"]


def test_populate_rarity_matches_a_decoded_name() -> None:
    """The captured category list uses decoded names; so must the match."""
    from ddo_data.db.writers import populate_rarity

    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([{"name": "Admiral&#39;s Gloves", "equipment_slot": "Hands"}])
        report = populate_rarity(db.conn, ["Admiral's Gloves"])
        (rarity,) = db.conn.execute("SELECT rarity FROM items").fetchone()
    assert rarity == "Rare"
    assert report["unmatched"] == []


def test_populate_rarity_is_idempotent() -> None:
    from ddo_data.db.writers import populate_rarity

    with GameDB(":memory:") as db:
        db.create_schema()
        db.conn.execute("INSERT INTO items (id, name) VALUES (1, 'Buckle of Secrets')")
        db.conn.commit()
        first = populate_rarity(db.conn, ["Buckle of Secrets"])
        second = populate_rarity(db.conn, ["Buckle of Secrets"])
    assert first["items"] == 1
    assert second["items"] == 0


# ---------------------------------------------------------------------------
# Choice-wrapper and maintenance templates in the enchantment list
# ---------------------------------------------------------------------------


def test_maintenance_template_produces_no_row() -> None:
    """{{bug}} is a wiki known-issue marker, not an item property."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([
            {"name": "Buggy Blade", "enchantments": ["{{bug|does nothing on live}}"],
             "augment_slots": []},
        ])
        (bonuses,) = db.conn.execute("SELECT COUNT(*) FROM bonuses").fetchone()
        (effects,) = db.conn.execute("SELECT COUNT(*) FROM effects").fetchone()
    assert bonuses == 0
    assert effects == 0


def test_choice_wrapper_resolves_through_its_nested_templates() -> None:
    """{{Nearly Finished|{{Stat|STR|8}}|...}} captured the literal '{{stat'."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([{
            "name": "Celestial Emerald Ring",
            "enchantments": ["{{Nearly Finished|{{Stat|CON|8}}|{{Stat|STR|8}}}}"],
            "augment_slots": [],
        }])
        names = sorted(
            r[0] for r in db.conn.execute("SELECT name FROM bonuses")
        )
        effect_names = [r[0] for r in db.conn.execute("SELECT name FROM effects")]
    assert names == ["Constitution +8", "Strength +8"]
    assert "Nearly Finished" not in effect_names


def test_item_with_no_enchantments_writes_nothing_extra() -> None:
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([{"name": "Plain Ring", "enchantments": [], "augment_slots": []}])
        (bonuses,) = db.conn.execute("SELECT COUNT(*) FROM bonuses").fetchone()
        (effects,) = db.conn.execute("SELECT COUNT(*) FROM effects").fetchone()
        (uniq,) = db.conn.execute("SELECT COUNT(*) FROM unique_enchantments").fetchone()
    assert (bonuses, effects, uniq) == (0, 0, 0)


def test_unclosed_template_does_not_write_a_partial_row() -> None:
    """A malformed '{{Stat|Wisdom' must be skipped, not half-stored."""
    with GameDB(":memory:") as db:
        db.create_schema()
        db.insert_items([
            {"name": "Broken Hat", "enchantments": ["{{Stat|Wisdom"], "augment_slots": []},
        ])
        modifiers = [r[0] for r in db.conn.execute("SELECT modifier FROM effects")]
        names = [r[0] for r in db.conn.execute("SELECT name FROM effects")]
    assert all(m is None or "{{" not in m for m in modifiers)
    assert all("{{" not in n for n in names)
