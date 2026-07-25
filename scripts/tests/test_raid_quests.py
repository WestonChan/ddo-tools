"""Reconcile KNOWN_RAID_QUESTS against the shipped database.

The raid list is hand-maintained and matched against ``quests.name`` with
exact equality; a wrong entry is skipped silently by the backfill. That
failure mode has already shipped bugs three times (a missing "The" hid 43
items; five dead entries hid 262). The frontend's raidLoot.test.ts guards an
11-name sample — this test covers the ENTIRE tuple, so any typo in any entry
fails loudly against the exact artifact the site serves.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from ddo_data.game_data.raid_quests import KNOWN_RAID_QUESTS

_DB_PATH = Path(__file__).resolve().parents[2] / "public" / "data" / "ddo.db"

# Raids that are on the wiki's Raids page but have no quests row in the DB
# yet (no loot was ever scraped for them). They stay in KNOWN_RAID_QUESTS so
# a future scrape that creates the rows tags them automatically; the backfill
# skips them silently until then. If one of these starts matching, remove it
# from this set so the main assertion covers it.
_KNOWN_ABSENT: frozenset[str] = frozenset({
    "Threats Old and New",
    "Den of Vipers",
})


@pytest.fixture(scope="module")
def quest_names() -> frozenset[str]:
    if not _DB_PATH.exists():
        pytest.skip(f"shipped database not present at {_DB_PATH}")
    uri = f"file:{_DB_PATH}?mode=ro"
    with sqlite3.connect(uri, uri=True) as conn:
        rows = conn.execute("SELECT name FROM quests").fetchall()
    return frozenset(name for (name,) in rows)


def test_every_raid_name_resolves_against_shipped_db(
    quest_names: frozenset[str],
) -> None:
    unmatched = [
        name
        for name in KNOWN_RAID_QUESTS
        if name not in quest_names and name not in _KNOWN_ABSENT
    ]
    assert unmatched == [], (
        "KNOWN_RAID_QUESTS entries matching no quests.name row (typo, or the "
        "quest was renamed): "
        f"{unmatched}. Fix the name in raid_quests.py — the backfill skips "
        "misses silently, so every entry here is items missing their raid tag."
    )


def test_known_absent_raids_are_still_absent(quest_names: frozenset[str]) -> None:
    now_present = sorted(_KNOWN_ABSENT & quest_names)
    assert now_present == [], (
        f"{now_present} now exist in quests — remove them from _KNOWN_ABSENT "
        "so the main reconciliation covers them, and re-run the loot_type "
        "backfill so their items get tagged."
    )


def test_no_duplicate_raid_entries() -> None:
    assert len(set(KNOWN_RAID_QUESTS)) == len(KNOWN_RAID_QUESTS)
