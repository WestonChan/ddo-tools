"""Property key name mapping via wiki cross-reference.

Cross-references wiki item data (human-readable field names and values) with
decoded gamelogic entries (numeric property key-value pairs) to discover
mappings like 0x10000042 = minimum_level.

The matching pipeline:
  1. Load wiki items (from items.json, produced by `ddo-data scrape`)
  2. Load string table (from client_local_English.dat)
  3. Scan gamelogic entries (from client_gamelogic.dat)
  4. Match: connect entries to wiki items via 0x0AXXXXXX string table refs
  5. Correlate: find property keys whose values match wiki field values
"""

from __future__ import annotations

import json
import logging
import struct
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from .archive import DatArchive, FileEntry
from .extract import read_entry_data, scan_file_table
from .probe import DecodedProperty, decode_type2, parse_entry_header
from .strings import load_string_table

logger = logging.getLogger(__name__)

# Wiki fields to correlate against property key values.
# Numeric fields: compared directly as int.
_NUMERIC_FIELDS = [
    "minimum_level",
    "enhancement_bonus",
    "durability",
    "hardness",
    "armor_bonus",
    "max_dex_bonus",
]

# String fields: property value is a 0x0AXXXXXX string ref, resolved via
# the string table and compared to the wiki field text.
_STRING_FIELDS = [
    "weapon_type",
    "proficiency",
    "material",
    "binding",
]

_MAX_SAMPLE_VALUES = 5


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class NamedEntry:
    """A gamelogic entry matched to its wiki item data."""

    file_id: int
    name: str
    wiki_fields: dict[str, int | float | str]
    properties: list[DecodedProperty]


@dataclass
class KeyMapping:
    """A discovered mapping from property key to human-readable name."""

    key: int
    """Property key, e.g. 0x10000042."""

    name: str
    """Human-readable field name, e.g. 'minimum_level'."""

    confidence: float
    """Fraction of matched entries where the value agreed."""

    match_count: int
    """Number of entries that contributed to this mapping."""

    sample_values: list[int] = field(default_factory=list)
    """A few example values observed for this key."""


@dataclass
class NameMapResult:
    """Results of the property name mapping process."""

    matched_entries: int = 0
    """Wiki items successfully matched to gamelogic entries."""

    unmatched_wiki: int = 0
    """Wiki items not found in the string table / gamelogic."""

    mappings: list[KeyMapping] = field(default_factory=list)
    """Discovered key-to-name mappings, sorted by confidence."""

    unmapped_keys: list[int] = field(default_factory=list)
    """High-frequency keys with no wiki field match."""


# ---------------------------------------------------------------------------
# Name normalization
# ---------------------------------------------------------------------------


def _normalize_name(name: str) -> str:
    """Normalize an item name for fuzzy matching."""
    return name.strip().replace("_", " ").lower()


# ---------------------------------------------------------------------------
# Step 1: Match wiki items to gamelogic entries
# ---------------------------------------------------------------------------


def match_wiki_to_entries(
    wiki_items: list[dict],
    string_table: dict[int, str],
    archive: DatArchive,
    entries: dict[int, FileEntry],
) -> tuple[list[NamedEntry], int]:
    """Match wiki items to gamelogic entries via string table cross-reference.

    For each type-2 entry, parses the header and checks if any 0x0AXXXXXX
    file_id resolves to a wiki item name in the string table.

    Returns (matched_entries, unmatched_wiki_count).
    """
    # Build reverse lookups
    wiki_by_name: dict[str, dict] = {}
    for item in wiki_items:
        name = item.get("name")
        if name:
            wiki_by_name[_normalize_name(name)] = item

    string_to_id: dict[str, int] = {
        _normalize_name(text): file_id
        for file_id, text in string_table.items()
    }

    # Find which string table IDs correspond to wiki item names
    name_to_string_id: dict[str, int] = {}
    for norm_name in wiki_by_name:
        if norm_name in string_to_id:
            name_to_string_id[norm_name] = string_to_id[norm_name]

    # Build reverse: string_id → normalized wiki name
    string_id_to_name: dict[int, str] = {
        sid: name for name, sid in name_to_string_id.items()
    }

    matched: list[NamedEntry] = []

    for file_id, entry in entries.items():
        try:
            data = read_entry_data(archive, entry)
        except (ValueError, OSError):
            continue

        if len(data) < 5:
            continue

        # Only process type-2 entries (DID == 2)
        did = struct.unpack_from("<I", data, 0)[0]
        if did != 2:
            continue

        header = parse_entry_header(data)

        # Check if any header file_id is a string ref matching a wiki item
        matched_name = None
        for ref_id in header.file_ids:
            if ref_id in string_id_to_name:
                matched_name = string_id_to_name[ref_id]
                break

        if matched_name is None:
            continue

        # Decode properties (skip complex-partial entries)
        decoded = decode_type2(data)
        if decoded.variant == "complex-partial" or not decoded.properties:
            continue

        wiki_item = wiki_by_name[matched_name]
        named = NamedEntry(
            file_id=file_id,
            name=wiki_item.get("name", matched_name),
            wiki_fields={
                k: v for k, v in wiki_item.items()
                if v is not None and k != "name"
            },
            properties=decoded.properties,
        )
        matched.append(named)

    unmatched = len(wiki_by_name) - len({e.name.strip().lower() for e in matched})
    return matched, unmatched


# ---------------------------------------------------------------------------
# Step 2: Correlate property keys to field names
# ---------------------------------------------------------------------------


def correlate_keys(
    named_entries: list[NamedEntry],
    string_table: dict[int, str] | None = None,
    *,
    min_confidence: float = 0.8,
    min_matches: int = 5,
) -> list[KeyMapping]:
    """Find property keys that consistently match wiki field values.

    For numeric wiki fields, checks if a property key's scalar value equals
    the expected wiki value. For string fields, resolves 0x0AXXXXXX property
    values via the string table and compares to wiki text.

    Returns mappings sorted by confidence (descending).
    """
    mappings: list[KeyMapping] = []
    claimed_keys: set[int] = set()

    # --- Numeric fields ---
    for field_name in _NUMERIC_FIELDS:
        # For each property key, collect (actual_value, expected_value) pairs
        candidates: dict[int, list[tuple[int, int]]] = defaultdict(list)

        for entry in named_entries:
            expected = entry.wiki_fields.get(field_name)
            if expected is None or not isinstance(expected, (int, float)):
                continue
            expected_int = int(expected)

            for prop in entry.properties:
                if prop.is_array:
                    continue
                candidates[prop.key].append((prop.value, expected_int))

        # Score each candidate
        best_key = None
        best_confidence = 0.0
        best_count = 0
        best_values: list[int] = []

        for key, pairs in candidates.items():
            if key in claimed_keys:
                continue
            matches = sum(1 for actual, exp in pairs if actual == exp)
            total = len(pairs)
            if matches < min_matches:
                continue
            confidence = matches / total
            if confidence >= min_confidence and confidence > best_confidence:
                best_key = key
                best_confidence = confidence
                best_count = matches
                best_values = sorted({exp for actual, exp in pairs if actual == exp})[:_MAX_SAMPLE_VALUES]

        if best_key is not None:
            mappings.append(KeyMapping(
                key=best_key,
                name=field_name,
                confidence=best_confidence,
                match_count=best_count,
                sample_values=best_values[:_MAX_SAMPLE_VALUES],
            ))
            claimed_keys.add(best_key)

    # --- String fields ---
    if string_table:
        for field_name in _STRING_FIELDS:
            str_candidates: dict[int, list[tuple[str, str]]] = defaultdict(list)

            for entry in named_entries:
                expected_text = entry.wiki_fields.get(field_name)
                if not expected_text or not isinstance(expected_text, str):
                    continue
                norm_expected = _normalize_name(expected_text)

                for prop in entry.properties:
                    if prop.is_array:
                        continue
                    # Check if value looks like a string ref (0x0AXXXXXX)
                    if isinstance(prop.value, int) and (prop.value >> 24) & 0xFF == 0x0A:
                        resolved = string_table.get(prop.value)
                        if resolved:
                            str_candidates[prop.key].append((
                                _normalize_name(resolved),
                                norm_expected,
                            ))

            best_key = None
            best_confidence = 0.0
            best_count = 0

            for key, pairs in str_candidates.items():
                if key in claimed_keys:
                    continue
                matches = sum(1 for actual, exp in pairs if actual == exp)
                total = len(pairs)
                if matches < min_matches:
                    continue
                confidence = matches / total
                if confidence >= min_confidence and confidence > best_confidence:
                    best_key = key
                    best_confidence = confidence
                    best_count = matches

            if best_key is not None:
                mappings.append(KeyMapping(
                    key=best_key,
                    name=field_name,
                    confidence=best_confidence,
                    match_count=best_count,
                    sample_values=[],
                ))
                claimed_keys.add(best_key)

    mappings.sort(key=lambda m: (-m.confidence, -m.match_count))
    return mappings


# ---------------------------------------------------------------------------
# Step 3: Orchestration
# ---------------------------------------------------------------------------


def build_name_map(
    ddo_path: Path,
    wiki_items_path: Path,
    *,
    on_progress: Callable[[str], None] | None = None,
) -> NameMapResult:
    """Run the full name mapping pipeline.

    Args:
        ddo_path: DDO installation directory containing .dat files.
        wiki_items_path: Path to items.json from wiki scraper.
        on_progress: Optional callback for status messages.

    Returns:
        NameMapResult with discovered mappings.
    """
    result = NameMapResult()

    # Load wiki items
    with open(wiki_items_path) as f:
        wiki_items = json.load(f)
    if on_progress:
        on_progress(f"Loaded {len(wiki_items)} wiki items")

    # Load string table from English archive
    english_path = ddo_path / "client_local_English.dat"
    if not english_path.exists():
        logger.error("English archive not found: %s", english_path)
        return result

    if on_progress:
        on_progress("Loading string table from client_local_English.dat...")
    english_archive = DatArchive(english_path)
    english_archive.read_header()
    string_table = load_string_table(english_archive)
    if on_progress:
        on_progress(f"  {len(string_table):,} strings loaded")

    # Scan gamelogic entries
    gamelogic_path = ddo_path / "client_gamelogic.dat"
    if not gamelogic_path.exists():
        logger.error("Gamelogic archive not found: %s", gamelogic_path)
        return result

    if on_progress:
        on_progress("Scanning gamelogic entries...")
    gamelogic_archive = DatArchive(gamelogic_path)
    gamelogic_archive.read_header()
    entries = scan_file_table(gamelogic_archive)
    if on_progress:
        on_progress(f"  {len(entries):,} entries scanned")

    # Match wiki items to gamelogic entries
    if on_progress:
        on_progress("Matching wiki items to gamelogic entries...")
    matched, unmatched = match_wiki_to_entries(
        wiki_items, string_table, gamelogic_archive, entries,
    )
    result.matched_entries = len(matched)
    result.unmatched_wiki = unmatched
    if on_progress:
        on_progress(f"  {len(matched)} matched, {unmatched} unmatched")

    if not matched:
        return result

    # Correlate property keys
    if on_progress:
        on_progress("Correlating property keys...")
    result.mappings = correlate_keys(matched, string_table)
    if on_progress:
        on_progress(f"  {len(result.mappings)} mappings discovered")

    # Collect unmapped high-frequency keys
    mapped_keys = {m.key for m in result.mappings}
    key_freq: dict[int, int] = defaultdict(int)
    for entry in matched:
        for prop in entry.properties:
            if not prop.is_array and prop.key not in mapped_keys:
                key_freq[prop.key] += 1
    result.unmapped_keys = sorted(
        key_freq, key=lambda k: -key_freq[k],
    )[:20]

    return result


# ---------------------------------------------------------------------------
# Formatters
# ---------------------------------------------------------------------------


def format_name_map(result: NameMapResult) -> str:
    """Format name map results as human-readable text."""
    lines: list[str] = []
    lines.append(f"Matched entries: {result.matched_entries}")
    lines.append(f"Unmatched wiki items: {result.unmatched_wiki}")
    lines.append("")

    if result.mappings:
        lines.append(f"Discovered mappings ({len(result.mappings)}):")
        lines.append("-" * 60)
        for m in result.mappings:
            vals = ", ".join(str(v) for v in m.sample_values) if m.sample_values else "-"
            lines.append(
                f"  0x{m.key:08X}  {m.name:<25s} "
                f"conf={m.confidence:.0%}  n={m.match_count}  "
                f"samples=[{vals}]"
            )
    else:
        lines.append("No mappings discovered.")

    if result.unmapped_keys:
        lines.append("")
        lines.append(f"Top unmapped keys ({len(result.unmapped_keys)}):")
        for key in result.unmapped_keys[:10]:
            lines.append(f"  0x{key:08X}")

    return "\n".join(lines)


def format_name_map_json(result: NameMapResult) -> dict:
    """Format name map results as a JSON-serializable dict."""
    return {
        "summary": {
            "matched_entries": result.matched_entries,
            "unmatched_wiki": result.unmatched_wiki,
            "mappings_found": len(result.mappings),
        },
        "mappings": [
            {
                "key": f"0x{m.key:08X}",
                "key_int": m.key,
                "name": m.name,
                "confidence": round(m.confidence, 4),
                "match_count": m.match_count,
                "sample_values": m.sample_values,
            }
            for m in result.mappings
        ],
        "unmapped_keys": [f"0x{k:08X}" for k in result.unmapped_keys],
    }
