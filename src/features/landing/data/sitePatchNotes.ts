export interface PatchNote {
  date: string
  changes: string[]
}

export const SITE_PATCH_NOTES: readonly PatchNote[] = [
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
