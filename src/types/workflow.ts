import { z } from 'zod'

/**
 * The flow the model plans from one screen. Lives here rather than in the route
 * because a Next route module may only export handlers and its config.
 */
export const WorkflowPlanSchema = z.object({
  pages: z.array(
    z.object({
      title: z.string().describe('Two or three words, title case.'),
      purpose: z.string().describe('One sentence naming the sections this screen needs.'),
    }),
  ),
})

export type WorkflowPlan = z.infer<typeof WorkflowPlanSchema>
