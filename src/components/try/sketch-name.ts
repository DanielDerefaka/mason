import { isDevicePresetName } from '@/lib/frame-presets'

/** As much of a name as a menu row can hold before it says nothing more. */
const MAX_LENGTH = 48

/** The first line, folded, and cut where a menu row would cut it anyway. */
const tidy = (text: string) => {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > MAX_LENGTH ? `${line.slice(0, MAX_LENGTH - 1).trimEnd()}…` : line
}

type StoredShape = { kind?: unknown; label?: unknown; instruction?: unknown }

/**
 * What to call a sketch in the menu.
 *
 * Every /try project is created as "My sketch", and the menu listed them by
 * that name, so a visitor on their third day chose between "My sketch", "My
 * sketch" and "My sketch". Nothing on /try renames a project, and a rename
 * would be one more thing to ask of a visitor who came to draw. The sketch
 * already says what it is: the instruction typed on a frame, or failing that
 * the name given to one. A device or default name, "iPhone 16", "Frame 2",
 * is a size rather than a name and is passed over the way the prompt passes
 * over it. The stored name is the last resort, so a project with nothing on
 * it, and every production row made before this, reads as it always did.
 */
export const sketchName = (project: { name: string; sketchesData?: unknown }) => {
  const stored = project.sketchesData as { shapes?: unknown } | null | undefined
  const shapes = Array.isArray(stored?.shapes) ? (stored.shapes as StoredShape[]) : []
  const frames = shapes.filter((shape) => shape?.kind === 'frame')

  for (const frame of frames) {
    if (typeof frame.instruction === 'string' && frame.instruction.trim()) {
      return tidy(frame.instruction)
    }
  }
  for (const frame of frames) {
    if (typeof frame.label === 'string' && frame.label.trim() && !isDevicePresetName(frame.label)) {
      return tidy(frame.label)
    }
  }
  return project.name
}
