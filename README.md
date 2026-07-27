# DDO Tools

[![CI](https://github.com/WestonChan/ddo-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/WestonChan/ddo-tools/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/package-json/v/WestonChan/ddo-tools)](https://github.com/WestonChan/ddo-tools/blob/main/package.json)
[![Last commit](https://img.shields.io/github/last-commit/WestonChan/ddo-tools)](https://github.com/WestonChan/ddo-tools/commits/main)
[![License](https://img.shields.io/github/license/WestonChan/ddo-tools)](LICENSE)

A toolkit for [Dungeons & Dragons Online](https://www.ddo.com/) — plan character builds and gear sets.

**Live site:** [westonchan.github.io/ddo-tools](https://westonchan.github.io/ddo-tools/)

## Features (Planned)

- Character builder: race, class splits, feats, enhancements
- Gear planner: items, augments, set bonuses
- Shareable builds via URL
- Data extracted directly from DDO game files

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Hosting:** GitHub Pages
- **Data Pipeline:** Python scripts for parsing DDO game files and scraping DDO Wiki

## Configuration

Copy `.env.example` to `.env` and set your DDO installation path:

```bash
cp .env.example .env
```

Edit `.env` to match your system. The default assumes a CrossOver/Steam install on macOS.

Production builds report uncaught errors to Sentry when configured. Setup is optional — see [docs/sentry.md](docs/sentry.md).

## Getting Started

### Frontend

```bash
npm install
npm run dev
```

### Data Pipeline

```bash
cd scripts
pip install -e ".[dev]"
ddo-data --help
ddo-data info
```

### Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `ddo-data info` | Show DDO installation info |
| `ddo-data parse <file>` | Parse a .dat archive header |
| `ddo-data list <file>` | List all files in a .dat archive |
| `ddo-data dat-extract <file>` | Extract raw files from a .dat archive |
| `ddo-data dat-peek <file> --id <hex>` | Hex dump of a single entry |
| `ddo-data dat-stats <file>` | Show compression and file type statistics |
| `ddo-data dat-dump <file> --id <hex>` | Extract, decompress, and analyze an entry |
| `ddo-data dat-compare <file>` | Compare brute-force vs B-tree scanner results |
| `ddo-data dat-survey <file>` | Survey entry structure: type codes, sizes, string density |
| `ddo-data dat-compare-entries <file> --type <hex>` | Compare entries by type code to find field patterns |
| `ddo-data dat-validate <file>` | Validate TLV hypotheses against real game data |
| `ddo-data dat-probe <file> --id <hex>` | Probe entry binary structure and decode |
| `ddo-data dat-registry <file>` | Build empirical property key registry from decoded entries |
| `ddo-data icons <file> -o <dir>` | Extract DDS textures and convert to PNG |
| `ddo-data dat-namemap` | Cross-reference wiki items with gamelogic to map property key names |
| `ddo-data scrape --type items` | Scrape item data from DDO Wiki (cached, rate-limited) |

## Deployment

Every push to `main` runs the CI workflow (lint, tests, build) and, on success, deploys the
built site to GitHub Pages via `actions/deploy-pages`. There is no manual deploy step — merging
to `main` is the release.

## Credits

- [DDO Wiki](https://ddowiki.com/) -- the source of most game data in `ddo.db` (items, quests, effects), scraped via `ddo-data scrape`; wiki content is available under CC BY-SA
- [DATUnpacker](https://github.com/Middle-earth-Revenge/DATUnpacker) (Middle-earth-Revenge) -- C#/.NET reference for the Turbine .dat archive format and compression scheme
- [DATExplorer](https://github.com/Middle-earth-Revenge/DATExplorer) (Middle-earth-Revenge) -- C# tool documenting the B-tree directory structure and header field layout
- [LotroCompanion/lotro-tools](https://github.com/LotroCompanion/lotro-tools) (LotroCompanion) -- Java extraction tools revealing the PropertiesSet/DataFacade pattern for Turbine game data
- [jtauber/lotro](https://github.com/jtauber/lotro) (James Tauber) -- Python dat explorer with entry header patterns for textures and localization
- [LocalDataExtractor](https://github.com/Middle-earth-Revenge/LocalDataExtractor) (Middle-earth-Revenge) -- C# localization parser documenting variable-length encoding and UTF-16LE string format
- [lulrai/bot-client](https://github.com/lulrai/bot-client) (lulrai) -- Python LOTRO tools documenting VLE encoding and Turbine property stream primitives

## License

[MIT](LICENSE)

DDO Tools is an unaffiliated fan project. Dungeons & Dragons Online is © Standing Stone Games;
game content, names, imagery, and data belong to their respective owners. The MIT license covers
this repository's code, not the game data it extracts or the wiki content it aggregates.
