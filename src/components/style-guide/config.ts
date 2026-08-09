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
}

/** The specimen line he uses for every weight. */
export const SPECIMEN = 'Whereas disregard and contempt for human rights have resulted'
