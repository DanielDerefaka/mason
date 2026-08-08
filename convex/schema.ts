import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  // Convex Auth's own tables (users, sessions, accounts, verification codes).
  ...authTables,

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
})
