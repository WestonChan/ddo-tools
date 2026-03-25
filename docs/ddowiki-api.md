# DDO Wiki API Reference

The DDO Wiki (ddowiki.com) is a MediaWiki site. Use `WebFetch` with its API to look up game information.

## API Endpoints

**Search:**
```
https://ddowiki.com/api.php?action=query&list=search&srsearch=QUERY&srlimit=10&format=json
```

**Get page content (plain text):**
```
https://ddowiki.com/api.php?action=query&prop=extracts&explaintext=1&titles=PAGE_TITLE&format=json
```
Add `exintro=1` for just the intro section.

**Get page wikitext (fallback if extracts are empty):**
```
https://ddowiki.com/api.php?action=parse&page=PAGE_TITLE&prop=wikitext&format=json
```

**List category members:**
```
https://ddowiki.com/api.php?action=query&list=categorymembers&cmtitle=Category:CATEGORY_NAME&cmlimit=50&format=json
```

## Page Title Patterns

- Items: `Item:Item_Name` (e.g., `Item:Celestia`)
- Feats: direct name (e.g., `Cleave`, `Maximize_Spell`)
- Classes: direct name (e.g., `Paladin`, `Warlock`)
- Enhancement trees: `Tree_Name_enhancements` (e.g., `Kensei_enhancements`, `Elf_enhancements`)
- Quests: direct name (e.g., `The_Vault_of_Night`)

## Icons / Images

Wiki images are hosted at `https://images.ddowiki.com/`. The `icon` column in the DB stores the filename (e.g., `Icon Feat Cleave.png`). To construct the full URL:

```
https://images.ddowiki.com/Icon%20Feat%20Cleave.png
```

Naming conventions vary by entity type:
- **Feat icons:** `Icon Feat <Name>.png` or `Icon_Feat_<Name>.png`
- **Enhancement icons:** `<TreePrefix><AbilityName>.png` (e.g., `KenseiStrikeWithNoThought.png`)
- **Item icons:** `<Item Name> shown.jpg` or `<Item Name>.png` (inconsistent)
- **Spell icons:** varies widely

Not all filenames follow these patterns — always use the `icon` column value from the DB, not a constructed name.

## Usage

- URL-encode page titles (spaces → underscores or `%20`)
- If a page isn't found, fall back to search
- Prefer `extracts` API for readable content; use `parse` as fallback
- When looking up items, try the name directly first, then `Item:Name`
