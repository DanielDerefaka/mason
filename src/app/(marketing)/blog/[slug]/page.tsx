import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { notFound } from "next/navigation";

import { CtaSection } from "@/components/marketing/home/CtaSection";
import { JsonLd } from "@/components/marketing/JsonLd";
import { BLOG_POSTS, getPostBySlug } from "@/lib/marketing-blog";
import { SITE_URL } from "@/lib/site";
import type { BlogPost } from "@/types/marketing-content";

/** Next 16 hands route params in as a promise. */
type PostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) return { title: "Post" };

  // The excerpt is the post's own opening line, written for it. Without a
  // description here every post inherited the site's, so four posts shared
  // one sentence in the results — and the brand query surfaced About Us and
  // Sign in ahead of any of them.
  return { title: post.title, description: post.excerpt };
}

/**
 * Where Next serves the card that sits beside this file. Not `/opengraph-image`:
 * a metadata route under a route group gets a hash of its parent path appended,
 * so `(marketing)/blog/[slug]/opengraph-image` and some other group's
 * `blog/[slug]/opengraph-image` cannot collide at one URL. The hash is a pure
 * function of the path — djb2 of "/(marketing)/blog/[slug]", in base 36 — so it
 * changes only if this directory moves, and blog.test.ts recomputes it with
 * Next's own function so that a move cannot leave this pointing at a 404.
 */
const POST_CARD = "opengraph-image-yqks0s";

/**
 * BlogPosting structured data — the Article subtype for a blog — built from
 * the same record the page renders, so the two cannot drift.
 *
 * A post carries one date, so there is no modified date here: one that is
 * really the published date is a claim rather than an omission. No publisher
 * logo either — the only mark on disk is white on transparent, invisible on
 * the white ground Google draws a logo onto. The image is the post's own card,
 * composed beside this file in `opengraph-image.tsx`, the same one the share
 * tags point at.
 */
const blogPosting = (post: BlogPost) => {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.dateTime,
    articleSection: post.category,
    image: `${url}/${POST_CARD}`,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: "Mason", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Mason", url: SITE_URL },
  };
};

/**
 * Renders one `body` entry. A leading "## " marks an h2 and "### " an h3;
 * everything else is a paragraph. The prefix is stripped before rendering.
 */
function BodyBlock({ block }: { block: string }) {
  if (block.startsWith("### ")) {
    return (
      <h3 className="text-foreground font-display mt-[28px] text-[22px] leading-[28px] font-normal tracking-[-0.8px]">
        {block.slice(4)}
      </h3>
    );
  }

  if (block.startsWith("## ")) {
    return (
      <h2 className="text-foreground font-display mt-[40px] text-[30px] leading-[34px] font-normal tracking-[-1.3px]">
        {block.slice(3)}
      </h2>
    );
  }

  return (
    <p className="text-muted-foreground mt-[18px] font-sans text-[16px] leading-[27px] md:text-[17px] md:leading-[29px]">
      {block}
    </p>
  );
}

/**
 * /blog/[slug] — the article template.
 *
 * Header and footer come from the root layout, so the top padding here
 * clears the fixed 72px header.
 */
export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  return (
    <>
      <JsonLd data={blogPosting(post)} />
      <article className="pt-[140px] pb-[80px] md:pt-[180px] md:pb-[110px] lg:pt-[222px] lg:pb-[140px]">
        <div className="container-site">
          <div className="mx-auto max-w-[760px]">
            <Link
              href="/blog"
              className="text-muted-foreground hover:text-foreground font-sans text-[14px] transition-colors duration-400 ease-out"
            >
              &larr; All posts
            </Link>

            <p className="text-muted-foreground mt-[28px] font-sans text-[13px] leading-[20px]">
              {post.category} &middot; <time dateTime={post.dateTime}>{post.date}</time> &middot;{" "}
              {post.readTime}
            </p>

            <h1 className="text-foreground font-display mt-[14px] text-[32px] leading-[36px] font-normal tracking-[-1.4px] md:text-[52px] md:leading-[56px] md:tracking-[-2.4px]">
              {post.title}
            </h1>

            <div className="border-hairline relative mt-[36px] aspect-video w-full overflow-hidden rounded-[14px] border">
              <Image
                src={post.cover}
                alt={post.coverAlt}
                fill
                sizes="(max-width: 850px) calc(100vw - 48px), 760px"
                priority
                className="object-cover"
              />
            </div>

            <div className="mt-[40px]">
              {post.body.map((block: string, index: number) => (
                <BodyBlock key={index} block={block} />
              ))}
            </div>

            <div className="mt-[48px]">
              <Link href="/blog" className="pill pill-secondary">
                Read more articles
              </Link>
            </div>
          </div>
        </div>
      </article>

      <CtaSection />
    </>
  );
}
