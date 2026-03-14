"""Walk the B-tree directory structure in Turbine .dat archives.

Each B-tree node is a data block containing:
  [8 zero bytes]                              block header
  [62 x (uint32 size, uint32 child_offset)]   directory block (496 bytes)
  [61 x 32-byte file entries]                 file block (1952 bytes)

Child offsets of 0x00000000 or 0xCDCDCDCD are sentinels (unused slots).
File entries with file_id == 0 mark the end of used slots.

Node layout derived from DATExplorer (Middle-earth-Revenge).
"""

import struct
from dataclasses import dataclass, field

from .archive import DatArchive, FileEntry

# Directory block: 62 child slots, each is (uint32 size, uint32 offset)
_DIR_SLOTS = 62
_DIR_BLOCK_SIZE = _DIR_SLOTS * 8  # 496 bytes

# File block: 61 file entries, each 32 bytes
_FILE_SLOTS = 61
_FILE_ENTRY_SIZE = 32
_FILE_BLOCK_SIZE = _FILE_SLOTS * _FILE_ENTRY_SIZE  # 1952 bytes

# Block header size
_BLOCK_HEADER_SIZE = 8

# Total node size: 8 + 496 + 1952 = 2456
_NODE_SIZE = _BLOCK_HEADER_SIZE + _DIR_BLOCK_SIZE + _FILE_BLOCK_SIZE

# Sentinel values for unused child slots
_SENTINELS = {0x00000000, 0xCDCDCDCD}


@dataclass
class BTreeNode:
    """A single B-tree directory node."""

    offset: int
    child_offsets: list[int] = field(default_factory=list)
    file_entries: list[FileEntry] = field(default_factory=list)


def _parse_btree_file_entry(data: bytes, offset: int = 0) -> FileEntry | None:
    """Parse a 32-byte file entry from a B-tree node.

    B-tree nodes use the DATExplorer field ordering:
      0: unknown1, 4: file_type, 8: file_id, 12: file_offset,
      16: size1 (uncompressed), 20: timestamp, 24: unknown2, 28: size2 (disk)
    """
    fields = struct.unpack_from("<IIIIIIII", data, offset)
    _unknown1, file_type, file_id, data_offset, size, _timestamp, _unknown2, disk_size = fields

    if file_id == 0:
        return None

    return FileEntry(
        file_id=file_id,
        data_offset=data_offset,
        size=size,
        disk_size=disk_size,
        flags=file_type,
    )


def read_btree_node(archive: DatArchive, node_offset: int) -> BTreeNode:
    """Read a single B-tree node at the given offset.

    Raises ValueError if the block header is invalid.
    """
    with open(archive.path, "rb") as f:
        f.seek(node_offset)
        raw = f.read(_NODE_SIZE)

    if len(raw) < _NODE_SIZE:
        raise ValueError(
            f"B-tree node too small at offset 0x{node_offset:08X}: "
            f"{len(raw)} bytes (need {_NODE_SIZE})"
        )

    # Verify block header (8 zero bytes)
    if raw[:_BLOCK_HEADER_SIZE] != b"\x00" * _BLOCK_HEADER_SIZE:
        raise ValueError(
            f"Invalid block header at B-tree node 0x{node_offset:08X}"
        )

    node = BTreeNode(offset=node_offset)

    # Parse directory block: 62 child slots
    dir_start = _BLOCK_HEADER_SIZE
    for i in range(_DIR_SLOTS):
        slot_off = dir_start + i * 8
        _child_size, child_offset = struct.unpack_from("<II", raw, slot_off)
        if child_offset in _SENTINELS:
            continue
        node.child_offsets.append(child_offset)

    # Parse file block: 61 file entries
    file_start = _BLOCK_HEADER_SIZE + _DIR_BLOCK_SIZE
    for i in range(_FILE_SLOTS):
        entry_off = file_start + i * _FILE_ENTRY_SIZE
        entry = _parse_btree_file_entry(raw, entry_off)
        if entry is None:
            break
        node.file_entries.append(entry)

    return node


def traverse_btree(archive: DatArchive) -> dict[int, FileEntry]:
    """Walk the B-tree from the root offset and collect all file entries.

    Returns a dict mapping file_id -> FileEntry.
    """
    if archive.header is None:
        archive.read_header()

    root_offset = archive.header.root_offset
    if root_offset == 0:
        return {}

    entries: dict[int, FileEntry] = {}
    visited: set[int] = set()
    max_depth = 100

    def _walk(offset: int, depth: int = 0) -> None:
        if depth > max_depth or offset in visited or offset in _SENTINELS:
            return
        visited.add(offset)

        try:
            node = read_btree_node(archive, offset)
        except ValueError:
            return

        for entry in node.file_entries:
            entries[entry.file_id] = entry

        for child_offset in node.child_offsets:
            _walk(child_offset, depth + 1)

    _walk(root_offset)
    return entries
