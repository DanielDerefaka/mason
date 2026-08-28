import {
  convexAuth,
  createAccount,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
} from '@convex-dev/auth/server'
import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalAction, internalQuery, query, type MutationCtx } from './_generated/server'
import type { DataModel, Doc, Id } from './_generated/dataModel'
import { Password } from '@convex-dev/auth/providers/Password'
import { ResendOTPPasswordReset } from './email'
import { verifyAdmission } from './lib/admission'
import { guestRow } from './lib/pool'
import { bump } from './lib/signals'
import { dayKey } from '../src/lib/try/pool-day'

/**
 * Email flows are only wired up when a Resend key is present.
 *
 * Attaching a provider whose apiKey is undefined makes every sign-in attempt
 * fail at construction, not just the flows that need email — so a deployment
 * without the key keeps working, minus reset.
 */
const emailConfigured = Boolean(process.env.AUTH_RESEND_KEY)

/**
 * The /try session.
 *
 * Built on ConvexCredentials rather than the stock Anonymous provider because
 * that one asks for the profile synchronously, and checking an admission
 * token is an HMAC — asynchronous, and the whole point. Without the check,
 * the action that creates a user is reachable by anyone with the deployment
 * URL, and a script could mint sessions until the pool was gone.
 *
 * The token is minted by `/api/try/admit`, which can see the caller's IP and
 * signs a hash of it in. That hash is what `guest.admitIp` throttles on, and
 * it is stripped again before the user row is written — `ipHash` is not a
 * users-table field, and the callback below is what keeps it out.
 */
let warnedNoSecret = false

const Anonymous = ConvexCredentials<DataModel>({
  id: 'anonymous',
  authorize: async (params, ctx) => {
    const secret = process.env.GUEST_ADMISSION_SECRET
    let ipHash: string | undefined

    if (secret) {
      const token = typeof params.admission === 'string' ? params.admission : ''
      const admission = await verifyAdmission(token, secret)
      if (admission === null) throw new Error('Guest sign-in refused')

      ipHash = admission.ipHash
      await ctx.runMutation(internal.guest.admitIp, { ipHash, day: dayKey() })
    } else if (!warnedNoSecret) {
      // Local development has no secret and no admit route to mint tokens
      // with; refusing would make /try unusable there. Said once per isolate
      // so a deployment missing the secret cannot miss the message either.
      warnedNoSecret = true
      console.warn(
        'GUEST_ADMISSION_SECRET is not set: anonymous sign-in accepts anyone. ' +
          'Fine locally; set it before this deployment serves /try.',
      )
    }

    const { user } = await createAccount<DataModel>(ctx, {
      provider: 'anonymous',
      account: { id: crypto.randomUUID() },
      profile: { isAnonymous: true, ...(ipHash ? { ipHash } : {}) },
    })
    return { userId: user._id }
  },
})

/** What `ctx.db.insert('users', …)` accepts. */
type UserFields = Omit<Doc<'users'>, '_id' | '_creationTime'>

/**
 * Convex refuses `undefined` as a value, and a profile built from optional
 * params is full of them. The library strips them too, in its own path.
 */
const stripUndefined = (record: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))

/** The library's own wording, kept so a schema mismatch reads the same as before. */
const patchUser = async (ctx: MutationCtx, userId: Id<'users'>, data: Partial<UserFields>) => {
  try {
    await ctx.db.patch(userId, data)
  } catch (error) {
    throw new Error(
      `Could not update user document with ID \`${userId}\`, ` +
        `either the user has been deleted but their account has not, ` +
        `or the profile data doesn't match the \`users\` table schema: ` +
        `${(error as Error).message}`,
    )
  }
}

const uniqueUserWithVerifiedEmail = async (ctx: MutationCtx, email: string) => {
  const users = await ctx.db
    .query('users')
    .withIndex('email', (q) => q.eq('email', email))
    .filter((q) => q.neq(q.field('emailVerificationTime'), undefined))
    .take(2)
  return users.length === 1 ? users[0]._id : null
}

const uniqueUserWithVerifiedPhone = async (ctx: MutationCtx, phone: string) => {
  const users = await ctx.db
    .query('users')
    .withIndex('phone', (q) => q.eq('phone', phone))
    .filter((q) => q.neq(q.field('phoneVerificationTime'), undefined))
    .take(2)
  return users.length === 1 ? users[0]._id : null
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      /**
       * Reset only — deliberately not `verify`.
       *
       * Wiring `verify: ResendOTP` gates sign-up AND sign-in behind an
       * emailed code, and there is no screen anywhere that collects it: the
       * reset flow has its two-step UI, sign-up does not. The day the key was
       * first set on production, every new sign-up would have received a code
       * with nowhere to type it and been stuck unverified. Verification is a
       * feature to build — the code-entry step first, this line second.
       */
      ...(emailConfigured ? { reset: ResendOTPPasswordReset } : {}),
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
    Anonymous,
  ],
  callbacks: {
    /**
     * Replaces the library's user creation wholesale — there is no way to
     * extend it — so most of this is the default reproduced from
     * `@convex-dev/auth/dist/server/implementation/users.js`, and must stay
     * in step with it. Two things are ours:
     *
     * - A password sign-up made while an anonymous session is live converts
     *   that user in place instead of creating a second one. Same id, so the
     *   project, the autosave and every owner check carry over untouched.
     * - The anonymous provider's user gets a `guests` row in the same
     *   transaction, with the ipHash the token carried and nothing else.
     */
    async createOrUpdateUser(rawCtx, args) {
      // The library types this over AnyDataModel; it is the store mutation's
      // context, and the only data model it will ever run against is ours.
      const ctx = rawCtx as unknown as MutationCtx
      const now = Date.now()
      const { provider } = args
      const {
        emailVerified: profileEmailVerified,
        phoneVerified: profilePhoneVerified,
        ipHash,
        ...rest
      } = args.profile
      const profile = stripUndefined(rest)

      const emailVerified =
        profileEmailVerified ??
        ((provider.type === 'oauth' || provider.type === 'oidc') &&
          provider.allowDangerousEmailAccountLinking !== false)
      const phoneVerified = profilePhoneVerified ?? false

      // The type says `shouldLink`; the runtime passes the two split flags
      // through from createAccount. Honour whichever arrives.
      const links = args as {
        shouldLink?: boolean
        shouldLinkViaEmail?: boolean
        shouldLinkViaPhone?: boolean
      }
      const shouldLinkViaEmail =
        Boolean(links.shouldLink || links.shouldLinkViaEmail) ||
        emailVerified ||
        provider.type === 'email'
      const shouldLinkViaPhone =
        Boolean(links.shouldLink || links.shouldLinkViaPhone) ||
        phoneVerified ||
        provider.type === 'phone'

      const userData = {
        ...(emailVerified ? { emailVerificationTime: now } : {}),
        ...(phoneVerified ? { phoneVerificationTime: now } : {}),
        ...profile,
      } as UserFields

      // a. Signing in to an account that already has a user: refresh it.
      if (args.existingUserId !== null) {
        await patchUser(ctx, args.existingUserId, userData)
        return args.existingUserId
      }

      // b. "Keep your work": a guest giving an email becomes that account.
      if (
        provider.id === 'password' ||
        (args.type === 'credentials' && typeof profile.email === 'string')
      ) {
        const current = await getAuthUserId(ctx)
        if (current !== null) {
          const user = await ctx.db.get(current)
          if (user?.isAnonymous === true) {
            await patchUser(ctx, current, { ...userData, isAnonymous: false })
            const guest = await guestRow(ctx.db, current)
            if (guest) await ctx.db.patch(guest._id, { convertedAt: now })
            await bump(ctx.db, 'email_given', now)
            return current
          }
        }
      }

      // c. The default: link to a user with the same verified email or
      // phone, or make a new one.
      const byEmail =
        typeof profile.email === 'string' && shouldLinkViaEmail
          ? await uniqueUserWithVerifiedEmail(ctx, profile.email)
          : null
      const byPhone =
        typeof profile.phone === 'string' && shouldLinkViaPhone
          ? await uniqueUserWithVerifiedPhone(ctx, profile.phone)
          : null

      // Both a verified email match and a verified phone match is ambiguous;
      // the library makes a fresh user rather than guess, and so do we.
      const linked =
        byEmail !== null && byPhone !== null ? null : byEmail !== null ? byEmail : byPhone
      if (linked !== null) {
        await patchUser(ctx, linked, userData)
        return linked
      }

      const userId = await ctx.db.insert('users', userData)
      if (provider.id === 'anonymous') {
        await ctx.db.insert('guests', {
          userId,
          createdAt: now,
          ...(typeof ipHash === 'string' ? { ipHash } : {}),
          poolUses: 0,
          bonus: 0,
        })
        await bump(ctx.db, 'guest_created', now)
      }
      return userId
    },
  },
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
/**
 * Whether an email already has a password account.
 *
 * The regression this exists for: the "Keep your work" dialog found out by
 * trying, and a refused sign-in is not free here. The Next.js auth proxy
 * answers any failed `signIn` by clearing both auth cookies — for an account
 * that means signing in again, but for a guest those cookies *are* the work:
 * an anonymous session is the only handle on the projects it made. A typo in
 * the password therefore threw away the canvas the visitor was trying to
 * keep. The dialog asks first now.
 *
 * It discloses whether an address is registered. So did the error message it
 * replaces ("That email already has an account"), and so does every sign-up
 * form; the alternative is losing someone's work to a typo.
 *
 * Matched exactly, because that is how the account was stored: the password
 * provider uses the address as typed at sign-up as the account id.
 */
export const hasPasswordAccount = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const account = await ctx.db
      .query('authAccounts')
      .withIndex('providerAndAccountId', (q) =>
        q.eq('provider', 'password').eq('providerAccountId', email.trim()),
      )
      .unique()
    return account !== null
  },
})

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
