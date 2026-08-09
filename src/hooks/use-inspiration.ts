'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export type InspirationImage = { id: string; url: string }

/** Mirrors MAX_INSPIRATION_IMAGES in convex/inspiration.ts. */
export const MAX_INSPIRATION_IMAGES = 6

export const useInspiration = () => {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') as Id<'projects'> | null

  const images = useQuery(
    api.inspiration.getInspirationImages,
    projectId ? { projectId } : 'skip',
  )
  const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
  const addImages = useMutation(api.inspiration.addInspirationImages)
  const removeImage = useMutation(api.inspiration.removeInspirationImage)
  const clearImages = useMutation(api.inspiration.clearInspirationImages)
  const [uploading, setUploading] = useState(false)

  const current = images ?? []

  const upload = async (files: FileList | File[]) => {
    if (!projectId) return
    const picked = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (picked.length === 0) return

    const room = MAX_INSPIRATION_IMAGES - current.length
    if (room <= 0) {
      toast.error(`That is the limit of ${MAX_INSPIRATION_IMAGES} inspiration images`)
      return
    }
    // Trim client-side so the user sees which ones were dropped, rather than
    // the mutation rejecting the whole batch.
    const accepted = picked.slice(0, room)
    if (accepted.length < picked.length) {
      toast.warning(`Only ${room} more would fit, so the rest were skipped`)
    }

    setUploading(true)
    try {
      const storageIds = await Promise.all(
        accepted.map(async (file) => {
          const url = await generateUploadUrl()
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          })
          if (!response.ok) throw new Error(`Upload failed for ${file.name}`)
          const { storageId } = (await response.json()) as { storageId: string }
          return storageId
        }),
      )

      await addImages({ projectId, storageIds })
      toast.success(accepted.length === 1 ? 'Reference added' : `${accepted.length} references added`)
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
    } catch {
      toast.error('Could not remove that image.')
    }
  }

  const clear = async () => {
    if (!projectId) return
    try {
      await clearImages({ projectId })
      toast.success('Inspiration board cleared')
    } catch {
      toast.error('Could not clear the board.')
    }
  }

  return {
    projectId,
    images: current,
    loading: images === undefined,
    uploading,
    upload,
    remove,
    clear,
  }
}
