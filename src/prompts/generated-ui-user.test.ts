import { describe, expect, it } from 'vitest'

import { prompts } from './index'

/**
 * The turn that carries the sketch. The rules live in the system prompt; this
 * message says what the images are, hands over the manifest, and quotes the
 * drawer. Nothing here is tested against a model; what is pinned is that each
 * of the four inputs changes the message the way it should, and that a client
 * from before the manifest existed still gets a message that makes sense.
 */
const { user } = prompts.generatedUi

const MANIFEST = [
  'Frame 1440×1024, landscape. 2 elements, top to bottom, left to right. Positions and sizes are percentages of the frame.',
  '',
  '1. box, x0 y0 w100 h6 — full width along the top edge (a bar).',
  '2. text "Hello", x8 y18 w38, 48px bold.',
].join('\n')

describe('generatedUi.user', () => {
  it('hands over the manifest ahead of the drawer, and says the sketch is described in it', () => {
    const message = user('', 0, undefined, MANIFEST)

    expect(message).toContain('described element by element in the manifest below')
    expect(message).toContain(`## Manifest\n\n${MANIFEST}`)
    expect(message).toContain("Derive the layout from the manifest's geometry")
    // The manifest is the geometry; the note is the brief. Geometry first.
    expect(message.indexOf('## Manifest')).toBeLessThan(message.indexOf('The person who drew this'))
  })

  it('still reads as a sketch prompt when an old client sends no manifest', () => {
    const message = user('', 0)

    expect(message).not.toContain('Manifest')
    expect(message).not.toContain('manifest')
    expect(message).toContain("Derive the layout from the sketch's geometry")
    expect(message).toMatch(/^Turn the sketch — the first image — into a finished design\./)
  })

  it('treats an empty manifest as no manifest', () => {
    expect(user('', 0, undefined, '')).toBe(user('', 0))
  })

  it('tells the model the references are for their look, not their layout', () => {
    expect(user('', 1)).toContain(
      'The image after it is a reference: borrow its look, not its layout.',
    )
    expect(user('', 3)).toContain(
      'The 3 images after it are references: borrow their look, not their layout.',
    )
    expect(user('', 3)).not.toContain('no reference images')
  })

  it('says where the direction comes from when there are no references', () => {
    expect(user('', 0)).toContain(
      'There are no reference images: the direction comes from the sketch, its labels and the brand.',
    )
    expect(user('', 0, 'A pricing page for a plant shop')).toContain(
      'There are no reference images: the direction comes from the sketch, the note below and the brand.',
    )
  })

  it('quotes the drawer verbatim, attributed rather than merged into the instructions', () => {
    const message = user('', 0, 'Make the hero a photo of a greenhouse')
    expect(message).toContain('The person who drew this says: "Make the hero a photo of a greenhouse"')
    expect(message).not.toContain('left no note')
  })

  it('says when there is no note, so the labels are read as the brief', () => {
    const message = user('', 0)
    expect(message).toContain('The person who drew this left no note; the labels are the brief.')
    expect(message).not.toContain('says:')
  })

  it('names the screen only when someone named it', () => {
    expect(user('Pricing', 0)).toContain('into a finished design of a screen called "Pricing".')
    expect(user('', 0)).toContain('into a finished design.')
    expect(user('', 0)).not.toContain('screen called')
  })

  it('always asks for the fragment and nothing else', () => {
    for (const message of [user('', 0), user('Pricing', 2, 'note', MANIFEST)]) {
      expect(message).toContain('use the design system, and return only the HTML fragment.')
    }
  })
})
