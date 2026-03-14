"""Decompress compressed entries from Turbine .dat archives.

Compression format (from DATUnpacker reference):
  [uint32 LE decompressed_length] [zlib compressed data...]

The first 4 bytes declare the expected output size, followed by
standard zlib-compressed data. If standard zlib fails, raw deflate
(no zlib header) is attempted as a fallback.
"""

import struct
import warnings
import zlib


def decompress_entry(data: bytes) -> bytes:
    """Decompress a compressed .dat archive entry.

    Reads a 4-byte LE uint32 expected length prefix, then decompresses
    the remaining bytes with zlib. Falls back to raw deflate if the
    standard zlib header is missing.

    Returns the original data unchanged if decompression fails entirely.
    """
    if len(data) < 5:
        return data

    expected_len = struct.unpack_from("<I", data, 0)[0]
    payload = data[4:]

    # Try standard zlib (with header)
    try:
        result = zlib.decompress(payload)
    except zlib.error:
        # Try raw deflate (wbits=-15, no zlib/gzip header)
        try:
            result = zlib.decompress(payload, -15)
        except zlib.error:
            return data

    if len(result) != expected_len:
        warnings.warn(
            f"Decompressed size mismatch: expected {expected_len}, "
            f"got {len(result)}",
            stacklevel=2,
        )

    return result
