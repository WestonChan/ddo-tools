"""Extract DDS textures from .dat archives and convert to PNG."""

import logging
from io import BytesIO
from pathlib import Path

from PIL import Image

from ddo_data.dat_parser.archive import DatArchive
from ddo_data.dat_parser.extract import read_entry_data, scan_file_table

logger = logging.getLogger(__name__)

_DDS_MAGIC = b"DDS "


def extract_icons(
    dat_path: Path,
    output_dir: Path,
    *,
    limit: int = 0,
) -> list[Path]:
    """Extract DDS textures from a .dat archive and convert to PNG.

    Scans all entries for DDS magic bytes, opens with Pillow, and saves as PNG.
    Non-DDS entries and unreadable DDS files (e.g. 3D mesh data) are skipped.

    Args:
        dat_path: Path to the .dat archive file.
        output_dir: Directory to write PNG files into.
        limit: Maximum number of icons to extract (0 = all).

    Returns:
        List of paths to the extracted PNG files.
    """
    archive = DatArchive(dat_path)
    entries = scan_file_table(archive)

    output_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[Path] = []
    skipped = 0
    errors = 0

    for entry in entries.values():
        if limit > 0 and len(extracted) >= limit:
            break

        try:
            entry_bytes = read_entry_data(archive, entry)
        except (ValueError, OSError):
            errors += 1
            continue

        if not entry_bytes.startswith(_DDS_MAGIC):
            skipped += 1
            continue

        png_path = _convert_dds_to_png(entry_bytes, entry.file_id, output_dir)
        if png_path is not None:
            extracted.append(png_path)
        else:
            errors += 1

    logger.info(
        "Extracted %d icons, skipped %d non-DDS, %d errors",
        len(extracted), skipped, errors,
    )
    return extracted


def _convert_dds_to_png(dds_data: bytes, file_id: int, output_dir: Path) -> Path | None:
    """Convert DDS bytes to PNG, returning the output path or None on failure."""
    try:
        img = Image.open(BytesIO(dds_data))
        out_path = output_dir / f"{file_id:08X}.png"
        img.save(out_path, "PNG")
        return out_path
    except Exception:
        logger.warning("Could not convert 0x%08X to PNG", file_id)
        return None
