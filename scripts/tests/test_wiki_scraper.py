"""Tests for the DDO Wiki scraper orchestration."""

from unittest.mock import MagicMock

from ddo_data.enums import LootType
from ddo_data.wiki.scraper import (
    _QUEST_LOOT_SOURCES,
    collect_enhancements,
    collect_feats,
    collect_items,
    collect_quest_loot,
)


ITEM_WIKITEXT = """
{{Named item|Weapon
|name = Test Sword
|minlevel = 10
|damage = 1[1d8]+5
}}
"""

REDIRECT_WIKITEXT = "#REDIRECT [[Item:Other Page]]"

FEAT_WIKITEXT = """
{{Feat
|name=Cleave
|icon=Icon_Feat_Cleave.png
|cooldown=5 seconds
|prerequisite=[[Power Attack]]
|description=Attack enemies in an arc.
|free=no
|active=yes
|fighter bonus feat=yes
}}
"""


# ---------------------------------------------------------------------------
# collect_items tests
# ---------------------------------------------------------------------------


def test_collect_items_basic() -> None:
    """collect_items returns parsed item dicts."""
    client = MagicMock()
    client.iter_namespace_pages.return_value = iter(["Item:Test_Sword"])
    client.get_wikitext.return_value = ITEM_WIKITEXT

    items = collect_items(client, limit=1)

    assert len(items) == 1
    assert items[0]["name"] == "Test Sword"
    assert items[0]["minimum_level"] == 10


def test_collect_items_skips_redirects() -> None:
    """Redirect pages are skipped."""
    client = MagicMock()
    client.iter_namespace_pages.return_value = iter([
        "Item:Redirect_Page",
        "Item:Real_Item",
    ])
    client.get_wikitext.side_effect = [REDIRECT_WIKITEXT, ITEM_WIKITEXT]

    items = collect_items(client)

    assert len(items) == 1


def test_collect_items_skips_missing_pages() -> None:
    """Pages that return None wikitext are skipped."""
    client = MagicMock()
    client.iter_namespace_pages.return_value = iter(["Item:Missing"])
    client.get_wikitext.return_value = None

    items = collect_items(client)

    assert items == []


def test_collect_items_fallback_name() -> None:
    """Page title used as fallback when parser returns no name."""
    wikitext = "{{Named item|minlevel=5}}"
    client = MagicMock()
    client.iter_namespace_pages.return_value = iter(["Item:Cool_Blade"])
    client.get_wikitext.return_value = wikitext

    items = collect_items(client)

    assert len(items) == 1
    assert items[0]["name"] == "Cool Blade"


def test_collect_items_progress_callback() -> None:
    """Progress callback fires at 100-page intervals."""
    titles = [f"Item:Item_{i}" for i in range(150)]
    client = MagicMock()
    client.iter_namespace_pages.return_value = iter(titles)
    client.get_wikitext.return_value = ITEM_WIKITEXT

    progress_messages: list[str] = []
    collect_items(client, on_progress=progress_messages.append)

    assert len(progress_messages) == 1
    assert "100 pages processed" in progress_messages[0]


# ---------------------------------------------------------------------------
# collect_feats tests
# ---------------------------------------------------------------------------


def test_collect_feats_basic() -> None:
    """collect_feats returns parsed feat dicts."""
    client = MagicMock()
    client.iter_category_members.return_value = iter(["Cleave"])
    client.get_wikitext.return_value = FEAT_WIKITEXT

    feats = collect_feats(client, limit=1)

    assert len(feats) == 1
    assert feats[0]["name"] == "Cleave"
    assert feats[0]["active"] is True


def test_collect_feats_skips_redirects() -> None:
    """Redirect pages are skipped."""
    client = MagicMock()
    client.iter_category_members.return_value = iter([
        "Old_Feat_Name",
        "Cleave",
    ])
    client.get_wikitext.side_effect = [REDIRECT_WIKITEXT, FEAT_WIKITEXT]

    feats = collect_feats(client)

    assert len(feats) == 1


def test_collect_feats_skips_overview_pages() -> None:
    """Overview pages like 'Feat' and 'Feats' are skipped."""
    client = MagicMock()
    client.iter_category_members.return_value = iter([
        "Feat",
        "Feats",
        "Feat tree",
        "Feats/Active",
        "Cleave",
    ])
    client.get_wikitext.return_value = FEAT_WIKITEXT

    feats = collect_feats(client)

    assert len(feats) == 1
    assert client.get_wikitext.call_count == 1


def test_collect_feats_fallback_name() -> None:
    """Page title used as fallback when parser returns no name."""
    wikitext = "{{Feat|active=yes}}"
    client = MagicMock()
    client.iter_category_members.return_value = iter(["Power_Attack"])
    client.get_wikitext.return_value = wikitext

    feats = collect_feats(client)

    assert len(feats) == 1
    assert feats[0]["name"] == "Power Attack"


def test_collect_feats_missing_page() -> None:
    """Pages returning None wikitext are skipped."""
    client = MagicMock()
    client.iter_category_members.return_value = iter(["Missing_Feat"])
    client.get_wikitext.return_value = None

    feats = collect_feats(client)

    assert feats == []


# ---------------------------------------------------------------------------
# collect_enhancements tests
# ---------------------------------------------------------------------------

CLASS_INDEX = """
* '''[[Fighter]]'''
** Enhancements: [[Kensei enhancements|Kensei]]
"""

TREE_WIKITEXT = """
== Core abilities ==
{{Enhancement table/item
  | image=FighterPassiveIcon.png
  | name=Kensei Focus
  | description=Select weapons.
  | ranks=1
  | level=1
  | ap=1
  | pg=0
  | prereq=Fighter Level 1
  | ldescription=true
  | lprereq=true
}}
== Tier One ==
{{Enhancement table/item
  | image=Icon.png
  | name=Extra Action Boost
  | description=Extra boost.
  | ranks=3
  | level=
  | ap=2
  | pg=5
  | prereq=
  | ldescription=true
  | lprereq=true
}}
"""

UNIVERSAL_INDEX = """
* '''[[Harper Agent]]'''
"""

RACIAL_INDEX = """
* '''[[Elf]]'''
** Enhancements: [[Elf enhancements|Elf]]
"""


def _make_enhancement_client(
    index_pages: dict[str, str],
    tree_pages: dict[str, str | None],
) -> MagicMock:
    """Build a mock WikiClient that returns specific pages."""
    client = MagicMock()

    def get_wikitext(title: str) -> str | None:
        if title in index_pages:
            return index_pages[title]
        if title in tree_pages:
            return tree_pages[title]
        return None

    client.get_wikitext.side_effect = get_wikitext
    return client


def test_collect_enhancements_basic() -> None:
    """collect_enhancements returns parsed tree dicts."""
    client = _make_enhancement_client(
        index_pages={
            "Class enhancements": CLASS_INDEX,
            "Racial enhancements": "",
            "Universal enhancements": "",
        },
        tree_pages={"Kensei enhancements": TREE_WIKITEXT},
    )

    trees = collect_enhancements(client)

    assert len(trees) == 1
    assert trees[0]["name"] == "Kensei"
    assert trees[0]["type"] == "class"
    assert trees[0]["class_or_race"] == "Fighter"
    assert len(trees[0]["enhancements"]) == 2


def test_collect_enhancements_resolves_redirects() -> None:
    """Redirect tree pages are resolved and the target is parsed."""
    client = _make_enhancement_client(
        index_pages={
            "Class enhancements": CLASS_INDEX,
            "Racial enhancements": "",
            "Universal enhancements": "",
        },
        tree_pages={
            "Kensei enhancements": "#REDIRECT [[Kensei tree enhancements]]",
            "Kensei tree enhancements": TREE_WIKITEXT,
        },
    )

    trees = collect_enhancements(client)

    assert len(trees) == 1
    assert trees[0]["name"] == "Kensei tree"


def test_collect_enhancements_tree_metadata() -> None:
    """Tree type and class_or_race propagate from index pages."""
    racial_tree = """
== Core abilities ==
{{Enhancement table/item
  | image=Icon.png
  | name=Elven Accuracy
  | description=Accuracy bonus.
  | ranks=1
  | level=1
  | ap=1
  | pg=0
  | prereq=Elf
  | ldescription=true
  | lprereq=true
}}
"""
    client = _make_enhancement_client(
        index_pages={
            "Class enhancements": "",
            "Racial enhancements": RACIAL_INDEX,
            "Universal enhancements": "",
        },
        tree_pages={"Elf enhancements": racial_tree},
    )

    trees = collect_enhancements(client)

    assert len(trees) == 1
    assert trees[0]["type"] == "racial"
    assert trees[0]["class_or_race"] == "Elf"


def test_collect_enhancements_limit() -> None:
    """Limit parameter caps the number of trees fetched."""
    two_trees = """
* '''[[Fighter]]'''
** Enhancements: [[Kensei enhancements|Kensei]], [[Stalwart enhancements|Stalwart]]
"""
    client = _make_enhancement_client(
        index_pages={
            "Class enhancements": two_trees,
            "Racial enhancements": "",
            "Universal enhancements": "",
        },
        tree_pages={
            "Kensei enhancements": TREE_WIKITEXT,
            "Stalwart enhancements": TREE_WIKITEXT,
        },
    )

    trees = collect_enhancements(client, limit=1)

    assert len(trees) == 1


def test_collect_enhancements_missing_page() -> None:
    """Tree pages returning None wikitext are skipped."""
    client = _make_enhancement_client(
        index_pages={
            "Class enhancements": CLASS_INDEX,
            "Racial enhancements": "",
            "Universal enhancements": "",
        },
        tree_pages={"Kensei enhancements": None},
    )

    trees = collect_enhancements(client)

    assert trees == []


def test_collect_enhancements_shared_tree() -> None:
    """Shared trees (same page_title) are deduplicated."""
    shared_index = """
* '''[[Fighter]]'''
** Enhancements: [[Vanguard enhancements|Vanguard]]
* '''[[Paladin]]'''
** Enhancements: [[Vanguard enhancements|Vanguard]]
"""
    client = _make_enhancement_client(
        index_pages={
            "Class enhancements": shared_index,
            "Racial enhancements": "",
            "Universal enhancements": "",
        },
        tree_pages={"Vanguard enhancements": TREE_WIKITEXT},
    )

    trees = collect_enhancements(client)

    assert len(trees) == 1
    assert trees[0]["name"] == "Vanguard"


# ---------------------------------------------------------------------------
# collect_quest_loot tests
# ---------------------------------------------------------------------------


def _make_quest_loot_client(tree: dict[str, list[str]]) -> MagicMock:
    """Fake client whose iter_category_members walks a canned category tree.

    tree maps a category name to its members; subcategory lookups and page
    lookups both read from it, matching how collect_quest_loot walks parents
    then their subcategories.
    """
    client = MagicMock()

    def _iter(category: str, **kwargs: object) -> iter:
        return iter(tree.get(category, []))

    client.iter_category_members.side_effect = _iter
    return client


def test_quest_loot_sources_cover_every_loot_type() -> None:
    """Each LootType has exactly one wiki category feeding it."""
    declared = [entry[2] for entry in _QUEST_LOOT_SOURCES]
    assert set(declared) == set(LootType)
    assert len(declared) == len(set(declared))


def test_quest_loot_sources_put_raid_last() -> None:
    """Raid must be walked last so INSERT OR REPLACE lets it win.

    An item in both Chest_loot and Raid_loot should end up tagged 'raid';
    that depends entirely on ordering here.
    """
    assert _QUEST_LOOT_SOURCES[-1][2] is LootType.RAID


def test_collect_quest_loot_tags_chest_loot() -> None:
    """Items from a Chest_loot subcategory carry loot_type='chest'."""
    client = _make_quest_loot_client({
        "Chest_loot": ["Category:Haywire Foundry loot"],
        "Haywire Foundry loot": ["Item:Bloodrage Symbiont"],
    })

    entries = collect_quest_loot(client)

    assert entries == [{
        "quest_name": "Haywire Foundry",
        "item_name": "Bloodrage Symbiont",
        "loot_type": "chest",
    }]


def test_collect_quest_loot_tags_raid_loot() -> None:
    """Items from a Raid_loot subcategory carry loot_type='raid'.

    This is the whole point: the parent category was previously discarded,
    so nothing downstream could tell raid loot from chest loot.
    """
    client = _make_quest_loot_client({
        "Raid_loot": ["Category:The Master Artificer loot"],
        "The Master Artificer loot": ["Item:Epic Nightmare"],
    })

    entries = collect_quest_loot(client)

    assert entries == [{
        "quest_name": "The Master Artificer",
        "item_name": "Epic Nightmare",
        "loot_type": "raid",
    }]


def test_collect_quest_loot_strips_reward_suffix() -> None:
    """Quest_rewards subcategories use a different suffix than loot ones."""
    client = _make_quest_loot_client({
        "Quest_rewards": ["Category:Sealed in Amber reward items"],
        "Sealed in Amber reward items": ["Item:Amber Shard"],
    })

    entries = collect_quest_loot(client)

    assert entries[0]["quest_name"] == "Sealed in Amber"
    assert entries[0]["loot_type"] == "reward"


def test_collect_quest_loot_strips_any_known_suffix_regardless_of_parent() -> None:
    """Subcategory suffixes don't always match their parent's convention.

    Real case: `Category:The Chronoscope reward items` sits under Raid_loot,
    whose configured suffix is " loot". Stripping only the parent's suffix
    left the raw title as the quest name, which auto-created a bogus quest
    row ("The Chronoscope reward items", 8 loot rows) in the shipped DB.
    """
    client = _make_quest_loot_client({
        "Raid_loot": ["Category:The Chronoscope reward items"],
        "The Chronoscope reward items": ["Item:Bloody Cleaver"],
    })

    entries = collect_quest_loot(client)

    assert entries == [{
        "quest_name": "The Chronoscope",
        "item_name": "Bloody Cleaver",
        "loot_type": "raid",
    }]


def test_collect_quest_loot_emits_both_types_for_shared_item() -> None:
    """A quest listed under both parents yields one entry per category.

    Deduplication and precedence are the writer's job (INSERT OR REPLACE),
    not the scraper's — so both rows must reach it, raid last.
    """
    client = _make_quest_loot_client({
        "Chest_loot": ["Category:The Shroud loot"],
        "Raid_loot": ["Category:The Shroud loot"],
        "The Shroud loot": ["Item:Shard of Great Power"],
    })

    entries = collect_quest_loot(client)

    assert [e["loot_type"] for e in entries] == ["chest", "raid"]
    assert {e["quest_name"] for e in entries} == {"The Shroud"}


# ---------------------------------------------------------------------------
# collect_unique_enchantments tests
# ---------------------------------------------------------------------------

UNIQUE_ENCHANTMENT_WIKITEXT = """
{{Unique enchantment
|name  = Deception
|found = {{Counted dot list|category=Deception items|namespace=Item}}
|effect = +4 [[enhancement bonus]] to hit and +4 to damage for any hit that
would qualify as a [[sneak attack]].
}}
[[Category:Unique item enchantments]]
"""

TWO_ENCHANTMENTS_WIKITEXT = """
{{Unique enchantment
  | name   = Vile Grip
  | effect = Small chance to deal massive evil damage.
}}
{{Unique enchantment
  | name   = Legendary Vile Grip
  | effect = Small chance to deal even more massive evil damage.
}}
"""

EMPTY_EFFECT_WIKITEXT = """
{{Unique enchantment
|name=Blinding Fear
|found=
|effect=
|note=
}}
"""


def _cache_client(pages: dict[str, str]) -> MagicMock:
    client = MagicMock()
    client.iter_cached_pages.return_value = list(pages.items())
    return client


def test_collect_unique_enchantments_reads_effect_text() -> None:
    from ddo_data.wiki.scraper import collect_unique_enchantments

    client = _cache_client({"Deception": UNIQUE_ENCHANTMENT_WIKITEXT})
    results = collect_unique_enchantments(client)

    assert len(results) == 1
    assert results[0]["name"] == "Deception"
    assert "sneak attack" in results[0]["effect"]
    assert results[0]["wiki_url"] == "https://ddowiki.com/page/Deception"


def test_collect_unique_enchantments_handles_two_on_one_page() -> None:
    """A page often defines both the base and the Legendary version."""
    from ddo_data.wiki.scraper import collect_unique_enchantments

    client = _cache_client({"Vile Grip": TWO_ENCHANTMENTS_WIKITEXT})
    names = [r["name"] for r in collect_unique_enchantments(client)]

    assert names == ["Vile Grip", "Legendary Vile Grip"]


def test_collect_unique_enchantments_empty_effect_stays_none() -> None:
    """An empty `effect =` field must be NULL, not the empty string."""
    from ddo_data.wiki.scraper import collect_unique_enchantments

    client = _cache_client({"Blinding Fear": EMPTY_EFFECT_WIKITEXT})
    results = collect_unique_enchantments(client)

    assert results[0]["effect"] is None


def test_collect_unique_enchantments_ignores_other_pages() -> None:
    from ddo_data.wiki.scraper import collect_unique_enchantments

    client = _cache_client({"Item:Celestia": ITEM_WIKITEXT})
    assert collect_unique_enchantments(client) == []


def test_collect_unique_enchantments_deduplicates_by_name() -> None:
    from ddo_data.wiki.scraper import collect_unique_enchantments

    client = _cache_client({
        "Deception": UNIQUE_ENCHANTMENT_WIKITEXT,
        "Deception (historic)": UNIQUE_ENCHANTMENT_WIKITEXT,
    })
    assert len(collect_unique_enchantments(client)) == 1


# ---------------------------------------------------------------------------
# collect_rare_loot_names tests
# ---------------------------------------------------------------------------


def test_collect_rare_loot_names_unions_both_sources() -> None:
    from ddo_data.wiki.scraper import collect_rare_loot_names

    client = MagicMock()
    client.iter_category_members.return_value = iter([
        "Item:Buckle of Secrets", "Item:Crisis Claw",
    ])
    names = collect_rare_loot_names(
        client,
        scraped_items=[
            {"name": "Argonnessen Eye Band", "rare": True},
            {"name": "Plain Boot", "rare": False},
        ],
    )

    assert names == ["Argonnessen Eye Band", "Buckle of Secrets", "Crisis Claw"]


def test_collect_rare_loot_names_falls_back_to_the_captured_list() -> None:
    """With the category unreachable the browser-captured list stands in."""
    from ddo_data.wiki.rare_loot_items import RARE_LOOT_ITEMS
    from ddo_data.wiki.scraper import collect_rare_loot_names

    client = MagicMock()
    client.iter_category_members.return_value = iter([])
    names = collect_rare_loot_names(client, scraped_items=[])

    assert set(names) == set(RARE_LOOT_ITEMS)


def test_collect_rare_loot_names_reports_the_reconciliation() -> None:
    from ddo_data.wiki.scraper import collect_rare_loot_names

    client = MagicMock()
    client.iter_category_members.return_value = iter(["Item:Crisis Claw"])
    messages: list[str] = []
    collect_rare_loot_names(
        client,
        scraped_items=[{"name": "Crisis Claw", "rare": True}],
        on_progress=messages.append,
    )

    assert any("1 in both" in m for m in messages), messages
