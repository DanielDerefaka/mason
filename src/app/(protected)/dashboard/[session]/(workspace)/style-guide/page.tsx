'use client'

import { Component, Download, Hash, Image as ImageIcon, Loader2, Ruler, Type } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { exportStyleGuidePng } from '@/lib/style-guide-poster'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Colours } from '@/components/style-guide/colours'
import { Typography } from '@/components/style-guide/typography'
import { Tokens } from '@/components/style-guide/tokens'
import { Components } from '@/components/style-guide/components'
import { MoodBoard } from '@/components/style/mood-board'
import { useStyles } from '@/hooks/use-styles'

const TABS = [
  { value: 'colours', label: 'colours', Icon: Hash },
  { value: 'typography', label: 'typography', Icon: Type },
  { value: 'tokens', label: 'scale', Icon: Ruler },
  { value: 'components', label: 'components', Icon: Component },
  { value: 'moodboard', label: 'moodboard', Icon: ImageIcon },
]

export default function StyleGuidePage() {
  const { guideImages, styleGuide } = useStyles()
  const [exporting, setExporting] = useState(false)

  /**
   * The guide leaves as one image, because the place it is least useful is the
   * page it lives on — a guide gets pasted into a brief or dropped in a
   * channel, and a link behind a login does neither.
   */
  const download = async () => {
    if (!styleGuide || exporting) return
    setExporting(true)
    try {
      const blob = await exportStyleGuidePng(styleGuide)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${styleGuide.theme.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-style-guide.png`
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
      toast.success('Style guide saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not export the style guide')
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="container mx-auto flex-1 px-6 py-16">
      <Tabs defaultValue="colours" className="gap-10">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight">Style Guide</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Manage your style guide for your project.
            </p>

            {styleGuide && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void download()}
                disabled={exporting}
                className="mt-4 gap-1.5 rounded-full text-xs"
              >
                {exporting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                Export as image
              </Button>
            )}
          </div>

          {/* The strip scrolls inside its own box. Five tabs measure 555px,
              so at 390px it was pushing the page sideways and taking colours
              and moodboard off-screen with it. */}
          <div className="max-w-full overflow-x-auto">
            <TabsList className="w-max rounded-full bg-white/[0.04] p-1">
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
        </div>

        <TabsContent value="colours">
          <Colours guide={styleGuide} />
        </TabsContent>
        <TabsContent value="typography">
          <Typography guide={styleGuide} />
        </TabsContent>
        <TabsContent value="tokens">
          <Tokens guide={styleGuide} />
        </TabsContent>
        <TabsContent value="components">
          <Components guide={styleGuide} />
        </TabsContent>
        <TabsContent value="moodboard">
          <MoodBoard guideImages={guideImages} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
