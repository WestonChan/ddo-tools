"""Hand-maintained list of DDO raid quest names.

STOPGAP. The authoritative source of raid-ness is the wiki's
``Category:Raid_loot``, which ``wiki/scraper.py`` already walks and now
records as ``quest_loot.loot_type``. But ddowiki.com sits behind an AWS WAF
JavaScript challenge that blocks every non-browser client (see
docs/ddowiki-api.md), so the scrape cannot currently run. Until it can, this
list lets ``backfill_quest_loot_types`` populate the column offline.

Delete this module — and the backfill that consumes it — once a real scrape
has populated ``loot_type``.

Names must match ``quests.name`` EXACTLY; the backfill matches with equality
and silently skips misses. Traps that have already bitten:

- The leading article: the DB has ``The Master Artificer``, not
  ``Master Artificer`` (that one omission hid 43 items).
- Quest name vs. boss name: the raid is ``The Vault of Night``; ``Velah, the
  Crimson Dragon`` is the dragon inside it and matches nothing.
- Raid vs. story arc: ``Reign of Madness`` sat on the original list but is a
  quest chain, not a raid — it wrongly tagged 7 items until removed.

Legendary re-releases are separate quest rows with their own loot tables, so
they need their own entries alongside the heroic originals.

RECONCILED 2026-07-25 against the wiki's ``Raids`` page (41 raids) and
``Category:Raid_loot`` (26 subcategories) — the WAF challenge blocks
non-browser clients, but a real browser passes via top-level navigation, so
the comparison was done by hand in one. Findings folded in below; the raids
listed on the wiki but absent here-and-everywhere in ``quests`` are
``Threats Old and New`` and ``Den of Vipers`` (present at the bottom so a
future scrape that creates those quests tags them automatically).

Cross-checked per-expansion the same day ("every expansion has 1-2 raids"):
each expansion page's own "Raid:" line matches this list. Expansions with
genuinely NO raid, verified on their wiki pages: Shadowfell Conspiracy and
Sinister Secret of Saltmarsh. Newer quest packs (Fall of the Night Brigade,
The Soul Splitter, Grip of the Hidden Hand) are packs, not expansions, and
have none. Current through Update 75 / The Chill of Ravenloft (raid:
Relentless, released 2025-11-06).
"""

from __future__ import annotations

KNOWN_RAID_QUESTS: tuple[str, ...] = (
    # Heroic raids
    "Tempest's Spine",
    "The Vault of Night",
    "The Twilight Forge",
    "Plane of Night",
    "The Titan Awakes",
    "Ascension Chamber",
    "A Vision of Destruction",
    "The Reaver's Fate",
    "Zawabi's Revenge",
    "The Shroud",
    # The Shroud's Green Steel altar. Not a quest, but the wiki categorizes
    # its 93 crafting items under Raid_loot, and they are raid-acquired.
    "Altar of Fecundity",
    "Hound of Xoriat",
    "The Chronoscope",
    "Tower of Despair",
    "The Mark of Death",
    # Epic raids
    "The Lord of Blades",
    "The Master Artificer",
    "Caught in the Web",
    "The Fall of Truth",
    "Defiler of the Just",
    "Killing Time",
    "Riding the Storm Out",
    # Legendary / modern raids
    "Fire on Thunder Peak",
    "Temple of the Deathwyrm",
    "Project Nemesis",
    "Old Baba's Hut",
    "Skeletons in the Closet",
    "Too Hot to Handle",
    "The Curse of Strahd",
    "The Dryad and the Demigod",
    "The Codex and the Shroud",
    "Hunt or Be Hunted",
    "Fire Over Morgrave",
    "Relentless",
    "Legendary Tempest's Spine",
    "Legendary Hound of Xoriat",
    "Legendary Lord of Blades",
    "Legendary Master Artificer",
    "Legendary Vision of Destruction",
    "The Chronoscope (Legendary)",
    # On the wiki's Raids page but with no quests row in the DB yet — kept so
    # a future scrape that creates them gets tagged with no further edit.
    "Threats Old and New",
    "Den of Vipers",
)
