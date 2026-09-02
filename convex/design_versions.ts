import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Doc, Id } from './_generated/dataModel'

import {
  decideCheckpoint,
  originForNew,
  toPrune,
  type Origin,
} from '../src/lib/design-history'

/**
 * Automatic history for a single generated design.
 *
 * The editor saves a design by writing it back over itself, so before this
 * existed the only thing standing between an afternoon's work and starting
 * again was the tab's undo stack. That stack is fine for the last few moves
 * and dies with the tab.
 *
 * Named for its table rather than shortened to `history`, because `versions.ts`
 * beside it is the canvas's history and the two are not interchangeable: that
 * one snapshots a whole board on a button press, this one snapshots one design
 * on its own without being asked.
 *
 * Every rule about when to write and what to drop lives in
 * `src/lib/design-history.ts`, where it can be tested. This file reads and
 * writes and does not decide.
 */

const ownedProject = async (
  ctx: QueryCtx,
  projectId: Id<'projects'>,
  userId: Id<'users'>,
): Promise<Doc<'projects'> | null> => {
  const project = await ctx.db.get(projectId)
  return project && project.userId === userId ? project : null
}

const historyOf = (ctx: QueryCtx, projectId: Id<'projects'>, designId: string) =>
  ctx.db
    .query('design_versions')
    .withIndex('by_design', (q) => q.eq('projectId', projectId).eq('designId', designId))
    .collect()

/**
 * Adds a snapshot and drops whatever that pushes over the limit.
 *
 * `origin` is passed in rather than derived, because a restore is a snapshot
 * of the state being discarded and knows that about itself; only the ordinary
 * case has to count what is already there.
 */
const record = async (
  ctx: MutationCtx,
  row: {
    projectId: Id<'projects'>
    designId: string
    userId: Id<'users'>
    html: string
    origin: Origin
  },
) => {
  const id = await ctx.db.insert('design_versions', { ...row, createdAt: Date.now() })
  for (const stale of toPrune(await historyOf(ctx, row.projectId, row.designId))) {
    await ctx.db.delete(stale._id)
  }
  return id
}

/**
 * The design's history, newest first, without the markup.
 *
 * The markup is the whole weight of a row and the panel never shows it, so a
 * list of twenty designs would be megabytes pushed to a dropdown to render
 * twenty timestamps. `restore` reads the one row that is actually wanted.
 */
export const list = query({
  args: { projectId: v.id('projects'), designId: v.string() },
  handler: async (ctx, { projectId, designId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return []
    if (!(await ownedProject(ctx, projectId, userId))) return []

    return (await historyOf(ctx, projectId, designId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(({ _id, createdAt, origin }) => ({ _id, createdAt, origin }))
  },
})

/**
 * Offers the markup a design is leaving behind to the history.
 *
 * Called after a save that has already succeeded, with the markup as it was
 * *before* that save, so every row is a state the design really was in and can
 * be put back to. Most calls are refused by the interval and write nothing,
 * which is the point: the editor asks often and cheaply rather than trying to
 * work out for itself when a session began.
 *
 * Refusals come back as a reason rather than an error. A history that could not
 * be added to must never look like an edit that failed.
 */
export const checkpoint = mutation({
  args: { projectId: v.id('projects'), designId: v.string(), html: v.string() },
  handler: async (ctx, { projectId, designId, html }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return { saved: false, reason: 'unauthenticated' as const }
    if (!(await ownedProject(ctx, projectId, userId))) {
      return { saved: false, reason: 'not-found' as const }
    }

    const existing = await historyOf(ctx, projectId, designId)
    const latest = existing.reduce<Doc<'design_versions'> | null>(
      (newest, row) => (!newest || row.createdAt > newest.createdAt ? row : newest),
      null,
    )

    const decision = decideCheckpoint(latest, html, Date.now())
    if (decision !== 'save') return { saved: false, reason: decision }

    await record(ctx, {
      projectId,
      designId,
      userId,
      html,
      origin: originForNew(existing.length),
    })
    return { saved: true, reason: decision }
  },
})

/**
 * Hands back the markup of one snapshot, keeping what it replaces.
 *
 * The caller passes the design's current markup and paints the returned
 * markup itself. Two reasons it works that way rather than the mutation
 * patching the project: the editor is the only writer of a design's shape and
 * a second one here would be a race with its own debounce, and painting
 * locally means a restore lands without a page reload, on the tab's undo stack,
 * where one press of undo reverses it.
 *
 * `current` is recorded whatever the interval says. Restoring is the one
 * moment in the editor that throws work away on purpose, so the thing being
 * thrown away is worth a row even if the last one was a minute ago.
 */
export const restore = mutation({
  args: { versionId: v.id('design_versions'), current: v.string() },
  handler: async (ctx, { versionId, current }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    const version = await ctx.db.get(versionId)
    if (!version || version.userId !== userId) throw new Error('Version not found')
    if (!(await ownedProject(ctx, version.projectId, userId))) {
      throw new Error('Version not found')
    }

    // The same rules as a checkpoint with the interval taken out, which is
    // what passing no previous snapshot means: an empty or oversized design
    // is still skipped, and one that already is what is being restored has
    // nothing worth keeping. None of the three refuses the restore itself.
    const keep =
      current !== version.html && decideCheckpoint(null, current, Date.now()) === 'save'
    if (keep) {
      await record(ctx, {
        projectId: version.projectId,
        designId: version.designId,
        userId,
        html: current,
        origin: 'restore',
      })
    }

    return { html: version.html, createdAt: version.createdAt }
  },
})
