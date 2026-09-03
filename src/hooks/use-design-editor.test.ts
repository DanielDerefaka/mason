import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// React wants to be told it is being driven by `act` rather than a browser.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))

vi.mock('convex/react', () => ({
  useQuery: () => ({
    sketchesData: { shapes: [{ id: 'd1', type: 'generated-ui', html: '<p>a</p>', width: 1440 }] },
  }),
  useMutation: () => mutate,
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('project=p1&design=d1'),
}))
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))

import { useDesignEditor } from './use-design-editor'

type Api = ReturnType<typeof useDesignEditor>

/** Every mutation that wrote the design back, with the markup it carried. */
const writes = () =>
  mutate.mock.calls
    .filter(([args]) => 'sketchesData' in (args as object))
    .map(([args]) => (args as { sketchesData: { shapes: { html: string }[] } }).sketchesData.shapes[0].html)

const mount = async () => {
  let api: Api | null = null
  const Probe = () => {
    api = useDesignEditor()
    return null
  }
  const host = document.createElement('div')
  const root = createRoot(host)
  await act(async () => root.render(createElement(Probe)))
  return {
    api: () => api as Api,
    unmount: () => act(async () => root.unmount()),
  }
}

beforeEach(() => {
  mutate.mockReset()
  mutate.mockResolvedValue(undefined)
  // Only the debounce. React's own `act` schedules through setImmediate, and
  // faking that would leave it waiting on a clock nobody advances.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the editor save', () => {
  /**
   * What shipped broken: the save is debounced by 900ms and unmounting used to
   * clear the timer and nothing else. Pressing "Back to the canvas" inside
   * that second lost the last edit: the header still said Unsaved changes as
   * the editor was torn down, and nothing read it.
   */
  it('sends the last edit when the editor unmounts inside the debounce', async () => {
    const { api, unmount } = await mount()

    await act(async () => api().saveHtml('<p>b</p>'))
    expect(writes()).toEqual([])

    await unmount()
    expect(writes()).toEqual(['<p>b</p>'])
  })

  it('sends it once: a flush before leaving leaves the cleanup nothing', async () => {
    const { api, unmount } = await mount()

    await act(async () => api().saveHtml('<p>b</p>'))
    await act(async () => api().flush())
    await unmount()

    expect(writes()).toEqual(['<p>b</p>'])
  })

  /**
   * What shipped broken: "Could not save" was the end of it. The next edit
   * retried, but somebody who has stopped editing because it failed makes no
   * next edit, and there was nothing to press.
   */
  it('retries what a failed save was carrying', async () => {
    // The first save fails; the thumbnail the editor asks for on mount goes
    // through the same mutation function and is not the call under test.
    let failed = false
    mutate.mockImplementation((args: { sketchesData?: unknown }) => {
      if ('sketchesData' in args && !failed) {
        failed = true
        return Promise.reject(new Error('offline'))
      }
      return Promise.resolve(undefined)
    })
    const { api } = await mount()

    await act(async () => api().saveHtml('<p>b</p>'))
    await act(async () => {
      vi.advanceTimersByTime(900)
    })
    expect(api().status).toBe('error')

    await act(async () => api().retry())
    expect(writes()).toEqual(['<p>b</p>', '<p>b</p>'])
    expect(api().status).toBe('saved')
  })

  /**
   * Undo back to what is stored. A write still queued for the markup in
   * between would put the wrong state over the right one, and then say Saved.
   */
  it('cancels a queued write when the markup returns to what is stored', async () => {
    const { api } = await mount()

    await act(async () => api().saveHtml('<p>b</p>'))
    await act(async () => api().saveHtml('<p>a</p>'))
    await act(async () => {
      vi.advanceTimersByTime(900)
    })

    expect(writes()).toEqual([])
    expect(api().status).toBe('saved')
  })
})
