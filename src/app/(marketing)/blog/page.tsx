import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CtaSection } from "@/components/marketing/home/CtaSection";
import { BLOG_POSTS } from "@/lib/marketing-blog";

// The description is the card's subtitle as well as the search snippet, and
// without one it fell back to the site's — so /blog, /explore and /download all
// unfurled with identical text under three different titles. It is also the
// line under the heading: the page says what it is in the words the result
// shows, and there is one copy of them.
const DESCRIPTION =
  "Notes on sketching, design systems and generating interfaces. How SketchMason is built, and what it is for.";

export const metadata: Metadata = {
  title: "Blog",
  description: DESCRIPTION,
};

/**
 * /blog — the post index.
 *
 * Header and footer come from the root layout, so the top padding here
 * clears the fixed 72px header and lands the title ~150px below it.
 */
export default function BlogPage() {
  return (
    <>
      <section className="pt-[140px] pb-[80px] md:pt-[180px] md:pb-[110px] lg:pt-[222px] lg:pb-[140px]">
        <div className="container-site">
          {/* Named, not labelled. "Our Blogs" gave a machine nothing to attach
              to the entity, and "Mason" alone is a name-collision query — the
              heading has to carry the name. */}
          <h1 className="text-foreground font-display text-center text-[44px] leading-[46px] font-normal tracking-[-2px] md:text-[80px] md:leading-[80px] md:tracking-[-4px] lg:text-[118px] lg:leading-[118px] lg:tracking-[-6px]">
            The SketchMason <span className="font-display-italic">blog</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-[24px] max-w-[620px] text-center font-sans text-[17px] leading-[28px] md:mt-[32px]">
            {DESCRIPTION}
          </p>

          <div className="mx-auto mt-[48px] max-w-[1180px] md:mt-[64px] lg:mt-[80px]">
            <ul className="grid grid-cols-1 gap-[20px] md:grid-cols-2 lg:grid-cols-3 lg:gap-[28px]">
              {BLOG_POSTS.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="card-surface group block overflow-hidden p-[10px] transition-[border-color] duration-400 ease-out hover:border-border"
                  >
                    <div className="relative aspect-[424/238] w-full overflow-hidden rounded-[10px]">
                      <Image
                        src={post.cover}
                        alt={post.coverAlt}
                        fill
                        sizes="(max-width: 750px) calc(100vw - 92px), (max-width: 1000px) calc(50vw - 62px), 375px"
                        className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
                      />
                    </div>

                    <div className="flex items-center justify-between px-[12px] pt-[18px]">
                      <span className="text-muted-foreground font-sans text-[13px] leading-[20px]">
                        {post.category}
                      </span>
                      <time
                        dateTime={post.dateTime}
                        className="text-muted-foreground font-sans text-[13px] leading-[20px]"
                      >
                        {post.date}
                      </time>
                    </div>

                    <h2 className="text-foreground line-clamp-2 [display:-webkit-box] px-[12px] pt-[8px] font-sans text-[19px] leading-[25px] font-semibold">
                      {post.title}
                    </h2>

                    <p className="text-muted-foreground line-clamp-2 [display:-webkit-box] px-[12px] pt-[8px] pb-[16px] font-sans text-[14px] leading-[21px]">
                      {post.excerpt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            <nav
              aria-label="Pagination"
              className="mt-[56px] flex flex-col items-center"
            >
              <span
                aria-current="page"
                className="card-surface text-foreground flex h-[34px] w-[34px] items-center justify-center font-sans text-[14px]"
              >
                1
              </span>
              <span className="text-muted-foreground mt-[10px] font-sans text-[13px]">
                Page 1
              </span>
            </nav>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
