'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export type GuideImage = { id: string; url: string }

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
