'use client'

import { Check, CloudOff, Loader2 } from 'lucide-react'
import { useAutosave } from '@/hooks/use-autosave'

const LABELS = {
  idle: null,
  unsaved: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Could not save',
} as const

export const AutoSave = () => {
  const { status } = useAutosave()
  const label = LABELS[status]
  if (!label) return null

  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
      {status === 'saving' && <Loader2 className="size-3 animate-spin" />}
      {status === 'saved' && <Check className="size-3 text-mint" />}
      {status === 'error' && <CloudOff className="text-coral size-3" />}
      {label}
    </span>
  )
}

export default AutoSave
