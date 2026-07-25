# DDO Bonus Stacking & Effect Resolution Rules

Reference for the Phase 6–8 stats/gear engine. This documents **how DDO's bonus
stacking works as a game system** — the facts our engine must implement — not any
particular implementation.

**Sources**: rules distilled (2026-07-25) from [Maetrim's DDOBuilderV2](https://github.com/Maetrim/DDOBuilderV2)
(the community-standard desktop planner) via [ddo-builds.com's open-source TS port](https://github.com/johngalt316/ddo-builds),
plus DDOBuilderV2's `BonusTypes.xml` bonus-type table. Game mechanics are facts and
not copyrightable; **no code or data files were copied** — see the licensing note in
[roadmap.md](roadmap.md) Phase 6. Spot-check disputed rules against
[ddowiki.com](https://ddowiki.com/page/Stacking) and in-game before hardening tests on them.

## The core model

Every stat contribution is a **bonus**: a numeric value with a **bonus type**
("Insight", "Enhancement", "Sacred", …), an optional **sub-target** (which ability,
which skill, which save), and a **source** (which feat/item/enhancement granted it).

Bonuses on the same stat **compete or stack based on their bonus type**:

1. **"Highest Only" types** — only the single largest *positive* bonus of that type
   applies; the rest are dominated (contribute nothing).
2. **"Always" types** — every bonus of that type sums.
3. **Untyped or unknown types** — treated as Always (fully stacks). Unknown types
   default to stacking, not competing.
4. **Penalties (negative values) always stack**, regardless of type, and don't
   compete with positive bonuses of the same type. A −2 Enhancement penalty applies
   even when a +8 Enhancement bonus wins its group.
5. **Different sub-targets never compete.** +2 Insight STR and +2 Insight DEX both
   apply; competition happens per (stat, target) pair.
6. **Zero-value bonuses** of a Highest-Only type apply nothing and can be marked
   as non-contributing.

## Bonus types (from DDOBuilderV2's `BonusTypes.xml`, U67-era)

**Highest Only** (compete within type):
Action Boost, Alchemical, Armor, Artifact, Base, Centered, Circumstance, Class,
Combat Style, Competence, Deflection, Determination, Divine, Elemental Energy
(+ Improved/Greater/Legendary variants), Elemental Spell Power (+ variants),
Enchantment, Enhancement, Epic, Equipment, Eternal Faith, Exceptional, False Life,
Feat, Festive, Fortune, Greater/Improved/Legendary prefixed variants, Guild,
Implement, Inherent, Insightful, Inspiration, Keen, Legendary, Level Up, Luck,
Morale, Music, Natural Armor, Not Set, Orb, Pirate, Primal, Profane, Psionic,
Quality, Racial, Rage, Resistance, Sacred, Shield, Silver Flame, Size, Special,
Spooky, Universal, Vitality, Weapon Enchantment

**Always** (stack freely):
Armor Enhancement, Destiny, Mythic, Penalty, Reaper, Shield Enhancement, Stacking,
Unique, Untyped, Weapon DR

Notes:
- `BonusTypes.xml` contains a near-duplicate `"Competence "` (trailing space) —
  normalize type strings (trim + case-fold) before lookup.
- The "Insightful"/"Quality"/"Exceptional" families are the classic gear-stacking
  tiers: an item can contribute one winner per type family to the same stat.

## Item vs non-item competition (DDOBuilderV2 modeling decision)

DDOBuilderV2 enforces Highest-Only competition **only between gear-sourced
bonuses** (item effects, augments, set bonuses, filigrees, and effects explicitly
flagged apply-as-item). Bonuses from feats, enhancements, destinies, and reaper
trees are allowed to stack even when they share a Highest-Only bonus type.

⚠ This is a *modeling* decision, not a documented game rule — in-game, same-typed
bonuses from non-gear sources generally also compete (e.g. two Insight bonuses to
the same stat from two enhancements don't stack). DDOBuilderV2 likely gets away
with it because the game data rarely hands out colliding types from non-gear
sources. **Decide deliberately in Phase 6** whether to mirror this split or apply
type competition uniformly; either way, encode the choice in tests.

## Percent bonuses

Some bonuses are percentages of the stat rather than flat values (e.g. +10% HP):

- Apply **all flat bonuses first**; percent bonuses then compute against the flat
  subtotal, not against each other's output.
- Percent bonuses still compete/stack by bonus type exactly like flat ones (two
  same-type percents → highest only, if the type is Highest Only).
- Round each percent contribution to an integer (DDO displays integer HP).

## Effects: how bonuses are generated

Game data attaches **effects** to feats/items/enhancements. One effect block can
fan out into many bonuses: it may list several stat types (MeleePower *and*
Doublestrike) and several sub-targets (STR *and* CON) — the engine emits one bonus
per (type, target) pair.

**Amount semantics** — an effect's value is computed by its amount type:

| Amount type | Value is | Per-rank? |
|---|---|---|
| Simple | fixed number | × ranks taken |
| Stacks | table indexed by ranks taken (1-based) | already encoded |
| TotalLevel | table indexed by character level | × stacks (e.g. 3× past life) |
| ClassLevel / BaseClassLevel / ClassCasterLevel | table indexed by levels in a named class | already encoded |
| AbilityValue / AbilityMod / HalfAbilityMod / ThirdAbilityMod | (fraction of) an ability score or its modifier, floor()ed | already encoded |
| BAB | the character's base attack bonus | already encoded |
| FeatCount | fixed number, only if a named feat is taken | already encoded |
| APCount | per-AP increment × AP spent in a named tree | already encoded |

- Ability modifier = `floor((score − 10) / 2)`; half/third variants floor again
  after dividing the modifier.
- **Min-rank riders**: an effect may fire only once a minimum rank is reached
  (e.g. a rank-3 rider); those are fixed one-shot values, *not* multiplied by ranks.

**Requirement gates** — effects can be conditional on: class levels (exact class
or base class, with minimums), total character level, race, a named feat being
taken, an active stance, trained skill ranks, BAB thresholds, and **weapon-group
membership** of the main-hand/off-hand weapon. Requirements come in all-of /
one-of / none-of groups. Two subtleties:

- Some weapon groups are *dynamic*: enhancements can add weapons to a group
  (e.g. Kensei Focus Weapon), so group membership must be computed in a pre-pass
  before gating other effects.
- Some stances are *automatic* (driven by the wielded weapon, not a user toggle)
  and must be synthesized before evaluation.
- Unknown requirement types should **pass** (show the bonus) rather than silently
  hide effects — matches DDOBuilderV2 behavior and keeps gaps visible.

## Derived-stat seeding

Stats start from a **seed** (pure progression math) and effect bonuses layer on top:

- **Ability scores**: seed = base (point buy) + racial modifiers; tomes and
  level-up points join the pipeline; effect bonuses compete by type on top.
- **HP**: seed = class hit dice; the CON contribution is added *after* the CON
  breakdown is final, so gear/augment CON bonuses flow into HP automatically.
  Reaper-only HP types apply only when reaper difficulty is active.
- **Saves**: seed = class progression + ability modifier; save bonuses may target
  a specific save or "All".
- "All"-targeted ability/save bonuses expand to every sub-target.
- Seeds don't compete with effect bonuses (treat as untyped), *except* ability
  scores where competition is the point of typed bonuses.

## Breakdown UX contract

Every contributor is kept and annotated — never discard dominated bonuses:
`applied: true/false`, and when dominated, *which source* won. This powers the
"+6 Enhancement (dominated by Epic Litany +8)" style breakdown rows and is the
main reason players trust a planner. Keep contributor ordering stable (sort by
source) so breakdowns are scannable and snapshot-testable.

## What our engine does differently

- Bonus data comes from our own `ddo.db` (wiki-scraped `{{Effect|magnitude|bonus-type}}`
  templates + `.dat` extraction), not DDOBuilderV2's XML. The `effects.modifier`
  column holds the bonus type — see the Phase 4c data-quality note about
  magnitudes currently landing in that column ([notes/DB Errors.md](notes/DB%20Errors.md)).
- Bonus-type names on the wiki ("Insightful", "Sacred", "Profane", …) match the
  `BonusTypes.xml` vocabulary; normalization (trim/case) belongs in the ETL, not
  the engine.
