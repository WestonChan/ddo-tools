"""Post-import data validation assertions for the DDO game database.

Each assertion is a SQL query that should return 0 rows. If rows are returned,
they represent data integrity issues. Run after all insert_* calls complete.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """Result of a single validation check."""

    name: str
    description: str
    severity: str  # "error" or "warning"
    failures: list[dict]

    @property
    def passed(self) -> bool:
        return len(self.failures) == 0


# ---------------------------------------------------------------------------
# Phase 4c regression guards (A1-A6, plus A3b)
#
# The 2026-07-28 audit found one root cause behind most of Phase 4c: templates
# treated as noise to strip rather than structure to expand. These checks make
# that class of bug fail the build instead of quietly producing wrong numbers.
# Each has a test in tests/test_db_validate.py proving it *fires*.
#
# A3b was added after review: A3 watched `bonuses.description` alone, and the
# markup was sitting in the `name` columns next to it the whole time.
# ---------------------------------------------------------------------------

# A1's exemptions. A bare "no shared names" rule would fire on all seven of
# these and get deleted the first time it did, so each carries the reason it is
# legitimate. Anything not listed here is a stat-identity bug.
DUAL_TABLE_ALLOWLIST: dict[str, str] = {
    "Concealment":
        "effects rows are named sources (Blurry, Dusk, Lesser Displacement, "
        "Smoke Screen); the bonus row is the numeric miss chance",
    "Wizardry":
        "effects rows are the Magi/Archmagi/AM tiers; the bonus row is the "
        "flat spell-point total",
    "Fortification":
        "effects rows carry the word grades (light/moderate/heavy); the bonus "
        "row carries the percentage",
    "Doublestrike":
        "the effect is the named proc 'Calamitous Blows'; the bonus is the "
        "flat doublestrike chance",
    "Protection":
        "effects rows are the named protection auras; the bonus row is the "
        "deflection bonus to AC",
    "Attack Bonus":
        "the effect is a conditional to-hit rider; the bonus is the flat "
        "attack bonus a stacking rule can sum",
    "Tendon Slice":
        "the effect is the on-hit slice proc; the bonus is the numeric "
        "movement penalty it applies",
    "Deception":
        "the wiki writes both {{Deception}} (the proc, no magnitude given) and "
        "{{Deception|N}} (the numeric to-hit/damage rider); the value-less "
        "invocation has nowhere to go but effects",
    "Shatter":
        "same two invocations as Deception — {{Shatter}} with no magnitude is "
        "an effect, {{Shatter|N}} resolves to the Shatter stat",
    "True Seeing":
        "the effect is the item enchantment; the bonus is a set-bonus grant. "
        "`set_bonuses` links only to `bonuses`, so a named effect a set confers "
        "has nowhere else to go — giving set bonuses the item router's "
        "three-way routing is Phase 4m. Surfaced by A3b: while the bonus was "
        "still named '[[True Seeing (enhancement)|True Seeing]]' the markup hid "
        "the collision from this check",
    "Temporary Spell Points":
        "the effect is the value-less invocation; the bonus is the numeric "
        "spell-point pool",
    "Spell Resistance":
        "the effects rows are the item enchantment {{Spell Resistance|N}} "
        "(values 17-41); the bonus rows are enhancement-granted SR. The rows "
        "that made this a genuine bug — {{Save|Spell|N}} spell saving throws "
        "recorded as SR — now resolve to stat 177 (Spell Save), and assertion "
        "A2 guards that mapping at its source",
}

# A5's vocabulary: wiki housekeeping and presentation wrappers. A bonus or
# effect *named* after one of these was parsed from markup that is not game
# data at all. Kept in sync with wiki/templates.py by name, not by import, so
# validate.py stays importable without the wiki package's HTTP dependency.
#
# The augment-slot templates are deliberately absent. `Slaver's Slot` and the
# raw `UpgradeableAugment` did once sit in `effects` as parser junk, but the
# repair pass deletes them rather than tolerating them, and the effect this
# vocabulary would now match — `Upgradeable Augment` — is a real potential
# effect (the item can be upgraded to gain a slot), not markup.
NON_ENCHANTMENT_TEMPLATES: tuple[str, ...] = (
    "bug", "inlinewht", "orphan", "underlinked", "top", "history", "stub",
    "ref", "cleanup", "expand", "nearly finished", "almost there",
)

# A8's vocabulary: every `augment_slot_types` row the grammar of
# `wiki/augment_slots.py` can compose, as (label, family, variant, qualifier).
#
# All four columns are checked together because they have to agree. `label` is
# the string `augments.slot_color` speaks, so it is what the FK backfill matches
# on; family/variant/qualifier are what every consumer reads instead of parsing
# the label. A row where they disagree points the two at different sockets and
# raises nothing on its own — the dropdown just opens onto the wrong list.
# Case is meaning for the same reason: `Green` would match no augment while
# looking perfectly correct, and these comparisons are case-sensitive.
#
# Mirrored from the decoder by value, not by import, for the same reason
# NON_ENCHANTMENT_TEMPLATES is: validate.py must stay importable without the
# wiki package's HTTP dependency. `test_a8_vocabulary_matches_the_decoders`
# holds the two copies together by set equality.
AUGMENT_SLOT_DEFINITIONS: tuple[tuple[str, str, str, str | None], ...] = (
    ('blue', 'standard', 'blue', None),
    ('colorless', 'standard', 'colorless', None),
    ('green', 'standard', 'green', None),
    ('moon', 'standard', 'moon', None),
    ('orange', 'standard', 'orange', None),
    ('purple', 'standard', 'purple', None),
    ('red', 'standard', 'red', None),
    ('sun', 'standard', 'sun', None),
    ('yellow', 'standard', 'yellow', None),
    ('isle of dread: claw (accessory)', 'dino', 'claw', 'accessory'),
    ('isle of dread: claw (armor)', 'dino', 'claw', 'armor'),
    ('isle of dread: claw (weapon)', 'dino', 'claw', 'weapon'),
    ('isle of dread: fang (accessory)', 'dino', 'fang', 'accessory'),
    ('isle of dread: fang (armor)', 'dino', 'fang', 'armor'),
    ('isle of dread: fang (weapon)', 'dino', 'fang', 'weapon'),
    ('isle of dread: horn (accessory)', 'dino', 'horn', 'accessory'),
    ('isle of dread: horn (armor)', 'dino', 'horn', 'armor'),
    ('isle of dread: horn (weapon)', 'dino', 'horn', 'weapon'),
    ('isle of dread: scale (accessory)', 'dino', 'scale', 'accessory'),
    ('isle of dread: scale (armor)', 'dino', 'scale', 'armor'),
    ('isle of dread: scale (weapon)', 'dino', 'scale', 'weapon'),
    ('isle of dread: set bonus', 'dino', 'set', None),
    ('lamordia: dolorous (accessory)', 'lamordia', 'dolorous', 'accessory'),
    ('lamordia: dolorous (armor)', 'lamordia', 'dolorous', 'armor'),
    ('lamordia: dolorous (weapon)', 'lamordia', 'dolorous', 'weapon'),
    ('lamordia: melancholic (accessory)', 'lamordia', 'melancholic', 'accessory'),
    ('lamordia: melancholic (armor)', 'lamordia', 'melancholic', 'armor'),
    ('lamordia: melancholic (weapon)', 'lamordia', 'melancholic', 'weapon'),
    ('lamordia: miserable (accessory)', 'lamordia', 'miserable', 'accessory'),
    ('lamordia: miserable (armor)', 'lamordia', 'miserable', 'armor'),
    ('lamordia: miserable (weapon)', 'lamordia', 'miserable', 'weapon'),
    ('lamordia: woeful (accessory)', 'lamordia', 'woeful', 'accessory'),
    ('lamordia: woeful (armor)', 'lamordia', 'woeful', 'armor'),
    ('lamordia: woeful (weapon)', 'lamordia', 'woeful', 'weapon'),
    ("slaver's: augment", 'slavers', 'augment', None),
    ("slaver's: augment (legendary)", 'slavers', 'augment', 'legendary'),
    ("slaver's: bonus", 'slavers', 'bonus', None),
    ("slaver's: bonus (legendary)", 'slavers', 'bonus', 'legendary'),
    ("slaver's: extra", 'slavers', 'extra', None),
    ("slaver's: extra (legendary)", 'slavers', 'extra', 'legendary'),
    ("slaver's: prefix", 'slavers', 'prefix', None),
    ("slaver's: prefix (legendary)", 'slavers', 'prefix', 'legendary'),
    ("slaver's: suffix", 'slavers', 'suffix', None),
    ("slaver's: suffix (legendary)", 'slavers', 'suffix', 'legendary'),
)

# A8b's scope: the families whose sockets are filled with augments. Slave Lords
# crafting fills its own with shards, so an empty candidate list there is the
# right answer rather than a gap.
_AUGMENT_FILLED_FAMILIES: tuple[str, ...] = ("dino", "lamordia")

# A6's high-water mark, measured on the database this branch produced (down from
# 198 bonuses / 137 effects before it: the repair passes merged or deleted the
# stale rows, and the wider item scrape gave many of the rest a consumer).
# Driving the remainder to zero belongs to Phase 4m; until then the check reports
# any growth as a warning so the count cannot silently climb back.
ORPHAN_BASELINE: dict[str, int] = {"bonuses": 73, "effects": 15}

# Consumer tables that make a bonuses/effects row reachable. A row nothing
# points at is an orphan — which may equally mean a consumer table is
# incomplete, so this is a warning and 4m audits before deleting anything.
_BONUS_CONSUMERS: tuple[str, ...] = (
    "item_bonuses", "augment_bonuses", "enhancement_bonuses",
    "set_bonus_bonuses", "crafting_option_bonuses",
)
_EFFECT_CONSUMERS: tuple[str, ...] = ("item_effects",)


def _sql_list(values: tuple[str, ...] | list[str]) -> str:
    """Render values as a SQL IN-list of quoted literals."""
    return ", ".join("'" + v.replace("'", "''") + "'" for v in values)


def _known_slot_definitions_cte() -> str:
    """``VALUES`` rows for A8's mirror, NULL qualifiers rendered as ``''``.

    Comparing ``''`` to ``COALESCE(qualifier, '')`` rather than using ``IS``:
    SQL equality on NULL is never true, so a NULL-qualifier row would look
    unknown to every comparison and A8 would fail on correct data.
    """
    return ", ".join(
        "("
        + ", ".join(
            "'" + (value or "").replace("'", "''") + "'"
            for value in (label, family, variant, qualifier)
        )
        + ")"
        for label, family, variant, qualifier in AUGMENT_SLOT_DEFINITIONS
    )


def _orphan_clause(table: str, consumers: tuple[str, ...]) -> str:
    """``NOT EXISTS`` chain marking rows of *table* no consumer references."""
    column = "bonus_id" if table == "bonuses" else "effect_id"
    return " AND ".join(
        f"NOT EXISTS (SELECT 1 FROM {c} WHERE {c}.{column} = {table}.id)"
        for c in consumers
    )


def count_orphans(conn: sqlite3.Connection) -> dict[str, int]:
    """Count ``bonuses``/``effects`` rows that no consumer table references."""
    counts: dict[str, int] = {}
    for table, consumers in (
        ("bonuses", _BONUS_CONSUMERS), ("effects", _EFFECT_CONSUMERS),
    ):
        try:
            counts[table] = conn.execute(
                f"SELECT COUNT(*) FROM {table} WHERE {_orphan_clause(table, consumers)}"
            ).fetchone()[0]
        except sqlite3.OperationalError:
            counts[table] = 0
    return counts


# Each assertion: (name, description, severity, query, column_names)
# Query should return rows that FAIL the assertion (0 rows = pass).
_ASSERTIONS: list[tuple[str, str, str, str, list[str]]] = [
    # --- Enhancement integrity ---
    (
        "enhancement_bonus_stat_resolved",
        "Enhancement bonuses should have resolved stat_id (not NULL)",
        "warning",
        """
        SELECT b.name, b.description, e.name AS enhancement, et.name AS tree
        FROM enhancement_bonuses eb
        JOIN bonuses b ON b.id = eb.bonus_id
        JOIN enhancements e ON e.id = eb.enhancement_id
        JOIN enhancement_trees et ON et.id = e.tree_id
        WHERE b.stat_id IS NULL
        LIMIT 20
        """,
        ["bonus_name", "description", "enhancement", "tree"],
    ),
    # --- Item integrity ---
    (
        "items_have_equipment_slot",
        "Items should have equipment_slot or item_type set",
        "warning",
        """
        SELECT name, item_category, rarity
        FROM items
        WHERE equipment_slot IS NULL AND item_type IS NULL AND item_category IS NULL
        LIMIT 20
        """,
        ["name", "item_category", "rarity"],
    ),
    (
        "weapon_items_have_weapon_stats",
        "Wiki-matched Main Hand items should have weapon stats",
        "warning",
        """
        SELECT i.name, i.equipment_slot
        FROM items i
        LEFT JOIN item_weapon_stats ws ON ws.item_id = i.id
        WHERE i.equipment_slot = 'Main Hand'
          AND ws.item_id IS NULL
          AND i.wiki_url IS NOT NULL
        LIMIT 20
        """,
        ["name", "equipment_slot"],
    ),
    (
        "weapons_have_handedness",
        "Weapons should have handedness set",
        "warning",
        """
        SELECT i.name, ws.weapon_type, ws.proficiency
        FROM items i
        JOIN item_weapon_stats ws ON ws.item_id = i.id
        WHERE ws.handedness IS NULL
          AND i.wiki_url IS NOT NULL
          AND ws.weapon_type != 'Cosmetic'
        LIMIT 20
        """,
        ["name", "weapon_type", "proficiency"],
    ),
    (
        "item_bonus_stat_resolved",
        "Item bonuses from wiki should have resolved stat_id",
        "warning",
        """
        SELECT b.name, b.description, i.name AS item
        FROM item_bonuses ib
        JOIN bonuses b ON b.id = ib.bonus_id
        JOIN items i ON i.id = ib.item_id
        WHERE b.stat_id IS NULL AND ib.data_source = 'wiki'
          AND b.description NOT LIKE '%on hit%'
          AND b.description NOT LIKE '%on critical%'
          AND b.description NOT LIKE '%on being hit%'
          AND b.description NOT LIKE '%on kill%'
          AND b.description NOT LIKE '%chance%'
          AND b.description NOT LIKE '%per hit%'
          AND b.description NOT LIKE '%Charge-based%'
          AND b.description NOT LIKE '%Proc %'
          AND b.description NOT LIKE '%temporary HP%'
          AND b.description NOT LIKE '%temporary Health%'
          AND b.description NOT LIKE '%only:%'
          AND b.description NOT LIKE '%random ability%'
          AND b.description NOT LIKE '%all ability scores%'
          AND b.description NOT LIKE '{{%}}'
          AND b.name NOT LIKE '%ability score%'
        LIMIT 20
        """,
        ["bonus_name", "description", "item"],
    ),
    # --- Feat integrity ---
    (
        "feat_self_prereq",
        "Feats should not require themselves",
        "error",
        """
        SELECT f.name
        FROM feat_prereq_feats pf
        JOIN feats f ON f.id = pf.feat_id
        WHERE pf.feat_id = pf.required_feat_id
        """,
        ["name"],
    ),
    (
        "enhancement_self_prereq",
        "Enhancements should not require themselves",
        "error",
        """
        SELECT e.name, et.name AS tree
        FROM enhancement_prereqs ep
        JOIN enhancements e ON e.id = ep.enhancement_id
        JOIN enhancement_trees et ON et.id = e.tree_id
        WHERE ep.enhancement_id = ep.required_enhancement_id
        """,
        ["name", "tree"],
    ),
    # --- Referential sanity ---
    (
        "bonuses_have_name",
        "Every bonus should have a non-empty name",
        "error",
        """
        SELECT id, stat_id, bonus_type_id, value
        FROM bonuses
        WHERE name IS NULL OR name = ''
        LIMIT 10
        """,
        ["id", "stat_id", "bonus_type_id", "value"],
    ),
    (
        "set_bonus_items_resolve",
        "Set bonus items should reference existing items",
        "warning",
        """
        SELECT sb.name AS set_name, sbi.item_id
        FROM set_bonus_items sbi
        JOIN set_bonuses sb ON sb.id = sbi.set_id
        LEFT JOIN items i ON i.id = sbi.item_id
        WHERE i.id IS NULL
        LIMIT 20
        """,
        ["set_name", "item_id"],
    ),
    # --- Seed data staleness checks ---
    # These detect when wiki-scraped data references classes/races not in seed tables.
    (
        "enhancement_trees_class_seeded",
        "Class enhancement trees should reference classes that exist in seed data",
        "error",
        """
        SELECT name, tree_type FROM enhancement_trees
        WHERE tree_type = 'class' AND class_id IS NULL
        """,
        ["tree_name", "tree_type"],
    ),
    (
        "enhancement_trees_race_seeded",
        "Racial enhancement trees should reference races that exist in seed data",
        "error",
        """
        SELECT name, tree_type FROM enhancement_trees
        WHERE tree_type = 'racial' AND race_id IS NULL
        """,
        ["tree_name", "tree_type"],
    ),
    (
        "classes_have_skills",
        "Every base class should have class skills (archetypes inherit from parent)",
        "error",
        """
        SELECT c.name FROM classes c
        LEFT JOIN class_skills cs ON cs.class_id = c.id
        WHERE cs.class_id IS NULL AND c.is_archetype = 0
        """,
        ["class_name"],
    ),
    (
        "races_have_ability_bonuses",
        "Standard races should have ability bonuses (Human/Half-Elf exempt: player chooses)",
        "warning",
        """
        SELECT r.name FROM races r
        LEFT JOIN race_ability_bonuses rab ON rab.race_id = r.id
        WHERE rab.race_id IS NULL
          AND r.name NOT IN ('Human', 'Half-Elf')
          AND r.id <= 17
        """,
        ["race_name"],
    ),
    # --- Past life cross-reference ---
    (
        "past_life_classes_seeded",
        "Past Life feat names should match seeded classes/archetypes",
        "error",
        """
        SELECT REPLACE(f.name, 'Past Life: ', '') AS past_life_name
        FROM feats f
        WHERE f.name LIKE 'Past Life: %'
          AND REPLACE(f.name, 'Past Life: ', '') NOT IN (SELECT name FROM classes)
          AND REPLACE(f.name, 'Past Life: ', '') NOT IN (
              'Arcane Initiate', 'Arcane Prodigy', 'Bardic Dilettante',
              'Berserker''s Fury', 'Delver of the Forbidden',
              'Disciple of the Fist', 'Harbinger of Nature''s Wrath',
              'Initiate of the Faith', 'Mixer of Magics',
              'Sneak of Shadows', 'Soldier of the Faith',
              'Student of Artifice', 'Student of the Sword',
              'Warrior of the Wild', 'Acolyte of Divine Secrets'
          )
        """,
        ["past_life_name"],
    ),
    # --- Icon coverage checks ---
    (
        "feats_have_icons",
        "Feats should have icon filenames (>95% expected)",
        "warning",
        """
        SELECT name FROM feats
        WHERE (icon IS NULL OR icon = '') AND wiki_url IS NOT NULL
        LIMIT 20
        """,
        ["name"],
    ),
    (
        "enhancements_have_icons",
        "Enhancements should have icon filenames (100% expected)",
        "warning",
        """
        SELECT name FROM enhancements WHERE icon IS NULL OR icon = ''
        LIMIT 20
        """,
        ["name"],
    ),
    # --- Population checks ---
    (
        "tables_not_empty",
        "Core tables should have data",
        "error",
        """
        SELECT t, n FROM (
            SELECT 'items' AS t, (SELECT COUNT(*) FROM items) AS n
            UNION ALL SELECT 'feats', (SELECT COUNT(*) FROM feats)
            UNION ALL SELECT 'enhancements', (SELECT COUNT(*) FROM enhancements)
            UNION ALL SELECT 'spells', (SELECT COUNT(*) FROM spells)
            UNION ALL SELECT 'augments', (SELECT COUNT(*) FROM augments)
        ) WHERE n = 0
        """,
        ["table", "count"],
    ),
    # --- Feat slot/tier checks ---
    (
        "feat_slots_count",
        "feat_slots should have exactly 15 rows (7 heroic + 4 epic + 3 destiny + 1 legendary)",
        "error",
        """
        SELECT 'expected 15, got ' || COUNT(*) AS msg
        FROM feat_slots
        HAVING COUNT(*) != 15
        """,
        ["msg"],
    ),
    (
        "race_bonus_feat_slots_human",
        "Human (1) and PDK (19) should have race bonus feat slots",
        "error",
        """
        SELECT 'missing race_id=' || expected.id AS msg
        FROM (SELECT 1 AS id UNION ALL SELECT 19) expected
        LEFT JOIN race_bonus_feat_slots rbfs ON rbfs.race_id = expected.id
        WHERE rbfs.race_id IS NULL
        """,
        ["msg"],
    ),
    (
        "feat_tier_distribution",
        "Feats with feat_tier set should have reasonable distribution",
        "warning",
        """
        SELECT feat_tier, COUNT(*) AS n FROM feats
        WHERE feat_tier IS NOT NULL
        GROUP BY feat_tier
        HAVING n < 3
        """,
        ["feat_tier", "n"],
    ),
    (
        "class_choice_feats_have_options",
        "class_choice slots should have 2+ entries in class_choice_feats",
        "warning",
        """
        SELECT c.name, cbs.class_level, COUNT(ccf.feat_id) AS n
        FROM class_bonus_feat_slots cbs
        JOIN classes c ON c.id = cbs.class_id
        LEFT JOIN class_choice_feats ccf
            ON ccf.class_id = cbs.class_id AND ccf.class_level = cbs.class_level
        WHERE cbs.slot_type = 'class_choice'
        GROUP BY cbs.class_id, cbs.class_level
        HAVING n < 2
        """,
        ["class", "level", "n"],
    ),
    (
        "class_bonus_feat_slots_have_bonus_feats",
        "Classes with class_bonus slots should have feat_bonus_classes entries",
        "warning",
        """
        SELECT DISTINCT c.name
        FROM class_bonus_feat_slots cbs
        JOIN classes c ON c.id = cbs.class_id
        WHERE cbs.slot_type = 'class_bonus'
          AND cbs.class_id NOT IN (
            SELECT DISTINCT class_id FROM feat_bonus_classes
          )
        """,
        ["class"],
    ),
    # --- Phase 4c template/entity normalization guards ---
    (
        "enchantment_not_in_both_tables",
        "An enchantment name should live in bonuses OR effects, not both "
        "(A1; see DUAL_TABLE_ALLOWLIST for the legitimate exceptions)",
        "error",
        f"""
        SELECT e.name, COUNT(*) AS effect_rows
        FROM effects e
        WHERE e.name NOT IN ({_sql_list(tuple(DUAL_TABLE_ALLOWLIST))})
          AND EXISTS (
            SELECT 1 FROM bonuses b
             WHERE b.name = e.name
                OR b.name GLOB e.name || ' [+-]*'
          )
        GROUP BY e.name
        LIMIT 20
        """,
        ["name", "effect_rows"],
    ),
    (
        "bonus_descriptions_expanded",
        "No bonus description should retain raw {{template}} markup (A3)",
        "error",
        """
        SELECT id, name, description FROM bonuses
        WHERE description LIKE '%{{%'
        LIMIT 20
        """,
        ["id", "name", "description"],
    ),
    (
        "effect_modifier_is_not_a_magnitude",
        "effects.modifier holds the bonus type; a magnitude there belongs in "
        "item_effects.value (A4)",
        "error",
        # Matches a bare magnitude only — "59", "+91", "-20", "15%" — mirroring
        # the parser's own _NUMERIC_PARAM_RE. A leading digit alone is not
        # enough: {{Burns|3rd}} (44 uses) is a tier, and flagging it would make
        # this assertion unpassable and therefore disposable. GLOB negates with
        # [^...], not [!...].
        """
        SELECT id, name, modifier FROM effects
        WHERE (modifier GLOB '[0-9+-]*' AND NOT modifier GLOB '*[^0-9+%-]*')
           OR modifier LIKE '%{{%'
        LIMIT 20
        """,
        ["id", "name", "modifier"],
    ),
    (
        "no_maintenance_template_rows",
        "No bonus or effect should be named after a wiki maintenance template "
        "({{bug}}, {{Orphan}}, ...) — those are editor markers, not game data (A5)",
        "error",
        f"""
        SELECT 'effects' AS source_table, id, name FROM effects
        WHERE lower(name) IN ({_sql_list(NON_ENCHANTMENT_TEMPLATES)})
        UNION ALL
        SELECT 'bonuses', id, name FROM bonuses
        WHERE lower(name) IN ({_sql_list(NON_ENCHANTMENT_TEMPLATES)})
        LIMIT 20
        """,
        ["source_table", "id", "name"],
    ),
    (
        "item_enhancement_bonus_composite_complete",
        "An item's Enhancement attack bonus must be matched by an equal damage "
        "bonus — {{Enhancement bonus|w|N}} renders both or neither (A7)",
        "error",
        # Named for items on purpose: `enhancement_bonus_stat_resolved` above
        # covers character enhancement *trees*, an unrelated concept that shares
        # the word.
        #
        # This is the check `bonuses.name` cannot make (invariant 4). One wiki
        # template fans out to up to four rows across two tables; drop one and
        # every surviving row is still internally consistent, its generated name
        # still agrees with its stat, and the row count still looks plausible.
        # Only the *pairing* gives the loss away.
        #
        # Armor Class is deliberately not required here: `|a` renders it alone,
        # so its presence or absence says nothing about the pair.
        """
        WITH enhancement_pair AS (
            SELECT ib.item_id, s.name AS stat, b.value
              FROM item_bonuses ib
              JOIN bonuses b ON b.id = ib.bonus_id
              JOIN stats s ON s.id = b.stat_id
              JOIN bonus_types bt ON bt.id = b.bonus_type_id
             WHERE bt.name = 'Enhancement'
               AND s.name IN ('Attack Bonus', 'Damage Bonus')
        )
        SELECT i.name AS item, p.stat, p.value,
               CASE p.stat WHEN 'Attack Bonus' THEN 'Damage Bonus'
                           ELSE 'Attack Bonus' END AS missing
          FROM enhancement_pair p
          JOIN items i ON i.id = p.item_id
         WHERE NOT EXISTS (
                SELECT 1 FROM enhancement_pair q
                 WHERE q.item_id = p.item_id
                   AND q.value = p.value
                   AND q.stat != p.stat
              )
         LIMIT 20
        """,
        ["item", "stat", "value", "missing"],
    ),
    (
        "augment_slot_types_are_known",
        "Every augment_slot_types row must be one the augment-slot decoder can "
        "compose, label and family columns agreeing — the label is what "
        "augments.slot_color is matched against and the columns are what every "
        "consumer reads, so a row outside the vocabulary aims the two at "
        "different sockets without raising anything (A8)",
        "error",
        f"""
        WITH known(label, family, variant, qualifier) AS (
            VALUES {_known_slot_definitions_cte()}
        )
        SELECT t.label, t.family, t.variant, t.qualifier
          FROM augment_slot_types t
         WHERE NOT EXISTS (
                 SELECT 1 FROM known k
                  WHERE k.label = t.label
                    AND k.family = t.family
                    AND k.variant = t.variant
                    AND k.qualifier = COALESCE(t.qualifier, '')
               )
         LIMIT 20
        """,
        ["label", "family", "variant", "qualifier"],
    ),
    (
        "crafting_slots_have_candidate_augments",
        "Every Lamordia / Isle of Dread socket an item carries should have at "
        "least one augment pointing at it — the augments-side FK is backfilled "
        "from the same vocabulary, so an empty pool means the backfill or the "
        "augment scrape lapsed (A8b). Slaver's sockets are excluded: Slave "
        "Lords crafting fills them with shards, not augments",
        "error",
        # Measured on the database this branch produced: zero empty pools, which
        # is what makes this an error rather than a warning. A8 catches a
        # malformed definition; this catches the subtler one — a perfectly-formed
        # socket no augment answers to, which shows up in the UI as a dropdown
        # that opens onto nothing. Sockets no item carries are out of scope:
        # nothing renders them, so nothing can be empty.
        f"""
        SELECT t.label, t.family
          FROM augment_slot_types t
         WHERE t.family IN ({_sql_list(_AUGMENT_FILLED_FAMILIES)})
           AND EXISTS (
                 SELECT 1 FROM item_augment_slots s WHERE s.slot_id = t.id
               )
           AND NOT EXISTS (
                 SELECT 1 FROM augments a WHERE a.slot_id = t.id
               )
         LIMIT 20
        """,
        ["label", "family"],
    ),
    (
        "augment_slot_ids_resolve",
        "Every item_augment_slots.slot_id, and every non-NULL "
        "augments.slot_id, must name an augment_slot_types row (A8c)",
        "error",
        # SQLite only enforces foreign keys when the connection asks it to, and
        # two paths here do not: db/schema.py's shape migration runs before the
        # DDL turns them on, and the frontend opens the shipped file with them
        # off. Validation is the enforcement for this FK, as it is for every
        # other one in this schema. A NULL augments.slot_id is the documented
        # un-backfilled state and deliberately not a failure.
        """
        SELECT 'item_augment_slots' AS source_table, s.slot_id AS slot_id,
               COUNT(*) AS rows_affected
          FROM item_augment_slots s
         WHERE NOT EXISTS (
                 SELECT 1 FROM augment_slot_types t WHERE t.id = s.slot_id
               )
         GROUP BY s.slot_id
        UNION ALL
        SELECT 'augments', a.slot_id, COUNT(*)
          FROM augments a
         WHERE a.slot_id IS NOT NULL
           AND NOT EXISTS (
                 SELECT 1 FROM augment_slot_types t WHERE t.id = a.slot_id
               )
         GROUP BY a.slot_id
         LIMIT 20
        """,
        ["source_table", "slot_id", "rows_affected"],
    ),
    (
        "orphan_rows_within_baseline",
        f"Orphaned bonuses/effects should not exceed the recorded baseline "
        f"{ORPHAN_BASELINE} (A6; cleanup is Phase 4m, so this only warns)",
        "warning",
        f"""
        SELECT 'bonuses' AS source_table, COUNT(*) AS orphans,
               {ORPHAN_BASELINE['bonuses']} AS baseline
          FROM bonuses WHERE {_orphan_clause('bonuses', _BONUS_CONSUMERS)}
        HAVING orphans > baseline
        UNION ALL
        SELECT 'effects', COUNT(*), {ORPHAN_BASELINE['effects']}
          FROM effects WHERE {_orphan_clause('effects', _EFFECT_CONSUMERS)}
        HAVING COUNT(*) > {ORPHAN_BASELINE['effects']}
        """,
        ["source_table", "orphans", "baseline"],
    ),
]


def _validate_save_template_stats(conn: sqlite3.Connection) -> ValidationResult:
    """A2 — every ``{{Save|X|N}}`` parameter must resolve to a Save stat.

    Checked against the parser's mapping table rather than against stored rows,
    because A3 removes the evidence a row-level check would need: once
    descriptions are expanded from structure, no row remembers that it came from
    a ``{{Save|...}}`` template. Checking the mapping catches the *shape* — the
    real bug was ``spell`` -> "Spell Resistance", a caster-level-check mechanic
    standing in for a saving throw — and catches it before it reaches any row.

    ``bonuses.name`` cannot serve as the oracle here: it is generated from the
    resolved stat, so a wrong stat yields a wrong-but-self-consistent name. That
    is exactly how the Spell Save bug survived.
    """
    failures: list[dict] = []
    try:
        from ..dat_parser import effects as effects_module

        known_stats = {
            row[0].lower(): row[0]
            for row in conn.execute("SELECT name FROM stats").fetchall()
        }
        for param, stat_name in effects_module._SAVE_ABBREVS.items():
            lowered = stat_name.lower()
            if "save" in lowered or "saving throw" in lowered:
                continue
            failures.append({
                "param": param,
                "stat": stat_name,
                "in_stats_table": stat_name.lower() in known_stats,
            })
    except Exception as exc:  # noqa: BLE001 — reported, not raised
        failures.append({"error": f"Skipped: {exc}"})

    return ValidationResult(
        name="save_templates_resolve_to_save_stats",
        description=(
            "Every {{Save|X|N}} parameter should map to a stat whose name is a "
            "saving throw (A2)"
        ),
        severity="error",
        failures=failures,
    )


def _validate_names_are_free_of_markup(
    conn: sqlite3.Connection,
) -> ValidationResult:
    """A3b — no ``name`` column may hold wiki or HTML markup.

    A3 watched ``bonuses.description`` only, and the markup simply moved next
    door: four bonus names shipped as raw wikitext (one of them a whole
    sentence), 380 ``crafting_options.name`` values ended in ``<br />``, and an
    editor comment leaked into a material named ``'No <!--'``.

    Every table is swept rather than a hand-kept list, so a new table inherits
    the rule. Descriptions are deliberately excluded: their markup carries prose
    structure and normalizing it is Phase 4m's work, not this assertion's.
    """
    failures: list[dict] = []
    tables = [
        row[0] for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' "
            "AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]
    for table in tables:
        columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        if "name" not in columns:
            continue
        rows = conn.execute(
            f"""
            SELECT name FROM {table}
             WHERE name LIKE '%[[%' OR name LIKE '%{{{{%'
                OR name LIKE '%<%>%' OR name LIKE '%<!--%'
             LIMIT 5
            """
        ).fetchall()
        for (value,) in rows:
            failures.append({"source_table": table, "column": "name", "value": value})

    return ValidationResult(
        name="names_are_free_of_markup",
        description=(
            "No name column should hold wikilinks, templates, HTML tags or "
            "editor comments — a name is a label, not wikitext (A3b)"
        ),
        severity="error",
        failures=failures,
    )


def validate_database(conn: sqlite3.Connection) -> list[ValidationResult]:
    """Run all validation assertions and return results."""
    results = []
    for name, desc, severity, query, columns in _ASSERTIONS:
        try:
            rows = conn.execute(query).fetchall()
            failures = [dict(zip(columns, row)) for row in rows]
        except sqlite3.OperationalError as e:
            # Table might not exist if build-db was run with --type filter
            failures = [{"error": str(e)}]
        results.append(ValidationResult(
            name=name, description=desc, severity=severity, failures=failures,
        ))
    results.append(_validate_save_template_stats(conn))
    results.append(_validate_names_are_free_of_markup(conn))
    return results


def validate_seed_against_wiki(conn: sqlite3.Connection) -> list[ValidationResult]:
    """Check that seed data covers all classes/races discovered from wiki.

    Queries DDO wiki category pages to discover what classes and races
    exist, then compares against the classes/races seed tables.
    Returns errors for any wiki-known class/race missing from seed.
    """
    results = []
    try:
        from ..wiki.client import WikiClient

        client = WikiClient(use_cache=True)

        # Discover classes from Category:Base classes
        wiki_classes: set[str] = set()
        for title in client.iter_category_members("Base classes"):
            if not title.startswith("Category:"):
                wiki_classes.add(title)

        # Discover races from Category:Races (filter out non-race pages)
        wiki_races: set[str] = set()
        _NON_RACE_PAGES = {"Races", "Race", "Racial Variant differences"}
        # Wiki names that map to different seed names
        _RACE_ALIASES = {
            "Drow": "Drow Elf",
            "Sun Elf (Morninglord)": "Morninglord",
            "Purple Dragon Knight (Iconic)": "Purple Dragon Knight",
            "PDK": "Purple Dragon Knight",
        }
        _SKIP_RACES = {"Kalashtar", "Elven Arcane Archer"}  # not playable races
        for title in client.iter_category_members("Races"):
            if title.startswith("Category:") or title in _NON_RACE_PAGES:
                continue
            if "(speculation)" in title or title in _SKIP_RACES:
                continue
            wiki_races.add(_RACE_ALIASES.get(title, title))

        # Compare against DB seed
        db_classes = {row[0] for row in conn.execute("SELECT name FROM classes").fetchall()}
        db_races = {row[0] for row in conn.execute("SELECT name FROM races").fetchall()}

        missing_classes = wiki_classes - db_classes
        missing_races = wiki_races - db_races

        results.append(ValidationResult(
            name="wiki_classes_seeded",
            description="All wiki-discovered classes should exist in seed data",
            severity="error",
            failures=[{"missing_class": c} for c in sorted(missing_classes)],
        ))
        results.append(ValidationResult(
            name="wiki_races_seeded",
            description="All wiki-discovered races should exist in seed data",
            severity="error",
            failures=[{"missing_race": r} for r in sorted(missing_races)],
        ))

    except Exception as e:
        results.append(ValidationResult(
            name="wiki_seed_check",
            description="Wiki seed validation (requires network)",
            severity="warning",
            failures=[{"error": f"Skipped: {e}"}],
        ))

    return results


def format_validation(results: list[ValidationResult]) -> str:
    """Format validation results as a human-readable report."""
    lines = []
    passed = sum(1 for r in results if r.passed)
    failed = len(results) - passed
    errors = sum(1 for r in results if not r.passed and r.severity == "error")
    warnings = sum(1 for r in results if not r.passed and r.severity == "warning")

    lines.append(f"Validation: {passed}/{len(results)} passed")
    if errors:
        lines.append(f"  {errors} error(s)")
    if warnings:
        lines.append(f"  {warnings} warning(s)")

    for r in results:
        if r.passed:
            continue
        icon = "X" if r.severity == "error" else "!"
        lines.append(f"\n  [{icon}] {r.name}: {r.description}")
        for f in r.failures[:5]:
            lines.append(f"      {f}")
        if len(r.failures) > 5:
            lines.append(f"      ... and {len(r.failures) - 5} more")

    return "\n".join(lines)
