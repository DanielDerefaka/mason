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

import { api } from '../../../convex/_generated/api'

/**
 * What the free week asks for in exchange for a download.
 *
 * It replaces the account the export gate used to demand. A trial whose whole
 * promise is "no account needed" cannot demand one at the only moment the
 * work is worth something — so this takes an address, writes it to `emails`,
 * and never asks that session again.
 *
 * There is deliberately no password, no "sign in instead", and no way to end
 * up on an auth screen from here. The address is the entire transaction.
 */
export const EmailGateDialog = ({
  open,
  onDone,
}: {
  open: boolean
  onDone: (ok: boolean) => void
}) => {
  const recordEmail = useMutation(api.guest.recordEmail)
  const searchParams = useSearchParams()

  /**
   * Seeded from `?email=`, which is where the marketing footer puts it.
   *
   * That form is a plain GET aimed at /try during the week, so an address
   * typed into it used to be carried all the way here and thrown away.
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
      await recordEmail({ email, source: 'export' })
    } catch {
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
          <DialogTitle className="text-base">Where should we send your work?</DialogTitle>
          <DialogDescription className="text-xs">
            No account, no password — just an email so we can tell you when Mason opens
            properly. We only ask this once.
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
            Download
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
