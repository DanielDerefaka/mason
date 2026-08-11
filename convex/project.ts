import { mutation, query, type MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'

export const getProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return { projects: [], total: 0 }

    const all = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()

    // Archived projects are not gone, but they are not here either.
    const projects = all.filter((project) => !project.archivedAt)

    return { projects, total: projects.length, archivedCount: all.length - projects.length }
  },
})

export const createProject = mutation({
  args: {
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    // A per-user counter rather than a count of rows, so deleting a project
    // never causes a later one to reuse its number.
    const counter = await ctx.db
      .query('project_counters')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const projectNumber = (counter?.count ?? 0) + 1
    if (counter) await ctx.db.patch(counter._id, { count: projectNumber })
    else await ctx.db.insert('project_counters', { userId, count: projectNumber })

    const now = Date.now()
    const projectId = await ctx.db.insert('projects', {
      userId,
      name: args.name ?? `Project ${projectNumber}`,
      projectNumber,
      createdAt: now,
      lastModified: now,
      isPublic: false,
      description: args.description,
      sketchesData: { frameCounter: 0, shapes: [] },
    })

    return projectId
  },
})

/** Ownership is checked here rather than trusted from the client. */
const ownedProject = async (ctx: MutationCtx, projectId: Id<'projects'>) => {
  const userId = await getAuthUserId(ctx)
  if (userId === null) throw new Error('Not authenticated')
  const project = await ctx.db.get(projectId)
  if (!project || project.userId !== userId) throw new Error('Project not found')
  return project
}

/**
 * Deleting puts a project in the archive rather than destroying it.
 *
 * A project holds designs somebody spent credits generating, so the
 * irreversible step should be one you have to ask for twice. This is the first
 * ask; deleteProjectsForever is the second.
 */
export const deleteProject = mutation({
  args: { projectIds: v.array(v.id('projects')) },
  handler: async (ctx, args) => {
    for (const projectId of args.projectIds) {
      await ownedProject(ctx, projectId)
      await ctx.db.patch(projectId, { archivedAt: Date.now() })
    }
  },
})

export const listArchivedProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return []

    const all = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    return all
      .filter((project) => project.archivedAt)
      .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
  },
})

export const restoreProjects = mutation({
  args: { projectIds: v.array(v.id('projects')) },
  handler: async (ctx, args) => {
    for (const projectId of args.projectIds) {
      await ownedProject(ctx, projectId)
      // Cleared rather than set to zero, so "live" is the absence of a date.
      await ctx.db.patch(projectId, { archivedAt: undefined })
    }
  },
})

/**
 * The irreversible one.
 *
 * Uploaded images go with it. Nothing else references a project's inspiration
 * or mood board, and a blob nobody can reach is a bill that never stops —
 * leaving them behind would mean the storage of every deleted project is paid
 * for forever.
 */
export const deleteProjectsForever = mutation({
  args: { projectIds: v.array(v.id('projects')) },
  handler: async (ctx, args) => {
    for (const projectId of args.projectIds) {
      const project = await ownedProject(ctx, projectId)

      for (const storageId of [
        ...(project.inspirationImages ?? []),
        ...(project.moodBoardImages ?? []),
      ]) {
        // A missing blob is not a reason to abandon the delete.
        await ctx.storage.delete(storageId as Id<'_storage'>).catch(() => {})
      }

      await ctx.db.delete(projectId)
    }
  },
})

export const getProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null

    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== userId) return null
    return project
  },
})

export const saveStyleGuide = mutation({
  args: {
    projectId: v.id('projects'),
    styleGuide: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== userId) throw new Error('Project not found')

    await ctx.db.patch(args.projectId, {
      styleGuide: args.styleGuide,
      lastModified: Date.now(),
    })

    return { success: true }
  },
})

export const updateProjectSketches = mutation({
  args: {
    projectId: v.id('projects'),
    sketchesData: v.any(),
    /**
     * Whether this counts as an edit. Pan and zoom are saved so a project
     * reopens where you left it, but they are not work — bumping
     * lastModified for them would make every project read as just-edited
     * because somebody scrolled past it.
     */
    touch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== userId) throw new Error('Project not found')

    await ctx.db.patch(args.projectId, {
      sketchesData: args.sketchesData,
      ...(args.touch === false ? {} : { lastModified: Date.now() }),
    })

    return { success: true }
  },
})

export const renameProject = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== userId) throw new Error('Project not found')

    const name = args.name.trim()
    if (!name) throw new Error('Name cannot be empty')
    if (name.length > 80) throw new Error('Name is too long')

    await ctx.db.patch(args.projectId, { name, lastModified: Date.now() })
    return name
  },
})

/**
 * Chooses the design a project card shows.
 *
 * Called two ways. Opening a design in the preview or the editor sets it
 * automatically, because the thing you looked at last is the best guess at
 * what the project is — but only until somebody picks one deliberately, after
 * which `pinned` keeps their choice and merely browsing stops overwriting it.
 *
 * A null design id with pinned set is how "use the default" is expressed:
 * deliberately no picture, rather than no choice yet.
 */
export const setProjectThumbnail = mutation({
  args: {
    projectId: v.id('projects'),
    designId: v.union(v.string(), v.null()),
    pinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== userId) throw new Error('Not authorised')

    // An automatic update never overrides a deliberate one.
    if (!args.pinned && project.thumbnailPinned) return

    await ctx.db.patch(args.projectId, {
      thumbnailDesignId: args.designId,
      thumbnailPinned: args.pinned || project.thumbnailPinned === true,
    })
  },
})
