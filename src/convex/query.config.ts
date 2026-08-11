import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ReferenceBriefSchema, StyleGuideSchema } from '@/types/style-guide'

/** URL-safe handle used as the /dashboard/[session] segment. */
export const toSessionSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'me'

/**
 * Server-side gate for the dashboard entry page: who is signed in, and are
 * they entitled to use the product.
 *
 * This is a page-level check. A production build would repeat it in a data
 * access layer so a forgotten check on a new page cannot leak access.
 */
export const subscriptionEntitlementQuery = async () => {
  const token = await convexAuthNextjsToken()
  const user = await fetchQuery(api.user.getCurrentUser, {}, { token })
  if (!user) return { user: null, session: null, entitled: false, subscribed: false }

  const subscribed = await fetchQuery(api.subscriptions.isEntitled, {}, { token })

  /**
   * Enforcement is opt-in.
   *
   * `subscribed` is the real answer and is always computed — the billing page
   * shows it, and turning the gate on is a one-line environment change. But it
   * only redirects when BILLING_ENFORCED is set, because switching it on by
   * default would lock every existing account, including yours, out of an app
   * that has been free until now.
   */
  const enforced = process.env.BILLING_ENFORCED === 'true'

  return {
    user,
    session: toSessionSlug(user.name ?? user.email ?? 'me'),
    subscribed,
    entitled: enforced ? subscribed : true,
  }
}

/**
 * What the generation routes charge against. Polar (chapter 24) will top the
 * balance up; it is not the source of the balance itself, so this reads the
 * same Convex row the navbar shows.
 */
export const CreditsBalanceQuery = async () => {
  const token = await convexAuthNextjsToken()
  const profile = await fetchQuery(api.user.getCurrentUser, {}, { token })

  if (!profile) return { ok: false, balance: 0, profile: null }

  const balance = await fetchQuery(api.credits.getBalance, {}, { token })
  return { ok: true, balance: balance ?? 0, profile }
}

/** The project's generated style guide, or null if it has not been generated yet. */
export const StyleGuideQuery = async (projectId: Id<'projects'>) => {
  const token = await convexAuthNextjsToken()
  const project = await fetchQuery(api.project.getProject, { projectId }, { token })
  const parsed = StyleGuideSchema.safeParse(project?.styleGuide)
  return parsed.success ? parsed.data : null
}

/**
 * The written brief read out of the inspiration board, with the fingerprint of
 * the board it came from so a caller can tell a stale one from a current one.
 */
export const ReferenceBriefQuery = async (projectId: Id<'projects'>) => {
  const token = await convexAuthNextjsToken()
  const project = await fetchQuery(api.project.getProject, { projectId }, { token })
  const parsed = ReferenceBriefSchema.safeParse(project?.referenceBrief)
  return {
    brief: parsed.success ? parsed.data : null,
    key: (project?.referenceBriefKey as string | undefined) ?? null,
  }
}

/** The brand a design is being made for, or null when brand mode is off. */
export const BrandQuery = async (projectId: Id<'projects'>) => {
  const token = await convexAuthNextjsToken()
  return await fetchQuery(api.project.getBrand, { projectId }, { token })
}

/** Reference images the design generation should take its look from. */
export const InspirationImagesQuery = async (projectId: Id<'projects'>) => {
  const token = await convexAuthNextjsToken()
  const images = await fetchQuery(api.inspiration.getInspirationImages, { projectId }, { token })
  return images.map((image) => image.url).filter(Boolean)
}

/** The mood board images a generation run should look at. */
export const MoodBoardImagesQuery = async (projectId: Id<'projects'>) => {
  const token = await convexAuthNextjsToken()
  return await fetchQuery(api.moodboard.getMoodboardImages, { projectId }, { token })
}

/** Server-side fetch for the dashboard: the signed-in profile and their projects. */
export const ProjectsQuery = async () => {
  const token = await convexAuthNextjsToken()
  const profile = await fetchQuery(api.user.getCurrentUser, {}, { token })
  if (!profile) return { profile: null, projects: [] }

  const data = await fetchQuery(api.project.getProjects, {}, { token })
  return { profile, projects: data.projects }
}
