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
    /**
     * Named by hand, copied by the minute as somebody works, or taken just
     * before a restore. Optional because every row from before the automatic
     * copies existed was named by hand; see `src/lib/canvas-history.ts`.
     */
    origin: v.optional(v.union(v.literal('manual'), v.literal('auto'), v.literal('restore'))),
    /** The whole sketchesData payload as it was. */
    data: v.any(),
  }).index('by_project', ['projectId']),

  /**
   * What one design's markup looked like before an editing session changed it.
   *
   * Separate from `versions` above, which snapshots the whole canvas when
   * somebody presses a button. These are taken automatically and hold a single
   * design, because both halves of that matter. The editor writes a design
   * back over itself with no history of its own, so an afternoon's layout used
   * to sit behind nothing but the tab's undo stack — close the tab and the only
   * way back was to build it again. And a design lives on a canvas beside
   * others, so reverting through `versions` would drag every one of them back
   * with it; restoring here touches the design named on the row and nothing
   * else.
   *
   * `html` is the markup as the editor serialised it, which is to say it has
   * already been through the sanitiser once. Restoring puts it back through
   * `sanitiseHtml` all the same, on the client, where the DOM the sanitiser
   * needs exists: a row written before a rule was tightened has never been
   * through the newer one, and time in the database is not a warrant.
   */
  design_versions: defineTable({
    projectId: v.id('projects'),
    /** The shape id of the design, as it appears in `sketchesData`. */
    designId: v.string(),
    userId: v.id('users'),
    html: v.string(),
    createdAt: v.number(),
    origin: v.union(v.literal('original'), v.literal('edit'), v.literal('restore')),
  })
    // The list a design's history panel asks for.
    .index('by_design', ['projectId', 'designId'])
    // Only ever used to clear up after a project that is being deleted, which
    // has to reach every design on it at once.
    .index('by_project', ['projectId']),

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
    /**
     * A PNG of the design for the link's social card. Optional because a
     * share made before /try existed has none, and the page falls back to a
     * generated card.
     */
    previewStorageId: v.optional(v.string()),
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
    /**
     * The ticket the last spend handed out, cleared by the refund that uses
     * it. `credits.refund` is callable from the browser, so without this a
     * client could simply call it in a loop; with it, a refund is only ever
     * the undoing of a spend that actually happened.
     */
    refundTicket: v.optional(v.string()),
  }).index('by_user', ['userId']),

  /**
   * Everything /try knows about an anonymous user.
   *
   * A separate table rather than fields on `users`: that table belongs to
   * Convex Auth, and the auth callback inserts here in the same transaction
   * that creates the user, so the two cannot drift. The row outlives the
   * conversion to a real account — `convertedAt` is set, nothing is deleted —
   * because the signal counts are read from it.
   */
  guests: defineTable({
    userId: v.id('users'),
    createdAt: v.number(),
    ipHash: v.optional(v.string()),
    /** YYYY-MM-DD (UTC) of the last pool generation; one per day. */
    lastPoolDay: v.optional(v.string()),
    poolUses: v.number(),
    /** Personal credits earned (share on X). Spent after the pool. */
    bonus: v.number(),
    sharedAt: v.optional(v.number()),
    keyAddedAt: v.optional(v.number()),
    /** Which bucket the last spend came from, so refund puts it back in the right place. */
    lastSpendSource: v.optional(v.union(v.literal('pool'), v.literal('bonus'))),
    /** The ticket the last spend handed out; see `credits.refundTicket`. */
    refundTicket: v.optional(v.string()),
    /** Set when the anonymous user converts; the row is kept for the signal counts. */
    convertedAt: v.optional(v.number()),
    /**
     * When this guest gave an address at the export gate.
     *
     * The gate asks once and never again, and "once" has to survive a reload
     * — so it is remembered on the row rather than in the tab. The address
     * itself lives in `emails`; this is only the fact that it was given.
     */
    emailAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    /**
     * Exactly the question `purgeStale` asks: unconverted, and older than the
     * cutoff. `convertedAt` comes first so the range covers only rows that can
     * still be purged — converted rows are kept for ever, and an index on
     * `createdAt` alone would make every nightly run walk the whole growing
     * pile of them before reaching anything it could delete.
     */
    .index('by_converted_created', ['convertedAt', 'createdAt']),

  /** The community pool: one row per UTC day, counting draws. */
  pool_days: defineTable({ day: v.string(), used: v.number() }).index('by_day', ['day']),

  /** Guest sessions created per network per day — the throttle behind admission. */
  guest_ips: defineTable({ ipHash: v.string(), day: v.string(), count: v.number() }).index(
    'by_ip_day',
    ['ipHash', 'day'],
  ),

  /**
   * What /explore shows.
   *
   * A snapshot of one design and the sketch that produced it, copied out of
   * the project at publish time. Copied rather than referenced so the public
   * gallery never reads a project document — the other designs on that canvas
   * were not published, and a query that has to open the project to find the
   * one that was is a query one bug away from showing the rest.
   */
  gallery: defineTable({
    userId: v.id('users'),
    projectId: v.id('projects'),
    designId: v.string(),
    label: v.string(),
    instruction: v.optional(v.string()),
    /** Snapshot of the design markup — Explore must not read whole projects. */
    html: v.string(),
    /** The sketch that produced it: the frame plus the shapes overlapping it, ids as stored. */
    sketch: v.any(),
    sketchStorageId: v.optional(v.id('_storage')),
    visible: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    remixes: v.number(),
  })
    .index('by_design', ['designId'])
    .index('by_visible_created', ['visible', 'createdAt'])
    .index('by_user', ['userId']),

  /**
   * Addresses people gave in exchange for a download.
   *
   * The free week hands out generations and asks for nothing; the one place
   * it asks for something is the export gate, and what it asks for is an
   * email rather than an account. This is that list — the launch list.
   *
   * Its own table rather than a field on `guests` because it outlives the
   * guest: `purgeStale` forgets an anonymous user after fourteen days, and the
   * address must not go with them. `userId` is optional and is cleared on
   * purge for exactly that reason, so a row here can name nobody.
   *
   * `email` is stored lower-cased and trimmed so `by_email` really is one row
   * per person; the same address arriving from a second session updates that
   * row instead of adding to the pile.
   */
  emails: defineTable({
    email: v.string(),
    userId: v.optional(v.id('users')),
    /** Where it was given — 'export' today; a waitlist form later. */
    source: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    /** How many times this address has come back. */
    hits: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_user', ['userId']),

  /** Daily counters per signal kind; see `lib/signals.ts` for the kinds. */
  signals: defineTable({ kind: v.string(), day: v.string(), count: v.number() }).index(
    'by_kind_day',
    ['kind', 'day'],
  ),

  /**
   * A one-time handover of a guest's project to an existing account.
   *
   * Signing in as someone else swaps the session, and the guest's work would
   * be stranded on the anonymous user. The guest mints a claim before signing
   * in and redeems it after, and the project follows them.
   */
  project_claims: defineTable({
    token: v.string(),
    projectId: v.id('projects'),
    fromUserId: v.id('users'),
    createdAt: v.number(),
  }).index('by_token', ['token']),
})
