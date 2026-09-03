'use client'

import { useQuery } from 'convex/react'
import { formatDistanceToNow } from 'date-fns'
import { Check, ChevronDown, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { sketchName } from './sketch-name'

/**
 * The guest's sketches, and a way to start another.
 *
 * /try used to mint one project and return to it for ever: the id was
 * remembered in localStorage, and the only way to a second canvas was to
 * paint over the first. A free week is several days long, so a second day
 * wants a second sketch — and the old one still has to be reachable, or
 * "keep your work" is not true of anything but the newest.
 *
 * A new canvas buys no new generations. The allowance is keyed to the guest
 * and the day, not to the project, so this changes what a visitor can keep,
 * not what they can spend.
 *
 * Each row is named from what is drawn on it and dated from when it was last
 * touched. They were all "My sketch", the name every /try project is created
 * with, so the menu could not tell a visitor which was which.
 */
export const SketchMenu = ({
  projectId,
  onOpen,
  onNew,
}: {
  projectId: Id<'projects'> | null
  onOpen: (id: Id<'projects'>) => void
  onNew: () => void
}) => {
  const mine = useQuery(api.project.getProjects)
  const projects = mine?.projects ?? []
  const current = projects.find((project) => project._id === projectId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary" className="max-w-[12rem] rounded-full">
          <span className="truncate">{current ? sketchName(current) : 'Sketches'}</span>
          <ChevronDown className="size-3.5 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dark w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Your sketches
        </DropdownMenuLabel>
        {projects.map((project) => (
          <DropdownMenuItem
            key={project._id}
            className="gap-2"
            onSelect={() => onOpen(project._id)}
          >
            {/* Kept in the layout when unselected so the names do not shift. */}
            <Check
              className={`size-3.5 shrink-0 ${project._id === projectId ? '' : 'invisible'}`}
            />
            <span className="flex-1 truncate">{sketchName(project)}</span>
            <time
              dateTime={new Date(project.lastModified).toISOString()}
              className="shrink-0 text-[11px] text-muted-foreground"
            >
              {formatDistanceToNow(project.lastModified, { addSuffix: true })}
            </time>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2" onSelect={() => onNew()}>
          <Plus className="size-3.5 shrink-0" />
          New sketch
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
