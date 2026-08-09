import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/**
 * Sharing a design with someone who has no account.
 *
 * The token is the whole credential, so `getSharedDesign` is deliberately the
 * only unauthenticated function here and returns exactly one design's markup
 * plus the style guide needed to render it — never the project, never the
 * other designs on the canvas, never anything about the owner.
 */

/** Long enough that guessing is not a strategy. */
const newToken = () =>
  `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '').slice(0, 40)

export const createShare = mutation({
  args: { projectId: v.id('projects'), designId: v.string() },
  handler: async (ctx, { projectId, designId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    const project = await ctx.db.get(projectId)
    if (!project || project.userId !== userId) throw new Error('Project not found')

    // One link per design. Sharing twice should hand back the same URL rather
    // than quietly leaving the first one live and forgotten.
    const existing = await ctx.db
      .query('shares')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()
    const already = existing.find((share) => share.designId === designId)
    if (already) return already.token

    const token = newToken()
    await ctx.db.insert('shares', {
      token,
      projectId,
      designId,
      userId,
      createdAt: Date.now(),
    })
    return token
  },
})

export const revokeShare = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    const share = await ctx.db
      .query('shares')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique()

    if (!share || share.userId !== userId) throw new Error('Link not found')
    await ctx.db.delete(share._id)
    return { success: true }
  },
})

/** The token for one design, if it has been shared. Owner only. */
export const shareFor = query({
  args: { projectId: v.id('projects'), designId: v.string() },
  handler: async (ctx, { projectId, designId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null

    const project = await ctx.db.get(projectId)
    if (!project || project.userId !== userId) return null

    const shares = await ctx.db
      .query('shares')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()
    return shares.find((share) => share.designId === designId)?.token ?? null
  },
})

/**
 * The public read. No auth — the token is the credential.
 *
 * Returns the markup and the tokens needed to render it and nothing else. A
 * dead or revoked token returns null rather than throwing, so the page can say
 * "this link is no longer live" instead of showing an error.
 */
export const getSharedDesign = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const share = await ctx.db
      .query('shares')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique()
    if (!share) return null

    const project = await ctx.db.get(share.projectId)
    if (!project) return null

    const stored = (project.sketchesData ?? {}) as {
      shapes?: Array<{ id: string; kind: string; html?: string; label?: string; width?: number }>
    }
    const design = (stored.shapes ?? []).find((shape) => shape.id === share.designId)
    if (!design?.html) return null

    return {
      html: design.html,
      label: design.label ?? 'Design',
      width: design.width ?? null,
      styleGuide: project.styleGuide ?? null,
    }
  },
})
