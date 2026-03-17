"""Scrape DDO Wiki for supplementary game data."""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Callable
from pathlib import Path

from .client import WikiClient
from .parsers import (
    parse_enhancement_tree_wikitext,
    parse_feat_wikitext,
    parse_item_wikitext,
    parse_tree_index_wikitext,
    parse_universal_tree_index,
)

logger = logging.getLogger(__name__)


def scrape_items(
    client: WikiClient,
    output: Path,
    *,
    limit: int = 0,
    category: str = "",
    on_progress: Callable[[str], None] | None = None,
) -> int:
    """Scrape Item: namespace pages, parse templates, write items.json.

    Enumerates pages from the Item namespace (ns=500), fetches wikitext
    for each, parses the ``{{Named item|...}}`` template, and writes the
    collected items to ``output/items.json``.

    Args:
        category: If set, scrape only items in this wiki category
            (e.g. "Named_items"). Otherwise enumerates the full namespace.

    Returns count of successfully parsed items.
    """
    items: list[dict] = []
    skipped = 0

    if category:
        page_iter = client.iter_category_members(category, namespace=500, limit=limit)
    else:
        page_iter = client.iter_namespace_pages(500, limit=limit)

    for i, title in enumerate(page_iter):
        wikitext = client.get_wikitext(title)
        if wikitext is None:
            skipped += 1
            continue

        if "#REDIRECT" in wikitext.upper():
            skipped += 1
            continue

        parsed = parse_item_wikitext(wikitext)
        if parsed is None:
            skipped += 1
            continue

        # Use page title as fallback name (strip "Item:" prefix)
        if not parsed.get("name"):
            parsed["name"] = title.removeprefix("Item:").replace("_", " ")

        items.append(parsed)

        if on_progress and (i + 1) % 100 == 0:
            on_progress(f"  ... {i + 1} pages processed, {len(items)} items parsed")

    output.mkdir(parents=True, exist_ok=True)
    output_path = output / "items.json"
    with open(output_path, "w") as f:
        json.dump(items, f, indent=2)

    logger.info(
        "Scraped %d items (%d skipped), written to %s",
        len(items), skipped, output_path,
    )
    return len(items)


# Page titles that are index/overview pages, not individual feats
_FEAT_SKIP_TITLES = {"Feat", "Feats", "Feat tree"}


def scrape_feats(
    client: WikiClient,
    output: Path,
    *,
    limit: int = 0,
    category: str = "Feats",
    on_progress: Callable[[str], None] | None = None,
) -> int:
    """Scrape feat pages from DDO Wiki, parse templates, write feats.json.

    Enumerates pages from the Feats category (namespace 0), fetches
    wikitext for each, parses the ``{{Feat|...}}`` template, and writes
    the collected feats to ``output/feats.json``.

    Returns count of successfully parsed feats.
    """
    feats: list[dict] = []
    skipped = 0

    page_iter = client.iter_category_members(category, namespace=0, limit=limit)

    for i, title in enumerate(page_iter):
        if title in _FEAT_SKIP_TITLES:
            skipped += 1
            continue

        # Skip subcategory-style titles (e.g. "Feats/Active")
        if "/" in title:
            skipped += 1
            continue

        wikitext = client.get_wikitext(title)
        if wikitext is None:
            skipped += 1
            continue

        if "#REDIRECT" in wikitext.upper():
            skipped += 1
            continue

        parsed = parse_feat_wikitext(wikitext)
        if parsed is None:
            skipped += 1
            continue

        # Use page title as fallback name
        if not parsed.get("name"):
            parsed["name"] = title.replace("_", " ")

        feats.append(parsed)

        if on_progress and (i + 1) % 100 == 0:
            on_progress(f"  ... {i + 1} pages processed, {len(feats)} feats parsed")

    output.mkdir(parents=True, exist_ok=True)
    output_path = output / "feats.json"
    with open(output_path, "w") as f:
        json.dump(feats, f, indent=2)

    logger.info(
        "Scraped %d feats (%d skipped), written to %s",
        len(feats), skipped, output_path,
    )
    return len(feats)


# Index pages that list all enhancement trees, with their tree type.
_ENHANCEMENT_INDEX_PAGES: list[tuple[str, str]] = [
    ("Class enhancements", "class"),
    ("Racial enhancements", "racial"),
    ("Universal enhancements", "universal"),
]

# Regex to extract redirect target from "#REDIRECT [[Target]]"
_REDIRECT_RE = re.compile(r"#REDIRECT\s*\[\[([^\]]+)\]\]", re.IGNORECASE)


def _resolve_redirect(wikitext: str) -> str | None:
    """Extract the redirect target page title, or None if not a redirect."""
    match = _REDIRECT_RE.search(wikitext)
    return match.group(1).strip() if match else None


def scrape_enhancements(
    client: WikiClient,
    output: Path,
    *,
    limit: int = 0,
    on_progress: Callable[[str], None] | None = None,
) -> int:
    """Scrape enhancement tree data from DDO Wiki, write enhancements.json.

    Discovers trees from three index pages (Class, Racial, Universal
    enhancements), fetches each tree page, parses all enhancement
    templates, and writes the collected trees to ``output/enhancements.json``.

    Returns count of successfully parsed trees.
    """
    trees: list[dict] = []
    skipped = 0
    visited: set[str] = set()  # deduplicate shared trees (e.g. Vanguard)

    # Gather tree refs from all index pages
    tree_refs: list[dict] = []
    for index_title, tree_type in _ENHANCEMENT_INDEX_PAGES:
        index_wikitext = client.get_wikitext(index_title)
        if index_wikitext is None:
            logger.warning("Could not fetch index page: %s", index_title)
            continue

        if tree_type == "universal":
            refs = parse_universal_tree_index(index_wikitext)
        else:
            refs = parse_tree_index_wikitext(index_wikitext)

        for ref in refs:
            ref["tree_type"] = tree_type
        tree_refs.extend(refs)

    if on_progress:
        on_progress(
            f"  Found {len(tree_refs)} tree references from index pages"
        )

    tree_count = 0
    for ref in tree_refs:
        page_title = ref["page_title"]

        # Deduplicate shared trees
        if page_title in visited:
            continue
        visited.add(page_title)

        # Check limit
        if 0 < limit <= tree_count:
            break

        wikitext = client.get_wikitext(page_title)
        if wikitext is None:
            skipped += 1
            continue

        # Resolve redirects (universal trees link to redirects)
        if "#REDIRECT" in wikitext.upper():
            redirect_target = _resolve_redirect(wikitext)
            if redirect_target is None:
                skipped += 1
                continue
            visited.add(redirect_target)
            wikitext = client.get_wikitext(redirect_target)
            if wikitext is None:
                skipped += 1
                continue
            page_title = redirect_target

        parsed = parse_enhancement_tree_wikitext(wikitext, page_title)
        if parsed is None:
            skipped += 1
            continue

        # Add metadata from index page
        parsed["type"] = ref["tree_type"]
        parsed["class_or_race"] = ref.get("parent", "") or None

        trees.append(parsed)
        tree_count += 1

        if on_progress and tree_count % 10 == 0:
            on_progress(
                f"  ... {tree_count} trees processed"
            )

    output.mkdir(parents=True, exist_ok=True)
    output_path = output / "enhancements.json"
    with open(output_path, "w") as f:
        json.dump(trees, f, indent=2)

    logger.info(
        "Scraped %d enhancement trees (%d skipped), written to %s",
        len(trees), skipped, output_path,
    )
    return len(trees)
