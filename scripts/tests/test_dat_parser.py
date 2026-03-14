"""Tests for the Turbine .dat archive parser.

All tests use synthetic .dat files built by the `build_dat` fixture —
no dependency on a DDO installation.
"""

import struct
import zlib
import pytest
from pathlib import Path

from ddo_data.dat_parser.archive import DatArchive, DatHeader, FileEntry
from ddo_data.dat_parser.btree import read_btree_node, traverse_btree
from ddo_data.dat_parser.decompress import decompress_entry
from ddo_data.dat_parser.extract import scan_file_table, read_entry_data, extract_entry


# -- Header parsing tests --


def test_header_valid(build_dat) -> None:
    """Parse a valid synthetic .dat header."""
    dat_path = build_dat([
        (0x07000001, b"hello"),
        (0x07000002, b"world"),
    ])
    archive = DatArchive(dat_path)
    header = archive.read_header()

    assert isinstance(header, DatHeader)
    assert header.bt_magic == 0x5442
    assert header.file_size == dat_path.stat().st_size
    assert header.file_count == 2
    assert header.block_size == 2460
    assert header.version == 0x200


def test_header_bad_magic(tmp_path: Path) -> None:
    """File with wrong BT magic raises ValueError."""
    buf = bytearray(2048)
    struct.pack_into("<I", buf, 0x140, 0xDEAD)  # wrong magic
    struct.pack_into("<I", buf, 0x148, 2048)     # file size
    dat_path = tmp_path / "bad_magic.dat"
    dat_path.write_bytes(bytes(buf))

    archive = DatArchive(dat_path)
    with pytest.raises(ValueError, match="Missing BT magic"):
        archive.read_header()


def test_header_size_mismatch(tmp_path: Path) -> None:
    """File size != header value raises ValueError."""
    buf = bytearray(2048)
    struct.pack_into("<I", buf, 0x140, 0x5442)   # correct magic
    struct.pack_into("<I", buf, 0x148, 9999)      # wrong size
    dat_path = tmp_path / "bad_size.dat"
    dat_path.write_bytes(bytes(buf))

    archive = DatArchive(dat_path)
    with pytest.raises(ValueError, match="file size mismatch"):
        archive.read_header()


def test_header_too_small(tmp_path: Path) -> None:
    """File too small to contain a header raises ValueError."""
    dat_path = tmp_path / "tiny.dat"
    dat_path.write_bytes(b"\x00" * 100)

    archive = DatArchive(dat_path)
    with pytest.raises(ValueError, match="too small"):
        archive.read_header()


def test_header_info(build_dat) -> None:
    """header_info() returns a human-readable summary."""
    dat_path = build_dat([(0x07000001, b"x" * 100)])
    archive = DatArchive(dat_path)
    archive.read_header()

    info = archive.header_info()
    assert "test.dat" in info
    assert "File count: 1" in info
    assert "Block size: 2460" in info
    assert "Root offset:" in info


def test_header_info_before_read(tmp_path: Path) -> None:
    """header_info() before read_header() returns a prompt message."""
    dat_path = tmp_path / "x.dat"
    dat_path.write_bytes(b"\x00" * 512)
    archive = DatArchive(dat_path)
    assert "not read yet" in archive.header_info()


def test_header_new_fields(build_dat) -> None:
    """New header fields (file_version, free block info) are populated."""
    dat_path = build_dat([(0x07000001, b"test")])
    archive = DatArchive(dat_path)
    header = archive.read_header()

    # These are zero in synthetic archives (build_dat doesn't set them)
    assert header.file_version == 0
    assert header.last_free_block == 0
    assert header.free_block_count == 0
    # Direct field access (no longer aliases)
    assert header.root_offset == 0
    assert header.first_free_block == 0


def test_header_dump_format(build_dat) -> None:
    """header_dump() returns all raw uint32 values with offsets."""
    dat_path = build_dat([(0x07000001, b"test")])
    archive = DatArchive(dat_path)

    dump = archive.header_dump()
    # Should contain the BT magic at 0x140
    assert "0x140:" in dump
    assert "0x00005442" in dump
    # Should contain file_count at 0x1A0
    assert "0x1A0:" in dump
    # Should contain block_size at 0x1A4
    assert "0x1A4:" in dump


# -- File table scanning tests --


def test_scan_single_page(build_dat) -> None:
    """Scan a file table with entries in a single page."""
    files = [
        (0x07000001, b"alpha"),
        (0x07000002, b"bravo"),
        (0x07000003, b"charlie"),
        (0x07000004, b"delta"),
        (0x07000005, b"echo"),
    ]
    dat_path = build_dat(files)
    archive = DatArchive(dat_path)

    entries = scan_file_table(archive)
    assert len(entries) == 5
    for file_id, content in files:
        assert file_id in entries
        assert entries[file_id].size == len(content) + 8  # size includes id + type prefix


def test_scan_multi_page(build_dat) -> None:
    """Scan entries spread across two file table pages."""
    page1 = [
        (0x0A000001, b"page1_a"),
        (0x0A000002, b"page1_b"),
    ]
    page2 = [
        (0x0A000003, b"page2_a"),
        (0x0A000004, b"page2_b"),
        (0x0A000005, b"page2_c"),
    ]
    dat_path = build_dat(page1, extra_pages=[page2])
    archive = DatArchive(dat_path)

    entries = scan_file_table(archive)
    assert len(entries) == 5
    assert 0x0A000001 in entries
    assert 0x0A000005 in entries


def test_scan_empty_archive(build_dat) -> None:
    """Scanning an archive with no entries returns empty dict."""
    dat_path = build_dat([])
    archive = DatArchive(dat_path)
    archive.read_header()

    entries = scan_file_table(archive)
    assert entries == {}


def test_scan_auto_reads_header(build_dat) -> None:
    """scan_file_table reads the header automatically if not already read."""
    dat_path = build_dat([(0x01000001, b"data")])
    archive = DatArchive(dat_path)
    assert archive.header is None

    entries = scan_file_table(archive)
    assert archive.header is not None
    assert len(entries) == 1


# -- Data reading tests --


def test_read_entry_data(build_dat) -> None:
    """Read back content bytes from a file entry."""
    content = b"The quick brown fox jumps over the lazy dog"
    dat_path = build_dat([(0x07001234, content)])
    archive = DatArchive(dat_path)

    entries = scan_file_table(archive)
    data = read_entry_data(archive, entries[0x07001234])
    assert data == content


def test_read_entry_data_binary(build_dat) -> None:
    """Read back binary content with null bytes."""
    content = b"\x00\x01\x02\xff" * 64
    dat_path = build_dat([(0x07000099, content)])
    archive = DatArchive(dat_path)

    entries = scan_file_table(archive)
    data = read_entry_data(archive, entries[0x07000099])
    assert data == content


def test_read_multiple_entries(build_dat) -> None:
    """Read back content from multiple file entries."""
    files = [
        (0x01000001, b"first file content"),
        (0x01000002, b"second file has different data"),
        (0x01000003, b"\x89PNG\r\n\x1a\nfake png data"),
    ]
    dat_path = build_dat(files)
    archive = DatArchive(dat_path)

    entries = scan_file_table(archive)
    for file_id, expected in files:
        actual = read_entry_data(archive, entries[file_id])
        assert actual == expected


def test_read_entry_data_too_small(build_dat) -> None:
    """Reading from a truncated block raises ValueError."""
    dat_path = build_dat([(0x07000001, b"data")])
    archive = DatArchive(dat_path)
    archive.read_header()
    # Craft a fake entry pointing near the end of the file so the read is too small
    bad_entry = FileEntry(
        file_id=0x07000001,
        data_offset=archive.header.file_size - 4,
        size=100,
        disk_size=100,
        flags=0,
    )
    with pytest.raises(ValueError, match="too small"):
        read_entry_data(archive, bad_entry)


def test_read_entry_data_bad_header(build_dat, tmp_path: Path) -> None:
    """Block without 8-zero header raises ValueError."""
    dat_path = build_dat([(0x07000001, b"data")])
    archive = DatArchive(dat_path)
    entries = scan_file_table(archive)
    entry = entries[0x07000001]

    # Corrupt the block header by writing non-zero bytes
    buf = bytearray(dat_path.read_bytes())
    buf[entry.data_offset] = 0xFF
    dat_path.write_bytes(bytes(buf))

    with pytest.raises(ValueError, match="Missing block header"):
        read_entry_data(archive, entry)


def test_read_entry_data_id_mismatch(build_dat) -> None:
    """Mismatched embedded file ID raises ValueError."""
    dat_path = build_dat([(0x07000001, b"data")])
    archive = DatArchive(dat_path)
    entries = scan_file_table(archive)
    entry = entries[0x07000001]

    # Craft entry with wrong file_id but same offset
    wrong_entry = FileEntry(
        file_id=0x07FFFFFF,
        data_offset=entry.data_offset,
        size=entry.size,
        disk_size=entry.disk_size,
        flags=entry.flags,
    )
    with pytest.raises(ValueError, match="File ID mismatch"):
        read_entry_data(archive, wrong_entry)


# -- Extraction tests --


@pytest.mark.parametrize("content,expected_ext", [
    (b"OggS" + b"\x00" * 100, ".ogg"),
    (b"DDS " + b"\x7c" + b"\x00" * 99, ".dds"),
    (b"<?xml version='1.0'?><root/>", ".xml"),
    (b"RIFF" + b"\x00" * 100, ".wav"),
    (b"BM" + b"\x00" * 100, ".bmp"),
    (b"\xDE\xAD\xBE\xEF" * 10, ".bin"),
    (b"", ".bin"),
])
def test_extract_detects_extension(build_dat, tmp_path: Path, content: bytes, expected_ext: str) -> None:
    """Extract files and verify extension detection from magic bytes."""
    dat_path = build_dat([(0x07000001, content)])
    archive = DatArchive(dat_path)

    entries = scan_file_table(archive)
    out_dir = tmp_path / "output"
    out_path = extract_entry(archive, entries[0x07000001], out_dir)

    assert out_path.suffix == expected_ext
    assert out_path.read_bytes() == content


def test_extract_creates_output_dir(build_dat, tmp_path: Path) -> None:
    """extract_entry creates the output directory if it doesn't exist."""
    dat_path = build_dat([(0x07000001, b"data")])
    archive = DatArchive(dat_path)

    entries = scan_file_table(archive)
    out_dir = tmp_path / "nested" / "deep" / "output"
    assert not out_dir.exists()

    extract_entry(archive, entries[0x07000001], out_dir)
    assert out_dir.exists()


# -- Decompression tests --


def test_decompress_with_length_prefix() -> None:
    """Round-trip: compress content, prepend length prefix, decompress."""
    original = b"The quick brown fox jumps over the lazy dog" * 10
    compressed = zlib.compress(original)
    payload = struct.pack("<I", len(original)) + compressed

    result = decompress_entry(payload)
    assert result == original


def test_decompress_raw_deflate_fallback() -> None:
    """Raw deflate (no zlib header) is decompressed via wbits=-15 fallback."""
    original = b"Hello, DDO world!" * 5
    # compressobj with wbits=-15 produces raw deflate (no zlib header)
    compressor = zlib.compressobj(level=6, wbits=-15)
    raw_deflate = compressor.compress(original) + compressor.flush()
    payload = struct.pack("<I", len(original)) + raw_deflate

    result = decompress_entry(payload)
    assert result == original


def test_decompress_uncompressed_passthrough() -> None:
    """Non-compressed data (that fails zlib) is returned as-is."""
    data = b"\x00\x01\x02\x03\x04\x05\x06\x07"
    result = decompress_entry(data)
    assert result == data


def test_decompress_too_short_passthrough() -> None:
    """Data shorter than 5 bytes is returned as-is (can't have length + payload)."""
    data = b"\x01\x02\x03\x04"
    result = decompress_entry(data)
    assert result == data


def test_is_compressed_heuristic() -> None:
    """FileEntry.is_compressed uses disk_size vs size heuristic."""
    # Uncompressed: disk_size == size + 8 (block header)
    uncompressed = FileEntry(file_id=1, data_offset=0, size=100, disk_size=108, flags=0)
    assert not uncompressed.is_compressed

    # Compressed: disk_size < size + 8
    compressed = FileEntry(file_id=2, data_offset=0, size=100, disk_size=60, flags=0)
    assert compressed.is_compressed

    # Edge case: disk_size == 0 (shouldn't happen but guard against it)
    zero_disk = FileEntry(file_id=3, data_offset=0, size=100, disk_size=0, flags=0)
    assert not zero_disk.is_compressed


def test_read_entry_data_compressed(build_dat) -> None:
    """End-to-end: compressed entry in archive is decompressed by read_entry_data."""
    content = b"Compressed content for DDO testing!" * 20
    dat_path = build_dat(
        [(0x07000001, content)],
        compressed_ids={0x07000001},
    )
    archive = DatArchive(dat_path)

    entries = scan_file_table(archive)
    entry = entries[0x07000001]
    assert entry.is_compressed

    data = read_entry_data(archive, entry)
    assert data == content


def test_read_mixed_compressed_uncompressed(build_dat) -> None:
    """Archive with both compressed and uncompressed entries reads correctly."""
    plain_content = b"I am not compressed"
    compressed_content = b"I am compressed!" * 30

    dat_path = build_dat(
        [
            (0x07000001, plain_content),
            (0x07000002, compressed_content),
        ],
        compressed_ids={0x07000002},
    )
    archive = DatArchive(dat_path)
    entries = scan_file_table(archive)

    assert not entries[0x07000001].is_compressed
    assert entries[0x07000002].is_compressed

    assert read_entry_data(archive, entries[0x07000001]) == plain_content
    assert read_entry_data(archive, entries[0x07000002]) == compressed_content


# -- B-tree traversal tests --


def test_read_btree_single_node(build_dat_with_btree) -> None:
    """Single B-tree node with a few entries, verify all found."""
    files = [
        (0x07000001, b"alpha"),
        (0x07000002, b"bravo"),
        (0x07000003, b"charlie"),
    ]
    dat_path = build_dat_with_btree(
        btree_nodes=[{"file_ids": [0x07000001, 0x07000002, 0x07000003]}],
        files=files,
    )
    archive = DatArchive(dat_path)

    entries = traverse_btree(archive)
    assert len(entries) == 3
    assert 0x07000001 in entries
    assert 0x07000002 in entries
    assert 0x07000003 in entries


def test_read_btree_two_levels(build_dat_with_btree) -> None:
    """Root with two child nodes, verify depth-first finds all entries."""
    files = [
        (0x07000001, b"root_file"),
        (0x07000002, b"child1_file_a"),
        (0x07000003, b"child1_file_b"),
        (0x07000004, b"child2_file"),
    ]
    dat_path = build_dat_with_btree(
        btree_nodes=[
            # Node 0 (root): has one file and two children
            {"file_ids": [0x07000001], "children": [1, 2]},
            # Node 1 (child): has two files
            {"file_ids": [0x07000002, 0x07000003]},
            # Node 2 (child): has one file
            {"file_ids": [0x07000004]},
        ],
        files=files,
    )
    archive = DatArchive(dat_path)

    entries = traverse_btree(archive)
    assert len(entries) == 4
    for fid, _ in files:
        assert fid in entries


def test_btree_sentinel_stops(build_dat_with_btree) -> None:
    """B-tree traversal doesn't follow sentinel (zero) child offsets."""
    files = [
        (0x07000001, b"only_file"),
    ]
    dat_path = build_dat_with_btree(
        btree_nodes=[
            # Root with one file, no children (default — empty children list)
            {"file_ids": [0x07000001]},
        ],
        files=files,
    )
    archive = DatArchive(dat_path)

    entries = traverse_btree(archive)
    assert len(entries) == 1
    assert 0x07000001 in entries


def test_traverse_btree_auto_reads_header(build_dat_with_btree) -> None:
    """traverse_btree reads the header automatically if not already read."""
    files = [(0x07000001, b"auto")]
    dat_path = build_dat_with_btree(
        btree_nodes=[{"file_ids": [0x07000001]}],
        files=files,
    )
    archive = DatArchive(dat_path)
    assert archive.header is None

    entries = traverse_btree(archive)
    assert archive.header is not None
    assert len(entries) == 1


def test_read_btree_node_too_small(tmp_path: Path) -> None:
    """read_btree_node raises ValueError on a truncated node."""
    buf = bytearray(2048)  # big enough for header, but node at end will be truncated
    struct.pack_into("<I", buf, 0x140, 0x5442)
    struct.pack_into("<I", buf, 0x148, len(buf))
    struct.pack_into("<I", buf, 0x1A0, 0)
    struct.pack_into("<I", buf, 0x1A4, 2460)
    dat_path = tmp_path / "small_node.dat"
    dat_path.write_bytes(bytes(buf))

    archive = DatArchive(dat_path)
    with pytest.raises(ValueError, match="too small"):
        read_btree_node(archive, 0)


def test_read_btree_node_bad_header(build_dat_with_btree) -> None:
    """read_btree_node raises ValueError when block header is not 8 zero bytes."""
    files = [(0x07000001, b"data")]
    dat_path = build_dat_with_btree(
        btree_nodes=[{"file_ids": [0x07000001]}],
        files=files,
    )
    archive = DatArchive(dat_path)
    archive.read_header()

    # Corrupt the block header of the B-tree root node
    node_offset = archive.header.root_offset
    raw = bytearray(dat_path.read_bytes())
    raw[node_offset] = 0xFF
    dat_path.write_bytes(bytes(raw))

    with pytest.raises(ValueError, match="Invalid block header"):
        read_btree_node(archive, node_offset)


def test_traverse_btree_no_root() -> None:
    """traverse_btree returns empty dict when root_offset is 0."""
    import tempfile
    import struct
    from pathlib import Path

    with tempfile.TemporaryDirectory() as td:
        buf = bytearray(2048)
        struct.pack_into("<I", buf, 0x140, 0x5442)  # BT magic
        struct.pack_into("<I", buf, 0x148, 2048)     # file_size
        struct.pack_into("<I", buf, 0x160, 0)        # root_offset = 0
        struct.pack_into("<I", buf, 0x1A0, 0)        # file_count
        struct.pack_into("<I", buf, 0x1A4, 2460)     # block_size
        dat_path = Path(td) / "empty.dat"
        dat_path.write_bytes(bytes(buf))

        archive = DatArchive(dat_path)
        entries = traverse_btree(archive)
        assert entries == {}


# -- Decompression edge case tests --


def test_decompress_size_mismatch_warning() -> None:
    """decompress_entry emits a warning when decompressed size doesn't match prefix."""
    original = b"Hello, World!"
    compressed = zlib.compress(original)
    # Lie about the expected length (say 999 instead of actual length)
    payload = struct.pack("<I", 999) + compressed

    with pytest.warns(UserWarning, match="Decompressed size mismatch"):
        result = decompress_entry(payload)
    assert result == original


# -- identify_content_type tests --


def test_identify_content_type_all_types() -> None:
    """identify_content_type recognizes all known magic byte patterns."""
    from ddo_data.dat_parser.extract import identify_content_type

    assert identify_content_type(b"OggS\x00\x00\x00\x00") == "OGG Vorbis"
    assert identify_content_type(b"DDS \x7c\x00\x00\x00") == "DDS texture"
    assert identify_content_type(b"<?xml version='1.0'?>") == "XML"
    assert identify_content_type(b"RIFF\x00\x00\x00\x00") == "RIFF/WAV"
    assert identify_content_type(b"BM\x00\x00\x00\x00") == "BMP image"
    assert identify_content_type(b"\xff\xfe\x00\x00") == "UTF-16LE text"
    assert identify_content_type(b"\xDE\xAD\xBE\xEF") == "binary (0xDEAD)"
    assert identify_content_type(b"\x01") == "unknown"
    assert identify_content_type(b"") == "unknown"
