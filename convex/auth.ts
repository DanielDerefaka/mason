import {
  convexAuth,
  invalidateSessions,
  modifyAccountCredentials,
} from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalAction, internalQuery } from './_generated/server'
import { Password } from '@convex-dev/auth/providers/Password'
import { ResendOTP, ResendOTPPasswordReset } from './email'

/**
 * Email flows are only wired up when a Resend key is present.
 *
 * Attaching a provider whose apiKey is undefined makes every sign-in attempt
 * fail at construction, not just the flows that need email — so a deployment
 * without the key keeps working, minus reset and verification.
 */
const emailConfigured = Boolean(process.env.AUTH_RESEND_KEY)

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      ...(emailConfigured
        ? { reset: ResendOTPPasswordReset, verify: ResendOTP }
        : {}),
      // Carries the extra sign-up fields onto the user record. Password auth
      // identifies users by email, so email is required even though the
      // tutorial's block only shows name fields.
      profile(params) {
        const first = (params.firstname as string | undefined)?.trim() ?? ''
        const last = (params.lastname as string | undefined)?.trim() ?? ''
        const full = `${first} ${last}`.trim()
        return {
          email: params.email as string,
          name: full || (params.username as string | undefined) || (params.email as string),
        }
      },
    }),
  ],
})

/**
 * Sets a password from the command line.
 *
 * Internal, so it is unreachable from the browser — the only way in is the
 * deploy key on your own machine:
 *
 *   npx convex run auth:setPassword '{"email":"you@example.com","password":"…"}'
 *
 * This exists because the email reset flow needs AUTH_RESEND_KEY, and until
 * that is set there is otherwise no way back into an account whose password
 * has been forgotten. Same shape as credits:grant.
 *
 * An action rather than a mutation: Convex Auth hashes the secret itself, and
 * its credential helpers need an action context to do it.
 */
export const findPasswordAccount = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const account = await ctx.db
      .query('authAccounts')
      .withIndex('providerAndAccountId', (q) =>
        q.eq('provider', 'password').eq('providerAccountId', email),
      )
      .unique()
    return account ? { userId: account.userId } : null
  },
})

export const setPassword = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }): Promise<string> => {
    if (password.length < 8) throw new Error('Use at least 8 characters')

    const account = await ctx.runQuery(internal.auth.findPasswordAccount, { email })
    if (!account) throw new Error(`No password account for ${email}`)

    await modifyAccountCredentials(ctx, {
      provider: 'password',
      account: { id: email, secret: password },
    })

    // Every existing session goes: a password change should not leave an old
    // browser signed in.
    await invalidateSessions(ctx, { userId: account.userId })

    return `Password updated for ${email}. Sign in again.`
  },
})
