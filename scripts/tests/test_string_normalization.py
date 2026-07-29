"""Tests for normalization and repair of stored rows at the writer boundary.

The 91 rows carrying raw HTML entities in the shipped database came from five
different parsers, so the fix belongs where rows are *written*, not in any one
parser — a per-parser fix leaves the next parser broken. These tests pin both
halves: the normalizer itself, and the fact that it is actually applied on the
way into every table that stores scraped text.

The repair passes at the bottom exist for the same reason in mirror image: the
build updates the shipped database rather than rebuilding it (ddowiki's WAF
blocks category enumeration, so a from-scratch build would lose feats, spells
and quest loot), so rows written by the *old* parsers need the equivalent of the
parser fix applied to them where they sit.
"""

from __future__ import annotations

import sqlite3

from ddo_data.db import GameDB
from ddo_data.db.writers import (
    canonical_name,
    canonical_text,
    collapse_value_variants,
    normalize_stored_text,
)


class TestCanonicalText:
    """The normalizer applied to every TEXT value entering the database."""

    def test_decodes_a_numeric_entity(self) -> None:
        assert canonical_text("Admiral&#39;s Gloves") == "Admiral's Gloves"

    def test_decodes_named_entities(self) -> None:
        assert canonical_text("Tier 1 &rarr; Tier 2") == "Tier 1 → Tier 2"
        assert canonical_text("5&nbsp;seconds") == "5\xa0seconds"
        assert canonical_text("A &mdash; B") == "A — B"

    def test_is_idempotent(self) -> None:
        """Applying twice must equal applying once.

        The writer normalizes on insert and the stored-row pass normalizes
        again; a non-idempotent unescape would corrupt text that legitimately
        contains an escaped ampersand.
        """
        once = canonical_text("Sword &amp;amp; Board")
        assert canonical_text(once) == once

    def test_an_already_clean_string_is_unchanged(self) -> None:
        assert canonical_text("Admiral's Gloves") == "Admiral's Gloves"
        assert canonical_text("50% chance") == "50% chance"

    def test_trims_surrounding_whitespace(self) -> None:
        assert canonical_text("  Vorpal  ") == "Vorpal"

    def test_strips_a_truncated_html_comment(self) -> None:
        """`item_materials` shipped a row literally named 'No <!--'."""
        assert canonical_text("No <!--") == "No"
        assert canonical_text("Steel <!-- confirmed -->") == "Steel"

    def test_passes_none_through(self) -> None:
        assert canonical_text(None) is None

    def test_empty_string_becomes_none(self) -> None:
        """An empty string is absence, and absence is spelled NULL."""
        assert canonical_text("") is None
        assert canonical_text("   ") is None


class TestUnescapeAtTheWriter:
    """Every TEXT column of a written row is normalized, not just `name`."""

    def test_item_name_and_icon_are_both_decoded(self) -> None:
        with GameDB(":memory:") as db:
            db.create_schema()
            db.insert_items([{
                "name": "Admiral&#39;s Gloves",
                "icon": "Admiral&#39;s Gloves.png",
                "description": "Bottle o&#39; Rum flavour text",
                "equipment_slot": "Hands",
                "item_type": "Clothing",
            }])
            row = db.conn.execute(
                "SELECT name, icon, description FROM items"
            ).fetchone()
        assert row == (
            "Admiral's Gloves",
            "Admiral's Gloves.png",
            "Bottle o' Rum flavour text",
        )

    def test_feat_description_note_and_prerequisite(self) -> None:
        with GameDB(":memory:") as db:
            db.create_schema()
            db.insert_feats([{
                "name": "Precise Shot",
                "description": "Attacks pass through &rarr; targets",
                "note": "Stacks &amp; applies",
                "prerequisite": "Point Blank Shot &nbsp;",
            }])
            row = db.conn.execute(
                "SELECT description, note, prerequisite FROM feats"
            ).fetchone()
        assert "&rarr;" not in row[0]
        assert "&amp;" not in row[1]
        assert "&nbsp;" not in (row[2] or "")

    def test_filigree_bonus(self) -> None:
        with GameDB(":memory:") as db:
            db.create_schema()
            db.insert_filigrees([
                {"name": "Bloodletter", "bonus": "+1 Sneak Attack &rarr; dice"},
            ])
            (bonus,) = db.conn.execute("SELECT bonus FROM filigrees").fetchone()
        assert bonus == "+1 Sneak Attack → dice"

    def test_normalization_does_not_create_a_duplicate_item(self) -> None:
        """The decoded name must reach the same row the escaped one did."""
        with GameDB(":memory:") as db:
            db.create_schema()
            db.insert_items([
                {"name": "Admiral&#39;s Gloves", "equipment_slot": "Hands"},
                {"name": "Admiral's Gloves", "equipment_slot": "Hands"},
            ])
            (count,) = db.conn.execute("SELECT COUNT(*) FROM items").fetchone()
        assert count == 1


class TestNormalizeStoredText:
    """The same normalizer, applied to rows already in the database.

    Needed because ddowiki's WAF blocks a from-scratch rebuild: `build-db` runs
    against the existing database, so historical rows are never rewritten by an
    insert and would otherwise keep their escaped text forever.
    """

    def _db(self) -> sqlite3.Connection:
        db = GameDB(":memory:")
        db.__enter__()
        db.create_schema()
        return db.conn

    def test_decodes_an_entity_in_a_stored_row(self) -> None:
        conn = self._db()
        conn.execute(
            "INSERT INTO items (name, equipment_slot) VALUES ('Admiral&#39;s Gloves', 'Hands')"
        )
        changed = normalize_stored_text(conn)
        assert changed >= 1
        assert conn.execute("SELECT name FROM items").fetchone()[0] == "Admiral's Gloves"

    def test_merges_a_row_whose_decoded_name_already_exists(self) -> None:
        """Both spellings can coexist after a rebuild — they must become one row."""
        conn = self._db()
        conn.execute("INSERT INTO items (id, name) VALUES (1, 'Admiral&#39;s Gloves')")
        conn.execute("INSERT INTO items (id, name) VALUES (2, \"Admiral's Gloves\")")
        conn.execute("INSERT INTO quests (id, name) VALUES (7, 'The Voyage')")
        conn.execute("INSERT INTO quest_loot (quest_id, item_id) VALUES (7, 1)")

        normalize_stored_text(conn)

        names = [r[0] for r in conn.execute("SELECT name FROM items")]
        assert names == ["Admiral's Gloves"]
        # The escaped row's loot mapping followed it onto the surviving row.
        assert conn.execute(
            "SELECT item_id FROM quest_loot"
        ).fetchone()[0] in {r[0] for r in conn.execute("SELECT id FROM items")}

    def test_canonicalizes_a_stored_effect_name(self) -> None:
        conn = self._db()
        conn.execute("INSERT INTO effects (name) VALUES ('clicky')")
        conn.execute("INSERT INTO effects (name) VALUES ('ArmorPiercing')")
        conn.execute("INSERT INTO effects (name) VALUES ('|* Random effect:')")

        normalize_stored_text(conn)

        names = sorted(r[0] for r in conn.execute("SELECT name FROM effects"))
        assert names == ["Armor-Piercing", "Clicky", "Random effect:"]

    def test_merges_effect_rows_that_collapse_to_one_name(self) -> None:
        conn = self._db()
        conn.execute("INSERT INTO items (id, name) VALUES (1, 'Sword')")
        conn.execute("INSERT INTO effects (id, name) VALUES (1, 'Clicky')")
        conn.execute("INSERT INTO effects (id, name) VALUES (2, 'clicky')")
        conn.execute(
            "INSERT INTO item_effects (item_id, effect_id, sort_order) VALUES (1, 2, 0)"
        )

        normalize_stored_text(conn)

        assert [r[0] for r in conn.execute("SELECT name FROM effects")] == ["Clicky"]
        assert conn.execute("SELECT effect_id FROM item_effects").fetchone()[0] == 1

    def test_is_idempotent_over_the_whole_database(self) -> None:
        conn = self._db()
        conn.execute("INSERT INTO items (name) VALUES ('Bottle o&#39; Rum')")
        first = normalize_stored_text(conn)
        second = normalize_stored_text(conn)
        assert first >= 1
        assert second == 0

    def test_leaves_a_clean_database_untouched(self) -> None:
        conn = self._db()
        conn.execute("INSERT INTO items (name) VALUES ('Celestia')")
        assert normalize_stored_text(conn) == 0


class TestCollapseValueVariants:
    """Case/punctuation variants of the same value are collapsed to one spelling.

    Where no deterministic rule exists (is the enhancement "Self Reliant" or
    "Self-Reliant"? the wiki spells it both ways), the majority spelling in the
    column wins — a data-driven choice rather than a guess about game text.
    """

    def _db(self) -> sqlite3.Connection:
        db = GameDB(":memory:")
        db.__enter__()
        db.create_schema()
        return db.conn

    def test_majority_spelling_wins_for_an_enum_column(self) -> None:
        conn = self._db()
        for i, mod in enumerate(["STR", "STR", "STR", "Str"], start=1):
            conn.execute("INSERT INTO items (id, name) VALUES (?, ?)", (i, f"W{i}"))
            conn.execute(
                "INSERT INTO item_weapon_stats (item_id, attack_mod) VALUES (?, ?)",
                (i, mod),
            )

        collapse_value_variants(conn)

        values = {r[0] for r in conn.execute("SELECT DISTINCT attack_mod FROM item_weapon_stats")}
        assert values == {"STR"}

    def test_collapses_a_material_name_and_repoints_its_referrers(self) -> None:
        conn = self._db()
        conn.execute("INSERT INTO item_materials (id, name) VALUES (1, 'Steel')")
        conn.execute("INSERT INTO item_materials (id, name) VALUES (2, 'steel')")
        conn.execute("INSERT INTO items (id, name, material_id) VALUES (1, 'A', 1)")
        conn.execute("INSERT INTO items (id, name, material_id) VALUES (2, 'B', 1)")
        conn.execute("INSERT INTO items (id, name, material_id) VALUES (3, 'C', 2)")

        collapse_value_variants(conn)

        assert [r[0] for r in conn.execute("SELECT name FROM item_materials")] == ["Steel"]
        assert {r[0] for r in conn.execute("SELECT material_id FROM items")} == {1}

    def test_leaves_genuinely_different_values_alone(self) -> None:
        conn = self._db()
        conn.execute("INSERT INTO item_materials (name) VALUES ('Steel')")
        conn.execute("INSERT INTO item_materials (name) VALUES ('Mithral')")

        collapse_value_variants(conn)

        assert sorted(r[0] for r in conn.execute("SELECT name FROM item_materials")) == [
            "Mithral", "Steel",
        ]

    def test_is_idempotent(self) -> None:
        conn = self._db()
        conn.execute("INSERT INTO item_materials (name) VALUES ('Steel')")
        conn.execute("INSERT INTO item_materials (name) VALUES ('steel')")
        first = collapse_value_variants(conn)
        second = collapse_value_variants(conn)
        assert first >= 1
        assert second == 0


class TestCanonicalName:
    """The normalizer applied to a value that *names* an entity.

    A name is a label, so markup in it is never meaning — it is the raw wikitext
    leaking through. Descriptions are deliberately not routed here: their markup
    carries prose structure (wiki tables, list markers, colour spans) and
    reducing it to a label is Phase 4m's problem, not this one's.
    """

    def test_renders_a_piped_wikilink_as_its_display_text(self) -> None:
        """A wikilink must become the text a reader sees, not vanish."""
        assert canonical_name("[[True Seeing (enhancement)|True Seeing]]") == "True Seeing"

    def test_renders_a_bare_wikilink_as_its_target(self) -> None:
        assert canonical_name("[[Stoneskin]]") == "Stoneskin"

    def test_renders_a_wikilink_inside_prose(self) -> None:
        assert canonical_name(
            "A 5% chance on hit to [[Bluff]] your target for 4 seconds."
        ) == "A 5% chance on hit to Bluff your target for 4 seconds."

    def test_expands_a_template_to_its_display_text(self) -> None:
        """`{{HELstats|3|L=6}}` means "3" — the count, not a hole in the sentence."""
        assert canonical_name(
            "This can stack up to {{HELstats|3|L=6}} times."
        ) == "This can stack up to 3 times."

    def test_strips_a_trailing_line_break(self) -> None:
        assert canonical_name("Eldritch Rune of Striding<br />") == (
            "Eldritch Rune of Striding"
        )
        assert canonical_name("Twilight (enchantment)<br />") == "Twilight (enchantment)"

    def test_a_line_break_between_words_becomes_a_space(self) -> None:
        """Deleting the tag outright would fuse the two lines into one word."""
        assert canonical_name("Eldritch Rune of Fear<br />Fearsome") == (
            "Eldritch Rune of Fear Fearsome"
        )

    def test_strips_a_paired_inline_tag(self) -> None:
        assert canonical_name("Option 1) <kbd>Exchange ingredients for gems</kbd>") == (
            "Option 1) Exchange ingredients for gems"
        )

    def test_inherits_entity_and_comment_handling(self) -> None:
        assert canonical_name("Admiral&#39;s Gloves") == "Admiral's Gloves"
        assert canonical_name("No <!--") == "No"

    def test_leaves_a_clean_name_alone(self) -> None:
        for name in ("Celestia", "+1 Starter Docent", "Command (enchantment)",
                     "Air - Martial", "50% Deception"):
            assert canonical_name(name) == name

    def test_is_idempotent(self) -> None:
        once = canonical_name("[[True Seeing (enhancement)|True Seeing]]<br />")
        assert canonical_name(once) == once

    def test_passes_none_through_and_empties_to_none(self) -> None:
        assert canonical_name(None) is None
        assert canonical_name("") is None
        assert canonical_name("<br />") is None


class TestNameNormalizationAtTheWriter:
    """Markup must not reach a name column in the first place."""

    def test_a_set_bonus_whose_text_is_a_wikilink(self) -> None:
        """A set bonus with no parseable stat names itself after its own text.

        Four shipped `bonuses.name` values were raw wikitext for this reason.
        """
        with GameDB(":memory:") as db:
            db.create_schema()
            db.insert_set_bonus_effects([{
                "name": "Legendary Sight",
                "bonuses": [
                    {"min_pieces": 3,
                     "text": "[[True Seeing (enhancement)|True Seeing]]"},
                    {"min_pieces": 5,
                     "text": "When struck, you will occasionally have the "
                             "[[Stoneskin]] spell cast on you."},
                ],
            }])
            names = sorted(r[0] for r in db.conn.execute("SELECT name FROM bonuses"))
        assert names == [
            "True Seeing",
            "When struck, you will occasionally have the Stoneskin spell cast on you.",
        ]

    def test_a_crafting_option_name_loses_its_line_break(self) -> None:
        with GameDB(":memory:") as db:
            db.create_schema()
            db.insert_crafting_options([{
                "system_id": 28,
                "tier": "Eldritch Rune",
                "name": "Eldritch Rune of Striding<br />",
                "description": "+15% Enhancement bonus to Striding",
            }])
            (name,) = db.conn.execute("SELECT name FROM crafting_options").fetchone()
        assert name == "Eldritch Rune of Striding"

    def test_a_crafting_option_description_keeps_its_markup(self) -> None:
        """Descriptions are out of scope — normalizing them is Phase 4m."""
        with GameDB(":memory:") as db:
            db.create_schema()
            db.insert_crafting_options([{
                "system_id": 28,
                "tier": "Eldritch Rune",
                "name": "Eldritch Rune of Striding",
                "description": "<font color=red>+15%</font> Striding",
            }])
            (desc,) = db.conn.execute(
                "SELECT description FROM crafting_options"
            ).fetchone()
        assert desc == "<font color=red>+15%</font> Striding"


class TestNameNormalizationOfStoredRows:
    """The same rule applied to the 385 name-column rows already stored.

    The build updates the shipped database rather than rebuilding it, so a name
    written before this rule existed is never rewritten by an insert.
    """

    def _db(self) -> sqlite3.Connection:
        db = GameDB(":memory:")
        db.__enter__()
        db.create_schema()
        return db.conn

    def test_strips_a_line_break_from_a_stored_crafting_option(self) -> None:
        conn = self._db()
        conn.execute(
            "INSERT INTO crafting_options (system_id, tier, name, description) "
            "VALUES (28, 'Eldritch Rune', 'Eldritch Rune of Striding<br />', 'x')"
        )
        assert normalize_stored_text(conn) >= 1
        assert conn.execute("SELECT name FROM crafting_options").fetchone()[0] == (
            "Eldritch Rune of Striding"
        )

    def test_renders_a_stored_bonus_name_wikilink(self) -> None:
        conn = self._db()
        conn.execute(
            "INSERT INTO bonuses (name, description) VALUES "
            "('[[True Seeing (enhancement)|True Seeing]]', 'True Seeing')"
        )
        normalize_stored_text(conn)
        assert conn.execute("SELECT name FROM bonuses").fetchone()[0] == "True Seeing"

    def test_merges_a_bonus_whose_rendered_name_already_exists(self) -> None:
        """`bonuses.name` is part of the table's unique index, so this collides.

        The referring `set_bonus_bonuses` row has to follow the survivor rather
        than be dropped or left dangling.
        """
        conn = self._db()
        conn.execute("INSERT INTO bonuses (id, name) VALUES (1, 'True Seeing')")
        conn.execute(
            "INSERT INTO bonuses (id, name) VALUES "
            "(2, '[[True Seeing (enhancement)|True Seeing]]')"
        )
        conn.execute("INSERT INTO set_bonuses (id, name) VALUES (9, 'Legendary Sight')")
        conn.execute(
            "INSERT INTO set_bonus_bonuses (set_id, bonus_id, min_pieces) "
            "VALUES (9, 2, 3)"
        )

        normalize_stored_text(conn)

        assert [r[0] for r in conn.execute("SELECT name FROM bonuses")] == ["True Seeing"]
        assert conn.execute(
            "SELECT bonus_id FROM set_bonus_bonuses"
        ).fetchone()[0] == 1

    def test_leaves_a_stored_description_alone(self) -> None:
        conn = self._db()
        conn.execute(
            "INSERT INTO crafting_options (system_id, tier, name, description) "
            "VALUES (28, 'Rune', 'Rune', '<font color=red>See note</font>')"
        )
        normalize_stored_text(conn)
        assert conn.execute(
            "SELECT description FROM crafting_options"
        ).fetchone()[0] == "<font color=red>See note</font>"

    def test_collapses_internal_whitespace_so_a_rescrape_matches(self) -> None:
        """The stored name must equal what the writer would now produce.

        36 option names carry double spaces left behind by a stripped link
        template. If the pass skipped them, the next scrape's collapsed name
        would be a new identity and land beside the stored one.
        """
        conn = self._db()
        conn.execute(
            "INSERT INTO crafting_options (system_id, tier, name, description) "
            "VALUES (28, 'Rune', '1-2 Eldritch Rune  from Enter the Kobold', 'x')"
        )
        normalize_stored_text(conn)
        assert conn.execute("SELECT name FROM crafting_options").fetchone()[0] == (
            "1-2 Eldritch Rune from Enter the Kobold"
        )

    def test_is_idempotent(self) -> None:
        conn = self._db()
        conn.execute(
            "INSERT INTO crafting_enchantments (name) VALUES ('Twilight (enchantment)<br />')"
        )
        first = normalize_stored_text(conn)
        second = normalize_stored_text(conn)
        assert first >= 1
        assert second == 0


class TestRepairStoredRows:
    """Rows written by the pre-4c parsers, brought up to the current behaviour.

    Each of these is the stored-row half of a parser fix. Without them the fix
    only applies to rows the re-scrape happens to touch, and the old row sits
    beside the new one — two Incite entries on the same item, one of them wrong.
    """

    def _db(self) -> sqlite3.Connection:
        db = GameDB(":memory:")
        db.__enter__()
        db.create_schema()
        return db.conn

    # -- effects: magnitude in the type column ------------------------------

    def test_moves_a_stored_magnitude_into_item_effects_value(self) -> None:
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute("INSERT INTO items (id, name) VALUES (1, 'Shield')")
        conn.execute("INSERT INTO effects (id, name, modifier) VALUES (1, 'Incite', '59')")
        conn.execute(
            "INSERT INTO item_effects (item_id, effect_id, value, sort_order) "
            "VALUES (1, 1, NULL, 0)"
        )

        report = repair_stored_rows(conn)

        assert report["effect_modifiers_regraded"] == 1
        row = conn.execute(
            """
            SELECT e.name, e.modifier, ie.value
              FROM item_effects ie JOIN effects e ON e.id = ie.effect_id
            """
        ).fetchone()
        assert row == ("Incite", None, 59)

    def test_drops_the_stale_row_when_a_correct_one_already_exists(self) -> None:
        """After a re-scrape the item has both shapes; only one may survive."""
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute("INSERT INTO items (id, name) VALUES (1, 'Shield')")
        conn.execute("INSERT INTO effects (id, name, modifier) VALUES (1, 'Incite', '59')")
        conn.execute(
            "INSERT INTO effects (id, name, modifier) VALUES (2, 'Incite', 'Insightful')"
        )
        conn.execute(
            "INSERT INTO item_effects (item_id, effect_id, value, sort_order) "
            "VALUES (1, 1, NULL, 0), (1, 2, 59, 1)"
        )

        repair_stored_rows(conn)

        rows = conn.execute(
            """
            SELECT e.name, e.modifier, ie.value
              FROM item_effects ie JOIN effects e ON e.id = ie.effect_id
             WHERE ie.item_id = 1
            """
        ).fetchall()
        assert rows == [("Incite", "Insightful", 59)]

    def test_leaves_an_ordinal_modifier_alone(self) -> None:
        """`{{Burns|3rd}}` (44 uses) is a tier, not a magnitude."""
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute("INSERT INTO effects (name, modifier) VALUES ('Burns', '3rd')")

        repair_stored_rows(conn)

        assert conn.execute("SELECT modifier FROM effects").fetchone()[0] == "3rd"

    def test_clears_a_truncated_template_modifier(self) -> None:
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute(
            "INSERT INTO effects (name, modifier) VALUES ('Nearly Finished', '{{Stat')"
        )
        conn.execute("INSERT INTO effects (name, modifier) VALUES ('Note', 'Text.{{Ref')")

        repair_stored_rows(conn)

        modifiers = [r[0] for r in conn.execute("SELECT modifier FROM effects")]
        assert all(m is None or "{{" not in m for m in modifiers)

    def test_nulls_a_modifier_that_is_only_punctuation(self) -> None:
        """`DR` shipped with modifier '-' — neither a bonus type nor a value."""
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute("INSERT INTO effects (name, modifier) VALUES ('DR', '-')")

        repair_stored_rows(conn)

        assert conn.execute("SELECT modifier FROM effects").fetchone()[0] is None

    def test_moves_a_magnitude_out_of_the_effect_name(self) -> None:
        """`Tendon Slice +10` names the magnitude; item_effects.value holds it."""
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute("INSERT INTO items (id, name) VALUES (1, 'Dagger')")
        conn.execute("INSERT INTO effects (id, name) VALUES (1, 'Tendon Slice +10')")
        conn.execute(
            "INSERT INTO item_effects (item_id, effect_id, sort_order) VALUES (1, 1, 0)"
        )

        repair_stored_rows(conn)

        row = conn.execute(
            """
            SELECT e.name, ie.value FROM item_effects ie
              JOIN effects e ON e.id = ie.effect_id
            """
        ).fetchone()
        assert row == ("Tendon Slice", 10)

    # -- effects: maintenance and wrapper templates -------------------------

    def test_deletes_effects_named_after_a_wrapper_template(self) -> None:
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute("INSERT INTO items (id, name) VALUES (1, 'Ring')")
        conn.execute("INSERT INTO effects (id, name) VALUES (1, 'Nearly Finished')")
        conn.execute("INSERT INTO effects (id, name) VALUES (2, 'Vorpal')")
        conn.execute(
            "INSERT INTO item_effects (item_id, effect_id, sort_order) VALUES (1, 1, 0)"
        )

        report = repair_stored_rows(conn)

        assert report["maintenance_rows_deleted"] == 1
        assert [r[0] for r in conn.execute("SELECT name FROM effects")] == ["Vorpal"]
        assert conn.execute("SELECT COUNT(*) FROM item_effects").fetchone()[0] == 0

    # -- bonuses: {{Save|Spell}} stat identity ------------------------------

    def test_retargets_a_stored_spell_save_bonus(self) -> None:
        """The 19 rows still pointing at Spell Resistance move to Spell Save."""
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute(
            "INSERT INTO bonuses (id, name, description, stat_id, value) "
            "VALUES (1, 'Spell Resistance +4', '{{Save|Spell|4}}', 21, 4)"
        )

        report = repair_stored_rows(conn)

        assert report["spell_saves_retargeted"] == 1
        row = conn.execute("SELECT name, stat_id FROM bonuses").fetchone()
        assert row == ("Spell Save +4", 177)

    def test_does_not_retarget_a_real_spell_resistance_bonus(self) -> None:
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute(
            "INSERT INTO bonuses (name, description, stat_id, value) "
            "VALUES ('Spell Resistance +25', '{{Spell Resistance|25}}', 21, 25)"
        )

        repair_stored_rows(conn)

        assert conn.execute("SELECT stat_id FROM bonuses").fetchone()[0] == 21

    def test_merges_a_retargeted_bonus_into_its_rescraped_twin(self) -> None:
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute("INSERT INTO items (id, name) VALUES (1, 'Cloak')")
        conn.execute(
            "INSERT INTO bonuses (id, name, description, stat_id, bonus_type_id, value) "
            "VALUES (1, 'Spell Resistance +4', '{{Save|Spell|4}}', 21, 6, 4)"
        )
        conn.execute(
            "INSERT INTO bonuses (id, name, description, stat_id, bonus_type_id, value) "
            "VALUES (2, 'Spell Save +4', '+4 Resistance bonus to Spell Save', 177, 6, 4)"
        )
        conn.execute(
            "INSERT INTO item_bonuses (item_id, bonus_id, sort_order) VALUES (1, 1, 0)"
        )

        repair_stored_rows(conn)

        names = [r[0] for r in conn.execute("SELECT name FROM bonuses")]
        assert names == ["Spell Save +4"]
        assert conn.execute("SELECT bonus_id FROM item_bonuses").fetchone()[0] == 2

    # -- items: one wiki page, one item row ---------------------------------

    def test_merges_items_that_share_a_wiki_page(self) -> None:
        """The 7 items named '(level 12)' are the same page as their fixed twin."""
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        url = "https://ddowiki.com/page/Item:Crystallized_Eternity_(level_12)"
        conn.execute(
            "INSERT INTO items (id, name, wiki_url) VALUES (1, '(level 12)', ?)", (url,)
        )
        conn.execute(
            "INSERT INTO items (id, name, wiki_url) VALUES "
            "(2, 'Crystallized Eternity (level 12)', ?)", (url,)
        )
        conn.execute("INSERT INTO quests (id, name) VALUES (9, 'A Quest')")
        conn.execute("INSERT INTO quest_loot (quest_id, item_id) VALUES (9, 1)")

        report = repair_stored_rows(conn)

        assert report["items_merged"] == 1
        assert [r[0] for r in conn.execute("SELECT name FROM items")] == [
            "Crystallized Eternity (level 12)",
        ]
        assert conn.execute("SELECT item_id FROM quest_loot").fetchone()[0] == 2

    def test_keeps_the_name_matching_the_wiki_page_title(self) -> None:
        """'Rune Arm' and 'Arcing Sky' share a page; the page title decides."""
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        url = "https://ddowiki.com/page/Item:Arcing_Sky_(level_13)"
        conn.execute("INSERT INTO items (id, name, wiki_url) VALUES (1, 'Rune Arm', ?)", (url,))
        conn.execute("INSERT INTO items (id, name, wiki_url) VALUES (2, 'Arcing Sky', ?)", (url,))

        repair_stored_rows(conn)

        assert [r[0] for r in conn.execute("SELECT name FROM items")] == ["Arcing Sky"]

    def test_leaves_distinct_items_alone(self) -> None:
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute(
            "INSERT INTO items (id, name, wiki_url) VALUES "
            "(1, 'Celestia', 'https://ddowiki.com/page/Item:Celestia')"
        )
        conn.execute(
            "INSERT INTO items (id, name, wiki_url) VALUES "
            "(2, 'Moonbeam', 'https://ddowiki.com/page/Item:Moonbeam')"
        )

        report = repair_stored_rows(conn)

        assert report["items_merged"] == 0
        assert conn.execute("SELECT COUNT(*) FROM items").fetchone()[0] == 2

    def test_is_idempotent(self) -> None:
        from ddo_data.db.writers import repair_stored_rows

        conn = self._db()
        conn.execute("INSERT INTO items (id, name) VALUES (1, 'Shield')")
        conn.execute("INSERT INTO effects (id, name, modifier) VALUES (1, 'Incite', '59')")
        conn.execute(
            "INSERT INTO item_effects (item_id, effect_id, sort_order) VALUES (1, 1, 0)"
        )
        conn.execute(
            "INSERT INTO bonuses (name, description, stat_id, value) "
            "VALUES ('Spell Resistance +4', '{{Save|Spell|4}}', 21, 4)"
        )

        first = repair_stored_rows(conn)
        second = repair_stored_rows(conn)

        assert sum(first.values()) > 0
        assert sum(second.values()) == 0
