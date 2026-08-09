'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GenerateStyleGuideButton } from '@/components/buttons/style-guide'
import { useStyles, type GuideImage } from '@/hooks/use-styles'

type Props = { guideImages: GuideImage[] }

/**
 * Deterministic pseudo-random from the image id, so a picture keeps its
 * rotation and offset across reloads instead of reshuffling on every render.
 */
const seedOf = (id: string) => id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
const lcg = (seed: number) => ((seed * 9301 + 49297) % 233280) / 233280

const IMAGE_WIDTH = 192 // w-48
const OVERLAP = 30
const SPACING = IMAGE_WIDTH - OVERLAP // 162px between image centres

export const MoodBoard = ({ guideImages }: Props) => {
  const { upload, remove, uploading, projectId } = useStyles()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const images = guideImages

  if (images.length === 0) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void upload(e.dataTransfer.files)
        }}
        className={`flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed transition-colors ${
          dragging ? 'border-white/40 bg-white/[0.03]' : 'border-white/15'
        }`}
      >
        <ImagePlus className="text-muted-foreground size-6" />
        <p className="text-sm">Drop images here</p>
        <p className="text-muted-foreground text-xs">
          They become the palette and type the AI designs from.
        </p>
        <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
          {uploading ? 'Uploading…' : 'Choose images'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && void upload(e.target.files)}
        />
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void upload(e.dataTransfer.files)
      }}
      className={`relative min-h-[360px] rounded-xl transition-colors ${
        dragging ? 'bg-white/[0.03] ring-1 ring-white/20' : ''
      }`}
    >
      {/* Fanned deck: only worth showing once there is room for it. */}
      <div className="absolute inset-0 hidden items-center justify-center lg:flex">
        <div className="relative mx-auto h-[300px] w-full max-w-[700px]">
          {images.map((image, index) => {
            const seed = seedOf(image.id)
            const random1 = lcg(seed)
            const random3 = lcg(seed + 2)

            const rotation = (random1 - 0.5) * 24
            const left = index * SPACING + (random3 - 0.5) * 12

            return (
              <div
                key={image.id}
                className="group absolute top-1/2 left-1/2"
                style={{
                  zIndex: index + 1,
                  marginLeft: `${left - 80}px`,
                  marginTop: '-96px',
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                <Image
                  src={image.url}
                  alt=""
                  width={IMAGE_WIDTH}
                  height={IMAGE_WIDTH}
                  unoptimized
                  className="size-48 rounded-lg object-cover shadow-2xl ring-1 ring-white/10"
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => void remove(image.id)}
                  className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-black/80 text-white opacity-0 ring-1 ring-white/20 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Narrow screens get a plain grid — a fanned deck does not fit. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
        {images.map((image) => (
          <div key={image.id} className="group relative">
            <Image
              src={image.url}
              alt=""
              width={IMAGE_WIDTH}
              height={IMAGE_WIDTH}
              unoptimized
              className="aspect-square w-full rounded-lg object-cover ring-1 ring-white/10"
            />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => void remove(image.id)}
              className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-black/80 text-white ring-1 ring-white/20"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="relative flex justify-center pt-[320px] lg:pt-[330px]">
        <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="size-4" />
          {uploading ? 'Uploading…' : 'Add images'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && void upload(e.target.files)}
        />
      </div>

      <div className="relative pt-4">
        <GenerateStyleGuideButton
          images={images}
          fileInputRef={inputRef}
          projectId={projectId}
        />
      </div>
    </div>
  )
}

export default MoodBoard
