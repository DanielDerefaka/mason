import { describe, expect, it } from 'vitest'

import type { Shape } from '@/redux/slice/shapes'

import { REMIX_GAP, remixSketch } from './remix'

const frame: Shape = {
  id: 'frame-1',
  kind: 'frame',
  x: 1000,
  y: 500,
  width: 400,
  height: 300,
  fill: 'transparent',
  label: 'Landing',
}

const box: Shape = {
  id: 'box-1',
  kind: 'rectangle',
  x: 1040,
  y: 540,
  width: 100,
  height: 60,
  fill: '#fff',
}

const stroke: Shape = {
  id: 'stroke-1',
  kind: 'pencil',
  x: 1200,
  y: 600,
  width: 50,
  height: 20,
  fill: '#fff',
  points: [
    { x: 1200, y: 600 },
    { x: 1250, y: 620 },
  ],
}

const design: Shape = {
  id: 'design-1',
  kind: 'generated-ui',
  x: 1500,
  y: 500,
  width: 400,
  height: 300,
  fill: 'transparent',
  sourceFrameId: 'frame-1',
  html: '<section>hi</section>',
}

const payload = { frame, shapes: [box, stroke, design] }

const ids = (shapes: Shape[]) => shapes.map((shape) => shape.id)

describe('remixSketch', () => {
  it('gives every shape a fresh id, unique across two remixes of the same payload', () => {
    const first = remixSketch(payload, [])
    const second = remixSketch(payload, first)

    const all = [...ids(first), ...ids(second)]
    expect(new Set(all).size).toBe(all.length)
    for (const id of all) expect(ids([frame, box, stroke, design])).not.toContain(id)
  })

  it('shares no id with what is already on the canvas', () => {
    const existing: Shape[] = [{ ...box, id: 'kept' }, { ...frame, id: 'kept-frame' }]
    const copies = remixSketch(payload, existing)

    for (const copy of copies) expect(ids(existing)).not.toContain(copy.id)
  })

  it('points sourceFrameId at the copied frame rather than the original', () => {
    const [copiedFrame, , , copiedDesign] = remixSketch(payload, [])

    expect(copiedDesign.sourceFrameId).toBe(copiedFrame.id)
    expect(copiedDesign.sourceFrameId).not.toBe('frame-1')
  })

  it('drops a sourceFrameId that points outside the payload', () => {
    const stray: Shape = { ...design, id: 'stray', sourceFrameId: 'not-here' }
    const copies = remixSketch({ frame, shapes: [stray] }, [])

    expect(copies[1].sourceFrameId).toBeUndefined()
  })

  it('lands at the origin on an empty canvas', () => {
    const [copiedFrame] = remixSketch(payload, [])

    expect(copiedFrame.x).toBe(0)
    expect(copiedFrame.y).toBe(0)
  })

  it('sits a gap to the right of the rightmost existing shape, top-aligned with it', () => {
    const existing: Shape[] = [
      { ...box, id: 'a', x: 0, y: 0, width: 200 },
      { ...box, id: 'b', x: 300, y: 80, width: 500 },
    ]
    const [copiedFrame] = remixSketch(payload, existing)

    expect(copiedFrame.x).toBe(300 + 500 + REMIX_GAP)
    expect(copiedFrame.y).toBe(80)
  })

  it('moves the group as one, points included', () => {
    const [copiedFrame, copiedBox, copiedStroke] = remixSketch(payload, [])
    const dx = copiedFrame.x - frame.x
    const dy = copiedFrame.y - frame.y

    expect(copiedBox.x).toBe(box.x + dx)
    expect(copiedBox.y).toBe(box.y + dy)
    expect(copiedStroke.points).toEqual([
      { x: 1200 + dx, y: 600 + dy },
      { x: 1250 + dx, y: 620 + dy },
    ])
  })

  it('sets the instruction on the frame and leaves the rest alone', () => {
    const [copiedFrame, copiedBox] = remixSketch(payload, [], 'a pricing page')

    expect(copiedFrame.instruction).toBe('a pricing page')
    expect(copiedBox.instruction).toBeUndefined()
  })

  it('leaves the payload untouched so it can be remixed again', () => {
    const before = JSON.stringify(payload)
    remixSketch(payload, [], 'changed')

    expect(JSON.stringify(payload)).toBe(before)
  })
})
