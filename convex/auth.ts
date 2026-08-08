import { convexAuth } from '@convex-dev/auth/server'
import { Password } from '@convex-dev/auth/providers/Password'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
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
