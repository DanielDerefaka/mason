import { describe, expect, it } from 'vitest'

import type { Shape } from '@/redux/slice/shapes'

import { latestFinishedDesign } from './latest-design'

const shape = (id: string, patch: Partial<Shape> = {}): Shape => ({
  id,
  kind: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  fill: '#000000',
  ...patch,
})

const design = (id: string, patch: Partial<Shape> = {}) =>
  shape(id, { kind: 'generated-ui', html: '<div>'.padEnd(60, 'x'), ...patch })

describe('the design a share links to', () => {
  it('is the newest one on the canvas', () => {
    const found = latestFinishedDesign([design('first'), shape('box'), design('second')])
    expect(found?.id).toBe('second')
  })

  it('is nothing at all on an empty canvas', () => {
    expect(latestFinishedDesign([])).toBeNull()
    expect(latestFinishedDesign([shape('box')])).toBeNull()
  })

  it('skips a design that is still arriving', () => {
    // Sharing mid-stream posts a link to half a page.
    const found = latestFinishedDesign([design('done'), design('live', { streaming: true })])
    expect(found?.id).toBe('done')
  })

  it('skips a design whose markup never came', () => {
    // The model returned 200 and an empty body — the failure the gateway
    // caused for weeks. There is nothing there to show anyone.
    const found = latestFinishedDesign([design('done'), design('stub', { html: '<p></p>' })])
    expect(found?.id).toBe('done')
  })

  it('skips one with no html field at all', () => {
    const found = latestFinishedDesign([design('done'), design('bare', { html: undefined })])
    expect(found?.id).toBe('done')
  })
})
