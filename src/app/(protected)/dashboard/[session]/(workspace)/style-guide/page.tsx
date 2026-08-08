'use client'

import { Grid2x2, Image as ImageIcon, Type } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { STYLE_GUIDE } from '@/components/style-guide/config'
import { Colours } from '@/components/style-guide/colours'
import { Typography } from '@/components/style-guide/typography'
import { Moodboard } from '@/components/style-guide/moodboard'

const TABS = [
  { value: 'colours', label: 'Colours', Icon: Grid2x2 },
  { value: 'typography', label: 'Typography', Icon: Type },
  { value: 'moodboard', label: 'Moodboard', Icon: ImageIcon },
]

export default function StyleGuidePage() {
  return (
    <main className="container mx-auto flex-1 px-6 py-14">
      <Tabs defaultValue="colours" className="gap-10">
        {/* Heading and tabs share a row, as in the design. */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Style Guide</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">{STYLE_GUIDE.description}</p>
          </div>

          <TabsList className="rounded-full bg-white/[0.04] p-1">
            {TABS.map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-1.5 rounded-full px-4 text-xs data-[state=active]:bg-white/10"
              >
                <Icon className="size-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="colours">
          <Colours />
        </TabsContent>
        <TabsContent value="typography">
          <Typography />
        </TabsContent>
        <TabsContent value="moodboard">
          <Moodboard />
        </TabsContent>
      </Tabs>
    </main>
  )
}
