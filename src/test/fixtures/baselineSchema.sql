-- FROZEN BASELINE SCHEMA — DO NOT UPDATE. EVER.
--
-- Literal CREATE TABLE statements extracted from public/data/ddo.db as it
-- was first publicly deployed (git main, pre quest_loot.loot_type). This
-- file's entire purpose is to stay old: schemaCompat.test.ts runs every
-- frontend query function against a database built from THIS schema, and
-- any column a query trips over must be declared in REQUIRED_COLUMNS
-- (src/hooks/useDatabase.ts) — that is what routes stale service-worker
-- caches into DatabaseGate's self-heal instead of a view crash.
--
-- If this file were regenerated from the current DB (the mistake a previous
-- iteration made by deriving it from seedTestDb), a newly added column
-- would silently appear here too, the baseline test would pass without a
-- REQUIRED_COLUMNS entry, and the 2026-07-25 stale-cache incident would
-- recur on the next schema-changing deploy.
--
-- When a future query needs a newer column: add the REQUIRED_COLUMNS entry.
-- Never edit this file to make a failing test pass.

CREATE TABLE adventure_packs (                     -- unpopulated (future: wt)
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    is_free_to_play INTEGER NOT NULL DEFAULT 0 CHECK (is_free_to_play IN (0, 1))
);
CREATE TABLE bonus_types (
    id               INTEGER PRIMARY KEY,                        -- sd
    name             TEXT NOT NULL,                               -- sd
    stacks_with_self INTEGER NOT NULL DEFAULT 0 CHECK (stacks_with_self IN (0, 1)) -- sd
);
CREATE TABLE bonuses (
    id            INTEGER PRIMARY KEY,                           -- c: autoincrement
    name          TEXT    NOT NULL,                               -- c: "{stat} +{value}" format
    description   TEXT,                                           -- ln: effect localization name; wt: enchantment text
    stat_id       INTEGER REFERENCES stats(id),                  -- c: joined from stat name (parsed from ln/wt)
    bonus_type_id INTEGER REFERENCES bonus_types(id),            -- c: joined from bonus_type name (parsed from ln/wt)
    value         INTEGER                                        -- ln: parsed from "+N" in effect name; wt: from template
);
CREATE TABLE effects (
    id          INTEGER PRIMARY KEY,                             -- c: autoincrement
    name        TEXT NOT NULL,                                    -- wt: parsed from enchantment text
    modifier    TEXT);
CREATE TABLE item_armor_stats (
    item_id       INTEGER PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    armor_bonus   INTEGER,                                       -- wt: armorbonus field
    max_dex_bonus INTEGER                                        -- wt: maxdex field
);
CREATE TABLE item_augment_slots (
    item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    slot_type  TEXT NOT NULL,                                     -- wt: {Augment|Color} in enhancements field
    augment_id INTEGER REFERENCES augments(id),                   -- c: joined from augments (unpopulated)
    PRIMARY KEY (item_id, sort_order)
);
CREATE TABLE item_bonuses (
    item_id           INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    bonus_id          INTEGER NOT NULL REFERENCES bonuses(id),
    sort_order        INTEGER NOT NULL DEFAULT 0,
    data_source       TEXT CHECK (data_source IN ('binary', 'wiki')),
    resolution_method TEXT CHECK (resolution_method IN ('fid_lookup', 'type167_name', 'stat_def_ids', 'wiki_enchantment', 'named_enchantment', 'wiki_description', 'binary_name', 'localization_orphan')),
    PRIMARY KEY (item_id, bonus_id, sort_order)
);
CREATE TABLE item_effects (                       -- wt: parsed from enchantment text via parse_effect_template
    item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    effect_id   INTEGER NOT NULL REFERENCES effects(id),         -- c: joined from effect name
    value       INTEGER,                                         -- wt: effect value (e.g., Bane damage)
    sort_order  INTEGER NOT NULL DEFAULT 0,                      -- c: enumeration order
    data_source TEXT CHECK (data_source IN ('binary', 'wiki')),  -- provenance
    PRIMARY KEY (item_id, effect_id, sort_order)
);
CREATE TABLE item_spell_links (
    item_id  INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    spell_id INTEGER NOT NULL REFERENCES spells(id),
    charges  INTEGER,
    PRIMARY KEY (item_id, spell_id)
);
CREATE TABLE item_upgrades (
    item_id      INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    base_item_id INTEGER NOT NULL REFERENCES items(id),
    upgrade_tier INTEGER NOT NULL CHECK (upgrade_tier >= 1),
    PRIMARY KEY (item_id, upgrade_tier)
);
CREATE TABLE item_weapon_stats (
    item_id        INTEGER PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    damage         TEXT,                                         -- wt: damage field; fl: fallback
    critical       TEXT,                                         -- wt: crit field; fl: fallback
    damage_class   TEXT,                                         -- wt: class field; fl: fallback
    attack_mod     TEXT,                                         -- wt: attackmod field; fl: fallback
    damage_mod     TEXT,                                         -- wt: damagemod field; fl: fallback
    weapon_type_id INTEGER REFERENCES weapon_types(id),          -- c: joined from weapon_type name
    weapon_type    TEXT,                                         -- wt: type field; fl: fallback
    proficiency_id INTEGER REFERENCES weapon_proficiencies(id),  -- c: joined from proficiency name
    proficiency    TEXT,                                         -- wt: prof field; fl: fallback
    handedness     TEXT CHECK (handedness IN ('One-handed', 'Two-handed', 'Off-hand', 'Thrown')) -- wt: hand field
);
CREATE TABLE items (
    id                INTEGER PRIMARY KEY,                         -- c: autoincrement
    name              TEXT NOT NULL,                                -- ln: 0x25 string table
    dat_id            TEXT,                                        -- bp: 0x79 file ID
    rarity            TEXT CHECK (rarity IN ('Common', 'Uncommon', 'Rare', 'Epic')), -- bp: key 0x10000B5F enum
    slot_id           INTEGER REFERENCES equipment_slots(id),      -- c: joined from equipment_slot name
    equipment_slot    TEXT,                                         -- bp: key 0x10000A4B enum
    item_category     TEXT CHECK (item_category IN ('Armor', 'Shield', 'Weapon', 'Jewelry', 'Clothing')), -- bp: key 0x10000A4C enum; wt: fallback
    level             INTEGER,                                     -- bp: key 0x10000A3C
    durability        INTEGER,                                     -- bp: key 0x10000A4D
    item_type         TEXT,                                        -- wt: {Named item|TYPE} positional arg
    minimum_level     INTEGER,                                     -- bp: key 0x10001C5D
    enhancement_bonus INTEGER,                                     -- wt: enchantmentbonus field
    hardness          INTEGER,                                     -- wt: hardness field
    weight            REAL,                                        -- wt: weight field
    material_id       INTEGER REFERENCES item_materials(id),       -- c: joined from material name
    material          TEXT,                                         -- wt: material field; fl: fallback
    binding           TEXT,                                        -- wt: bind field; fl: fallback
    base_value        TEXT,                                        -- wt: basevalue field; fl: fallback
    race_required     TEXT,                                        -- wt: race field (e.g., "Warforged")
    icon              TEXT,                                        -- wt: picdesc or pic field (wiki image filename)
    description       TEXT,                                        -- wt: description field
    tooltip           TEXT,                                        -- lt: 0x25 tooltip sub-entry
    enchant_name      TEXT,                                        -- ln: 0x25 enchant_name sub-entry
    enchant_suffix    TEXT,                                        -- ln: 0x25 enchant_suffix sub-entry
    effect_value      INTEGER,                                     -- bp: key 0x100012A2
    cooldown_seconds  REAL,                                        -- bp: key 0x10000B7A or 0x10001013 (float)
    internal_level    INTEGER,                                     -- bp: key 0x10000742 (float, unknown meaning)
    tier_multiplier   REAL,                                        -- bp: key 0x10000B60 (float)
    wiki_url          TEXT                                         -- c: constructed from name
);
CREATE TABLE patrons (                             -- unpopulated (future: wt)
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE quest_loot (
        quest_id INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
        item_id  INTEGER NOT NULL REFERENCES items(id),
        PRIMARY KEY (quest_id, item_id)
    );
CREATE TABLE quests (                              -- unpopulated (future: wt)
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,
    pack_id   INTEGER REFERENCES adventure_packs(id),
    patron_id INTEGER REFERENCES patrons(id),
    level     INTEGER,
    zone      TEXT,
    npc       TEXT
);
CREATE TABLE spells (
    id               INTEGER PRIMARY KEY,                        -- c: autoincrement
    name             TEXT NOT NULL,                               -- wt: {Infobox-spell|name=...}
    icon             TEXT,                                        -- wt: icon or image field
    school_id        INTEGER REFERENCES spell_schools(id),       -- bp: hash lookup on ref slot; wt: fallback
    spell_points     INTEGER,                                    -- bp: stat 553/554 in ref list/body; wt: cost field fallback
    cooldown         TEXT,                                        -- wt: cooldown field (text)
    cooldown_seconds REAL,                                       -- wt: parsed from cooldown text
    tick_count       INTEGER,                                    -- bp: stat 731 in spell body
    description      TEXT,                                        -- wt: description field
    components       TEXT,                                        -- wt: components field
    range            TEXT,                                        -- wt: range field
    target           TEXT,                                        -- wt: target field
    duration         TEXT,                                        -- wt: duration field
    saving_throw     TEXT,                                        -- wt: save field
    save_type        TEXT CHECK (save_type IS NULL OR save_type IN ('Fortitude', 'Reflex', 'Will')), -- c: parsed from saving_throw
    save_effect      TEXT CHECK (save_effect IS NULL OR save_effect IN ('negates', 'half', 'partial', 'special')), -- c: parsed from saving_throw
    spell_resistance TEXT                                         -- wt: sr field
);
CREATE TABLE stats (
    id       INTEGER PRIMARY KEY,                                -- sd
    name     TEXT NOT NULL,                                      -- sd
    category TEXT NOT NULL  CHECK (category IN ('ability', 'defensive', 'martial', 'magical', 'skill', 'other')) -- sd
);
