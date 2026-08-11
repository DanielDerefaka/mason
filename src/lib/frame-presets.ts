/**
 * Frame sizes offered when starting a new frame.
 *
 * Point sizes, not physical pixels — a 14" MacBook Pro is 3024x1964 of glass
 * but 1512x982 of layout, and layout is what a design is drawn against.
 */
export type FramePreset = {
  name: string
  width: number
  height: number
}

export type FramePresetGroup = {
  title: string
  presets: FramePreset[]
}

export const FRAME_PRESET_GROUPS: FramePresetGroup[] = [
  {
    title: 'Phone',
    presets: [
      { name: 'iPhone 16', width: 393, height: 852 },
      { name: 'iPhone 16 Pro Max', width: 440, height: 956 },
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'Android Compact', width: 412, height: 917 },
    ],
  },
  {
    title: 'Tablet',
    presets: [
      { name: 'iPad mini 8.3"', width: 744, height: 1133 },
      { name: 'iPad Pro 11"', width: 834, height: 1194 },
      { name: 'iPad Pro 12.9"', width: 1024, height: 1366 },
      { name: 'Surface Pro 8', width: 1440, height: 960 },
    ],
  },
  {
    title: 'Desktop',
    presets: [
      { name: 'MacBook Air', width: 1280, height: 832 },
      { name: 'MacBook Pro 14"', width: 1512, height: 982 },
      { name: 'MacBook Pro 16"', width: 1728, height: 1117 },
      { name: 'Desktop', width: 1440, height: 1024 },
      { name: 'Wireframe', width: 1440, height: 1024 },
    ],
  },
]

/** Opened by default, since most designs here start as a desktop page. */
export const DEFAULT_OPEN_GROUP = 'Desktop'

/**
 * Is this label just the size the frame was created at?
 *
 * It matters because the label is sent to the model, and a device name is not
 * a description of anything. A frame left at its default read as
 * `a sketch of "MacBook Air"`, and the model — correctly, given what it was
 * told — designed a MacBook Air product page, regardless of what the sketch
 * showed or what the reference looked like. Every design from a laptop-sized
 * frame came out about laptops.
 */
/**
 * Inch marks and stray spacing are noise here: a preset reads `MacBook Pro 14"`
 * and someone typing the same thing will not reach for the quote character.
 */
const normalise = (name: string) =>
  name
    .toLowerCase()
    .replace(/["'\u2018\u2019\u201c\u201d]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const PRESET_NAMES = new Set(
  FRAME_PRESET_GROUPS.flatMap((group) => group.presets).map((preset) =>
    normalise(preset.name),
  ),
)

export const isDevicePresetName = (label: string) => {
  const name = normalise(label)
  if (!name) return true
  if (PRESET_NAMES.has(name)) return true
  // Frames are numbered as they are added — "iPhone 16 2", "Frame 3".
  const withoutIndex = name.replace(/\s+\d+$/, '')
  return PRESET_NAMES.has(withoutIndex) || withoutIndex === 'frame'
}
