import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Row = { _id: string; createdAt: number; origin: string }

let rows: Row[] | undefined
const restore = vi.fn()

vi.mock('convex/react', () => ({
  useQuery: () => rows,
  useMutation: () => restore,
}))

const { HistoryButton } = await import('./history')

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const mount = (props: Record<string, unknown>) => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  act(() => {
    root.render(createElement(HistoryButton, props as never))
  })
  return host
}

const open = (host: HTMLElement) => {
  const button = host.querySelector<HTMLButtonElement>('[aria-label="Version history"]')
  expect(button, 'the history control is on the artboard header').not.toBeNull()
  act(() => {
    button!.click()
  })
}

beforeEach(() => {
  rows = []
  restore.mockReset()
  document.body.innerHTML = ''
})

const props = {
  projectId: 'project_1',
  designId: 'design_1',
  currentHtml: () => '<p>now</p>',
  onRestore: vi.fn(),
}

describe('the history panel', () => {
  it('shows nothing until it is opened', () => {
    const host = mount(props)
    expect(host.textContent).not.toContain('History')
  })

  /**
   * The empty state is what somebody sees the first time they come looking for
   * a way back, so it says what will be kept rather than that nothing has
   * been. "No versions yet" is true and useless.
   */
  it('says what it will keep rather than that it is empty', () => {
    const host = mount(props)
    open(host)
    expect(host.textContent).toContain('The first change you make')
  })

  /** The one entry the panel exists to offer, and the only one with a name. */
  it('names the state the design was in before anybody edited it', () => {
    rows = [{ _id: 'v1', createdAt: Date.now() - 60_000, origin: 'original' }]
    const host = mount(props)
    open(host)
    expect(host.textContent).toContain('Before your first edit')
  })

  it('dates an ordinary snapshot instead of naming it', () => {
    rows = [{ _id: 'v1', createdAt: Date.parse('2026-09-02T14:32:00Z'), origin: 'edit' }]
    const host = mount(props)
    open(host)
    expect(host.textContent).not.toContain('Before')
    expect(host.textContent).toMatch(/2 Sep/)
  })

  /**
   * What shipped broken if this regresses: the mutation keeps a copy of
   * `current` before it hands back the older markup, so restoring the wrong
   * version is itself undoable. Reading the markup at the moment of the click
   * rather than at render is the whole reason it is passed as a function —
   * the design has been edited since the panel was opened.
   */
  it('hands the server the markup on screen and paints what comes back', async () => {
    rows = [{ _id: 'v1', createdAt: Date.now() - 60_000, origin: 'original' }]
    restore.mockResolvedValue({ html: '<p>then</p>', createdAt: 1 })
    const onRestore = vi.fn()
    const host = mount({ ...props, onRestore })
    open(host)

    const button = host.querySelector<HTMLButtonElement>('[aria-label="Restore this version"]')
    expect(button).not.toBeNull()
    await act(async () => {
      button!.click()
    })

    expect(restore).toHaveBeenCalledWith({ versionId: 'v1', current: '<p>now</p>' })
    expect(onRestore).toHaveBeenCalledWith('<p>then</p>')
  })

  it('leaves the design alone when the restore fails', async () => {
    rows = [{ _id: 'v1', createdAt: Date.now(), origin: 'edit' }]
    restore.mockRejectedValue(new Error('offline'))
    const onRestore = vi.fn()
    const host = mount({ ...props, onRestore })
    open(host)

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[aria-label="Restore this version"]')!.click()
    })

    expect(onRestore).not.toHaveBeenCalled()
  })
})

/**
 * The wiring the render above cannot see, pinned against the source.
 *
 * Every one of these is silently breakable: nothing throws, no test of the
 * rules fails, and the history simply fills up with rows that are no use.
 */
describe('what the editor and its hook do with the history', () => {
  const hook = () => read('src/hooks/use-design-editor.ts')
  const editor = () => read('src/components/editor/index.tsx')

  /**
   * The subtle one. A row has to be a state the design *was* in and has now
   * left, which means the markup offered is the one being replaced. Offering
   * the markup just written would fill the history with the state you are
   * already looking at, and every restore would be a no-op.
   */
  it('checkpoints the markup the design is leaving, not the one it just took', () => {
    const source = hook()
    expect(source).toMatch(/const previous = lastSaved\.current/)
    expect(source).toMatch(/offerCheckpoint\(previous\)/)
    expect(source).not.toMatch(/offerCheckpoint\(html\)/)
  })

  /**
   * Inside the save's `then`, so a save that failed cannot leave behind a row
   * describing a state the design never actually left.
   */
  it('only checkpoints after the save it follows has succeeded', () => {
    const source = hook()
    const saved = source.indexOf('lastSaved.current = html')
    const offered = source.indexOf('offerCheckpoint(previous)')
    const failed = source.indexOf("setStatus('error')")
    expect(saved).toBeGreaterThan(-1)
    expect(offered).toBeGreaterThan(saved)
    expect(offered).toBeLessThan(failed)
  })

  /** A failed checkpoint is not a failed edit; see the catch it must keep. */
  it('never lets a refused checkpoint surface as a save error', () => {
    expect(hook()).toMatch(/checkpoint\(\{[^}]*\}\)\s*\.catch\(/s)
  })

  it('offers the history from the editor header', () => {
    expect(editor()).toMatch(/<HistoryButton/)
  })

  /**
   * A stored row may predate the last tightening of either the sanitiser or
   * the id scheme, so it comes in the way the design itself does on first
   * paint. `restore` next to it replays markup from this session and is right
   * to skip both; this must not be collapsed into it.
   */
  it('sanitises and restamps a restored version rather than trusting it', () => {
    const source = editor()
    const start = source.indexOf('const onRestoreVersion')
    expect(start).toBeGreaterThan(-1)
    const body = source.slice(start, source.indexOf('\n  }', start))
    expect(body).toContain('sanitiseHtml(html)')
    expect(body).toContain('assignNodeIds(root)')
    // Before the paint, so one press of undo reverses a restore.
    expect(body.indexOf('snapshot()')).toBeLessThan(body.indexOf('root.innerHTML'))
  })
})
