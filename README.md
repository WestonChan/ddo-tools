# DDO Tools

[![CI](https://github.com/WestonChan/ddo-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/WestonChan/ddo-tools/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/package-json/v/WestonChan/ddo-tools)](https://github.com/WestonChan/ddo-tools/blob/main/package.json)
[![Last commit](https://img.shields.io/github/last-commit/WestonChan/ddo-tools)](https://github.com/WestonChan/ddo-tools/commits/main)
[![License](https://img.shields.io/github/license/WestonChan/ddo-tools)](LICENSE)

A toolkit for [Dungeons & Dragons Online](https://www.ddo.com/) — plan character builds and gear sets.

**Live site:** [ddo-tools.com](https://ddo-tools.com/)

## Features (Planned)

- Character builder: race, class splits, feats, enhancements
- Gear planner: items, augments, set bonuses
- Shareable builds
- Game data from Maetrim's DDOBuilderV2 data files, served by the public [`ddo-data`](https://github.com/WestonChan/ddo-data) API

## Tech Stack

- **Frontend:** React + TypeScript + Vite, with TanStack Query for data fetching
- **Hosting:** Vercel (static SPA)
- **Game data:** [`ddo-data`](https://github.com/WestonChan/ddo-data) — a Rust ETL over DDOBuilderV2's XML plus an axum read-only API on Fly.io. This repo only reads that API.

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

`VITE_API_URL` points the frontend at an API deployment. Leave it unset to use the public API, or set
it to a local `ddo-api` (see the `ddo-data` README) while working on both sides.

Production builds report uncaught errors to Sentry when configured. Setup is optional — see [docs/sentry.md](docs/sentry.md).

## Getting Started

```bash
npm install
npm run dev
```

### Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm test` | Vitest unit and integration tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Deployment

Every push to `main` runs the CI workflow (lint, tests, build). Vercel's GitHub integration builds and
deploys the site on the same push, with preview deployments for branches. There is no manual deploy
step — merging to `main` is the release. Game-data deployments are scheduled separately in the
`ddo-data` repo.

## Credits

- [Maetrim's DDOBuilderV2](https://github.com/Maetrim/DDOBuilder) -- the source of the game data (items, augments, sets, feats, enhancements, spells), used with permission via the `ddo-data` pipeline
- [GitHub Octicons](https://github.com/primer/octicons) -- the `mark-github` path behind the GitHub mark in the rail footer, MIT licensed. The GitHub mark is a trademark of GitHub, Inc., used under GitHub's logo guidelines
- [DDO Wiki](https://ddowiki.com/) -- the per-entity wiki links in the app, and the data source of the retired Python pipeline; wiki content is available under CC BY-SA

## License

[MIT](LICENSE)

DDO Tools is an unaffiliated fan project. Dungeons & Dragons Online is © Standing Stone Games;
game content, names, imagery, and data belong to their respective owners. The MIT license covers
this repository's code, not the game data it displays or the wiki content it links to.
