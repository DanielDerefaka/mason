'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { Doc } from '../../../convex/_generated/dataModel'

/**
 * Warm gradients standing in for a project's rendered preview. Picked by
 * hashing the id so a project keeps the same swatch across reloads instead of
 * flickering to a new colour on every render.
 */
const SWATCHES = [
  // golden → coral, the warmest of the set
  'from-[#FFC46B] via-[#FBA07C] to-[#F1849B]',
  // cream → peach
  'from-[#FFE1C0] via-[#FBC7A8] to-[#F4AC9F]',
  // blush
  'from-[#FBC0B4] via-[#F4A7A5] to-[#E890A4]',
  // amber → rose
  'from-[#FFD79A] via-[#F9B393] to-[#EE95A6]',
  // pale sand
  'from-[#FFEFD8] via-[#FBD8BC] to-[#F2B8AC]',
  // apricot
  'from-[#FFCF9E] via-[#F9AE92] to-[#EC8F9E]',
]

const swatchFor = (id: string) => {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return SWATCHES[hash % SWATCHES.length]
}

export const ProjectCard = ({
  project,
  session,
}: {
  project: Doc<'projects'>
  session: string
}) => {
  return (
    <Link href={`/dashboard/${session}/canvas?project=${project._id}`} className="group block">
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br ${swatchFor(project._id)} transition-transform duration-300 group-hover:scale-[1.01]`}
      >
        {/* The soft light disc that sits at the centre of every preview tile. */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-16 w-16 rounded-full bg-white/70 blur-[2px] shadow-[0_0_40px_12px_rgba(255,255,255,0.45)]" />
        </div>
      </div>

      <p className="mt-3 truncate text-sm font-medium">{project.name}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        {formatDistanceToNow(new Date(project.lastModified), { addSuffix: true })}
      </p>
    </Link>
  )
}
