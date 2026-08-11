'use client'

import { useMutation, useQuery } from 'convex/react'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

/**
 * Who the design is being made for.
 *
 * A reference answers "how should this look"; this answers "what is it". They
 * are different questions, and without the second the model invents a company
 * every time — which is why generated pages arrive named Meridian or Verdant,
 * describing a product nobody asked for.
 *
 * Off by default. Somebody exploring a look should not have to declare a brand
 * before they can generate anything.
 */
export const BrandPanel = ({ projectId }: { projectId: Id<'projects'> | null }) => {
  const project = useQuery(api.project.getProject, projectId ? { projectId } : 'skip')
  const setBrand = useMutation(api.project.setBrand)
  const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
  const resolveStorageUrl = useMutation(api.moodboard.resolveStorageUrl)

  const stored = project?.brand
  const [enabled, setEnabled] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const input = useRef<HTMLInputElement | null>(null)

  // Hydrate once the project arrives, and never again — re-syncing on every
  // query update would overwrite what is being typed.
  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current || !stored) return
    hydrated.current = true
    setEnabled(stored.enabled)
    setName(stored.name ?? '')
    setDescription(stored.description ?? '')
    setLogo(stored.logo ?? null)
  }, [stored])

  useEffect(() => {
    if (!logo) return setLogoUrl(null)
    void resolveStorageUrl({ storageId: logo }).then(setLogoUrl).catch(() => setLogoUrl(null))
  }, [logo, resolveStorageUrl])

  /** Saved on blur rather than per keystroke — a mutation per letter is waste. */
  const persist = (next: Partial<{ enabled: boolean; name: string; description: string; logo: string | null }>) => {
    if (!projectId) return
    void setBrand({
      projectId,
      brand: {
        enabled: next.enabled ?? enabled,
        name: next.name ?? name,
        description: next.description ?? description,
        logo: next.logo !== undefined ? next.logo : logo,
      },
    }).catch(() => toast.error('Could not save the brand'))
  }

  const uploadLogo = async (file: File | undefined) => {
    if (!file || !projectId) return
    if (!file.type.startsWith('image/')) return toast.error('That is not an image')

    setUploading(true)
    try {
      const url = await generateUploadUrl()
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!response.ok) throw new Error('upload failed')
      const { storageId } = (await response.json()) as { storageId: string }
      setLogo(storageId)
      persist({ logo: storageId })
      toast.success('Logo added')
    } catch {
      toast.error('Could not upload that logo')
    } finally {
      setUploading(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <section className="border-t border-white/[0.08] pt-4">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-xs font-medium">Design for my brand</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked)
            persist({ enabled: event.target.checked })
          }}
          className="size-4 accent-white"
        />
      </label>

      <p className="text-muted-foreground mt-1.5 text-[11px] leading-relaxed">
        Off, the model invents a company. On, it uses yours — in the copy, the nav and
        the footer.
      </p>

      <div className={cn('mt-3 space-y-2.5', !enabled && 'pointer-events-none opacity-40')}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => persist({})}
          placeholder="Brand name"
          className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs outline-none placeholder:text-white/30 focus:border-white/25"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => persist({})}
          rows={3}
          placeholder="What it does, and who for. One or two sentences is plenty."
          className="w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs outline-none placeholder:text-white/30 focus:border-white/25"
        />

        <div className="flex items-center gap-2">
          {logoUrl ? (
            <span className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" className="h-5 w-auto max-w-[90px] object-contain" />
              <span className="text-muted-foreground truncate text-[11px]">Logo</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={uploading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 px-2 py-2 text-[11px] text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              Upload a logo
            </button>
          )}

          {logo && (
            <button
              type="button"
              aria-label="Remove the logo"
              onClick={() => {
                setLogo(null)
                persist({ logo: null })
              }}
              className="grid size-8 shrink-0 place-items-center rounded-md text-red-400 transition-colors hover:bg-red-500/15"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>

        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => void uploadLogo(event.target.files?.[0])}
        />
      </div>
    </section>
  )
}
