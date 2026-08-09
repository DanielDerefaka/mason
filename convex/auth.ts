import { convexAuth } from '@convex-dev/auth/server'
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
