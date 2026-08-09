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
    moodBoardImages: v.optional(v.array(v.string())),
    styleGuide: v.optional(v.any()),
    tags: v.optional(v.array(v.string())),
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
