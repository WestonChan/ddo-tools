"""Tests for the ddo-data CLI commands.

Uses Click's CliRunner to invoke commands against synthetic .dat archives.
"""

import struct

from click.testing import CliRunner

from ddo_data.cli import cli
from ddo_data.dat_parser.tagged import scan_tagged_entry, hex_dump


# -- dat-peek tests --


def test_dat_peek_shows_hex(build_dat) -> None:
    """dat-peek prints a hex dump with structure annotations."""
    dat_path = build_dat([(0x07000001, b"Hello, World!")])
    runner = CliRunner()
    result = runner.invoke(cli, ["dat-peek", str(dat_path), "--id", "0x07000001"])

    assert result.exit_code == 0
    assert "0x07000001" in result.output
    assert "block hdr + file_id + type" in result.output
    assert "content start" in result.output
    # Should show hex bytes
    assert "48 65 6C 6C 6F" in result.output  # "Hello" in hex


def test_dat_peek_not_found(build_dat) -> None:
    """dat-peek reports when a file ID is not in the archive."""
    dat_path = build_dat([(0x07000001, b"data")])
    runner = CliRunner()
    result = runner.invoke(cli, ["dat-peek", str(dat_path), "--id", "0x07FFFFFF"])

    assert result.exit_code == 0
    assert "not found" in result.output


# -- dat-stats tests --


def test_dat_stats_counts(build_dat) -> None:
    """dat-stats reports correct entry counts and compression stats."""
    files = [
        (0x07000001, b"OggS" + b"\x00" * 50),
        (0x07000002, b"DDS " + b"\x00" * 50),
        (0x07000003, b"<?xml version='1.0'?><r/>"),
    ]
    dat_path = build_dat(files)
    runner = CliRunner()
    result = runner.invoke(cli, ["dat-stats", str(dat_path)])

    assert result.exit_code == 0
    assert "3 entries" in result.output
    assert "Uncompressed:" in result.output
    # All entries are uncompressed in our synthetic archive
    assert "OGG Vorbis" in result.output
    assert "DDS texture" in result.output
    assert "XML" in result.output


# -- dat-dump tests --


def test_dat_dump_output_format(build_dat) -> None:
    """dat-dump shows hex dump with offset/hex/ASCII columns."""
    dat_path = build_dat([(0x07000001, b"ABCDEFGHIJKLMNOP" * 4)])
    runner = CliRunner()
    result = runner.invoke(cli, ["dat-dump", str(dat_path), "--id", "0x07000001"])

    assert result.exit_code == 0
    assert "0x07000001" in result.output
    # Should have hex dump with ASCII sidebar
    assert "41 42 43 44" in result.output  # "ABCD" in hex
    assert "ABCDEFGHIJKLMNOP" in result.output  # ASCII sidebar


# -- tagged format tests --


def test_tagged_parse_basic() -> None:
    """Scan a hand-crafted tagged binary blob, verify field extraction."""
    # Build a blob with: a UTF-16LE string + a file ID reference
    blob = bytearray()
    # UTF-16LE string: "Hello" + null terminator = 12 bytes (5*2 + 2)
    for ch in "Hello":
        blob.extend(struct.pack("<H", ord(ch)))
    blob.extend(b"\x00\x00")  # null terminator
    # File ID reference at offset 12 (4-byte aligned: 12 % 4 == 0)
    blob.extend(struct.pack("<I", 0x07001234))

    result = scan_tagged_entry(bytes(blob))
    assert result.raw_size == len(blob)

    # Should find the UTF-16LE string
    assert len(result.strings) == 1
    assert result.strings[0][1] == "Hello"

    # Should find the file ID reference
    assert any(ref_id == 0x07001234 for _, ref_id in result.file_refs)


def test_tagged_scan_empty_data() -> None:
    """scan_tagged_entry handles empty data without error."""
    result = scan_tagged_entry(b"")
    assert result.raw_size == 0
    assert result.strings == []
    assert result.file_refs == []


def test_tagged_scan_short_strings_filtered() -> None:
    """UTF-16LE strings shorter than 3 chars are filtered out."""
    # Build "Hi" in UTF-16LE (only 2 chars) + null terminator
    blob = bytearray()
    for ch in "Hi":
        blob.extend(struct.pack("<H", ord(ch)))
    blob.extend(b"\x00\x00")

    result = scan_tagged_entry(bytes(blob))
    assert result.strings == []  # "Hi" is too short (< 3 chars)


def test_tagged_hex_dump_format() -> None:
    """hex_dump produces offset/hex/ASCII format."""
    data = b"Hello, World!\x00\x01\x02\xff"
    dump = hex_dump(data, offset=0x100)

    assert "00000100" in dump  # offset
    assert "48 65 6C 6C 6F" in dump  # "Hello" hex
    assert "Hello" in dump  # ASCII sidebar
    assert "." in dump  # non-printable replaced with dot


def test_tagged_hex_dump_limit() -> None:
    """hex_dump respects byte limit."""
    data = b"A" * 100
    dump = hex_dump(data, limit=32)

    # Should only have 2 rows (32 bytes / 16 per row)
    lines = [l for l in dump.strip().split("\n") if l.strip()]
    assert len(lines) == 2


# -- dat-compare tests --


def test_dat_compare_output(build_dat_with_btree) -> None:
    """dat-compare runs both scanners and reports results."""
    files = [
        (0x07000001, b"alpha"),
        (0x07000002, b"bravo"),
    ]
    dat_path = build_dat_with_btree(
        btree_nodes=[{"file_ids": [0x07000001, 0x07000002]}],
        files=files,
    )
    runner = CliRunner()
    result = runner.invoke(cli, ["dat-compare", str(dat_path)])

    assert result.exit_code == 0
    assert "Root offset:" in result.output
    assert "brute-force" in result.output.lower() or "Brute" in result.output
    assert "B-tree" in result.output
