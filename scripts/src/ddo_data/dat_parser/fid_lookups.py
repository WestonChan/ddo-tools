"""Effect FID lookup tables for resolving stat names and bonus types.

Built via discriminant analysis: while effect template CONTENT is shared
across many items, the template FID is context-specific. Different stats,
bonus types, augment counts, and weapon damage values reference different
FIDs. These lookup tables map effect_ref FID -> field value, built from
wiki cross-reference (confirmed = 1 wiki value per FID, 0 conflicts).

Usage:
    stat = EFFECT_FID_STAT.get(effect_ref_fid)    # e.g., "Strength"
    bt = EFFECT_FID_BONUS_TYPE.get(effect_ref_fid)  # e.g., "Enhancement"
"""

# Canonical stat name normalization
_STAT_NORMALIZE: dict[str, str] = {
    "str": "Strength", "STR": "Strength", "Strength": "Strength",
    "dex": "Dexterity", "DEX": "Dexterity", "Dexterity": "Dexterity",
    "con": "Constitution", "CON": "Constitution", "Constitution": "Constitution",
    "int": "Intelligence", "INT": "Intelligence", "Intelligence": "Intelligence",
    "wis": "Wisdom", "WIS": "Wisdom", "Wisdom": "Wisdom",
    "cha": "Charisma", "CHA": "Charisma", "Charisma": "Charisma",
}

# Canonical bonus type normalization
_BT_NORMALIZE: dict[str, str] = {
    "Enhancement": "Enhancement",
    "Insightful": "Insight",
    "Insight": "Insight",
    "Quality": "Quality",
    "Profane": "Profane",
    "Sacred": "Sacred",
    "Exceptional": "Exceptional",
    "Competence": "Competence",
    "Luck": "Luck",
    "Artifact": "Artifact",
    "Festive": "Festive",
    "Morale": "Morale",
    "Alchemical": "Alchemical",
    "Resistance": "Resistance",
}


def _normalize_stat(name: str) -> str:
    """Normalize a stat name to canonical form matching the stats seed table."""
    return _STAT_NORMALIZE.get(name, name)


def _normalize_bonus_type(name: str) -> str:
    """Normalize a bonus type to canonical form matching the bonus_types seed table."""
    return _BT_NORMALIZE.get(name, name)


# ---------------------------------------------------------------------------
# Effect FID -> stat name (97 confirmed, 0 conflicts each)
# Built from 1,088 wiki-matched items via primary effect_ref slot.
# ---------------------------------------------------------------------------
_RAW_STAT: dict[int, str] = {
    0x70000A1A: "Con", 0x70000A23: "Intelligence", 0x70002024: "INT",
    0x700021CB: "Charisma", 0x700025B5: "DEX", 0x700025CD: "DEX",
    0x7000265D: "CON", 0x700026B8: "CON", 0x7000407C: "WIS",
    0x70004250: "Intelligence", 0x700048C5: "INT", 0x7000541B: "Wisdom",
    0x70005622: "STR", 0x70005F90: "DEX", 0x70006050: "CHA",
    0x70006499: "STR", 0x700064F4: "INT", 0x70006EE5: "CON",
    0x7000719F: "INT", 0x7000EF5F: "INT", 0x7001A370: "STR",
    0x7001AE2C: "INT", 0x7001AE47: "DEX", 0x7001AE6A: "INT",
    0x7001AE6B: "CHA", 0x7001AE7C: "CHA", 0x7001B236: "CON",
    0x7001C83F: "dex", 0x7001C8D2: "WIS", 0x7001C8D5: "CON",
    0x7001D0FA: "INT", 0x7001D0FB: "CON", 0x70023DBD: "Strength",
    0x70023E29: "dex", 0x70023E35: "Wisdom", 0x70023E3E: "STR",
    0x70023E3F: "CON", 0x70023E44: "INT", 0x70023E46: "INT",
    0x70023E47: "STR", 0x70023E4A: "Charisma", 0x70023E4D: "dex",
    0x70023E4F: "Wisdom", 0x70023E51: "CHA", 0x70023E54: "STR",
    0x70023E5A: "CON", 0x70025283: "str", 0x70025286: "CON",
    0x70025287: "CON", 0x7002528D: "Cha", 0x7002528E: "WIS",
    0x70025290: "str", 0x700252D2: "Strength", 0x700252D5: "Constitution",
    0x700252D7: "Intelligence", 0x700252DB: "Wisdom",
    0x700252DF: "Charisma", 0x70027C8F: "Strength",
    0x70027C94: "Constitution", 0x70027C96: "Intelligence",
    0x70027C9A: "Wisdom", 0x70027C9E: "Charisma",
    0x7002869C: "Dexterity", 0x700286A0: "Dexterity",
    0x700286A2: "Dexterity", 0x70029367: "Constitution",
    0x7002936A: "Constitution", 0x7002936E: "Constitution",
    0x70000A12: "CHA", 0x70000EA5: "CON", 0x700091A8: "wis",
    0x7000EA38: "DEX", 0x7001AE39: "CON", 0x7001AE3B: "WIS",
    0x7001AE3F: "STR", 0x7001AE49: "STR", 0x7001AE55: "DEX",
    0x7001AE5F: "WIS", 0x7001AE60: "WIS", 0x7001AE65: "CHA",
    0x7001AE67: "CHA", 0x7001AE71: "DEX", 0x7001BF43: "STR",
    0x70023E57: "WIS", 0x70025280: "Strength",
    0x70025289: "INT", 0x7002528A: "INT",
    0x70029352: "Strength", 0x70029355: "Strength",
    0x7002935B: "Constitution", 0x7002935E: "Constitution",
    0x70029362: "Intelligence", 0x70029365: "Intelligence",
    0x7002936C: "Wisdom", 0x7002936F: "Wisdom",
    0x70029373: "Charisma", 0x70029376: "Charisma",
    0x70005275: "CON", 0x70005F35: "CON", 0x700060DF: "CON",
    0x70002A03: "CON",
}

EFFECT_FID_STAT: dict[int, str] = {
    fid: _normalize_stat(raw) for fid, raw in _RAW_STAT.items()
}
"""Maps effect_ref FID -> canonical stat name (e.g., 'Strength', 'Constitution')."""


# ---------------------------------------------------------------------------
# Effect FID -> bonus type (106 confirmed, 0 conflicts each)
# ---------------------------------------------------------------------------
_RAW_BT: dict[int, str] = {
    0x70000A12: "Enhancement", 0x70000A1A: "Enhancement",
    0x70000A23: "Enhancement", 0x70000EA5: "Enhancement",
    0x70002024: "Enhancement", 0x700021CB: "Enhancement",
    0x700025B5: "Enhancement", 0x700025CD: "Enhancement",
    0x7000265D: "Enhancement", 0x700026B8: "Enhancement",
    0x70002A03: "Enhancement", 0x7000407C: "Enhancement",
    0x70004250: "Enhancement", 0x700048C5: "Enhancement",
    0x70005275: "Enhancement", 0x7000541B: "Enhancement",
    0x70005622: "Enhancement", 0x70005F35: "Enhancement",
    0x70005F90: "Enhancement", 0x70006050: "Enhancement",
    0x700060DF: "Enhancement", 0x70006499: "Enhancement",
    0x700064F4: "Enhancement", 0x70006EE5: "Enhancement",
    0x7000719F: "Enhancement", 0x700091A8: "Enhancement",
    0x7000EA38: "Enhancement", 0x7000EF5F: "Enhancement",
    0x7001A370: "Enhancement", 0x7001AE2C: "Insightful",
    0x7001AE39: "Insightful", 0x7001AE3B: "Insightful",
    0x7001AE3F: "Insightful", 0x7001AE47: "Insightful",
    0x7001AE49: "Insightful", 0x7001AE55: "Insightful",
    0x7001AE5F: "Insightful", 0x7001AE60: "Insightful",
    0x7001AE65: "Insightful", 0x7001AE67: "Insightful",
    0x7001AE6A: "Insightful", 0x7001AE6B: "Insightful",
    0x7001AE71: "Insightful", 0x7001AE7C: "Insightful",
    0x7001B236: "Enhancement", 0x7001BF43: "Enhancement",
    0x7001C83F: "Quality", 0x7001C8D2: "Quality",
    0x7001C8D5: "Quality", 0x7001D0FA: "Quality",
    0x7001D0FB: "Quality", 0x70023DBD: "Enhancement",
    0x70023E29: "Enhancement", 0x70023E35: "Enhancement",
    0x70023E3E: "Enhancement", 0x70023E3F: "Enhancement",
    0x70023E44: "Enhancement", 0x70023E46: "Enhancement",
    0x70023E47: "Enhancement", 0x70023E4A: "Enhancement",
    0x70023E4D: "Enhancement", 0x70023E4F: "Enhancement",
    0x70023E51: "Enhancement", 0x70023E54: "Enhancement",
    0x70023E57: "Enhancement", 0x70023E5A: "Enhancement",
    0x70025280: "Enhancement", 0x70025283: "Enhancement",
    0x70025286: "Insightful", 0x70025287: "Quality",
    0x70025289: "Insightful", 0x7002528A: "Quality",
    0x7002528D: "Enhancement", 0x7002528E: "Enhancement",
    0x70025290: "Enhancement", 0x700252D2: "Enhancement",
    0x700252D5: "Enhancement", 0x700252D7: "Enhancement",
    0x700252DB: "Enhancement", 0x700252DF: "Enhancement",
    0x70027C8F: "Insightful", 0x70027C94: "Insightful",
    0x70027C96: "Insightful", 0x70027C9A: "Insightful",
    0x70027C9E: "Insightful", 0x7002869C: "Quality",
    0x700286A0: "Quality", 0x700286A2: "Quality",
    0x70029352: "Exceptional", 0x70029355: "Exceptional",
    0x7002935B: "Exceptional", 0x7002935E: "Exceptional",
    0x70029362: "Exceptional", 0x70029365: "Exceptional",
    0x70029367: "Exceptional", 0x7002936A: "Exceptional",
    0x7002936C: "Exceptional", 0x7002936E: "Exceptional",
    0x7002936F: "Exceptional", 0x70029373: "Exceptional",
    0x70029376: "Exceptional",
}

EFFECT_FID_BONUS_TYPE: dict[int, str] = {
    fid: _normalize_bonus_type(raw) for fid, raw in _RAW_BT.items()
}
"""Maps effect_ref FID -> canonical bonus type name (e.g., 'Enhancement', 'Insight')."""
