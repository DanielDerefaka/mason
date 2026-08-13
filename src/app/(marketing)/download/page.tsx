import type { Metadata } from 'next'
import Link from 'next/link'

import { CtaSection } from '@/components/marketing/home/CtaSection'
import { DESKTOP } from '@/lib/marketing-download'

export const metadata: Metadata = {
  title: 'Download | Mason',
  description:
    'Mason for Mac — the whole app in its own window. Sketches in, interfaces out.',
}

/**
 * /download — the desktop app.
 *
 * One page, one decision, one button. Everything variable about a release —
 * version, asset URL, requirements — lives in marketing-download.ts, so
 * shipping a new build never edits this file.
 */
export default function DownloadPage() {
  return (
    <>
      <section className="pt-[100px] pb-[60px] md:pt-[140px] md:pb-[80px]">
        <div className="container-site">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-foreground font-display text-[34px] leading-[36px] font-normal tracking-[-1.6px] md:text-[56px] md:leading-[56px] md:tracking-[-2.8px] lg:text-[76px] lg:leading-[76px] lg:tracking-[-3.8px]">
              <span className="block">Mason, on your desk.</span>
              <span className="block">Not in a tab.</span>
            </h1>

            <p className="text-muted-foreground mt-6 max-w-[520px] text-[15px] leading-relaxed md:text-[17px]">
              The whole app in its own window — the canvas, the editor, the exports.
              Your work still lives in your account, so everything you make here is
              already on the web when you get up.
            </p>

            <div className="mt-[40px] flex flex-col items-center gap-3">
              <a href={DESKTOP.mac.url} className="pill pill-primary px-6 py-3 text-[15px]">
                {DESKTOP.mac.label}
              </a>
              <span className="text-muted-foreground text-[12px]">
                Version {DESKTOP.version} · {DESKTOP.mac.requirement}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-[80px] md:pb-[110px]">
        <div className="container-site">
          <div className="mx-auto grid max-w-[880px] gap-4 md:grid-cols-3">
            {[
              {
                title: 'Its own window',
                body: 'A dock icon, real shortcuts, and none of the browser around it. ⌘Z and canvas zoom belong to Mason, not to a tab.',
              },
              {
                title: 'The same account',
                body: 'Sign in as you do on the web. Projects, credits and share links are the same everywhere — nothing forks.',
              },
              {
                title: 'Keys stay home',
                body: 'Generation runs through our servers, never from your machine — the desktop app holds no secrets worth stealing.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="border-border bg-card rounded-2xl border p-6"
              >
                <h2 className="text-foreground text-[15px] font-semibold">{card.title}</h2>
                <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                  {card.body}
                </p>
              </div>
            ))}
          </div>

          {!DESKTOP.signed && (
            <div className="border-border mx-auto mt-8 max-w-[880px] rounded-2xl border border-dashed p-6">
              <h2 className="text-foreground text-[14px] font-semibold">
                First launch on macOS
              </h2>
              {/* Not the folklore "right-click → Open": an ad-hoc-signed app
                  on Apple Silicon gets the "damaged" dialog, which offers no
                  override at all. The quarantine flag is the whole problem,
                  and removing it is the one step that actually works. */}
              <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                This build isn&apos;t notarised with Apple yet, so macOS will claim the app
                is &ldquo;damaged&rdquo;. It isn&apos;t — that is Apple&apos;s wording for
                &ldquo;not notarised&rdquo;. Drag Mason to Applications, then run this once
                in Terminal:
              </p>
              <code className="text-foreground bg-muted mt-3 block w-fit rounded-lg px-3 py-2 font-mono text-[12.5px]">
                xattr -cr /Applications/Mason.app
              </code>
              <p className="text-muted-foreground mt-3 text-[13px] leading-relaxed">
                Then open it normally — every launch after that is ordinary. Notarised
                builds are coming, and this paragraph leaves with them.
              </p>
            </div>
          )}

          <p className="text-muted-foreground mt-8 text-center text-[13px]">
            Windows and Linux are on the way.{' '}
            <Link href="/auth/sign-up" className="text-foreground underline underline-offset-4">
              Use Mason in the browser
            </Link>{' '}
            in the meantime — it&apos;s the same app.
          </p>
        </div>
      </section>

      <CtaSection />
    </>
  )
}
