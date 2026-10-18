import { expect, it } from 'vitest'
import { apiFixture } from './apiFixture'

it.each(['Bad Slug', '', 123])('rejects invalid nested captured identity %j', (slug) => {
  expect(() => apiFixture({ rows: [{ effect_slug: slug }] })).toThrow('Invalid captured slug')
})

it('accepts every identity in the captured API responses without changing their contents', () => {
  const captures = import.meta.glob(
    [
      '../features/resources/queries/fixtures/*.json',
      '../lib/api/fixtures/*.json',
      './fixtures/*.json',
    ],
    { eager: true, import: 'default' },
  )
  expect(Object.keys(captures).length).toBeGreaterThan(0)
  for (const capture of Object.values(captures)) expect(apiFixture(capture)).toBe(capture)
})
