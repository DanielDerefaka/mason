import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'

/** Short-lived signed URL the browser POSTs the file straight to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')
    return await ctx.storage.generateUploadUrl()
  },
})

const assertOwnedProject = async (
  ctx: { db: { get: (id: Id<'projects'>) => Promise<unknown> } },
  projectId: Id<'projects'>,
  userId: Id<'users'>,
) => {
  const project = (await ctx.db.get(projectId)) as { userId: Id<'users'> } | null
  if (!project || project.userId !== userId) throw new Error('Project not found')
  return project
}

export const addMoodboardImages = mutation({
  args: {
    projectId: v.id('projects'),
    storageIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')
    const project = await assertOwnedProject(ctx, args.projectId, userId)

    const current = (project as { moodBoardImages?: string[] }).moodBoardImages ?? []
    await ctx.db.patch(args.projectId, {
      moodBoardImages: [...current, ...args.storageIds],
      lastModified: Date.now(),
    })

    return { success: true, imageCount: current.length + args.storageIds.length }
  },
})

export const removeMoodboardImage = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')
    const project = await assertOwnedProject(ctx, args.projectId, userId)

    const currentImages = (project as { moodBoardImages?: string[] }).moodBoardImages ?? []
    const updatedImages = currentImages.filter((id) => id !== args.storageId)

    await ctx.db.patch(args.projectId, {
      moodBoardImages: updatedImages,
      lastModified: Date.now(),
    })

    // Drop the blob too, otherwise removed images keep costing storage.
    await ctx.storage.delete(args.storageId as Id<'_storage'>)

    return { success: true, imageCount: updatedImages.length }
  },
})

export const getMoodboardImages = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return []

    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== userId) return []

    const ids = project.moodBoardImages ?? []
    const images = await Promise.all(
      ids.map(async (id) => ({
        id,
        url: await ctx.storage.getUrl(id as Id<'_storage'>),
      })),
    )

    // A blob can go missing if it was deleted out from under the project.
    return images.filter((image): image is { id: string; url: string } => image.url !== null)
  },
})
