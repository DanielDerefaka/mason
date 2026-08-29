import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { DEFAULT_GUEST_SESSIONS_PER_IP_PER_DAY, limitFromEnv } from './limits'

describe('reading a limit from the environment', () => {
  it('falls back when the variable is unset', () => {
    expect(limitFromEnv(undefined, 10)).toBe(10)
  })

  /**
   * The regression this exists for. `Number('')` is `0`, and zero is a value
   * both of these limits accept — so a variable set to nothing at all read as
   * a deliberate zero. `npx convex env set COMMUNITY_POOL_SIZE ""` would have
   * emptied the community pool, or `GUEST_SESSIONS_PER_IP_PER_DAY ""` refused
   * every new guest on the site, with every test and every smoke check green.
   */
  it.each(['', '   ', '\n'])('treats %j as unset rather than as zero', (raw) => {
    expect(limitFromEnv(raw, 10)).toBe(10)
  })

  it('takes a real zero, which is how the week is shut off in a hurry', () => {
    expect(limitFromEnv('0', 10)).toBe(0)
  })

  it('takes the number the deployment asked for', () => {
    expect(limitFromEnv('40', 10)).toBe(40)
    expect(limitFromEnv('1', 10)).toBe(1)
  })

  it('floors a fraction rather than admitting half a visitor', () => {
    expect(limitFromEnv('12.7', 10)).toBe(12)
  })

  it.each(['ten', 'NaN', '-1', 'Infinity', '1e999'])(
    'ignores %j and keeps the default',
    (raw) => {
      expect(limitFromEnv(raw, 10)).toBe(10)
    },
  )

  it('keeps ten as the shipped default, so setting nothing changes nothing', () => {
    expect(DEFAULT_GUEST_SESSIONS_PER_IP_PER_DAY).toBe(10)
  })
})

/**
 * That the limits are actually read this way, and not read once into a
 * constant somewhere.
 *
 * A cap that can only be changed by a deploy is a cap that will not be changed
 * on the day it needs to be — the whole point of this is a campus tripping it
 * mid-week, when the fix has to take a minute. Read from the source, because
 * what is under test is where a number comes from.
 */
describe('the deployment can move both ceilings without a build', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

  it('reads the guest cap on every admission, not once at module load', () => {
    const guest = read('convex/guest.ts')
    expect(guest).toContain('process.env.GUEST_SESSIONS_PER_IP_PER_DAY')
    expect(guest).toContain('if (count >= guestSessionsPerIpPerDay())')
  })

  it('reads the pool the same way', () => {
    const pool = read('convex/lib/pool.ts')
    expect(pool).toContain("limitFromEnv(process.env.COMMUNITY_POOL_SIZE, DEFAULT_POOL_SIZE)")
  })

  it('parses neither by hand, so the blank-is-zero trap is fixed in one place', () => {
    for (const path of ['convex/guest.ts', 'convex/lib/pool.ts']) {
      expect(read(path)).not.toMatch(/Number\(process\.env/)
    }
  })

  it('tells a deployment both variables exist', () => {
    const example = read('.env.example')
    expect(example).toContain('GUEST_SESSIONS_PER_IP_PER_DAY=')
    expect(example).toContain('COMMUNITY_POOL_SIZE=')
  })
})
