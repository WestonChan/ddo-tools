"""Explore the binary tagged format used in client_gamelogic.dat entries.

This is an incremental parser for reverse-engineering the structure.
It detects recognizable patterns in binary data: UTF-16LE strings,
file ID cross-references, and common type markers.

The format is not yet fully understood — this module provides tooling
for interactive exploration rather than complete parsing.
"""

import struct
from dataclasses import dataclass, field


@dataclass
class TaggedStructure:
    """Result of scanning a binary blob for tagged structures."""

    raw_size: int
    strings: list[tuple[int, str]] = field(default_factory=list)  # (offset, text)
    file_refs: list[tuple[int, int]] = field(default_factory=list)  # (offset, file_id)


def scan_tagged_entry(data: bytes) -> TaggedStructure:
    """Scan a binary blob for recognizable structures.

    Detects:
    - UTF-16LE strings (sequences of printable 2-byte chars followed by null terminator)
    - File ID references (uint32 values matching known high-byte patterns)
    - uint32 values at 4-byte-aligned offsets
    """
    result = TaggedStructure(raw_size=len(data))

    # Scan for UTF-16LE strings
    _find_utf16_strings(data, result)

    # Scan for file ID references
    _find_file_refs(data, result)

    return result


# Known file ID high bytes from DDO archives
_KNOWN_ID_HIGH_BYTES = {0x01, 0x07, 0x0A, 0x40, 0x41, 0x78}


def _find_file_refs(data: bytes, result: TaggedStructure) -> None:
    """Find uint32 values that look like file ID cross-references."""
    for i in range(0, len(data) - 3, 4):
        val = struct.unpack_from("<I", data, i)[0]
        high_byte = (val >> 24) & 0xFF
        if high_byte in _KNOWN_ID_HIGH_BYTES and (val & 0x00FFFFFF) != 0:
            result.file_refs.append((i, val))


def _find_utf16_strings(data: bytes, result: TaggedStructure) -> None:
    """Find UTF-16LE encoded strings (common in DDO game data)."""
    i = 0
    while i < len(data) - 3:
        # Look for sequences of printable UTF-16LE characters
        # (ASCII 0x20-0x7E in the low byte, 0x00 in the high byte)
        if data[i + 1] == 0x00 and 0x20 <= data[i] <= 0x7E:
            start = i
            chars = []
            j = i
            while j < len(data) - 1:
                low, high = data[j], data[j + 1]
                if high == 0x00 and 0x20 <= low <= 0x7E:
                    chars.append(chr(low))
                    j += 2
                elif low == 0x00 and high == 0x00:
                    # Null terminator
                    j += 2
                    break
                else:
                    break

            text = "".join(chars)
            if len(text) >= 3:  # Minimum 3 chars to be interesting
                result.strings.append((start, text))
            i = j
        else:
            i += 1


def hex_dump(data: bytes, offset: int = 0, limit: int = 0) -> str:
    """Format binary data as a hex dump with ASCII sidebar.

    Args:
        data: Bytes to dump.
        offset: Base offset for display (cosmetic, for file-relative addresses).
        limit: Max bytes to show (0 = all).

    Returns:
        Formatted hex dump string.
    """
    if limit > 0:
        data = data[:limit]

    lines = []
    for row_off in range(0, len(data), 16):
        chunk = data[row_off : row_off + 16]
        hex_part = " ".join(f"{b:02X}" for b in chunk)
        ascii_part = "".join(chr(b) if 0x20 <= b < 0x7F else "." for b in chunk)
        lines.append(f"  {offset + row_off:08X}  {hex_part:<48s}  {ascii_part}")

    return "\n".join(lines)
