# DDO Tools

A toolkit for Dungeons & Dragons Online (DDO) — character builds and gear planning.

This file is the instruction set for every coding agent working in the repo (Claude Code, Codex, and others that read `AGENTS.md`). `CLAUDE.md` is a symlink to it, so there is one source. Claude Code additionally loads the path-scoped rules under `.claude/rules/` when editing matching files; agents that don't support that should read those files directly when working in the areas they name.

## Quick Reference

```bash
# Frontend
npm run dev          # Dev server at http://localhost:5173/ (needs VITE_API_URL in .env, or the public API)
npm run build        # Production build
npm run lint         # ESLint, Stylelint, test type-check (tsconfig.test.json), knip dead code, Prettier check
npm run lint:fix     # Autofix all three; strips comments and docblocks, formats
npm run format       # Prettier
npx vitest run       # Unit and integration tests
```

## Orientation

Two repos, side by side under `~/Documents/Personal Projects/`:

|              | `ddo-tools` (this repo)                           | `ddo-data`                                                                                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What         | React SPA: the site users see                     | Rust workspace: ETL + the game-data API                                                                                                                                                                                                                                                                                                  |
| GitHub       | `WestonChan/ddo-tools`                            | `WestonChan/ddo-data`                                                                                                                                                                                                                                                                                                                    |
| Live         | https://ddo-tools.com                             | https://ddo-data.fly.dev (`/docs` is the OpenAPI UI)                                                                                                                                                                                                                                                                                     |
| Deploy       | Vercel GitHub integration on every push to `main` | GitHub Action `deploy.yml`: every push to `main` that changes more than Markdown, or manual dispatch; builds the DB and icons from the checked-in `data/` files (Maetrim's DDOBuilderV2 enters only through `ddo-etl import-ddobuilder`, see ddo-data's `docs/update-from-maetrim.md`), then `flyctl deploy`. Never `fly deploy` by hand |
| Instructions | this file                                         | `ddo-data/AGENTS.md`                                                                                                                                                                                                                                                                                                                     |

**Data flow.** DDOBuilderV2 XML → `ddo-etl` → SQLite (`ddo.db`, ~14 MB) → `ddo-api` (axum, read-only, immutable per deployment) → this app via `src/lib/api/` + TanStack Query. The frontend holds no game data and has no pipeline; the old Python `scripts/` package and `public/data/ddo.db` were removed in September 2026. `VITE_API_URL` picks the API origin; unset means the public Fly deployment.

**Running locally, end to end.**

1. On the Node major in `.nvmrc` (`fnm use` or `nvm use`), `npm install && npm run dev` — the site on http://localhost:5173/, reading the public API. That is enough for most frontend work. When another Node major is the one installed, prefix a script with `npx -y -p node@$(cat .nvmrc) --` (for example `npx -y -p node@$(cat .nvmrc) -- npm run lint`), or `npm install` prints `EBADENGINE` and tests run on an unsupported Node.
2. To run against a local API (schema changes, new endpoints): in `ddo-data`, `export PATH="/opt/homebrew/opt/rustup/bin:$PATH"`, build the DB with `cargo run --release -p ddo-etl -- build --source upstream/Output/DataFiles --out ddo.db`, serve it with `DDO_DB_PATH=ddo.db ICONS_DIR=icons PORT=8089 cargo run --release -p ddo-api`, and set `VITE_API_URL=http://localhost:8089` in this repo's `.env`. Docker is not installed on the maintainer's Mac; the image is CI-only.
3. `.env` is gitignored; `.env.example` lists every variable (`VITE_API_URL`, Sentry's `SENTRY_*`).

**Where things are.**

- `src/app/` — shell: `AppLayout`, `AppNavBar`, `BottomBar`, `routeComponents` (eager route views: landing, not found, placeholder views for unbuilt phases), `lazyRouteViews` (every feature view, loaded on demand from the feature's `lazyViews.ts`; see Loading in `docs/architecture.md`).
- `src/router.tsx`, `src/appPaths.ts` — TanStack Router tree and the path list.
- `src/features/resources/` — the game-data browser (the only feature reading the API today): `ResourcesView`, `components/` (picker, detail drawer, `detail/*`), `queries/items.ts` (fetchers + mappers) and `queries/useItems.ts` (query hooks), `itemSearch.ts` (Fuse index).
- `src/features/character/`, `landing/`, `settings/` — the other features (`gear/` arrives with Phase 8); `landing/data/sitePatchNotes.ts` is the user-facing changelog.
- `src/components/` — shared UI (`Modal`, `ErrorScreen`, `ApiGate`, `Tooltip`, `WikiLinkIcon`); `src/hooks/` — shared hooks; `src/lib/` — non-React helpers (`api/`, `sentry`, `githubIssue`, `wiki/`).
- `src/test/` — Vitest setup and helpers; `e2e/` — Playwright specs; `eslint-rules/` — the local no-comments rule.
- The [DDO Tools project](https://github.com/users/WestonChan/projects/2) — every open phase as an epic with its chunks, for both repos (see Planning); `docs/architecture.md` — the design record and spec, including the V-series that built `ddo-data`; `docs/notes/` — per-view backlogs; `docs/*.md` — reference (styling, testing, state management, stacking rules, Sentry, ddowiki).
- `.claude/rules/` — path-scoped conventions (frontend layout, testing). Gitignored, so present only on the maintainer's machine.
- `.claude/launch.json` — the `dev` (attach to a running server) and `dev-start` (launch `npm run dev`) preview configs.

**Status.** Not recorded in this file: read the project (see Planning). Its Ready column is the next work, and every open phase is an epic.

## Worktrees

More than one agent or session often works in this repo at once, so any change goes in a git worktree, never in someone else's checkout:

```bash
git worktree add -b <branch> /tmp/ddo-tools-<branch> main
ln -s "$(pwd)/node_modules" /tmp/ddo-tools-<branch>/node_modules   # run from the main checkout
```

The symlinked `node_modules` is enough for `npm run lint`, `npx vitest run`, `npm run build` and `npm run dev` (Vite picks the next free port when 5173 is taken). `.env` is not copied, so a worktree reads the public API; copy it in if you need a local one. When done: commit on the branch, fast-forward `main` from the main checkout (`git merge --ff-only <branch>`), push, then `git worktree remove /tmp/ddo-tools-<branch>` and delete the branch. Never run a bare `git stash`; the stash is shared across worktrees. `ddo-data` has the same rule with `DDO_UPSTREAM` in place of `node_modules`; see its `AGENTS.md`.

**Sandboxed implementers (Codex through `/wstack:orchestrate`)** use a shared clone instead of a worktree, because Codex's sandbox never writes a path named `.git` and so cannot commit in a worktree: `git clone --shared --separate-git-dir ~/.cache/ddo-tools-gitdirs/<branch> -b main "$(pwd)" /tmp/ddo-tools-<branch>` then `git -C /tmp/ddo-tools-<branch> checkout -b <branch>`, with the same `node_modules` symlink. The private git directory is the only git path the sandbox may write, so the main repository's refs and stash stay out of reach. Landing fetches the branch back into this checkout (`git fetch /tmp/ddo-tools-<branch> <branch>:<branch>`), fast-forwards `main`, pushes, then removes the clone and its git directory. Playwright inside that sandbox needs a browser outside it: start `npx playwright run-server --host 127.0.0.1 --port <port>` and set `PLAYWRIGHT_WS_ENDPOINT=ws://127.0.0.1:<port>/`, which `playwright.config.ts` honours.

## Project Structure

- **Stack** — React 19 + TypeScript + Vite + TanStack Query. `.nvmrc` is the one place the Node major is chosen: every CI job reads it, `engines.node` and `@types/node` follow it, and `src/test/nodeMajorAgreement.test.ts` fails when they disagree. The router basename comes from Vite's `BASE_URL` (`/` on Vercel).
- **App shell** — `src/app/` contains only components that appear on every page (root App, nav bar, bottom bar, loading gate, error boundary). The shell should still render with all features removed.
- **Feature modules** — domain features live under `src/features/`, each owning its own views, components, types, and CSS. See `.claude/rules/frontend.md` for the per-feature breakdown.
- **Shared frontend code** — non-feature code lives at the `src/` level (`src/components/`, `src/hooks/`, `src/stores/`).
- **Dependency direction** — imports flow downward only: `app/` → `features/` → shared. Shared code never imports from `features/` or `app/`; features never import from `app/` or each other.
- **Data flow** — the sibling `ddo-data` repo parses DDOBuilderV2's data files into SQLite and serves it as a read-only HTTP API (`ddo-api`, on Fly.io). The React app reads that API through `src/lib/api/` + TanStack Query; `VITE_API_URL` selects the deployment.
- **Hosting** — Vercel (static SPA, `vercel.json` rewrite). Every push to `main` deploys via Vercel's GitHub integration; CI on GitHub Actions only lints, tests, and builds.

## Planning

The [DDO Tools project](https://github.com/users/WestonChan/projects/2) is the single source of truth for what is planned, in progress and done, across `ddo-tools` and `ddo-data`. It holds one epic per phase (a parent issue labelled `epic`, titled like "Phase 4f — Categories") and each chunk of work as a sub-issue in the repo it touches, with blocked-by links where one piece waits on another. Board order is priority order, and the work to pick up next is in **Ready**. [`docs/architecture.md`](docs/architecture.md) is the design record and spec, not a tracker: what was decided and why, and the spec each epic links to.

- **Read it** before proposing a new feature, picking up work, or making non-trivial scope decisions: `gh project item-list 2 --owner WestonChan --format json` for the board, `gh issue view <number> -R WestonChan/<repo>` for an epic or chunk (its sub-issues, blocked-by links and spec link). Phase numbering and ordering are intentional.
- **Write to it** when new tasks, features, or phases are agreed with the user: `gh issue create -R WestonChan/<repo>`, as a sub-issue of its epic (a new epic for a new phase), added to the project. Don't create parallel planning docs, scratch TODO files, or TODO comments in code for work that belongs on the board. A task too small for a phase goes under the nearest existing epic.
- **Place every new issue in order; never leave it appended.** `gh project item-add` puts an issue at the bottom of the board, which reads as "last priority". Right after creating one, run `scripts/project-place.sh <repo> <issue> <repo> <issue to follow>` (it adds the issue to the project if needed), then set its status with `scripts/project-status.sh`.
  - **A fix or minor task spawned by the current work** goes **right after the current task**, so it is picked up next.
  - **Anything bigger** (a chunk of its own, or a new epic) needs the maintainer's choice of priority. Ask before placing it, and show where similarly sized tasks sit on the board: their issue numbers, titles and positions, so the choice is made against real neighbours.
  - Then confirm the position with `gh project item-list 2 --owner WestonChan --format json --limit 300`.
- **Move the status as the work moves.** Statuses are Backlog, Ready, In progress, Done. Set **In progress** when you start a chunk, and **Done** when it ships (closing the issue sets it). `scripts/project-status.sh <ddo-tools|ddo-data> <issue number> <status>` does it. The orchestrator runs it and reads the issue text, never a sandboxed implementer: Codex's sandbox cannot reach the private project, so the brief carries the issue's text.
- **Close the issue in the same commit that ships the work.** Put `Closes #N` (or `Closes WestonChan/ddo-data#N` for the other repo) in the commit message: a push to `main` closes the issue and the project moves it to Done. Close the epic once its last sub-issue is closed. Don't leave tracker cleanup as a follow-up commit.
- **Keep it current.** When scope changes mid-phase, edit the issue (or add one) rather than relying on memory or chat history.
- The plan files under `.claude/plans.local/` are scratch space for an individual planning session and are not a substitute for the board.

### Detailed task notes (`docs/notes/`)

`docs/notes/` holds long-form task notes for specific features/views, viewed in Obsidian. Use it when bullets would bloat an issue (deep nested lists, design exploration, per-feature backlogs). The project stays the source of truth for **what ships and when**; notes are detail the issues can link to.

- **One file per view/feature**, Title Case filename matching the view name (e.g., [`docs/notes/Resource View.md`](docs/notes/Resource%20View.md), [`docs/notes/Gear View.md`](docs/notes/Gear%20View.md)). Use [`docs/notes/To Do.md`](docs/notes/To%20Do.md) only for unscoped catch-all items.
- **Tag each phase-scoped bullet with its project phase (the epic's number)** (e.g., `🚧 Phase 4b — ...`, `📋 Phase 4c — ...`). Each notes file starts with a status legend; the canonical set is `✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · 🐛 bug`. Bullets that span multiple phases (e.g. comparison-view detail in [`docs/notes/Gear View.md`](docs/notes/Gear%20View.md)) get the most specific tag that applies. **You are free to add new icons to the legend** when a situation calls for one that doesn't exist yet (e.g., a `⚠ blocked` state, a `🔁 cleanup` category) — just add it to the legend at the top of the file alongside the others, define it in one short phrase, and use it consistently.
- **Issues should be terse and link out** to the matching note when detail lives there, rather than duplicating bullets in both places.
- **Prune notes in the same commit that ships the work**, same rule as the project — when a `🚧` bullet ships, mark it `✅` (or delete it). Don't let notes drift behind reality.
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
- **Requirements live in the structure.** When a requirement says two things must stay the same or agree (the detail pane and its hover card, a writer and its reader, a filter and its query parameter), build it so the code cannot express the violation, then add the check that fails if someone tries anyway: one declaration both sides render from, types whose shape says what may differ and what may not, a parity test that loops every case, a lint rule against the escape hatch. Sharing a component is not enough while it can still branch inside: the item detail card was one component, and its hover card drifted through inline `variant` checks and variant CSS that changed layout. A requirement that exists only in a brief, a doc or a test of one case is a wish; state the structure and the check that make it hold, unasked, whenever you design or brief work.
- **No comments, no docstrings.** Code carries its meaning in names, types, and tests, so a future agent reads it without any prose. Do not write inline comments, docblocks, JSDoc, Python docstrings, or per-parameter descriptions. If something seems to need a comment to be understood, that is the signal to rename, split, or restructure it until it doesn't. Reasoning that genuinely can't live in code (a decision, an external quirk, a rejected alternative) goes in `docs/` (usually `docs/architecture.md`) or the issue, not next to the code. Enforced by the local ESLint rule in `eslint-rules/no-comments.js`; `npm run lint:fix` strips offenders. Directive comments (`eslint-disable`, `@ts-expect-error`, `/// <reference>`) are the only survivors. Since names carry all the meaning, follow the naming rules below.

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
- **Never ignore lint or build output.** Run `npm run lint` and `npm run build` before every commit, and fix every error **and every warning** they print, including ones that were already there before your change. "It was already like that" is not a reason to leave it. The one exception is a warning a board issue already plans to fix: name that issue in your report. If no issue covers it, fix it now, or file one and place it on the board (see Planning) before you commit. A file a check can't parse, or that it skips, is not an exception either: add it to the check's scope, as `AGENTS.md` is in `format:check`.
- **Feature branches**: Implementation work happens on feature branches (e.g., `navigation-refactor`), then merges directly into `main` — fast-forward where possible, matching the linear history — after which the local branch is deleted. Feature branches stay local; only `main` is pushed. (The `Merge pull request #1`–`#4` commits are historical; work no longer routes through review-before-merge.)
- **Dependabot**: `.github/dependabot.yml` opens weekly PRs (Mondays, after a 7-day cooldown) for npm and GitHub Actions, minor and patch bumps grouped into one PR per ecosystem, majors separate except where packages must move together (`vite-and-vitest`, `eslint`). TypeScript majors are ignored until `typescript-eslint` supports them, and `@types/node` majors are ignored because the types follow the Node major CI and Vercel run: bump them by hand when that moves. Vercel skips `dependabot/**` branches (`vercel.json`); CI's Build job covers them. They are the one exception to local-only branches: merge one on GitHub once CI passes, then pull `main`. A major bump gets the same review as hand-written code.
- **Commit per step**: When following a multi-step implementation plan, each step gets its own commit. Don't batch unrelated changes.
- **Tests pass**: All existing tests must pass before committing. New pure logic (stats engine, validation, etc.) must include vitest unit tests.
- **Patch notes upkeep**: When user-visible changes (new features, UI changes, bug fixes that change behavior) ship, add an entry to [`src/features/landing/data/sitePatchNotes.ts`](src/features/landing/data/sitePatchNotes.ts). Either append a new dated entry (today's ship date in `YYYY-MM-DD`) or add a bullet to today's entry if one already exists. Keep bullets terse and imperative — match commit-subject voice. Skip purely-internal changes (refactors with no user-visible effect, comment-only edits, test-only changes).
- **Version bump before merging to `main`**: Every push to `main` ships a new site version, so before a branch merges into `main`, bump the `version` in [`package.json`](package.json) by one **patch** step (e.g. `0.0.4` → `0.0.5`) as part of the branch. The landing footer displays this version at build time. **Never bump the major version** — it stays `0` until the developer explicitly declares the site fully released; minor/major bumps happen only on the developer's explicit instruction.

## Reference Docs

Path-relevant docs (styling, testing) are surfaced by `.claude/rules/*.md` when editing matching files (automatically in Claude Code; read them yourself elsewhere). The docs below are not path-scoped — read them when the situation calls for it.

| Doc                                                | Read when                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/ddowiki-api.md`](docs/ddowiki-api.md)       | Looking up DDO game data from ddowiki.com via WebFetch, or building wiki links from the frontend. Also: what the AWS WAF blocks (relevant if the wiki parser is ever ported to `ddo-data`)                                                                                                                           |
| [`docs/naming.md`](docs/naming.md)                 | Naming or renaming anything: functions, variables, types, components, files' exports. How to choose a name, word order, and the rules both repos follow                                                                                                                                                              |
| [`docs/sentry.md`](docs/sentry.md)                 | Configuring Sentry, troubleshooting error capture, or working with `src/lib/sentry.ts`                                                                                                                                                                                                                               |
| [`docs/stacking-rules.md`](docs/stacking-rules.md) | Designing or implementing anything that computes stats from bonuses — the Phase 6–8 stats/gear engine, bonus stacking, effect resolution, or the stacking-semantics tooltip. Documents DDO's rules as game facts (sourced from DDOBuilderV2's model; see the licensing note under Phase 6 in `docs/architecture.md`) |
