import { mutation, query, type MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'
import {
  decideCanvasCheckpoint,
  toPruneVersions,
  type CheckpointDecision,
} from '../src/lib/canvas-history'

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

const prune = async (ctx: MutationCtx, projectId: Id<'projects'>) => {
  const all = await ctx.db
    .query('versions')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  for (const stale of toPruneVersions(all)) await ctx.db.delete(stale._id)
}

/**
 * A copy of the canvas taken on the way through a save, when the rules in
 * `src/lib/canvas-history.ts` say one is due. `updateProjectSketches` calls
 * this with the row it is about to overwrite, so the copy is of the canvas
 * being left. Returns why nothing was written, for whoever wants to know.
 */
export const checkpointCanvas = async (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  userId: Id<'users'>,
  previous: unknown,
  next: unknown,
): Promise<CheckpointDecision> => {
  // The index orders by creation, so the newest row is one read away and
  // the other twenty-nine, each a whole canvas, stay where they are.
  const latest = await ctx.db
    .query('versions')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .order('desc')
    .first()
  const decision = decideCanvasCheckpoint(
    latest ? { createdAt: latest.createdAt, data: latest.data } : null,
    previous,
    next,
    Date.now(),
  )
  if (decision !== 'save') return decision

  await ctx.db.insert('versions', {
    projectId,
    userId,
    label: 'Autosave',
    createdAt: Date.now(),
    origin: 'auto',
    data: previous,
  })
  await prune(ctx, projectId)
  return decision
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
      origin: 'manual',
      data: project.sketchesData ?? {},
    })
    await prune(ctx, projectId)

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
      .map(({ _id, label, createdAt, origin }) => ({
        _id,
        label,
        createdAt,
        origin: origin ?? 'manual',
      }))
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
      origin: 'restore',
      data: project.sketchesData ?? {},
    })

    await ctx.db.patch(version.projectId, {
      sketchesData: version.data,
      lastModified: Date.now(),
    })

    // Handed back so the canvas can put it on screen from the store it
    // already has, instead of reloading the page to read it again.
    return { success: true, data: version.data }
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
