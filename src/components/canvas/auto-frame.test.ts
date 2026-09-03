import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import reducer, { addShape, type Shape, undo, wrapImageInFrame } from '@/redux/slice/shapes'

const image = (id: string, patch: Partial<Shape> = {}): Shape => ({
  id,
  kind: 'image',
  x: 100,
  y: 100,
  width: 400,
  height: 300,
  fill: 'transparent',
  src: 'https://example.test/photo.jpg',
  label: 'IMG_2041',
  ...patch,
})

const frame = (id: string, patch: Partial<Shape> = {}): Shape => ({
  id,
  kind: 'frame',
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  fill: 'transparent',
  label: 'Frame',
  ...patch,
})

const empty = () => reducer(undefined, { type: '@@init' })
const withShapes = (...shapes: Shape[]) =>
  shapes.reduce((state, next) => reducer(state, addShape(next)), empty())
const at = (state: ReturnType<typeof empty>, id: string) => state.entities.entities[id]
const order = (state: ReturnType<typeof empty>) => state.entities.ids as string[]

const wrap = (state: ReturnType<typeof empty>, id: string, margin = 24) =>
  reducer(state, wrapImageInFrame({ id, frameId: 'wrapped', margin }))

/**
 * A photo placed on bare canvas gets a frame of its own.
 *
 * The regression this exists for: a photograph of a paper sketch, the thing
 * the hint tells people to bring, landed as a picture with nothing to press.
 * Generate is a frame's button and the instruction bar wants a frame, so the
 * one route to a design ran through a step the canvas never mentioned.
 */
describe('wrapping a placed image in a frame', () => {
  it('draws the frame round the image, a margin out on every side', () => {
    const state = wrap(withShapes(image('photo')), 'photo')

    expect(at(state, 'wrapped')).toMatchObject({
      kind: 'frame',
      x: 76,
      y: 76,
      width: 448,
      height: 348,
      fill: 'transparent',
    })
  })

  it('names the frame the way a drawn one is named, not after the file', () => {
    // The route drops a device or default name from the prompt and keeps
    // anything else, so a filename here would be sent to the model as the
    // description of the screen.
    const state = wrap(withShapes(image('photo', { label: 'IMG_2041' })), 'photo')
    expect(at(state, 'wrapped')?.label).toBe('Frame')
  })

  it('paints the frame beneath the image, so the picture stays visible', () => {
    const state = wrap(withShapes(image('photo')), 'photo')
    expect(order(state)).toEqual(['wrapped', 'photo'])
  })

  it('selects the frame with the select tool, so the next move is on screen', () => {
    let state = withShapes(image('photo'))
    state = reducer(state, { type: 'shapes/setTool', payload: 'frame' })
    state = wrap(state, 'photo')

    expect(state.selectedIds).toEqual(['wrapped'])
    expect(state.tool).toBe('select')
  })

  it('leaves an image that already sits on a frame alone', () => {
    // A frame holds whatever touches it, so an image dropped on one is that
    // frame's already, and a second frame would be two claims on one picture.
    const before = withShapes(frame('page'), image('photo', { x: 700, y: 500 }))
    const after = wrap(before, 'photo')

    expect(at(after, 'wrapped')).toBeUndefined()
    expect(order(after)).toEqual(order(before))
    expect(after.selectedIds).toEqual(before.selectedIds)
  })

  it('wraps an image that a frame does not reach', () => {
    const state = wrap(withShapes(frame('page'), image('photo', { x: 900, y: 700 })), 'photo')
    expect(at(state, 'wrapped')).toBeDefined()
  })

  it('does nothing for a shape that is not an image, or is not there', () => {
    const rectangle: Shape = { ...image('box'), kind: 'rectangle', src: undefined }
    const before = withShapes(rectangle)

    expect(wrap(before, 'box')).toBe(before)
    expect(wrap(before, 'missing')).toBe(before)
  })

  it('is one step of history, so undo removes the frame and keeps the photo', () => {
    let state = wrap(withShapes(image('photo')), 'photo')
    state = reducer(state, undo())

    expect(at(state, 'wrapped')).toBeUndefined()
    expect(at(state, 'photo')).toBeDefined()
  })

  it('treats a negative margin as none', () => {
    const state = wrap(withShapes(image('photo')), 'photo', -10)
    expect(at(state, 'wrapped')).toMatchObject({ x: 100, y: 100, width: 400, height: 300 })
  })

  /**
   * The canvas wires every way an image arrives, picker, drop and paste,
   * through one `placeImages`, and that is where the wrap is dispatched. The
   * toolbar used to hold its own instance of the placing hook, so a picked
   * image and a dropped one took different paths.
   */
  it('is dispatched from the one path every placed image takes', () => {
    const canvas = readFileSync(
      join(process.cwd(), 'src/components/canvas/index.tsx'),
      'utf8',
    )
    const toolbar = readFileSync(
      join(process.cwd(), 'src/components/canvas/toolbar/index.tsx'),
      'utf8',
    )

    expect(canvas).toContain('dispatch(wrapImageInFrame(')
    expect(canvas).toContain('images={{ ...images, place: placeImages }}')
    expect(toolbar).not.toContain('useCanvasImage(')
  })
})
