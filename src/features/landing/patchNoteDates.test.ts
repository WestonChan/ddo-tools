import { describe, it, expect } from 'vitest'
import { formattedPatchDate, latestPatchNoteDate } from './patchNoteDates'

describe('formattedPatchDate', () => {
  it('formats an ISO date as MMM D, YYYY', () => {
    expect(formattedPatchDate('2026-04-26')).toBe('Apr 26, 2026')
  })

  it('does not shift the date by timezone (UTC-stable)', () => {
    expect(formattedPatchDate('2026-04-26')).toContain('26')
    expect(formattedPatchDate('2026-04-26')).not.toContain('25')
  })

  it('handles single-digit days without zero-padding', () => {
    expect(formattedPatchDate('2026-04-05')).toBe('Apr 5, 2026')
  })

  it('handles December (month=12)', () => {
    expect(formattedPatchDate('2025-12-10')).toBe('Dec 10, 2025')
  })
})

describe('latestPatchNoteDate', () => {
  it('returns the date of the only entry', () => {
    expect(latestPatchNoteDate([{ date: '2026-07-26', changes: [] }])).toBe('2026-07-26')
  })

  it('returns the newest date from newest-first entries', () => {
    expect(
      latestPatchNoteDate([
        { date: '2026-07-26', changes: [] },
        { date: '2026-07-25', changes: [] },
        { date: '2026-04-14', changes: [] },
      ]),
    ).toBe('2026-07-26')
  })

  it('returns the newest date even when entries are out of order', () => {
    expect(
      latestPatchNoteDate([
        { date: '2026-04-14', changes: [] },
        { date: '2026-07-26', changes: [] },
        { date: '2026-07-25', changes: [] },
      ]),
    ).toBe('2026-07-26')
  })

  it('compares across year boundaries', () => {
    expect(
      latestPatchNoteDate([
        { date: '2025-12-31', changes: [] },
        { date: '2026-01-01', changes: [] },
      ]),
    ).toBe('2026-01-01')
  })
})
