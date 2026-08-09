import { SharedDesign } from '@/components/share/shared-design'

export const metadata = {
  title: 'Shared design | Mason',
  // A share link is unguessable but not secret enough to want indexed.
  robots: { index: false, follow: false },
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <SharedDesign token={token} />
}
