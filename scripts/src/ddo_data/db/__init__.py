"""DDO game database — context-managed SQLite wrapper."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from .schema import create_schema
from .validate import format_validation, validate_database
from .writers import (
    apply_overrides,
    backfill_item_materials,
    backfill_item_slots,
    discover_new_classes,
    discover_new_enhancement_trees,
    discover_new_races,
    insert_augments,
    insert_class_progression,
    insert_crafting,
    insert_crafting_options,
    insert_enhancement_trees,
    insert_feats,
    insert_filigrees,
    insert_items,
    insert_quest_loot,
    insert_set_bonus_effects,
    insert_spells,
    populate_crafting_option_bonuses,
    populate_enhancement_exclusion_groups,
    populate_enhancement_feat_links,
    populate_enhancement_prereq_races,
    populate_enhancement_spell_links,
    populate_feat_exclusion_groups,
    populate_item_materials,
    populate_item_upgrades,
    populate_stat_sources,
    populate_weapon_types,
    seed_class_feat_data,
    seed_crafting_data,
    seed_quest_data,
)

__all__ = ["GameDB"]


class GameDB:
    """Context-managed wrapper around the DDO SQLite game database.

    Usage::

        with GameDB(Path("public/data/ddo.db")) as db:
            db.create_schema()
            db.insert_items(items)
            db.insert_feats(feats)

    Pass ``":memory:"`` as *path* for in-memory databases (useful in tests).
    """

    def __init__(self, path: Path | str) -> None:
        self._path = str(path)
        self._conn: sqlite3.Connection | None = None

    def __enter__(self) -> "GameDB":
        self._conn = sqlite3.connect(self._path)
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.execute("PRAGMA journal_mode = WAL")
        return self

    def __exit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        if self._conn is not None:
            if exc_type is None:
                self._conn.commit()
            else:
                self._conn.rollback()
            self._conn.close()
            self._conn = None

    @property
    def conn(self) -> sqlite3.Connection:
        """The underlying sqlite3 connection (only valid inside ``with`` block)."""
        if self._conn is None:
            raise RuntimeError("GameDB must be used as a context manager (with GameDB(...) as db)")
        return self._conn

    def create_schema(self) -> None:
        """Apply DDL and seed reference data.  Safe to call on an existing DB."""
        create_schema(self.conn)

    def insert_items(self, items: list[dict]) -> int:
        """Insert item dicts (from wiki/game_data parsers).  Returns row count."""
        return insert_items(self.conn, items)

    def insert_feats(self, feats: list[dict], **kwargs: object) -> int:
        """Insert feat dicts (from wiki parsers).  Returns row count."""
        return insert_feats(self.conn, feats, **kwargs)

    def insert_enhancement_trees(self, trees: list[dict]) -> int:
        """Insert enhancement tree dicts (from wiki scraper).  Returns row count."""
        return insert_enhancement_trees(self.conn, trees)

    def insert_set_bonus_effects(self, sets: list[dict]) -> int:
        """Insert set bonus effects (from wiki scraper).  Returns row count."""
        return insert_set_bonus_effects(self.conn, sets)

    def insert_augments(self, augments: list[dict]) -> int:
        """Insert augment dicts (from wiki scraper).  Returns row count."""
        return insert_augments(self.conn, augments)

    def insert_spells(self, spells: list[dict]) -> int:
        """Insert spell dicts (from wiki scraper).  Returns row count."""
        return insert_spells(self.conn, spells)

    def insert_filigrees(self, filigrees: list[dict]) -> int:
        """Insert filigree dicts (from wiki scraper).  Returns row count."""
        return insert_filigrees(self.conn, filigrees)

    def insert_class_progression(self, classes: list[dict]) -> int:
        """Insert class progression data (spell slots, auto feats, bonus feat slots)."""
        return insert_class_progression(self.conn, classes)

    def insert_crafting(self, crafting_data: dict) -> int:
        """Insert Cannith Crafting enchantments, values, and slot assignments."""
        return insert_crafting(self.conn, crafting_data)

    def insert_crafting_options(self, options: list[dict]) -> int:
        """Insert named crafting system options (Green Steel, Thunder-Forged, etc.)."""
        return insert_crafting_options(self.conn, options)

    def populate_item_materials(self) -> int:
        """Populate item_materials from items data."""
        return populate_item_materials(self.conn)

    def populate_weapon_types(self) -> int:
        """Populate weapon_types from item_weapon_stats data."""
        return populate_weapon_types(self.conn)

    def populate_enhancement_prereq_races(self) -> int:
        """Populate enhancement_prereq_races from prereq text."""
        return populate_enhancement_prereq_races(self.conn)

    def populate_enhancement_feat_links(self) -> int:
        """Populate enhancement_feat_links from enhancement descriptions."""
        return populate_enhancement_feat_links(self.conn)

    def populate_item_upgrades(self) -> int:
        """Populate item_upgrades (heroic->epic->legendary name pairs)."""
        return populate_item_upgrades(self.conn)

    def populate_feat_exclusion_groups(self) -> int:
        """Populate feat_exclusion_groups with known mutual exclusions."""
        return populate_feat_exclusion_groups(self.conn)

    def populate_enhancement_spell_links(self) -> int:
        """Populate enhancement_spell_links from SLA patterns."""
        return populate_enhancement_spell_links(self.conn)

    def populate_enhancement_exclusion_groups(self) -> int:
        """Populate enhancement_exclusion_groups from choice patterns."""
        return populate_enhancement_exclusion_groups(self.conn)

    def populate_crafting_option_bonuses(self) -> int:
        """Resolve crafting option descriptions to bonuses table."""
        return populate_crafting_option_bonuses(self.conn)

    def seed_quest_data(self) -> int:
        """Seed quests, adventure packs, patrons from static wiki data."""
        return seed_quest_data(self.conn)

    def populate_stat_sources(self) -> int:
        """Populate stat_sources from enhancement bonus data."""
        return populate_stat_sources(self.conn)

    def seed_class_feat_data(self) -> int:
        """Seed class choice feats and bonus feat lists from static wiki data."""
        return seed_class_feat_data(self.conn)

    def seed_crafting_data(self) -> int:
        """Seed crafting items, ingredients, and recipes from static wiki data."""
        return seed_crafting_data(self.conn)

    def insert_quest_loot(self, loot_entries: list[dict]) -> int:
        """Insert quest loot from wiki category data."""
        return insert_quest_loot(self.conn, loot_entries)

    def backfill_item_slots(self, slot_data: dict[str, set[str]]) -> int:
        """Backfill equipment_slot from wiki slot categories."""
        return backfill_item_slots(self.conn, slot_data)

    def backfill_item_materials(self, material_data: dict[str, set[str]]) -> int:
        """Backfill material from wiki material categories."""
        return backfill_item_materials(self.conn, material_data)

    def discover_new_races(self, wiki_race_names: list[str]) -> int:
        """Insert new races found in wiki but not in seed."""
        return discover_new_races(self.conn, wiki_race_names)

    def discover_new_classes(self, wiki_class_names: list[str]) -> int:
        """Insert new classes found in wiki but not in seed."""
        return discover_new_classes(self.conn, wiki_class_names)

    def discover_new_enhancement_trees(self, wiki_tree_names: list[str]) -> list[str]:
        """Return tree page titles in wiki but not in DB."""
        return discover_new_enhancement_trees(self.conn, wiki_tree_names)

    def apply_overrides(self, overrides_path: str | None = None) -> int:
        """Apply manual bonus/effect overrides from JSON."""
        return apply_overrides(self.conn, overrides_path)

    def validate(self) -> str:
        """Run post-import validation assertions.  Returns formatted report."""
        results = validate_database(self.conn)
        return format_validation(results)
