import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'
import { bump } from './lib/signals'

/**
 * The public gallery.
 *
 * A row in `gallery` is a copy of one design and the sketch behind it, made
 * when it was published. `list` and `get` read those rows and nothing else —
 * never a project — because a project holds every design on that canvas and
 * only one of them was offered to the public.
 */

/** The bits of a stored shape this module reads. Anything else rides along. */
type SketchShape = {
  id: string
  kind: string
  x: number
  y: number
  width: number
  height: number
  html?: string
  label?: string
  streaming?: boolean
  sourceFrameId?: string
  instruction?: string
  [key: string]: unknown
}

/** Below this the "design" is a stub the model never finished. */
const MIN_HTML_LENGTH = 40

/** The instruction is shown on a card; a paragraph is plenty. */
const MAX_INSTRUCTION_LENGTH = 600

const DEFAULT_PAGE = 12
const MAX_PAGE = 24

/**
 * Copied from `src/lib/rasterise.ts`, which decides what is "inside" a frame
 * when the sketch is sent to the model. The same rule here means the sketch
 * shown on Explore is the sketch the model saw. Convex cannot import that
 * file — it reaches for the DOM — so the four lines are repeated.
 */
const overlaps = (shape: SketchShape, frame: SketchShape) =>
  shape.x < frame.x + frame.width &&
  shape.x + shape.width > frame.x &&
  shape.y < frame.y + frame.height &&
  shape.y + shape.height > frame.y

const requireUser = async (ctx: MutationCtx | QueryCtx) => {
  const userId = await getAuthUserId(ctx)
  if (userId === null) throw new Error('Not authenticated')
  return userId
}

const byDesign = (ctx: QueryCtx, designId: string) =>
  ctx.db
    .query('gallery')
    .withIndex('by_design', (q) => q.eq('designId', designId))
    .first()

/**
 * The thumbnail URL, or null.
 *
 * `getUrl` throws on an id that is not a storage id and returns null for one
 * whose file is gone. Explore renders a page of these at once, so an
 * unguarded call means one bad row takes down the gallery for everyone —
 * `Promise.all` rejects and the whole query fails, not just that card. A
 * missing thumbnail is a card without a picture; that is the right blast
 * radius.
 */
const sketchUrlFor = async (ctx: QueryCtx, storageId: Id<'_storage'> | undefined) => {
  if (!storageId) return null
  try {
    return await ctx.storage.getUrl(storageId)
  } catch {
    return null
  }
}

const trimInstruction = (instruction: string | undefined) => {
  const trimmed = instruction?.trim()
  return trimmed ? trimmed.slice(0, MAX_INSTRUCTION_LENGTH) : undefined
}

/**
 * Publishes (or republishes) one of the caller's designs.
 *
 * The snapshot is taken here, from the project, rather than sent by the
 * client: the client could send any markup at all and call it a design. On a
 * republish `visible` is kept unless it is given, so regenerating a design
 * someone hid does not quietly show it again.
 */
export const publish = mutation({
  args: {
    projectId: v.id('projects'),
    designId: v.string(),
    instruction: v.optional(v.string()),
    // Validated as a storage id here rather than cast at the point of use:
    // anything else is refused before it can be written to a gallery row.
    sketchStorageId: v.optional(v.id('_storage')),
    visible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    const now = Date.now()

    const project = await ctx.db.get(args.projectId)
    if (!project || project.userId !== userId) throw new Error('Project not found')

    const shapes = ((project.sketchesData ?? {}) as { shapes?: SketchShape[] }).shapes ?? []
    const design = shapes.find(
      (shape) => shape.id === args.designId && shape.kind === 'generated-ui',
    )
    if (!design || design.streaming || (design.html ?? '').length < MIN_HTML_LENGTH) {
      throw new Error('Design is not ready to publish')
    }

    const frame = shapes.find(
      (shape) => shape.kind === 'frame' && shape.id === design.sourceFrameId,
    )
    if (!frame) throw new Error('The sketch this design came from is gone')

    const sketch = {
      frame,
      shapes: shapes.filter(
        (shape) =>
          shape.id !== frame.id &&
          shape.kind !== 'frame' &&
          shape.kind !== 'generated-ui' &&
          overlaps(shape, frame),
      ),
    }

    const html = design.html as string
    const label = design.label?.trim() || 'Design'
    const instruction = trimInstruction(args.instruction ?? design.instruction)

    const existing = await byDesign(ctx, args.designId)
    if (existing) {
      if (existing.userId !== userId) throw new Error('Not authorised')

      const replacingSketch =
        args.sketchStorageId !== undefined && args.sketchStorageId !== existing.sketchStorageId
      if (replacingSketch && existing.sketchStorageId) {
        // The old thumbnail is unreachable once replaced; keep the bill honest.
        await ctx.storage.delete(existing.sketchStorageId).catch(() => {})
      }

      await ctx.db.patch(existing._id, {
        projectId: args.projectId,
        label,
        html,
        sketch,
        updatedAt: now,
        ...(instruction !== undefined ? { instruction } : {}),
        ...(replacingSketch ? { sketchStorageId: args.sketchStorageId } : {}),
        ...(args.visible !== undefined ? { visible: args.visible } : {}),
      })
      return existing._id
    }

    return await ctx.db.insert('gallery', {
      userId,
      projectId: args.projectId,
      designId: args.designId,
      label,
      instruction,
      html,
      sketch,
      sketchStorageId: args.sketchStorageId,
      visible: args.visible ?? true,
      createdAt: now,
      updatedAt: now,
      remixes: 0,
    })
  },
})

/** The "Show in Explore" switch. Owner only. */
export const setVisible = mutation({
  args: { designId: v.string(), visible: v.boolean() },
  handler: async (ctx, { designId, visible }) => {
    const userId = await requireUser(ctx)

    const row = await byDesign(ctx, designId)
    if (!row || row.userId !== userId) throw new Error('Design not found')

    await ctx.db.patch(row._id, { visible, updatedAt: Date.now() })
  },
})

/**
 * Which of the caller's designs are published, and whether they are shown.
 * A design with no entry is not published, and is simply absent.
 */
export const visibilityFor = query({
  args: { designIds: v.array(v.string()) },
  handler: async (ctx, { designIds }) => {
    const userId = await getAuthUserId(ctx)
    const visibility: Record<string, boolean> = {}
    if (userId === null) return visibility

    for (const designId of designIds) {
      const row = await byDesign(ctx, designId)
      if (row && row.userId === userId) visibility[designId] = row.visible
    }
    return visibility
  },
})

/** The gallery, newest first. Public. */
export const list = query({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const numItems = Math.min(MAX_PAGE, Math.max(1, Math.floor(args.limit ?? DEFAULT_PAGE)))

    const page = await ctx.db
      .query('gallery')
      .withIndex('by_visible_created', (q) => q.eq('visible', true))
      .order('desc')
      .paginate({ numItems, cursor: args.cursor ?? null })

    const items = await Promise.all(
      page.page.map(async (row) => ({
        id: row._id,
        label: row.label,
        instruction: row.instruction ?? null,
        createdAt: row.createdAt,
        remixes: row.remixes,
        sketchUrl: await sketchUrlFor(ctx, row.sketchStorageId),
        html: row.html,
      })),
    )

    return { items, nextCursor: page.isDone ? null : page.continueCursor }
  },
})

/** One gallery item with its sketch, for the remix. Public; hidden items are null. */
export const get = query({
  args: { id: v.id('gallery') },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id)
    if (!row || !row.visible) return null

    return {
      id: row._id,
      label: row.label,
      instruction: row.instruction ?? null,
      html: row.html,
      sketch: row.sketch as { frame: SketchShape; shapes: SketchShape[] },
      sketchUrl: await sketchUrlFor(ctx, row.sketchStorageId),
    }
  },
})

export const recordRemix = mutation({
  args: { id: v.id('gallery') },
  handler: async (ctx, { id }) => {
    await requireUser(ctx)

    const row = await ctx.db.get(id)
    if (!row || !row.visible) throw new Error('Design not found')

    await ctx.db.patch(row._id, { remixes: row.remixes + 1 })
    await bump(ctx.db, 'remix')
  },
})
