import ResendProvider from '@auth/core/providers/resend'
import { alphabet, generateRandomString } from 'oslo/crypto'
import { Resend } from 'resend'

/**
 * Email delivery for password reset and address verification.
 *
 * A short numeric code rather than a magic link: the link has to survive
 * being opened in a different browser from the one that asked for it, which
 * is exactly where magic links fall down, and a code can be typed into the
 * tab that is already open.
 *
 * Both providers are only reachable when AUTH_RESEND_KEY is set. Without it
 * Convex Auth still signs people in and out — it is only these two flows that
 * need to send anything.
 */
const CODE_LENGTH = 8
const TEN_MINUTES = 60 * 10

const send = async (
  to: string,
  subject: string,
  intro: string,
  code: string,
  outro: string,
) => {
  const key = process.env.AUTH_RESEND_KEY
  if (!key) throw new Error('Email is not configured on this deployment')

  const from = process.env.AUTH_EMAIL_FROM ?? 'Mason <onboarding@resend.dev>'
  const { error } = await new Resend(key).emails.send({
    from,
    to: [to],
    subject,
    text: `${intro}\n\n${code}\n\n${outro}`,
    html: `
      <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;color:#111">
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6">${intro}</p>
        <p style="margin:0 0 20px;font-size:30px;font-weight:700;letter-spacing:6px;font-family:ui-monospace,monospace">${code}</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#666">${outro}</p>
      </div>
    `,
  })

  if (error) throw new Error(`Could not send that email: ${JSON.stringify(error)}`)
}

/** Verifies a new account's address. */
export const ResendOTP = ResendProvider({
  id: 'resend-otp',
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: TEN_MINUTES,
  async generateVerificationToken() {
    return generateRandomString(CODE_LENGTH, alphabet('0-9'))
  },
  async sendVerificationRequest({ identifier: email, token }: { identifier: string; token: string }) {
    await send(
      email,
      'Confirm your email',
      'Enter this code to confirm your address and finish setting up your Mason account.',
      token,
      'It expires in ten minutes. If you did not create an account, ignore this.',
    )
  },
})

/** Resets a forgotten password. */
export const ResendOTPPasswordReset = ResendProvider({
  id: 'resend-otp-password-reset',
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: TEN_MINUTES,
  async generateVerificationToken() {
    return generateRandomString(CODE_LENGTH, alphabet('0-9'))
  },
  async sendVerificationRequest({ identifier: email, token }: { identifier: string; token: string }) {
    await send(
      email,
      'Reset your password',
      'Enter this code to choose a new password for your Mason account.',
      token,
      'It expires in ten minutes. If you did not ask for this, your account is fine — ignore this email.',
    )
  },
})
