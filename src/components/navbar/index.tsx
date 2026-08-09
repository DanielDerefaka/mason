'use client'

import Link from 'next/link'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { CircleHelp, Frame, LayoutTemplate, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthentication } from '@/hooks/use-auth'
import { useProjects } from '@/hooks/use-projects'
import { useDispatch } from 'react-redux'
import { LogoMark } from '@/components/logo-mark'
import { setFrameDialogOpen } from '@/redux/slice/shapes'
import { cn } from '@/lib/utils'

export const Navbar = ({ name, image }: { name?: string | null; image?: string | null }) => {
  const dispatch = useDispatch()
  const { handleSignOut } = useAuthentication()
  const { createProject, creating, projects } = useProjects()
  const credits = useQuery(api.credits.getBalance)
  const params = useParams<{ session: string }>()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const projectId = searchParams.get('project')
  const project = projects.find((p) => p._id === projectId)
  const inWorkspace = projectId !== null

  const base = `/dashboard/${params.session}`
  const tabs = [
    { href: `${base}/canvas`, label: 'Canvas', Icon: Frame },
    { href: `${base}/style-guide`, label: 'Style Guide', Icon: LayoutTemplate },
  ]

  const initials = (name ?? '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    // Relative so the tab group can sit dead centre regardless of how wide the
    // breadcrumb or the right-hand cluster get.
    <header className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:gap-4 md:px-6 md:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href={base} aria-label="Projects">
          <LogoMark className="size-7 shrink-0 text-white" />
        </Link>
        {inWorkspace && (
          <span className="truncate rounded-md border border-white/10 px-2.5 py-1 text-xs text-muted-foreground">
            Project / {project?.name ?? 'Project Name'}
          </span>
        )}
      </div>

      {/* Was md-only, which left a phone with no route from the canvas to the
          style guide at all — and that is where the design system lives. */}
      {inWorkspace && (
        <nav className="order-last flex w-full items-center justify-center gap-1 rounded-full bg-black/50 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)] ring-1 ring-white/[0.06] md:absolute md:order-none md:left-1/2 md:w-auto md:-translate-x-1/2">
          {tabs.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={`${href}?project=${projectId}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-2 text-xs transition-all duration-200',
                  active
                    // Raised: lighter fill, a bright top edge and a drop shadow
                    // so the segment reads as sitting above the track.
                    ? 'bg-[#3a3a3d] text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.14),0_2px_4px_rgb(0_0_0/0.45)]'
                    : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
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
        {/* Shown everywhere, as in the video — a generation can start from
            either page, so the balance has to be visible on both. */}
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {credits == null ? '—' : `${credits} credit${credits === 1 ? '' : 's'}`}
        </span>

        <button
          type="button"
          aria-label="Help"
          className="grid size-9 place-items-center rounded-full bg-white/[0.06] text-muted-foreground transition-colors hover:bg-white/[0.1] hover:text-foreground"
        >
          <CircleHelp className="size-[18px]" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Account" className="rounded-full outline-none">
              <Avatar className="size-9">
                {image ? <AvatarImage src={image} alt={name ?? 'You'} /> : null}
                <AvatarFallback className="text-xs">{initials || 'M'}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {name && (
              <>
                <DropdownMenuLabel className="truncate font-normal">{name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard">Projects</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void handleSignOut()}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {inWorkspace ? (
          <Button
            onClick={() => dispatch(setFrameDialogOpen(true))}
            className="rounded-full px-4"
            size="sm"
          >
            <Frame className="size-4" />
            New Frame
          </Button>
        ) : (
          <Button
            onClick={() => void createProject()}
            disabled={creating}
            className="rounded-full px-4"
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
