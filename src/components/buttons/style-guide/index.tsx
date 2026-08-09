'use client'

import type { RefObject } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStyleGuide, type GuideImage } from '@/hooks/use-styles'

type Props = {
  images: GuideImage[]
  fileInputRef: RefObject<HTMLInputElement | null>
  projectId: string | null
}

export const GenerateStyleGuideButton = ({ images, fileInputRef, projectId }: Props) => {
  const { handleGenerateStyleGuide, isGenerating } = useStyleGuide(
    projectId,
    images,
    fileInputRef,
  )

  if (images.length === 0) return null

  return (
    <div className="flex justify-end">
      <Button
        className="rounded-full"
        onClick={() => void handleGenerateStyleGuide()}
        disabled={isGenerating || images.some((image) => image.uploading)}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Analyzing Images…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 size-4" />
            Generate with AI
          </>
        )}
      </Button>
    </div>
  )
}

export default GenerateStyleGuideButton
