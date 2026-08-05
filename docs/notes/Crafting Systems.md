Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · ⚠ needs a decision or verdict before it can be fixed

How DDO's crafting/upgrade systems are stored in `ddo.db` — the current state, and the decided
target model. Decisions recorded 2026-08-03 (user-delegated, while landing Phase 4m slice 1b);
implementation is the roadmap's **per-system crafting modeling** phase. The roadmap entry links
here; this file owns the detail.

## Current state — three disconnected shapes

1. **Sockets on items** — `item_augment_slots` (9,498 rows, slice 1b). Each row's `slot_id`
   references the **`augment_slot_types` definitions table** (40 rows: `label` UNIQUE — bare
   colours like `red`/`sun` or family labels like `lamordia: melancholic (weapon)` — decomposed
   into `family`/`variant`/`qualifier` columns). Labels composed in one function
   (`wiki/augment_slots.py::slot_label`) with an exact inverse; guarded by assertions A8/A8b/A8c
   and a recomposition property test. **Good.**
2. **Augments as entities** — `augments` (1,279) + `augment_bonuses` (1,197). `slot_color` speaks
   the same vocabulary, so socket → candidates is an FK join through `augment_slot_types` (the item-detail
   dropdowns). Gaps: 430 augments with no bonus rows; 109 carrying two tiers' magnitudes on one
   row (`augments.name` is UNIQUE, Heroic/Legendary pages share a name). **Good bones, known gaps.**
3. **The `crafting_*` tables** — 38 systems in `crafting_systems`, with `crafting_system_items`
   (644 links), `crafting_options` (+`_option_bonuses`), `crafting_recipes`
   (+`_recipe_ingredients`), `crafting_ingredients`, and a separate well-structured Cannith trio
   (`crafting_enchantments` / `_values` / `_slots`). The relational shape is right; the **content
   is a prose-section scrape**: option "names" hold sentences ("Located within the the Forsaken
   Temple…"), every option exists in 4 copies (no unique indexes — pre-4c builds appended), item
   links are spotty (Viktranium: 855 sockets stored, 0 items linked), and `{{CraftingEffects}}`
   (890 occurrences) has no consumer. **Scaffolding, not data.**

## The decided target model

Constraint set by the user: **all crafting systems in one table set** — one schema expressive
enough to model how crafting works for each system; no per-system tables.

- **D-CS1 — One registry, one mechanics shape, per-system scrapers.** Every system stays a row in
  `crafting_systems`; every system's mechanics are expressed as
  **slot types → options (the pool) → recipes (the costs)**. Systems differ in *scraper code*
  (each wiki page family needs its own parser — confirmed by how differently Slave Lords, Green
  Steel and Viktranium pages are written), never in *storage shape*.
- **D-CS2 — New `crafting_slot_types` table** — the missing first-class concept that
  `crafting_options.tier` (free TEXT) fakes today:
  `(id, system_id, name, slot_id INTEGER NULL REFERENCES augment_slot_types(id), sort_order)`.
  `slot_id` is the bridge to shape 1 (updated 2026-08-03, since `augment_slot_types` now exists):
  when a system's slot manifests as a socket on items it references the same definitions row the
  item's `item_augment_slots.slot_id` does; for pure tier steps (Green Steel Tier 2) it is NULL
  and participation flows through `crafting_system_items`.
  `crafting_options` gains `slot_type_id`; `tier` becomes display text or is dropped.
- **D-CS3 — Pools resolve uniformly.** A socket's candidates =
  `augments WHERE slot_id = ?` ∪ `crafting_options WHERE slot_type.slot_id = ?` — one definitions
  id, two backing tables, no hardcoded lists. Augments stay their own entity (they are inventory
  objects with icons/ML); options cover shards, tier choices, and upgrade grants.
- **D-CS4 — Rebuild the `crafting_*` content, don't repair it.** The prose rows are not worth
  migrating: each system's scraper writes clean rows into the shared shape; the 4× duplicates are
  dropped with their children, and the UNIQUE indexes land *after* the purge (they cannot be
  created over the copies — existing 4m bullet, absorbed here).
- **D-CS5 — Deterministic upgrades are systems too, and no items are synthesized.**
  `UpgradeableAugment` (Fountain of Necrotic Might), `UpgradeableItem` (Black Abbot / Stormreaver
  altars) and `VaultsOfTheArtificersUpgrade` tiers model as: a slot type per unlock
  (`primary`/`secondary`/`tier N`), a small option pool ("gain a Yellow/Blue/Red socket"), and a
  recipe carrying the ingredient cost (Epic Tapestry Shreds ×N). The item-side marker stays the
  potential effect (`Upgradeable Augment`) — the entity-vs-annotation question resolves as
  **annotation + system model**; upgrade *states* never become synthesized `items` rows (UNIQUE
  names, branching states vs the linear `item_upgrades` PK, search/audit pollution — analysis in
  [DB Errors](DB%20Errors.md)). `item_upgrades` keeps its one legitimate job: separately-paged
  heroic→epic→legendary variants.
- **D-CS6 — The augment-side tier split rides the same phase.** The 109 dual-magnitude augments
  want two rows (Heroic/Legendary); that means relaxing `idx_augments_name` to
  `(name, min_level)` when the augment scraper learns multi-version pages — decided here so the
  slice that does it doesn't re-litigate.
- **D-CS7 — One socket table on the item side; ownership lives on the system side.** Colour and
  crafting sockets stay together in `item_augment_slots`: a socket list is one *ordered* fact
  (real items interleave them — the Downcast Top Hat is `lamordia, lamordia, green, colorless,
  sun`), and "which system owns this socket" is answered by joining the label through
  `crafting_slot_types.slot_id` → `system_id`, not by splitting the item table.
  **Re-open trigger**: the first time a system needs *per-socket attributes* (an unlock state, a
  tier on the socket itself, a cost) — then crafting sockets earn their own table, because they
  would carry columns colour sockets never use. Nothing scraped so far does; Slaver's
  `(legendary)` grade fits inside the label.
- **D-CS8 — No craftable flag/FK on `bonuses` or `effects`.** Those tables hold deduplicated
  *definitions*; one `Charisma +5` row can be innate on an item, granted by an augment, and
  craftable in Cannith at once, so a flag on the row cannot be correct. Craftability is encoded
  by which junction references the definition (`crafting_option_bonuses`, `augment_bonuses`) —
  the junction *is* the flag, typed with the granting option/system. The invariant this protects:
  **items never store crafting-grantable bonuses as innate `item_bonuses`** — the stats engine
  sums innate rows, and the player's crafted/socketed choices are planner (user.db) state applied
  at compute time. A Green Steel blank must sum as a blank. (`Upgradeable Augment` complies: a
  valueless annotation effect, not a summable bonus.)
- **D-CS9 — Options can grant sockets, not just bonuses.** Several systems craft an augment slot
  *onto* the item (Slave Lords' "Augment slot" recipe, the epic altars, Vaults tier 3). The model
  expresses this as a nullable `grants_slot_id INTEGER REFERENCES augment_slot_types(id)` on
  `crafting_options` (updated 2026-08-03 from a label column, once the definitions table landed)
  — so a crafted socket resolves its candidate augments through exactly
  the join every innate socket uses. This extends D-CS8's invariant to sockets:
  `item_augment_slots` holds only the sockets the item's page declares **present**; a craftable
  socket is a system option the planner materializes when the player crafts it — an un-crafted
  item must show only the sockets it actually has. (It also reinforces D-CS7: once crafted, a
  socket is indistinguishable from an innate one, so splitting the socket table by origin would
  force the planner to merge sources for no gain.)
  **Not a flag, and not a `bonuses` row** (considered and rejected 2026-08-03): a boolean loses
  the socket's kind, while the definitions row carries all of it (family, variant, pool). And `bonuses` is
  the summable-stat table (`stat_id`/`type`/`value`) — a socket row there would make every stats
  -engine query exclude "bonuses that are secretly sockets" *by name* (the invariant-4 trap), and
  would bury the join key inside a name string. The item side already decided sockets are
  structural, not bonuses (`item_augment_slots`, not `item_bonuses`); the granting side agrees.
  Growth path if an option ever grants several sockets: the column becomes a
  `crafting_option_sockets` junction — nothing known needs it (Vaults grants one per tier,
  Slave Lords' recipe one).
- **D-CS10 — Cannith folds in last.** The `crafting_enchantments` trio is the best-structured
  per-system model in the DB today; it maps onto slot types (prefix/suffix/extra ×
  equipment-slot) + ML-parameterized options, but folding it is pure motion until the shared
  shape is proven on 2–3 systems. Keep it working as-is; fold when the shape has earned it.

## Frontend deliverable (rides each system's slice)

📋 **Show craftable things on the Resources page** — as each system's pools land, item detail
lists what the item *can* craft (bonuses, candidate augments, slot grants), visually labeled as
craftable and never merged into the innate rows (D-CS8's invariant has a display half: a reader
must be able to tell what the item has from what it could have). Includes a styling pass on the
detail view — the socket pills, candidate dropdowns, and future craftable sections need a
coherent visual system rather than accreted one-off styles.

## Suggested implementation order (each system = one scraper + one verified slice)

1. **Slave Lords** — sockets already stored (slice 1b), pages are structured shard tables, and it
   proves the named-slot + heroic/legendary-grade path end-to-end (empty dropdowns become real).
2. **Green Steel / Legendary Green Steel** — proves tier steps with choice pools and ingredient
   chains; biggest player demand.
3. **Fountain of Necrotic Might + epic altars + Vaults** — proves D-CS5 (deterministic upgrades)
   and retires the `UpgradeableItem` raw-name rows.
4. Thunder-Forged, Alchemical, the rest — same shapes, more scrapers.
5. Cannith fold-in (D-CS10).

## ⚠ Still open (deliberately)

- Whether `item_augment_slots` deserves a rename to `item_sockets` once non-augment pools join
  through it — considered and deferred: churn across schema/queries/frontend with no behaviour
  change; revisit when a non-augment pool first lands.
- `item_augment_slots.augment_id` (what is socketed) is a *build* choice and likely moves to
  `user.db` — existing 4m audit item, unchanged by this design.
