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
