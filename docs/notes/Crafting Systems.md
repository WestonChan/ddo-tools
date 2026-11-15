Status legend: ✅ done · 🚧 in this phase · 📋 planned (future phase, see tag) · ❌ won't do · ⚠ needs a decision or verdict before it can be fixed

How DDO's crafting and upgrade systems are modelled: the current state, and the decisions that
led to it. Decisions recorded 2026-08-03 (user-delegated, while landing Phase 4m slice 1b). The
shared model was built in ddo-data#66 (landed 2026-11-15, under the crafting epic ddo-data#72);
the per-system work is ddo-data#67 to #71. This file owns the reasoning. The file forms are in
ddo-data's `data/README.md` under "Crafting systems", and what the API serves is in ddo-data's
`docs/served-changes.md`.

## Current state — one shared model, filled from the wiki

The data lives in ddo-data's files and is served by its API. The three disconnected shapes this
file used to describe (sockets on items, augments as entities, prose `crafting_*` rows) are one
model now:

1. **Systems, stations, steps, recipes.** 53 crafting systems. A system links the stations it is
   crafted at (97 stations, each stored once), states what unlocks it (89 unlock lines), and
   breaks into steps (242). A step is the old "slot type": it names the socket label it fills, or
   none for a pure step such as Catalyst Crafting's "Item upgrade". Recipes (3,693) belong to a
   step.
2. **Costs are calculated.** A step holds the cost every recipe in it shares; a recipe holds only
   what is its own. The served cost is the step's lines plus the recipe's. A line names an
   ingredient or an item (The Blood Stone in a Catalyst recipe).
3. **Ingredients are shared.** 434 ingredients, one entry each, used by name from every system
   that needs them. When each system kept its own copy, the copies had drifted apart.
4. **Sockets and their choices.** A crafting socket on an item names a socket option set (521
   sets, each stored once and shared by the items that carry it). A socket label is filled by
   augments or by option sets, never both. 60 labels that are not crafting choices say why
   (a random roll, a mirror of another step).
5. **Sources.** 1,854 crafted-item sources: a crafted item is sourced to its crafting system, and
   takes the system's pack. No pack is stored on an item; packs through ingredients are
   ddo-data#83.

Not yet built: per-system tier properties and values (ddo-data#67 to #71), ingredient sources
(ddo-data#83), and everything the site shows from this (ddo-tools#86, ddo-tools#141).

## The decided target model

Constraint set by the user: **all crafting systems in one table set** — one schema expressive
enough to model how crafting works for each system; no per-system tables.

- ✅ **D-CS1 — One registry, one mechanics shape.** Built in ddo-data#66. Every system is a row
  in `crafting_systems`; every system's mechanics are
  **steps → choices (augments or a socket option set) → recipes (the costs)**. Systems differ in
  how their wiki pages were read, never in storage shape. The content came from wiki readers
  writing data files, not from per-system scrapers.
- ✅ **D-CS2 — Slot types are a first-class table.** Built as `crafting_steps`. A step's `slot`
  is the bridge to the item side: when a step shows as a socket on items it names the same
  `augment_slot_types` label the item's socket does; a pure step (Green Steel Tier 2, an item
  upgrade) has none.
- ✅ **D-CS3 — Pools resolve uniformly.** A socket's candidates are the augments of its label or
  the options of its socket option set; a label takes one or the other, checked at build. Recipes
  link to the augments or set options they make. Augments stay their own entity.
- ✅ **D-CS4 — Rebuild the content, don't repair it.** Done by the fill in ddo-data#66. The prose
  rows are gone, and the build rejects the old file forms by name.
- 📋 **D-CS5 — Deterministic upgrades are systems too, and no items are synthesized** (Phase 4h,
  ddo-data#69). The shape is proven: pure steps, recipes carrying the ingredient cost, options
  that grant sockets, and Vaults of the Artificers as a system with 364 recipes. Fountain of
  Necrotic Might and the epic altars follow in ddo-data#69. Upgrade *states* never become
  synthesized `items` rows.
- 📋 **D-CS6 — The augment-side tier split** (Phase 4h, ddo-data#67). Slave Lords has 91
  one-to-one augment pairs that differ only in amount between Heroic and Legendary
  (Intelligence +5 / +13); whether that is one augment whose value follows the item's grade is
  decided there.
- ✅ **D-CS7 — One socket table on the item side; ownership lives on the system side.** Held
  through ddo-data#66: colour and crafting sockets stay together and ordered on the item, and
  "which system owns this socket" is answered through the step that names the label. The
  re-open trigger (a system needing per-socket attributes) has not fired: the 21 Slave Lords
  named items use the crafted set-bonus socket of their grade, with the same choices as crafted
  items.
- ✅ **D-CS8 — No craftable flag on effects.** Held: an option's effects live on its socket
  option set, never as the item's own effects, so a Green Steel blank sums as a blank. The
  planner applies the player's crafted and socketed choices at compute time.
- ✅ **D-CS9 — Options can grant sockets, not just bonuses.** Built as grant rows for socket
  options and for augments (the growth path the decision named, not the single column), served
  as `grants_sockets`. An item's files hold only the sockets it has; a craftable socket is a
  choice the planner materializes.
- 📋 **D-CS10 — Cannith folds in last** (Phase 4h, ddo-data#71). The `crafting_enchantments`
  trio this decision described no longer exists; Cannith arrives on the shared model in
  ddo-data#71.

## Frontend deliverable (rides each system's slice)

📋 **Show craftable things on the Resources page** — as each system's pools land, item detail
lists what the item *can* craft (bonuses, candidate augments, slot grants), visually labeled as
craftable and never merged into the innate rows (D-CS8's invariant has a display half: a reader
must be able to tell what the item has from what it could have). Includes a styling pass on the
detail view — the socket pills, candidate dropdowns, and future craftable sections need a
coherent visual system rather than accreted one-off styles. Tracked as ddo-tools#86 and
ddo-tools#141.

- ✅ Candidate dropdowns show each augment's crafting recipes, one muted cost line per recipe (tier unless `any`, system, ingredient quantities), from `/v1/augments` `crafting` (shipped 2026-09-29, site 0.0.15).
- 📋 Phase 8 — A crafting cost line names an ingredient or an item, never both, so its ingredient name is empty on an item line; and a line's tier is the ingredient's, not the recipe's grade (ddo-tools#86 reads the new shape).

## Implementation order (each system = one verified slice)

1. **Slave Lords** (ddo-data#67) — proves the named-slot and heroic/legendary-grade path end to
   end.
2. **Green Steel / Legendary Green Steel** (ddo-data#68) — tier steps with choice pools and
   ingredient chains; biggest player demand.
3. **Fountain of Necrotic Might + epic altars + Vaults** (ddo-data#69) — deterministic upgrades
   (D-CS5).
4. Thunder-Forged, Alchemical, the rest (ddo-data#70).
5. Cannith fold-in (D-CS10, ddo-data#71).

- ✅ Phase 4h — A tier's base properties belong to the step, not to each option: every option in a step shares them. The model has the place for them (ddo-data#66); no step carries any yet, and Thunder-Forged, the worked case (every orb carries a tier-base Orb Bonus, +9/+10/+11/+12 while blocking; reader R14, ddo-data#46), fills it in ddo-data#70.
- 🐛 Thunder-Forged's Orb Bonus sits on the Blinding Fear option only, as Maetrim placed it, and our Tier 0 orb has none (R14). It moves to the step with ddo-data#70.

## ⚠ Still open (deliberately)

- Whether `item_augment_slots` deserves a rename to `item_sockets` now that socket option sets
  join through it — considered and deferred: churn across schema, queries and frontend with no
  behaviour change.
- What is socketed in a build is a *build* choice and belongs with stored builds, not the game
  data — unchanged by this design.
