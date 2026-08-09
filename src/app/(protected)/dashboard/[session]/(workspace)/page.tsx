import { ProjectsProvider } from '@/components/projects/provider'
import { ProjectsList } from '@/components/projects/list'
import { ProjectsQuery } from '@/convex/query.config'

export const metadata = { title: 'Projects | Mason' }

const Page = async () => {
  const { projects, profile } = await ProjectsQuery()

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-foreground mb-4 text-2xl font-bold">Authentication Required</h1>
          <p className="text-muted-foreground">Please sign in to view your projects.</p>
        </div>
      </div>
    )
  }

  return (
    <ProjectsProvider initialProjects={projects}>
      <div className="container mx-auto px-4 py-36">
        <ProjectsList />
      </div>
    </ProjectsProvider>
  )
}

export default Page
