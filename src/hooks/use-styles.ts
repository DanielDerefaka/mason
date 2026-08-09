'use client'

import { useState, type RefObject } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useGenerateStyleGuideMutation } from '@/redux/api/style-guide'

/**
 * `uploading` is never set today: an image joins the project only once its blob
 * has finished uploading, so a listed image is always complete. The flag exists
 * because the generate button guards on it, and an optimistic upload would set
 * it.
 */
export type GuideImage = { id: string; url: string; uploading?: boolean }

export const useStyles = () => {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') as Id<'projects'> | null

  const guideImages = useQuery(
    api.moodboard.getMoodboardImages,
    projectId ? { projectId } : 'skip',
  )
  const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
  const addImages = useMutation(api.moodboard.addMoodboardImages)
  const removeImage = useMutation(api.moodboard.removeMoodboardImage)
  const [uploading, setUploading] = useState(false)

  const upload = async (files: FileList | File[]) => {
    if (!projectId) return
    const list = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (list.length === 0) return

    setUploading(true)
    try {
      // Convex hands out a signed URL per file; the blob never passes through
      // our own server.
      const storageIds = await Promise.all(
        list.map(async (file) => {
          const url = await generateUploadUrl()
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          })
          if (!res.ok) throw new Error(`Upload failed for ${file.name}`)
          const { storageId } = (await res.json()) as { storageId: string }
          return storageId
        }),
      )

      await addImages({ projectId, storageIds })
      toast.success(list.length === 1 ? 'Image added' : `${list.length} images added`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload those images.')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (storageId: string) => {
    if (!projectId) return
    try {
      await removeImage({ projectId, storageId })
      toast.success('Image removed')
    } catch {
      toast.error('Could not remove that image.')
    }
  }

  return {
    projectId,
    guideImages: (guideImages ?? []) as GuideImage[],
    loading: guideImages === undefined,
    uploading,
    upload,
    remove,
  }
}

const TOAST_ID = 'style-guide-generation'

/** Turns the mood board into a style guide, and owns the button's states. */
export const useStyleGuide = (
  projectId: string | null,
  images: GuideImage[],
  fileInputRef: RefObject<HTMLInputElement | null>,
) => {
  const router = useRouter()
  const [generateStyleGuide, { isLoading: isGenerating }] = useGenerateStyleGuideMutation()

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleGenerateStyleGuide = async () => {
    if (!projectId) {
      toast.error('Open a project first')
      return
    }
    if (images.length === 0) {
      toast.error('Please upload at least one image to generate a style guide')
      return
    }
    if (images.some((image) => image.uploading)) {
      toast.error('Please wait for all images to finish uploading')
      return
    }

    // One toast id for the whole run, so loading is replaced rather than stacked.
    toast.loading('Analyzing mood board images…', { id: TOAST_ID })

    try {
      const result = await generateStyleGuide({ projectId }).unwrap()
      if (!result.success) {
        toast.error(result.message ?? 'Failed to generate style guide', { id: TOAST_ID })
        return
      }

      router.refresh()
      toast.success('Style guide generated', { id: TOAST_ID })
      setTimeout(
        () => toast.success('Switch to the colours tab to see the results', { id: TOAST_ID }),
        1500,
      )
    } catch (error) {
      // A non-2xx rejects rather than resolving, and transformErrorResponse has
      // already reduced it to the route's JSON body.
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Failed to generate style guide'
      toast.error(message, { id: TOAST_ID })
    }
  }

  return { handleGenerateStyleGuide, handleUploadClick, isGenerating }
}
