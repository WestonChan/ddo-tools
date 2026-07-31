"""Tests for MediaWiki template expansion (wiki/templates.py)."""

from __future__ import annotations

from ddo_data.wiki.templates import (
    Template,
    expand_display_text,
    format_bonus_description,
    is_maintenance_template,
    iter_templates,
    split_enchantment_entry,
)


class TestIterTemplates:
    """iter_templates() enumerates top-level templates, nesting-aware."""

    def test_finds_name_and_positional_fields(self) -> None:
        found = iter_templates("{{Stat|STR|7}}")
        assert found == [
            Template(name="Stat", fields={"_positional_1": "STR", "_positional_2": "7"},
                     raw="{{Stat|STR|7}}"),
        ]

    def test_keeps_a_nested_template_inside_its_parent(self) -> None:
        """A nested {{Stat}} must not be reported as a sibling of the wrapper."""
        found = iter_templates("{{Nearly Finished|{{Stat|STR|8}}|{{Stat|CON|8}}}}")
        assert [t.name for t in found] == ["Nearly Finished"]
        assert found[0].fields["_positional_1"] == "{{Stat|STR|8}}"
        assert found[0].fields["_positional_2"] == "{{Stat|CON|8}}"

    def test_finds_several_top_level_templates(self) -> None:
        found = iter_templates("{{Vorpal}} and {{Bane|Evil|4}}")
        assert [t.name for t in found] == ["Vorpal", "Bane"]

    def test_ignores_an_unclosed_template(self) -> None:
        """Malformed wikitext yields nothing rather than a partial Template."""
        assert iter_templates("{{Stat|Wisdom") == []

    def test_named_fields_are_lowercased_keys(self) -> None:
        found = iter_templates("{{InlineWht|dark=y|+3% Legendary bonus to Dodge Cap}}")
        assert found[0].fields["dark"] == "y"
        assert found[0].fields["_positional_1"] == "+3% Legendary bonus to Dodge Cap"


class TestIsMaintenanceTemplate:
    """Maintenance templates are editorial markers, never game data."""

    def test_bug_marker_in_either_case(self) -> None:
        assert is_maintenance_template("bug")
        assert is_maintenance_template("Bug")

    def test_other_wiki_housekeeping_markers(self) -> None:
        for name in ("Orphan", "Underlinked", "Top", "History", "Ref"):
            assert is_maintenance_template(name), name

    def test_a_real_enchantment_template_is_not_maintenance(self) -> None:
        assert not is_maintenance_template("Stat")
        assert not is_maintenance_template("InlineWht")


class TestExpandDisplayText:
    """Templates become the text a reader should see, not empty string."""

    def test_extracts_a_link_template_instead_of_stripping_it(self) -> None:
        """The item-name bug: stripping left ' (level 12)' with no item name."""
        assert (
            expand_display_text("{{Item|Crystallized Eternity}} (level 12)")
            == "Crystallized Eternity (level 12)"
        )

    def test_link_template_second_param_is_the_display_text(self) -> None:
        assert expand_display_text("{{Item|Celestia (weapon)|Celestia}}") == "Celestia"

    def test_a_trailing_pipe_does_not_blank_the_link_text(self) -> None:
        """``{{Item|Crystallized Eternity|}}`` still renders the item's name.

        MediaWiki reads the trailing pipe as an empty second parameter, and a
        link template with no display text falls back to the page name — it does
        not render nothing. Once ``extract_template`` began keeping empty
        positional slots (so ``{{Enhancement bonus|io||15}}`` reads correctly),
        taking the *last* parameter here would hand back ``""`` and the name
        would vanish: the same failure as the seven items called ``(level 12)``,
        wearing a different hat. One trailing pipe from a wiki editor is the
        whole distance between this being latent and being live.
        """
        assert (
            expand_display_text("{{Item|Crystallized Eternity|}}")
            == "Crystallized Eternity"
        )

    def test_a_link_template_with_nothing_in_it_renders_nothing(self) -> None:
        """``{{Item|}}`` names no page, so there is no text to show.

        Two cached occurrences, both on ``Item:Potion of Protection from
        Energy``.
        """
        assert expand_display_text("{{Item|}}") == ""

    def test_drops_a_maintenance_template_and_its_editorial_note(self) -> None:
        assert (
            expand_display_text("Grants Fire Shield {{Bug|does nothing on live}}")
            == "Grants Fire Shield"
        )

    def test_keeps_the_content_of_a_formatting_wrapper(self) -> None:
        assert (
            expand_display_text("{{InlineWht|dark=y|+3% Legendary bonus to Dodge Cap}}")
            == "+3% Legendary bonus to Dodge Cap"
        )

    def test_plain_text_is_unchanged(self) -> None:
        assert expand_display_text("Admiral's Gloves") == "Admiral's Gloves"

    def test_empty_input(self) -> None:
        assert expand_display_text("") == ""

    def test_unknown_template_falls_back_to_its_parameters(self) -> None:
        """An unrecognized template still contributes its readable params."""
        assert expand_display_text("{{Nopelike|Sneak Attack}}") == "Sneak Attack"


class TestSplitEnchantmentEntry:
    """One bullet in the wiki `enhancements` list can hold several enchantments."""

    def test_a_plain_template_is_returned_as_itself(self) -> None:
        assert split_enchantment_entry("{{Stat|STR|7}}") == ["{{Stat|STR|7}}"]

    def test_a_choice_wrapper_yields_each_alternative(self) -> None:
        assert split_enchantment_entry(
            "{{Nearly Finished|{{Stat|STR|8}}|{{Stat|CON|8}}}}"
        ) == ["{{Stat|STR|8}}", "{{Stat|CON|8}}"]

    def test_almost_there_wrapper_too(self) -> None:
        assert split_enchantment_entry(
            "{{Almost There|{{Stat|CHA|3|Insightful}}}}"
        ) == ["{{Stat|CHA|3|Insightful}}"]

    def test_choice_wrapper_drops_its_control_parameters(self) -> None:
        assert split_enchantment_entry(
            "{{Nearly Finished|{{Augment|Purple}}|and=true}}"
        ) == ["{{Augment|Purple}}"]

    def test_a_maintenance_only_entry_yields_nothing(self) -> None:
        """{{bug}} is a known-issue marker — it must produce no row at all."""
        assert split_enchantment_entry("{{bug|broken on live}}") == []
        assert split_enchantment_entry("{{Bug|broken on live}}") == []

    def test_a_formatting_wrapper_yields_its_content(self) -> None:
        assert split_enchantment_entry(
            "{{InlineWht|dark=y|+15% Legendary bonus to Universal Spell Critical Damage}}"
        ) == ["+15% Legendary bonus to Universal Spell Critical Damage"]

    def test_plain_text_passes_through(self) -> None:
        assert split_enchantment_entry("Adds 1d6 Fire damage") == ["Adds 1d6 Fire damage"]

    def test_an_empty_entry_yields_nothing(self) -> None:
        assert split_enchantment_entry("   ") == []

    def test_a_maintenance_note_is_stripped_from_a_real_entry(self) -> None:
        assert split_enchantment_entry(
            "{{Protection|8}} {{Bug|description is wrong|M=1}}"
        ) == ["{{Protection|8}}"]


class TestFormatBonusDescription:
    """Formatter-template bonuses get their description built from structure."""

    def test_stat_value_and_bonus_type(self) -> None:
        assert format_bonus_description("Wisdom", 14, "Enhancement") == (
            "+14 Enhancement bonus to Wisdom"
        )

    def test_negative_value_reads_as_a_penalty(self) -> None:
        assert format_bonus_description("Hide", -6, "Enhancement") == (
            "-6 Enhancement penalty to Hide"
        )

    def test_missing_bonus_type_omits_the_type_word(self) -> None:
        assert format_bonus_description("Seeker", 3, None) == "+3 bonus to Seeker"

    def test_no_value_returns_none(self) -> None:
        assert format_bonus_description("Deception", None, "Enhancement") is None

    def test_no_stat_returns_none(self) -> None:
        assert format_bonus_description(None, 5, "Enhancement") is None
