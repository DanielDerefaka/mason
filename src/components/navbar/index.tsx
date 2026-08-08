'use client'

import Link from 'next/link'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { CircleHelp, Frame, LayoutGrid, Palette, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useProjects } from '@/hooks/use-projects'
import { cn } from '@/lib/utils'

export const Navbar = ({ name, image }: { name?: string | null; image?: string | null }) => {
  const { createProject, creating, projects } = useProjects()
  const params = useParams<{ session: string }>()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // The navbar has two modes. With a project selected it becomes the workspace
  // chrome — breadcrumb, Canvas/Style Guide tabs, New Frame. Otherwise it is
  // the projects header.
  const projectId = searchParams.get('project')
  const project = projects.find((p) => p._id === projectId)
  const inWorkspace = projectId !== null

  const base = `/dashboard/${params.session}`
  const tabs = [
    { href: `${base}/canvas`, label: 'Canvas', Icon: LayoutGrid },
    { href: `${base}/style-guide`, label: 'Style Guide', Icon: Palette },
  ]

  const initials = (name ?? '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href={base}
          aria-label="Projects"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full ring-2 ring-foreground/80"
        >
          <span className="h-3 w-3 rounded-full bg-foreground/80" />
        </Link>
        {inWorkspace && (
          <p className="text-muted-foreground truncate text-sm">
            Project / <span className="text-foreground">{project?.name ?? 'Project'}</span>
          </p>
        )}
      </div>

      {inWorkspace && (
        <nav className="flex items-center gap-1 rounded-full p-1">
          {tabs.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={`${href}?project=${projectId}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors',
                  active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            )
          })}
        </nav>
      )}

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

        {inWorkspace ? (
          <Button className="rounded-full" size="sm">
            <Frame className="size-4" />
            New Frame
          </Button>
        ) : (
          <Button
            onClick={() => void createProject()}
            disabled={creating}
            className="rounded-full"
            size="sm"
          >
            <Plus className="size-4" />
            {creating ? 'Creating…' : 'New Project'}
          </Button>
        )}
      </div>
    </header>
  )
}

export default Navbar
