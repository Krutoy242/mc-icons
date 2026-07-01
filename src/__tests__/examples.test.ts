import { describe, expect, it } from 'vitest'
import { extractExamples, IconizeRunner } from '../tool/examples.js'

// Conversion features are documented once, as `@example` rows at their
// implementation site (see src/tool/examples.ts). Here we execute every one of
// those rows through the real matching pipeline and assert the icon paths — the
// same rows feed the README table, so docs and tests can never drift.

const runner = new IconizeRunner()
const examples = extractExamples()

describe('conversion examples (README ↔ tests single source)', () => {
  it('extracts at least one example row', () => {
    expect(examples.length).toBeGreaterThan(0)
  })

  for (const ex of examples) {
    for (const seg of ex.segments) {
      it(`${ex.description}: ${seg.capture}`, async () => {
        const got = await runner.paths(seg.capture)
        expect(got).toEqual(seg.expected)
      })
    }
  }
})
