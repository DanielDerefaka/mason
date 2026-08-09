import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { MarketingFooter, MarketingNav } from '@/components/marketing/chrome'
import { POSTS, formatDate, postBySlug } from '@/content/posts'

/** Every post is known at build time, so they can all be static. */
export const generateStaticParams = () => POSTS.map((post) => ({ slug: post.slug }))

export const generateMetadata = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const post = postBySlug((await params).slug)
  if (!post) return { title: 'Not found — Sketch to Design' }
  return { title: `${post.title} — Sketch to Design`, description: post.excerpt }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug)
  if (!post) notFound()

  const others = POSTS.filter((other) => other.slug !== post.slug).slice(0, 2)

  return (
    <div className="min-h-screen bg-black text-foreground">
      <MarketingNav />

      <article className="mx-auto max-w-2xl px-6 py-20">
        <Link
          href="/blog"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          All posts
        </Link>

        <p className="text-muted-foreground mt-6 text-[11px]">
          {post.tag} · {formatDate(post.date)} · {post.readingMinutes} min read
        </p>
        <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight">{post.title}</h1>
        <p className="text-muted-foreground mt-4 text-base leading-relaxed">{post.excerpt}</p>

        <div className="mt-10 space-y-5">
          {post.body.map((block) =>
            block.startsWith('## ') ? (
              <h2 key={block} className="pt-4 text-lg font-medium tracking-tight">
                {block.slice(3)}
              </h2>
            ) : (
              <p key={block} className="text-muted-foreground text-[15px] leading-relaxed">
                {block}
              </p>
            ),
          )}
        </div>

        <div className="mt-16 border-t border-white/[0.06] pt-8">
          <p className="text-muted-foreground text-xs">Keep reading</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {others.map((other) => (
              <Link
                key={other.slug}
                href={`/blog/${other.slug}`}
                className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-white/15"
              >
                <p className="text-sm leading-snug font-medium group-hover:underline">
                  {other.title}
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs">{other.readingMinutes} min read</p>
              </Link>
            ))}
          </div>
        </div>
      </article>

      <MarketingFooter />
    </div>
  )
}
