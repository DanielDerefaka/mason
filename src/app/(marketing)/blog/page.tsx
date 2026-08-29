import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CtaSection } from "@/components/marketing/home/CtaSection";
import { BLOG_POSTS } from "@/lib/marketing-blog";

export const metadata: Metadata = {
  title: "Blog",
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
          <h1 className="text-foreground font-display text-center text-[44px] leading-[46px] font-normal tracking-[-2px] md:text-[80px] md:leading-[80px] md:tracking-[-4px] lg:text-[118px] lg:leading-[118px] lg:tracking-[-6px]">
            Our <span className="font-display-italic">Blogs</span>
          </h1>

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
                        alt=""
                        fill
                        sizes="(max-width: 750px) calc(100vw - 92px), (max-width: 1000px) calc(50vw - 62px), 375px"
                        className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
                      />
                    </div>

                    <div className="flex items-center justify-between px-[12px] pt-[18px]">
                      <span className="text-muted-foreground font-sans text-[13px] leading-[20px]">
                        {post.category}
                      </span>
                      <span className="text-muted-foreground font-sans text-[13px] leading-[20px]">
                        {post.date}
                      </span>
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
