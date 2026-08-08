'use client'

import { CircleHelp, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useProjects } from '@/hooks/use-projects'

export const Navbar = ({ name, image }: { name?: string | null; image?: string | null }) => {
  const { createProject, creating } = useProjects()

  const initials = (name ?? '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="grid h-8 w-8 place-items-center rounded-full ring-2 ring-foreground/80">
          <span className="h-3 w-3 rounded-full bg-foreground/80" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* TODO: credits — replaced by the real balance when billing lands. */}
        <div className="text-muted-foreground text-right text-[11px] leading-tight">
          <p>TODO:</p>
          <p>credits</p>
        </div>

        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Help">
          <CircleHelp className="size-5" />
        </Button>

        <Avatar className="size-8">
          {image ? <AvatarImage src={image} alt={name ?? 'You'} /> : null}
          <AvatarFallback className="text-xs">{initials || 'S2'}</AvatarFallback>
        </Avatar>

        <Button
          onClick={() => void createProject()}
          disabled={creating}
          className="rounded-full"
          size="sm"
        >
          <Plus className="size-4" />
          {creating ? 'Creating…' : 'New Project'}
        </Button>
      </div>
    </header>
  )
}

export default Navbar
