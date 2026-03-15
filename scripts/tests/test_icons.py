"""Tests for DDS icon extraction and PNG conversion."""

from pathlib import Path

from conftest import build_dds_1x1_rgba
from PIL import Image

from ddo_data.icons import extract_icons


def test_extract_icons_dds_entry(build_dat, tmp_path: Path) -> None:
    """DDS entry is extracted and converted to PNG."""
    dds_data = build_dds_1x1_rgba()
    dat_path = build_dat([(0x01000001, dds_data)])
    out_dir = tmp_path / "icons"

    png_paths = extract_icons(dat_path, out_dir)

    assert len(png_paths) == 1
    assert png_paths[0].suffix == ".png"
    assert png_paths[0].exists()
    img = Image.open(png_paths[0])
    assert img.size == (1, 1)


def test_extract_icons_skips_non_dds(build_dat, tmp_path: Path) -> None:
    """Non-DDS entries (OGG, binary) are skipped."""
    ogg_data = b"OggS" + b"\x00" * 100
    binary_data = b"\xDE\xAD\xBE\xEF" * 25
    dat_path = build_dat([
        (0x01000001, ogg_data),
        (0x01000002, binary_data),
    ])
    out_dir = tmp_path / "icons"

    png_paths = extract_icons(dat_path, out_dir)

    assert len(png_paths) == 0


def test_extract_icons_corrupt_dds(build_dat, tmp_path: Path) -> None:
    """Corrupt DDS (valid magic but truncated header) is counted as error, not crash."""
    corrupt_dds = b"DDS " + b"\x00" * 20  # too short for Pillow
    dat_path = build_dat([(0x01000001, corrupt_dds)])
    out_dir = tmp_path / "icons"

    png_paths = extract_icons(dat_path, out_dir)

    assert len(png_paths) == 0
    assert not list(out_dir.glob("*.png"))


def test_extract_icons_mixed(build_dat, tmp_path: Path) -> None:
    """Archive with both DDS and non-DDS: only DDS entries are extracted."""
    dds_data = build_dds_1x1_rgba()
    ogg_data = b"OggS" + b"\x00" * 100
    dat_path = build_dat([
        (0x01000001, dds_data),
        (0x01000002, ogg_data),
        (0x01000003, dds_data),
    ])
    out_dir = tmp_path / "icons"

    png_paths = extract_icons(dat_path, out_dir)

    assert len(png_paths) == 2
    names = {p.name for p in png_paths}
    assert "01000001.png" in names
    assert "01000003.png" in names


def test_extract_icons_limit(build_dat, tmp_path: Path) -> None:
    """Limit parameter caps the number of extracted icons."""
    dds_data = build_dds_1x1_rgba()
    dat_path = build_dat([
        (0x01000001, dds_data),
        (0x01000002, dds_data),
        (0x01000003, dds_data),
    ])
    out_dir = tmp_path / "icons"

    png_paths = extract_icons(dat_path, out_dir, limit=1)

    assert len(png_paths) == 1


def test_extract_icons_empty_archive(build_dat, tmp_path: Path) -> None:
    """Empty archive returns empty list."""
    dat_path = build_dat([])
    out_dir = tmp_path / "icons"

    png_paths = extract_icons(dat_path, out_dir)

    assert png_paths == []


def test_extract_icons_creates_output_dir(build_dat, tmp_path: Path) -> None:
    """Output directory is created if it doesn't exist."""
    dds_data = build_dds_1x1_rgba()
    dat_path = build_dat([(0x01000001, dds_data)])
    out_dir = tmp_path / "nested" / "deep" / "icons"

    assert not out_dir.exists()
    png_paths = extract_icons(dat_path, out_dir)

    assert out_dir.exists()
    assert len(png_paths) == 1
