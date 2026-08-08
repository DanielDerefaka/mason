'use client'

import { Hash, Image as ImageIcon, Type } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Colours } from '@/components/style-guide/colours'
import { Typography } from '@/components/style-guide/typography'
import { MoodBoard } from '@/components/style/mood-board'
import { useStyles } from '@/hooks/use-styles'

const TABS = [
  { value: 'colours', label: 'colours', Icon: Hash },
  { value: 'typography', label: 'typography', Icon: Type },
  { value: 'moodboard', label: 'moodboard', Icon: ImageIcon },
]

export default function StyleGuidePage() {
  const { guideImages } = useStyles()

  return (
    <main className="container mx-auto flex-1 px-6 py-16">
      <Tabs defaultValue="colours" className="gap-10">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight">Style Guide</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Manage your style guide for your project.
            </p>
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
          <MoodBoard guideImages={guideImages} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
