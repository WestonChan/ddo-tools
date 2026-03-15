"""UTF-16LE string table loader for client_local_English.dat.

Entries in the English localization archive contain UTF-16LE encoded
text strings used for item names, descriptions, and other game text.
UTF-16LE string format informed by LocalDataExtractor (Middle-earth-Revenge).
"""

from .archive import DatArchive, FileEntry
from .extract import read_entry_data, scan_file_table


def load_string_table(
    archive: DatArchive,
    entries: dict[int, FileEntry] | None = None,
    limit: int = 0,
) -> dict[int, str]:
    """Extract UTF-16LE text strings from archive entries.

    Args:
        archive: An opened DatArchive (header read automatically if needed).
        entries: Pre-scanned file entries (scanned from archive if None).
        limit: Max entries to process (0 = all).

    Returns:
        Dict mapping file_id -> decoded text string.
    """
    if entries is None:
        if archive.header is None:
            archive.read_header()
        entries = scan_file_table(archive)

    strings: dict[int, str] = {}
    count = 0

    for file_id in sorted(entries.keys()):
        if 0 < limit <= count:
            break

        entry = entries[file_id]
        try:
            data = read_entry_data(archive, entry)
        except (ValueError, OSError):
            continue

        text = decode_utf16le(data)
        if text is not None:
            strings[file_id] = text

        count += 1

    return strings


def decode_utf16le(data: bytes) -> str | None:
    """Decode bytes as a UTF-16LE string.

    Strips BOM and null terminators. Returns None if the data
    doesn't decode cleanly or contains no printable characters.
    """
    if len(data) < 2:
        return None

    start = 0
    if data[:2] == b"\xff\xfe":
        start = 2

    try:
        text = data[start:].decode("utf-16-le")
    except (UnicodeDecodeError, ValueError):
        return None

    text = text.rstrip("\x00")

    if not text or not any(c.isprintable() for c in text):
        return None

    return text


def resolve_string_ref(file_id: int, string_table: dict[int, str]) -> str | None:
    """Look up a string by file ID in the string table."""
    return string_table.get(file_id)
