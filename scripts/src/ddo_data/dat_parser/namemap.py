"""Property key name mapping via wiki cross-reference and distribution analysis.

Cross-references wiki item data with decoded gamelogic entries to discover
what binary property keys (0x10XXXXXX) mean in human terms.

Entry format:
  0x79XXXXXX entries in client_gamelogic.dat use a "dup-triple" encoding:
  [preamble:2B] [key:u32][val:u32] [key:u32][key:u32][val:u32] ...
  These share a 24-bit namespace with 0x25XXXXXX localization strings.

Discovery methods:
  1. Wiki correlation: match entries to wiki items via the string table,
     then find property keys whose values match known wiki fields.
  2. Distribution analysis: classify keys by their value distributions
     across all entries (see DISCOVERED_KEYS constant).

Key finding: minimum_level is stored directly as key 0x10001C5D in
dup-triple items (confirmed via Black Opal Bracers ML=31 cross-check).
"""

from __future__ import annotations

import json
import logging
import struct
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from .archive import DatArchive, FileEntry
from .btree import traverse_btree
from .extract import read_entry_data
from .probe import DecodedProperty
from .strings import load_string_table

logger = logging.getLogger(__name__)

# Wiki fields to correlate against property key values.
# Numeric fields: compared directly as int.
_NUMERIC_FIELDS = [
    "minimum_level",
    "enhancement_bonus",
    "durability",
    "hardness",
    "armor_bonus",
    "max_dex_bonus",
]

# String fields: property value is a 0x0AXXXXXX string ref, resolved via
# the string table and compared to the wiki field text.
_STRING_FIELDS = [
    "weapon_type",
    "proficiency",
    "material",
    "binding",
    "quest",
    "description",
    "set_name",
    "handedness",
]

_MAX_SAMPLE_VALUES = 5


# ---------------------------------------------------------------------------
# Statistically discovered key meanings (from distribution analysis)
# ---------------------------------------------------------------------------
# These were identified by analyzing value distributions across 76,000+
# named 0x79 entries.  Confidence level indicates how strongly the
# distribution matches the proposed meaning.
#
# NOTE: minimum_level is stored directly as key 0x10001C5D (confirmed via
# cross-check of Black Opal Bracers ML=31).  The earlier hypothesis that it
# was computed at runtime was incorrect.

DISCOVERED_KEYS: dict[int, dict[str, str]] = {
    0x1000361A: {
        "name": "level",
        "confidence": "high",
        "evidence": "4715 entries, range 1-30, smooth tapering distribution. "
                    "Likely quest/encounter level, not item ML.",
    },
    0x10000E29: {
        "name": "rarity",
        "confidence": "high",
        "evidence": "6401 entries, values 2-5. Matches DDO rarity tiers: "
                    "2=Common, 3=Uncommon, 4=Rare, 5=Epic.",
    },
    0x10003D24: {
        "name": "durability",
        "confidence": "medium",
        "evidence": "3898 entries, range 1-169. 169 is standard heavy armor "
                    "durability; other peaks match DDO item types.",
    },
    0x10001BA1: {
        "name": "equipment_slot",
        "confidence": "medium",
        "evidence": "8345 entries, range 2-17. Values: 6(3139), 16(1954), "
                    "2(926), 8(702). Consistent with equipment slot codes.",
    },
    0x10001C59: {
        "name": "item_category",
        "confidence": "medium",
        "evidence": "13217 entries, range 1-12. Dominated by 12(6637) and "
                    "3(4367). Likely item type/category enum.",
    },
    0x100012A2: {
        "name": "effect_value",
        "confidence": "medium",
        "evidence": "4988 entries, range 1-100. Top: 33(1155), 100(1131). "
                    "Numeric magnitude of effect/enchantment.",
    },
    0x10000919: {
        "name": "effect_ref",
        "confidence": "high",
        "evidence": "16,168 total B-tree entries (236 wiki-named items), values "
                    "are 0x70XXXXXX file IDs pointing to type-2 effect definition "
                    "entries. Primary effect_ref slot used by BOP Bracers and "
                    "similar complex items.",
    },
    0x10001C5D: {
        "name": "minimum_level",
        "confidence": "high",
        "evidence": "Confirmed for Black Opal Bracers (ML=31, value=31) and "
                    "cross-checked against dat-identified items. Stored as a "
                    "plain u32 in dup-triple items (not computed at runtime).",
    },
    0x10001390: {
        "name": "effect_ref_2",
        "confidence": "high",
        "evidence": "185 named items, all values are 0x70XXXXXX effect IDs. "
                    "Second-most common effect_ref slot; often paired with "
                    "0x10000919 in the same item (125 items have both).",
    },
    0x100012AC: {
        "name": "effect_ref_3",
        "confidence": "medium",
        "evidence": "49 named items, all 0x70XXXXXX values. Third effect_ref "
                    "slot; frequently appears without the primary slots.",
    },
    0x100012BC: {
        "name": "effect_ref_4",
        "confidence": "medium",
        "evidence": "14 named items, all 0x70XXXXXX values. Fourth effect_ref "
                    "slot; sometimes paired with 0x100012AC.",
    },
    0x10006392: {
        "name": "effect_ref_compound",
        "confidence": "medium",
        "evidence": "Appears as first dup-triple key in rc=19 compound entries "
                    "(37,971 entries). Value is always a 0x70XXXXXX effect FID "
                    "whose low 3 bytes mirror the parent item FID. These entries "
                    "also carry refs[1..2]=0x47XXXXXX spell templates in header.",
    },
    0x10000882: {
        "name": "unknown_compound_0882",
        "confidence": "low",
        "evidence": "Most common first dup-triple key in rc=19 compound entries "
                    "(31,556 of 37,971). Purpose unknown; may be a template or "
                    "class reference for compound game objects.",
    },
    0x100008AC: {
        "name": "is_unique_or_deconstructable",
        "confidence": "low",
        "evidence": "Binary flag: 146/148 named items have val=0, 2 items "
                    "('Incredible Potential Ring Deconstruction') have val=1. "
                    "Likely a boolean flag for deconstruction eligibility or "
                    "unique-drop status.",
    },
    0x10001C5B: {
        "name": "item_subtype",
        "confidence": "low",
        "evidence": "Small enum: values 1-6 (plus rare 16, 20) in 132 named items. "
                    "Adjacent to confirmed item fields 0x10001C5D (min_level). "
                    "val=1: Blue Augment Slots, colorless diamonds, rubies (70 items); "
                    "val=2: Red Slot, abilities, quests (23 items); "
                    "val=3: Small crystals, Purple Slot (13 items); "
                    "val=20: Topaz/Legendary items at ML=55 (3 items). "
                    "Does NOT cleanly encode augment color — too mixed across item "
                    "types. May be 'item_system_category' (1=standard, 2=special, ...).",
    },
    0x10001C5F: {
        "name": "stat_def_id_item",
        "confidence": "low",
        "evidence": "Medium integers (range 369-1574) in 147 named items. Adjacent "
                    "to minimum_level (0x10001C5D) in key space. Values overlap "
                    "with stat_def_ids seen in effect entries (376=Haggle, etc.), "
                    "suggesting this encodes the primary stat_def_id for the item "
                    "as a whole rather than for individual effect sub-entries.",
    },
    0x10001C58: {
        "name": "item_schema_ref",
        "confidence": "low",
        "evidence": "146 named items, all values are 0x10XXXXXX property key IDs "
                    "(e.g. 0x10000914, 0x1000090B). Adjacent to 0x10001C5F and "
                    "0x10001C5D in the item property cluster. Functions as a "
                    "'linked schema' or 'bonus type template' pointer.",
    },
    # --- Effect ref slots 5-10 (all confirmed 0x70XXXXXX values) ---
    0x100011CB: {
        "name": "effect_ref_5",
        "confidence": "medium",
        "evidence": "Values are 0x70XXXXXX effect FIDs. Appears on compound ability "
                    "entries alongside 0x1000085B, 0x100023E6, 0x1000149C. Example "
                    "items: Knock, Soulweaver/Splendid Cacophony: Constitution (Rare).",
    },
    0x1000085B: {
        "name": "effect_ref_6",
        "confidence": "medium",
        "evidence": "Values are 0x70XXXXXX effect FIDs. Co-occurs with 0x100011CB on "
                    "the same items (Knock, Bolt[E], augment crystal entries).",
    },
    0x100023E6: {
        "name": "effect_ref_7",
        "confidence": "medium",
        "evidence": "Values are 0x70XXXXXX effect FIDs. Co-occurs with 0x100011CB and "
                    "0x1000085B on the same compound ability items.",
    },
    0x1000149C: {
        "name": "effect_ref_8",
        "confidence": "medium",
        "evidence": "Values are 0x70XXXXXX effect FIDs; some items carry 2 values for "
                    "this key. Co-occurs with 0x100011CB group on same items.",
    },
    0x100012F0: {
        "name": "effect_ref_9",
        "confidence": "medium",
        "evidence": "4 named items, all 0x70XXXXXX values. Rare slot; observed on "
                    "Bloody Bjorn[mn], Essence of the Stonemeld Plate[v], Construct "
                    "Bane, Judgment.",
    },
    0x100012E8: {
        "name": "effect_ref_10",
        "confidence": "medium",
        "evidence": "3 named items, all unique 0x70XXXXXX values. Rare slot; observed "
                    "on Essence of the Stonemeld Plate[v], Construct Bane, Judgment.",
    },
    # --- 0x10001C5X item property cluster completions ---
    0x10001C5E: {
        "name": "unknown_cluster_1C5E",
        "confidence": "low",
        "evidence": "139 named items, all values are 0x10XXXXXX property key IDs. "
                    "Adjacent to confirmed item fields (0x10001C5D minimum_level, "
                    "0x10001C58 item_schema_ref). Most common value: 0x10000909 (68x). "
                    "Co-occurs with entire 0x10001C58-0x10001C60 cluster at ~99%. "
                    "Likely another schema/template pointer in the item property block.",
    },
    0x10001C60: {
        "name": "unknown_cluster_1C60",
        "confidence": "low",
        "evidence": "140 named items. Values are packed 4-byte structures; most common "
                    "0x1C590600 (118x) and 0x1C590700 (17x). Bytes[2..3] in LE "
                    "(0x1C59) match the low 16 bits of the item_category key "
                    "(0x10001C59), suggesting a packed key reference. Co-occurs with "
                    "full cluster at ~99%.",
    },
    # --- Schema constant nodes ---
    0x10000909: {
        "name": "unknown_constant_0909",
        "confidence": "low",
        "evidence": "139 named items, ALL share the same value: 0x09190100 "
                    "(152,633,600). Also the most common ref-target of 0x10001C5E "
                    "(68 items). Items span NPCs, ammo, feats (cat=-1 70x, cat=12 68x). "
                    "Behaves as a schema-type identifier node — a fixed 'type tag' "
                    "shared by a broad class of entries.",
    },
    0x10001347: {
        "name": "unknown_constant_1347",
        "confidence": "low",
        "evidence": "97 named items, ALL share the same value: 0x39611300 "
                    "(962,663,168). Same 97 items as 0x10001348. Likely a CRC or "
                    "format-version constant embedded in a specific entry schema.",
    },
    0x10001348: {
        "name": "unknown_constant_1348",
        "confidence": "low",
        "evidence": "97 named items (same set as 0x10001347), ALL share the same "
                    "value: 0xAB82A800 (2,877,466,624). Always paired with "
                    "0x10001347. Likely the second word of a 64-bit format constant.",
    },
    # --- Enum/flag keys ---
    0x10000E39: {
        "name": "unknown_item_class_E39",
        "confidence": "low",
        "evidence": "145 named items; 3 values: 0 (138x), 1 (5x), 8 (2x). Val=0 items "
                    "span all categories. Val=1 items (Cleric Trainer, Scale: Sonic "
                    "Spell Crit Damage, Legendary Toughness) all have cat=-1 (no "
                    "item_category). Val=8 items (Epic Locus of Vol, Incredible "
                    "Potential Ring Deconstruction) also cat=-1. Non-zero values may "
                    "flag items as trainer/unique-object class.",
    },
    0x10000B32: {
        "name": "unknown_item_flags_B32",
        "confidence": "low",
        "evidence": "118 named items; 4 values: 0 (114x), 18 (2x, Shield spell), "
                    "22 (1x, Zarigan's Arcane Enlightenment: Spell Points (Rare)), "
                    "32 (1x, Incredible Potential Ring Deconstruction). Mostly 0 "
                    "with rare non-zero values on specific named items.",
    },
    0x100008B4: {
        "name": "unknown_rank_8B4",
        "confidence": "low",
        "evidence": "118 named items; small integers max=45. Val=1 (65x) is dominant. "
                    "Many values appear exactly 3x (e.g. 3, 5, 6, 10, 11, 12, 15, "
                    "19, 24), consistent with DDO enhancements having 3 tiers. Higher "
                    "values on named items like Dance of the Wind: Tumble (Rare) "
                    "(val=41), Epic Skill Focus: Perform (val=39). Possibly "
                    "enhancement tier rank or sort order.",
    },
    0x10004281: {
        "name": "unknown_pool_flag_4281",
        "confidence": "low",
        "evidence": "87 named items; 2 values: 4 (74x), 0 (13x). Val=4 items are "
                    "dominated by item_category=12 (60/74). Val=0 items are mostly "
                    "item_category=2 (8/13). May be a flag distinguishing standard "
                    "item pool (val=4) from ability/feat entries (val=0).",
    },
    0x100023F5: {
        "name": "unknown_signed_modifier_23F5",
        "confidence": "low",
        "evidence": "82 named items; signed integer values ranging from -10 to +34. "
                    "Negative values: -10 (12x, e.g. Armor, Lava Caves: Time is "
                    "Money), -5 (9x, e.g. Sapphire of Vertigo +2). Positive: +3, "
                    "+22, +24, +27, +34 (3x each). May encode a difficulty class "
                    "modifier, save penalty, or effect parameter.",
    },
    # --- Cross-item group / template reference keys ---
    0x10000A48: {
        "name": "unknown_group_ref_A48",
        "confidence": "low",
        "evidence": "155 named items; 8 distinct large values in namespace 0x00. "
                    "Most common: 0x0008AB00 (105x, e.g. Epic Locus of Vol: Blue "
                    "Augment Slot). Low byte varies 0/1 within a group. Co-occurs "
                    "with 0x10000DE2 on same items (same category/ML distribution). "
                    "May encode a loot group or content-pack identifier.",
    },
    0x10000DE2: {
        "name": "unknown_template_ref_DE2",
        "confidence": "low",
        "evidence": "151 named items; 5 distinct values. Dominant: 0x000A4A00 (113x). "
                    "Low byte varies 0/1. Identical item_category and ML distribution "
                    "to 0x10000A48 — likely always paired. May be a secondary template "
                    "or variant ID alongside 0x10000A48.",
    },
    0x10002DD9: {
        "name": "unknown_flag_or_float_2DD9",
        "confidence": "low",
        "evidence": "145 named items; binary: val=0 (144x) or val=0x40000000 (1x). "
                    "0x40000000 is IEEE 754 float 2.0; appears only on 'Scale: Sonic "
                    "Spell Crit Damage'. May encode a scaling multiplier stored as "
                    "float32, normally 0.",
    },
    0x10000901: {
        "name": "unknown_override_ref_0901",
        "confidence": "low",
        "evidence": "140 named items; val=0 (111x), otherwise 0x10XXXXXX property "
                    "key IDs (e.g. 0x10000D6F on 'Attack'). When non-zero, points to "
                    "an alternate property key — possibly an override or parent-class "
                    "property reference.",
    },
    0x10000B2E: {
        "name": "unknown_content_ref_B2E",
        "confidence": "low",
        "evidence": "138 named items; 17 distinct values; ALL have item_category=-1 "
                    "(feats/abilities/NPCs). Most common: 0x00086700 (54x, e.g. "
                    "Craftable (+6)). Values are diverse and do not clearly encode "
                    "a small enum.",
    },
    0x10000002: {
        "name": "unknown_format_sig_0002",
        "confidence": "low",
        "evidence": "127 named items; 14 distinct large values; ALL item_category=-1. "
                    "Values: 0x05001C00 (48x, Corrosive Arrows/Ammo), 0x54001800 "
                    "(38x, Orcish Strength I/Ammo), 0x90000000 (16x, Extra One "
                    "Power). Very low key ID (0x10000002) suggests a fundamental "
                    "schema marker. Values may be packed type/version signatures.",
    },
    # --- Constant-value keys (schema type tags) ---
    0x1000048E: {
        "name": "unknown_constant_pair_048E",
        "confidence": "low",
        "evidence": "127 named items; 2 distinct values: 0x3D632E00 (91x) and "
                    "0x60951300 (36x). Adjacent to 0x1000048D which is single-valued "
                    "0xA4487500. Together likely form a 64-bit schema constant pair.",
    },
    0x1000048D: {
        "name": "unknown_constant_048D",
        "confidence": "low",
        "evidence": "125 named items; ALL share value 0xA4487500 (2,756,211,968). "
                    "Same magic constant appears in 0x10005175 and 0x100018AA. "
                    "Likely a CRC-32 or schema-type tag constant.",
    },
    0x100018AA: {
        "name": "unknown_constant_18AA",
        "confidence": "low",
        "evidence": "103 named items; 96x share 0xA4487500 (same magic constant as "
                    "0x1000048D, 0x10005175). All item_category=-1. 5 items have "
                    "0x00451D01 (NPCs: Longtalon[mn], The Bloody End).",
    },
    0x10005175: {
        "name": "unknown_constant_5175",
        "confidence": "low",
        "evidence": "82 named items; ALL share value 0xA4487500 — same magic constant "
                    "as 0x1000048D and 0x100018AA. All item_category=-1.",
    },
    # --- Simple flag keys ---
    0x10000917: {
        "name": "unknown_flag_0917",
        "confidence": "low",
        "evidence": "99 named items; val=0 (98x), val=2 (1x, 'Bottled Rainstorm'). "
                    "Essentially always 0 with a single rare non-zero value.",
    },
    0x10002877: {
        "name": "unknown_flag_2877",
        "confidence": "low",
        "evidence": "83 named items; val=0 (82x), val=0x00800000 (1x, 'Green Fire'). "
                    "Essentially always 0 with a single non-zero value.",
    },
    # --- Feat/ability-specific keys ---
    0x1000088E: {
        "name": "unknown_bitmask_088E",
        "confidence": "low",
        "evidence": "98 named items; 32 distinct values; ALL item_category=-1. Values "
                    "include 0x00040004 (14x), 0x00040001 (12x), 0x00000002 (9x), "
                    "0x00000080 (6x). High u16 = 0x0004 for many entries, low u16 "
                    "varies — likely a packed bitmask field for feat/ability flags.",
    },
    0x10006F7F: {
        "name": "unknown_versioned_ref_6F7F",
        "confidence": "low",
        "evidence": "93 named items; 10 distinct values; low byte always 0x01. Values "
                    "like 0x00091701 (25x), 0x00139601 (22x), 0x000B6A01 (15x). "
                    "The constant low byte 0x01 suggests a type/version flag on a "
                    "content reference.",
    },
    0x10002899: {
        "name": "unknown_template_ref_2899",
        "confidence": "low",
        "evidence": "86 named items; 6 distinct values; item_category=12 dominant "
                    "(44/86). Values: 0x0008B401 (37x), 0x0008B400 (31x), "
                    "0x0008FC01 (7x). Low byte 0/1 variant pattern — similar to "
                    "0x10006F7F.",
    },
    0x10001399: {
        "name": "damage_dice_notation",
        "confidence": "medium",
        "evidence": "83 named items; ALL item_category=-1. Values encode ASCII dice "
                    "notation as a packed 4-byte little-endian u32: byte[0]=bonus, "
                    "bytes[1..3]='XdY' ASCII. Examples: 0x32643205=[bonus=5,'2d2'] "
                    "→ 2d2+5; 0x34643103=[bonus=3,'1d4'] → 1d4+3. byte[2] is always "
                    "0x64 ('d'). Encodes damage dice for weapon/proc effects.",
    },
    0x10001585: {
        "name": "unknown_rank_1585",
        "confidence": "low",
        "evidence": "78 named items; small integers max=46; 36 distinct values; ALL "
                    "item_category=-1. val=1 is most common (16x). May be an "
                    "enhancement tier or sort-order rank similar to 0x100008B4.",
    },
    # --- Float-valued property keys ---
    0x10000E7C: {
        "name": "unknown_float_one_E7C",
        "confidence": "low",
        "evidence": "78 named items; ALL share value 0x3F800000, which is IEEE 754 "
                    "float 1.0. ALL item_category=-1. Likely a float32 property "
                    "storing a multiplicative scale factor, always 1.0 here.",
    },
    0x10002BCE: {
        "name": "unknown_float_modifier_2BCE",
        "confidence": "low",
        "evidence": "78 named items; val=0 (74x), otherwise IEEE 754 floats: "
                    "0x3DCCCCCD≈0.1 (2x, Echo of Ravenkind, Volley the Arbalest), "
                    "0x3C23D70A≈0.01 (1x, Card Trade 08_09), 0x3E19999A≈0.15 "
                    "(1x, Witch Doctor Glik[E]). Float32 modifier, normally 0.",
    },
    # --- Secondary feat/ability group refs ---
    0x1000283C: {
        "name": "unknown_group2_ref_283C",
        "confidence": "low",
        "evidence": "78 named items; 6 distinct values; ALL item_category=-1. "
                    "Most common: 0x00189800 (35x, Dread Pirate Apothecary[m]), "
                    "0x00189801 (33x, Craftable (+6)). Low byte 0/1 variant pattern.",
    },
    0x10002840: {
        "name": "unknown_group2_ref_2840",
        "confidence": "low",
        "evidence": "78 named items; 5 distinct values; ALL item_category=-1. "
                    "Most common: 0x002D1F00 (56x). Co-occurs with 0x1000283C, "
                    "0x10002BCE, 0x10000E7C on same entry set.",
    },
    # --- 78-item linked property chain (feat/ability entries) ---
    0x10001071: {
        "name": "unknown_chain_head_1071",
        "confidence": "low",
        "evidence": "77 named items; ALL share value 0x1000A084 (a key ID pointer). "
                    "Entry in the 78-item linked property chain — acts as a pointer "
                    "to the chain's data node (0x1000A084). See 0x10001072 for the "
                    "full chain description.",
    },
    0x10001072: {
        "name": "unknown_chain_count_1072",
        "confidence": "low",
        "evidence": "78 named items; ALL val=1. Entry in the 78-item property chain "
                    "(items like Wildhunter: Attack and Damage, Item Restoration). "
                    "Chain structure: 0x10001071→0x1000A084 (data ptr), "
                    "0x10001072=1 (count), 0x10001073=18 (type), "
                    "0x10001076→0x10730300→0x10731000 (value chain). "
                    "Likely feat/enhancement slot definitions.",
    },
    0x10001073: {
        "name": "unknown_chain_type_1073",
        "confidence": "low",
        "evidence": "78 named items; val=18 (77x), val=15 (1x). Part of the 78-item "
                    "linked property chain; likely a type or slot-kind identifier.",
    },
    0x10001076: {
        "name": "unknown_chain_start_1076",
        "confidence": "low",
        "evidence": "78 named items; ALL val=0x10730300 (key ID pointer). Head of the "
                    "value sub-chain in the 78-item property chain. Points to the "
                    "0x10730300→0x10731000 chain node.",
    },
    0x1000A084: {
        "name": "unknown_chain_node_A084",
        "confidence": "low",
        "evidence": "78 named items; 6 distinct item-reference values (low byte=0x01). "
                    "Most common: 0x003D2501 (48x, Angelic Wings entries). Target of "
                    "the 0x10001071 pointer in the 78-item property chain. Stores "
                    "the actual data ref for the chain entry.",
    },
    0x10710000: {
        "name": "unknown_chain_ptr_7100",
        "confidence": "low",
        "evidence": "77 named items; ALL val=0x10711000 (key ID pointer). Part of the "
                    "0x107XXXXX linked chain sub-structure. Keys in the 0x107XXXXX "
                    "range appear to form a linked list where each key's value is the "
                    "next key in the chain.",
    },
    0x10730300: {
        "name": "unknown_chain_next_7303",
        "confidence": "low",
        "evidence": "78 named items; ALL val=0x10731000 (key ID pointer). Chain node "
                    "in the 0x107XXXXX linked structure; always points to 0x10731000.",
    },
    0x10731000: {
        "name": "unknown_chain_value_7310",
        "confidence": "low",
        "evidence": "78 named items; val=0x00121000 (77x), val=0x000F1000 (1x, "
                    "Insightful Magical Sheltering +). Terminal value node in the "
                    "0x107XXXXX chain. Value 0x00121000 encodes 0x12=18 (matching "
                    "0x10001073 type=18) and 0x1000 = a block marker.",
    },
    0x10760000: {
        "name": "unknown_chain_terminal_7600",
        "confidence": "low",
        "evidence": "78 named items; ALL val=0x03001000. Terminal node in the "
                    "0x107XXXXX chain. Constant across all entries.",
    },
    # --- Missing 0x107XXXXX chain node ---
    0x10711000: {
        "name": "unknown_chain_value_7110",
        "confidence": "low",
        "evidence": "77 named items; ALL val=0xA0841000. Terminal value node in the "
                    "0x10710000→0x10711000 sub-chain. 0xA0841000 may encode a ref "
                    "to 0x1000A084 (the chain_node_A084 key, low bytes=0xA084).",
    },
    # --- Additional constant-value keys (adjacent to known constant cluster) ---
    0x10001349: {
        "name": "unknown_constant_1349",
        "confidence": "low",
        "evidence": "97 named items; ALL val=0x78F2A800. Third member of the "
                    "0x10001347/48/49 triple — all three appear on the same 97 items "
                    "and hold a single constant value each. Likely schema tags.",
    },
    0x10003102: {
        "name": "unknown_constant_3102",
        "confidence": "low",
        "evidence": "Appears on same category of items as other constant-value keys; "
                    "always a single repeated value. Likely a schema or type tag.",
    },
    0x10003972: {
        "name": "unknown_constant_3972",
        "confidence": "low",
        "evidence": "One of four keys (0x1000048D, 0x10005175, 0x100018AA, 0x10003972) "
                    "that all carry the magic constant 0xA4487500, believed to be a "
                    "schema-type tag. Always the same value across all items.",
    },
    0x10001A51: {
        "name": "unknown_constant_1A51",
        "confidence": "low",
        "evidence": "Single constant value across all occurrences. Likely a schema "
                    "tag or type marker.",
    },
    # --- Additional effect_ref slots (0x70XXXXXX values) ---
    0x10001B8D: {
        "name": "effect_ref_shared_1B8D",
        "confidence": "medium",
        "evidence": "73 named items; ALL share the SAME FID 0x700027E1. Unlike other "
                    "effect_ref_* keys which vary per item, this slot always points to "
                    "the same effect entry — possibly a global damage/defence baseline "
                    "or shared procedural effect.",
    },
    0x10001BC4: {
        "name": "effect_ref_11_BC4",
        "confidence": "medium",
        "evidence": "All values are 0x70XXXXXX FIDs (effect entry file IDs). Part of "
                    "the sequential 0x10001BC4/BC6/BC7 triple of effect_ref slots. "
                    "Co-occur on the same items as other effect_ref keys.",
    },
    0x10001BC6: {
        "name": "effect_ref_12_BC6",
        "confidence": "medium",
        "evidence": "All values are 0x70XXXXXX FIDs (effect entry file IDs). Part of "
                    "the sequential 0x10001BC4/BC6/BC7 triple of effect_ref slots.",
    },
    0x10001BC7: {
        "name": "effect_ref_13_BC7",
        "confidence": "medium",
        "evidence": "All values are 0x70XXXXXX FIDs (effect entry file IDs). Part of "
                    "the sequential 0x10001BC4/BC6/BC7 triple of effect_ref slots.",
    },
    # --- Float-valued property keys (IEEE 754 float32 stored in u32 slots) ---
    0x10000B60: {
        "name": "unknown_float_tier_B60",
        "confidence": "low",
        "evidence": "Values are IEEE 754 float32; observed: 0.0, 1.0, 2.0, 3.0, 4.0, "
                    "-1.0. Small integer steps suggest tier or rank multiplier "
                    "(e.g. weapon tier, upgrade level). Adjacent to 0x10000B5C.",
    },
    0x10000B5C: {
        "name": "unknown_float_sign_B5C",
        "confidence": "low",
        "evidence": "Values are IEEE 754 float32; observed: 1.0 (majority), -1.0, 0.0. "
                    "Binary ±1.0 / 0.0 distribution suggests a sign or direction "
                    "coefficient. Adjacent to 0x10000B60.",
    },
    0x100007F8: {
        "name": "unknown_float_coeff_7F8",
        "confidence": "low",
        "evidence": "IEEE 754 float32; predominantly 1.0 (0x3F800000). Part of the "
                    "0x100007E2/F0/F5/F8 float coefficient group; likely a multiplier "
                    "or weight used in effect/stat calculations.",
    },
    0x100007F0: {
        "name": "unknown_float_coeff_7F0",
        "confidence": "low",
        "evidence": "IEEE 754 float32; predominantly 1.0 (0x3F800000). Part of the "
                    "0x100007E2/F0/F5/F8 float coefficient group.",
    },
    0x100007F5: {
        "name": "unknown_float_coeff_7F5",
        "confidence": "low",
        "evidence": "IEEE 754 float32; predominantly 1.0 (0x3F800000). Part of the "
                    "0x100007E2/F0/F5/F8 float coefficient group.",
    },
    0x100007E2: {
        "name": "unknown_float_coeff_7E2",
        "confidence": "low",
        "evidence": "IEEE 754 float32; predominantly 1.0 (0x3F800000). Part of the "
                    "0x100007E2/F0/F5/F8 float coefficient group.",
    },
    0x100008FC: {
        "name": "unknown_float_approx8_8FC",
        "confidence": "low",
        "evidence": "IEEE 754 float32; values cluster around 8.0–8.2. Possible item "
                    "weight (DDO items have weights like 8 lb) or a scaling parameter.",
    },
    0x10000742: {
        "name": "unknown_float_level_742",
        "confidence": "low",
        "evidence": "IEEE 754 float32; values range 6.0–32.0. Range matches DDO "
                    "minimum level range; may be a float representation of a level "
                    "requirement or caster level.",
    },
    # --- 0x10BB linked chain pair ---
    0x10BB0000: {
        "name": "unknown_chain_ptr_BB00",
        "confidence": "low",
        "evidence": "Always val=0x10BB1000 (key ID). Head of the 0x10BB0000→0x10BB1000 "
                    "pointer sub-chain, analogous to 0x10710000→0x10711000.",
    },
    0x10BB1000: {
        "name": "unknown_chain_value_BB10",
        "confidence": "low",
        "evidence": "Terminal value node for the 0x10BB0000→0x10BB1000 chain. "
                    "Value is a data reference or constant.",
    },
    0x100010BB: {
        "name": "unknown_chain_node_10BB",
        "confidence": "low",
        "evidence": "Parallel key to the 0x10BB chain; appears on the same items. "
                    "Likely the 0x10XX-namespace equivalent of the 0x10BB chain head.",
    },
    # --- 0x10000ABC/D/E ability flags cluster ---
    0x10000ABC: {
        "name": "unknown_ability_flags_ABC",
        "confidence": "low",
        "evidence": "Part of the 0x10000ABC/ABD/ABE cluster. Values are bitfield-like "
                    "or small enum. Co-occurrence with ABD/ABE suggests this triple "
                    "encodes an ability definition (possibly spell component flags, "
                    "prereq flags, or stance conditions).",
    },
    0x10000ABD: {
        "name": "unknown_ability_id_ABD",
        "confidence": "low",
        "evidence": "Part of the 0x10000ABC/ABD/ABE cluster; small integer, max=126. "
                    "Likely an ability or feat index within a category.",
    },
    0x10000ABE: {
        "name": "unknown_ability_bits_ABE",
        "confidence": "low",
        "evidence": "Part of the 0x10000ABC/ABD/ABE cluster. Value distribution "
                    "similar to ABC; may be a second flags/bits field for the ability.",
    },
    # --- Triple small-int parameter group (0x539/53B/53D) ---
    0x10000539: {
        "name": "unknown_triple_param_A_539",
        "confidence": "low",
        "evidence": "Small integer, max=73; 67 named items. Part of the co-occurring "
                    "0x10000539/53B/53D triple — 70 items have all three. The three "
                    "values together likely encode a 3-part parameter (e.g. dice "
                    "formula components, or effect magnitude triple).",
    },
    0x1000053B: {
        "name": "unknown_triple_param_B_53B",
        "confidence": "low",
        "evidence": "Small integer, max=76; 70 named items. Part of the co-occurring "
                    "0x10000539/53B/53D triple.",
    },
    0x1000053D: {
        "name": "unknown_triple_param_C_53D",
        "confidence": "low",
        "evidence": "Small integer, max=82; 67 named items. Part of the co-occurring "
                    "0x10000539/53B/53D triple.",
    },
    # --- Remaining individual keys ---
    0x100007EB: {
        "name": "unknown_flag_enum_7EB",
        "confidence": "low",
        "evidence": "Small enum with ~6 distinct values. Distribution and category "
                    "correlation not yet fully characterised.",
    },
    0x10000E87: {
        "name": "unknown_content_ref_E87",
        "confidence": "low",
        "evidence": "Values include 0x10XXXXXX property refs and small integers. "
                    "Possible content pack or expansion reference.",
    },
    0x100015C3: {
        "name": "unknown_flag_15C3",
        "confidence": "low",
        "evidence": "Binary or small-enum flag; appears on a subset of items.",
    },
    0x1000224E: {
        "name": "unknown_count_224E",
        "confidence": "low",
        "evidence": "Small integer; distribution suggests a count or index field.",
    },
}


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class NamedEntry:
    """A gamelogic entry matched to its wiki item data."""

    file_id: int
    name: str
    wiki_fields: dict[str, int | float | str]
    properties: list[DecodedProperty]


@dataclass
class KeyMapping:
    """A discovered mapping from property key to human-readable name."""

    key: int
    """Property key, e.g. 0x10000042."""

    name: str
    """Human-readable field name, e.g. 'minimum_level'."""

    confidence: float
    """Fraction of matched entries where the value agreed."""

    match_count: int
    """Number of entries that contributed to this mapping."""

    sample_values: list[int] = field(default_factory=list)
    """A few example values observed for this key."""


@dataclass
class NameMapResult:
    """Results of the property name mapping process."""

    matched_entries: int = 0
    """Wiki items successfully matched to gamelogic entries."""

    unmatched_wiki: int = 0
    """Wiki items not found in the string table / gamelogic."""

    mappings: list[KeyMapping] = field(default_factory=list)
    """Discovered key-to-name mappings, sorted by confidence."""

    unmapped_keys: list[int] = field(default_factory=list)
    """High-frequency keys with no wiki field match."""


# ---------------------------------------------------------------------------
# Name normalization
# ---------------------------------------------------------------------------


def _normalize_name(name: str) -> str:
    """Normalize an item name for fuzzy matching."""
    return name.strip().replace("_", " ").lower()


# ---------------------------------------------------------------------------
# Dup-triple decoder for 0x79XXXXXX entries
# ---------------------------------------------------------------------------


def decode_dup_triple(data: bytes) -> list[DecodedProperty]:
    """Decode property key-value pairs from a dup-triple format entry.

    The 0x79XXXXXX entries in client_gamelogic.dat use a 2-byte-aligned
    format that starts with a 2-byte preamble (the schema type's low
    bytes, e.g. 0x1000 -> bytes 00 10), followed by property records:

        [preamble:2B] [key2:u32][key2:u32][val2:u32] [key2:u32][key2:u32][val2:u32] ...

    Most records duplicate the key: [key][key][value] (12 bytes, "dup-triple").
    Some records appear as lone pairs: [key][value] (8 bytes, no key repeat).
    Zero u32s act as section breaks within the stream.

    This scanner finds dup-triples at 2-byte alignment throughout the
    entry, plus lone key-value pairs not captured by the dup pass.
    """
    props: list[DecodedProperty] = []
    seen_keys: set[int] = set()
    n = len(data)

    # Pass 1: scan for dup-triples at 2-byte alignment
    # The preamble is 2 bytes, so all u32s in the property stream are
    # at even offsets (2, 6, 10, 14, ...). Step by 2 to match.
    i = 0
    while i + 12 <= n:
        k1 = struct.unpack_from("<I", data, i)[0]
        k2 = struct.unpack_from("<I", data, i + 4)[0]
        if k1 == k2 and (k1 >> 24) == 0x10:
            val = struct.unpack_from("<I", data, i + 8)[0]
            if k1 not in seen_keys:
                props.append(DecodedProperty(key=k1, value=val))
                seen_keys.add(k1)
            i += 12
        else:
            i += 2

    # Pass 2: lone key-value pairs (first record in each section)
    i = 0
    while i + 8 <= n:
        k = struct.unpack_from("<I", data, i)[0]
        if (k >> 24) == 0x10 and k not in seen_keys:
            val = struct.unpack_from("<I", data, i + 4)[0]
            # Skip if next u32 equals k (dup-triple, handled above)
            if val != k:
                props.append(DecodedProperty(key=k, value=val))
                seen_keys.add(k)
        i += 2

    return props


# ---------------------------------------------------------------------------
# Step 1: Match wiki items to gamelogic entries
# ---------------------------------------------------------------------------


def match_wiki_to_entries(
    wiki_items: list[dict],
    string_table: dict[int, str],
    archive: DatArchive,
    entries: dict[int, FileEntry],
) -> tuple[list[NamedEntry], int]:
    """Match wiki items to gamelogic entries via deterministic ID mapping.

    The Turbine engine uses a shared 24-bit namespace across archives.
    Item definitions live in the 0x79XXXXXX range of client_gamelogic.dat,
    with corresponding localization strings at 0x25XXXXXX in the English
    archive (same lower 3 bytes).

    These 0x79 entries use a "dup-triple" property encoding (not type-2),
    which decode_dup_triple handles.

    Returns (matched_entries, unmatched_wiki_count).
    """
    # Build reverse lookups
    wiki_by_name: dict[str, dict] = {}
    for item in wiki_items:
        name = item.get("name")
        if name:
            wiki_by_name[_normalize_name(name)] = item

    # Build string table lookup by lower 3 bytes (shared namespace)
    lower_to_name: dict[int, str] = {}
    for file_id, text in string_table.items():
        lower = file_id & 0x00FFFFFF
        norm = _normalize_name(text)
        # Only store if it matches a wiki item (avoids noise)
        if norm in wiki_by_name:
            lower_to_name[lower] = norm

    matched: list[NamedEntry] = []

    for file_id, entry in entries.items():
        # Only process 0x79XXXXXX entries (item definitions)
        if (file_id >> 24) & 0xFF != 0x79:
            continue

        # Check deterministic ID mapping: same lower 3 bytes in English
        lower = file_id & 0x00FFFFFF
        matched_name = lower_to_name.get(lower)
        if matched_name is None:
            continue

        try:
            data = read_entry_data(archive, entry)
        except (ValueError, OSError):
            continue

        if len(data) < 12:
            continue

        # Decode properties from dup-triple format
        properties = decode_dup_triple(data)
        if not properties:
            continue

        wiki_item = wiki_by_name[matched_name]
        named = NamedEntry(
            file_id=file_id,
            name=wiki_item.get("name", matched_name),
            wiki_fields={
                k: v for k, v in wiki_item.items()
                if v is not None and k != "name"
            },
            properties=properties,
        )
        matched.append(named)

    unmatched = len(wiki_by_name) - len({e.name.strip().lower() for e in matched})
    return matched, unmatched


# ---------------------------------------------------------------------------
# Step 2: Correlate property keys to field names
# ---------------------------------------------------------------------------


def correlate_keys(
    named_entries: list[NamedEntry],
    string_table: dict[int, str] | None = None,
    *,
    min_confidence: float = 0.8,
    min_matches: int = 5,
) -> list[KeyMapping]:
    """Find property keys that consistently match wiki field values.

    For numeric wiki fields, checks if a property key's scalar value equals
    the expected wiki value. For string fields, resolves 0x0AXXXXXX property
    values via the string table and compares to wiki text.

    Returns mappings sorted by confidence (descending).
    """
    mappings: list[KeyMapping] = []
    claimed_keys: set[int] = set()

    # --- Numeric fields ---
    for field_name in _NUMERIC_FIELDS:
        # For each property key, collect (actual_value, expected_value) pairs
        candidates: dict[int, list[tuple[int, int]]] = defaultdict(list)

        for entry in named_entries:
            expected = entry.wiki_fields.get(field_name)
            if expected is None or not isinstance(expected, (int, float)):
                continue
            expected_int = int(expected)

            for prop in entry.properties:
                if prop.is_array:
                    continue
                candidates[prop.key].append((prop.value, expected_int))

        # Score each candidate
        best_key = None
        best_confidence = 0.0
        best_count = 0
        best_values: list[int] = []

        for key, pairs in candidates.items():
            if key in claimed_keys:
                continue
            matches = sum(1 for actual, exp in pairs if actual == exp)
            total = len(pairs)
            if matches < min_matches:
                continue
            confidence = matches / total
            if confidence >= min_confidence and confidence > best_confidence:
                best_key = key
                best_confidence = confidence
                best_count = matches
                best_values = sorted({exp for actual, exp in pairs if actual == exp})[:_MAX_SAMPLE_VALUES]

        if best_key is not None:
            mappings.append(KeyMapping(
                key=best_key,
                name=field_name,
                confidence=best_confidence,
                match_count=best_count,
                sample_values=best_values[:_MAX_SAMPLE_VALUES],
            ))
            claimed_keys.add(best_key)

    # --- String fields ---
    if string_table:
        for field_name in _STRING_FIELDS:
            str_candidates: dict[int, list[tuple[str, str]]] = defaultdict(list)

            for entry in named_entries:
                expected_text = entry.wiki_fields.get(field_name)
                if not expected_text or not isinstance(expected_text, str):
                    continue
                norm_expected = _normalize_name(expected_text)

                for prop in entry.properties:
                    if prop.is_array:
                        continue
                    # Check if value looks like a string ref.
                    # 0x79 entries reference the localization archive
                    # directly via 0x25XXXXXX file IDs.
                    if isinstance(prop.value, int):
                        high = (prop.value >> 24) & 0xFF
                        if high in (0x25, 0x0A):
                            resolved = string_table.get(prop.value)
                            if resolved:
                                str_candidates[prop.key].append((
                                    _normalize_name(resolved),
                                    norm_expected,
                                ))

            best_key = None
            best_confidence = 0.0
            best_count = 0

            for key, pairs in str_candidates.items():
                if key in claimed_keys:
                    continue
                matches = sum(1 for actual, exp in pairs if actual == exp)
                total = len(pairs)
                if matches < min_matches:
                    continue
                confidence = matches / total
                if confidence >= min_confidence and confidence > best_confidence:
                    best_key = key
                    best_confidence = confidence
                    best_count = matches

            if best_key is not None:
                mappings.append(KeyMapping(
                    key=best_key,
                    name=field_name,
                    confidence=best_confidence,
                    match_count=best_count,
                    sample_values=[],
                ))
                claimed_keys.add(best_key)

    mappings.sort(key=lambda m: (-m.confidence, -m.match_count))
    return mappings


# ---------------------------------------------------------------------------
# Step 3: Orchestration
# ---------------------------------------------------------------------------


def build_name_map(
    ddo_path: Path,
    wiki_items_path: Path,
    *,
    on_progress: Callable[[str], None] | None = None,
) -> NameMapResult:
    """Run the full name mapping pipeline.

    Args:
        ddo_path: DDO installation directory containing .dat files.
        wiki_items_path: Path to items.json from wiki scraper.
        on_progress: Optional callback for status messages.

    Returns:
        NameMapResult with discovered mappings.
    """
    result = NameMapResult()

    # Load wiki items
    with open(wiki_items_path) as f:
        wiki_items = json.load(f)
    if on_progress:
        on_progress(f"Loaded {len(wiki_items)} wiki items")

    # Load string table from English archive
    english_path = ddo_path / "client_local_English.dat"
    if not english_path.exists():
        logger.error("English archive not found: %s", english_path)
        return result

    if on_progress:
        on_progress("Loading string table from client_local_English.dat...")
    english_archive = DatArchive(english_path)
    english_archive.read_header()
    string_table = load_string_table(english_archive)
    if on_progress:
        on_progress(f"  {len(string_table):,} strings loaded")

    # Scan gamelogic entries
    gamelogic_path = ddo_path / "client_gamelogic.dat"
    if not gamelogic_path.exists():
        logger.error("Gamelogic archive not found: %s", gamelogic_path)
        return result

    if on_progress:
        on_progress("Scanning gamelogic entries...")
    gamelogic_archive = DatArchive(gamelogic_path)
    gamelogic_archive.read_header()
    entries = traverse_btree(gamelogic_archive)
    if on_progress:
        on_progress(f"  {len(entries):,} entries scanned")

    # Match wiki items to gamelogic entries
    if on_progress:
        on_progress("Matching wiki items to gamelogic entries...")
    matched, unmatched = match_wiki_to_entries(
        wiki_items, string_table, gamelogic_archive, entries,
    )
    result.matched_entries = len(matched)
    result.unmatched_wiki = unmatched
    if on_progress:
        on_progress(f"  {len(matched)} matched, {unmatched} unmatched")

    if not matched:
        return result

    # Correlate property keys
    if on_progress:
        on_progress("Correlating property keys...")
    result.mappings = correlate_keys(matched, string_table)
    if on_progress:
        on_progress(f"  {len(result.mappings)} mappings discovered")

    # Collect unmapped high-frequency keys
    mapped_keys = {m.key for m in result.mappings}
    key_freq: dict[int, int] = defaultdict(int)
    for entry in matched:
        for prop in entry.properties:
            if not prop.is_array and prop.key not in mapped_keys:
                key_freq[prop.key] += 1
    result.unmapped_keys = sorted(
        key_freq, key=lambda k: -key_freq[k],
    )[:20]

    return result


# ---------------------------------------------------------------------------
# Formatters
# ---------------------------------------------------------------------------


def format_name_map(result: NameMapResult) -> str:
    """Format name map results as human-readable text."""
    lines: list[str] = []
    lines.append(f"Matched entries: {result.matched_entries}")
    lines.append(f"Unmatched wiki items: {result.unmatched_wiki}")
    lines.append("")

    if result.mappings:
        lines.append(f"Discovered mappings ({len(result.mappings)}):")
        lines.append("-" * 60)
        for m in result.mappings:
            vals = ", ".join(str(v) for v in m.sample_values) if m.sample_values else "-"
            lines.append(
                f"  0x{m.key:08X}  {m.name:<25s} "
                f"conf={m.confidence:.0%}  n={m.match_count}  "
                f"samples=[{vals}]"
            )
    else:
        lines.append("No mappings discovered.")

    if result.unmapped_keys:
        lines.append("")
        lines.append(f"Top unmapped keys ({len(result.unmapped_keys)}):")
        for key in result.unmapped_keys[:10]:
            lines.append(f"  0x{key:08X}")

    return "\n".join(lines)


def format_name_map_json(result: NameMapResult) -> dict:
    """Format name map results as a JSON-serializable dict."""
    return {
        "summary": {
            "matched_entries": result.matched_entries,
            "unmatched_wiki": result.unmatched_wiki,
            "mappings_found": len(result.mappings),
        },
        "mappings": [
            {
                "key": f"0x{m.key:08X}",
                "key_int": m.key,
                "name": m.name,
                "confidence": round(m.confidence, 4),
                "match_count": m.match_count,
                "sample_values": m.sample_values,
            }
            for m in result.mappings
        ],
        "unmapped_keys": [f"0x{k:08X}" for k in result.unmapped_keys],
    }
