import type { Id } from '../../../convex/_generated/dataModel'

/**
 * Puts a blob in Convex storage and hands back its id, or null.
 *
 * Both callers on /try — the sketch thumbnail for Explore and the share
 * card's PNG — are decoration on top of something that already worked, so
 * nothing here throws: a failed upload is a missing picture, not a failed
 * publish or a failed share.
 */
export const uploadBlob = async (
  getUploadUrl: () => Promise<string>,
  blob: Blob,
): Promise<Id<'_storage'> | null> => {
  try {
    const url = await getUploadUrl()
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    })
    if (!response.ok) return null
    // Convex's own upload endpoint answers with the id it just created, so
    // the type is the honest one rather than a cast at every call site.
    const { storageId } = (await response.json()) as { storageId?: Id<'_storage'> }
    return storageId ?? null
  } catch {
    return null
  }
}
