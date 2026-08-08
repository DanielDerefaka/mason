type Props = { params: Promise<{ session: string }> }

export default async function SessionPage({ params }: Props) {
  const { session } = await params

  return (
    <main className="flex-1 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <p className="text-muted-foreground mt-1 text-sm">Signed in as {session}</p>
    </main>
  )
}
