"""Tests for property key name mapping via wiki cross-reference."""

import struct

from ddo_data.dat_parser.archive import DatArchive
from ddo_data.dat_parser.extract import scan_file_table
from ddo_data.dat_parser.namemap import (
    KeyMapping,
    NameMapResult,
    NamedEntry,
    correlate_keys,
    format_name_map,
    format_name_map_json,
    match_wiki_to_entries,
)
from ddo_data.dat_parser.probe import DecodedProperty


# ---------------------------------------------------------------------------
# Helpers for building synthetic type-2 entry bytes
# ---------------------------------------------------------------------------


def _build_type2_bytes(
    file_ids: list[int],
    properties: list[tuple[int, int]],
) -> bytes:
    """Build raw bytes for a simple type-2 entry with header file_id refs.

    Layout: [DID=2:u32][ref_count:u8][file_ids:u32*N][pad=1:u32][flag=0:u8][count:u8][key:u32,val:u32 pairs]
    """
    buf = struct.pack("<I", 2)  # DID=2
    buf += bytes([len(file_ids)])  # ref_count
    for fid in file_ids:
        buf += struct.pack("<I", fid)
    buf += struct.pack("<I", 1)  # pad=1 (simple variant marker)
    buf += b"\x00"  # flag=0
    buf += bytes([len(properties)])  # property count
    for key, val in properties:
        buf += struct.pack("<II", key, val)
    return buf


# ---------------------------------------------------------------------------
# match_wiki_to_entries tests
# ---------------------------------------------------------------------------


def test_match_by_header_string_ref(build_dat) -> None:
    """Matches a type-2 entry whose header 0x0A ref resolves to a wiki item name."""
    # Entry with ref to string table ID 0x0A000001
    content = _build_type2_bytes(
        file_ids=[0x0A000001],
        properties=[(0x10000001, 29)],
    )
    dat_path = build_dat([(0x07000001, content)])

    archive = DatArchive(dat_path)
    archive.read_header()
    entries = scan_file_table(archive)

    string_table = {0x0A000001: "Celestia"}
    wiki_items = [{"name": "Celestia", "minimum_level": 29}]

    matched, unmatched = match_wiki_to_entries(wiki_items, string_table, archive, entries)

    assert len(matched) == 1
    assert matched[0].name == "Celestia"
    assert matched[0].wiki_fields["minimum_level"] == 29
    assert unmatched == 0


def test_match_unmatched_wiki_items(build_dat) -> None:
    """Wiki items not found in string table produce no matches."""
    content = _build_type2_bytes(
        file_ids=[0x0A000001],
        properties=[(0x10000001, 10)],
    )
    dat_path = build_dat([(0x07000001, content)])

    archive = DatArchive(dat_path)
    archive.read_header()
    entries = scan_file_table(archive)

    # String table has the entry but wiki asks for a different name
    string_table = {0x0A000001: "Celestia"}
    wiki_items = [{"name": "Unknown Sword", "minimum_level": 10}]

    matched, unmatched = match_wiki_to_entries(wiki_items, string_table, archive, entries)

    assert len(matched) == 0
    assert unmatched == 1


def test_match_name_normalization(build_dat) -> None:
    """Matching is case-insensitive and handles underscores/whitespace."""
    content = _build_type2_bytes(
        file_ids=[0x0A000001],
        properties=[(0x10000001, 5)],
    )
    dat_path = build_dat([(0x07000001, content)])

    archive = DatArchive(dat_path)
    archive.read_header()
    entries = scan_file_table(archive)

    # String table has "Vorpal Sword", wiki has "vorpal_sword"
    string_table = {0x0A000001: "Vorpal Sword"}
    wiki_items = [{"name": "vorpal_sword", "minimum_level": 5}]

    matched, _ = match_wiki_to_entries(wiki_items, string_table, archive, entries)

    assert len(matched) == 1


# ---------------------------------------------------------------------------
# correlate_keys tests
# ---------------------------------------------------------------------------


def _make_named_entries(
    count: int,
    key: int,
    field_name: str,
    values: list[int],
    *,
    match_all: bool = True,
) -> list[NamedEntry]:
    """Build synthetic NamedEntry objects for correlation tests."""
    entries = []
    for i in range(count):
        val = values[i % len(values)]
        prop_val = val if match_all else (val if i % 2 == 0 else val + 999)
        entries.append(NamedEntry(
            file_id=0x07000000 + i,
            name=f"Item {i}",
            wiki_fields={field_name: val},
            properties=[DecodedProperty(key=key, value=prop_val)],
        ))
    return entries


def test_correlate_numeric_field() -> None:
    """Property key consistently matching a wiki numeric field is mapped."""
    entries = _make_named_entries(
        count=10, key=0x10000042, field_name="minimum_level",
        values=[5, 10, 15, 20, 25, 29, 30, 31, 32, 34],
    )

    mappings = correlate_keys(entries)

    assert len(mappings) == 1
    assert mappings[0].key == 0x10000042
    assert mappings[0].name == "minimum_level"
    assert mappings[0].confidence == 1.0
    assert mappings[0].match_count == 10


def test_correlate_ignores_low_confidence() -> None:
    """Keys matching <80% of the time are excluded."""
    entries = _make_named_entries(
        count=10, key=0x10000042, field_name="minimum_level",
        values=[5, 10, 15, 20, 25, 29, 30, 31, 32, 34],
        match_all=False,  # only 50% match
    )

    mappings = correlate_keys(entries)

    # Should find no mapping since only ~50% match
    assert len(mappings) == 0


def test_correlate_ignores_insufficient_data() -> None:
    """Keys with <5 matched entries are excluded (even at 100% match)."""
    entries = _make_named_entries(
        count=3, key=0x10000042, field_name="minimum_level",
        values=[5, 10, 15],
    )

    mappings = correlate_keys(entries, min_matches=5)

    assert len(mappings) == 0


def test_correlate_string_ref_field() -> None:
    """Property key holding a 0x0AXXXXXX value matching wiki string field."""
    string_table = {0x0A000010: "Longsword", 0x0A000011: "Shortsword"}
    entries = []
    for i, (text, string_id) in enumerate([
        ("Longsword", 0x0A000010),
        ("Longsword", 0x0A000010),
        ("Shortsword", 0x0A000011),
        ("Longsword", 0x0A000010),
        ("Shortsword", 0x0A000011),
        ("Longsword", 0x0A000010),
    ]):
        entries.append(NamedEntry(
            file_id=0x07000000 + i,
            name=f"Item {i}",
            wiki_fields={"weapon_type": text},
            properties=[DecodedProperty(key=0x10000099, value=string_id)],
        ))

    mappings = correlate_keys(entries, string_table, min_matches=5)

    assert len(mappings) == 1
    assert mappings[0].key == 0x10000099
    assert mappings[0].name == "weapon_type"
    assert mappings[0].confidence == 1.0


def test_correlate_multiple_fields() -> None:
    """Multiple wiki fields can be mapped simultaneously."""
    entries = []
    for i in range(10):
        ml = 5 + i
        dur = 100 + i * 10
        entries.append(NamedEntry(
            file_id=0x07000000 + i,
            name=f"Item {i}",
            wiki_fields={"minimum_level": ml, "durability": dur},
            properties=[
                DecodedProperty(key=0x10000042, value=ml),
                DecodedProperty(key=0x10000077, value=dur),
            ],
        ))

    mappings = correlate_keys(entries)

    names = {m.name for m in mappings}
    assert "minimum_level" in names
    assert "durability" in names
    assert len(mappings) == 2


def test_correlate_no_key_collision() -> None:
    """Two wiki fields don't map to the same property key."""
    # One key matches both minimum_level and durability (impossible but tests dedup)
    entries = []
    for i in range(10):
        val = 10 + i
        entries.append(NamedEntry(
            file_id=0x07000000 + i,
            name=f"Item {i}",
            wiki_fields={"minimum_level": val, "durability": val},
            properties=[DecodedProperty(key=0x10000042, value=val)],
        ))

    mappings = correlate_keys(entries)

    # The key should only be claimed once (by the first field processed)
    keys = [m.key for m in mappings]
    assert len(keys) == len(set(keys))  # no duplicates


# ---------------------------------------------------------------------------
# Formatter tests
# ---------------------------------------------------------------------------


def test_format_name_map_text() -> None:
    """format_name_map produces readable output."""
    result = NameMapResult(
        matched_entries=50,
        unmatched_wiki=10,
        mappings=[
            KeyMapping(
                key=0x10000042, name="minimum_level",
                confidence=0.95, match_count=48,
                sample_values=[5, 10, 15, 20, 29],
            ),
        ],
        unmapped_keys=[0x10000099],
    )

    text = format_name_map(result)

    assert "Matched entries: 50" in text
    assert "minimum_level" in text
    assert "0x10000042" in text
    assert "95%" in text


def test_format_name_map_json_structure() -> None:
    """JSON output has the expected schema."""
    result = NameMapResult(
        matched_entries=50,
        unmatched_wiki=10,
        mappings=[
            KeyMapping(
                key=0x10000042, name="minimum_level",
                confidence=0.95, match_count=48,
                sample_values=[5, 10],
            ),
        ],
        unmapped_keys=[0x10000099],
    )

    data = format_name_map_json(result)

    assert "summary" in data
    assert data["summary"]["matched_entries"] == 50
    assert data["summary"]["mappings_found"] == 1
    assert len(data["mappings"]) == 1
    assert data["mappings"][0]["name"] == "minimum_level"
    assert data["mappings"][0]["key"] == "0x10000042"
    assert data["mappings"][0]["key_int"] == 0x10000042
    assert "unmapped_keys" in data
