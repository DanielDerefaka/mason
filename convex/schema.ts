import { defineSchema } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  // Convex Auth's own tables (users, sessions, accounts, verification codes).
  // Application tables are added in later chapters.
  ...authTables,
})
