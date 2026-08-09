import Link from 'next/link'
import {
  ArrowRight,
  Frame,
  Images,
  MessageSquare,
  Palette,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { MarketingFooter, MarketingNav } from '@/components/marketing/chrome'
import { WaitlistForm } from '@/components/marketing/waitlist-form'
import { POSTS, formatDate } from '@/content/posts'

export const metadata = {
  title: 'Sketch to Design — draw a screen, get the product',
  description:
    'Draw the rough shape of a screen. Get a design system from your mood board, a finished interface from your sketch, and the whole flow around it.',
}

const STEPS = [
  {
    icon: Palette,
    title: 'Build the mood board',
    body: 'Drop in the images that carry the feeling you want. The palette, the contrast and the type come out of them — as a real design system, not a vibe.',
  },
  {
    icon: Frame,
    title: 'Sketch the screen',
    body: 'Rectangles, circles, a few labels. Nothing precious. The sketch decides the layout and the reading order; you are describing structure, not drawing pixels.',
  },
  {
    icon: Sparkles,
    title: 'Generate the design',
    body: 'A finished interface streams onto the canvas beside your sketch, built from your design system, with real copy instead of placeholder text.',
  },
  {
    icon: Workflow,
    title: 'Grow it into a flow',
    body: 'One screen is a mock. Ask for the flow and you get the screens a user would actually reach next, all sharing the same shell and palette.',
  },
]

const FEATURES = [
  {
    icon: Frame,
    title: 'An infinite canvas',
    body: 'Pan, zoom, draw, move, resize. Frames, freehand, arrows and text, with undo that behaves — a whole drag is one step, not fifty.',
  },
  {
    icon: Palette,
    title: 'Design systems from images',
    body: 'Every shadcn token filled in and bound to a role, with contrast checked on the pairings that matter, plus a typeface chosen to suit.',
  },
  {
    icon: Images,
    title: 'Inspiration that steers',
    body: 'References shape palette, density and type personality. Your sketch still decides the layout — the references only decide how it feels.',
  },
  {
    icon: Sparkles,
    title: 'Streamed, not spun',
    body: 'Designs assemble in front of you. If the layout is going the wrong way you know within seconds, not after the full minute.',
  },
  {
    icon: MessageSquare,
    title: 'Revise by asking',
    body: '“Make it dark with a lime accent.” Each screen keeps its own conversation, and only what you asked about changes.',
  },
  {
    icon: Workflow,
    title: 'Flows, planned properly',
    body: 'The screens come from reading your design, not from a fixed list. A pricing page implies checkout; a dashboard implies a detail view.',
  },
]

const PRICING = [
  {
    name: 'Free',
    price: '£0',
    note: '10 credits to start',
    features: ['Unlimited projects', 'Mood boards and style guides', 'Streamed generation', 'Design chat'],
    cta: 'Start free',
    highlighted: false,
  },
  {
    name: 'Studio',
    price: '£19',
    note: 'per month · 200 credits',
    features: ['Everything in Free', 'Workflow generation', 'Six inspiration references', 'Priority generation'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '£49',
    note: 'per month · 600 credits',
    features: ['Everything in Studio', 'Shared projects', 'Brand presets', 'Support from a human'],
    cta: 'Talk to us',
    highlighted: false,
  },
]

const FAQ = [
  {
    q: 'What counts as a credit?',
    a: 'One generation. A style guide, a design, a screen in a flow, or a revision from the chat is one credit each. Drawing, editing and everything on the canvas is free.',
  },
  {
    q: 'Do I need to be able to draw?',
    a: 'No — boxes are enough. Writing a word or two inside them helps a lot, though: a labelled rectangle is an instruction, an unlabelled one is a guess.',
  },
  {
    q: 'What comes out at the end?',
    a: 'A design you can see, move around and keep iterating on, built from your own design system so it stays consistent across every screen in the flow.',
  },
  {
    q: 'Can I use my own references?',
    a: 'Yes. Up to six per project. They steer palette, density and typographic feel — they are never copied into the design itself.',
  },
]

/** Faces for the social proof row. Initials rather than stock photos of nobody. */
const FACES = [
  { initials: 'RK', tint: 'bg-[#7C6BFF]' },
  { initials: 'AM', tint: 'bg-[#2DD4BF]' },
  { initials: 'JD', tint: 'bg-[#F59E0B]' },
  { initials: 'SO', tint: 'bg-[#EC4899]' },
]

/**
 * The product, drawn rather than screenshotted.
 *
 * A real capture would go stale the first time the canvas changes, and it
 * cannot be themed. This is the same story the app tells — a sketch on the
 * left, the design it produced on the right — at a size that reads as a
 * screenshot from a distance.
 */
const ProductFrame = () => (
  <div className="relative mx-auto max-w-5xl">
    <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0b0d] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
      {/* App chrome */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <span className="flex gap-1.5">
          {['bg-white/20', 'bg-white/12', 'bg-white/12'].map((tint, index) => (
            <span key={index} className={`size-2.5 rounded-full ${tint}`} />
          ))}
        </span>
        <span className="mx-auto flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1 text-[10px]">
          <span className="rounded-full bg-white/[0.10] px-2 py-0.5">Canvas</span>
          <span className="text-muted-foreground px-2 py-0.5">Style Guide</span>
        </span>
        <span className="text-muted-foreground text-[10px]">14 credits</span>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
        {/* The sketch */}
        <div>
          <p className="text-muted-foreground mb-2 text-[10px]">Frame</p>
          <div className="rounded-lg border border-white/12 bg-black/50 p-4">
            <div className="space-y-3">
              <div className="h-7 rounded bg-[#7C6BFF]/80" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 rounded bg-[#7C6BFF]/60" />
                <div className="h-24 rounded bg-[#7C6BFF]/60" />
              </div>
              <div className="h-7 w-3/4 rounded bg-[#7C6BFF]/40" />
            </div>
          </div>
        </div>

        {/* What came out */}
        <div>
          <p className="text-muted-foreground mb-2 text-[10px]">Generated UI</p>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#fbf7f0]">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2">
              <span className="flex items-center gap-1.5">
                <span className="size-3.5 rounded bg-[#c13f0f]" />
                <span className="text-[10px] font-semibold text-[#241611]">Verdant</span>
              </span>
              <span className="rounded-full bg-[#c13f0f] px-2 py-0.5 text-[9px] font-medium text-white">
                Get in touch
              </span>
            </div>
            <div className="space-y-2.5 p-3">
              <div className="h-20 rounded-md bg-gradient-to-br from-[#0e7570] via-[#0e7570]/70 to-[#c13f0f]/40" />
              <p className="text-[13px] leading-tight font-semibold text-[#241611]">
                New energy for the next century
              </p>
              <p className="text-[9px] leading-relaxed text-[#6a5548]">
                We develop, build and operate wind, solar and storage assets across nine countries.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                {[['6.4 TWh', 'delivered'], ['315', 'sites'], ['1.2M', 'homes']].map(([figure, label]) => (
                  <div key={figure} className="rounded-md bg-white/70 p-1.5">
                    <p className="text-[10px] font-semibold text-[#241611]">{figure}</p>
                    <p className="text-[8px] text-[#6a5548]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Fades the frame into the page rather than ending it with a hard edge. */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent"
    />
  </div>
)

export default function LandingPage() {
  const latest = POSTS.slice(0, 3)

  return (
    <div className="min-h-screen bg-black text-foreground">
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-24 pb-20">
          {/* Two soft beams from the top, like a stage light, plus one tinted
              pool behind the headline. Cheaper and sharper than an image. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] overflow-hidden">
            <div className="absolute -top-64 left-1/2 h-[46rem] w-[30rem] -translate-x-[135%] rotate-[26deg] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.13),transparent_62%)] blur-2xl" />
            <div className="absolute -top-64 left-1/2 h-[46rem] w-[30rem] translate-x-[35%] -rotate-[26deg] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.13),transparent_62%)] blur-2xl" />
            <div className="absolute -top-56 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,107,255,0.20),transparent_62%)] blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] py-1 pr-4 pl-1.5 text-[11px] backdrop-blur">
              <span className="flex -space-x-2">
                {FACES.map(({ initials, tint }) => (
                  <span
                    key={initials}
                    className={`grid size-5 place-items-center rounded-full ${tint} text-[8px] font-semibold text-black ring-2 ring-black`}
                  >
                    {initials}
                  </span>
                ))}
              </span>
              {/* Deliberately not a number. The reference says "500+ early users";
                  inventing a count for a product that has none is a claim, not
                  copy. Swap in a real figure once there is one. */}
              <span className="text-muted-foreground">Now in early access</span>
            </div>

            <h1 className="mt-7 text-5xl leading-[1.03] font-semibold tracking-tight sm:text-6xl md:text-7xl">
              Draw the shape.
              <br />
              Get the product.
            </h1>

            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-base leading-relaxed">
              Rough out a screen with rectangles. Sketch to Design builds the design system from
              your mood board, turns the sketch into a finished interface, and generates the rest
              of the flow around it.
            </p>

            <div className="mt-9">
              <WaitlistForm />
              <p className="text-muted-foreground mt-3 text-xs">
                10 credits included. No card required.
              </p>
            </div>
          </div>

          <div className="relative mt-20">
            <ProductFrame />
          </div>
        </section>

        {/* Numbers */}
        <section className="border-y border-white/[0.06] px-6 py-10">
          <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
            {[
              ['~60s', 'from sketch to a finished screen'],
              ['18', 'design tokens generated and contrast-checked'],
              ['4', 'screens in a flow, planned from your design'],
            ].map(([figure, caption]) => (
              <div key={figure}>
                <p className="text-3xl font-semibold tracking-tight">{figure}</p>
                <p className="text-muted-foreground mt-1 text-xs">{caption}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
              Four steps, and none of them are “write a prompt”.
            </h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-2">
              {STEPS.map(({ icon: Icon, title, body }, index) => (
                <div key={title} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06]">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-muted-foreground text-[11px]">
                      Step {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mt-1 text-base font-medium">{title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-white/[0.06] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
              Built like a design tool, not a chat box.
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-white/15"
                >
                  <Icon className="size-4" />
                  <h3 className="mt-4 text-sm font-medium">{title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Blog */}
        <section id="blog" className="scroll-mt-20 border-t border-white/[0.06] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                From the workshop
              </h2>
              <Link
                href="/blog"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
              >
                All posts
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {latest.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-white/15"
                >
                  <span className="text-muted-foreground text-[11px]">{post.tag}</span>
                  <h3 className="mt-2 text-base leading-snug font-medium group-hover:underline">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                  <p className="text-muted-foreground mt-4 text-[11px]">
                    {formatDate(post.date)} · {post.readingMinutes} min read
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-t border-white/[0.06] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Pay for generations, not seats.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-md text-sm">
              Everything on the canvas is free. A credit is spent only when the model produces
              something.
            </p>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {PRICING.map((tier) => (
                <div
                  key={tier.name}
                  className={`flex flex-col rounded-2xl border p-6 ${
                    tier.highlighted
                      ? 'border-white/25 bg-white/[0.05]'
                      : 'border-white/[0.08] bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{tier.name}</p>
                    {tier.highlighted && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-black">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-5 text-3xl font-semibold tracking-tight">{tier.price}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{tier.note}</p>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {tier.features.map((feature) => (
                      <li key={feature} className="text-muted-foreground flex gap-2 text-sm">
                        <span className="mt-[7px] size-1 shrink-0 rounded-full bg-white/40" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/auth/sign-up"
                    className={`mt-8 rounded-full px-4 py-2 text-center text-sm font-medium transition-opacity hover:opacity-90 ${
                      tier.highlighted
                        ? 'bg-white text-black'
                        : 'border border-white/12 hover:bg-white/[0.05]'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-white/[0.06] px-6 py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.4fr]">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions people ask
            </h2>
            <div className="divide-y divide-white/[0.06]">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="py-5 first:pt-0">
                  <p className="text-sm font-medium">{q}</p>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Close */}
        <section className="border-t border-white/[0.06] px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Your next screen is about four rectangles away.
            </h2>
            <Link
              href="/auth/sign-up"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Start free
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
