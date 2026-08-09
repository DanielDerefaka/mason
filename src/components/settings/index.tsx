'use client'

import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthentication } from '@/hooks/use-auth'
import { api } from '../../../convex/_generated/api'

/**
 * Account settings.
 *
 * Deliberately small: it shows what the app actually stores and lets you
 * change the one field that is safe to change. Anything that would need a
 * flow this app has not got — email changes, deletion, plan management — says
 * so plainly instead of offering a control that fails.
 */
export const SettingsView = () => {
  const user = useQuery(api.user.getCurrentUser)
  const credits = useQuery(api.credits.getBalance)
  const updateProfile = useMutation(api.user.updateProfile)
  const { handleSignOut } = useAuthentication()

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  // Seeded once the query resolves. Without the guard the field would be
  // clobbered back to the stored value on every re-render while typing.
  useEffect(() => {
    if (user?.name != null) setName(user.name)
  }, [user?.name])

  const loading = user === undefined
  const dirty = user != null && name.trim() !== (user.name ?? '') && name.trim().length > 0

  const onSave = async () => {
    setSaving(true)
    try {
      await updateProfile({ name })
      toast.success('Profile updated')
    } catch {
      toast.error('Could not save that name')
    } finally {
      setSaving(false)
    }
  }

  const initials = (user?.name ?? '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to projects
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">Settings</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Your account, and what it can spend.
      </p>

      {loading ? (
        <div className="text-muted-foreground mt-10 flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <Section title="Profile">
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                {user?.image ? <AvatarImage src={user.image} alt={user.name ?? 'You'} /> : null}
                <AvatarFallback className="text-sm">{initials || '—'}</AvatarFallback>
              </Avatar>
              <p className="text-muted-foreground text-xs">
                Avatars come from your auth provider. Password accounts do not have
                one, so initials are used.
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <Label htmlFor="name" className="text-sm">
                Display name
              </Label>
              <Input
                id="name"
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              {/* readOnly, not disabled: disabled dims the text to roughly
                  placeholder contrast, so a real address reads as an empty
                  field. */}
              <Input
                id="email"
                value={user?.email ?? ''}
                readOnly
                aria-readonly
                className="bg-white/[0.03] focus-visible:ring-0"
              />
              <p className="text-muted-foreground text-xs">
                Your email is how you sign in, so it cannot be changed here — that
                needs a verification step this app does not have yet.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={() => void onSave()} disabled={!dirty || saving} size="sm">
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </Section>

          <Section title="Credits">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {credits == null ? '—' : credits}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  One credit per generation — a style guide, a screen, a page in a
                  flow, or a revision. Drawing on the canvas is free.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-xs">
              There is no way to buy more yet. Top-ups land when billing does.
            </p>
          </Section>

          <Section title="Session">
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">
                Signed in as {user?.email ?? 'this account'}.
              </p>
              <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
            </div>
          </Section>
        </div>
      )}
    </main>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
    <h2 className="mb-4 text-sm font-medium">{title}</h2>
    {children}
  </section>
)

export default SettingsView
