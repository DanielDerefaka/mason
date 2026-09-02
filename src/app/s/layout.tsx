import { AppProviders } from '@/components/app-providers'

/**
 * A shared design is read through the Convex client in the browser: the
 * screen subscribes to the share with `useQuery` and counts the open with a
 * mutation. So this route mounts the app's providers itself, one of four
 * layouts that do; the root mounts none, which is what lets the marketing
 * pages prerender. The route was dynamic before this and stays so: its
 * metadata fetches the share by token on every request.
 */
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>
}
