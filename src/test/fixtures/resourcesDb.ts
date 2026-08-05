import initSqlJs, { type Database } from 'sql.js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Test-only: spin up an in-memory sql.js DB whose SCHEMA is read from the
// real shipped database (public/data/ddo.db) and whose DATA is hand-written.
//
// The schema is generated, not copied, so it cannot drift: seedTestDb
// executes the shipped DB's own CREATE TABLE statements (verified
// byte-identical by schemaCompat.test.ts). That also means the real CHECK
// and NOT NULL constraints apply to the fixture rows — the previous
// hand-copied "slimmed" DDL silently allowed data that cannot exist in
// production (item_category 'Greatsword', handedness 'Two-Handed',
// stats rows without a category).
//
// The data stays hand-written on purpose: fixture rows are stable across DB
// rebuilds and make edge cases (NULL bonus types, multi-pack items, negative
// values) visible in this file. Tests that need REAL data use openProjectDb.
//
// Lives under `src/test/fixtures/` so the boundary between production code
// and test-only helpers stays explicit.

// The tables the resources query layer touches. Growing the query surface
// into a new table? Add it here and schemaCompat.test.ts keeps it honest.
const FIXTURE_TABLES = [
  'items',
  'item_weapon_stats',
  'item_armor_stats',
  'item_augment_slots',
  'item_upgrades',
  'augment_slot_types',
  'augments',
  'augment_bonuses',
  'bonus_types',
  'stats',
  'bonuses',
  'item_bonuses',
  'effects',
  'item_effects',
  'spells',
  'item_spell_links',
  'adventure_packs',
  'patrons',
  'quests',
  'quest_loot',
] as const

const FIXTURE_DATA = `
INSERT INTO items (id, name, rarity, equipment_slot, item_category, level, minimum_level, material, binding, base_value, tooltip, icon, description, wiki_url) VALUES
  (1, 'Greatsword of Force', 'Rare', 'Weapon', 'Weapon', 12, 12, 'Steel', 'Bound to Character on Acquire', '480 pp', 'Strikes with arcane force.', 'Greatsword.png', 'A force-imbued greatsword.', 'https://ddowiki.com/page/Greatsword_of_Force'),
  (2, 'Sigil of the Stalwart Defender', 'Epic', 'Trinket', 'Jewelry', 29, 29, NULL, 'Bound to Account on Acquire', '5800 pp', NULL, 'Sigil.png', 'A defender''s mark.', 'https://ddowiki.com/page/Sigil_of_the_Stalwart_Defender'),
  (3, 'Robe of Force Resistance', 'Uncommon', 'Body', 'Clothing', 8, 8, 'Cloth', NULL, '120 pp', 'A simple robe.', 'Robe.png', 'A simple robe.', 'https://ddowiki.com/page/Robe_of_Force_Resistance'),
  (4, '50% Discount Voucher', 'Common', NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO item_weapon_stats (item_id, damage, critical, weapon_type, proficiency, handedness) VALUES
  (1, '2d6', '19-20/x2', 'Greatsword', 'Martial', 'Two-handed');

INSERT INTO item_armor_stats (item_id, armor_bonus, max_dex_bonus) VALUES
  (3, 0, NULL);

INSERT INTO item_upgrades (item_id, base_item_id, upgrade_tier) VALUES
  (2, 2, 2);

INSERT INTO bonus_types (id, name) VALUES
  (1, 'Enhancement'),
  (2, 'Insight');

INSERT INTO stats (id, name, category) VALUES
  (1, 'Charisma', 'ability'),
  (2, 'Heal Amplification', 'magical');

INSERT INTO bonuses (id, name, description, stat_id, bonus_type_id, value) VALUES
  (1, 'Charisma +5', 'Enhancement bonus to Charisma', 1, 1, 5),
  (2, 'Force Damage +2d6', 'Force damage on hit', NULL, NULL, 2),
  (3, 'Heal Amplification +20', 'Healing amplification bonus', 2, 2, 20);

INSERT INTO item_bonuses (item_id, bonus_id, sort_order) VALUES
  (1, 2, 0),
  (2, 1, 0),
  (2, 3, 1);

INSERT INTO effects (id, name, modifier) VALUES
  (1, 'Vorpal', NULL),
  (2, 'Bane', 'Outsider, Evil');

INSERT INTO item_effects (item_id, effect_id, value, sort_order) VALUES
  (1, 1, NULL, 0),
  (1, 2, 4, 1);

INSERT INTO spells (id, name) VALUES
  (10, 'Cure Moderate Wounds');

INSERT INTO item_spell_links (item_id, spell_id, charges) VALUES
  (2, 10, 3);

INSERT INTO adventure_packs (id, name) VALUES
  (1, 'Mists of Ravenloft');

INSERT INTO patrons (id, name) VALUES
  (1, 'Keepers of Barovia');

INSERT INTO quests (id, name, pack_id, patron_id, level, zone) VALUES
  (1, 'Sealed in Amber', 1, 1, 11, 'Barovia'),
  (2, 'The Master Artificer', 1, 1, 30, 'Cannith');
`

// quest_loot rows are seeded per schema vintage — the current shape has
// loot_type, the frozen baseline doesn't. Everything in FIXTURE_DATA above
// is baseline-compatible; if a future fixture row ever needs a post-baseline
// column, seedBaselineDb will fail loudly at seed time — branch that insert
// the same way rather than touching baselineSchema.sql.
//
// Item 2 is chest loot; item 1 is raid loot, so listItems' is_raid flag and
// the picker's "Raid only" filter both have something to exercise. Item 1's
// mapping is also flagged rare, matching its item-level rarity, so the
// "(rare)" marker in "Drops from" has something to render.
const CURRENT_QUEST_LOOT_DATA = `
INSERT INTO quest_loot (quest_id, item_id, loot_type, is_rare) VALUES
  (1, 2, 'chest', 0),
  (2, 1, 'raid', 1);
`

const BASELINE_QUEST_LOOT_DATA = `
INSERT INTO quest_loot (quest_id, item_id) VALUES
  (1, 2),
  (2, 1);
`

// The augment-slot vocabulary and everything that points at it. Definitions are
// restricted to rows the pipeline's decoder could produce (lower-case labels,
// family/variant/qualifier agreeing with the label) — validation assertion A8
// fails the build on anything else, so a fixture outside the vocabulary would
// test a state production cannot reach.
//
// Item 2 carries one of each shape the detail view renders differently: plain
// colour, sun, a crafting family, and a Slaver's socket that has no candidate
// augments by design. The bonus-less Solar Gem is not padding either — 430 of
// 1,279 shipped augments have no augment_bonuses rows yet, so a name-only
// dropdown row is a state the view must render.
//
// Current-schema only: the frozen baseline predates augment_slot_types and the
// augments tables entirely, which is exactly why the queries reading them need
// their REQUIRED_COLUMNS entries.
const CURRENT_AUGMENT_DATA = `
INSERT INTO augment_slot_types (id, label, family, variant, qualifier) VALUES
  (1, 'yellow', 'standard', 'yellow', NULL),
  (2, 'colorless', 'standard', 'colorless', NULL),
  (3, 'blue', 'standard', 'blue', NULL),
  (4, 'sun', 'standard', 'sun', NULL),
  (5, 'moon', 'standard', 'moon', NULL),
  (6, 'lamordia: melancholic (accessory)', 'lamordia', 'melancholic', 'accessory'),
  (7, 'slaver''s: prefix (legendary)', 'slavers', 'prefix', 'legendary');

INSERT INTO item_augment_slots (item_id, sort_order, slot_id) VALUES
  (1, 0, 1),
  (2, 0, 2),
  (2, 1, 3),
  (2, 2, 4),
  (2, 3, 6),
  (2, 4, 7);

INSERT INTO augments (id, name, slot_id, slot_color, min_level) VALUES
  (1, 'Melancholic Charisma', 6, 'lamordia: melancholic (accessory)', 8),
  (2, 'Melancholic Healing Amplification', 6, 'lamordia: melancholic (accessory)', 8),
  (3, 'Solar Gem of Abjuration (Heroic)', 4, 'sun', 1),
  (4, 'Lunar Gem of Deflection (Heroic)', 5, 'moon', 1);

INSERT INTO augment_bonuses (augment_id, bonus_id, sort_order) VALUES
  (1, 1, 0),
  (2, 3, 0);
`

// The same sockets in the pre-definitions-table shape, so seedBaselineDb keeps
// modelling a real old database rather than one with an empty junction table.
const BASELINE_AUGMENT_SLOT_DATA = `
INSERT INTO item_augment_slots (item_id, sort_order, slot_type) VALUES
  (1, 0, 'yellow'),
  (2, 0, 'colorless'),
  (2, 1, 'blue'),
  (2, 2, 'sun'),
  (2, 3, 'lamordia: melancholic (accessory)'),
  (2, 4, 'slaver''s: prefix (legendary)');
`

let _wasmBinary: ArrayBuffer | null = null
function loadWasm(): ArrayBuffer {
  if (_wasmBinary) return _wasmBinary
  // Resolve sql.js's wasm relative to its package entry — works regardless of
  // monorepo / workspace nesting. From `src/test/fixtures/`, the project
  // root is three levels up.
  const here = dirname(fileURLToPath(import.meta.url))
  const wasmPath = resolve(
    here,
    '..',
    '..',
    '..',
    'node_modules',
    'sql.js',
    'dist',
    'sql-wasm.wasm',
  )
  const buf = readFileSync(wasmPath)
  // initSqlJs's `wasmBinary` typing wants an ArrayBuffer, not a Node Buffer.
  // Slice off Buffer's view to get a plain ArrayBuffer of the same bytes.
  _wasmBinary = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  return _wasmBinary
}

let _SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null
async function getSQL(): Promise<Awaited<ReturnType<typeof initSqlJs>>> {
  if (_SQL) return _SQL
  _SQL = await initSqlJs({ wasmBinary: loadWasm() })
  return _SQL
}

function projectDbPath(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, '..', '..', '..', 'public', 'data', 'ddo.db')
}

// CREATE TABLE statements for FIXTURE_TABLES, read once from the shipped DB.
let _fixtureDdl: string | null = null
async function loadFixtureDdl(): Promise<string> {
  if (_fixtureDdl !== null) return _fixtureDdl
  const SQL = await getSQL()
  const real = new SQL.Database(readFileSync(projectDbPath()))
  try {
    const placeholders = FIXTURE_TABLES.map(() => '?').join(', ')
    const result = real.exec(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`,
      [...FIXTURE_TABLES],
    )
    const statements = result[0]?.values.map((row) => String(row[0])) ?? []
    if (statements.length !== FIXTURE_TABLES.length) {
      throw new Error(
        `Expected ${FIXTURE_TABLES.length} fixture tables in public/data/ddo.db, ` +
          `found ${statements.length} — did a table get renamed?`,
      )
    }
    _fixtureDdl = statements.map((s) => `${s};`).join('\n')
    return _fixtureDdl
  } finally {
    real.close()
  }
}

export async function seedTestDb(): Promise<Database> {
  const SQL = await getSQL()
  const ddl = await loadFixtureDdl()
  const db = new SQL.Database()
  db.run(ddl)
  db.run(FIXTURE_DATA)
  db.run(CURRENT_QUEST_LOOT_DATA)
  db.run(CURRENT_AUGMENT_DATA)
  return db
}

/**
 * Seed a database with the BASELINE schema — the schema as first publicly
 * deployed (pre `quest_loot.loot_type`), built from the literal snapshot in
 * `baselineSchema.sql`.
 *
 * TRULY FROZEN: the DDL is a checked-in file extracted from main's DB, NOT
 * derived from the current one. That distinction is the whole guarantee — an
 * earlier iteration derived the baseline from `seedTestDb` (whose schema is
 * generated from the current shipped DB), which meant a future schema
 * addition would silently appear in the "baseline" too and the
 * `REQUIRED_COLUMNS` tripwire in `schemaCompat.test.ts` would never fire.
 * With a literal snapshot, any query needing a post-baseline column fails
 * against this DB by construction, forcing the REQUIRED_COLUMNS entry that
 * routes stale service-worker caches into DatabaseGate's self-heal.
 *
 * When a future query needs a newer column, the fix is a REQUIRED_COLUMNS
 * entry — never an edit to `baselineSchema.sql`.
 */
export async function seedBaselineDb(): Promise<Database> {
  const SQL = await getSQL()
  const here = dirname(fileURLToPath(import.meta.url))
  const ddl = readFileSync(resolve(here, 'baselineSchema.sql'), 'utf8')
  const db = new SQL.Database()
  db.run(ddl)
  db.run(FIXTURE_DATA)
  db.run(BASELINE_QUEST_LOOT_DATA)
  db.run(BASELINE_AUGMENT_SLOT_DATA)
  return db
}

/**
 * Open the REAL shipped database (`public/data/ddo.db`) read-only.
 *
 * Deliberately different from `seedTestDb`: hand-written fixtures can't
 * catch drift between hardcoded game-data strings in our TypeScript and the
 * names the ETL actually writes. Anything that matches on a literal value
 * from the game data (quest names, slot names, rarity strings) needs to
 * assert against the shipped artifact or it will fail silently in prod —
 * which is exactly how `KNOWN_RAID_QUESTS` shipped with 5 dead entries.
 *
 * Use sparingly: prefer `seedTestDb` for query-shape and join tests. Reach
 * for this only to validate literals against real data.
 */
export async function openProjectDb(): Promise<Database> {
  const SQL = await getSQL()
  return new SQL.Database(readFileSync(projectDbPath()))
}
