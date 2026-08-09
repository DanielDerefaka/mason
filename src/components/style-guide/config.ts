import type { StaticStyleGuide } from '@/types/style-guide'

export const STYLE_GUIDE: StaticStyleGuide = {
  theme: 'Monochrome',
  description: 'Lorem ipsum dolor sit amet consectetur.',
  colorSections: [
    {
      title: 'Primary Colours',
      swatches: [
        { name: 'Background', token: '--background' },
        { name: 'Foreground', token: '--foreground' },
        { name: 'Primary', token: '--primary' },
        { name: 'Primary Foreground', token: '--primary-foreground' },
      ],
    },
    {
      title: 'Secondary & Accent Colors',
      swatches: [
        { name: 'Secondary', token: '--secondary' },
        { name: 'Secondary Foreground', token: '--secondary-foreground' },
        { name: 'Accent', token: '--accent' },
        { name: 'Accent Foreground', token: '--accent-foreground' },
      ],
    },
    {
      title: 'UI Component Colors',
      swatches: [
        { name: 'Card', token: '--card' },
        { name: 'Card Foreground', token: '--card-foreground' },
        { name: 'Popover', token: '--popover' },
        { name: 'Popover Foreground', token: '--popover-foreground' },
        { name: 'Muted', token: '--muted' },
        { name: 'Muted Foreground', token: '--muted-foreground' },
      ],
    },
    {
      title: 'Utility & Form Colors',
      swatches: [
        { name: 'Border', token: '--border' },
        { name: 'Input', token: '--input' },
        { name: 'Ring', token: '--ring' },
      ],
    },
    {
      title: 'Status & Feedback Colors',
      swatches: [
        { name: 'Destructive', token: '--destructive' },
        { name: 'Destructive Foreground', token: '--primary-foreground' },
      ],
    },
  ],
  typography: {
    fontFamily: 'Manrope',
    styles: [
      { name: 'Extra Light', weight: 200 },
      { name: 'Light', weight: 300 },
      { name: 'Regular', weight: 400 },
      { name: 'Medium', weight: 500 },
      { name: 'Semi Bold', weight: 600 },
      { name: 'Bold', weight: 700 },
      { name: 'Extra Bold', weight: 800 },
    ],
  },
  /**
   * The built-in system's own scale, so the new sections have something real
   * to show before a guide is generated.
   */
  typeScale: [
    { name: 'Display', fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -0.03, usage: 'Landing headlines, one per page.' },
    { name: 'Headline H1', fontSize: 56, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.025, usage: 'Page titles.' },
    { name: 'Headline H2', fontSize: 40, fontWeight: 600, lineHeight: 1.15, letterSpacing: -0.02, usage: 'Section headings.' },
    { name: 'Headline H3', fontSize: 28, fontWeight: 600, lineHeight: 1.25, letterSpacing: -0.015, usage: 'Card and panel titles.' },
    { name: 'Subtitle', fontSize: 20, fontWeight: 500, lineHeight: 1.4, letterSpacing: -0.01, usage: 'Standfirsts and lead-ins.' },
    { name: 'Body Large', fontSize: 18, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0, usage: 'Long-form reading.' },
    { name: 'Body', fontSize: 16, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0, usage: 'Default interface text.' },
    { name: 'Small', fontSize: 14, fontWeight: 400, lineHeight: 1.5, letterSpacing: 0, usage: 'Secondary and helper text.' },
    { name: 'Caption', fontSize: 12, fontWeight: 500, lineHeight: 1.4, letterSpacing: 0.02, usage: 'Labels, metadata, table headers.' },
    { name: 'Button', fontSize: 14, fontWeight: 600, lineHeight: 1, letterSpacing: 0.01, usage: 'Every control label.' },
  ],
  spacing: [4, 8, 12, 16, 24, 32, 48, 64],
  radii: [
    { name: 'Small', value: 6 },
    { name: 'Medium', value: 10 },
    { name: 'Large', value: 16 },
    { name: 'Pill', value: 9999 },
  ],
  elevation: [
    { name: 'Resting', shadow: '0 1px 2px rgba(0,0,0,0.35)', usage: 'Cards sitting on the page.' },
    { name: 'Raised', shadow: '0 8px 24px rgba(0,0,0,0.45)', usage: 'Menus, popovers, hovered cards.' },
    { name: 'Floating', shadow: '0 24px 60px rgba(0,0,0,0.6)', usage: 'Dialogs and sheets.' },
  ],
}

/** The specimen line he uses for every weight. */
export const SPECIMEN = 'Whereas disregard and contempt for human rights have resulted'
