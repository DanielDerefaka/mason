import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null
    return await ctx.db.get(userId)
  },
})

/**
 * Renames the signed-in user.
 *
 * Name only. Password auth identifies an account by email, so letting the
 * email be edited here would sign the user out of their own account with no
 * way back in — changing it needs a verification flow this app does not have.
 */
export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not signed in')

    const trimmed = name.trim()
    if (!trimmed) throw new Error('Name cannot be empty')
    if (trimmed.length > 60) throw new Error('Name is too long')

    await ctx.db.patch(userId, { name: trimmed })
    return trimmed
  },
})
