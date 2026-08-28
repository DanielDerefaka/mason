import { fetchMutation } from 'convex/nextjs'

import { api } from '../../convex/_generated/api'

/**
 * What a generation costs, and how to undo it.
 *
 * Every route under `/api/generate` charges the same way, and until this file
 * existed every one of them spelled it out again — six copies of a spend, a
 * ticket and a refund, which is six places for the next change to be applied
 * five times.
 *
 * Two paths. On the house key a credit is spent up front, because the
 * response streams and there is no request left to fail cleanly on by the
 * time it ends. On the visitor's own key nothing is charged — they are paying
 * Anthropic — and instead the generation is counted, which is the only way
 * the launch numbers can tell a key that was pasted from a key that is
 * actually being used.
 */
export const chargeForGeneration = async ({
  byok,
  token,
}: {
  byok: boolean
  token: string | undefined
}): Promise<{ refundCredit: () => Promise<void> }> => {
  if (byok) {
    try {
      await fetchMutation(api.signals.record, { kind: 'byok_generation' }, { token })
    } catch {
      // A counter is not worth failing a generation over.
    }
    return { refundCredit: async () => {} }
  }

  const { refund: ticket } = await fetchMutation(api.credits.spend, {}, { token })

  /**
   * Puts the credit back when nothing usable came out of the model.
   *
   * The ticket is what makes this the undoing of that particular spend rather
   * than a standing offer: `credits.refund` is reachable from any browser,
   * and without a ticket to match it gives nothing back.
   */
  return {
    refundCredit: async () => {
      try {
        await fetchMutation(api.credits.refund, { ticket }, { token })
      } catch {
        // A failed refund must not also break the response the user is
        // already reading.
      }
    },
  }
}
