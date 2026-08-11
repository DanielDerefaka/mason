'use client'

import { nanoid } from '@reduxjs/toolkit'
import { useMutation } from 'convex/react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAppDispatch } from '@/redux/hooks'
import { addShape } from '@/redux/slice/shapes'
import { api } from '../../convex/_generated/api'

/** Big enough that a photo is not a postage stamp, small enough to see whole. */
const MAX_PLACED_EDGE = 720

/** Convex refuses beyond this, and a 30MB drop is nearly always a mistake. */
const MAX_BYTES = 20 * 1024 * 1024

/**
 * Putting a picture on the canvas.
 *
 * Not a drawing tool: there is nothing to drag out, so the button opens a file
 * picker and the image lands in the middle of what is currently on screen at
 * its own aspect ratio. Sizing it from the file rather than dropping it into a
 * fixed box is what stops a portrait photo arriving stretched.
 *
 * The bytes go to the same storage the mood board uses, and the shape stores
 * the resolved URL, so a placed image survives a reload like any other shape.
 */
export const useCanvasImage = (centre: () => { x: number; y: number }) => {
  const dispatch = useAppDispatch()
  const input = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
  const resolveStorageUrl = useMutation(api.moodboard.resolveStorageUrl)

  /** Natural size, so the placed shape matches the picture's real proportions. */
  const measure = (file: File) =>
    new Promise<{ width: number; height: number }>((resolve) => {
      const url = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(url)
        const longest = Math.max(image.naturalWidth, image.naturalHeight) || MAX_PLACED_EDGE
        const scale = Math.min(1, MAX_PLACED_EDGE / longest)
        resolve({
          width: Math.round(image.naturalWidth * scale) || MAX_PLACED_EDGE,
          height: Math.round(image.naturalHeight * scale) || MAX_PLACED_EDGE,
        })
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({ width: MAX_PLACED_EDGE, height: MAX_PLACED_EDGE })
      }
      image.src = url
    })

  const place = async (files: FileList | null) => {
    const chosen = Array.from(files ?? []).filter((file) => file.type.startsWith('image/'))
    if (chosen.length === 0) return

    const tooBig = chosen.find((file) => file.size > MAX_BYTES)
    if (tooBig) {
      toast.error(`${tooBig.name} is larger than 20MB`)
      return
    }

    setUploading(true)
    try {
      const origin = centre()
      let offset = 0

      for (const file of chosen) {
        const { width, height } = await measure(file)

        const uploadUrl = await generateUploadUrl()
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!response.ok) throw new Error(`Could not upload ${file.name}`)

        const { storageId } = (await response.json()) as { storageId: string }
        const src = await resolveStorageUrl({ storageId })
        if (!src) throw new Error(`Could not read ${file.name} back`)

        dispatch(
          addShape({
            id: nanoid(),
            kind: 'image',
            // Several files cascade rather than stacking exactly on top of
            // each other, so the second one is visible without moving the first.
            x: Math.round(origin.x - width / 2 + offset),
            y: Math.round(origin.y - height / 2 + offset),
            width,
            height,
            fill: 'transparent',
            src,
            label: file.name.replace(/\.[^.]+$/, ''),
          }),
        )
        offset += 24
      }

      toast.success(chosen.length === 1 ? 'Image added' : `${chosen.length} images added`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add that image')
    } finally {
      setUploading(false)
      if (input.current) input.current.value = ''
    }
  }

  return { input, uploading, pick: () => input.current?.click(), place }
}
