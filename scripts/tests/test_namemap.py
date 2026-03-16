"""Tests for property key name mapping via wiki cross-reference."""

import struct

from ddo_data.dat_parser.archive import DatArchive
from ddo_data.dat_parser.extract import scan_file_table
from ddo_data.dat_parser.namemap import (
    KeyMapping,
    NameMapResult,
    NamedEntry,
    correlate_keys,
    decode_dup_triple,
    format_name_map,
    format_name_map_json,
    match_wiki_to_entries,
)
from ddo_data.dat_parser.probe import DecodedProperty


# ---------------------------------------------------------------------------
# Helpers for building synthetic 0x79 dup-triple entry bytes
# ---------------------------------------------------------------------------


def _build_dup_triple_bytes(
    properties: list[tuple[int, int]],
    schema_id: int = 0x08551000,
) -> bytes:
    """Build raw bytes for a 0x79 dup-triple entry.

    Layout: [schema_id:u32] [key:u32][key:u32][value:u32]...
    The decode_dup_triple scanner finds repeated key patterns.
    """
    buf = struct.pack("<I", schema_id)
    for key, val in properties:
        buf += struct.pack("<III", key, key, val)  # dup-triple
    return buf


# ---------------------------------------------------------------------------
# match_wiki_to_entries tests
# ---------------------------------------------------------------------------


def test_match_by_deterministic_id(build_dat) -> None:
    """Matches a 0x79 entry whose lower bytes match a 0x25 string table entry."""
    # 0x79000001 entry with dup-triple properties
    content = _build_dup_triple_bytes(
        properties=[(0x10000001, 29)],
    )
    dat_path = build_dat([(0x79000001, content)])

    archive = DatArchive(dat_path)
    archive.read_header()
    entries = scan_file_table(archive)

    # String table: 0x25000001 has same lower bytes as 0x79000001
    string_table = {0x25000001: "Celestia"}
    wiki_items = [{"name": "Celestia", "minimum_level": 29}]

    matched, unmatched = match_wiki_to_entries(wiki_items, string_table, archive, entries)

    assert len(matched) == 1
    assert matched[0].name == "Celestia"
    assert matched[0].wiki_fields["minimum_level"] == 29
    assert unmatched == 0


def test_match_unmatched_wiki_items(build_dat) -> None:
    """Wiki items not found in string table produce no matches."""
    content = _build_dup_triple_bytes(
        properties=[(0x10000001, 10)],
    )
    dat_path = build_dat([(0x79000001, content)])

    archive = DatArchive(dat_path)
    archive.read_header()
    entries = scan_file_table(archive)

    # String table has the entry but wiki asks for a different name
    string_table = {0x25000001: "Celestia"}
    wiki_items = [{"name": "Unknown Sword", "minimum_level": 10}]

    matched, unmatched = match_wiki_to_entries(wiki_items, string_table, archive, entries)

    assert len(matched) == 0
    assert unmatched == 1


def test_match_name_normalization(build_dat) -> None:
    """Matching is case-insensitive and handles underscores/whitespace."""
    content = _build_dup_triple_bytes(
        properties=[(0x10000001, 5)],
    )
    dat_path = build_dat([(0x79000001, content)])

    archive = DatArchive(dat_path)
    archive.read_header()
    entries = scan_file_table(archive)

    # String table: 0x25000001 maps to "Vorpal Sword", wiki has "vorpal_sword"
    string_table = {0x25000001: "Vorpal Sword"}
    wiki_items = [{"name": "vorpal_sword", "minimum_level": 5}]

    matched, _ = match_wiki_to_entries(wiki_items, string_table, archive, entries)

    assert len(matched) == 1


# ---------------------------------------------------------------------------
# decode_dup_triple tests
# ---------------------------------------------------------------------------


def test_decode_dup_triple_basic() -> None:
    """Extracts key-value pairs from dup-triple encoded bytes."""
    # Schema ID + two dup-triples
    data = struct.pack("<I", 0x08551000)  # schema ID (ignored)
    data += struct.pack("<III", 0x10000042, 0x10000042, 29)
    data += struct.pack("<III", 0x10000077, 0x10000077, 150)

    props = decode_dup_triple(data)

    keys = {p.key: p.value for p in props}
    assert keys[0x10000042] == 29
    assert keys[0x10000077] == 150


def test_decode_dup_triple_empty() -> None:
    """Returns empty list for data with no property keys."""
    data = struct.pack("<III", 0x08551000, 0x00000000, 0xDEADBEEF)
    props = decode_dup_triple(data)
    assert props == []


def test_decode_dup_triple_lone_key() -> None:
    """Picks up a lone key-value pair (first record in stream)."""
    # Schema ID + lone pair (no dup) + dup-triple
    data = struct.pack("<I", 0x08551000)  # schema ID
    data += struct.pack("<II", 0x10000001, 42)  # lone pair
    data += struct.pack("<III", 0x10000002, 0x10000002, 99)  # dup-triple

    props = decode_dup_triple(data)

    keys = {p.key: p.value for p in props}
    assert keys[0x10000001] == 42
    assert keys[0x10000002] == 99


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
    """Property key holding a 0x25XXXXXX value matching wiki string field."""
    string_table = {0x25000010: "Longsword", 0x25000011: "Shortsword"}
    entries = []
    for i, (text, string_id) in enumerate([
        ("Longsword", 0x25000010),
        ("Longsword", 0x25000010),
        ("Shortsword", 0x25000011),
        ("Longsword", 0x25000010),
        ("Shortsword", 0x25000011),
        ("Longsword", 0x25000010),
    ]):
        entries.append(NamedEntry(
            file_id=0x79000000 + i,
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
