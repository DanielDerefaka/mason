'use client'

import { useConvex, useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { BYOK_CHANGED_EVENT, getByokKey } from '@/lib/try/byok-client'
import {
  DESIGN_GENERATED_EVENT,
  OUT_OF_CREDITS_EVENT,
  type DesignGeneratedDetail,
} from '@/lib/try/generate-fetch'
import { nextResetAt } from '@/lib/try/pool-day'
import { remixSketch, type RemixPayload } from '@/lib/try/remix'
import { useAppDispatch, useAppStore } from '@/redux/hooks'
import { addShape, focusOnRect, selectShape, shapesAdapter, type Shape } from '@/redux/slice/shapes'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { TryGuestGate } from './guest-gate'
import { TryHeader } from './header'
import { InstructionBar } from './instruction-bar'
import { KeyDialog } from './key-dialog'
import { OutOfCreditsSheet } from './out-of-credits-sheet'
import { uploadBlob } from './upload'
import { useShareOnX } from './use-share-on-x'

const STORAGE_KEY = 'mason-try-project'
const selectors = shapesAdapter.getSelectors()

const readStored = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const writeStored = (id: string) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Private mode; the URL still carries the id for this tab.
  }
}

/**
 * Settles which project the canvas shows and makes the URL agree.
 *
 * The id in the URL is trusted only after `getProject` says it is ours —
 * `useQuery` throws on a malformed id and returns null for someone else's,
 * and "/try?project=x" must open a canvas, not an error boundary. The
 * fallback is the project remembered from last time, then a fresh one.
 *
 * The canvas itself reads `?project=` from the URL, so the hook reports a
 * project only once the URL carries the validated id; between the replace
 * and the router catching up it reports nothing, and the effect waits rather
 * than validating the stale URL a second time.
 */
const useTryProject = () => {
  const convex = useConvex()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const createProject = useMutation(api.project.createProject)
  const urlProject = searchParams.get('project')

  const [validated, setValidated] = useState<Id<'projects'> | null>(null)
  const [failed, setFailed] = useState(false)
  const resolving = useRef(false)
  const awaitingUrl = useRef<string | null>(null)

  useEffect(() => {
    if (urlProject && urlProject === validated) {
      awaitingUrl.current = null
      return
    }
    if (awaitingUrl.current && urlProject !== awaitingUrl.current) return
    if (resolving.current) return
    resolving.current = true

    const resolve = async () => {
      const candidates = [urlProject, readStored()].filter((id): id is string => Boolean(id))
      let found: Id<'projects'> | null = null
      for (const candidate of candidates) {
        try {
          const project = await convex.query(api.project.getProject, {
            projectId: candidate as Id<'projects'>,
          })
          if (project) {
            found = project._id
            break
          }
        } catch {
          // Malformed or foreign: not ours, try the next.
        }
      }
      if (!found) {
        try {
          found = await createProject({ name: 'My sketch' })
        } catch {
          setFailed(true)
          return
        }
      }
      writeStored(found)
      setValidated(found)
      if (urlProject !== found) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('project', found)
        awaitingUrl.current = found
        router.replace(`${pathname}?${params.toString()}`)
      }
    }

    void resolve().finally(() => {
      resolving.current = false
    })
  }, [urlProject, validated, convex, createProject, router, pathname, searchParams])

  return {
    projectId: urlProject && urlProject === validated ? validated : null,
    failed,
  }
}

const TryWorkspace = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const convex = useConvex()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const me = useQuery(api.guest.me)
  const pool = useQuery(api.pool.status)
  const { projectId, failed: projectFailed } = useTryProject()
  const project = useQuery(api.project.getProject, projectId ? { projectId } : 'skip')
  const share = useShareOnX({ projectId, me })

  const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
  const publish = useMutation(api.explore.publish)
  const recordRemix = useMutation(api.explore.recordRemix)

  const [keyOpen, setKeyOpen] = useState(false)
  const [keyStored, setKeyStored] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  // Read on mount and again whenever anything changes it — the key dialog,
  // or a 401 from Anthropic that made `noteGenerateRefusal` discard a key
  // this header would otherwise still be advertising.
  useEffect(() => {
    const sync = () => setKeyStored(Boolean(getByokKey()))
    sync()
    window.addEventListener(BYOK_CHANGED_EVENT, sync)
    return () => window.removeEventListener(BYOK_CHANGED_EVENT, sync)
  }, [])

  // Item 5: a refused generation raises the sheet.
  useEffect(() => {
    const open = () => setSheetOpen(true)
    window.addEventListener(OUT_OF_CREDITS_EVENT, open)
    return () => window.removeEventListener(OUT_OF_CREDITS_EVENT, open)
  }, [])

  // Item 6: every finished guest design goes to Explore. `explore.publish`
  // reads the design out of the saved project, and autosave debounces, so a
  // generation is queued here and published once the live project shows it
  // saved and complete — publishing straight off the event would find the
  // design still streaming, or not there at all.
  //
  // Guests only: the gallery is the price of the free pool, and a guest is
  // told so and can hide each design. A signed-in user on /try has paid for
  // their credits and never agreed to a public gallery; they can still opt a
  // design in with the same "Show in Explore" switch.
  const [toPublish, setToPublish] = useState<DesignGeneratedDetail[]>([])
  useEffect(() => {
    const onGenerated = (event: Event) => {
      const detail = (event as CustomEvent<DesignGeneratedDetail>).detail
      if (!detail?.designId) return
      setToPublish((queue) => [...queue, detail])
    }
    window.addEventListener(DESIGN_GENERATED_EVENT, onGenerated)
    return () => window.removeEventListener(DESIGN_GENERATED_EVENT, onGenerated)
  }, [])

  useEffect(() => {
    if (!project || !projectId || toPublish.length === 0) return
    // `me` is still loading: keep the queue rather than decide on a guess.
    if (me === undefined) return
    if (!me?.isGuest) {
      setToPublish([])
      return
    }
    const saved = ((project.sketchesData ?? {}) as { shapes?: Shape[] }).shapes ?? []
    const ready = toPublish.filter((detail) => {
      const design = saved.find((shape) => shape.id === detail.designId)
      return design !== undefined && !design.streaming && (design.html?.length ?? 0) >= 40
    })
    if (ready.length === 0) return
    setToPublish((queue) => queue.filter((detail) => !ready.includes(detail)))

    for (const detail of ready) {
      const frame = saved.find((shape) => shape.id === detail.frameId)
      void (async () => {
        try {
          const sketchStorageId = await uploadBlob(() => generateUploadUrl({}), detail.sketch)
          await publish({
            projectId,
            designId: detail.designId,
            instruction: frame?.instruction || undefined,
            sketchStorageId: sketchStorageId ?? undefined,
          })
          toast.success("Published to Explore — you can hide it from the design's menu")
        } catch {
          // The design is on the canvas either way; Explore is a bonus.
        }
      })()
    }
  }, [project, projectId, toPublish, me, generateUploadUrl, publish])

  // Item 7: ?remix=<galleryId> copies a gallery sketch onto this canvas.
  // The canvas hydrates from `getProject` in a child effect, which runs
  // before this one, but `setShapes` still has to land before we add to it
  // — hence waiting for the same query here and then one more tick.
  const remixId = searchParams.get('remix')
  const remixed = useRef<string | null>(null)
  const hydratedSource = project !== undefined
  useEffect(() => {
    if (!remixId || !projectId || !hydratedSource) return
    const timer = setTimeout(() => {
      if (remixed.current === remixId) return
      remixed.current = remixId

      const stripParam = () => {
        const params = new URLSearchParams(window.location.search)
        params.delete('remix')
        router.replace(`${pathname}?${params.toString()}`)
      }

      void (async () => {
        try {
          const item = await convex.query(api.explore.get, { id: remixId as Id<'gallery'> })
          if (!item) {
            toast.error('That sketch is no longer in Explore')
            return
          }
          // `.shapes.entities`, not `.shapes`: `selectAll` wants the adapter
          // state, and handed the slice it read an `ids` that is not there
          // and threw — which the catch below turned into "Could not copy
          // that sketch", so remix from Explore never once worked.
          const existing = selectors.selectAll(store.getState().shapes.entities)
          // The gallery stores the same shape records the canvas does; the
          // server only types them loosely.
          const shapes = remixSketch(
            item.sketch as unknown as RemixPayload,
            existing,
            item.instruction ?? undefined,
          )
          for (const shape of shapes) dispatch(addShape(shape))
          const frame = shapes[0]
          if (frame) {
            dispatch(selectShape(frame.id))
            dispatch(
              focusOnRect({
                x: frame.x,
                y: frame.y,
                width: frame.width,
                height: frame.height,
                viewWidth: window.innerWidth,
                viewHeight: Math.max(240, window.innerHeight - 120),
              }),
            )
          }
          recordRemix({ id: item.id }).catch(() => {})
          toast.success('Sketch copied to your canvas — press Generate on the frame')
        } catch {
          toast.error('Could not copy that sketch')
        } finally {
          stripParam()
        }
      })()
    }, 50)
    return () => clearTimeout(timer)
  }, [remixId, projectId, hydratedSource, convex, dispatch, store, recordRemix, router, pathname])

  return (
    <>
      <TryHeader me={me} keyStored={keyStored} onAddKey={() => setKeyOpen(true)} share={share} />
      <InstructionBar />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {projectId ? (
          children
        ) : projectFailed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">Could not open a canvas.</p>
            <Button size="sm" className="rounded-full px-4" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <KeyDialog open={keyOpen} onOpenChange={setKeyOpen} stored={keyStored} />
      <OutOfCreditsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        share={share}
        onAddKey={() => setKeyOpen(true)}
        resetsAt={pool?.resetsAt ?? nextResetAt()}
      />
    </>
  )
}

/**
 * The /try canvas page: guest session, header, instruction bar and the
 * canvas beneath. Whatever renders the canvas must sit inside the gate,
 * because the gate is the GuestProvider the export gate asks.
 */
export const TryShell = ({ children }: { children: ReactNode }) => (
  <TryGuestGate>
    <TryWorkspace>{children}</TryWorkspace>
  </TryGuestGate>
)
