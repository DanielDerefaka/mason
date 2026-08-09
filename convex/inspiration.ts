import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'

/** How many references one project may hold. The model is sent all of them. */
export const MAX_INSPIRATION_IMAGES = 6

const ownedProject = async (
  ctx: { db: { get: (id: Id<'projects'>) => Promise<unknown> } },
  projectId: Id<'projects'>,
  userId: Id<'users'>,
) => {
  const project = (await ctx.db.get(projectId)) as {
    userId: Id<'users'>
    inspirationImages?: string[]
  } | null
  if (!project || project.userId !== userId) throw new Error('Project not found')
  return project
}

export const addInspirationImages = mutation({
  args: {
    projectId: v.id('projects'),
    storageIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')
    const project = await ownedProject(ctx, args.projectId, userId)

    const current = project.inspirationImages ?? []
    // Re-uploading the same blob should not double it up.
    const merged = [...current, ...args.storageIds.filter((id) => !current.includes(id))]

    if (merged.length > MAX_INSPIRATION_IMAGES) {
      throw new Error(`A project can hold at most ${MAX_INSPIRATION_IMAGES} inspiration images`)
    }

    await ctx.db.patch(args.projectId, {
      inspirationImages: merged,
      lastModified: Date.now(),
    })

    return { success: true, imageCount: merged.length }
  },
})

export const removeInspirationImage = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')
    const project = await ownedProject(ctx, args.projectId, userId)

    const remaining = (project.inspirationImages ?? []).filter((id) => id !== args.storageId)
    await ctx.db.patch(args.projectId, {
      inspirationImages: remaining,
      lastModified: Date.now(),
    })

    // Drop the blob too, or removed images keep costing storage.
    await ctx.storage.delete(args.storageId as Id<'_storage'>)

    return { success: true, imageCount: remaining.length }
  },
})

export const clearInspirationImages = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')
    const project = await ownedProject(ctx, args.projectId, userId)

    for (const storageId of project.inspirationImages ?? []) {
      // One missing blob should not strand the rest of the list.
      try {
        await ctx.storage.delete(storageId as Id<'_storage'>)
      } catch {
        // Already gone.
      }
    }

    await ctx.db.patch(args.projectId, { inspirationImages: [], lastModified: Date.now() })
    return { success: true }
  },
})

export const getInspirationImages = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return []

    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== userId) return []

    const images = await Promise.all(
      (project.inspirationImages ?? []).map(async (id) => ({
        id,
        url: await ctx.storage.getUrl(id as Id<'_storage'>),
      })),
    )

    return images.filter((image): image is { id: string; url: string } => image.url !== null)
  },
})
