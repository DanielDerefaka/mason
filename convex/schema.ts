import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  // Convex Auth's own tables (users, sessions, accounts, verification codes).
  ...authTables,

  /**
   * Named snapshots of a project's canvas.
   *
   * Undo lives in Redux and dies with the tab, which is fine for the last few
   * moves and useless for "put back what I had this morning". A separate table
   * rather than an array on the project so a long history cannot push the
   * project document towards Convex's per-document size limit.
   */
  versions: defineTable({
    projectId: v.id('projects'),
    userId: v.id('users'),
    label: v.string(),
    createdAt: v.number(),
    /** The whole sketchesData payload as it was. */
    data: v.any(),
  }).index('by_project', ['projectId']),

  /**
   * Public links to a single generated design.
   *
   * A row per share rather than a flag on the project: a link points at one
   * design, several can exist at once, and revoking one must not touch the
   * others. The token is the only credential, so it is long and random —
   * anyone holding it can read that design and nothing else.
   */
  shares: defineTable({
    token: v.string(),
    projectId: v.id('projects'),
    designId: v.string(),
    userId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_project', ['projectId']),

  /**
   * What Polar tells us about a customer's subscription.
   *
   * A mirror, never the source of truth — Polar owns the billing state and
   * this is the copy the app reads so a page render does not have to call
   * their API. Keyed by their subscription id so a webhook arriving twice
   * updates one row instead of inserting two.
   */
  subscriptions: defineTable({
    userId: v.optional(v.id('users')),
    /** Polar's ids, kept so a webhook can find the row without our user. */
    polarSubscriptionId: v.string(),
    polarCustomerId: v.optional(v.string()),
    polarProductId: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.string(),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index('by_polar_subscription', ['polarSubscriptionId'])
    .index('by_user', ['userId'])
    .index('by_email', ['email']),

  projects: defineTable({
    userId: v.id('users'),
    name: v.string(),
    projectNumber: v.number(),
    createdAt: v.number(),
    lastModified: v.number(),
    isPublic: v.boolean(),
    // Canvas state. Shape is owned by the canvas renderer rather than the
    // database, so it stays loosely typed here.
    sketchesData: v.optional(v.any()),
    description: v.optional(v.string()),
    generatedDesignData: v.optional(v.any()),
    inspirationImages: v.optional(v.array(v.string())),
    /** What the extraction pass read out of the inspiration board. */
    referenceBrief: v.optional(v.any()),
    /** The board the brief was read from, so a changed board re-extracts. */
    referenceBriefKey: v.optional(v.string()),
    moodBoardImages: v.optional(v.array(v.string())),
    styleGuide: v.optional(v.any()),
    tags: v.optional(v.array(v.string())),
    /**
     * Which generated design stands in as the project's picture.
     *
     * The id of a shape rather than an image: the design's markup is already
     * in sketchesData, so the card renders the real thing scaled down and
     * there is no second copy to upload, store, or leave stale when the design
     * is edited.
     */
    thumbnailDesignId: v.optional(v.union(v.string(), v.null())),
    /** Set once somebody chooses a picture, so opening a design stops changing it. */
    thumbnailPinned: v.optional(v.boolean()),
    /**
     * When the project was archived, or absent if it is live.
     *
     * Deleting is a two-step now: archiving is reversible and permanent
     * deletion is not, and a design somebody spent credits generating is worth
     * the extra step. A timestamp rather than a flag, so the archive can be
     * ordered by when things were put there.
     */
    archivedAt: v.optional(v.number()),
    /**
     * What the design is being made for.
     *
     * A reference says how a design should look; this says who it is for, and
     * they answer different questions. Without it the model invents a company
     * every time — which is why generated pages arrive named Meridian or
     * Verdant instead of the thing somebody is actually building.
     */
    brand: v.optional(
      v.object({
        enabled: v.boolean(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        /** Storage id of an uploaded logo, shown in the design's nav. */
        logo: v.optional(v.union(v.string(), v.null())),
      }),
    ),
  }).index('by_user', ['userId']),

  // Per-user counter behind the "Project 1", "Project 2" auto-naming.
  project_counters: defineTable({
    userId: v.id('users'),
    count: v.number(),
  }).index('by_user', ['userId']),

  // What a generation spends. Kept out of the auth users table so Polar can
  // top it up later without reaching into Convex Auth's own schema.
  credits: defineTable({
    userId: v.id('users'),
    balance: v.number(),
  }).index('by_user', ['userId']),
})
