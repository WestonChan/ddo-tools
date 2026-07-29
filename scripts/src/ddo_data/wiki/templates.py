"""MediaWiki template semantics: ``{{Template|...}}`` -> display text / structure.

Single owner of the question *"what does this template mean?"*. Before this
module existed, three call sites answered it with ``re.sub(r'\\{\\{[^{}]*\\}\\}', '')``
— treating every template as noise to delete rather than structure to expand.
That one pattern produced the items named ``(level 12)`` (the name was
``{{Item|Crystallized Eternity}} (level 12)``), the unexpanded
``bonuses.description`` rows, and the ``cleanDescription`` workaround the
frontend carried to hide the result.

Three kinds of template are distinguished, because they need opposite handling:

* **Maintenance** (``{{bug}}``, ``{{Orphan}}``) — editorial markers aimed at wiki
  editors. They carry no game data and must produce no row at all.
* **Transparent wrappers** (``{{InlineWht}}`` for white text, ``{{Nearly Finished}}``
  / ``{{Almost There}}`` for crafting alternatives) — the *content* is the data;
  the wrapper is presentation. Unwrap and process what's inside.
* **Data templates** (``{{Stat|STR|7}}``, ``{{Item|Name}}``) — the invocation *is*
  the data. Extract it.

Field extraction itself is not reimplemented here: ``parsers.extract_template``
already brace-counts correctly through nesting and ``[[wiki|links]]``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .parsers import extract_template

# Wiki housekeeping markers. Never game data — a bonus or effect row sourced
# from one of these is a parser bug (see db/validate.py assertion A5).
MAINTENANCE_TEMPLATES: frozenset[str] = frozenset({
    "bug",
    "orphan",
    "underlinked",
    "top",
    "history",
    "stub",
    "ref",
    "cleanup",
    "expand",
    "citation needed",
    "verify",
})

# Presentation-only wrappers: strip the wrapper, keep the content.
# ``InlineWht`` renders its content as white text on the wiki's dark table rows.
_FORMATTING_WRAPPERS: frozenset[str] = frozenset({
    "inlinewht",
    "nowrap",
})

# "One of these" wrappers used on named items whose final enchantment is chosen
# at the crafting altar. Each parameter is a complete alternative enchantment.
_CHOICE_WRAPPERS: frozenset[str] = frozenset({
    "nearly finished",
    "almost there",
})

# Link templates: the parameters name a page, optionally with display text.
# ``{{Item|Crystallized Eternity}}`` renders as the item's name.
_LINK_TEMPLATES: frozenset[str] = frozenset({
    "item",
    "helitem",
})

_POSITIONAL_RE = re.compile(r"^_positional_(\d+)$")


@dataclass(frozen=True)
class Template:
    """One ``{{Name|...}}`` invocation found in wikitext."""

    name: str
    fields: dict[str, str] = field(default_factory=dict)
    raw: str = ""

    def positional(self) -> list[str]:
        """Positional parameters in source order, named params excluded."""
        indexed: list[tuple[int, str]] = []
        for key, value in self.fields.items():
            m = _POSITIONAL_RE.match(key)
            if m:
                indexed.append((int(m.group(1)), value))
        return [value for _, value in sorted(indexed)]


def _closing_index(text: str, start: int) -> int | None:
    """Index just past the ``}}`` closing the template opened at *start*.

    Returns None when the template is never closed (malformed wikitext).
    """
    depth = 0
    pos = start
    while pos < len(text) - 1:
        pair = text[pos:pos + 2]
        if pair == "{{":
            depth += 1
            pos += 2
            continue
        if pair == "}}":
            depth -= 1
            pos += 2
            if depth == 0:
                return pos
            continue
        pos += 1
    return None


def iter_templates(wikitext: str) -> list[Template]:
    """Return the top-level templates in *wikitext*, outermost only.

    A template nested inside another is left in its parent's parameter value —
    callers that care recurse. Unclosed templates are skipped rather than
    yielding half-parsed fields.
    """
    results: list[Template] = []
    pos = 0
    while True:
        start = wikitext.find("{{", pos)
        if start == -1:
            return results
        end = _closing_index(wikitext, start)
        if end is None:
            return results
        raw = wikitext[start:end]
        name = _template_name(raw)
        if name:
            fields = extract_template(raw, name) or {}
            results.append(Template(name=name, fields=fields, raw=raw))
        pos = end


def _template_name(raw: str) -> str:
    """Extract the template name from a raw ``{{Name|...}}`` string."""
    inner = raw[2:-2] if raw.endswith("}}") else raw[2:]
    for stop in ("|", "\n"):
        idx = inner.find(stop)
        if idx != -1:
            inner = inner[:idx]
    return inner.strip()


def is_maintenance_template(name: str) -> bool:
    """True when *name* is a wiki housekeeping marker rather than game data."""
    return name.strip().lower() in MAINTENANCE_TEMPLATES


def _strip_maintenance(wikitext: str) -> str:
    """Remove every maintenance template (and its editorial note) from *wikitext*."""
    out = []
    pos = 0
    while True:
        start = wikitext.find("{{", pos)
        if start == -1:
            out.append(wikitext[pos:])
            return "".join(out)
        end = _closing_index(wikitext, start)
        if end is None:
            out.append(wikitext[pos:])
            return "".join(out)
        out.append(wikitext[pos:start])
        raw = wikitext[start:end]
        if not is_maintenance_template(_template_name(raw)):
            out.append(raw)
        pos = end


def expand_display_text(value: str) -> str:
    """Render *value* as the text a reader should see.

    Templates become their display text instead of vanishing: link templates
    yield the linked name, formatting wrappers yield their content, maintenance
    markers yield nothing, and an unrecognized template contributes its readable
    parameters rather than leaving a hole in the sentence.
    """
    if not value:
        return ""
    out: list[str] = []
    pos = 0
    while True:
        start = value.find("{{", pos)
        if start == -1:
            out.append(value[pos:])
            break
        end = _closing_index(value, start)
        if end is None:
            out.append(value[pos:])
            break
        out.append(value[pos:start])
        out.append(_expand_one(value[start:end]))
        pos = end
    return " ".join("".join(out).split()).strip()


def _expand_one(raw: str) -> str:
    """Display text for a single raw ``{{...}}`` invocation."""
    name = _template_name(raw)
    lower = name.lower()
    if is_maintenance_template(name):
        return ""
    fields = extract_template(raw, name) or {}
    params = Template(name=name, fields=fields, raw=raw).positional()
    if lower in _LINK_TEMPLATES:
        # {{Item|Page}} -> "Page"; {{Item|Page|Display}} -> "Display"
        return expand_display_text(params[-1]) if params else ""
    return " ".join(expand_display_text(p) for p in params if p.strip())


def split_enchantment_entry(entry: str) -> list[str]:
    """Split one wiki enchantment bullet into the enchantments it really holds.

    Most bullets hold exactly one enchantment and come back unchanged. The
    exceptions are the wrappers: a maintenance marker contributes nothing, a
    formatting wrapper contributes its content, and a choice wrapper
    (``{{Nearly Finished|{{Stat|STR|8}}|{{Stat|CON|8}}}}``) contributes one
    entry per alternative. Prose that surrounds a template stays attached to it
    — ``{{HELstats|...}} Artifact bonus to X`` only parses as a whole.
    """
    text = " ".join(_strip_maintenance(entry or "").split()).strip()
    if not text:
        return []

    templates = iter_templates(text)
    if len(templates) == 1 and templates[0].raw == text:
        tmpl = templates[0]
        lower = tmpl.name.lower()
        if lower in _CHOICE_WRAPPERS:
            results: list[str] = []
            for param in tmpl.positional():
                results.extend(split_enchantment_entry(param))
            return results
        if lower in _FORMATTING_WRAPPERS:
            return split_enchantment_entry(" ".join(tmpl.positional()))

    return [text]


def format_bonus_description(
    stat: str | None, value: int | None, bonus_type: str | None,
) -> str | None:
    """Build a readable description from a bonus's structured columns.

    Formatter templates (``{{Stat|Wisdom|14}}``) *are* their data — once the
    stat, value and bonus type are resolved, the template text adds nothing, so
    the description is generated rather than stored raw. Returns None when the
    structure is too incomplete to describe (the caller keeps whatever text it
    already had).
    """
    if not stat or value is None:
        return None
    word = "bonus" if value >= 0 else "penalty"
    magnitude = f"{value:+d}"
    if bonus_type:
        return f"{magnitude} {bonus_type} {word} to {stat}"
    return f"{magnitude} {word} to {stat}"
