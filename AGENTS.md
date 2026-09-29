# DDO Tools

A toolkit for Dungeons & Dragons Online (DDO) — character builds and gear planning.

This file is the instruction set for every coding agent working in the repo (Claude Code, Codex, and others that read `AGENTS.md`). `CLAUDE.md` is a symlink to it, so there is one source. Claude Code additionally loads the path-scoped rules under `.claude/rules/` when editing matching files; agents that don't support that should read those files directly when working in the areas they name.

## Quick Reference

```bash
# Frontend
npm run dev          # Dev server at http://localhost:5173/ (needs VITE_API_URL in .env, or the public API)
npm run build        # Production build
npm run lint         # ESLint (local rules, import direction, naming shape), Stylelint (tokens, no drop shadows), Prettier check
npm run lint:fix     # Autofix all three; strips comments and docblocks, formats
npm run format       # Prettier
npx vitest run       # Unit and integration tests
```

## Orientation

Two repos, side by side under `~/Documents/Personal Projects/`:

| | `ddo-tools` (this repo) | `ddo-data` |
|---|---|---|
| What | React SPA: the site users see | Rust workspace: ETL + the game-data API |
| GitHub | `WestonChan/ddo-tools` | `WestonChan/ddo-data` |
| Live | https://ddo-tools.vercel.app | https://ddo-data.fly.dev (`/docs` is the OpenAPI UI) |
| Deploy | Vercel GitHub integration on every push to `main` | GitHub Action `deploy.yml`: weekly schedule or manual dispatch; builds the DB from Maetrim's DDOBuilderV2 checkout, then `flyctl deploy`. Never `fly deploy` by hand |
| Instructions | this file | `ddo-data/AGENTS.md` |

**Data flow.** DDOBuilderV2 XML → `ddo-etl` → SQLite (`ddo.db`, ~14 MB) → `ddo-api` (axum, read-only, immutable per deployment) → this app via `src/lib/api/` + TanStack Query. The frontend holds no game data and has no pipeline; the old Python `scripts/` package and `public/data/ddo.db` were removed in September 2026. `VITE_API_URL` picks the API origin; unset means the public Fly deployment.

**Running locally, end to end.**

1. `npm install && npm run dev` — the site on http://localhost:5173/, reading the public API. That is enough for most frontend work.
2. To run against a local API (schema changes, new endpoints): in `ddo-data`, `export PATH="/opt/homebrew/opt/rustup/bin:$PATH"`, build the DB with `cargo run --release -p ddo-etl -- build --source upstream/Output/DataFiles --out ddo.db`, serve it with `DDO_DB_PATH=ddo.db ICONS_DIR=icons PORT=8089 cargo run --release -p ddo-api`, and set `VITE_API_URL=http://localhost:8089` in this repo's `.env`. Docker is not installed on the maintainer's Mac; the image is CI-only.
3. `.env` is gitignored; `.env.example` lists every variable (`VITE_API_URL`, Sentry's `SENTRY_*`).

**Where things are.**

- `src/app/` — shell: `AppLayout`, `AppNavBar`, `BottomBar`, `routeComponents` (one export per route; placeholder views for unbuilt phases).
- `src/router.tsx`, `src/appPaths.ts` — TanStack Router tree and the path list.
- `src/features/resources/` — the game-data browser (the only feature reading the API today): `ResourcesView`, `components/` (picker, detail drawer, `detail/*`), `queries/items.ts` (fetchers + mappers) and `queries/useItems.ts` (query hooks), `itemSearch.ts` (Fuse index).
- `src/features/character/`, `gear/`, `landing/`, `settings/` — the other features; `landing/data/sitePatchNotes.ts` is the user-facing changelog.
- `src/components/` — shared UI (`Modal`, `ErrorScreen`, `ApiGate`, `Tooltip`, `WikiLinkIcon`); `src/hooks/` — shared hooks; `src/lib/` — non-React helpers (`api/`, `sentry`, `githubIssue`, `wiki/`).
- `src/test/` — Vitest setup and helpers; `e2e/` — Playwright specs; `eslint-rules/` — the local no-comments rule.
- `docs/roadmap.md` — every phase, past and planned, including the V-series that built `ddo-data`; `docs/notes/` — per-view backlogs; `docs/*.md` — reference (styling, testing, state management, stacking rules, Sentry, ddowiki).
- `.claude/rules/` — path-scoped conventions (frontend layout, testing). Gitignored, so present only on the maintainer's machine.
- `.claude/launch.json` — the `dev` (attach to a running server) and `dev-start` (launch `npm run dev`) preview configs.

**Status.** Phases 1–4c and V1–V6 are done. V7 (wiki gap-fill: quest loot rarity, quests and crafting read from ddowiki into ETL overrides) is next, then V8 (build sharing on a Fly volume, `/v1/builds`), then Phases 4d–4g and 5 onward. The roadmap's status table is authoritative.

## Project Structure

- **Stack** — React 19 + TypeScript + Vite + TanStack Query. The router basename comes from Vite's `BASE_URL` (`/` on Vercel).
- **App shell** — `src/app/` contains only components that appear on every page (root App, nav bar, bottom bar, loading gate, error boundary). The shell should still render with all features removed.
- **Feature modules** — domain features live under `src/features/`, each owning its own views, components, types, and CSS. See `.claude/rules/frontend.md` for the per-feature breakdown.
- **Shared frontend code** — non-feature code lives at the `src/` level (`src/components/`, `src/hooks/`, `src/stores/`).
- **Dependency direction** — imports flow downward only: `app/` → `features/` → shared. Shared code never imports from `features/` or `app/`; features never import from `app/` or each other.
- **Data flow** — the sibling `ddo-data` repo parses DDOBuilderV2's data files into SQLite and serves it as a read-only HTTP API (`ddo-api`, on Fly.io). The React app reads that API through `src/lib/api/` + TanStack Query; `VITE_API_URL` selects the deployment.
- **Hosting** — Vercel (static SPA, `vercel.json` rewrite). Every push to `main` deploys via Vercel's GitHub integration; CI on GitHub Actions only lints, tests, and builds.

## Roadmap

[`docs/roadmap.md`](docs/roadmap.md) is the single source of truth for project organization. Architecture decisions, feature specs, and the phased implementation plan all live there.

- **Read it** before proposing a new feature, picking up the next phase, or making non-trivial scope decisions. Phase numbering and ordering are intentional.
- **Write to it** when new tasks, features, or phases are agreed with the user. Don't create parallel planning docs, scratch TODO files, or sprinkle TODO comments in code for work that belongs on the roadmap. If a task is too small for a phase, append it to the relevant existing phase.
- **Keep it current** — when a phase ships, mark it done (see existing `(done)` markers, e.g. Phase 1, Phase 2, Phase 3). When scope changes mid-phase, update the phase rather than relying on memory or chat history.
- **Update the roadmap in the same commit that ships the work.** When a commit implements a roadmap entry, remove the bullet (or mark the phase `(done)`) as part of that same commit so the roadmap never lags behind reality. Don't leave roadmap cleanup as a follow-up commit.
- The plan files under `.claude/plans.local/` are scratch space for an individual planning session and are not a substitute for the roadmap.

### Detailed task notes (`docs/notes/`)

`docs/notes/` holds long-form task notes for specific features/views, viewed in Obsidian. Use it when bullets would bloat the roadmap (deep nested lists, design exploration, per-feature backlogs). The roadmap stays the source of truth for **what ships and when**; notes are detail scratch the roadmap can link to.

- **One file per view/feature**, Title Case filename matching the view name (e.g., [`docs/notes/Resource View.md`](docs/notes/Resource%20View.md), [`docs/notes/Gear View.md`](docs/notes/Gear%20View.md)). Use [`docs/notes/To Do.md`](docs/notes/To%20Do.md) only for unscoped catch-all items.
- **Tag each phase-scoped bullet with its roadmap phase** (e.g., `🚧 Phase 4b — ...`, `📋 Phase 4c — ...`). Each notes file starts with a status legend; the canonical set is `✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug`. Bullets that span multiple phases (e.g. comparison-view detail in [`docs/notes/Gear View.md`](docs/notes/Gear%20View.md)) get the most specific tag that applies. **You are free to add new icons to the legend** when a situation calls for one that doesn't exist yet (e.g., a `⚠ blocked` state, a `🔁 cleanup` category) — just add it to the legend at the top of the file alongside the others, define it in one short phrase, and use it consistently.
- **Roadmap entries should be terse and link out** to the matching note when detail lives there, rather than duplicating bullets in both places.
- **Prune notes in the same commit that ships the work**, same rule as the roadmap — when a `🚧` bullet ships, mark it `✅` (or delete it). Don't let notes drift behind reality.
- **Plain markdown only** (Obsidian renders these). No fenced HTML, no JSX, no code-as-prose tricks. Wikilinks (`[[Resource View]]`) are fine if useful.
- **`Developer Notes:` block at the bottom** — the user occasionally appends a freeform `Developer Notes:` (or `## Developer Notes`) section at the bottom of a note file as inbox-style raw thoughts. When you encounter one: read every line, fold each item into the appropriate phase-tagged bullet in the structured section above (creating new bullets with the right `🚧 Phase N…` / `⏭ Phase N…` prefix as needed), then **delete the `Developer Notes:` block** in the same edit. If an item is genuinely unscoped, move it into [`docs/notes/To Do.md`](docs/notes/To%20Do.md) rather than leaving it loose. If an item is ambiguous (you can't tell which phase it belongs to or which existing bullet it refines), ask the user before integrating — don't guess.
- **Notes are not a substitute for `.claude/plans.local/`** — plan files there remain per-session scratch for an individual planning session; notes in `docs/notes/` are durable, feature-scoped backlogs.

## Working directory

The agent's cwd is already the project root (`ddo-tools`). **Do not `cd` into it.** Don't prefix bash commands with `cd "/Users/.../ddo-tools" && ...`. Use relative paths (preferred) or absolute paths directly.

If you genuinely need to run a command from a subdirectory, use `cd subdir && ...` for that single command — don't `cd` to the project root, you're already there.

## Code Quality

- **Keep code clean.** When working in a file, improve adjacent code that is messy, inconsistent, or overly complex. Don't leave a file worse than you found it.
- **Refactor freely.** Extract shared logic, simplify conditionals, improve naming, remove dead code. If a refactor makes the code meaningfully better, do it — don't wait to be asked. Follow refactors wherever they lead; don't artificially limit scope.
- **Turn findings into lint rules.** When you fix or review a problem a machine could have caught (a convention broken in more than one place, a bug pattern, a rule in these docs or `.claude/rules/` that nothing enforces), suggest a check that `npm run lint` runs so it can't come back: name the rule or tool, say what it would flag today, and include it in your final report. Add it yourself when it's cheap and uses an ESLint core or `typescript-eslint` rule already installed; a new package needs the maintainer's approval first.
- **No comments, no docstrings.** Code carries its meaning in names, types, and tests, so a future agent reads it without any prose. Do not write inline comments, docblocks, JSDoc, Python docstrings, or per-parameter descriptions. If something seems to need a comment to be understood, that is the signal to rename, split, or restructure it until it doesn't. Reasoning that genuinely can't live in code (a decision, an external quirk, a rejected alternative) goes in `docs/` or the roadmap, not next to the code. Enforced by the local ESLint rule in `eslint-rules/no-comments.js`; `npm run lint:fix` strips offenders. Directive comments (`eslint-disable`, `@ts-expect-error`, `/// <reference>`) are the only survivors. Since names carry all the meaning, follow the naming rules below.

### Naming

Names replace comments, so each name must answer the question a reader would otherwise ask. **Before naming or renaming anything, read [`docs/naming.md`](docs/naming.md).** It covers how to choose a name, with examples and sources, and applies to both repos. Existing code predates it and is not a model to copy; rename what you touch. The rules in short:

- **Choose, don't guess.** List the concepts the name must carry, pick one word per concept (the player's word, the same word the schema and API use), put them in English order (`maximumMessageLength`, `totalStrength`, `cooldownMs`), then read the call site on its own.
- **Code that changes data** is an imperative verb phrase naming what it changes, or why: `equipItem`, `clampToStatCap`. Never `update`, `process` or `handle`. A name that needs "and" means the function should be split.
- **Code that only reads, and every value,** is a noun phrase naming what it is or what it's for, often through the process that made it: `sortedItems`, `itemsToShow`. Reads have no side effects.
- **Types are nouns**: the domain word if one exists (`Race`, `Augment`, `EquipmentSlot`), otherwise the role the thing plays. No `Manager`, `Helper`, `Info` or `Data`, and no type encoded in the name.
- **A name means only one thing.** Qualify generic words (`slot`, `candidate`, `entry`, `option`, `source`) until only one reading is left. Add words that remove ambiguity and drop words that repeat the type or the owner.
- **Name length follows scope**: short names only for values that live 10 lines or fewer. Shared code gets a capability name, not a name from its first caller's point of view. Spell words out and write acronyms as words (`loadHttpUrl`).

## Testing

`npx vitest run` must pass before committing. The ETL and API have their own suites in the `ddo-data` repo (`cargo test`).

### Test-driven development

Write tests **before** the code they cover. The required loop:

1. **Write a failing test** that captures the new behavior or reproduces the bug.
2. **Run the test and confirm it fails** for the expected reason — not a syntax error, not a missing import. Quote the failure in your response so it's clear the test actually exercised the gap.
3. **Write the minimum code** needed to make the test pass.
4. **Run the test and confirm it passes.** Then run the full suite (`npx vitest run`) to confirm nothing else broke.
5. **Refactor** if needed, keeping tests green.

This applies to new hooks/components with logic, bug fixes, and behavior changes. It does **not** apply to:
- Pure refactors that don't change behavior (existing tests must still pass).
- Presentational components with no logic.
- Doc, config, or styling-only changes.

If a test is hard to write before the code, that's a signal the design is unclear — pause and clarify the contract before implementing. Don't write the code first and back-fill the test; that produces tests that mirror the implementation rather than the intent.

Test conventions (where tests live, what to test, mocking patterns) are in `.claude/rules/testing.md`; read it when editing test files.

## Commits

- **Atomic commits**: Each commit is a single logical change that passes lint (`npm run lint`) and builds (`npm run build`). No broken intermediate states.
- **Feature branches**: Implementation work happens on feature branches (e.g., `navigation-refactor`), then merges directly into `main` — fast-forward where possible, matching the linear history — after which the local branch is deleted. Feature branches stay local; only `main` is pushed. (The `Merge pull request #1`–`#4` commits are historical; work no longer routes through review-before-merge.)
- **Commit per step**: When following a multi-step implementation plan, each step gets its own commit. Don't batch unrelated changes.
- **Tests pass**: All existing tests must pass before committing. New pure logic (stats engine, validation, etc.) must include vitest unit tests.
- **Patch notes upkeep**: When user-visible changes (new features, UI changes, bug fixes that change behavior) ship, add an entry to [`src/features/landing/data/sitePatchNotes.ts`](src/features/landing/data/sitePatchNotes.ts). Either append a new dated entry (today's ship date in `YYYY-MM-DD`) or add a bullet to today's entry if one already exists. Keep bullets terse and imperative — match commit-subject voice. Skip purely-internal changes (refactors with no user-visible effect, comment-only edits, test-only changes).
- **Version bump before merging to `main`**: Every push to `main` ships a new site version, so before a branch merges into `main`, bump the `version` in [`package.json`](package.json) by one **patch** step (e.g. `0.0.4` → `0.0.5`) as part of the branch. The landing footer displays this version at build time. **Never bump the major version** — it stays `0` until the developer explicitly declares the site fully released; minor/major bumps happen only on the developer's explicit instruction.

## Reference Docs

Path-relevant docs (styling, testing) are surfaced by `.claude/rules/*.md` when editing matching files (automatically in Claude Code; read them yourself elsewhere). The docs below are not path-scoped — read them when the situation calls for it.

| Doc | Read when |
|-----|-----------|
| [`docs/ddowiki-api.md`](docs/ddowiki-api.md) | Looking up DDO game data from ddowiki.com via WebFetch, or building wiki links from the frontend. Also: what the AWS WAF blocks (relevant if the wiki parser is ever ported to `ddo-data`) |
| [`docs/naming.md`](docs/naming.md) | Naming or renaming anything: functions, variables, types, components, files' exports. How to choose a name, word order, and the rules both repos follow |
| [`docs/sentry.md`](docs/sentry.md) | Configuring Sentry, troubleshooting error capture, or working with `src/lib/sentry.ts` |
| [`docs/stacking-rules.md`](docs/stacking-rules.md) | Designing or implementing anything that computes stats from bonuses — the Phase 6–8 stats/gear engine, bonus stacking, effect resolution, or the stacking-semantics tooltip. Documents DDO's rules as game facts (sourced from DDOBuilderV2's model; see the licensing note in roadmap Phase 6) |
