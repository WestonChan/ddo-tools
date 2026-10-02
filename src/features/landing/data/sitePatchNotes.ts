export interface PatchNote {
  date: string
  changes: string[]
}

export const SITE_PATCH_NOTES: readonly PatchNote[] = [
  {
    date: '2026-10-02',
    changes: [
      'An item that both drops from a quest chest and is its end reward shows one row for that quest naming the chest and End reward',
      'Item detail lists the quest chains and sagas whose end reward offers the item, with the saga reward tier and a Rare chip',
      'Item detail lists crafting stations, challenge packs, vendors, events and iconic starter gear under a section renamed Obtained from, with a Rare chip and a wiki link where one exists',
      'Legacy items show a Legacy chip next to their name in item detail',
      'Item detail lists pack-wide drops such as any end chest in an adventure pack, and quest chain and saga wiki links open their own pages',
      'Item detail no longer shows a data-source row',
    ],
  },
  {
    date: '2026-10-01',
    changes: [
      'New look: warm-slate surfaces, one gold accent, Source Sans 3 for text and JetBrains Mono for every number; light and dark themes both follow it',
      'The rail is the only navigation: Roster, Build and Tools groups, with the Build plan sections listed underneath while you are on that page',
      'Switch the active build from the character card at the top of the rail, pick a build to compare against from the same menu, and swap the two',
      'Warnings and Report a bug moved from the bottom bar into the rail; the bottom bar is gone',
      'The stats panel has Stats and Buffs tabs: pin stats by dragging them into groups you can name, reorder and delete, with per-stat bonus breakdowns (placeholder values until the stats engine ships); it hides below 900px',
      'Settings gained an Appearance section: Dark, Light or System theme, and five accent presets (Gold, Arcane, Moss, Rust, Violet) with full color ramps',
      'The site name is set in IM Fell DW Pica SC, and the GitHub row in the rail shows the GitHub mark',
      'Build overview has working hotbars: drag spells, SLAs, feats and item clickies from the pools onto slots, rename or add bars, hover a slot for its stat block, and add items with active abilities from the picker (sample data until the build engine ships)',
      'The Characters view lists characters and planned lives as click-to-activate rows that show which build is active and which is being compared',
      'The Resources list is a ledger with a double-rule header; item detail shows the Add to compare, Compare in Gear and Add to farm list actions ahead of their phases',
      'The landing page leads with four entry tiles; the Characters tile shows your active build',
      'Build plan, Build overview, Gear, Damage calc, Farm checklist and Settings show their planned layout as wireframe sections',
      'Keyboard focus shows a gold outline on every control, including the character and life rows, which are now real buttons',
    ],
  },
  {
    date: '2026-09-30',
    changes: [
      'Name the chest an item drops from next to each quest, such as End chest or Optional chest',
      'Picking an augment in a crafting or Sun/Moon socket lists the first three quests it drops in, with the chest and a Rare chip',
    ],
  },
  {
    date: '2026-09-29',
    changes: [
      'The Stats filter menu sits flat on the page like the rest of the UI, without a drop shadow',
      'Show what each augment in a crafting or Sun/Moon socket costs to craft, one line per recipe with its tier, system and ingredients',
      'Item detail marks items read from DDO Wiki because DDOBuilderV2 does not have them yet, with a Source row linking the wiki page',
    ],
  },
  {
    date: '2026-09-27',
    changes: [
      "Game data now comes from Maetrim's DDOBuilderV2 data files through a public API instead of a database downloaded into the browser, so the site loads without a multi-megabyte fetch and updates weekly",
      'The site moved to Vercel at the root path; old links under /ddo-tools/ no longer resolve',
      'Item detail shows the enhancement bonus, set name, clickies, and drop location for items without a linked quest',
      'Bring back the "Rare only" filter and the Rare chip on item rows and on the quests an item drops from as rare loot',
    ],
  },
  {
    date: '2026-08-03',
    changes: [
      "Recover ~2,400 missing augment slots: crafting-slot families (Lamordia, Isle of Dread, Slaver's) were dropped entirely, and Purple/Sun/Moon slots were undercounted",
      "Crafting and Sun/Moon slots in item detail now expand to list the augments that fit them, with each augment's bonuses and minimum level",
      'Sun and Moon augment slots get their gem colors instead of rendering gray',
      'Old epic items now show their "Upgradeable Augment" (Primary/Secondary) upgrade instead of a raw template name',
      '37 more augments show their bonuses — a scraper guard had been skipping every already-stored augment',
    ],
  },
  {
    date: '2026-07-30',
    changes: [
      'Weapons, armor and shields now show their "+N Enhancement Bonus" — it was missing from every item on the site, and is a weapon\'s most basic stat',
      'Spellcasting implements now show their Implement bonus to Universal Spell Power, and orbs their Orb Bonus',
      'Masterwork items are now marked as such, instead of showing nothing',
      'Cursed items keep the minus on their enhancement penalty',
    ],
  },
  {
    date: '2026-07-29',
    changes: [
      'The "Rare only" filter in the item list now works — it had been silently matching nothing, and finds 139 rare-loot items',
      'Item detail now marks which drop locations are rare loot, using the same Rare chip as the item list',
      'Fix seven items whose names showed only a level suffix, such as "(level 12)" instead of "Crystallized Eternity (level 12)"',
      'Item names and icons no longer show raw HTML escapes like "Admiral&#39;s Gloves"',
      'Enchantment rows now show readable descriptions instead of raw wiki markup, and named enchantments explain what they actually do',
      'Enchantment type labels now show the bonus type (Insightful, Legendary) where they previously showed a stray number',
      'Spell saving-throw bonuses are no longer mislabelled as Spell Resistance — two different game mechanics that had been merged',
      'Bonuses with a penalty now read "-2" instead of "+-2"',
    ],
  },
  {
    date: '2026-07-28',
    changes: [
      'Fix the Settings accent swatch not showing as selected after a page reload, on a first visit, or when an older accent color was saved',
    ],
  },
  {
    date: '2026-07-27',
    changes: [
      'Add a landing-page footer with the site version, last-update date, and a GitHub link',
      'Publish the project under the MIT license, with credits and a fan-project disclaimer in the README',
    ],
  },
  {
    date: '2026-07-26',
    changes: [
      'Confirmation dialogs now close on Escape or a backdrop click, announce their title to screen readers, and hand focus back where you left off',
      'Press Enter to confirm a dialog — from the typed-confirmation field once the phrase matches, or directly when no typing is required',
      'Applying a planned build now asks you to type "Apply" instead of the full build description',
      'Render line breaks in confirmation messages instead of collapsing them into one paragraph',
      'Keep Tab inside open dialogs and the item detail drawer instead of letting it walk out into the page behind',
      'Close the phone fullscreen nav with Escape; the page behind it is disabled while it is open',
      'Unify overlay styling: consistent backdrop dim and a flat hairline drawer edge in place of the shadow',
    ],
  },
  {
    date: '2026-07-25',
    changes: [
      'New Resources browser: search and filter every item in the database, with a detail drawer for stats, enchantments, and drop sources',
      'Replaces Debug in the nav bar',
      'Filter items by slot, adventure pack, minimum level range, boosted stat, and rare/raid-only',
      'Open any wiki page in a reusable side-by-side compare window — DDO Wiki added bot protection that blocks embedding',
      "Fix the Raid filter missing most raids, including Master Artificer, Curse of Strahd, Titan, Ascension Chamber, and Reaver's Fate",
      'Raid loot is now recorded in the game database rather than matched against a hardcoded quest list',
      'Add Fire Over Morgrave, Relentless, Hunt or Be Hunted, and Green Steel altar items to the Raid filter; stop tagging Reign of Madness (a story arc) as a raid',
      'Fix negative item bonuses displaying as "+-2" instead of "-2"',
      'Picker rows are now keyboard-navigable, and the detail drawer takes focus when it opens',
      'Fix the "/" search shortcut and Escape-to-close not firing when arriving from the nav bar or a shared link',
      'Collapse the nav bar on load at any width below 900px, matching the resize behavior',
      'Detect a stale cached game database at load and refresh it automatically instead of crashing the Resources view',
    ],
  },
  {
    date: '2026-04-28',
    changes: [
      'Add Sentry error capture with session replay (when DSN configured)',
      'Per-view database loading: Settings, Characters, and Landing render instantly',
      'Real 404 page with go-home and report-broken-link actions',
      'Bottom-bar "Report a bug" button next to the warnings indicator',
      'Categorized DB-load errors with Retry and Clear-Cached-Data buttons',
    ],
  },
  {
    date: '2026-04-26',
    changes: [
      'Add landing page with active character card and patch notes',
      'Make the nav bar brand a home link with an ampersand mark',
      'Add an ampersand favicon',
    ],
  },
  {
    date: '2026-04-22',
    changes: [
      'Tighten router types and reduce migration boilerplate',
      'Fix click-propagation and timer-leak bugs in nav chrome',
      'Make past life pip fills transparent so they composite over hover bg',
    ],
  },
  {
    date: '2026-04-21',
    changes: [
      'Migrate routing from custom hook to TanStack Router',
      'Remove navigation from bottom bar build info',
    ],
  },
  {
    date: '2026-04-18',
    changes: [
      'Enable explicit function return types across src/ and e2e/',
      'Tokenize z-index and border-radius across CSS',
      'Consolidate hand-rolled hovers onto a single .hoverable class',
    ],
  },
  {
    date: '2026-04-15',
    changes: ['Consolidate theme tokens via color-mix and transparent overlays'],
  },
  {
    date: '2026-04-14',
    changes: [
      'Rename project from DDO Build Planner to DDO Tools',
      'Adopt Tailwind type scale and spacing scale as CSS tokens',
      'Align accent default with Gold and flatten background',
      'Flush panel surfaces with page background',
    ],
  },
]
