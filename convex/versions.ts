import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'

/** How many snapshots a project keeps before the oldest is dropped. */
const LIMIT = 30

const ownedProject = async (
  ctx: { db: { get: (id: Id<'projects'>) => Promise<unknown> } },
  projectId: Id<'projects'>,
  userId: Id<'users'>,
) => {
  const project = (await ctx.db.get(projectId)) as
    | { userId: Id<'users'>; sketchesData?: unknown }
    | null
  if (!project || project.userId !== userId) throw new Error('Project not found')
  return project
}

export const saveVersion = mutation({
  args: { projectId: v.id('projects'), label: v.string() },
  handler: async (ctx, { projectId, label }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')
    const project = await ownedProject(ctx, projectId, userId)

    await ctx.db.insert('versions', {
      projectId,
      userId,
      label: label.trim().slice(0, 60) || 'Untitled version',
      createdAt: Date.now(),
      data: project.sketchesData ?? {},
    })

    // Oldest first, so anything past the limit is at the front.
    const all = await ctx.db
      .query('versions')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()
    const sorted = all.sort((a, b) => a.createdAt - b.createdAt)
    for (const stale of sorted.slice(0, Math.max(0, sorted.length - LIMIT))) {
      await ctx.db.delete(stale._id)
    }

    return { success: true }
  },
})

export const listVersions = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return []
    const project = (await ctx.db.get(projectId)) as { userId: Id<'users'> } | null
    if (!project || project.userId !== userId) return []

    const all = await ctx.db
      .query('versions')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()

    // Newest first, and without the payload — a list of thirty canvases is a
    // lot of data to push to a dropdown nobody has opened yet.
    return all
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(({ _id, label, createdAt }) => ({ _id, label, createdAt }))
  },
})

export const restoreVersion = mutation({
  args: { versionId: v.id('versions') },
  handler: async (ctx, { versionId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    const version = await ctx.db.get(versionId)
    if (!version || version.userId !== userId) throw new Error('Version not found')

    const project = await ownedProject(ctx, version.projectId, userId)

    // Snapshot what is about to be replaced, so restoring is itself undoable.
    await ctx.db.insert('versions', {
      projectId: version.projectId,
      userId,
      label: `Before restoring "${version.label}"`,
      createdAt: Date.now(),
      data: project.sketchesData ?? {},
    })

    await ctx.db.patch(version.projectId, {
      sketchesData: version.data,
      lastModified: Date.now(),
    })

    return { success: true }
  },
})

export const deleteVersion = mutation({
  args: { versionId: v.id('versions') },
  handler: async (ctx, { versionId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')
    const version = await ctx.db.get(versionId)
    if (!version || version.userId !== userId) throw new Error('Version not found')
    await ctx.db.delete(versionId)
    return { success: true }
  },
})
