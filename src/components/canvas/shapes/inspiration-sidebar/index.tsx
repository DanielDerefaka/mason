'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Plus, Trash2, Upload, X } from 'lucide-react'
import { MAX_INSPIRATION_IMAGES, useInspiration } from '@/hooks/use-inspiration'

/**
 * References the design generation looks at alongside the sketch.
 *
 * Rendered outside the canvas's transformed layer so it keeps its size and
 * position whatever the zoom is doing — it is a panel about the project, not a
 * shape on the board.
 */
export const InspirationSidebar = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const { images, upload, remove, clear, uploading } = useInspiration()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  if (!isOpen) return null

  const full = images.length >= MAX_INSPIRATION_IMAGES

  return (
    <aside className="pointer-events-auto absolute top-24 left-6 z-40 w-72 rounded-xl border border-white/10 bg-[#141416]/95 p-4 shadow-2xl backdrop-blur">
      <header className="flex items-center gap-2">
        <ImageIcon className="text-muted-foreground size-4" />
        <p className="flex-1 text-sm">Inspiration Board</p>
        <button
          type="button"
          aria-label="Close inspiration board"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </header>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!full) void upload(event.dataTransfer.files)
        }}
        className={`mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
          dragging ? 'border-white/40 bg-white/[0.04]' : 'border-white/15'
        }`}
      >
        <Upload className="text-muted-foreground size-5" />
        <p className="text-xs">
          Drop images here or{' '}
          <button
            type="button"
            disabled={full || uploading}
            onClick={() => inputRef.current?.click()}
            className="text-sky-400 underline-offset-2 hover:underline disabled:opacity-50"
          >
            browse
          </button>
        </p>
        <p className="text-muted-foreground text-[11px]">
          {uploading
            ? 'Uploading…'
            : `${images.length} of ${MAX_INSPIRATION_IMAGES} images uploaded`}
        </p>
      </div>

      {images.length > 0 && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-muted-foreground text-xs">Uploaded Images ({images.length})</p>
            <button
              type="button"
              onClick={() => void clear()}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] transition-colors"
            >
              <Trash2 className="size-3" />
              Clear All
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {images.map((image) => (
              <div key={image.id} className="group relative">
                <Image
                  src={image.url}
                  alt=""
                  width={80}
                  height={80}
                  unoptimized
                  className="aspect-square w-full rounded-md object-cover ring-1 ring-white/10"
                />
                <button
                  type="button"
                  aria-label="Remove reference"
                  onClick={() => void remove(image.id)}
                  className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-black/80 text-white opacity-0 ring-1 ring-white/20 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

            {!full && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-label="Add more references"
                className="text-muted-foreground hover:text-foreground grid aspect-square w-full place-items-center rounded-md border border-dashed border-white/15 transition-colors hover:border-white/30"
              >
                <Plus className="size-4" />
              </button>
            )}
          </div>
        </>
      )}

      {images.length === 0 && (
        <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed">
          References steer the look of a generated design. The sketch decides the layout.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => event.target.files && void upload(event.target.files)}
      />
    </aside>
  )
}

export default InspirationSidebar
