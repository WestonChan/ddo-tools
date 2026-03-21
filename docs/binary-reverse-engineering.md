# Binary Reverse Engineering Findings

Comprehensive results from probing all opaque data in DDO `.dat` archives.

## Summary Table

| Target | Result | Value |
|--------|--------|-------|
| Type-167 effects (45K) | Partially decoded | Effect containers with sub-effect data in tail |
| Spell school encoding | Dead end | Template codes = delivery mechanism, not school |
| 0x0A localization (3.2K) | Dead end | Ogg Vorbis audio files, not text |
| Float property keys (190) | Productive | Duration, cooldown, tier multipliers identified |
| 0x07 game objects (35K) | Pending | Deep analysis running |

## Type-167 Effect Entries (0x70XXXXXX)

**45,094 entries. Header is boilerplate, but TAIL contains structured sub-effect data.**

Entry type marker at offset 5: `0xA7` (167). First ~0xB0 bytes are identical across
all entries (engine boilerplate / effect system constants). The variable data starts
at byte 0xB0 and encodes a list of sub-effects.

### Header structure (bytes 0-0xAF, mostly fixed)

- Bytes 0-4: `02 00 00 00 00` (DID=2, flag=0)
- Bytes 5-8: `A7 00 00 00` (entry_type=167)
- Bytes 9-22: fixed pattern
- **Bytes 23-24: sub-type discriminator (varies!)**
  - `99 04` (0x0499 = 1177): 44,541 entries (98.8%)
  - `E8 01` (0x01E8 = 488): 464 entries (1.0%)
  - `D4 09` (0x09D4 = 2516): 66 entries (0.1%)
- Bytes 25+: fixed pattern through 0xAF

### Tail structure (bytes 0xB0+, variable)

Byte 0xB1 appears to be a **sub-effect count**:

| Entry size | Count | Byte 0xB1 | Sub-effects | Notes |
|------------|-------|-----------|-------------|-------|
| 178 bytes | 464 | 0x00 | 0 (empty) | Tail = `00 00` |
| 198 bytes | 66 | 0x01 | 1 | 22-byte tail |
| 320 bytes | 4,785 | ~0x02 | 2 | |
| 720 bytes | 37,013 | 0x05 | 5 | Majority (82%) |
| 728-816 | ~2,400 | 0x05-0x06 | 5-6 | Extended variants |

Each sub-effect block contains repeating patterns like `12 00 00 00 63 00 00 00`
which may be stat_def_id + magnitude pairs or similar structured data.

Associated with: enhancement tree effects, augment operations, dragonmark abilities,
item enchantments ("Focused", "Counterattack", "Strong Defense").

### What's still opaque

- `stat_def_id` at offset 16 is always 0 (NOT per-stat at the container level)
- The sub-effect block format at 0xB0+ needs further decoding to extract individual
  stat bonuses from within the container
- The sub-type discriminator at bytes 23-24 (three known values) needs correlation
  with effect categories

## Spell School Encoding (0x0147XXXX Templates)

**166 unique template codes. They do NOT encode spell school.**

- Same template code appears across multiple schools (e.g., 0x0147005A spans
  Abjuration, Enchantment, and Evocation)
- Only 9/166 template refs exist as entries in either archive
- 3 found in `client_general.dat` are 218-byte transform matrices (0x02 namespace)
- 3 found in `client_gamelogic.dat` are 11-byte item stubs (0x07 namespace)
- Template codes likely encode **delivery mechanism** (AoE shape, targeting, range)

**Implication:** Spell school must come from wiki data or an undiscovered encoding.

## Other Undecoded Effect Types (0x70XXXXXX)

The type-167 probe revealed the full effect type distribution:

| Type | Count | Status |
|------|-------|--------|
| 17 (0x11) | 88,866 | Decoded (mechanism classifier) |
| 167 (0xA7) | 45,094 | Partially decoded (container with sub-effects) |
| 53 (0x35) | 33,943 | Decoded (primary bonus entry) |
| 26 (0x1A) | 2,373 | Decoded (augment marker) |
| 59 (0x3B) | 1,811 | **Unknown** |
| 173 (0xAD) | 1,545 | **Unknown** |
| 503 (0x1F7) | 417 | **Unknown** |
| 175 (0xAF) | varies | Decoded (multi-tier augment table) |

Types 59, 173, and 503 are completely unexplored and may contain additional
stat or bonus data.

## 0x0A Namespace (client_local_English.dat)

**3,194 entries. All are Ogg Vorbis audio files.**

- Magic header: `OggS` + `vorbis` codec
- Fixed size: 4,088 or 4,096 bytes each
- Likely NPC voice lines, UI sounds, or environmental audio
- Not localization text at all

**Other namespaces in English archive:** 138,797 total entries spanning 0x00-0xFF.
The 0x25 namespace (132,783 entries) dominates. All other namespaces have 1-591
entries each -- likely miscellaneous assets (config, UI resources).

## Float-Valued Property Keys (0x79XXXXXX Entries)

**190 keys with >50% IEEE 754 float values identified out of 2,796 total keys.**

### High-Confidence Mappings

| Key | Values | Context | Interpretation |
|-----|--------|---------|----------------|
| `0x10000907` | -1, 20, 60, 900, 36000 | 99% feats | **Duration (seconds)**: -1=permanent, 20=20s, etc. |
| `0x10000B7A` | mostly 15.0 | 65% items | **Cooldown (seconds)**: 15s is standard DDO cooldown |
| `0x10001B29` | always 30.0 | 100% feats | **Feat cooldown**: 30 seconds |
| `0x10000B60` | 1, 2, 3, -1, 1.5, 2.5 | 97% items | **Effect tier/rank multiplier** |
| `0x10000B5C` | mostly +1/-1 | 63% items | **Sign multiplier** (buff vs debuff) |
| `0x10000742` | 1-999, mean 31.5 | 86% items | **Internal level** (encounter/object level) |
| `0x100024ED` | mostly 1.0, some 1.5, 0.5 | 41,848 entries | **Effect scaling multiplier** |
| `0x10000867` | always 0.25 | 90% feats | **Difficulty tier: quarter** |
| `0x10000868` | always 0.50 | 71% feats | **Difficulty tier: half** |
| `0x10000869` | always 0.75 | 71% feats | **Difficulty tier: three-quarter** |
| `0x10003B6B` | always 6.0 | death effects | **Death effect cooldown: 6 seconds** |
| `0x100048D4` | always 300.0 | death effects | **Death effect duration: 300 seconds** |

### Mount Properties (100% mount items)

| Key | Values | Interpretation |
|-----|--------|----------------|
| `0x10009C18` | always 30.0 | Mount base speed |
| `0x10009CC7` | 30 or 60 | Mount acceleration |
| `0x10009CC9` | always 120 | Fast mount max speed |
| `0x10009CCA` | always 60 | Mount turn speed |

### Coefficient Cluster (0x100007B6-0x100007F8)

Eight closely-spaced keys (0x7B6, 0x7BC, 0x7C1, 0x7C5, 0x7CC, 0x7CD, 0x7CE, 0x7E2,
0x7F0, 0x7F5, 0x7F8) all with values predominantly 1.0 and occasional fractional values
(0.35, 0.75, 0.5). These are **effect system coefficient slots** used by the engine
to scale damage/healing/duration. They appear on both items and feats.

### Pseudo-Float File References (~8.0 values)

Several keys show values clustered around 8.0 (e.g., 8.0003, 8.1795, 8.2360):

- `0x1000000E` (8,177 entries), `0x100008FC` (8,260), `0x10001D36` (4,124),
  `0x1000242D` (6,691), `0x10001A50` (1,272), `0x10005174` (2,769)

These are NOT floats. IEEE 754 value 8.0 = `0x41000000`. Values near 8.0 correspond
to raw u32 values in the `0x41XXXXXX` range -- these are **file ID references** to the
0x41 namespace in `client_general.dat` (which has 64 entries in the English archive).
They should be read as u32 pointers, not float magnitudes.

### Constant Sentinels

| Key | Value | Meaning |
|-----|-------|---------|
| `0x1000048E` | 0.0555 (64%) | Preamble marker (appears alongside structured data) |
| `0x10001A51` | 0.0555 (100%) | Same sentinel in different context |
| `0x10004E98` | 0.0555 (100%) | Same sentinel |
| `0x10000E7C` | 1.0 (100%) | Boolean flag (effect enabled) |
| `0x10001036` | 1.0 (100%) | Boolean flag |
| `0x10001D5A` | 1.0 (100%) | Boolean flag |
| `0x1000204B` | 1.0 (100%) | Boolean flag |
| `0x100012CC` | 208.3 (67%) | Fixed constant -- purpose unknown |
| `0x10001B2D` | -106024.0 (100%) | Large negative constant -- possibly sentinel |
| `0x100042E5` | 114.0 (100%) | Green Steel specific constant |

## 0x07 Game Objects

*Investigation still running -- results pending.*

Entry count: 34,884 in `client_gamelogic.dat`.
Largest DID group: DID=1 with ~7K entries (11-byte stubs and larger bodies).
Previous observations: many are item cross-reference stubs sharing lower-24-bit IDs
with 0x79 item entries.
