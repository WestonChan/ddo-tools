import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ApiNote, JsonValue } from '../../../../lib/api'
import plagueWolfResponse from '../../queries/fixtures/feat-wild-shape-plague-wolf.json'
import smallbladeResponse from '../../queries/fixtures/item-cutthroats-smallblade-level-8.json'
import { toNotes, type NoteKind } from '../../queries/notes'
import { NoteMarker } from './NoteMarker'

afterEach(cleanup)

it('formats every JSON value without losing falsy values or choosing the other kind’s field', () => {
  const cases: Array<[JsonValue, string]> = [
    [-2, '-2'],
    [0, '0'],
    [false, 'false'],
    [true, 'true'],
    [null, 'null'],
    ['', ''],
    ['Competence', 'Competence'],
    [[], '[]'],
    [{}, '{}'],
    [[0, false, 'value'], '[0,false,"value"]'],
    [{ bonuses: [1, null], enabled: false }, '{"bonuses":[1,null],"enabled":false}'],
  ]
  const kinds = {
    game_bug: { captured: plagueWolfResponse.notes[0], prefix: 'Intended', label: '! Bug' },
    unverified: { captured: smallbladeResponse.notes[0], prefix: 'Assumed', label: '? Unverified' },
  } satisfies Record<NoteKind, unknown>
  for (const [kind, { captured, prefix, label }] of Object.entries(kinds)) {
    for (const [value, expected] of cases) {
      const [note] = toNotes(
        {
          notes: [
            {
              ...captured,
              intended: kind === 'game_bug' ? value : null,
              assumed: kind === 'unverified' ? value : null,
            } as ApiNote,
          ],
        },
        '/v1/items/example',
      )
      const { unmount } = render(<NoteMarker note={note} />)
      const marker = screen.getByText(label)
      expect(marker.closest('[data-tip]')).toHaveAttribute(
        'data-tip',
        `${captured.text}\n${prefix}: ${expected}`,
      )
      expect(marker).toHaveAttribute('tabindex', '0')
      unmount()
    }
  }
})
