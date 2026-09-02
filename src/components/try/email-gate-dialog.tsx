'use client'

import { useMutation } from 'convex/react'
import { Loader2, Mail } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Field } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { looksLikeEmail } from '@/lib/try/email'
import { refusalFrom } from '@/lib/try/guest-refusal'

import { api } from '../../../convex/_generated/api'

/**
 * Why the address is being asked for. The same box and the same list either
 * way; only the title and the button change, because a dialog titled
 * "Download your design" over a "tell me when accounts open" request is a
 * lie in the other direction.
 */
export type EmailGatePurpose = 'export' | 'notify'

const COPY: Record<EmailGatePurpose, { title: string; action: string }> = {
  export: { title: 'Download your design', action: 'Download' },
  notify: { title: 'Tell me when accounts open', action: 'Tell me when' },
}

/**
 * What a guest is asked for in exchange for a download, and what the "tell me
 * when" buttons open.
 *
 * It replaces the account the export gate used to demand. A trial whose whole
 * promise is "no account needed" cannot demand one at the only moment the
 * work is worth something — so this takes an address, writes it to `emails`,
 * and never asks that session again.
 *
 * The title used to be "Where should we send your work?", and nothing was
 * ever sent: the download happens in the browser, and the address goes on
 * the launch list. It says what the address is for now, in as many words.
 *
 * There is deliberately no password and no "sign in instead" here. During
 * the free week accounts are not on offer at all, so there is nothing for a
 * password to make and nowhere for a sign-in link to go; outside it the
 * header's "Sign in" and the "Keep this canvas" button are the doors to an
 * account, and this box is not one of them. The address is the entire
 * transaction.
 */
export const EmailGateDialog = ({
  open,
  purpose,
  onDone,
}: {
  open: boolean
  purpose: EmailGatePurpose
  onDone: (ok: boolean) => void
}) => {
  const recordEmail = useMutation(api.guest.recordEmail)
  const searchParams = useSearchParams()

  /**
   * Seeded from `?email=`, which is where the marketing footer puts it.
   *
   * That form is a plain GET aimed at /try, so an address typed into it used
   * to be carried all the way here and thrown away.
   */
  const [email, setEmail] = useState(() => {
    const arriving = searchParams.get('email')?.trim() ?? ''
    return arriving.includes('@') ? arriving : ''
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!looksLikeEmail(email)) {
      setError('That does not look like an email address')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await recordEmail({ email, source: purpose })
    } catch (caught) {
      // The server reads the address more strictly than the box does, and
      // its refusal arrives as a code rather than the masked "Server Error"
      // a plain throw would be.
      if (refusalFrom(caught) === 'bad-email') {
        setBusy(false)
        setError('That does not look like an email address')
        return
      }
      if (purpose === 'notify') {
        // Nothing was written, so there is nothing to promise.
        setBusy(false)
        setError('Could not save that address just now. Try again in a moment.')
        return
      }
      // The download is the promise; the list is our bookkeeping. Failing the
      // one because the other could not be written would be the wrong way
      // round — and the gate simply asks again next time.
    }
    setBusy(false)
    onDone(true)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onDone(false)
      }}
    >
      <DialogContent className="dark max-w-md gap-0 overflow-hidden border-white/10 bg-background p-0 text-foreground">
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <DialogTitle className="text-base">{COPY[purpose].title}</DialogTitle>
          <DialogDescription className="text-xs">
            Leave an email and we will tell you when accounts open. We send nothing else, and we
            only ask once.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3 px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Field
            id="try-gate-email"
            label="Email"
            icon={<Mail className="size-4" />}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (error) setError(null)
            }}
            required
          />
          {error && (
            <p role="alert" className="text-xs text-red-300">
              {error}
            </p>
          )}
          <Button type="submit" className="mt-1 rounded-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {COPY[purpose].action}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
