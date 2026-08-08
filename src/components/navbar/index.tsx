'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export const Navbar = () => {
  const params = useSearchParams()
  // The active project drives the breadcrumb; it moves into a state provider
  // in a later chapter.
  const projectId = params.get('project')

  return (
    <div className="grid grid-cols-3 items-center border-b px-5 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          Projects
        </Link>
        {projectId && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="truncate font-medium">{projectId}</span>
          </>
        )}
      </div>
      <div className="text-center text-sm font-semibold tracking-tight">S2C</div>
      <div className="flex items-center justify-end gap-2" />
    </div>
  )
}

export default Navbar
