"""General-purpose utilities for the DDO .dat archive parser."""


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
