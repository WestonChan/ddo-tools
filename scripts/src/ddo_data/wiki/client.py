"""HTTP client for DDO Wiki MediaWiki API with rate limiting and disk cache."""

from __future__ import annotations

import hashlib
import json
import logging
import time
from collections.abc import Iterator
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

DDO_WIKI_API = "https://ddowiki.com/api.php"
_DEFAULT_CACHE_DIR = Path(".wiki-cache")
_REQUEST_DELAY = 0.6  # ~1.7 req/s, polite rate limit

# Title prefix per MediaWiki namespace id we enumerate. Main namespace (0) has
# no prefix, so it is identified by the *absence* of any known prefix — a title
# like "Past Life: Fighter" contains a colon but is still main namespace.
_NAMESPACE_PREFIX: dict[int, str] = {
    0: "",
    6: "File",
    10: "Template",
    14: "Category",
    500: "Item",
}

# Every namespace prefix ddowiki uses, lowercased. Used only to decide whether
# a colon in a title is a namespace separator or part of the page name.
_KNOWN_PREFIXES: frozenset[str] = frozenset({
    "media", "special", "talk", "user", "user talk", "ddowiki",
    "ddowiki talk", "file", "file talk", "mediawiki", "mediawiki talk",
    "template", "template talk", "help", "help talk", "category",
    "category talk", "image", "image talk", "item", "item talk",
})

# How page titles are enumerated. "auto" prefers the disk cache and falls back
# to the API when nothing is cached; "cache" and "api" pin one source.
ENUMERATION_MODES: tuple[str, ...] = ("auto", "cache", "api")


class WikiClient:
    """Rate-limited, caching HTTP client for the DDO Wiki API.

    The disk cache is also an offline *page index*: every entry stores its own
    title, so ``iter_namespace_pages`` can enumerate a namespace without the
    ``allpages`` API — which matters because ddowiki's AWS WAF answers every
    non-browser client with HTTP 202 and an empty body (see
    docs/ddowiki-api.md), leaving the pipeline unable to enumerate anything.
    """

    def __init__(
        self,
        cache_dir: Path = _DEFAULT_CACHE_DIR,
        use_cache: bool = True,
        delay: float = _REQUEST_DELAY,
        enumeration: str = "auto",
    ) -> None:
        if enumeration not in ENUMERATION_MODES:
            raise ValueError(
                f"enumeration must be one of {ENUMERATION_MODES}, got {enumeration!r}"
            )
        self.cache_dir = cache_dir
        self.use_cache = use_cache
        self.delay = delay
        self.enumeration = enumeration
        self._session = requests.Session()
        self._session.headers["User-Agent"] = "ddo-data/0.1 (DDO Tools)"
        self._last_request_time = 0.0

    def get_wikitext(self, page_title: str) -> str | None:
        """Fetch raw wikitext for a page. Returns None if page doesn't exist."""
        if self.use_cache:
            cached = self._read_cache(page_title)
            if cached is not None:
                return cached

        params = {
            "action": "parse",
            "page": page_title,
            "prop": "wikitext",
            "format": "json",
        }
        data = self._api_get(params)
        if data is None or "parse" not in data:
            logger.warning("No parse result for %s", page_title)
            return None

        wikitext = data["parse"].get("wikitext", {}).get("*")
        if wikitext is None:
            logger.warning("No wikitext in response for %s", page_title)
            return None

        if self.use_cache:
            self._write_cache(page_title, wikitext)

        return wikitext

    def iter_cached_pages(self) -> Iterator[tuple[str, str]]:
        """Yield ``(title, wikitext)`` for every entry in the disk cache.

        Order follows the cache filenames (md5 digests), so callers that need a
        stable order must sort. Unreadable or malformed entries are skipped.
        """
        if not self.cache_dir.is_dir():
            return
        for path in self.cache_dir.glob("*.json"):
            try:
                data = json.loads(path.read_text())
            except (json.JSONDecodeError, OSError):
                continue
            title = data.get("title")
            wikitext = data.get("wikitext")
            if isinstance(title, str) and isinstance(wikitext, str):
                yield title, wikitext

    def iter_cached_titles(self, namespace: int) -> list[str]:
        """Sorted non-redirect cached titles belonging to *namespace*."""
        prefix = _NAMESPACE_PREFIX.get(namespace)
        if prefix is None:
            return []
        titles = [
            title
            for title, wikitext in self.iter_cached_pages()
            if _title_namespace_matches(title, prefix)
            and "#REDIRECT" not in wikitext.upper()
        ]
        return sorted(titles)

    def iter_namespace_pages(
        self, namespace: int, *, limit: int = 0,
    ) -> Iterator[str]:
        """Yield page titles in a namespace, from the cache or the allpages API.

        Which source is used follows ``self.enumeration``. In the default
        ``"auto"`` mode the cache wins when it holds anything for the namespace,
        because it is the only source that works while the WAF challenge is up;
        an empty cache falls through to the API so a first run still works.
        """
        if self.enumeration in ("auto", "cache"):
            cached = self.iter_cached_titles(namespace)
            if cached:
                yield from cached[:limit] if limit > 0 else cached
                return
            if self.enumeration == "cache":
                logger.warning(
                    "No cached titles for namespace %d and enumeration=cache", namespace,
                )
                return

        params = {
            "action": "query",
            "list": "allpages",
            "apnamespace": namespace,
            "aplimit": "500",
            "apfilterredir": "nonredirects",
            "format": "json",
        }
        count = 0
        while True:
            data = self._api_get(params)
            if data is None:
                return

            for page in data.get("query", {}).get("allpages", []):
                yield page["title"]
                count += 1
                if 0 < limit <= count:
                    return

            cont = data.get("continue")
            if cont and "apcontinue" in cont:
                params["apcontinue"] = cont["apcontinue"]
            else:
                return

    def iter_category_members(
        self,
        category: str,
        *,
        namespace: int | None = None,
        member_type: str | None = None,
        limit: int = 0,
    ) -> Iterator[str]:
        """Yield page titles in a category via categorymembers API.

        Args:
            member_type: Filter by type: ``"subcat"``, ``"page"``, or
                ``"subcat|page"``. None returns all types (default).
        """
        params: dict = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": f"Category:{category}",
            "cmlimit": "500",
            "format": "json",
        }
        if namespace is not None:
            params["cmnamespace"] = namespace
        if member_type is not None:
            params["cmtype"] = member_type
        count = 0
        while True:
            data = self._api_get(params)
            if data is None:
                return

            for page in data.get("query", {}).get("categorymembers", []):
                yield page["title"]
                count += 1
                if 0 < limit <= count:
                    return

            cont = data.get("continue")
            if cont and "cmcontinue" in cont:
                params["cmcontinue"] = cont["cmcontinue"]
            else:
                return

    def _api_get(self, params: dict) -> dict | None:
        """Make a rate-limited GET request to the wiki API."""
        elapsed = time.monotonic() - self._last_request_time
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

        try:
            resp = self._session.get(DDO_WIKI_API, params=params, timeout=30)
            resp.raise_for_status()
            self._last_request_time = time.monotonic()
            return resp.json()
        except (requests.RequestException, ValueError) as exc:
            logger.warning("API request failed: %s", exc)
            self._last_request_time = time.monotonic()
            return None

    def _cache_path(self, key: str) -> Path:
        """Return filesystem path for a cache entry."""
        digest = hashlib.md5(key.encode()).hexdigest()  # noqa: S324
        return self.cache_dir / f"{digest}.json"

    def _read_cache(self, key: str) -> str | None:
        """Read cached wikitext, or None if not cached."""
        path = self._cache_path(key)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text())
            return data.get("wikitext")
        except (json.JSONDecodeError, OSError):
            return None

    def _write_cache(self, key: str, content: str) -> None:
        """Write wikitext to disk cache."""
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        path = self._cache_path(key)
        path.write_text(json.dumps({"title": key, "wikitext": content}))


def _title_namespace_matches(title: str, prefix: str) -> bool:
    """True when *title* belongs to the namespace identified by *prefix*.

    ``prefix`` is ``""`` for the main namespace, whose members are exactly the
    titles carrying no *known* namespace prefix — "Past Life: Fighter" qualifies,
    "Category:Feats" does not.
    """
    head, sep, _ = title.partition(":")
    if prefix:
        return sep == ":" and head.strip().lower() == prefix.lower()
    return not (sep == ":" and head.strip().lower() in _KNOWN_PREFIXES)
