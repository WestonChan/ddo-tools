"""Tests for DDO Wiki HTTP client (mocked — no real network calls)."""

import json
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

from ddo_data.wiki.client import WikiClient


def _mock_response(data: dict, status_code: int = 200) -> MagicMock:
    """Build a mock requests.Response with .json() and .raise_for_status()."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = data
    resp.raise_for_status.return_value = None
    return resp


class TestGetWikitext:
    """Tests for WikiClient.get_wikitext()."""

    def test_fetches_and_caches(self, tmp_path: Path) -> None:
        """First call hits API, second reads from cache."""
        api_data = {
            "parse": {
                "title": "Item:Celestia",
                "wikitext": {"*": "{{Named item|Weapon|name=Celestia}}"},
            },
        }

        client = WikiClient(cache_dir=tmp_path / "cache", delay=0)
        with patch.object(client._session, "get", return_value=_mock_response(api_data)) as mock_get:
            # First call — should hit the API
            result1 = client.get_wikitext("Item:Celestia")
            assert result1 == "{{Named item|Weapon|name=Celestia}}"
            assert mock_get.call_count == 1

            # Second call — should come from cache
            result2 = client.get_wikitext("Item:Celestia")
            assert result2 == result1
            assert mock_get.call_count == 1  # no additional API call

    def test_missing_page(self, tmp_path: Path) -> None:
        """API error returns None."""
        api_data = {"error": {"code": "missingtitle", "info": "The page does not exist."}}

        client = WikiClient(cache_dir=tmp_path / "cache", delay=0)
        with patch.object(client._session, "get", return_value=_mock_response(api_data)):
            result = client.get_wikitext("Item:NonExistent")
            assert result is None

    def test_no_cache_mode(self, tmp_path: Path) -> None:
        """With use_cache=False, always hits API."""
        api_data = {
            "parse": {
                "title": "Item:TestItem",
                "wikitext": {"*": "some wikitext"},
            },
        }

        client = WikiClient(cache_dir=tmp_path / "cache", use_cache=False, delay=0)
        with patch.object(client._session, "get", return_value=_mock_response(api_data)) as mock_get:
            client.get_wikitext("Item:TestItem")
            client.get_wikitext("Item:TestItem")
            assert mock_get.call_count == 2

    def test_cache_written_to_disk(self, tmp_path: Path) -> None:
        """Cache files are JSON files on disk."""
        api_data = {
            "parse": {
                "title": "Item:Ring",
                "wikitext": {"*": "ring wikitext"},
            },
        }

        cache_dir = tmp_path / "cache"
        client = WikiClient(cache_dir=cache_dir, delay=0)
        with patch.object(client._session, "get", return_value=_mock_response(api_data)):
            client.get_wikitext("Item:Ring")

        # Should have created a cache file
        cache_files = list(cache_dir.glob("*.json"))
        assert len(cache_files) == 1
        cached = json.loads(cache_files[0].read_text())
        assert cached["wikitext"] == "ring wikitext"


class TestIterNamespacePages:
    """Tests for WikiClient.iter_namespace_pages()."""

    def test_single_page_of_results(self, tmp_path: Path) -> None:
        """Returns titles from a single response with no continuation."""
        api_data = {
            "query": {
                "allpages": [
                    {"title": "Item:Alpha"},
                    {"title": "Item:Bravo"},
                    {"title": "Item:Charlie"},
                ],
            },
        }

        client = WikiClient(cache_dir=tmp_path / "cache", delay=0)
        with patch.object(client._session, "get", return_value=_mock_response(api_data)):
            titles = list(client.iter_namespace_pages(500))

        assert titles == ["Item:Alpha", "Item:Bravo", "Item:Charlie"]

    def test_paginates(self, tmp_path: Path) -> None:
        """Follows apcontinue for multiple pages of results."""
        page1 = {
            "query": {"allpages": [{"title": "Item:Alpha"}, {"title": "Item:Bravo"}]},
            "continue": {"apcontinue": "Charlie", "continue": "-||"},
        }
        page2 = {
            "query": {"allpages": [{"title": "Item:Charlie"}]},
        }

        client = WikiClient(cache_dir=tmp_path / "cache", delay=0)
        with patch.object(client._session, "get", side_effect=[
            _mock_response(page1), _mock_response(page2),
        ]):
            titles = list(client.iter_namespace_pages(500))

        assert titles == ["Item:Alpha", "Item:Bravo", "Item:Charlie"]

    def test_limit(self, tmp_path: Path) -> None:
        """Stops after limit pages."""
        api_data = {
            "query": {
                "allpages": [
                    {"title": "Item:Alpha"},
                    {"title": "Item:Bravo"},
                    {"title": "Item:Charlie"},
                ],
            },
        }

        client = WikiClient(cache_dir=tmp_path / "cache", delay=0)
        with patch.object(client._session, "get", return_value=_mock_response(api_data)):
            titles = list(client.iter_namespace_pages(500, limit=2))

        assert len(titles) == 2
        assert titles == ["Item:Alpha", "Item:Bravo"]


class TestIterCategoryMembers:
    """Tests for WikiClient.iter_category_members()."""

    def test_basic(self, tmp_path: Path) -> None:
        """Returns category member titles."""
        api_data = {
            "query": {
                "categorymembers": [
                    {"title": "Item:Celestia"},
                    {"title": "Item:Moonbeam"},
                ],
            },
        }

        client = WikiClient(cache_dir=tmp_path / "cache", delay=0)
        with patch.object(client._session, "get", return_value=_mock_response(api_data)):
            titles = list(client.iter_category_members("Named_weapons"))

        assert titles == ["Item:Celestia", "Item:Moonbeam"]

    def test_paginates(self, tmp_path: Path) -> None:
        """Follows cmcontinue for pagination."""
        page1 = {
            "query": {"categorymembers": [{"title": "Item:Alpha"}]},
            "continue": {"cmcontinue": "page2", "continue": "-||"},
        }
        page2 = {
            "query": {"categorymembers": [{"title": "Item:Bravo"}]},
        }

        client = WikiClient(cache_dir=tmp_path / "cache", delay=0)
        with patch.object(client._session, "get", side_effect=[
            _mock_response(page1), _mock_response(page2),
        ]):
            titles = list(client.iter_category_members("TestCat"))

        assert titles == ["Item:Alpha", "Item:Bravo"]


class TestRateLimiting:
    """Tests for rate limiting behavior."""

    def test_delay_between_requests(self, tmp_path: Path) -> None:
        """Successive API calls have at least `delay` seconds between them."""
        api_data = {"parse": {"title": "Test", "wikitext": {"*": "text"}}}

        # Use a short but measurable delay
        delay = 0.1
        client = WikiClient(cache_dir=tmp_path / "cache", use_cache=False, delay=delay)
        with patch.object(client._session, "get", return_value=_mock_response(api_data)):
            start = time.monotonic()
            client.get_wikitext("Page1")
            client.get_wikitext("Page2")
            elapsed = time.monotonic() - start

        # Should have waited at least one delay interval between the two calls
        assert elapsed >= delay * 0.9  # allow small timing jitter
