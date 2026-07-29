# ETL Invariants

Hard-won rules for the `ddo-data` pipeline under `scripts/`. Established in Phase 4c (2026-07-29)
after each one had already cost real data. Read this before changing a parser or a writer.

Companion docs: [db-guidelines.md](db-guidelines.md) for schema conventions and write-path
idempotency, [ddowiki-api.md](ddowiki-api.md) for what the WAF blocks and what the page cache can
still supply.

## 1. Templates are structure to expand, never noise to strip

**Never** write `re.sub(r'\{\{[^{}]*\}\}', '', text)`. That one pattern caused four separate bugs
that looked unrelated on the Phase 4c list:

- An item whose wiki field reads `| name = {{Item|Crystallized Eternity}} (level 12)` was stored as
  `"(level 12)"` — the real name was *inside* the template that got deleted. 7 items.
- 3,929 `bonuses.description` rows held raw template source, of which 3,720 were nothing but an
  unexpanded invocation.
- The same regex was ported into TypeScript as a frontend workaround (`cleanDescription`), so the
  gap propagated into a second language.
- Wiki-maintenance markers (`{{bug}}`, `{{InlineWht}}`) were treated as item data.

Use `wiki/templates.py`, which classifies a template as a maintenance marker, a transparent wrapper,
or a data template, and builds on the nesting-aware `parsers.extract_template`. Nesting matters:
`{{Nearly Finished|{{stat|Strength}}|…}}` captures the literal `{{stat` as its first parameter if you
split on `|` yourself.

## 2. There are two kinds of enchantment template, and they need opposite treatment

- **Formatter templates** (~25 names: `Stat`, `SpellPower`, `Spelllore`, `Absorption`, `Save`,
  `Sheltering`, `Hp`, `Skills`, …). The invocation *is* the data — `{{Stat|Wisdom|14}}` means
  "+14 Wisdom" — and it parses into `stat_id` / `bonus_type_id` / `value`. Render the description
  **from those structured columns**.
- **Named-enchantment templates** (`Deception`, `Seeker`, `Wizardry`, `Overfocus`, …). The invocation
  is a *reference to a wiki page*, and that page's `{{Unique enchantment}} | effect =` field carries
  the meaning. `Deception +7` does not tell you Deception grants a to-hit and damage bonus on sneak
  attacks; only the page does. Resolve the reference and store that text.

`unique_enchantments` holds these definitions (762 rows), with nullable FKs from **both** `bonuses`
and `effects` — because the wiki's "unique enchantment" is the family our schema splits across those
two tables, not a third concept.

## 3. Normalize strings where rows are written, not per-parser

HTML entities leaked into 96 rows across 7 columns fed by **5 different parsers**. Any per-parser fix
leaves the next parser broken. `db/writers.py` owns entity decoding, markup removal from `name`
columns, and case/punctuation collapsing, so a new scraper inherits all of it.

Corollaries:

- Normalization must be **idempotent** — a already-clean string is unchanged. Double-unescaping turns
  `&amp;amp;` into `&`.
- Cache keys use the **decoded** page title, so a row still holding an escaped name misses its own
  cache entry until unescaped.
- A `name` column may not carry markup at all. Wikilinks render as their display text
  (`[[True Seeing (enhancement)|True Seeing]]` → `True Seeing`), never stripped to nothing; HTML tags
  become word boundaries, because deleting `<br />` fuses the words either side of it.

## 4. `bonuses.name` is generated, so it cannot validate anything

`name` is built from the resolved `stat_id` plus `value`. A wrong stat therefore produces a
wrong-but-perfectly-self-consistent row, and a "does the name match the stat?" check finds nothing.
That is exactly how `{{Save|Spell|N}}` sat in stat 21 (`Spell Resistance`) for 19 rows when stat 177
(`Spell Save`) existed — two different game mechanics, one of them a saving throw and the other a
caster-level check.

**Validate the template source against the resolved stat.** Never the generated label.

## 5. Every assertion needs a test that it fires

Validation lives in `db/validate.py` (`ValidationResult` + severity, wired to `ddo-data validate-db`,
which exits 1 on any `error`). An assertion that has only ever been observed to pass may be inert.
Each one gets a test that feeds it crafted bad data and confirms it fails — see
`scripts/tests/test_db_validate.py`.

Where a rule has legitimate exceptions, encode an **allowlist with a reason per entry**. A bare rule
that fires on 7 correct cases gets deleted the first time it annoys someone; a rule that explains
itself survives.

## 6. Idempotency and convergence are correctness properties

While the WAF stands, `build-db` **updates in place** rather than rebuilding, so every write path
runs against a populated table. See [db-guidelines.md](db-guidelines.md#a-unique-index-is-what-makes-a-write-path-idempotent)
for the unique-index requirement, and note the subtler failure: two normalization passes that feed
each other can oscillate forever while row counts stay perfectly stable. `collapse_value_variants`
and `renormalize_bonus_names` flipped 18 negative bonuses to positive on every single build, and
`build-db` runs the collapse last, so the wrong sign is what shipped. Assert **value** convergence,
not just row counts. Pattern: `scripts/tests/test_writer_idempotency.py`.

## 7. Frontend workarounds are a smell pointing here

`cleanDescription` in `EnchantmentList.tsx` existed only because the ETL stored raw wikitext. When a
view starts massaging pipeline output at render time, the fix belongs in `scripts/` — every other
consumer (future tools, exports, the stats engine) needs the same repair and will not get it. Delete
the workaround in the same change that fixes the data.
