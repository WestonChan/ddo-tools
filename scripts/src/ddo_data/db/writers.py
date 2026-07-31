"""Insert functions for populating the DDO game database from scraper dicts."""

from __future__ import annotations

import html
import logging
from collections.abc import Callable, Iterable
from typing import Any

from ddo_data.enums import (
    DataSource, Handedness, ItemCategory, LootType, Rarity, ResolutionMethod,
    TreeType,
)
import re
import sqlite3

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Writer-boundary string normalization
#
# 91 shipped rows carried raw HTML entities ("Admiral&#39;s Gloves") across 7
# TEXT columns produced by 5 different parsers. Normalizing here — where rows
# are written — fixes all of them at once and keeps the next parser from
# reintroducing the problem. `canonical_text` must stay idempotent: the writer
# normalizes on insert and `normalize_stored_text` normalizes again over rows
# that predate this code.
# ---------------------------------------------------------------------------

_HTML_COMMENT_RE = re.compile(r"<!--.*?(?:-->|$)", re.DOTALL)
_HTML_TAG_RE = re.compile(r"<[^<>]+>")
# [[Target|Display]] -> Display; [[Target]] -> Target.
_WIKILINK_RE = re.compile(r"\[\[(?:[^\[\]|]*\|)?([^\[\]|]*)\]\]")

# Bounded so a pathological "&amp;amp;amp;..." can't spin; four rounds is far
# more nesting than any wiki text carries.
_MAX_UNESCAPE_ROUNDS = 4

# Dict keys whose value labels an entity. `_clean_input` routes these through
# `canonical_name`; everything else keeps `canonical_text`.
_NAME_KEYS: frozenset[str] = frozenset({"name"})


def _decode_entities(text: str) -> str:
    """Unescape HTML entities to a fixed point, so decoding is idempotent."""
    for _ in range(_MAX_UNESCAPE_ROUNDS):
        decoded = html.unescape(text)
        if decoded == text:
            return text
        text = decoded
    return text


def canonical_text(value: str | None) -> str | None:
    """Normalize a TEXT value on its way into the database.

    Decodes HTML entities to a fixed point (so the function is idempotent),
    drops editor comments — ``item_materials`` shipped a row literally named
    ``'No <!--'`` — and trims surrounding whitespace. Empty results become
    None: absence is spelled NULL, not ``''``.
    """
    if value is None:
        return None
    text = _HTML_COMMENT_RE.sub("", _decode_entities(value)).strip()
    return text or None


def canonical_name(value: str | None) -> str | None:
    """Normalize a value that *names* an entity.

    Everything ``canonical_text`` does, plus the markup a name can never
    legitimately carry — because a name is a label, so wikitext in it is a leak
    rather than meaning:

    * a template expands to its display text (``{{HELstats|3|L=6}}`` -> ``3``),
    * a wikilink renders as the text a reader sees
      (``[[True Seeing (enhancement)|True Seeing]]`` -> ``True Seeing``) rather
      than being stripped to nothing,
    * an HTML tag becomes a word boundary — 380 ``crafting_options.name`` values
      ended in ``<br />``, and one splits two names across the break, so
      deleting the tag outright would fuse them into ``FearFearsome``.

    Descriptions deliberately do **not** come through here: their markup carries
    prose structure (wiki tables, list markers, colour spans) that a label-level
    rule would destroy, and cleaning it is Phase 4m's work.
    """
    if value is None:
        return None
    from ..wiki.templates import expand_display_text

    text = _HTML_COMMENT_RE.sub("", _decode_entities(value))
    text = expand_display_text(text)
    text = _WIKILINK_RE.sub(r"\1", text)
    text = _HTML_TAG_RE.sub(" ", text)
    return " ".join(text.split()) or None


def _clean_input(record: Any, *, key: str | None = None) -> Any:
    """Recursively normalize every string in a scraper record.

    Applied at the top of each ``insert_*`` function so the normalization
    boundary is the writer, not any individual parser. A value stored under a
    name key gets the stricter ``canonical_name`` treatment.
    """
    if isinstance(record, str):
        return canonical_name(record) if key in _NAME_KEYS else canonical_text(record)
    if isinstance(record, dict):
        return {k: _clean_input(v, key=k) for k, v in record.items()}
    if isinstance(record, list):
        cleaned = [_clean_input(value, key=key) for value in record]
        return [value for value in cleaned if value is not None]
    return record


def _clean_inputs(records: list[dict]) -> list[dict]:
    """Normalize a list of scraper records."""
    return [_clean_input(record) for record in records]


# ---------------------------------------------------------------------------
# Normalizing rows that are already stored
#
# `build-db` cannot rebuild from scratch: ddowiki's WAF answers every
# non-browser client with HTTP 202 and an empty body, so category enumeration
# is dead and only the ~14k cached pages can be re-read. The build therefore
# updates the existing database, and rows written before this code existed are
# never touched by an insert. These passes apply the *same* functions the
# writer applies, so the two can never disagree, and they run before ingestion
# so a freshly scraped clean name lands on the already-cleaned row rather than
# creating a duplicate.
# ---------------------------------------------------------------------------

# Columns whose variants no deterministic rule can decide (is the enhancement
# "Self Reliant" or "Self-Reliant"? the wiki spells it both ways), so the
# majority spelling in the column wins. Sourced from the 2026-07-28 duplicate
# audit in docs/notes/DB Errors.md.
#
# `items.name` is deliberately absent: its remaining variant pair
# ("Shadow Sight"/"Shadowsight") is two distinct wiki pages, and collapsing
# entity names would merge real items. The `(level N)` groups it also had are
# fixed at the parser instead.
_VARIANT_COLUMNS: tuple[tuple[str, str], ...] = (
    ("bonuses", "name"),
    ("item_materials", "name"),
    ("enhancements", "name"),
    ("item_weapon_stats", "attack_mod"),
    ("item_weapon_stats", "damage_mod"),
    ("item_weapon_stats", "damage_class"),
    ("items", "race_required"),
    ("spells", "spell_resistance"),
    ("spells", "range"),
    ("class_bonus_feat_slots", "slot_label"),
)


# A sign directly in front of a number is meaning, not punctuation. Stripping
# it made "Constitution -2" and "Constitution +2" share a key, so the collapse
# relabelled 18 penalties as bonuses — and `renormalize_bonus_names` rebuilt the
# sign from `value` on the next pass, giving the two passes an endless argument
# that the *last one to run* won. Hyphens elsewhere still collapse, which is the
# whole point of the key ("Self-Reliant" / "Self Reliant").
_SIGN_BEFORE_NUMBER_RE = re.compile(r"([+-])(?=\d)")
_SIGN_WORDS = {"+": " plus ", "-": " minus "}


def _variant_key(value: str) -> str:
    """Case- and punctuation-insensitive key grouping spellings of one value."""
    signed = _SIGN_BEFORE_NUMBER_RE.sub(
        lambda m: _SIGN_WORDS[m.group(1)], value.lower()
    )
    return re.sub(r"[^a-z0-9]", "", signed)


def _table_columns(conn: sqlite3.Connection, table: str) -> list[tuple[str, str, bool]]:
    """``[(name, declared_type, not_null)]`` for *table*, empty if absent."""
    try:
        rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    except sqlite3.OperationalError:
        return []
    return [(r[1], (r[2] or "").upper(), bool(r[3])) for r in rows]


def _text_columns(conn: sqlite3.Connection) -> list[tuple[str, str, bool]]:
    """Every TEXT column in the database as ``(table, column, not_null)``."""
    tables = [
        r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' "
            "AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]
    result: list[tuple[str, str, bool]] = []
    for table in tables:
        for name, decl_type, not_null in _table_columns(conn, table):
            if decl_type.startswith("TEXT"):
                result.append((table, name, not_null))
    return result


def _referencing_columns(
    conn: sqlite3.Connection, table: str,
) -> list[tuple[str, str]]:
    """``[(child_table, child_column)]`` for every FK pointing at *table*.

    Derived from ``PRAGMA foreign_key_list`` rather than a hand-kept list, so a
    new child table is picked up without editing this module.
    """
    children: list[tuple[str, str]] = []
    for (child,) in conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    ).fetchall():
        for fk in conn.execute(f"PRAGMA foreign_key_list({child})").fetchall():
            # (id, seq, table, from, to, on_update, on_delete, match)
            if fk[2] == table:
                children.append((child, fk[3]))
    return children


def _merge_rows(
    conn: sqlite3.Connection, table: str, keeper_id: int, loser_id: int,
) -> None:
    """Fold *loser_id* into *keeper_id*, repointing everything that referred to it.

    ``UPDATE OR IGNORE`` handles child rows that would collide with one the
    keeper already has (both items pointing at the same quest, say); the
    leftovers are then deleted rather than left dangling.
    """
    for child, column in _referencing_columns(conn, table):
        conn.execute(
            f"UPDATE OR IGNORE {child} SET {column} = ? WHERE {column} = ?",
            (keeper_id, loser_id),
        )
        conn.execute(f"DELETE FROM {child} WHERE {column} = ?", (loser_id,))
    conn.execute(f"DELETE FROM {table} WHERE id = ?", (loser_id,))


def _has_id_column(conn: sqlite3.Connection, table: str) -> bool:
    return any(name == "id" for name, _, _ in _table_columns(conn, table))


def _normalize_column(
    conn: sqlite3.Connection,
    table: str,
    column: str,
    normalizer: Callable[[str], str | None],
    *,
    not_null: bool,
    where: str | None = None,
) -> int:
    """Rewrite *column* through *normalizer*, merging rows that then collide.

    Returns the number of rows changed. A row whose normalized value would be
    NULL in a NOT NULL column is left alone — dropping the value would lose
    more than the untidy spelling costs.
    """
    sql = f"SELECT rowid, {column} FROM {table} WHERE {column} IS NOT NULL"
    if where:
        sql += f" AND ({where})"
    try:
        rows = conn.execute(sql).fetchall()
    except sqlite3.OperationalError:
        return 0

    changed = 0
    for rowid, old in rows:
        if not isinstance(old, str):
            continue
        new = normalizer(old)
        if new == old:
            continue
        if new is None and not_null:
            continue
        try:
            # Deliberately not wrapped in `with conn:` — a failed statement only
            # undoes itself, whereas the context manager would roll back the
            # whole surrounding transaction, including the caller's inserts.
            conn.execute(
                f"UPDATE {table} SET {column} = ? WHERE rowid = ?", (new, rowid)
            )
        except sqlite3.IntegrityError:
            # A row already holds the normalized value — fold this one into it.
            if not _has_id_column(conn, table):
                logger.warning(
                    "Cannot normalize %s.%s %r -> %r (conflict, no id column)",
                    table, column, old, new,
                )
                continue
            keeper = conn.execute(
                f"SELECT id FROM {table} WHERE {column} = ? AND rowid != ?",
                (new, rowid),
            ).fetchone()
            loser = conn.execute(
                f"SELECT id FROM {table} WHERE rowid = ?", (rowid,)
            ).fetchone()
            if keeper is None or loser is None:
                continue
            _merge_rows(conn, table, keeper[0], loser[0])
        changed += 1
    return changed


def normalize_stored_text(conn: sqlite3.Connection) -> int:
    """Apply the writer's text normalization to rows already in the database.

    Runs ``canonical_text`` over every TEXT column, plus the deterministic
    effect-name canonicalization the writer uses, and merges any rows that
    become duplicates as a result. Idempotent — a second run reports 0.
    """
    from ..dat_parser.effects import canonical_effect_name

    changed = _normalize_column(
        conn, "effects", "name", canonical_effect_name, not_null=True,
    )

    # Only rows that can possibly change are read back: an entity reference, an
    # editor comment, or untrimmed whitespace.
    candidates = (
        "{col} LIKE '%&%;%' OR {col} LIKE '%<!--%' OR {col} <> trim({col})"
    )
    for table, column, not_null in _text_columns(conn):
        if (table, column) == ("effects", "name"):
            continue
        # Name columns are swept unfiltered: `canonical_name` normalizes more
        # than entities (markup, HTML tags, internal whitespace), and a
        # candidate predicate that missed one of those would let a stored name
        # disagree with what the writer now produces — which is how a rescrape
        # would land a collapsed name *beside* its untidy twin instead of on it.
        changed += _normalize_column(
            conn, table, column,
            canonical_name if column in _NAME_KEYS else canonical_text,
            not_null=not_null,
            where=None if column in _NAME_KEYS else candidates.format(col=column),
        )
    conn.commit()
    return changed


def collapse_value_variants(conn: sqlite3.Connection) -> int:
    """Collapse case/punctuation spellings of one value to the majority spelling.

    For the columns in ``_VARIANT_COLUMNS``, values that differ only in case or
    punctuation are the same value — any consumer filtering on ``attack_mod =
    'STR'`` silently missed the rows spelled ``'Str'``. The winner is the
    spelling used by the most rows; ties go to the one with more capitals, then
    alphabetically, so the outcome does not depend on row order.
    """
    changed = 0
    for table, column in _VARIANT_COLUMNS:
        if not any(name == column for name, _, _ in _table_columns(conn, table)):
            continue
        groups: dict[str, list[tuple[str, int]]] = {}
        rows = conn.execute(
            f"SELECT {column}, COUNT(*) FROM {table} "
            f"WHERE {column} IS NOT NULL AND {column} != '' GROUP BY {column}"
        ).fetchall()
        for value, count in rows:
            if isinstance(value, str):
                groups.setdefault(_variant_key(value), []).append((value, count))

        for variants in groups.values():
            if len(variants) < 2:
                continue
            keeper = sorted(
                variants,
                key=lambda v: (-v[1], -sum(1 for c in v[0] if c.isupper()), v[0]),
            )[0][0]
            for value, _count in variants:
                if value == keeper:
                    continue
                changed += _rename_value(conn, table, column, value, keeper)
    conn.commit()
    return changed


# ---------------------------------------------------------------------------
# Repairing rows the pre-4c parsers wrote
#
# Each pass here is the stored-row half of a parser fix. The parser fix alone
# only reaches rows the re-scrape rewrites — and because inserts are
# INSERT OR IGNORE, a corrected row lands *beside* the stale one rather than
# replacing it, so an item ends up displaying Incite twice with one of them
# wrong. These passes reconcile the old shape with the new.
# ---------------------------------------------------------------------------

# Effect names that were never enchantments: wiki maintenance markers and the
# crafting-choice wrappers, whose alternatives are now parsed individually.
# `UpgradeableAugment` is deliberately absent — those rows are the only stored
# trace of 72 augment slots, and creating the slots is Phase 4m's work.
_NON_ENCHANTMENT_EFFECT_NAMES: tuple[str, ...] = (
    "bug", "inlinewht", "orphan", "underlinked", "top", "history", "stub",
    "ref", "cleanup", "expand", "nearly finished", "almost there",
)


def repair_stored_rows(conn: sqlite3.Connection) -> dict[str, int]:
    """Bring rows written by the old parsers up to the current behaviour.

    Must run *before* ``populate_enchantment_descriptions``: the
    ``{{Save|Spell|N}}`` repair identifies its rows by the template still in
    their description, and expanding descriptions erases that evidence.

    Returns a count per pass. Idempotent — a second run reports all zeros.
    """
    return {
        "spell_saves_retargeted": _retarget_spell_save_bonuses(conn),
        "effect_modifiers_regraded": _regrade_effect_modifiers(conn),
        "effect_names_regraded": _regrade_effect_names(conn),
        "maintenance_rows_deleted": _delete_maintenance_effects(conn),
        "items_merged": _merge_items_sharing_a_wiki_page(conn),
        "duplicate_item_bonuses_deleted": _deduplicate_item_bonuses(conn),
        "duplicate_item_effects_deleted": _deduplicate_item_effects(conn),
    }


def _deduplicate_item_effects(conn: sqlite3.Connection) -> int:
    """The same repair for ``item_effects``, which is keyed the same way.

    ``value`` is *not* part of the key here, so identity is
    ``(item_id, effect_id, value)``: an item may legitimately carry
    ``{{Bane|Evil Outsider|2}}`` and ``{{Bane|Undead|4}}``, and collapsing those
    would delete a real enchantment rather than a ghost.
    """
    cur = conn.execute(
        """
        DELETE FROM item_effects AS dup
         WHERE EXISTS (
               SELECT 1 FROM item_effects later
                WHERE later.item_id = dup.item_id
                  AND later.effect_id = dup.effect_id
                  AND COALESCE(later.value, -1) = COALESCE(dup.value, -1)
                  AND later.sort_order > dup.sort_order
         )
        """
    )
    conn.commit()
    return cur.rowcount


def _deduplicate_item_bonuses(conn: sqlite3.Connection) -> int:
    """Collapse ``item_bonuses`` rows an item holds more than once.

    ``sort_order`` is part of the primary key, so ``INSERT OR IGNORE`` only
    recognises a row it wrote *at the same offset*. Add a routing step that
    emits rows earlier in the list and every later enchantment shifts down one
    slot, gets re-inserted at its new offset, and leaves its old copy behind.
    Adding step 1b for ``{{Enhancement bonus}}`` did exactly that to the shipped
    database: 7,972 ghost rows, each with a correct value, silently doubling the
    enchantment list of every item that carried one.

    This is invariant 6 seen from an angle the idempotency tests cannot cover on
    their own — the duplication appears when the *writer* changes, which is the
    one moment a "did the row counts move?" check expects movement.

    The **highest** ``sort_order`` wins — the freshest write, which is where the
    current parser puts the enchantment. Keeping the lowest instead looks
    tidier and never converges: the writer re-inserts at its own offset on every
    run, so the repair would delete the same rows again forever and the shipped
    display order would stay frozen at whatever the superseded parser produced.
    """
    cur = conn.execute(
        """
        DELETE FROM item_bonuses AS dup
         WHERE EXISTS (
               SELECT 1 FROM item_bonuses later
                WHERE later.item_id = dup.item_id
                  AND later.bonus_id = dup.bonus_id
                  AND later.sort_order > dup.sort_order
         )
        """
    )
    conn.commit()
    return cur.rowcount


def _retarget_spell_save_bonuses(conn: sqlite3.Connection) -> int:
    """Move ``{{Save|Spell|N}}`` bonuses from Spell Resistance to Spell Save.

    A spell saving throw (values 1-8) and Spell Resistance (the caster-level
    check, 17-41) are different mechanics; 18 items looked like they carried the
    same enchantment twice because both landed on stat 21.
    """
    save_stat = conn.execute(
        "SELECT id, name FROM stats WHERE name = 'Spell Save'"
    ).fetchone()
    if save_stat is None:
        return 0
    save_id, save_name = save_stat

    rows = conn.execute(
        """
        SELECT id, value FROM bonuses
         WHERE stat_id IS NOT NULL AND stat_id != ?
           AND (description LIKE '{{Save|spell|%' OR description LIKE '{{Saves|spell|%')
        """,
        (save_id,),
    ).fetchall()

    changed = 0
    for bonus_id, value in rows:
        new_name = _bonus_name(save_name, value)
        try:
            conn.execute(
                "UPDATE bonuses SET stat_id = ?, name = ? WHERE id = ?",
                (save_id, new_name, bonus_id),
            )
        except sqlite3.IntegrityError:
            # The re-scrape already created the corrected row; fold into it.
            keeper = conn.execute(
                """
                SELECT id FROM bonuses
                 WHERE stat_id = ? AND name = ? AND id != ?
                   AND COALESCE(value, -1) = COALESCE(?, -1)
                """,
                (save_id, new_name, bonus_id, value),
            ).fetchone()
            if keeper is None:
                continue
            _merge_rows(conn, "bonuses", keeper[0], bonus_id)
        changed += 1
    conn.commit()
    return changed


def _regrade_effect_modifiers(conn: sqlite3.Connection) -> int:
    """Move magnitudes out of ``effects.modifier`` into ``item_effects.value``.

    ``modifier`` is the bonus type. 153 rows held a number there instead —
    ``{{Incite|59|Insightful}}`` parsed as modifier "59" with the bonus type
    discarded. The magnitude is recoverable and moves to the column that exists
    for it; the bonus type is not, so a row whose re-scraped replacement already
    carries the type is dropped in favour of that replacement.

    Ordinal modifiers are left alone: ``{{Burns|3rd}}`` (44 uses) is a tier.
    """
    from ..dat_parser.effects import _numeric_param

    rows = conn.execute(
        "SELECT id, name, modifier FROM effects WHERE modifier IS NOT NULL"
    ).fetchall()

    changed = 0
    for effect_id, name, modifier in rows:
        magnitude = _numeric_param(modifier)
        has_template = "{{" in modifier
        # A modifier with no letters or digits ('-') is neither a bonus type nor
        # a magnitude; it is punctuation left over from a wiki placeholder.
        is_noise = not re.search(r"[a-zA-Z0-9]", modifier)
        if magnitude is None and not has_template and not is_noise:
            continue

        target_id = _ensure_effect(conn, name, None)
        if target_id is None:
            continue

        for item_id, value, sort_order in conn.execute(
            "SELECT item_id, value, sort_order FROM item_effects WHERE effect_id = ?",
            (effect_id,),
        ).fetchall():
            replacement = conn.execute(
                """
                SELECT 1 FROM item_effects ie
                  JOIN effects e ON e.id = ie.effect_id
                 WHERE ie.item_id = ? AND e.name = ? AND ie.effect_id != ?
                   AND e.modifier IS NOT NULL
                """,
                (item_id, name, effect_id),
            ).fetchone()
            if replacement is not None:
                continue
            conn.execute(
                """
                INSERT OR IGNORE INTO item_effects
                    (item_id, effect_id, value, sort_order, data_source)
                SELECT ?, ?, COALESCE(?, ?), ?, data_source
                  FROM item_effects WHERE item_id = ? AND effect_id = ? AND sort_order = ?
                """,
                (item_id, target_id, value, magnitude, sort_order,
                 item_id, effect_id, sort_order),
            )

        conn.execute("DELETE FROM item_effects WHERE effect_id = ?", (effect_id,))
        if target_id != effect_id:
            conn.execute("DELETE FROM effects WHERE id = ?", (effect_id,))
        else:
            conn.execute(
                "UPDATE effects SET modifier = NULL WHERE id = ?", (effect_id,)
            )
        changed += 1
    conn.commit()
    return changed


_NAMED_MAGNITUDE_RE = re.compile(r"^(.+?)\s([+-]\d+)%?$")


def _regrade_effect_names(conn: sqlite3.Connection) -> int:
    """Move a magnitude out of ``effects.name`` into ``item_effects.value``.

    Same rule as ``_regrade_effect_modifiers``, applied to the other column an
    magnitude leaked into: the plain-text fallback path stored one effect as
    ``"Tendon Slice +10"``, which also made it look like a second copy of the
    ``Tendon Slice`` bonus to validation assertion A1.
    """
    rows = conn.execute("SELECT id, name FROM effects").fetchall()
    changed = 0
    for effect_id, name in rows:
        match = _NAMED_MAGNITUDE_RE.match(name or "")
        if match is None:
            continue
        base, magnitude = match.group(1).strip(), int(match.group(2))
        target_id = _ensure_effect(conn, base, None)
        if target_id is None or target_id == effect_id:
            continue
        for item_id, value, sort_order in conn.execute(
            "SELECT item_id, value, sort_order FROM item_effects WHERE effect_id = ?",
            (effect_id,),
        ).fetchall():
            conn.execute(
                """
                INSERT OR IGNORE INTO item_effects
                    (item_id, effect_id, value, sort_order, data_source)
                SELECT ?, ?, COALESCE(?, ?), ?, data_source
                  FROM item_effects WHERE item_id = ? AND effect_id = ? AND sort_order = ?
                """,
                (item_id, target_id, value, magnitude, sort_order,
                 item_id, effect_id, sort_order),
            )
        conn.execute("DELETE FROM item_effects WHERE effect_id = ?", (effect_id,))
        conn.execute("DELETE FROM effects WHERE id = ?", (effect_id,))
        changed += 1
    conn.commit()
    return changed


def _delete_maintenance_effects(conn: sqlite3.Connection) -> int:
    """Delete effects rows that were never enchantments, and their item links."""
    placeholders = ", ".join("?" for _ in _NON_ENCHANTMENT_EFFECT_NAMES)
    ids = [
        row[0] for row in conn.execute(
            f"SELECT id FROM effects WHERE lower(name) IN ({placeholders})",
            _NON_ENCHANTMENT_EFFECT_NAMES,
        ).fetchall()
    ]
    for effect_id in ids:
        conn.execute("DELETE FROM item_effects WHERE effect_id = ?", (effect_id,))
        conn.execute("DELETE FROM effects WHERE id = ?", (effect_id,))
    conn.commit()
    return len(ids)


def _merge_items_sharing_a_wiki_page(conn: sqlite3.Connection) -> int:
    """One wiki page describes one item, so two rows sharing a URL are one item.

    This is how the seven items named ``(level 12)`` are retired: the name fix
    creates a correctly-named row from the same page, and INSERT OR IGNORE
    leaves the old one beside it. The surviving name is the one matching the
    page title, falling back to the longer name.
    """
    from urllib.parse import unquote

    def title_key(url: str) -> str:
        title = unquote(url.rsplit("/", 1)[-1]).removeprefix("Item:")
        return re.sub(r"[^a-z0-9]", "", title.lower())

    duplicates = conn.execute(
        """
        SELECT wiki_url, COUNT(*) FROM items
         WHERE wiki_url IS NOT NULL
         GROUP BY wiki_url HAVING COUNT(*) > 1
        """
    ).fetchall()

    merged = 0
    for url, _count in duplicates:
        rows = conn.execute(
            "SELECT id, name FROM items WHERE wiki_url = ? ORDER BY id", (url,)
        ).fetchall()
        expected = title_key(url)
        keeper = sorted(
            rows,
            key=lambda r: (
                re.sub(r"[^a-z0-9]", "", (r[1] or "").lower()) != expected,
                -len(r[1] or ""),
                r[0],
            ),
        )[0]
        for item_id, _name in rows:
            if item_id == keeper[0]:
                continue
            _merge_rows(conn, "items", keeper[0], item_id)
            merged += 1
    conn.commit()
    return merged


def _rename_value(
    conn: sqlite3.Connection, table: str, column: str, old: str, new: str,
) -> int:
    """Rewrite every ``column = old`` to *new*, merging rows that then collide."""
    cur = conn.execute(
        f"UPDATE OR IGNORE {table} SET {column} = ? WHERE {column} = ?", (new, old)
    )
    renamed = cur.rowcount
    leftovers = conn.execute(
        f"SELECT rowid FROM {table} WHERE {column} = ?", (old,)
    ).fetchall()
    if leftovers and _has_id_column(conn, table):
        keeper = conn.execute(
            f"SELECT id FROM {table} WHERE {column} = ?", (new,)
        ).fetchone()
        if keeper is not None:
            for (rowid,) in leftovers:
                loser = conn.execute(
                    f"SELECT id FROM {table} WHERE rowid = ?", (rowid,)
                ).fetchone()
                if loser is not None and loser[0] != keeper[0]:
                    _merge_rows(conn, table, keeper[0], loser[0])
                    renamed += 1
    return renamed

# ---------------------------------------------------------------------------
# Normalisation maps (wiki strings → schema CHECK constraint values)
# ---------------------------------------------------------------------------

# Wiki {{Named item|TYPE}} positional arg → items.item_category CHECK value
_ITEM_CATEGORY_MAP: dict[str, str] = {
    "weapon":      ItemCategory.WEAPON,
    "armor":       ItemCategory.ARMOR,
    "shield":      ItemCategory.SHIELD,
    "jewelry":     ItemCategory.JEWELRY,
    "ring":        ItemCategory.JEWELRY,
    "necklace":    ItemCategory.JEWELRY,
    "bracelet":    ItemCategory.JEWELRY,
    "trinket":     ItemCategory.JEWELRY,
    "accessory":   ItemCategory.JEWELRY,
    "clothing":    ItemCategory.CLOTHING,
    "outfit":      ItemCategory.CLOTHING,
    "wondrous":    ItemCategory.WONDROUS,
    "potion":      ItemCategory.POTION,
    "scroll":      ItemCategory.SCROLL,
    "wand":        ItemCategory.WAND,
    "component":   ItemCategory.COMPONENT,
    "collectible": ItemCategory.COLLECTIBLE,
    "consumable":  ItemCategory.CONSUMABLE,
}

# Wiki handedness strings → item_weapon_stats.handedness CHECK value
_HANDEDNESS_MAP: dict[str, str] = {
    "one-handed":  Handedness.ONE_HANDED,
    "one handed":  Handedness.ONE_HANDED,
    "1-handed":    Handedness.ONE_HANDED,
    "two-handed":  Handedness.TWO_HANDED,
    "two handed":  Handedness.TWO_HANDED,
    "2-handed":    Handedness.TWO_HANDED,
    "off-hand":    Handedness.OFF_HAND,
    "off hand":    Handedness.OFF_HAND,
    "offhand":     Handedness.OFF_HAND,
    "thrown":      Handedness.THROWN,
    "ranged":      Handedness.TWO_HANDED,  # bows/crossbows are two-handed
    "simple":      Handedness.ONE_HANDED,  # handwraps tagged as "simple" in FID data
}

# ap_pool derived from tree_type
_AP_POOL_MAP: dict[str, str] = {
    TreeType.CLASS:     "heroic",
    TreeType.UNIVERSAL: "heroic",
    TreeType.RACIAL:    "racial",
    TreeType.REAPER:    "reaper",
    TreeType.DESTINY:   "legendary",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _normalise_item_category(raw: str | None) -> str | None:
    if not raw:
        return None
    return _ITEM_CATEGORY_MAP.get(raw.strip().lower())


# Weapon types that imply a specific handedness when wiki doesn't specify one
_WEAPON_TYPE_HANDEDNESS: dict[str, str] = {
    "repeating light crossbow": Handedness.TWO_HANDED,
    "repeating heavy crossbow": Handedness.TWO_HANDED,
    "light crossbow": Handedness.TWO_HANDED,
    "heavy crossbow": Handedness.TWO_HANDED,
    "great crossbow": Handedness.TWO_HANDED,
    "short bow": Handedness.TWO_HANDED,
    "longbow": Handedness.TWO_HANDED,
    "handwrap": Handedness.ONE_HANDED,
    "collar": Handedness.ONE_HANDED,
    "greatsword": Handedness.TWO_HANDED,
    "greataxe": Handedness.TWO_HANDED,
    "greatclub": Handedness.TWO_HANDED,
    "maul": Handedness.TWO_HANDED,
    "falchion": Handedness.TWO_HANDED,
    "quarterstaff": Handedness.TWO_HANDED,
    "rune arm": Handedness.OFF_HAND,
    "orb": Handedness.OFF_HAND,
    "shuriken": Handedness.THROWN,
    "throwing dagger": Handedness.THROWN,
    "throwing hammer": Handedness.THROWN,
    "throwing axe": Handedness.THROWN,
    "dart": Handedness.THROWN,
    # Shields
    "buckler": Handedness.OFF_HAND,
    "small": Handedness.OFF_HAND,
    "large": Handedness.OFF_HAND,
    "tower": Handedness.OFF_HAND,
    "small shield": Handedness.OFF_HAND,
    "large shield": Handedness.OFF_HAND,
    "tower shield": Handedness.OFF_HAND,
    # One-handed weapons
    "bastard sword": Handedness.ONE_HANDED,
    "handaxe": Handedness.ONE_HANDED,
    "hand axe": Handedness.ONE_HANDED,
    "light mace": Handedness.ONE_HANDED,
    "heavy mace": Handedness.ONE_HANDED,
    "sickle": Handedness.ONE_HANDED,
    "longsword": Handedness.ONE_HANDED,
    "shortsword": Handedness.ONE_HANDED,
    "rapier": Handedness.ONE_HANDED,
    "scimitar": Handedness.ONE_HANDED,
    "warhammer": Handedness.ONE_HANDED,
    "light hammer": Handedness.ONE_HANDED,
    "light pick": Handedness.ONE_HANDED,
    "heavy pick": Handedness.ONE_HANDED,
    "battle axe": Handedness.ONE_HANDED,
    "dagger": Handedness.ONE_HANDED,
    "club": Handedness.ONE_HANDED,
    "kukri": Handedness.ONE_HANDED,
    "khopesh": Handedness.ONE_HANDED,
    "kama": Handedness.ONE_HANDED,
    "morningstar": Handedness.ONE_HANDED,
    "dwarven waraxe": Handedness.ONE_HANDED,
    "scepter": Handedness.ONE_HANDED,
    "sceptre": Handedness.ONE_HANDED,
}


def _normalise_handedness(raw: str | None, weapon_type: str | None = None) -> str | None:
    """Map wiki handedness strings to CHECK-valid values, with weapon_type fallback."""
    if raw:
        result = _HANDEDNESS_MAP.get(raw.strip().lower())
        if result:
            return result
    if weapon_type:
        return _WEAPON_TYPE_HANDEDNESS.get(weapon_type.strip().lower())
    return None


def _parse_enchantment(text: str) -> list[dict]:
    """Parse a wiki enchantment string into structured bonus dicts.

    Returns a list (handles composite stats that split into multiple bonuses).
    Returns empty list if unparseable.
    """
    from ..dat_parser.effects import parse_enchantment_string_multi

    return parse_enchantment_string_multi(text)


def _get_named_enchantment_effects(enchantment_name: str) -> list[dict]:
    """Get fixed bonus/penalty effects for a named enchantment.

    Returns additional bonus dicts from NAMED_ENCHANTMENT_EFFECTS lookup.
    Two types:
    - Numeric: has stat + value + bonus_type -> stored as stat bonus
    - Description-only: has description, stat=None -> stored with NULL stat_id
    """
    from ..dat_parser.effects import NAMED_ENCHANTMENT_EFFECTS

    effects = NAMED_ENCHANTMENT_EFFECTS.get(enchantment_name, [])
    result = []
    for e in effects:
        if e.get("stat") is not None and e.get("value") is not None:
            result.append({
                "value": e["value"], "bonus_type": e["bonus_type"], "stat": e["stat"],
            })
        elif e.get("description"):
            result.append({
                "value": None, "bonus_type": None, "stat": None,
                "description": e["description"],
            })
    return result


def _parse_effect(text: str) -> dict | None:
    """Parse a wiki enchantment string as a weapon/armor effect."""
    from ..dat_parser.effects import parse_effect_template

    return parse_effect_template(text)


def _parse_enhancement_bonus(text: str):
    """Decode ``{{Enhancement bonus|kind|N}}``, or None if it isn't one."""
    from ..wiki.enhancement_bonus import parse_enhancement_bonus

    return parse_enhancement_bonus(text)


def _format_bonus_description(
    stat: str | None, value: int | None, bonus_type: str | None,
) -> str | None:
    """Generate a bonus description from its resolved columns (invariant 2)."""
    from ..wiki.templates import format_bonus_description

    return format_bonus_description(stat, value, bonus_type)


def _split_enchantments(entries: Iterable[str]) -> list[str]:
    """Expand wiki enchantment bullets into the enchantments they really hold."""
    from ..wiki.templates import split_enchantment_entry

    result: list[str] = []
    for entry in entries:
        if entry:
            result.extend(split_enchantment_entry(entry))
    return result


def _is_metadata(text: str) -> bool:
    """Check if a wiki enchantment string is item metadata (augments, sets, etc.)."""
    from ..dat_parser.effects import is_metadata_template

    return is_metadata_template(text)


def _parse_saving_throw(text: str | None) -> tuple[str | None, str | None]:
    """Parse saving throw text into (save_type, save_effect).

    Examples:
        "Reflex save takes half damage" -> ("Reflex", "half")
        "Will save negates" -> ("Will", "negates")
        "Fortitude save negates Strength damage" -> ("Fortitude", "negates")
        "None" -> (None, None)
    """
    if not text:
        return None, None
    t = text.strip().lower()
    if t in ("none", "no", ""):
        return None, None
    save_type = None
    if "will" in t:
        save_type = "Will"
    elif "reflex" in t:
        save_type = "Reflex"
    elif "fortitude" in t or "fort" in t:
        save_type = "Fortitude"
    if not save_type:
        return None, None
    save_effect = "special"
    if "negate" in t:
        save_effect = "negates"
    elif "half" in t:
        save_effect = "half"
    elif "partial" in t:
        save_effect = "partial"
    return save_type, save_effect


def _parse_cooldown_text(text: str | None) -> list[tuple[str, float]]:
    """Parse cooldown text into [(class_abbrev, seconds), ...].

    Examples:
        "3 seconds (Wiz), 2 seconds (Sor)" -> [("Wiz", 3.0), ("Sor", 2.0)]
        "5 seconds" -> [("", 5.0)]
        "3.5 seconds" -> [("", 3.5)]
    """
    if not text:
        return []
    results = []
    # Pattern: "N seconds (Class)" or "N seconds"
    import re
    for m in re.finditer(r'([\d.]+)\s*seconds?\s*(?:\(([^)]+)\))?', text):
        try:
            secs = float(m.group(1))
        except ValueError:
            continue
        cls = m.group(2) or ""
        results.append((cls.strip(), secs))
    return results


# Class abbreviation -> full name for cooldown parsing
_CLASS_ABBREV: dict[str, str] = {
    "wiz": "Wizard", "sor": "Sorcerer", "brd": "Bard", "clr": "Cleric",
    "fvs": "Favored Soul", "pal": "Paladin", "rgr": "Ranger", "drd": "Druid",
    "art": "Artificer", "alc": "Alchemist", "wlk": "Warlock", "mnk": "Monk",
    "rog": "Rogue", "ftr": "Fighter", "brb": "Barbarian",
}


# Stat normalization moved to dat_parser/effects.py normalize_stat_name().
# _normalize_stat_name() was here — removed; composite splitting now
# happens in parse_enchantment_string_multi() at the parser level.


# Disambiguation suffixes stripped when matching clicky spell names to spells table
_CLICKY_SPELL_SUFFIXES = (" (spell)", " (Item Effect)", " (clicky)", " (effect)")


def _resolve_clicky_spell(conn: sqlite3.Connection, modifier: str) -> int | None:
    """Match a clicky modifier string to a spell ID in the spells table."""
    row = conn.execute("SELECT id FROM spells WHERE name = ?", (modifier,)).fetchone()
    if row:
        return row[0]
    for suffix in _CLICKY_SPELL_SUFFIXES:
        clean = modifier.replace(suffix, "")
        if clean != modifier:
            row = conn.execute("SELECT id FROM spells WHERE name = ?", (clean,)).fetchone()
            if row:
                return row[0]
    return None


def _ensure_effect(conn: sqlite3.Connection, name: str, modifier: str | None) -> int | None:
    """Get or create an effects row, returning its id.

    The name is canonicalized first so ``clicky`` and ``Clicky`` reach the same
    row instead of splitting 232 references across two spellings.
    """
    from ..dat_parser.effects import canonical_effect_name

    name = canonical_effect_name(name)
    if not name:
        return None
    coalesced = modifier or ""
    row = conn.execute(
        "SELECT id FROM effects WHERE name = ? AND COALESCE(modifier, '') = ?",
        (name, coalesced),
    ).fetchone()
    if row:
        return row[0]
    conn.execute(
        "INSERT OR IGNORE INTO effects (name, modifier) VALUES (?, ?)",
        (name, modifier),
    )
    row = conn.execute(
        "SELECT id FROM effects WHERE name = ? AND COALESCE(modifier, '') = ?",
        (name, coalesced),
    ).fetchone()
    return row[0] if row else None


def _ensure_bonus(
    conn: sqlite3.Connection,
    name: str,
    stat_id: int | None,
    bonus_type_id: int | None,
    value: int | None,
    description: str | None = None,
) -> int:
    """Get or create a bonus definition row. Returns the bonus id.

    A bonus with no parseable stat names itself after its own wiki text, so this
    is where raw markup would otherwise enter ``bonuses.name`` — the single
    choke point every caller goes through.
    """
    name = canonical_name(name) or name
    row = conn.execute(
        f"""
        SELECT id FROM bonuses
        WHERE COALESCE(stat_id, -1) = COALESCE(?, -1)
          AND COALESCE(bonus_type_id, -1) = COALESCE(?, -1)
          AND COALESCE(value, -1) = COALESCE(?, -1)
          AND name = ?
        """,
        (stat_id, bonus_type_id, value, name),
    ).fetchone()
    if row:
        bonus_id = row[0]
        # Update description if we have one and the existing row doesn't
        if description:
            conn.execute(
                "UPDATE bonuses SET description = ? WHERE id = ? AND description IS NULL",
                (description, bonus_id),
            )
        return bonus_id
    cur = conn.execute(
        "INSERT INTO bonuses (name, description, stat_id, bonus_type_id, value) VALUES (?, ?, ?, ?, ?)",
        (name, description, stat_id, bonus_type_id, value),
    )
    return cur.lastrowid


def _lookup_id(conn: sqlite3.Connection, table: str, name_col: str, id_col: str, name: str | None) -> int | None:
    """Return the integer PK for a row matched by *name*, or None if not found or name is None."""
    if not name:
        return None
    row = conn.execute(
        f"SELECT {id_col} FROM {table} WHERE {name_col} = ?", (name,)
    ).fetchone()
    return row[0] if row else None


def _resolve_named(
    conn: sqlite3.Connection, table: str, name: str | None,
) -> tuple[int | None, str | None]:
    """Resolve *name* in a reference table, case-insensitively.

    Returns ``(id, canonical_name)`` — the spelling stored in the reference
    table, not the spelling the wiki template happened to use. Template
    parameters vary in case (``{{wizardry|195}}`` vs ``{{Wizardry|195}}``) and
    building a bonus name from the raw parameter is what produced 27 groups of
    case-variant ``bonuses.name`` values. Falls back to the given name when the
    reference table has no such row.
    """
    if not name:
        return None, None
    row = conn.execute(
        f"SELECT id, name FROM {table} WHERE name = ? COLLATE NOCASE", (name,)
    ).fetchone()
    if row is None:
        return None, name
    return row[0], row[1]


def _bonus_name(stat: str | None, value: int | None) -> str:
    """Format the generated ``bonuses.name``.

    ``f"{stat} +{value}"`` produced "Constitution +-2" for the 17 rows with a
    negative magnitude, and ``name`` is part of the table's unique index — so
    the malformed spelling was load-bearing, not cosmetic.
    """
    label = stat or "Unknown"
    if value is None:
        return label
    return f"{label} {value:+d}"


# ---------------------------------------------------------------------------
# Public insert functions
# ---------------------------------------------------------------------------


def insert_items(conn: sqlite3.Connection, items: list[dict]) -> int:
    """Insert a list of item dicts (as produced by wiki/game_data parsers) into the DB.

    Handles:
    - ``items`` table (base fields)
    - ``item_weapon_stats`` (if weapon fields present)
    - ``item_armor_stats`` (if armor fields present)
    - ``item_augment_slots`` (from ``augment_slots`` list)
    - ``bonuses`` (from ``enchantments`` list; stat_id/bonus_type_id/value left NULL
      for deferred resolution in a future linking pass)

    Skips ``quest`` field — those cross-entity links are owned by the quest
    scraper (Task 4). Links items to sets via ``set_bonus_items``.

    Returns the count of item rows inserted (not counting sub-table rows).
    """
    items = _clean_inputs(items)

    inserted = 0

    # Generic names that leak through from wiki parsing artifacts
    _SKIP_NAMES = {"sets", "Armor", "Weapon", "Clothing", "Jewelry", "Shield", "Random Loot Deconstruct"}

    for item in items:
        name = item.get("name")
        if not name:
            logger.warning("Skipping item with missing name: %r", item)
            continue
        if name in _SKIP_NAMES:
            continue

        # Resolve item_category: try item_category (from binary parser) first,
        # then fall back to mapping item_type (wiki positional arg)
        item_category = item.get("item_category") or _normalise_item_category(
            item.get("item_type")
        )

        # Skip non-equippable items (potions, scrolls, wands, consumables, etc.)
        _NON_EQUIP = {
            ItemCategory.POTION, ItemCategory.SCROLL, ItemCategory.WAND,
            ItemCategory.COMPONENT, ItemCategory.COLLECTIBLE, ItemCategory.CONSUMABLE,
            ItemCategory.WONDROUS,
        }
        if item_category in _NON_EQUIP:
            # Keep Wondrous items that have a real equipment_slot (miscategorized gear)
            if item_category == ItemCategory.WONDROUS and item.get("equipment_slot"):
                item_category = _normalise_item_category(item.get("item_type")) or ItemCategory.CLOTHING
            else:
                continue

        # Skip binary-only entries without equipment_slot — these are enchantment
        # effects, quest rewards, and crafting materials miscategorized as gear.
        # Keep items from wiki (wiki_url set) or with explicit equipment_slot.
        # Also keep items without dat_id (test/manual items).
        has_slot = bool(item.get("equipment_slot"))
        has_wiki = bool(item.get("wiki_url"))
        is_binary_only = bool(item.get("dat_id")) and not has_wiki
        if is_binary_only and not has_slot:
            continue

        # Resolve slot_id FK from equipment_slot name (set by EQUIPMENT_SLOTS enum)
        equipment_slot = item.get("equipment_slot")
        slot_id = _lookup_id(conn, "equipment_slots", "name", "id", equipment_slot)

        # The wiki infobox's `| rare = yes` marker is the item-level rarity the
        # picker's "Rare only" filter reads. 'Rare' is the exact string the
        # frontend compares against, so it is not a free choice.
        rarity = str(Rarity.RARE) if item.get("rare") else item.get("rarity")

        cur = conn.execute(
            f"""
            INSERT OR IGNORE INTO items (
                name, dat_id, rarity, slot_id, equipment_slot, item_category,
                level, durability, item_type, minimum_level,
                hardness, weight, material, binding, base_value,
                race_required, icon, description, tooltip,
                enchant_name, enchant_suffix, effect_value,
                cooldown_seconds, internal_level, tier_multiplier, wiki_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                item.get("dat_id"),
                rarity,
                slot_id,
                equipment_slot,
                item_category,
                item.get("level"),
                item.get("durability"),
                item.get("item_type"),
                item.get("minimum_level"),
                item.get("hardness"),
                item.get("weight"),
                item.get("material"),
                item.get("binding"),
                item.get("base_value"),
                item.get("race_required"),
                item.get("icon"),
                item.get("description"),
                item.get("tooltip"),
                item.get("enchant_name"),
                item.get("enchant_suffix"),
                item.get("effect_value"),
                item.get("cooldown_seconds"),
                item.get("internal_level"),
                item.get("tier_multiplier"),
                item.get("wiki_url"),
            ),
        )
        inserted += cur.rowcount

        # Retrieve id (whether just inserted or already existed)
        row = conn.execute("SELECT id FROM items WHERE name = ?", (name,)).fetchone()
        if row is None:
            logger.warning("Failed to retrieve id for %r after insert", name)
            continue
        item_id: int = row[0]

        # --- item_weapon_stats ---
        # Only create weapon stats when weapon-specific fields are present.
        # weapon_type alone is not enough — FID lookup sets it on armor too.
        weapon_required = ("damage", "critical", "handedness")
        weapon_fields = ("damage", "critical", "weapon_type", "proficiency", "handedness",
                         "damage_class", "attack_mod", "damage_mod")
        if any(item.get(f) for f in weapon_required):
            handedness = _normalise_handedness(item.get("handedness"), item.get("weapon_type"))
            conn.execute(
                f"""
                INSERT OR IGNORE INTO item_weapon_stats
                    (item_id, damage, critical, damage_class, attack_mod, damage_mod,
                     weapon_type, proficiency, handedness)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item_id,
                    item.get("damage"),
                    item.get("critical"),
                    item.get("damage_class"),
                    item.get("attack_mod"),
                    item.get("damage_mod"),
                    item.get("weapon_type"),
                    item.get("proficiency"),
                    handedness,
                ),
            )

        # --- item_armor_stats ---
        if item.get("armor_bonus") is not None or item.get("max_dex_bonus") is not None:
            conn.execute(
                f"""
                INSERT OR IGNORE INTO item_armor_stats (item_id, armor_bonus, max_dex_bonus)
                VALUES (?, ?, ?)
                """,
                (item_id, item.get("armor_bonus"), item.get("max_dex_bonus")),
            )

        # --- item_augment_slots ---
        for sort_order, slot_color in enumerate(item.get("augment_slots") or []):
            if not slot_color:
                continue
            conn.execute(
                f"""
                INSERT OR IGNORE INTO item_augment_slots (item_id, sort_order, slot_type)
                VALUES (?, ?, ?)
                """,
                (item_id, sort_order, slot_color.strip()),
            )

        # --- bonuses pass A: decoded effect entries with resolved stat/bonus_type ---
        decoded_bonuses = item.get("_bonuses") or []
        for sort_order, effect in enumerate(decoded_bonuses):
            if effect.get("stat") is None:
                continue  # stat_def_id not yet in STAT_DEF_IDS — skip until mapped
            stat_id, stat_name = _resolve_named(conn, "stats", effect["stat"])
            bonus_type_id = (
                _resolve_named(conn, "bonus_types", effect["bonus_type"])[0]
                if effect.get("bonus_type")
                else None
            )
            bonus_name = _bonus_name(stat_name, effect["magnitude"])
            resolution = effect.get("_resolution_method", "stat_def_ids")
            bonus_id = _ensure_bonus(
                conn, bonus_name, stat_id, bonus_type_id, effect["magnitude"],
                description=effect.get("_description"),
            )
            conn.execute(
                f"""
                INSERT OR IGNORE INTO item_bonuses
                    (item_id, bonus_id, sort_order, data_source, resolution_method)
                VALUES (?, ?, ?, '{DataSource.BINARY}', ?)
                """,
                (item_id, bonus_id, sort_order, resolution),
            )

        # --- pass B: wiki enchantment routing ---
        # Each enchantment goes to one of three destinations:
        #   1. item_bonuses — stat+value bonuses ({{Stat}}, {{SpellPower}}, etc.)
        #   2. item_effects — weapon/armor effects (Vorpal, Bane, etc.)
        #   3. skip — metadata already stored elsewhere (augments, sets, materials)
        #
        # One bullet can hold more than one enchantment, or none: a maintenance
        # marker ({{bug}}) contributes nothing, and a crafting choice wrapper
        # ({{Nearly Finished|{{Stat|CON|8}}|{{Stat|STR|8}}}}) contributes one
        # entry per alternative rather than leaking the literal "{{Stat".
        pass_a_count = len(decoded_bonuses)
        bonus_offset = 0
        effect_offset = 0
        for enchantment in _split_enchantments(item.get("enchantments") or []):
            if not enchantment:
                continue

            # 0. Check for named enchantment side effects (e.g., Command's -6 Hide)
            # Extract enchantment name from template: {{Skills|Command|5}} -> "Command"
            # or {{Deception|6}} -> "Deception", or plain "Finesse" -> "Finesse"
            import re as _re
            enchantment_clean = enchantment.strip()
            _tmpl_match = _re.match(r"\{\{(?:Skills\|)?(\w[\w\s:'-]*?)(?:\||\}\})", enchantment_clean)
            enchantment_name = _tmpl_match.group(1).strip() if _tmpl_match else enchantment_clean
            named_effects = _get_named_enchantment_effects(enchantment_name)
            for ne in named_effects:
                if ne.get("stat") is not None:
                    # Numeric bonus/penalty
                    ne_stat_id, ne_stat_name = _resolve_named(conn, "stats", ne["stat"])
                    ne_bt_id = _resolve_named(conn, "bonus_types", ne["bonus_type"])[0]
                    ne_name = _bonus_name(ne_stat_name, ne["value"])
                    ne_bonus_id = _ensure_bonus(
                        conn, ne_name, ne_stat_id, ne_bt_id, ne["value"],
                        description=f"Named enchantment: {enchantment_clean}",
                    )
                else:
                    # Description-only (conditional/proc)
                    ne_desc = ne.get("description", enchantment_name)
                    ne_bonus_id = _ensure_bonus(
                        conn, ne_desc, None, None, None,
                        description=ne_desc,
                    )
                conn.execute(
                    f"""
                    INSERT OR IGNORE INTO item_bonuses
                        (item_id, bonus_id, sort_order, data_source, resolution_method)
                    VALUES (?, ?, ?, '{DataSource.WIKI}', '{ResolutionMethod.NAMED_ENCHANTMENT}')
                    """,
                    (item_id, ne_bonus_id, pass_a_count + bonus_offset),
                )
                bonus_offset += 1

            # 1. Stat bonus → item_bonuses junction (composites already split by parser)
            parsed_list = _parse_enchantment(enchantment)
            if parsed_list:
                for parsed in parsed_list:
                    stat_id, stat_name = _resolve_named(conn, "stats", parsed["stat"])
                    bonus_type_id = _resolve_named(
                        conn, "bonus_types", parsed["bonus_type"],
                    )[0]
                    bonus_name = _bonus_name(stat_name, parsed["value"])
                    bonus_id = _ensure_bonus(
                        conn, bonus_name, stat_id, bonus_type_id, parsed["value"],
                        description=enchantment,
                    )
                    conn.execute(
                        f"""
                        INSERT OR IGNORE INTO item_bonuses
                            (item_id, bonus_id, sort_order, data_source, resolution_method)
                        VALUES (?, ?, ?, '{DataSource.WIKI}', '{ResolutionMethod.WIKI_ENCHANTMENT}')
                        """,
                        (item_id, bonus_id, pass_a_count + bonus_offset),
                    )
                    bonus_offset += 1
                continue

            # 1b. {{Enhancement bonus|kind|N}} — the wiki's most-used item
            # template, and one invocation of it means between zero and four
            # rows across two tables, so it gets a decoder of its own. It has
            # to be tried before step 2: it is still listed in
            # _METADATA_TEMPLATES (so a malformed invocation still gets skipped
            # rather than mangled), and step 3 would otherwise swallow every
            # well-formed one — which is exactly what shipped, 5,239 times.
            enhancement_bonus = _parse_enhancement_bonus(enchantment)
            if enhancement_bonus is not None:
                for parsed in enhancement_bonus.bonuses:
                    stat_id, stat_name = _resolve_named(conn, "stats", parsed["stat"])
                    bonus_type_id, bonus_type_name = _resolve_named(
                        conn, "bonus_types", parsed["bonus_type"],
                    )
                    bonus_id = _ensure_bonus(
                        conn,
                        _bonus_name(stat_name, parsed["value"]),
                        stat_id, bonus_type_id, parsed["value"],
                        description=_format_bonus_description(
                            stat_name, parsed["value"], bonus_type_name,
                        ),
                    )
                    conn.execute(
                        f"""
                        INSERT OR IGNORE INTO item_bonuses
                            (item_id, bonus_id, sort_order, data_source, resolution_method)
                        VALUES (?, ?, ?, '{DataSource.WIKI}', '{ResolutionMethod.WIKI_ENCHANTMENT}')
                        """,
                        (item_id, bonus_id, pass_a_count + bonus_offset),
                    )
                    bonus_offset += 1
                for effect_name in enhancement_bonus.effects:
                    effect_id = _ensure_effect(conn, effect_name, None)
                    if effect_id is not None:
                        conn.execute(
                            f"""
                            INSERT OR IGNORE INTO item_effects
                                (item_id, effect_id, value, sort_order, data_source)
                            VALUES (?, ?, NULL, ?, '{DataSource.WIKI}')
                            """,
                            (item_id, effect_id, effect_offset),
                        )
                        effect_offset += 1
                continue

            # 2. Weapon/armor effect → item_effects table
            effect = _parse_effect(enchantment)
            if effect:
                effect_id = _ensure_effect(conn, effect["effect"], effect["modifier"])
                if effect_id is not None:
                    conn.execute(
                        f"""
                        INSERT OR IGNORE INTO item_effects
                            (item_id, effect_id, value, sort_order, data_source)
                        VALUES (?, ?, ?, ?, '{DataSource.WIKI}')
                        """,
                        (item_id, effect_id, effect["value"], effect_offset),
                    )
                    effect_offset += 1

                # 2a. Clicky effects → item_spell_links
                if effect.get("modifier") and effect["effect"].lower() in ("clicky", "clickie"):
                    spell_id = _resolve_clicky_spell(conn, effect["modifier"])
                    if spell_id is not None:
                        charges = effect.get("charges")
                        conn.execute(
                            "INSERT OR IGNORE INTO item_spell_links (item_id, spell_id, charges) VALUES (?, ?, ?)",
                            (item_id, spell_id, charges),
                        )
                continue

            # 3. Metadata — skip (augments, sets, materials already stored)
            if _is_metadata(enchantment):
                continue

            # 4. Fallback: plain text enchantments → item_effects (weapon effect names)
            # Skip broken/empty strings
            cleaned = enchantment.strip().strip("}")
            if cleaned and len(cleaned) > 2 and not cleaned.startswith("{{"):
                effect_id = _ensure_effect(conn, cleaned, None)
                if effect_id is not None:
                    conn.execute(
                        f"INSERT OR IGNORE INTO item_effects (item_id, effect_id, value, sort_order, data_source) VALUES (?, ?, NULL, ?, '{DataSource.WIKI}')",
                        (item_id, effect_id, effect_offset),
                    )
                    effect_offset += 1

        # --- set membership ---
        set_names: list[str] = []
        # Source 1: set_name field from wiki parser
        sn = item.get("set_name")
        if sn and isinstance(sn, str) and sn.strip():
            set_names.append(sn.strip())
        # Source 2: {{Named item sets|...}} enchantment templates (already filtered
        # as metadata in pass B, so extract directly from enchantments list)
        for ench in item.get("enchantments") or []:
            m = re.search(r"\{\{Named item sets\|([^|}]+)", ench, re.IGNORECASE)
            if m:
                sn2 = m.group(1).strip()
                if sn2 and sn2 not in set_names:
                    set_names.append(sn2)
        for sn in set_names:
            set_id = _ensure_set_bonus(conn, sn)
            if set_id is not None:
                conn.execute(
                    "INSERT OR IGNORE INTO set_bonus_items (set_id, item_id) VALUES (?, ?)",
                    (set_id, item_id),
                )

    conn.commit()
    return inserted


def _ensure_set_bonus(conn: sqlite3.Connection, name: str) -> int | None:
    """Get or create a set_bonuses row, returning its id."""
    row = conn.execute("SELECT id FROM set_bonuses WHERE name = ?", (name,)).fetchone()
    if row:
        return row[0]
    conn.execute("INSERT OR IGNORE INTO set_bonuses (name) VALUES (?)", (name,))
    row = conn.execute("SELECT id FROM set_bonuses WHERE name = ?", (name,)).fetchone()
    return row[0] if row else None


def insert_set_bonus_effects(conn: sqlite3.Connection, sets: list[dict]) -> int:
    """Insert set bonus effects from wiki scraper into set_bonuses + bonuses tables.

    Each dict has:
        {"name": "Seasons of the Feywild",
         "bonuses": [{"min_pieces": 2, "text": "+10 Artifact bonus to HP"}, ...]}

    Returns the count of set rows created/updated.
    """
    sets = _clean_inputs(sets)

    inserted = 0
    for set_data in sets:
        name = set_data.get("name")
        if not name:
            continue
        set_id = _ensure_set_bonus(conn, name)
        if set_id is None:
            continue
        inserted += 1
        for sort_order, bonus in enumerate(set_data.get("bonuses", [])):
            bonus_text = bonus["text"]
            parsed_list = _parse_enchantment(bonus_text)
            if parsed_list:
                for parsed in parsed_list:
                    stat_id, stat_name = _resolve_named(conn, "stats", parsed["stat"])
                    bonus_type_id = _resolve_named(
                        conn, "bonus_types", parsed["bonus_type"],
                    )[0]
                    bonus_name = _bonus_name(stat_name, parsed["value"])
                    bonus_id = _ensure_bonus(
                        conn, bonus_name, stat_id, bonus_type_id, parsed["value"],
                        description=bonus_text,
                    )
            else:
                bonus_id = _ensure_bonus(conn, bonus_text, None, None, None, description=bonus_text)
            conn.execute(
                f"""
                INSERT OR IGNORE INTO set_bonus_bonuses
                    (set_id, bonus_id, min_pieces, sort_order, data_source, resolution_method)
                VALUES (?, ?, ?, ?, '{DataSource.WIKI}', '{ResolutionMethod.WIKI_ENCHANTMENT}')
                """,
                (set_id, bonus_id, bonus["min_pieces"], sort_order),
            )
    conn.commit()
    return inserted


def insert_unique_enchantments(
    conn: sqlite3.Connection, entries: list[dict],
) -> int:
    """Insert ``{{Unique enchantment}}`` pages into ``unique_enchantments``.

    These pages carry what a named enchantment actually does — Deception's
    "+X (type) bonus to hit and +Y to damage for any hit that would qualify as a
    sneak attack" — which is the text ``bonuses.description`` needs and could
    not previously reach. Stored once per enchantment rather than repeated in
    each of the rows that reference it.

    Returns the count of rows inserted (existing names are updated in place).
    """
    entries = _clean_inputs(entries)
    inserted = 0
    for entry in entries:
        name = entry.get("name")
        if not name:
            continue
        cur = conn.execute(
            "INSERT OR IGNORE INTO unique_enchantments (name, effect, wiki_url) "
            "VALUES (?, ?, ?)",
            (name, entry.get("effect"), entry.get("wiki_url")),
        )
        inserted += cur.rowcount
        if cur.rowcount == 0:
            # Fill in fields a previous, thinner scrape left empty.
            conn.execute(
                """
                UPDATE unique_enchantments
                   SET effect   = COALESCE(effect, ?),
                       wiki_url = COALESCE(wiki_url, ?)
                 WHERE name = ?
                """,
                (entry.get("effect"), entry.get("wiki_url"), name),
            )
    conn.commit()
    return inserted


def populate_enchantment_descriptions(conn: sqlite3.Connection) -> int:
    """Resolve enchantment identity and replace template text with real prose.

    Two template families need opposite treatment, which is why one pass owns
    both:

    * **Formatter templates** (``{{Stat|Wisdom|14}}``) — the invocation *is* the
      data, already parsed into stat/bonus_type/value, so the description is
      regenerated from those columns.
    * **Named-enchantment templates** (``{{Deception|6}}``) — the invocation
      *references a page*, so the row links to ``unique_enchantments`` and takes
      that page's effect text.

    Anything else falls back to expanding the template to its display text, so
    no ``{{`` survives in a user-visible column (validation assertion A3).
    Returns the number of rows updated.
    """
    from ..wiki.templates import (
        expand_display_text,
        format_bonus_description,
        iter_templates,
    )

    updated = 0

    # --- effects: link by name, the effect's own identity ---
    updated += conn.execute(
        """
        UPDATE effects SET unique_enchantment_id = (
            SELECT ue.id FROM unique_enchantments ue
             WHERE ue.name = effects.name COLLATE NOCASE
        )
        WHERE unique_enchantment_id IS NULL
          AND EXISTS (
            SELECT 1 FROM unique_enchantments ue
             WHERE ue.name = effects.name COLLATE NOCASE
          )
        """
    ).rowcount

    # --- bonuses: identity comes from the template named in the description ---
    rows = conn.execute(
        """
        SELECT b.id, b.description, b.value, s.name, bt.name
          FROM bonuses b
          LEFT JOIN stats s ON s.id = b.stat_id
          LEFT JOIN bonus_types bt ON bt.id = b.bonus_type_id
         WHERE b.description LIKE '%{{%'
        """
    ).fetchall()

    for bonus_id, description, value, stat_name, bonus_type in rows:
        templates = iter_templates(description or "")
        enchantment_id = None
        effect_text = None
        for template in templates:
            row = conn.execute(
                "SELECT id, effect FROM unique_enchantments WHERE name = ? COLLATE NOCASE",
                (template.name,),
            ).fetchone()
            if row is not None:
                enchantment_id, effect_text = row
                break

        new_description = (
            effect_text
            or format_bonus_description(stat_name, value, bonus_type)
            or canonical_text(expand_display_text(description or ""))
        )
        conn.execute(
            "UPDATE bonuses SET description = ?, unique_enchantment_id = "
            "COALESCE(?, unique_enchantment_id) WHERE id = ?",
            (new_description, enchantment_id, bonus_id),
        )
        updated += 1

    # --- bonuses fallback: the stat's own enchantment page ---
    # A formatter template names the *formatter*, not the enchantment:
    # {{Tactics|Combat Mastery|11}} looks for a "Tactics" page that does not
    # exist, which left 112 bonuses unlinked while `stats.name` and
    # `unique_enchantments.name` agreed exactly ("Combat Mastery", "Shatter",
    # "Spell Focus Mastery", ...). The resolved stat FK — not the generated
    # name — is the evidence, so a bonus whose stat never resolved stays NULL:
    # a wrong FK is worse than a missing one. Runs after the loop above so a
    # named-enchantment template keeps its more specific identity.
    updated += conn.execute(
        """
        UPDATE bonuses SET unique_enchantment_id = (
            SELECT ue.id FROM unique_enchantments ue
              JOIN stats s ON s.name = ue.name COLLATE NOCASE
             WHERE s.id = bonuses.stat_id
        )
        WHERE unique_enchantment_id IS NULL
          AND stat_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM unique_enchantments ue
              JOIN stats s ON s.name = ue.name COLLATE NOCASE
             WHERE s.id = bonuses.stat_id
          )
        """
    ).rowcount

    conn.commit()
    return updated


def renormalize_bonus_names(conn: sqlite3.Connection) -> int:
    """Rebuild stored ``bonuses.name`` values from their stat and value columns.

    Repairs the 17 rows named ``"Constitution +-2"`` and the case-variant names
    that were built from a raw template parameter rather than the stat the FK
    resolved to. Only rows whose stat is resolved are touched — for the rest the
    name is the only description of the bonus there is.
    """
    changed = 0
    rows = conn.execute(
        """
        SELECT b.id, b.name, s.name, b.value
          FROM bonuses b
          JOIN stats s ON s.id = b.stat_id
        """
    ).fetchall()
    for bonus_id, old_name, stat_name, value in rows:
        new_name = _bonus_name(stat_name, value)
        if new_name == old_name:
            continue
        try:
            conn.execute(
                "UPDATE bonuses SET name = ? WHERE id = ?", (new_name, bonus_id)
            )
        except sqlite3.IntegrityError:
            keeper = conn.execute(
                """
                SELECT id FROM bonuses
                 WHERE name = ? AND id != ?
                   AND COALESCE(stat_id, -1) = (SELECT COALESCE(stat_id, -1) FROM bonuses WHERE id = ?)
                   AND COALESCE(bonus_type_id, -1) = (SELECT COALESCE(bonus_type_id, -1) FROM bonuses WHERE id = ?)
                   AND COALESCE(value, -1) = COALESCE(?, -1)
                """,
                (new_name, bonus_id, bonus_id, bonus_id, value),
            ).fetchone()
            if keeper is None:
                continue
            _merge_rows(conn, "bonuses", keeper[0], bonus_id)
        changed += 1
    conn.commit()
    return changed


def populate_rarity(
    conn: sqlite3.Connection, rare_names: Iterable[str],
) -> dict[str, object]:
    """Flag rare loot on items, augments, and every quest mapping of a rare item.

    *rare_names* is the reconciled rare-loot list: the wiki's
    ``Category:Rare Loot List items`` plus whatever the item infoboxes'
    ``| rare = yes`` field marked. Names that match neither table are returned
    rather than silently dropped — 80 of the category's members are Lunar/Solar
    Gems that live in ``augments``, and the remainder are worth reporting.

    Returns ``{"items": n, "augments": n, "quest_loot": n, "unmatched": [...]}``.
    """
    names = sorted({canonical_text(name) or "" for name in rare_names} - {""})

    item_hits = 0
    augment_hits = 0
    unmatched: list[str] = []
    for name in names:
        cur = conn.execute(
            "UPDATE items SET rarity = ? WHERE name = ? COLLATE NOCASE "
            "AND COALESCE(rarity, '') != ?",
            (str(Rarity.RARE), name, str(Rarity.RARE)),
        )
        if cur.rowcount:
            item_hits += cur.rowcount
            continue
        cur = conn.execute(
            "UPDATE augments SET is_rare = 1 WHERE name = ? COLLATE NOCASE AND is_rare = 0",
            (name,),
        )
        if cur.rowcount:
            augment_hits += cur.rowcount
            continue
        # Already flagged on a previous run counts as matched, not missing.
        already = conn.execute(
            "SELECT 1 FROM items WHERE name = ? COLLATE NOCASE "
            "UNION ALL SELECT 1 FROM augments WHERE name = ? COLLATE NOCASE",
            (name, name),
        ).fetchone()
        if already is None:
            unmatched.append(name)

    # Mapping-level flag: multiplied across every quest a rare item drops from.
    loot_rows = conn.execute(
        """
        UPDATE quest_loot SET is_rare = 1
         WHERE is_rare = 0
           AND item_id IN (SELECT id FROM items WHERE rarity = ?)
        """,
        (str(Rarity.RARE),),
    ).rowcount
    conn.commit()
    return {
        "items": item_hits,
        "augments": augment_hits,
        "quest_loot": loot_rows,
        "unmatched": unmatched,
    }


def insert_filigrees(conn: sqlite3.Connection, filigrees: list[dict]) -> int:
    """Insert filigree dicts (from wiki scraper) into the DB.

    Returns the count of filigree rows inserted.
    """
    filigrees = _clean_inputs(filigrees)

    inserted = 0
    for fil in filigrees:
        name = fil.get("name")
        if not name:
            continue
        cur = conn.execute(
            "INSERT OR IGNORE INTO filigrees (name, icon, set_name, rare_bonus, bonus) VALUES (?, ?, ?, ?, ?)",
            (name, fil.get("icon"), fil.get("set_name"), fil.get("rare_bonus"), fil.get("bonus")),
        )
        inserted += cur.rowcount
    conn.commit()
    return inserted


def insert_augments(conn: sqlite3.Connection, augments: list[dict]) -> int:
    """Insert augment dicts (from wiki scraper) into the DB.

    Populates the ``augments`` table and creates ``bonuses`` rows with
    ``source_type='augment'`` for each enchantment on the augment.

    Returns the count of augment rows inserted.
    """
    augments = _clean_inputs(augments)

    inserted = 0
    for augment in augments:
        name = augment.get("name")
        if not name:
            continue

        slot_color = (augment.get("slot_color") or "colorless").lower()
        cur = conn.execute(
            f"""
            INSERT OR IGNORE INTO augments (dat_id, name, icon, slot_color, min_level)
            VALUES (?, ?, ?, ?, ?)
            """,
            (augment.get("dat_id"), name, augment.get("icon"), slot_color, augment.get("minimum_level")),
        )
        if cur.rowcount == 0:
            continue

        augment_id = conn.execute(
            "SELECT id FROM augments WHERE name = ?", (name,)
        ).fetchone()
        if augment_id is None:
            continue
        augment_id = augment_id[0]
        inserted += 1

        # Bonuses from enchantments
        for sort_order, enchantment in enumerate(augment.get("enchantments") or []):
            if not enchantment:
                continue
            parsed_list = _parse_enchantment(enchantment)
            for parsed in parsed_list:
                stat_id, stat_name = _resolve_named(conn, "stats", parsed["stat"])
                bonus_type_id = _resolve_named(
                    conn, "bonus_types", parsed["bonus_type"],
                )[0]
                bonus_name = _bonus_name(stat_name, parsed["value"])
                bonus_id = _ensure_bonus(
                    conn, bonus_name, stat_id, bonus_type_id, parsed["value"],
                    description=enchantment,
                )
                conn.execute(
                    f"""
                    INSERT OR IGNORE INTO augment_bonuses
                        (augment_id, bonus_id, sort_order, data_source, resolution_method)
                    VALUES (?, ?, ?, '{DataSource.WIKI}', '{ResolutionMethod.WIKI_ENCHANTMENT}')
                    """,
                    (augment_id, bonus_id, sort_order),
                )

        # Binary bonuses from effect_ref localization names
        for sort_order_b, bb in enumerate(augment.get("_binary_bonuses") or []):
            stat_id, stat_name = _resolve_named(conn, "stats", bb["stat"])
            bonus_type_id = (
                _resolve_named(conn, "bonus_types", bb["bonus_type"])[0]
                if bb.get("bonus_type")
                else None
            )
            value = bb.get("value")
            bonus_name = _bonus_name(stat_name, value)
            bonus_id = _ensure_bonus(
                conn, bonus_name, stat_id, bonus_type_id, value,
                description=bb.get("_description"),
            )
            conn.execute(
                f"""
                INSERT OR IGNORE INTO augment_bonuses
                    (augment_id, bonus_id, sort_order, data_source, resolution_method)
                VALUES (?, ?, ?, '{DataSource.BINARY}', ?)
                """,
                (augment_id, bonus_id, 100 + sort_order_b, bb.get("_resolution_method")),
            )

    conn.commit()
    return inserted


def insert_spells(conn: sqlite3.Connection, spells: list[dict]) -> int:
    """Insert spell dicts (from wiki scraper) into the DB.

    Populates ``spells``, ``spell_class_levels``, and ``spell_damage_types``.

    Returns the count of spell rows inserted.
    """
    spells = _clean_inputs(spells)

    inserted = 0
    for spell in spells:
        name = spell.get("name")
        if not name:
            continue

        school_id = _lookup_id(conn, "spell_schools", "name", "id", spell.get("school"))

        cur = conn.execute(
            f"""
            INSERT OR IGNORE INTO spells
                (name, icon, school_id, spell_points, cooldown, cooldown_seconds,
                 tick_count, description, components, range, target, duration,
                 saving_throw, save_type, save_effect, spell_resistance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                spell.get("icon"),
                school_id,
                spell.get("spell_points"),
                spell.get("cooldown"),
                spell.get("cooldown_seconds"),
                spell.get("tick_count"),
                spell.get("description"),
                spell.get("components"),
                spell.get("range"),
                spell.get("target"),
                spell.get("duration"),
                spell.get("saving_throw"),
                *_parse_saving_throw(spell.get("saving_throw")),
                spell.get("spell_resistance"),
            ),
        )
        if cur.rowcount == 0:
            continue

        spell_id = conn.execute(
            "SELECT id FROM spells WHERE name = ?", (name,)
        ).fetchone()
        if spell_id is None:
            continue
        spell_id = spell_id[0]
        inserted += 1

        # Class spell levels
        for class_name, spell_level in (spell.get("class_levels") or {}).items():
            class_id = _lookup_id(conn, "classes", "name", "id", class_name)
            if class_id is not None:
                conn.execute(
                    "INSERT OR IGNORE INTO spell_class_levels (spell_id, class_id, spell_level) VALUES (?, ?, ?)",
                    (spell_id, class_id, spell_level),
                )

        # Per-class cooldowns (parsed from text like "3 seconds (Wiz), 2 seconds (Sor)")
        cooldown_parts = _parse_cooldown_text(spell.get("cooldown"))
        for cls_abbrev, secs in cooldown_parts:
            if cls_abbrev:
                full_name = _CLASS_ABBREV.get(cls_abbrev.lower(), cls_abbrev)
                class_id = _lookup_id(conn, "classes", "name", "id", full_name)
                if class_id is not None:
                    conn.execute(
                        "INSERT OR IGNORE INTO spell_class_cooldowns (spell_id, class_id, cooldown_seconds) VALUES (?, ?, ?)",
                        (spell_id, class_id, secs),
                    )

        # Damage types
        for dt_name in spell.get("damage_types") or []:
            dt_id = _lookup_id(conn, "damage_types", "name", "id", dt_name)
            if dt_id is not None:
                conn.execute(
                    "INSERT OR IGNORE INTO spell_damage_types (spell_id, damage_type_id) VALUES (?, ?)",
                    (spell_id, dt_id),
                )

        # Metamagic feats
        for meta_name in spell.get("metamagics") or []:
            # Metamagic names come as "empower", "maximize" etc.; match to feat names
            feat_name = meta_name.replace("_", " ").title() + " Spell"
            feat_id = _lookup_id(conn, "feats", "name", "id", feat_name)
            if feat_id is not None:
                conn.execute(
                    "INSERT OR IGNORE INTO spell_metamagics (spell_id, feat_id) VALUES (?, ?)",
                    (spell_id, feat_id),
                )

    conn.commit()
    return inserted


def _parse_feat_prerequisites(
    conn: sqlite3.Connection, feat_id: int, prereq_text: str,
) -> None:
    """Parse a feat's free-text prerequisite string into structured junction rows.

    Handles:
    - Stat requirements: "17 Strength", "Dexterity 13+"
    - BAB requirements: "Base Attack Bonus +13" → sets feats.min_bab
    - Class requirements: "Warlock Level 15", "Alchemist 8"
    - Race requirements: "Half-Elf", "Warforged"
    - Skill requirements: "7 ranks of Balance"
    - Feat requirements: any remaining text matching a known feat name
    """
    if not prereq_text:
        return

    # Split on commas (but not inside numbers like "625,000") and "and"
    parts = re.split(r',\s+(?![0-9])|\s+and\s+', prereq_text)

    _stat_names = {
        "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
    }
    _stat_title = {s.title() for s in _stat_names}

    for part in parts:
        p = part.strip().rstrip(".")
        if not p or p.lower() == "none":
            continue

        # BAB: "Base Attack Bonus +N" / "Base Attack Bonus of +N" / "+N Base Attack Bonus"
        m = re.search(r'[Bb]ase [Aa]ttack [Bb]onus\s+(?:of\s+)?\+?(\d+)', p)
        if not m:
            m = re.match(r'\+(\d+)\s+[Bb]ase [Aa]ttack [Bb]onus', p)
        if m:
            bab = int(m.group(1))
            conn.execute("UPDATE feats SET min_bab = ? WHERE id = ? AND (min_bab IS NULL OR min_bab < ?)",
                         (bab, feat_id, bab))
            continue

        # Stat: "17 Strength" or "Strength 17+"
        m = re.match(r'(\d+)\s+(' + '|'.join(_stat_title) + r')', p, re.IGNORECASE)
        if not m:
            m = re.match(r'(' + '|'.join(_stat_title) + r')\s+(\d+)', p, re.IGNORECASE)
            if m:
                # Swap groups: stat name first, value second
                stat_name, val_str = m.group(1).title(), m.group(2)
                m = None  # Prevent re-use
                stat_id = _lookup_id(conn, "stats", "name", "id", stat_name)
                if stat_id:
                    conn.execute(
                        "INSERT OR IGNORE INTO feat_prereq_stats (feat_id, stat_id, min_value) VALUES (?, ?, ?)",
                        (feat_id, stat_id, int(val_str)),
                    )
                continue
        if m:
            val_str, stat_name = m.group(1), m.group(2).title()
            stat_id = _lookup_id(conn, "stats", "name", "id", stat_name)
            if stat_id:
                conn.execute(
                    "INSERT OR IGNORE INTO feat_prereq_stats (feat_id, stat_id, min_value) VALUES (?, ?, ?)",
                    (feat_id, stat_id, int(val_str)),
                )
            continue

        # Skill: "N ranks of Skill" or "N trained Ranks of Skill"
        m = re.match(r'(\d+)\s+(?:trained\s+)?[Rr]anks?\s+(?:of\s+|in\s+)?(\w[\w ]*)', p, re.IGNORECASE)
        if m:
            val = int(m.group(1))
            skill_name = m.group(2).strip().title()
            skill_id = _lookup_id(conn, "skills", "name", "id", skill_name)
            if skill_id:
                conn.execute(
                    "INSERT OR IGNORE INTO feat_prereq_skills (feat_id, skill_id, min_rank) VALUES (?, ?, ?)",
                    (feat_id, skill_id, val),
                )
            continue

        # Character level: "Level 21" / "Character level 25" / "Character Level 28"
        # Must precede the class-level pattern to avoid matching "Level" as a class name.
        m = re.match(r'(?:Character\s+)?[Ll]evel\s+(\d+)$', p)
        if m:
            char_level = int(m.group(1))
            if 1 <= char_level <= 30:
                conn.execute(
                    "UPDATE feats SET min_character_level = ? WHERE id = ? "
                    "AND (min_character_level IS NULL OR min_character_level < ?)",
                    (char_level, feat_id, char_level),
                )
            continue

        # Class level: "Warlock Level 15" / "Alchemist 8" / "Rogue level 10"
        m = re.match(r'(\w[\w ]*?)\s+(?:[Ll]evel\s+)?(\d+)$', p)
        if m:
            class_name = m.group(1).strip()
            level = int(m.group(2))
            class_id = _lookup_id(conn, "classes", "name", "id", class_name)
            if class_id and level >= 1:
                conn.execute(
                    "INSERT OR IGNORE INTO feat_prereq_classes (feat_id, class_id, min_level) VALUES (?, ?, ?)",
                    (feat_id, class_id, level),
                )
                continue

        # Race: just a race name
        race_id = _lookup_id(conn, "races", "name", "id", p)
        if race_id:
            conn.execute(
                "INSERT OR IGNORE INTO feat_prereq_races (feat_id, race_id) VALUES (?, ?)",
                (feat_id, race_id),
            )
            continue

        # Feat: match against known feat names
        required_feat_id = _lookup_id(conn, "feats", "name", "id", p)
        if required_feat_id and required_feat_id != feat_id:
            conn.execute(
                "INSERT OR IGNORE INTO feat_prereq_feats (feat_id, required_feat_id) VALUES (?, ?)",
                (feat_id, required_feat_id),
            )


def insert_feats(conn: sqlite3.Connection, feats: list[dict], **kwargs: object) -> int:
    """Insert a list of feat dicts (as produced by wiki/parsers.py) into the DB.

    Handles:
    - ``feats`` table (all boolean flags + text fields)
    - ``feat_bonus_classes`` junction (resolves class names to class_ids; skips
      unknown class names with a warning rather than failing)

    Returns the count of feat rows inserted.
    """
    feats = _clean_inputs(feats)

    inserted = 0

    def _bool(d: dict, key: str) -> int:
        return 1 if d.get(key) else 0

    for feat in feats:
        name = feat.get("name")
        if not name:
            logger.warning("Skipping feat with missing name: %r", feat)
            continue

        cur = conn.execute(
            f"""
            INSERT OR IGNORE INTO feats (
                dat_id, name, icon, description, tooltip, prerequisite, note,
                cooldown, cooldown_seconds, duration_seconds,
                damage_dice_notation,
                is_free, is_passive, is_active, is_stance, is_metamagic, is_epic_destiny,
                scales_with_difficulty, feat_tier, wiki_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                feat.get("dat_id"),
                name,
                feat.get("icon"),
                feat.get("description"),
                feat.get("tooltip"),
                feat.get("prerequisite"),
                feat.get("note"),
                feat.get("cooldown"),
                feat.get("cooldown_seconds"),
                feat.get("duration_seconds"),
                feat.get("damage_dice_notation"),
                _bool(feat, "free"),
                _bool(feat, "passive"),
                _bool(feat, "active"),
                _bool(feat, "stance"),
                _bool(feat, "metamagic"),
                _bool(feat, "epic_destiny"),
                _bool(feat, "scales_with_difficulty"),
                feat.get("tier"),
                feat.get("wiki_url"),
            ),
        )
        inserted += cur.rowcount

        row = conn.execute("SELECT id FROM feats WHERE name = ?", (name,)).fetchone()
        if row is None:
            logger.warning("Failed to retrieve id for %r after insert", name)
            continue
        feat_id: int = row[0]

        # --- feat_past_life_stats ---
        past_life_type = feat.get("past_life_type")
        if past_life_type:
            pl_class_id = _lookup_id(conn, "classes", "name", "id", feat.get("past_life_class"))
            pl_race_id  = _lookup_id(conn, "races",   "name", "id", feat.get("past_life_race"))
            conn.execute(
                f"""
                INSERT OR IGNORE INTO feat_past_life_stats
                    (feat_id, past_life_type, class_id, race_id, max_stacks)
                VALUES (?, ?, ?, ?, ?)
                """,
                (feat_id, past_life_type, pl_class_id, pl_race_id, feat.get("past_life_max_stacks")),
            )

        # --- feat_bonus_classes ---
        for class_name in feat.get("bonus_classes") or []:
            class_id = _lookup_id(conn, "classes", "name", "id", class_name)
            if class_id is None:
                logger.debug(
                    "Feat %r: bonus class %r not found in classes table — skipping",
                    name, class_name,
                )
                continue
            conn.execute(
                "INSERT OR IGNORE INTO feat_bonus_classes (feat_id, class_id) VALUES (?, ?)",
                (feat_id, class_id),
            )

    # --- Second pass: structured prerequisites ---
    # Must happen after ALL feats are inserted so feat-to-feat lookups work.
    for feat in feats:
        name = feat.get("name")
        prereq = feat.get("prerequisite")
        if not name or not prereq:
            continue
        row = conn.execute("SELECT id FROM feats WHERE name = ?", (name,)).fetchone()
        if row:
            _parse_feat_prerequisites(conn, row[0], prereq)

    # --- Third pass: race_feats (from scraped wiki data) ---
    race_feats_data = kwargs.get("race_feats") or {}
    for race_name, feat_names in race_feats_data.items():
        race_id = _lookup_id(conn, "races", "name", "id", race_name)
        if not race_id:
            continue
        for feat_name in feat_names:
            feat_id = _lookup_id(conn, "feats", "name", "id", feat_name)
            if feat_id:
                conn.execute(
                    "INSERT OR IGNORE INTO race_auto_feats (race_id, feat_id) VALUES (?, ?)",
                    (race_id, feat_id),
                )

    conn.commit()
    return inserted


# ---------------------------------------------------------------------------
# Enhancement description parsing
# ---------------------------------------------------------------------------

# Known bonus types that appear in enhancement descriptions
_ENH_BONUS_TYPES = [
    "Enhancement", "Insightful", "Insight", "Quality", "Competence",
    "Profane", "Sacred", "Luck", "Morale", "Artifact", "Exceptional",
    "Resistance", "Deflection", "Natural Armor", "Shield", "Dodge",
    "Alchemical", "Equipment", "Festive", "Rage", "Primal",
    "Determination", "Implement", "Music",
]
_ENH_BT_ALT = "|".join(sorted(_ENH_BONUS_TYPES, key=len, reverse=True))

# "+N bonus_type bonus(es) to STAT"
_ENH_PAT_TYPED = re.compile(
    rf"\+(\d+)%?\s+({_ENH_BT_ALT})\s+bonus(?:es)?\s+to\s+(.+?)(?:\.|,|\n|$)",
    re.IGNORECASE,
)

# "+N STAT" or "+N to [your] STAT" (no explicit bonus type)
_ENH_PAT_PLAIN = re.compile(
    r"\+(\d+)%?\s+(?:to\s+(?:your\s+)?)?([A-Z][A-Za-z ]+?)(?:\.|,|\n|$)"
)

# "+[N1/N2/N3] bonus_type bonus(es) to STAT"
_ENH_PAT_RANKED_TYPED = re.compile(
    rf"\+\[([^\]]+)\]\s+({_ENH_BT_ALT})\s+bonus(?:es)?\s+to\s+(.+?)(?:\.|,|\n|$)",
    re.IGNORECASE,
)

# "+[N1/N2/N3] STAT"
_ENH_PAT_RANKED_PLAIN = re.compile(
    r"\+\[([^\]]+)\]\s+(?:to\s+)?([A-Z][A-Za-z ]+?)(?:\.|,|\n|$)"
)

_ENH_BONUS_TYPE_NORM: dict[str, str] = {
    "insight": "Insight",
    "insightful": "Insight",
}



def _parse_enhancement_description(description: str) -> list[dict]:
    """Parse a wiki enhancement description into structured bonus dicts.

    Returns a list of dicts with keys:
        rank (int), value (int), stat (str), bonus_type (str | None)

    Handles patterns like:
        "+1 Strength"
        "+4 Insightful bonus to Wisdom"
        "+[1/2/3] Haggle, Concentration, and Heal"
        "+[3/6/10] Positive Healing Amplification"
    """
    if not description:
        return []

    results: list[dict] = []
    captured_spans: set[tuple[int, int]] = set()

    # --- Pass 1: Ranked patterns with bonus type "+[1/2/3] Type bonus to Stat" ---
    for m in _ENH_PAT_RANKED_TYPED.finditer(description):
        captured_spans.add((m.start(), m.end()))
        values_str = m.group(1)
        raw_bt = m.group(2).strip()
        raw_stat = m.group(3).strip()
        bt = _ENH_BONUS_TYPE_NORM.get(raw_bt.lower(), raw_bt)
        values = [int(v.strip()) for v in values_str.split("/") if v.strip().isdigit()]
        # Handle comma-separated stats: "Haggle, Concentration, and Heal"
        stats = _split_stat_list(raw_stat)
        for stat in stats:
            for i, val in enumerate(values):
                rank = i + 1
                if val > 0 and val <= 500:
                    results.append({"rank": rank, "value": val, "stat": stat, "bonus_type": bt})

    # --- Pass 2: Ranked patterns without bonus type "+[1/2/3] Stat" ---
    for m in _ENH_PAT_RANKED_PLAIN.finditer(description):
        if any(m.start() >= s and m.start() < e for s, e in captured_spans):
            continue
        captured_spans.add((m.start(), m.end()))
        values_str = m.group(1)
        raw_stat = m.group(2).strip()
        # Skip if stat looks like it contains a bonus type name
        if _stat_is_bonus_type(raw_stat):
            continue
        values = [int(v.strip()) for v in values_str.split("/") if v.strip().isdigit()]
        stats = _split_stat_list(raw_stat)
        for stat in stats:
            for i, val in enumerate(values):
                rank = i + 1
                if val > 0 and val <= 500:
                    results.append({"rank": rank, "value": val, "stat": stat, "bonus_type": None})

    # --- Pass 3: Single-value with bonus type "+N Type bonus to Stat" ---
    for m in _ENH_PAT_TYPED.finditer(description):
        if any(m.start() >= s and m.start() < e for s, e in captured_spans):
            continue
        captured_spans.add((m.start(), m.end()))
        val = int(m.group(1))
        raw_bt = m.group(2).strip()
        raw_stat = m.group(3).strip()
        bt = _ENH_BONUS_TYPE_NORM.get(raw_bt.lower(), raw_bt)
        stats = _split_stat_list(raw_stat)
        for stat in stats:
            if val > 0 and val <= 500:
                # If multi-rank enhancement with single value, assign to rank 1
                results.append({"rank": 1, "value": val, "stat": stat, "bonus_type": bt})

    # --- Pass 4: Single-value plain "+N Stat" ---
    for m in _ENH_PAT_PLAIN.finditer(description):
        if any(m.start() >= s and m.start() < e for s, e in captured_spans):
            continue
        captured_spans.add((m.start(), m.end()))
        val = int(m.group(1))
        raw_stat = m.group(2).strip()
        if _stat_is_bonus_type(raw_stat):
            continue
        stats = _split_stat_list(raw_stat)
        for stat in stats:
            if val > 0 and val <= 500:
                results.append({"rank": 1, "value": val, "stat": stat, "bonus_type": None})

    return results


def _split_stat_list(raw: str) -> list[str]:
    """Split comma/and-separated stat lists like 'Haggle, Concentration, and Heal'.

    Only splits on commas. 'X and Y' without commas is treated as a single
    compound name (e.g. 'Positive and Negative Healing Amplification', 'Melee
    and Ranged Power').
    """
    if "," not in raw:
        return [raw.strip()] if raw.strip() and len(raw.strip()) > 1 else []
    parts = re.split(r",\s*(?:and\s+)?", raw)
    # Final part might still have leading "and "
    cleaned = []
    for p in parts:
        p = re.sub(r"^\s*and\s+", "", p).strip()
        if p and len(p) > 1:
            cleaned.append(p)
    return cleaned


def _stat_is_bonus_type(stat: str) -> bool:
    """Check if a stat name is actually a bonus type qualifier."""
    sl = stat.lower()
    return any(bt.lower() == sl or sl.startswith(bt.lower() + " bonus") for bt in _ENH_BONUS_TYPES)


def insert_enhancement_trees(conn: sqlite3.Connection, trees: list[dict]) -> int:
    """Insert a list of enhancement tree dicts (as produced by wiki/scraper.py).

    Each tree dict has the shape::

        {
            "name": "Kensei",
            "type": "class",          # class | racial | universal
            "class_or_race": "Fighter",
            "enhancements": [
                {"name": ..., "icon": ..., "description": ..., "ranks": 1,
                 "ap_cost": 1, "progression": 0, "level": "Fighter Level 1",
                 "prerequisite": ..., "tier": "1"}
            ]
        }

    Handles:
    - ``enhancement_trees`` table (resolves class_id/race_id by name)
    - ``enhancements`` table (one row per enhancement)
    - ``enhancements.description`` column (wiki description with [1/2/3] rank notation)

    Returns the count of tree rows inserted.
    """
    trees = _clean_inputs(trees)

    inserted = 0

    for tree in trees:
        name = tree.get("name")
        if not name:
            logger.warning("Skipping enhancement tree with missing name: %r", tree)
            continue

        tree_type = tree.get("type", "universal")
        ap_pool = _AP_POOL_MAP.get(tree_type, "heroic")
        class_or_race = tree.get("class_or_race") or None

        # Resolve class_id / race_id
        class_id: int | None = None
        race_id: int | None = None
        if tree_type == "class" and class_or_race:
            class_id = _lookup_id(conn, "classes", "name", "id", class_or_race)
            if class_id is None:
                logger.debug(
                    "Enhancement tree %r: class %r not found — inserting without class_id",
                    name, class_or_race,
                )
        elif tree_type == "racial" and class_or_race:
            race_id = _lookup_id(conn, "races", "name", "id", class_or_race)
            if race_id is None:
                logger.debug(
                    "Enhancement tree %r: race %r not found — inserting without race_id",
                    name, class_or_race,
                )

        # For 'class' tree_type we need class_id to satisfy the CHECK constraint.
        # If we couldn't resolve it, store as 'universal' (ap_pool='heroic') so the
        # CHECK doesn't fire — the tree data is still preserved, just without the FK.
        effective_tree_type = tree_type
        effective_class_id = class_id
        effective_race_id = race_id
        if tree_type == "class" and class_id is None:
            effective_tree_type = "universal"
        elif tree_type == "racial" and race_id is None:
            effective_tree_type = "universal"

        cur = conn.execute(
            f"""
            INSERT OR IGNORE INTO enhancement_trees
                (name, tree_type, ap_pool, class_id, race_id)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, effective_tree_type, ap_pool, effective_class_id, effective_race_id),
        )
        inserted += cur.rowcount

        row = conn.execute(
            "SELECT id FROM enhancement_trees WHERE name = ?", (name,)
        ).fetchone()
        if row is None:
            logger.warning("Failed to retrieve id for %r after insert", name)
            continue
        tree_id: int = row[0]

        # --- AP thresholds (standard: 0/5/10/20/30 for tiers 1-5) ---
        for tier_num, ap_req in [("1", 0), ("2", 5), ("3", 10), ("4", 20), ("5", 30)]:
            conn.execute(
                "INSERT OR IGNORE INTO enhancement_tree_ap_thresholds (tree_id, tier, ap_required) VALUES (?, ?, ?)",
                (tree_id, tier_num, ap_req),
            )

        # --- enhancements ---
        for enh in tree.get("enhancements") or []:
            enh_name = enh.get("name")
            if not enh_name:
                continue

            tier = enh.get("tier", "unknown")
            # 'unknown' is allowed by the schema CHECK
            description = enh.get("description")

            cur = conn.execute(
                f"""
                INSERT OR IGNORE INTO enhancements
                    (tree_id, dat_id, name, icon, max_ranks, ap_cost, progression,
                     tier, level_req, prerequisite, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    tree_id,
                    enh.get("dat_id"),
                    enh_name,
                    enh.get("icon"),
                    enh.get("ranks") or 1,
                    enh.get("ap_cost") or 1,
                    enh.get("progression") or 0,
                    tier,
                    enh.get("level"),
                    enh.get("prerequisite"),
                    description,
                ),
            )

            # Always look up by full unique key (lastrowid is unreliable with INSERT OR IGNORE)
            enh_row = conn.execute(
                """SELECT id FROM enhancements
                   WHERE tree_id = ? AND name = ? AND tier = ? AND progression = ?""",
                (tree_id, enh_name, tier, enh.get("progression") or 0),
            ).fetchone()
            if enh_row is None:
                continue
            enh_id: int = enh_row[0]
            max_ranks = enh.get("ranks") or 1

            # --- enhancement_bonuses from parsed description ---
            if description:
                from ..dat_parser.effects import normalize_stat_name
                parsed_bonuses = _parse_enhancement_description(description)
                for pb in parsed_bonuses:
                    raw_stat = pb["stat"]
                    # Normalize through shared stat alias system (handles conditional
                    # stripping, abbreviations, Will Saving Throws -> Will Save, etc.)
                    normalized = normalize_stat_name(raw_stat)
                    resolved_stat = normalized[0] if normalized else raw_stat
                    stat_id, resolved_stat = _resolve_named(conn, "stats", resolved_stat)
                    if stat_id is None and len(normalized) > 1:
                        # Composite stat — use first resolved component
                        for ns in normalized:
                            stat_id, canonical = _resolve_named(conn, "stats", ns)
                            if stat_id is not None:
                                resolved_stat = canonical
                                break
                    bonus_type_id = (
                        _resolve_named(conn, "bonus_types", pb["bonus_type"])[0]
                        if pb.get("bonus_type")
                        else None
                    )
                    bonus_name = _bonus_name(resolved_stat, pb["value"])
                    bonus_id = _ensure_bonus(
                        conn, bonus_name, stat_id, bonus_type_id, pb["value"],
                        description=description,
                    )
                    conn.execute(
                        f"""
                        INSERT OR IGNORE INTO enhancement_bonuses
                            (enhancement_id, bonus_id, min_rank, data_source, resolution_method)
                        VALUES (?, ?, ?, '{DataSource.WIKI}', '{ResolutionMethod.WIKI_DESCRIPTION}')
                        """,
                        (enh_id, bonus_id, pb["rank"]),
                    )

    # --- Second pass: enhancement prerequisites ---
    # Parse "prerequisite" text into enhancement_prereqs and enhancement_prereq_classes.
    # Must happen after all enhancements are inserted so name lookups work.
    _class_level_pat = re.compile(r'(\w[\w ]*?)\s+[Ll]evel\s+(\d+)')
    for tree in trees:
        tname = tree.get("name", "")
        row = conn.execute("SELECT id FROM enhancement_trees WHERE name = ?", (tname,)).fetchone()
        if not row:
            continue
        tree_id = row[0]

        for enh in tree.get("enhancements") or []:
            prereq = enh.get("prerequisite")
            if not prereq:
                continue
            enh_name = enh.get("name")
            if not enh_name:
                continue
            enh_row = conn.execute(
                "SELECT id FROM enhancements WHERE tree_id = ? AND name = ?",
                (tree_id, enh_name),
            ).fetchone()
            if not enh_row:
                continue
            enh_id = enh_row[0]

            for part in re.split(r',\s*', prereq):
                p = part.strip()
                if not p:
                    continue
                # Class level: "Alchemist Level 3"
                m = _class_level_pat.match(p)
                if m:
                    class_name = m.group(1).strip()
                    level = int(m.group(2))
                    class_id = _lookup_id(conn, "classes", "name", "id", class_name)
                    if class_id:
                        conn.execute(
                            "INSERT OR IGNORE INTO enhancement_prereq_classes "
                            "(enhancement_id, class_id, min_level) VALUES (?, ?, ?)",
                            (enh_id, class_id, level),
                        )
                    continue
                # Enhancement name in same tree
                req_row = conn.execute(
                    "SELECT id FROM enhancements WHERE tree_id = ? AND name = ?",
                    (tree_id, p),
                ).fetchone()
                if req_row and req_row[0] != enh_id:
                    conn.execute(
                        "INSERT OR IGNORE INTO enhancement_prereqs "
                        "(enhancement_id, required_enhancement_id) VALUES (?, ?)",
                        (enh_id, req_row[0]),
                    )

    conn.commit()
    return inserted


def insert_class_progression(
    conn: sqlite3.Connection, classes: list[dict],
) -> int:
    """Insert class progression data from wiki-scraped class pages.

    Populates: class_spell_slots, class_auto_feats, class_bonus_feat_slots.
    Does NOT modify the classes seed table (hit_die, saves, etc. are seeded).

    Each class dict has::

        {"name": "Wizard", "levels": [
            {"level": 1, "feats": ["Dismiss Charm", ...],
             "spell_slots": {1: 3}, "sp": 80},
            ...
        ]}
    """
    inserted = 0
    cursor = conn.cursor()

    # Build class name -> id lookup from seed
    class_ids: dict[str, int] = {}
    for row in cursor.execute("SELECT id, name FROM classes"):
        class_ids[row[1]] = row[0]

    # Build feat name -> id lookup (case-insensitive)
    feat_ids: dict[str, int] = {}
    feat_ids_lower: dict[str, int] = {}
    for row in cursor.execute("SELECT id, name FROM feats"):
        feat_ids[row[1]] = row[0]
        feat_ids_lower[row[1].lower()] = row[0]

    for cls in classes:
        class_name = cls["name"]
        class_id = class_ids.get(class_name)
        if class_id is None:
            logger.warning("Class %r not in seed table, skipping", class_name)
            continue

        is_spontaneous = cls.get("spells_known_type") == "known"

        for lv in cls.get("levels", []):
            level = lv["level"]

            # --- Spell slots / spells known ---
            for spell_level, slots in lv.get("spell_slots", {}).items():
                cursor.execute(
                    """INSERT OR IGNORE INTO class_spell_slots
                       (class_id, class_level, spell_level, slots)
                       VALUES (?, ?, ?, ?)""",
                    (class_id, level, spell_level, slots),
                )
                inserted += cursor.rowcount

                # For spontaneous casters, also populate class_spells_known
                if is_spontaneous:
                    cursor.execute(
                        """INSERT OR IGNORE INTO class_spells_known
                           (class_id, class_level, spell_level, known_count)
                           VALUES (?, ?, ?, ?)""",
                        (class_id, level, spell_level, slots),
                    )
                    inserted += cursor.rowcount

            # --- Feats (auto-granted, bonus feat slots, and class choices) ---
            slot_sort_order = 0  # incremented per bonus/choice slot at this level
            for feat_name in lv.get("feats", []):
                feat_name_clean = feat_name.strip().lstrip("|").strip()
                if not feat_name_clean:
                    continue

                fn_lower = feat_name_clean.lower()

                # Bonus feat slots — "Fighter bonus feats", "Martial Arts Feat", etc.
                is_bonus_slot = (
                    "bonus feat" in fn_lower
                    or fn_lower in ("martial arts feat", "dragon arts feat")
                )
                if is_bonus_slot:
                    if fn_lower in ("martial arts feat", "dragon arts feat"):
                        slot_type = "martial_arts"
                    else:
                        slot_type = "class_bonus"
                    cursor.execute(
                        """INSERT OR IGNORE INTO class_bonus_feat_slots
                           (class_id, class_level, sort_order, slot_type, slot_label)
                           VALUES (?, ?, ?, ?, ?)""",
                        (class_id, level, slot_sort_order, slot_type, feat_name_clean),
                    )
                    inserted += cursor.rowcount
                    slot_sort_order += 1

                # Class choice — "X or Y" pattern (e.g., FvS "Grace of Battle or Knowledge of Battle")
                elif " or " in feat_name_clean:
                    choices = [c.strip() for c in feat_name_clean.split(" or ") if c.strip()]
                    cursor.execute(
                        """INSERT OR IGNORE INTO class_bonus_feat_slots
                           (class_id, class_level, sort_order, slot_type, slot_label)
                           VALUES (?, ?, ?, 'class_choice', ?)""",
                        (class_id, level, slot_sort_order, feat_name_clean),
                    )
                    inserted += cursor.rowcount
                    for choice_name in choices:
                        choice_id = feat_ids.get(choice_name)
                        if choice_id is None:
                            choice_id = feat_ids_lower.get(choice_name.lower())
                        if choice_id is not None:
                            cursor.execute(
                                """INSERT OR IGNORE INTO class_choice_feats
                                   (class_id, class_level, sort_order, feat_id)
                                   VALUES (?, ?, ?, ?)""",
                                (class_id, level, slot_sort_order, choice_id),
                            )
                            inserted += cursor.rowcount
                    slot_sort_order += 1

                else:
                    # Auto-granted feat — match by name
                    feat_id = feat_ids.get(feat_name_clean)
                    if feat_id is None:
                        feat_id = feat_ids_lower.get(feat_name_clean.lower())
                    if feat_id is not None:
                        cursor.execute(
                            """INSERT OR IGNORE INTO class_auto_feats
                               (class_id, class_level, feat_id)
                               VALUES (?, ?, ?)""",
                            (class_id, level, feat_id),
                        )
                        inserted += cursor.rowcount
                    else:
                        # Stub: insert minimal feat row for unmatched auto-feats
                        cursor.execute(
                            "INSERT OR IGNORE INTO feats (name, feat_tier) VALUES (?, NULL)",
                            (feat_name_clean,),
                        )
                        if cursor.rowcount > 0:
                            logger.warning(
                                "Created stub feat %r (auto-granted by %s level %d)",
                                feat_name_clean, class_name, level,
                            )
                            stub_id = cursor.lastrowid
                            feat_ids[feat_name_clean] = stub_id
                            feat_ids_lower[feat_name_clean.lower()] = stub_id
                            cursor.execute(
                                """INSERT OR IGNORE INTO class_auto_feats
                                   (class_id, class_level, feat_id)
                                   VALUES (?, ?, ?)""",
                                (class_id, level, stub_id),
                            )
                            inserted += cursor.rowcount

    conn.commit()
    logger.info("Inserted %d class progression rows", inserted)
    return inserted


# ---------------------------------------------------------------------------
# Crafting
# ---------------------------------------------------------------------------


def insert_crafting(conn: sqlite3.Connection, crafting_data: dict) -> int:
    """Insert Cannith Crafting enchantments, scaling values, and slot assignments.

    *crafting_data* is the dict returned by ``collect_crafting()``.
    Returns the total number of rows inserted across all crafting tables.
    """
    enchantments = crafting_data.get("enchantments", [])
    scaling_values = crafting_data.get("values", {})

    # Build equipment slot name -> id map
    slot_ids = dict(conn.execute("SELECT name, id FROM equipment_slots").fetchall())

    inserted = 0

    # 1. Insert enchantment definitions
    for ench in enchantments:
        name = ench["name"]
        cur = conn.execute(
            """INSERT OR IGNORE INTO crafting_enchantments
               (name, is_scaling, crafting_level)
               VALUES (?, ?, ?)""",
            (name, 1 if ench["is_scaling"] else 0, ench.get("crafting_level")),
        )
        inserted += cur.rowcount

    conn.commit()

    # Build enchantment name -> id map
    ench_ids = dict(conn.execute(
        "SELECT name, id FROM crafting_enchantments"
    ).fetchall())

    # 2. Insert scaling values
    for group_name, ml_values in scaling_values.items():
        ench_id = ench_ids.get(group_name)
        if ench_id is None:
            # Try matching "Ins. X" -> "Insightful X" which is the recipe name
            alt_name = group_name.replace("Ins. ", "Insightful ")
            ench_id = ench_ids.get(alt_name)
        if ench_id is None:
            logger.debug("Scaling group %r not matched to enchantment", group_name)
            continue

        for ml, value in ml_values.items():
            cur = conn.execute(
                """INSERT OR IGNORE INTO crafting_enchantment_values
                   (enchantment_id, minimum_level, value)
                   VALUES (?, ?, ?)""",
                (ench_id, ml, str(value)),
            )
            inserted += cur.rowcount

    # 3. Insert slot assignments
    for ench in enchantments:
        ench_id = ench_ids.get(ench["name"])
        if ench_id is None:
            continue

        for slot_name, affix_type in ench.get("slots", []):
            slot_id = slot_ids.get(slot_name)
            if slot_id is None:
                logger.debug(
                    "Unknown equipment slot %r for enchantment %r",
                    slot_name, ench["name"],
                )
                continue

            cur = conn.execute(
                """INSERT OR IGNORE INTO crafting_enchantment_slots
                   (enchantment_id, slot_id, affix_type)
                   VALUES (?, ?, ?)""",
                (ench_id, slot_id, affix_type),
            )
            inserted += cur.rowcount

    conn.commit()
    logger.info("Inserted %d crafting rows", inserted)
    return inserted


def insert_crafting_options(
    conn: sqlite3.Connection, options: list[dict]
) -> int:
    """Insert named crafting system options (Green Steel, Thunder-Forged, etc.).

    Each dict has: system_id, tier, name, description. An option's identity is
    ``(system_id, tier, name)`` — two systems can offer an option of the same
    name, and one system can offer it at more than one tier.

    Rows already carrying that identity are updated in place, never appended to.
    ``build-db`` updates the shipped database rather than rebuilding it (see the
    module header), so this writer replays the same scrape on every run: the
    table reached 4,476 rows holding 1,119 distinct options, one identical copy
    per historical build, because ``INSERT OR IGNORE`` has nothing to ignore on
    without a unique index. Removing those copies needs the referring
    ``crafting_option_bonuses`` rows merged too, which is Phase 4m's dedupe; a
    UNIQUE index on the identity is the structural guard to add once they are
    gone.

    Returns the count of crafting_options rows inserted — 0 on a repeat run.
    """
    options = _clean_inputs(options)

    existing: set[tuple] = {
        (system_id, tier, name)
        for system_id, tier, name in conn.execute(
            "SELECT system_id, tier, name FROM crafting_options"
        )
    }

    inserted = 0
    seen: set[tuple] = set()

    for opt in options:
        system_id = opt.get("system_id")
        tier = opt.get("tier") or ""
        name = opt.get("name") or ""
        description = opt.get("description") or ""

        if not system_id or not name:
            continue

        key = (system_id, tier, name)
        if key in seen:
            continue
        seen.add(key)

        if key in existing:
            # A reworded wiki cell edits the option it belongs to. Every stored
            # copy of the identity is updated, so the pre-existing duplicates
            # cannot drift apart while they wait for 4m.
            conn.execute(
                """UPDATE crafting_options SET description = ?
                    WHERE system_id = ? AND tier = ? AND name = ?
                      AND COALESCE(description, '') != ?""",
                (description, system_id, tier, name, description),
            )
            continue

        conn.execute(
            """INSERT INTO crafting_options
               (system_id, tier, name, description)
               VALUES (?, ?, ?, ?)""",
            (system_id, tier, name, description),
        )
        existing.add(key)
        inserted += 1

    conn.commit()
    logger.info("Inserted %d crafting option rows", inserted)
    return inserted


def populate_item_materials(conn: sqlite3.Connection) -> int:
    """Populate item_materials from distinct material values in items table.

    Also updates material_id FK on items. Must run after items are loaded.
    """
    # Normalize material names
    _NORMALIZE = {
        "Cold iron": "Cold Iron",
        "Flametouched iron": "Flametouched Iron",
    }
    for old, new in _NORMALIZE.items():
        conn.execute("UPDATE items SET material = ? WHERE material = ?", (new, old))

    # Insert distinct materials
    materials = conn.execute(
        "SELECT DISTINCT material FROM items WHERE material IS NOT NULL AND material != '' ORDER BY material"
    ).fetchall()

    inserted = 0
    for (mat,) in materials:
        conn.execute("INSERT OR IGNORE INTO item_materials (name) VALUES (?)", (mat,))
        inserted += 1

    # Update material_id FK
    conn.execute("""
        UPDATE items SET material_id = (
            SELECT id FROM item_materials WHERE name = items.material
        ) WHERE material IS NOT NULL AND material != ''
    """)

    conn.commit()
    logger.info("Populated %d item materials", inserted)
    return inserted


def populate_weapon_types(conn: sqlite3.Connection) -> int:
    """Populate weapon_types from distinct values in item_weapon_stats.

    Must run after items are loaded.
    """
    # Normalize weapon type names (wiki has both "Greataxe" and "Great Axe")
    _NORMALIZE = {
        "Great Axe": "Greataxe",
        "Great Club": "Greatclub",
        "Great Sword": "Greatsword",
        "Long Sword": "Longsword",
        "Short Sword": "Shortsword",
        "Long Bow": "Longbow",
        "Short Bow": "Shortbow",
        "Hand Axe": "Handaxe",
        "War Hammer": "Warhammer",
        "Dwarven War Axe": "Dwarven Waraxe",
    }

    # First normalize existing weapon_stats entries
    for old, new in _NORMALIZE.items():
        conn.execute(
            "UPDATE item_weapon_stats SET weapon_type = ? WHERE weapon_type = ?",
            (new, old),
        )

    # Insert distinct weapon types
    types = conn.execute(
        "SELECT DISTINCT weapon_type FROM item_weapon_stats WHERE weapon_type IS NOT NULL ORDER BY weapon_type"
    ).fetchall()

    inserted = 0
    for (wtype,) in types:
        if wtype.startswith("Cosmetic"):
            continue
        conn.execute(
            "INSERT OR IGNORE INTO weapon_types (name) VALUES (?)",
            (wtype,),
        )
        inserted += 1

    # Update weapon_type_id FK on item_weapon_stats
    conn.execute("""
        UPDATE item_weapon_stats
        SET weapon_type_id = (SELECT id FROM weapon_types WHERE name = item_weapon_stats.weapon_type)
        WHERE weapon_type IN (SELECT name FROM weapon_types)
    """)

    conn.commit()
    logger.info("Populated %d weapon types", inserted)
    return inserted


def populate_feat_exclusion_groups(conn: sqlite3.Connection) -> int:
    """Populate feat_exclusion_groups with known mutual exclusions.

    Combat style feats: SWF, TWF, THF are mutually exclusive.
    """
    feat_ids = dict(conn.execute("SELECT name, id FROM feats").fetchall())

    groups = [
        # Group 1: Combat styles (SWF/TWF/THF are mutually exclusive)
        (1, "Combat Style", [
            "Single Weapon Fighting",
            "Two Weapon Fighting",
            "Two Handed Fighting",
        ]),
    ]

    inserted = 0
    for group_id, group_name, feat_names in groups:
        for feat_name in feat_names:
            fid = feat_ids.get(feat_name)
            if fid:
                conn.execute(
                    "INSERT OR IGNORE INTO feat_exclusion_groups (group_id, group_name, feat_id) VALUES (?, ?, ?)",
                    (group_id, group_name, fid),
                )
                inserted += 1

    conn.commit()
    logger.info("Populated %d feat exclusion group entries", inserted)
    return inserted


def populate_enhancement_prereq_races(conn: sqlite3.Connection) -> int:
    """Populate enhancement_prereq_races by parsing race names from prereq text."""
    race_ids = dict(conn.execute("SELECT name, id FROM races").fetchall())

    rows = conn.execute("""
        SELECT e.id, e.prerequisite, et.tree_type
        FROM enhancements e
        JOIN enhancement_trees et ON et.id = e.tree_id
        WHERE e.prerequisite IS NOT NULL
    """).fetchall()

    inserted = 0
    for enh_id, prereq, tree_type in rows:
        for race_name, race_id in race_ids.items():
            if race_name in prereq:
                conn.execute(
                    "INSERT OR IGNORE INTO enhancement_prereq_races "
                    "(enhancement_id, race_id) VALUES (?, ?)",
                    (enh_id, race_id),
                )
                inserted += 1
                break  # one race per enhancement

    conn.commit()
    logger.info("Populated %d enhancement prereq races", inserted)
    return inserted


def populate_item_upgrades(conn: sqlite3.Connection) -> int:
    """Populate item_upgrades by matching heroic->epic->legendary name pairs.

    Schema: item_id=upgraded version, base_item_id=original, upgrade_tier=1/2/3.
    Tier 1 = Epic, Tier 2 = Legendary, Tier 3 = Perfected.
    """
    inserted = 0

    # Epic versions: "Epic X" base is "X", tier 1
    conn.execute("""
        INSERT OR IGNORE INTO item_upgrades (item_id, base_item_id, upgrade_tier)
        SELECT b.id, a.id, 1
        FROM items a
        JOIN items b ON b.name = 'Epic ' || a.name
        WHERE a.name NOT LIKE 'Epic %'
          AND a.name NOT LIKE 'Legendary %'
          AND a.name NOT LIKE 'Perfected %'
    """)
    epic = conn.execute("SELECT changes()").fetchone()[0]
    inserted += epic

    # Legendary versions: "Legendary X" base is "X", tier 2
    conn.execute("""
        INSERT OR IGNORE INTO item_upgrades (item_id, base_item_id, upgrade_tier)
        SELECT b.id, a.id, 2
        FROM items a
        JOIN items b ON b.name = 'Legendary ' || a.name
        WHERE a.name NOT LIKE 'Legendary %'
          AND a.name NOT LIKE 'Perfected %'
    """)
    legendary = conn.execute("SELECT changes()").fetchone()[0]
    inserted += legendary

    # Perfected versions: "Perfected X" base is "Epic X", tier 3
    conn.execute("""
        INSERT OR IGNORE INTO item_upgrades (item_id, base_item_id, upgrade_tier)
        SELECT b.id, a.id, 3
        FROM items a
        JOIN items b ON b.name = 'Perfected ' || SUBSTR(a.name, 6)
        WHERE a.name LIKE 'Epic %'
    """)
    perfected = conn.execute("SELECT changes()").fetchone()[0]
    inserted += perfected

    conn.commit()
    logger.info("Populated %d item upgrades (%d epic, %d legendary, %d perfected)",
                inserted, epic, legendary, perfected)
    return inserted


def populate_enhancement_feat_links(conn: sqlite3.Connection) -> int:
    """Populate enhancement_feat_links by parsing feat grants from descriptions.

    Matches patterns like "You gain the X feat", "grants the X feat",
    "You gain X" where X is a known feat name.
    """
    feat_ids = dict(conn.execute("SELECT name, id FROM feats").fetchall())
    feat_names_lower = {n.lower(): (n, fid) for n, fid in feat_ids.items()}

    # Known feat grant patterns
    _GRANT_PATTERNS = [
        re.compile(r"you gain the (\w[\w\s'-]+?) feat", re.IGNORECASE),
        re.compile(r"grants? the (\w[\w\s'-]+?) feat", re.IGNORECASE),
        re.compile(r"you gain (\w[\w\s'-]+?) \(", re.IGNORECASE),
        re.compile(r"Feat:\s*(\w[\w\s'-]+?)(?:\.|,|$)", re.IGNORECASE),
    ]

    rows = conn.execute("""
        SELECT e.id, e.description
        FROM enhancements e
        WHERE e.description IS NOT NULL
    """).fetchall()

    inserted = 0
    for enh_id, desc in rows:
        for pat in _GRANT_PATTERNS:
            for m in pat.finditer(desc):
                feat_name = m.group(1).strip()
                # Try exact match, then case-insensitive
                feat_id = feat_ids.get(feat_name)
                if not feat_id:
                    entry = feat_names_lower.get(feat_name.lower())
                    if entry:
                        feat_id = entry[1]
                if feat_id:
                    cur = conn.execute(
                        "INSERT OR IGNORE INTO enhancement_feat_links "
                        "(enhancement_id, feat_id, link_type, min_rank) VALUES (?, ?, 'grants', 1)",
                        (enh_id, feat_id),
                    )
                    inserted += cur.rowcount

    conn.commit()
    logger.info("Populated %d enhancement feat links", inserted)
    return inserted


def populate_enhancement_spell_links(conn: sqlite3.Connection) -> int:
    """Populate enhancement_spell_links by matching SLA names to spells table.

    Parses "SLA: X", "Spell-Like Ability: X" patterns from descriptions.
    """
    spell_ids = dict(conn.execute("SELECT name, id FROM spells").fetchall())
    spell_lower = {n.lower(): (n, sid) for n, sid in spell_ids.items()}

    _SLA_PATS = [
        re.compile(r"SLA:\s*(\w[\w\s'-]+?)(?:\s*\(|\s*Meta|\s*Spell Point|\s*$)", re.IGNORECASE),
        re.compile(r"Spell-Like Ability:\s*(?:\*\s*)?(?:F:\w+\.png\s+)?(\w[\w\s'-]+?)(?:\s*:|$)", re.IGNORECASE),
        re.compile(r"grants? the (\w[\w\s'-]+?) spell", re.IGNORECASE),
    ]

    rows = conn.execute("""
        SELECT e.id, e.description FROM enhancements e
        WHERE e.description IS NOT NULL
          AND (e.description LIKE '%SLA:%'
            OR e.description LIKE '%Spell-Like Ability%'
            OR e.description LIKE '%Spell Like Ability%'
            OR e.description LIKE '%grants the%spell%')
    """).fetchall()

    inserted = 0
    for enh_id, desc in rows:
        for pat in _SLA_PATS:
            for m in pat.finditer(desc):
                spell_name = m.group(1).strip()
                sid = spell_ids.get(spell_name)
                if not sid:
                    entry = spell_lower.get(spell_name.lower())
                    if entry:
                        sid = entry[1]
                if sid:
                    cur = conn.execute(
                        "INSERT OR IGNORE INTO enhancement_spell_links "
                        "(enhancement_id, spell_id, link_type, min_rank) VALUES (?, ?, 'grants', 1)",
                        (enh_id, sid),
                    )
                    inserted += cur.rowcount

    conn.commit()
    logger.info("Populated %d enhancement spell links", inserted)
    return inserted


def populate_enhancement_exclusion_groups(conn: sqlite3.Connection) -> int:
    """Populate enhancement_exclusion_groups from "Choose/Select" patterns.

    Finds enhancements with "Choose between X and Y" or "Select one" patterns
    and groups the choices as mutually exclusive within the same enhancement.
    """
    rows = conn.execute("""
        SELECT e.id, e.name, e.description, e.tree_id
        FROM enhancements e
        WHERE e.description IS NOT NULL
          AND (e.description LIKE '%Choose between%'
            OR e.description LIKE '%Choose One%'
            OR e.description LIKE '%Choose one%')
    """).fetchall()

    inserted = 0
    group_id = 1

    for enh_id, enh_name, desc, tree_id in rows:
        # "Choose between X and Y" pattern
        m = re.search(r"Choose between (\w[\w\s'-]+?) and (\w[\w\s'-]+?)[\.\:]", desc)
        if m:
            choice_a = m.group(1).strip()
            choice_b = m.group(2).strip()
            # Find enhancements with these names in the same tree
            for choice_name in [choice_a, choice_b]:
                choice_row = conn.execute(
                    "SELECT id FROM enhancements WHERE tree_id = ? AND name LIKE ?",
                    (tree_id, f"%{choice_name}%"),
                ).fetchone()
                if choice_row:
                    conn.execute(
                        "INSERT OR IGNORE INTO enhancement_exclusion_groups "
                        "(group_id, group_name, enhancement_id) VALUES (?, ?, ?)",
                        (group_id, f"{enh_name} choice", choice_row[0]),
                    )
                    inserted += 1
            group_id += 1

    conn.commit()
    logger.info("Populated %d enhancement exclusion group entries", inserted)
    return inserted


def populate_stat_sources(conn: sqlite3.Connection) -> int:
    """Populate stat_sources by finding which trees/classes reference class-specific stats.

    Scans enhancement_bonuses to discover which enhancement trees grant
    each class-specific stat, then records the class association.
    Must run after enhancements and bonuses are loaded.
    """
    from ddo_data.enums import S

    # Stats that should have source entries
    class_stats = [
        S.ELDRITCH_BLAST_DICE, S.PACT_DICE, S.SPELLSWORD_DICE,
        S.BURNING_AMBITION_DICE, S.KI, S.RAGE_USES,
        S.LAY_ON_HANDS_USES, S.TURN_UNDEAD_LEVEL, S.BARD_SONGS,
    ]

    inserted = 0
    for stat in class_stats:
        # Find the primary class that grants this stat (via enhancement tree class_id)
        row = conn.execute("""
            SELECT DISTINCT et.class_id
            FROM enhancement_bonuses eb
            JOIN bonuses b ON b.id = eb.bonus_id
            JOIN enhancements e ON e.id = eb.enhancement_id
            JOIN enhancement_trees et ON et.id = e.tree_id
            WHERE b.stat_id = ? AND et.class_id IS NOT NULL
            LIMIT 1
        """, (stat.id,)).fetchone()

        class_id = row[0] if row else None
        conn.execute(
            "INSERT OR IGNORE INTO stat_sources (stat_id, class_id) VALUES (?, ?)",
            (stat.id, class_id),
        )
        inserted += 1

    conn.commit()
    logger.info("Populated %d stat source entries", inserted)
    return inserted


def populate_crafting_option_bonuses(conn: sqlite3.Connection) -> int:
    """Resolve crafting option descriptions to bonuses table entries.

    Parses stat bonuses from crafting option descriptions using the
    shared enchantment parser, creating bonuses rows and linking via
    crafting_option_bonuses junction.
    """
    from ..dat_parser.effects import parse_enchantment_string_multi

    rows = conn.execute("""
        SELECT co.id, co.description
        FROM crafting_options co
        WHERE co.description IS NOT NULL AND co.description != ''
          AND NOT EXISTS (SELECT 1 FROM crafting_option_bonuses cob WHERE cob.option_id = co.id)
    """).fetchall()

    inserted = 0
    for opt_id, desc in rows:
        parsed = parse_enchantment_string_multi(desc)
        for i, bonus_dict in enumerate(parsed):
            stat_name = bonus_dict.get("stat")
            if not stat_name:
                continue
            stat_id, stat_name = _resolve_named(conn, "stats", stat_name)
            bonus_type = bonus_dict.get("bonus_type")
            bonus_type_id = (
                _resolve_named(conn, "bonus_types", bonus_type)[0]
                if bonus_type else None
            )
            value = bonus_dict.get("value")
            if value is None:
                continue

            bonus_name = _bonus_name(stat_name, value)
            bonus_id = _ensure_bonus(
                conn, bonus_name, stat_id, bonus_type_id, value,
                description=desc,
            )
            conn.execute(
                "INSERT OR IGNORE INTO crafting_option_bonuses (option_id, bonus_id, sort_order) VALUES (?, ?, ?)",
                (opt_id, bonus_id, i),
            )
            inserted += 1

    conn.commit()
    logger.info("Populated %d crafting option bonus links", inserted)
    return inserted


def backfill_item_slots(conn: sqlite3.Connection, slot_data: dict[str, set[str]]) -> int:
    """Backfill equipment_slot for items using wiki slot category data.

    Args:
        slot_data: Maps DB slot name -> set of item names in that slot.
    Returns count of items updated.
    """
    slot_ids: dict[str, int] = dict(
        conn.execute("SELECT name, id FROM equipment_slots").fetchall()
    )
    null_items: dict[str, int] = dict(
        conn.execute("SELECT name, id FROM items WHERE equipment_slot IS NULL").fetchall()
    )

    updated = 0
    for db_slot, item_names in slot_data.items():
        slot_id = slot_ids.get(db_slot)
        for item_name in item_names:
            item_id = null_items.pop(item_name, None)
            if item_id is not None:
                conn.execute(
                    "UPDATE items SET equipment_slot = ?, slot_id = ? WHERE id = ?",
                    (db_slot, slot_id, item_id),
                )
                updated += 1

    conn.commit()
    logger.info("Backfilled equipment_slot for %d items", updated)
    return updated


def backfill_item_materials(conn: sqlite3.Connection, material_data: dict[str, set[str]]) -> int:
    """Backfill material for items using wiki material category data.

    Args:
        material_data: Maps material name -> set of item names with that material.
    Returns count of items updated.
    """
    material_ids: dict[str, int] = dict(
        conn.execute("SELECT name, id FROM item_materials").fetchall()
    )
    null_items: dict[str, int] = dict(
        conn.execute("SELECT name, id FROM items WHERE material IS NULL").fetchall()
    )

    updated = 0
    for mat_name, item_names in material_data.items():
        mat_id = material_ids.get(mat_name)
        for item_name in item_names:
            item_id = null_items.pop(item_name, None)
            if item_id is not None:
                conn.execute(
                    "UPDATE items SET material = ?, material_id = ? WHERE id = ?",
                    (mat_name, mat_id, item_id),
                )
                updated += 1

    conn.commit()
    logger.info("Backfilled material for %d items", updated)
    return updated


def discover_new_races(conn: sqlite3.Connection, wiki_race_names: list[str]) -> int:
    """Insert races found in wiki categories but not in the seed.

    Only creates stub rows (name only) for genuinely new races.
    Skips index pages, speculation pages, and known aliases.
    """
    _SKIP = {"Races", "Racial Variant differences", "Kobold (speculation)"}
    _ALIASES = {
        "Drow": "Drow Elf",
        "Sun Elf (Morninglord)": "Morninglord",
    }

    existing = set(r[0] for r in conn.execute("SELECT name FROM races").fetchall())
    alias_targets = set(_ALIASES.values())

    created = 0
    for name in wiki_race_names:
        if name in _SKIP:
            continue
        if name in existing:
            continue
        if _ALIASES.get(name) in existing:
            continue
        conn.execute("INSERT OR IGNORE INTO races (name) VALUES (?)", (name,))
        created += 1
        logger.info("Discovered new race from wiki: %s", name)

    if created:
        conn.commit()
    return created


def discover_new_classes(conn: sqlite3.Connection, wiki_class_names: list[str]) -> int:
    """Insert classes found in wiki categories but not in the seed.

    Only creates stub rows (name only) for genuinely new classes.
    """
    _SKIP = {"Classes", "Psion (speculation)"}

    existing = set(r[0] for r in conn.execute("SELECT name FROM classes").fetchall())

    created = 0
    for name in wiki_class_names:
        if name in _SKIP or name in existing:
            continue
        conn.execute("INSERT OR IGNORE INTO classes (name) VALUES (?)", (name,))
        created += 1
        logger.info("Discovered new class from wiki: %s", name)

    if created:
        conn.commit()
    return created


def discover_new_enhancement_trees(
    conn: sqlite3.Connection, wiki_tree_names: list[str],
) -> list[str]:
    """Return enhancement tree page titles found in wiki categories but not in DB.

    Does NOT insert -- returns the list so the caller can fetch and parse them.
    """
    existing = set(r[0] for r in conn.execute("SELECT name FROM enhancement_trees").fetchall())

    new_titles = []
    for title in wiki_tree_names:
        name = title.replace(" enhancements", "").replace("_", " ")
        if name not in existing:
            new_titles.append(title)

    return new_titles


def apply_overrides(conn: sqlite3.Connection, overrides_path: str | None = None) -> int:
    """Apply manual bonus/effect overrides from a JSON file.

    The overrides file has this structure::

        {
          "item_bonuses": {
            "Item Name": [
              {"stat": "Melee Power", "value": 15, "bonus_type": "Artifact"}
            ]
          },
          "item_effects": {
            "Item Name": [
              {"effect": "Vorpal", "modifier": "Sovereign"}
            ]
          }
        }

    Returns total rows inserted.
    """
    import json
    from pathlib import Path
    from ..enums import DataSource

    if overrides_path is None:
        overrides_path = str(Path(__file__).parent.parent / "data" / "overrides.json")

    path = Path(overrides_path)
    if not path.exists():
        return 0

    data = json.loads(path.read_text())
    inserted = 0

    # Apply item_bonuses overrides
    for item_name, bonuses in data.get("item_bonuses", {}).items():
        item_row = conn.execute("SELECT id FROM items WHERE name = ?", (item_name,)).fetchone()
        if item_row is None:
            logger.warning("Override: item '%s' not found", item_name)
            continue
        item_id = item_row[0]

        # Get current max sort_order for this item
        max_sort = conn.execute(
            "SELECT COALESCE(MAX(sort_order), -1) FROM item_bonuses WHERE item_id = ?",
            (item_id,),
        ).fetchone()[0]

        for i, bonus in enumerate(bonuses):
            stat_id, stat_name = _resolve_named(conn, "stats", bonus.get("stat"))
            bonus_type_id = _resolve_named(conn, "bonus_types", bonus.get("bonus_type"))[0]
            value = bonus.get("value")
            name = _bonus_name(stat_name or "override", value)

            bonus_id = _ensure_bonus(conn, name, stat_id, bonus_type_id, value)
            if bonus_id is not None:
                conn.execute(
                    f"INSERT OR IGNORE INTO item_bonuses (item_id, bonus_id, sort_order, data_source) VALUES (?, ?, ?, '{DataSource.OVERRIDE}')",
                    (item_id, bonus_id, max_sort + 1 + i),
                )
                inserted += 1

    # Apply item_effects overrides
    for item_name, effects in data.get("item_effects", {}).items():
        item_row = conn.execute("SELECT id FROM items WHERE name = ?", (item_name,)).fetchone()
        if item_row is None:
            logger.warning("Override: item '%s' not found", item_name)
            continue
        item_id = item_row[0]

        max_sort = conn.execute(
            "SELECT COALESCE(MAX(sort_order), -1) FROM item_effects WHERE item_id = ?",
            (item_id,),
        ).fetchone()[0]

        for i, effect in enumerate(effects):
            effect_id = _ensure_effect(conn, effect["effect"], effect.get("modifier"))
            if effect_id is not None:
                conn.execute(
                    f"INSERT OR IGNORE INTO item_effects (item_id, effect_id, value, sort_order, data_source) VALUES (?, ?, ?, ?, '{DataSource.OVERRIDE}')",
                    (item_id, effect_id, effect.get("value"), max_sort + 1 + i),
                )
                inserted += 1

    conn.commit()
    if inserted:
        logger.info("Applied %d override rows", inserted)
    return inserted



def insert_quest_loot(conn: sqlite3.Connection, loot_entries: list[dict]) -> int:
    """Insert quest-to-item loot mappings from wiki category data.

    Each dict has keys: quest_name, item_name, and optionally loot_type
    ('chest'/'reward'/'raid' — see :class:`~ddo_data.enums.LootType`).

    A quest can sit under several wiki loot categories, so the same
    quest+item pair can arrive more than once. Precedence is explicit rather
    than positional: 'raid' is the most specific classification and is never
    downgraded, so re-runs and out-of-order input converge on the same
    result. (``_QUEST_LOOT_SOURCES`` still walks Raid_loot last, which makes
    the common path a plain overwrite.)

    Returns count of rows inserted/updated.
    """
    # Build lookup dicts
    quest_ids: dict[str, int] = dict(
        conn.execute("SELECT name, id FROM quests").fetchall()
    )
    item_ids: dict[str, int] = dict(
        conn.execute("SELECT name, id FROM items").fetchall()
    )

    inserted = 0
    created_quests = 0
    skipped_item = 0

    for entry in loot_entries:
        quest_id = quest_ids.get(entry["quest_name"])
        if quest_id is None:
            # Auto-create quest from category discovery
            conn.execute(
                "INSERT OR IGNORE INTO quests (name) VALUES (?)",
                (entry["quest_name"],),
            )
            row = conn.execute(
                "SELECT id FROM quests WHERE name = ?", (entry["quest_name"],)
            ).fetchone()
            if row:
                quest_id = row[0]
                quest_ids[entry["quest_name"]] = quest_id
                created_quests += 1
            else:
                continue
        item_id = item_ids.get(entry["item_name"])
        if item_id is None:
            skipped_item += 1
            continue
        loot_type = entry.get("loot_type")
        conn.execute(
            """
            INSERT INTO quest_loot (quest_id, item_id, loot_type)
            VALUES (?, ?, ?)
            ON CONFLICT (quest_id, item_id) DO UPDATE SET
                loot_type = CASE
                    -- 'raid' is the most specific tag; never downgrade it.
                    WHEN quest_loot.loot_type = ? THEN quest_loot.loot_type
                    WHEN excluded.loot_type IS NULL THEN quest_loot.loot_type
                    ELSE excluded.loot_type
                END
            """,
            (quest_id, item_id, loot_type, str(LootType.RAID)),
        )
        inserted += 1

    conn.commit()
    logger.info(
        "Inserted %d quest loot links (created %d new quests, skipped %d unmatched items)",
        inserted, created_quests, skipped_item,
    )
    return inserted


def backfill_quest_loot_types(
    conn: sqlite3.Connection,
    raid_quest_names: Iterable[str],
) -> int:
    """Tag quest_loot rows as raid loot using a hand-maintained quest list.

    STOPGAP, not the real mechanism. The authoritative source is the wiki's
    ``Category:Raid_loot``, which ``collect_quest_loot`` already reads — but
    ddowiki now sits behind an AWS WAF JS challenge that blocks every
    non-browser client (see docs/ddowiki-api.md), so a scrape can't run.
    This lets the column be populated offline in the meantime.

    Only fills rows where ``loot_type IS NULL``, so it never overwrites
    scraped values. That makes it safe to leave wired into the build: once a
    real scrape lands, this becomes a no-op and can be deleted along with
    ``KNOWN_RAID_QUESTS``.

    Args:
        raid_quest_names: Quest names to tag. Matched exactly against
            ``quests.name``; names matching no quest are skipped silently
            (the list is hand-maintained, and a stale entry shouldn't break
            a build).

    Returns count of rows updated.
    """
    names = list(raid_quest_names)
    if not names:
        return 0

    placeholders = ", ".join("?" for _ in names)
    cur = conn.execute(
        f"""
        UPDATE quest_loot SET loot_type = ?
        WHERE loot_type IS NULL
          AND quest_id IN (SELECT id FROM quests WHERE name IN ({placeholders}))
        """,
        (str(LootType.RAID), *names),
    )
    updated = cur.rowcount
    conn.commit()
    logger.info(
        "Backfilled loot_type='raid' on %d quest_loot rows from %d quest names",
        updated, len(names),
    )
    return updated


def seed_quest_data(conn: sqlite3.Connection) -> int:
    """Seed quest, adventure pack, and patron data from static wiki-scraped data.

    Loads ``quest_seed_data.json`` and populates:
    - patrons, adventure_packs, quests, quest_loot
    """
    import json
    from pathlib import Path

    data_path = Path(__file__).parent.parent / "wiki" / "quest_seed_data.json"
    if not data_path.exists():
        logger.warning("quest_seed_data.json not found, skipping")
        return 0

    data = json.loads(data_path.read_text())
    inserted = 0

    # Patrons
    for patron_name in data.get("patrons", []):
        conn.execute("INSERT OR IGNORE INTO patrons (name) VALUES (?)", (patron_name,))
        inserted += 1

    # Adventure packs
    for pack in data.get("adventure_packs", []):
        conn.execute(
            "INSERT OR IGNORE INTO adventure_packs (name, is_free_to_play) VALUES (?, ?)",
            (pack["name"], 1 if pack.get("is_free") else 0),
        )
        inserted += 1

    conn.commit()

    # Build lookups
    patron_ids = dict(conn.execute("SELECT name, id FROM patrons").fetchall())
    pack_ids = dict(conn.execute("SELECT name, id FROM adventure_packs").fetchall())
    item_ids = dict(conn.execute("SELECT name, id FROM items").fetchall())

    # Quests
    for quest in data.get("quests", []):
        qname = quest.get("name")
        if not qname:
            continue
        pack_id = pack_ids.get(quest.get("pack")) if quest.get("pack") else None
        patron_id = patron_ids.get(quest.get("patron")) if quest.get("patron") else None
        conn.execute(
            """INSERT OR IGNORE INTO quests (name, level, pack_id, patron_id, zone)
               VALUES (?, ?, ?, ?, ?)""",
            (qname, quest.get("level"), pack_id, patron_id, quest.get("zone")),
        )
        inserted += 1

    conn.commit()

    # Quest loot — match quest names to items that reference them
    quest_ids = dict(conn.execute("SELECT name, id FROM quests").fetchall())
    for quest in data.get("quests", []):
        qname = quest.get("name")
        qid = quest_ids.get(qname)
        if not qid:
            continue
        for item_name in quest.get("loot", []):
            item_id = item_ids.get(item_name)
            if item_id:
                conn.execute(
                    "INSERT OR IGNORE INTO quest_loot (quest_id, item_id) VALUES (?, ?)",
                    (qid, item_id),
                )
                inserted += 1

    conn.commit()
    logger.info("Seeded %d quest data rows", inserted)
    return inserted


def seed_class_feat_data(conn: sqlite3.Connection) -> int:
    """Seed class choice feats and bonus feat lists from static wiki-scraped data.

    Populates class_choice_feats (FvS/Druid) and feat_bonus_classes
    (Fighter/Wizard/Artificer/Alchemist) from ``class_feat_data.json``.
    """
    import json
    from pathlib import Path

    data_path = Path(__file__).parent.parent / "wiki" / "class_feat_data.json"
    if not data_path.exists():
        logger.warning("class_feat_data.json not found, skipping")
        return 0

    data = json.loads(data_path.read_text())
    inserted = 0

    # Build lookups
    class_ids = dict(conn.execute("SELECT name, id FROM classes").fetchall())
    feat_ids = dict(conn.execute("SELECT name, id FROM feats").fetchall())

    # --- FvS level 7 choices ---
    fvs_id = class_ids.get("Favored Soul")
    if fvs_id:
        for feat_name in data.get("favored_soul_level7", []):
            feat_id = feat_ids.get(feat_name)
            if not feat_id:
                conn.execute("INSERT OR IGNORE INTO feats (name) VALUES (?)", (feat_name,))
                row = conn.execute("SELECT id FROM feats WHERE name = ?", (feat_name,)).fetchone()
                if row:
                    feat_id = row[0]
                    feat_ids[feat_name] = feat_id
            if feat_id:
                conn.execute(
                    "INSERT OR IGNORE INTO class_choice_feats (class_id, class_level, feat_id) VALUES (?, 7, ?)",
                    (fvs_id, feat_id),
                )
                inserted += 1

    # --- Druid wildshape choices ---
    druid_id = class_ids.get("Druid")
    if druid_id:
        for level_str, forms in data.get("druid_wildshape", {}).items():
            level = int(level_str)
            for form_name in forms:
                feat_id = feat_ids.get(form_name)
                if not feat_id:
                    # Create stub feat for wildshape forms
                    conn.execute(
                        "INSERT OR IGNORE INTO feats (name) VALUES (?)",
                        (form_name,),
                    )
                    row = conn.execute("SELECT id FROM feats WHERE name = ?", (form_name,)).fetchone()
                    if row:
                        feat_id = row[0]
                if feat_id:
                    conn.execute(
                        "INSERT OR IGNORE INTO class_choice_feats (class_id, class_level, feat_id) VALUES (?, ?, ?)",
                        (druid_id, level, feat_id),
                    )
                    inserted += 1

    # --- Bonus feat lists (Fighter, Wizard, Artificer, Alchemist) ---
    bonus_map = {
        "Fighter": data.get("fighter_bonus_feats", []),
        "Wizard": data.get("wizard_bonus_feats", []),
        "Artificer": data.get("artificer_bonus_feats", []),
        "Alchemist": data.get("alchemist_bonus_feats", []),
    }
    for class_name, feat_names in bonus_map.items():
        cid = class_ids.get(class_name)
        if not cid:
            continue
        for feat_name in feat_names:
            fid = feat_ids.get(feat_name)
            if fid:
                conn.execute(
                    "INSERT OR IGNORE INTO feat_bonus_classes (feat_id, class_id) VALUES (?, ?)",
                    (fid, cid),
                )
                inserted += 1

    conn.commit()
    logger.info("Seeded %d class feat data rows", inserted)
    return inserted


def seed_crafting_data(conn: sqlite3.Connection) -> int:
    """Seed crafting items, ingredients, and recipes from static wiki-scraped data.

    Loads ``crafting_seed_data.json`` (scraped from DDO Wiki) and populates:
    - crafting_system_items: links systems to their craftable items
    - crafting_ingredients: material definitions
    - crafting_recipes: upgrade paths (input + materials -> output)
    - crafting_recipe_ingredients: materials needed per recipe

    Returns total rows inserted across all tables.
    """
    import json
    from pathlib import Path

    from ddo_data.enums import CraftingSystem

    seed_path = Path(__file__).parent.parent / "wiki" / "crafting_seed_data.json"
    if not seed_path.exists():
        logger.warning("crafting_seed_data.json not found, skipping seed")
        return 0

    data = json.loads(seed_path.read_text())
    inserted = 0

    # Insert missing craftable items as stubs before linking
    missing_path = Path(__file__).parent.parent / "wiki" / "crafting_missing_items.json"
    if missing_path.exists():
        missing_items = json.loads(missing_path.read_text())
        # Map equipment slot names to IDs
        slot_ids = dict(conn.execute("SELECT name, id FROM equipment_slots").fetchall())
        for mi in missing_items:
            name = mi["name"]
            slot_name = mi.get("equipment_slot")
            slot_id = slot_ids.get(slot_name) if slot_name else None
            cur = conn.execute(
                """INSERT OR IGNORE INTO items
                   (name, minimum_level, equipment_slot, slot_id, item_category)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    name,
                    mi.get("minimum_level"),
                    slot_name,
                    slot_id,
                    mi.get("item_category"),
                ),
            )
            inserted += cur.rowcount
        conn.commit()
        logger.info("Inserted %d missing craftable items", inserted)

    # Build system name -> id map
    sys_ids = {m.value: m.id for m in CraftingSystem}
    # Build item name -> id map (rebuilt after missing item insertion)
    item_ids = dict(conn.execute("SELECT name, id FROM items").fetchall())

    for sys_data in data:
        sys_name = sys_data["system"]
        sys_id = sys_ids.get(sys_name)
        if sys_id is None:
            logger.debug("Unknown crafting system %r, skipping", sys_name)
            continue

        # --- Link items ---
        for item_name in sys_data.get("items", []):
            item_id = item_ids.get(item_name)
            if item_id is not None:
                cur = conn.execute(
                    "INSERT OR IGNORE INTO crafting_system_items (system_id, item_id) VALUES (?, ?)",
                    (sys_id, item_id),
                )
                inserted += cur.rowcount

        # --- Insert ingredients ---
        for ingr in sys_data.get("ingredients", []):
            name = ingr.get("name", "").strip()
            if not name:
                continue
            conn.execute(
                "INSERT OR IGNORE INTO crafting_ingredients (name, wiki_url) VALUES (?, ?)",
                (name, ingr.get("wiki_url")),
            )

        # --- Insert recipes ---
        # A recipe's identity is its system plus the upgrade it describes. The
        # table has no unique index to lean on (and cannot get one until the
        # copies four earlier builds appended are removed — Phase 4m), so the
        # existing row is looked up rather than trusted to collide.
        for recipe in sys_data.get("upgrades", []):
            recipe_name = recipe.get("input", "") or recipe.get("tier", "")
            input_name = recipe.get("input", "")
            output_name = recipe.get("output", "")
            input_id = item_ids.get(input_name) if input_name else None
            output_id = item_ids.get(output_name) if output_name else None
            identity = (sys_id, recipe_name, input_id, output_id, recipe.get("tier", ""))

            existing_recipe = conn.execute(
                """SELECT id FROM crafting_recipes
                    WHERE system_id = ? AND COALESCE(name, '') = COALESCE(?, '')
                      AND COALESCE(input_item_id, -1) = COALESCE(?, -1)
                      AND COALESCE(output_item_id, -1) = COALESCE(?, -1)
                      AND COALESCE(description, '') = COALESCE(?, '')""",
                identity,
            ).fetchone()
            if existing_recipe is not None:
                recipe_id = existing_recipe[0]
            else:
                cur = conn.execute(
                    """INSERT INTO crafting_recipes
                       (system_id, name, input_item_id, output_item_id, description)
                       VALUES (?, ?, ?, ?, ?)""",
                    identity,
                )
                recipe_id = cur.lastrowid
                inserted += 1

            # Link ingredients to recipe
            for ingr_name, qty in recipe.get("ingredients", {}).items():
                ingr_row = conn.execute(
                    "SELECT id FROM crafting_ingredients WHERE name = ?",
                    (ingr_name,),
                ).fetchone()
                if ingr_row:
                    cur = conn.execute(
                        """INSERT OR IGNORE INTO crafting_recipe_ingredients
                           (recipe_id, ingredient_id, quantity)
                           VALUES (?, ?, ?)""",
                        (recipe_id, ingr_row[0], qty),
                    )
                    inserted += cur.rowcount

    conn.commit()
    logger.info("Seeded %d crafting data rows (items, ingredients, recipes)", inserted)
    return inserted
