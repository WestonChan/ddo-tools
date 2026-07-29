export interface PatchNote {
  date: string
  changes: string[]
}

export const SITE_PATCH_NOTES: readonly PatchNote[] = [
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
      'Fix the Raid filter missing most raids, including Master Artificer, Curse of Strahd, Titan, Ascension Chamber, and Reaver\'s Fate',
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
