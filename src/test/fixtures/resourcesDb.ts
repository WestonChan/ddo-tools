import initSqlJs, { type Database } from 'sql.js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Test-only: spin up an in-memory sql.js DB with a slimmed-down schema and a
// hand-written items fixture. Only the columns/relations the resources query
// layer actually selects need to exist; we deliberately skip CHECK
// constraints and indexes that the query doesn't depend on, to keep the
// fixture readable. Lives under `src/test/fixtures/` so the boundary
// between production code and test-only helpers stays explicit.

const FIXTURE_DDL = `
CREATE TABLE items (
  id                INTEGER PRIMARY KEY,
  name              TEXT NOT NULL,
  rarity            TEXT,
  equipment_slot    TEXT,
  item_category     TEXT,
  level             INTEGER,
  minimum_level     INTEGER,
  enhancement_bonus INTEGER,
  material          TEXT,
  binding           TEXT,
  base_value        TEXT,
  tooltip           TEXT,
  icon              TEXT,
  description       TEXT,
  wiki_url          TEXT
);

CREATE TABLE item_weapon_stats (
  item_id      INTEGER PRIMARY KEY REFERENCES items(id),
  damage       TEXT,
  critical     TEXT,
  weapon_type  TEXT,
  proficiency  TEXT,
  handedness   TEXT
);

CREATE TABLE item_armor_stats (
  item_id        INTEGER PRIMARY KEY REFERENCES items(id),
  armor_bonus    INTEGER,
  max_dex_bonus  INTEGER
);

CREATE TABLE item_augment_slots (
  item_id    INTEGER NOT NULL REFERENCES items(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  slot_type  TEXT NOT NULL,
  PRIMARY KEY (item_id, sort_order)
);

CREATE TABLE item_upgrades (
  item_id      INTEGER NOT NULL REFERENCES items(id),
  base_item_id INTEGER NOT NULL REFERENCES items(id),
  upgrade_tier INTEGER NOT NULL,
  PRIMARY KEY (item_id, upgrade_tier)
);

CREATE TABLE bonus_types (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE stats (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE bonuses (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  stat_id       INTEGER REFERENCES stats(id),
  bonus_type_id INTEGER REFERENCES bonus_types(id),
  value         INTEGER
);

CREATE TABLE item_bonuses (
  item_id    INTEGER NOT NULL REFERENCES items(id),
  bonus_id   INTEGER NOT NULL REFERENCES bonuses(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, bonus_id, sort_order)
);

CREATE TABLE effects (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  modifier TEXT
);

CREATE TABLE item_effects (
  item_id    INTEGER NOT NULL REFERENCES items(id),
  effect_id  INTEGER NOT NULL REFERENCES effects(id),
  value      INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, effect_id, sort_order)
);

CREATE TABLE spells (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE item_spell_links (
  item_id  INTEGER NOT NULL REFERENCES items(id),
  spell_id INTEGER NOT NULL REFERENCES spells(id),
  charges  INTEGER,
  PRIMARY KEY (item_id, spell_id)
);

CREATE TABLE adventure_packs (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE patrons (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE quests (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  pack_id   INTEGER REFERENCES adventure_packs(id),
  patron_id INTEGER REFERENCES patrons(id),
  level     INTEGER,
  zone      TEXT,
  npc       TEXT
);

CREATE TABLE quest_loot (
  quest_id INTEGER NOT NULL REFERENCES quests(id),
  item_id  INTEGER NOT NULL REFERENCES items(id),
  PRIMARY KEY (quest_id, item_id)
);
`

const FIXTURE_DATA = `
INSERT INTO items (id, name, rarity, equipment_slot, item_category, level, minimum_level, enhancement_bonus, material, binding, base_value, tooltip, icon, description, wiki_url) VALUES
  (1, 'Greatsword of Force', 'Rare', 'Weapon', 'Greatsword', 12, 12, 3, 'Steel', 'Bound to Character on Acquire', '480 pp', 'Strikes with arcane force.', 'Greatsword.png', 'A force-imbued greatsword.', 'https://ddowiki.com/page/Greatsword_of_Force'),
  (2, 'Sigil of the Stalwart Defender', 'Epic', 'Trinket', 'Trinket', 29, 29, NULL, NULL, 'Bound to Account on Acquire', '5800 pp', NULL, 'Sigil.png', 'A defender''s mark.', 'https://ddowiki.com/page/Sigil_of_the_Stalwart_Defender'),
  (3, 'Robe of Force Resistance', 'Uncommon', 'Body', 'Cloth Armor', 8, 8, NULL, 'Cloth', NULL, '120 pp', 'A simple robe.', 'Robe.png', 'A simple robe.', 'https://ddowiki.com/page/Robe_of_Force_Resistance'),
  (4, '50% Discount Voucher', 'Common', NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO item_weapon_stats (item_id, damage, critical, weapon_type, proficiency, handedness) VALUES
  (1, '2d6', '19-20/x2', 'Greatsword', 'Martial', 'Two-Handed');

INSERT INTO item_armor_stats (item_id, armor_bonus, max_dex_bonus) VALUES
  (3, 0, NULL);

INSERT INTO item_augment_slots (item_id, sort_order, slot_type) VALUES
  (1, 0, 'Yellow'),
  (2, 0, 'Colorless'),
  (2, 1, 'Blue');

INSERT INTO item_upgrades (item_id, base_item_id, upgrade_tier) VALUES
  (2, 2, 2);

INSERT INTO bonus_types (id, name) VALUES
  (1, 'Enhancement'),
  (2, 'Insight');

INSERT INTO stats (id, name) VALUES
  (1, 'Charisma'),
  (2, 'Heal Amplification');

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
  (1, 'Sealed in Amber', 1, 1, 11, 'Barovia');

INSERT INTO quest_loot (quest_id, item_id) VALUES
  (1, 2);
`

let _wasmBinary: ArrayBuffer | null = null
function loadWasm(): ArrayBuffer {
  if (_wasmBinary) return _wasmBinary
  // Resolve sql.js's wasm relative to its package entry — works regardless of
  // monorepo / workspace nesting. From `src/test/fixtures/`, the project
  // root is three levels up.
  const here = dirname(fileURLToPath(import.meta.url))
  const wasmPath = resolve(here, '..', '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
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

export async function seedTestDb(): Promise<Database> {
  const SQL = await getSQL()
  const db = new SQL.Database()
  db.run(FIXTURE_DDL)
  db.run(FIXTURE_DATA)
  return db
}
