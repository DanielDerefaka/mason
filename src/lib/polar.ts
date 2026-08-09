import { Polar } from '@polar-sh/sdk'

/**
 * The Polar client.
 *
 * `POLAR_SERVER` picks the environment: "sandbox" while testing, "production"
 * when real cards are involved. They are separate worlds — a sandbox token
 * against production returns 401 rather than anything useful, which is the
 * failure worth recognising quickly.
 */
export const polarServer =
  process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'

export const polarConfigured = Boolean(
  process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_PRODUCT_ID,
)

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? '',
  server: polarServer,
})
