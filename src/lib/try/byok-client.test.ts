import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BYOK_CHANGED_EVENT,
  clearByokKey,
  getByokKey,
  getByokWorkspace,
  looksLikeAnthropicKey,
  looksLikeWorkspaceId,
  setByokKey,
} from './byok-client'

const KEY = 'sk-ant-api03-0123456789abcdefghijklmnop'

describe('the stored Anthropic key', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('keeps a key for the tab and hands it back', () => {
    setByokKey(KEY)
    expect(getByokKey()).toBe(KEY)
    clearByokKey()
    expect(getByokKey()).toBeNull()
  })

  it('trims what it is given', () => {
    setByokKey(`  ${KEY}  `)
    expect(getByokKey()).toBe(KEY)
  })

  it('recognises the shape of a key without asking Anthropic', () => {
    expect(looksLikeAnthropicKey(KEY)).toBe(true)
    expect(looksLikeAnthropicKey('sk-ant-short')).toBe(false)
    expect(looksLikeAnthropicKey('sk-proj-0123456789abcdefghijklmnop')).toBe(false)
  })

  describe('the workspace beside it', () => {
    /**
     * Anthropic's identity-linked keys refuse every request that does not
     * name a workspace, and nothing in the key says whether it is one of
     * those — so this is optional, and stored and cleared with the key.
     */
    it('keeps a workspace when one is given', () => {
      setByokKey(KEY, 'wrkspc_01ABCDEF')
      expect(getByokWorkspace()).toBe('wrkspc_01ABCDEF')
    })

    it('has none when the key was pasted on its own', () => {
      setByokKey(KEY)
      expect(getByokWorkspace()).toBeNull()
    })

    it('forgets the old workspace when a key is replaced without one', () => {
      // The regression this guards: a workspace left over from a previous key
      // is sent alongside the next one, and a key belonging to a different
      // account is then refused for a reason nobody could guess.
      setByokKey(KEY, 'wrkspc_01ABCDEF')
      setByokKey(KEY)
      expect(getByokWorkspace()).toBeNull()
    })

    it('goes when the key goes', () => {
      setByokKey(KEY, 'wrkspc_01ABCDEF')
      clearByokKey()
      expect(getByokKey()).toBeNull()
      expect(getByokWorkspace()).toBeNull()
    })

    it('recognises the shape the server will accept', () => {
      expect(looksLikeWorkspaceId('wrkspc_01ABCDEF')).toBe(true)
      expect(looksLikeWorkspaceId('  wrkspc_01ABCDEF  ')).toBe(true)
      expect(looksLikeWorkspaceId('abc')).toBe(false)
      expect(looksLikeWorkspaceId('wrkspc 01ABCDEF')).toBe(false)
    })
  })

  describe('announcing a change', () => {
    /**
     * The regression this exists for: the header's "Key added" pill read the
     * key once on mount, so when a 401 from Anthropic made the client discard
     * a rejected key mid-generation, the pill went on claiming a key that was
     * no longer there — and the next click quietly spent house credits.
     */
    it('tells listeners when a key is stored', () => {
      const heard = vi.fn()
      window.addEventListener(BYOK_CHANGED_EVENT, heard)
      setByokKey(KEY)
      window.removeEventListener(BYOK_CHANGED_EVENT, heard)
      expect(heard).toHaveBeenCalledTimes(1)
    })

    it('tells listeners when a key is thrown away', () => {
      setByokKey(KEY)
      const heard = vi.fn()
      window.addEventListener(BYOK_CHANGED_EVENT, heard)
      clearByokKey()
      window.removeEventListener(BYOK_CHANGED_EVENT, heard)
      expect(heard).toHaveBeenCalledTimes(1)
    })

    it('reports the storage, not the event — a listener that re-reads sees the truth', () => {
      let seen: string | null = 'unread'
      const listener = () => {
        seen = getByokKey()
      }
      window.addEventListener(BYOK_CHANGED_EVENT, listener)
      setByokKey(KEY)
      expect(seen).toBe(KEY)
      clearByokKey()
      expect(seen).toBeNull()
      window.removeEventListener(BYOK_CHANGED_EVENT, listener)
    })
  })
})
