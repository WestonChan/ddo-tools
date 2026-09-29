# Naming

Both repos ban comments, so a name has to answer whatever question a reader would otherwise ask a comment. This guide covers identifiers in `ddo-tools` (TypeScript) and `ddo-data` (Rust). It is the long form of the Naming section in each repo's `AGENTS.md`. File-system naming traps for the frontend are in `.claude/rules/frontend.md`.

Existing code in both repos was written before this guide, mostly by agents, and is not a model to copy. When you touch a name that fails these rules, rename it.

Examples use TypeScript casing. In Rust, the same words go in `snake_case` for functions and bindings and `UpperCamelCase` for types. All examples are illustrations, not identifiers from either codebase.

## Choosing a name

Developers rarely agree on a name by instinct. In Feitelson's study of 334 developers, the median chance that two of them picked the same name for the same thing was 6.9%. Names built by the following steps were preferred two to one, so follow them instead of taking the first name that comes to mind.

1. **List the concepts the reader needs.** Decide which of these the name must carry: what the thing is, what it changes and why, which domain entity it concerns, and any qualifier (which subset, what unit, a count or a position).
2. **Pick one word per concept.** Use the word a DDO player uses for it, and the same word the schema, the API and the rest of the code already use (grep for it). If two words are competing, pick one and use it everywhere.
3. **Put the words in English order** (see [Word order](#word-order)).
4. **Test the name where it is used.** Read the calling line on its own. Would a reader who has never seen the code guess what it does, and guess only one thing? If not, go back to step 1.

When you rename existing code, improve it in stages, following Arlo Belshee's "naming as a process":

- **Honest:** replace a misleading or vague name with one that says what the code actually does, even if it comes out ugly.
- **Completely honest:** make the name cover *everything* the code does. If that name needs "and" or grows unwieldy, the code does too much; split it, and each part gets a short honest name.
- **Intent:** move from what the code does to why the caller wants it.
- **Domain:** replace programmer words with the game's own terms.

An honest ugly name is better than a tidy misleading one, so don't skip the first stage to reach the last.

## Word order

Compound names read as English phrases: qualifiers come before the noun, the way you would say it aloud. This fixed pattern (a "name mold", in Felienne Hermans' term) means a reader never has to decode which of several orders a name uses.

- `maximumMessageLength`, not `messageLengthMax` or `maxMsgLen`
- `totalStrength`, not `strengthTotal`
- `equippedItemCount`, not `countEquippedItems` or `numItems`
- `canTakeFeat`, not `featTakeable`
- Units go last, as a suffix: `cooldownMs`, `durationSeconds`, `sizeBytes`.

## Code that changes data

**Name code that changes data with an imperative verb phrase whose object is what gets changed.** This applies to setters, event handlers, writes, inserts and migrations.

- `equipItem`, `removeAugment`, `resetSkillPoints`, `insertQuests`
- If the what alone doesn't explain the change, name the reason: `dropExpiredCache`, `rejectOverLevelCap`, `clampToStatCap`.
- Avoid verbs that only say something happened: `update`, `process`, `handle`, `manage`, `run`, `doWork`, `perform`, `execute`.
- If the honest name needs "and" (`saveAndNotify`, `parseAndWrite`), split the function.

## Code that only reads, and values

**Name code that only reads, and every variable and parameter, with a noun phrase.** It says what the value is (often through the process that produced it) or what it is for.

- **By process:** a past participle names how the value was made: `sortedItems`, `filteredAugments`, `parsedQuest`, `mergedBonuses`, `totalStrength`.
- **By purpose:** `itemsToShow`, `slotsToFill`, `searchQuery`.
- **Avoid names that describe nothing:** `data`, `result`, `value`, `info`, `temp`, `obj`, `item2`, `newList`, `stuff`.
- **Reads never have side effects.** If a "get" changes something, it is a change, so name it that way.
- **Paired names show which is which.** `sortItems(items)` sorts in place and `sortedItems(items)` returns a sorted copy. `applyFilter` changes the data and `filtered` returns a new value.
- **Name values by role, not type:** `pickedAugment`, `upgradedItem` and `baseItem`, not `augmentObject`, `itemData` or `itemArray`.

Language-specific prefixes carry the kind of work:

| Kind | TypeScript | Rust |
|---|---|---|
| Network read | `fetchItems` | not used in `ddo-data` |
| Shape-to-shape mapping | `toItemRow` | `as_` (cheap borrow), `to_` (expensive or owned), `into_` (consumes self) |
| React hook returning X | `useEquippedItems` | n/a |
| Getter | the property name | the field name, no `get_` prefix |
| Constructor | `createX` or the class | `new`, `from_x`, `with_x` |
| Boolean | `isX`, `hasX`, `canX` | `is_x`, `has_x`, `can_x` |

## Types

**Classes, interfaces, structs, enums and React components are nouns.**

- **Prefer the real-world word a DDO player already uses:** `Race`, `CharacterClass`, `Feat`, `Enhancement`, `Item`, `Augment`, `Quest`, `Difficulty`, `EquipmentSlot`.
- **Where no real-world noun fits, name the role the thing plays,** not how it is built: `SearchIndex`, `RateLimiter`, `ConfirmDialog`, `DatasetVersion`.
- **Interfaces and traits that describe a capability** can be adjectives: `Equippable`, `Resolvable`.
- **Enum variants read as values of the type:** `Difficulty.Elite`, not `Difficulty.EliteDifficulty`.
- **Avoid suffixes that say nothing:** `Manager`, `Helper`, `Util`, `Handler`, `Processor`, `Service`, `Data`, `Info`, `Wrapper`, `Base`, `Impl`, `Object`.
- **Don't put the type in the name:** no `IItem`, `ItemInterface`, `strName` or `itemArray`. The type system already records it.

## Booleans, collections and quantities

- **Booleans are yes/no questions and stay positive:** `isEquipped`, `hasSetBonus`, `canTakeFeat`, not `equipFlag`, `notLoaded` or `disableHide`.
- **Collections are plurals:** `items`, `feats`.
- **Maps name both key and value:** `itemsById`, `levelByClass`.
- **A total is a `count`, a position is an `index`:** `augmentCount`, `slotIndex`. Avoid `num` and `no`.
- **Opposites come in matching pairs:** `add`/`remove`, `open`/`close`, `show`/`hide`, `first`/`last`, `minimum`/`maximum`, `begin`/`end`, `equip`/`unequip`.

## Precision

**A name should mean only one thing.** Words like `slot`, `candidate`, `entry`, `record`, `element`, `option`, `item`, `source`, `target`, `child`, `kind`, `context`, `state` and `config` fit dozens of things in a gear planner. Qualify them until only one reading is left.

- `useSlotCandidates` could mean augment slots or gear slots, and items, augments or filigrees. `useItemsEquippableInGearSlot` or `useAugmentsFittingSlotColor` can each mean only one thing.

**Include every word that removes ambiguity, and drop every word that repeats something.** Judge each word by what it tells the reader at the point of use.

- **Add a word:** `removeAugment(slotIndex)` reads as if it takes an augment. `removeAugmentAt(slotIndex)` says it takes a position.
- **Drop a word:** `item.itemName` repeats the owner, so write `item.name`. `augmentList: Augment[]` repeats the type, so write `augments`.

**Use game terms exactly as players use them.** Don't surprise an expert or confuse a beginner. An enhancement is not a feat, a filigree is not a gem, and Heroic, Epic and Legendary are distinct tiers.

## Length and scope

- **Short names are allowed only in short scopes.** A variable that lives 10 lines or fewer, and is not part of an exported API, can be `i`, `row` or `item`. Anything a reader meets far from where it was defined needs the full name.
- **Specific code gets a purpose name.** A function, hook or component that exists for one job is named for that job, not its mechanism: `useItemsEquippableInGearSlot`, not `useQueries2`.
- **Shared code gets a capability name.** Code in `src/components/`, `src/hooks/`, `src/lib/`, `ddo-model` and shared helpers serves many callers, so it is named for what it can do, not for its first caller: `Modal`, not `ItemDrawer`; `useLocalStorage`, not `useThemePref`. If a shared name only makes sense from one feature's point of view, either the name is wrong or the code belongs in that feature.

## Abbreviations and acronyms

- **Spell words out:** `augment`, not `aug`; `message`, not `msg`.
- **Never abbreviate by dropping letters:** `customerId`, not `cstmrId`.
- **Allowed abbreviations are the ones everyone reads as words:** `id`, `url`, `api`, `db`, `ui`, `xp`, `html`, `json`.
- **Write acronyms as ordinary words:** `loadHttpUrl`, `XpTier`, `parseXml`, not `loadHTTPURL` or `XPTier`.
- **A name should be pronounceable and easy to grep.** A name you can't say out loud is a name nobody can discuss.

## Consistency across the repos

- **One word per concept.** The SQLite column, the API field and the frontend type share one word. If the schema says `slot`, the frontend doesn't say `position`.
- **One verb per operation.** Don't mix `fetch`, `load`, `get` and `retrieve` for the same kind of work.
- **A breaking rename in the API needs a new API version.** Follow the versioning rules in `ddo-data/AGENTS.md` rather than letting the two repos drift apart.

## What lint enforces

The shape of a name can be checked mechanically, not its meaning, so lint covers only the shape and this guide covers the rest.

- `ddo-tools`: `@typescript-eslint/naming-convention` in `eslint.config.js` rejects type names ending in an empty suffix (`Manager`, `Helper`, `Util`, `Info`, `Data`, `Wrapper`, `Handler`, `Processor`, `Impl`) and interfaces prefixed `I`, and, in app code, requires boolean variables, parameters and properties to start with `is`, `has`, `can`, `should`, `was`, `will`, `does`, `did`, `are` or `includes`. Object-literal keys and the `Api*` wire types are exempt, because their names belong to libraries and the API.
- `ddo-data`: `clippy.toml` lists `disallowed-names`, and `[workspace.lints]` turns on `many_single_char_names` and `similar_names`.

## Sources

- Dror Feitelson et al., [How Developers Choose Names](https://arxiv.org/abs/2103.07487), IEEE Transactions on Software Engineering, 2020: the three-step model and the 6.9% agreement figure.
- Felienne Hermans, [talk on naming things](https://neverworkintheory.org/2022/05/19/hermans-naming.html), and *The Programmer's Brain*: name molds.
- Arlo Belshee, [Naming as a Process](https://www.digdeeproots.com/articles/on/naming-process/): the honest-to-domain renaming stages.
- [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/): clarity at the point of use, noun phrases for reads and verb phrases for changes, mutating and non-mutating pairs, naming by role, terms of art.
- [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html): nouns for classes and verbs for methods, no meaningless words.
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html): the 10-line short-name scope, abbreviations, acronyms as words, no type information in names.
- [Rust API Guidelines: Naming](https://rust-lang.github.io/api-guidelines/naming.html): getters, conversions, constructors.
- [Microsoft Framework Design Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/general-naming-conventions): readability over brevity, English word order.
- Steve McConnell, *Code Complete* (2nd ed.), chapter 11: opposites, `count` versus `index`.
