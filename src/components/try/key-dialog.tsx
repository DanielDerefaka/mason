'use client'

import { useMutation } from 'convex/react'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { clearByokKey, looksLikeAnthropicKey, setByokKey } from '@/lib/try/byok-client'

import { api } from '../../../convex/_generated/api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  stored: boolean
}

/**
 * Bring-your-own-key. The key goes into sessionStorage and rides along on
 * generation requests as a header; the server forwards it to Anthropic and
 * keeps nothing. `markKeyAdded` only records that a guest chose this path —
 * the key itself never reaches Convex.
 */
export const KeyDialog = ({ open, onOpenChange, stored }: Props) => {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const markKeyAdded = useMutation(api.guest.markKeyAdded)

  const save = async () => {
    const key = value.trim()
    if (!looksLikeAnthropicKey(key)) {
      setError('That does not look like an Anthropic key — they start with sk-ant-')
      return
    }
    // No callback back to the shell: `setByokKey` announces the change, and
    // the shell listens for it — the same path a key cleared by a 401 takes.
    setByokKey(key)
    setValue('')
    setError(null)
    onOpenChange(false)
    toast.success('Key added — your generations now use it')
    try {
      await markKeyAdded({})
    } catch {
      // Analytics only; a guest who added a key must not be told otherwise.
    }
  }

  const remove = () => {
    clearByokKey()
    onOpenChange(false)
    toast('Key removed')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="dark max-w-md gap-0 overflow-hidden border-white/10 bg-background p-0 text-foreground">
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-muted-foreground" />
            {stored ? 'Your Anthropic key' : 'Add your Anthropic key'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Used only for your own generations, sent straight to Anthropic, never stored — it
            lives in this tab and is gone when you close it.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3 px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <label className="sr-only" htmlFor="try-byok-key">
            Anthropic API key
          </label>
          <input
            id="try-byok-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              if (error) setError(null)
            }}
            placeholder={stored ? 'Paste a different key to replace it' : 'sk-ant-…'}
            aria-invalid={error ? true : undefined}
            className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 font-mono text-sm outline-none placeholder:font-sans placeholder:text-muted-foreground/70 focus:border-white/25 aria-[invalid]:border-red-400/60"
          />
          {error && <p className="text-xs text-red-300">{error}</p>}
          <div className="flex items-center justify-between gap-2 pt-1">
            {stored ? (
              <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={remove}>
                Remove key
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm" className="rounded-full px-4" disabled={value.trim().length === 0}>
              {stored ? 'Replace key' : 'Use this key'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
