'use client'

import { useGoogleFont } from '@/hooks/use-google-font'
import type { StyleGuide } from '@/types/style-guide'
import { STYLE_GUIDE } from './config'

/**
 * The rest of the design system: type scale, spacing, radii and elevation.
 *
 * A guide of colours and weight names was never a system — every generated
 * screen invented its own sizes and no two agreed. These are the tokens a
 * design can be held to, shown the way a kit shows them: the value, the
 * specimen, and a line on where it belongs.
 *
 * A generated guide may predate these fields, so each section falls back to
 * the built-in system rather than disappearing.
 */
export const Tokens = ({ guide }: { guide: StyleGuide | null }) => {
  const scale = guide?.typeScale?.length ? guide.typeScale : STYLE_GUIDE.typeScale
  const spacing = guide?.spacing?.length ? guide.spacing : STYLE_GUIDE.spacing
  const radii = guide?.radii?.length ? guide.radii : STYLE_GUIDE.radii
  const elevation = guide?.elevation?.length ? guide.elevation : STYLE_GUIDE.elevation

  const family = guide?.typography.fontFamily ?? STYLE_GUIDE.typography.fontFamily
  useGoogleFont(family, [300, 400, 500, 600, 700, 800])

  return (
    <div className="flex flex-col gap-16">
      <Section
        title="Type scale"
        note="Ten roles, largest first. A design picks a role rather than a number, which is what keeps the fifth screen matching the first."
      >
        <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {scale?.map((style) => (
            <div
              key={style.name}
              className="grid grid-cols-1 gap-3 py-5 md:grid-cols-[150px_150px_1fr] md:items-baseline md:gap-6"
            >
              <span className="text-sm font-medium">{style.name}</span>

              <dl className="text-muted-foreground space-y-0.5 font-mono text-[11px] leading-relaxed">
                <div>{style.fontSize}px</div>
                <div>Weight {style.fontWeight}</div>
                <div>Line {style.lineHeight}</div>
                <div>Tracking {style.letterSpacing}em</div>
              </dl>

              <div className="min-w-0">
                {/* Clamped so a 72px specimen cannot blow the row apart on a
                    phone, while the numbers beside it stay honest. */}
                <p
                  className="truncate"
                  style={{
                    fontFamily: `'${family}', sans-serif`,
                    fontSize: `min(${style.fontSize}px, 9vw)`,
                    fontWeight: style.fontWeight,
                    lineHeight: style.lineHeight,
                    letterSpacing: `${style.letterSpacing}em`,
                  }}
                >
                  Sketch to screen
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs">{style.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Spacing"
        note="A linear scale. Consistency comes from having few permitted gaps, not from choosing a good one each time."
      >
        <div className="flex flex-col gap-3">
          {spacing?.map((step) => (
            <div key={step} className="flex items-center gap-4">
              <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums">
                {step}
              </span>
              <span
                className="h-3 rounded-sm bg-white/[0.18]"
                style={{ width: step * 4 }}
              />
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-16 md:grid-cols-2">
        <Section title="Radii" note="Matched to the board's character.">
          <div className="flex flex-wrap gap-5">
            {radii?.map((radius) => (
              <div key={radius.name} className="flex flex-col items-center gap-2">
                <span
                  className="size-20 border border-white/15 bg-white/[0.06]"
                  style={{ borderRadius: Math.min(radius.value, 40) }}
                />
                <span className="text-xs">{radius.name}</span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  {radius.value === 9999 ? 'full' : `${radius.value}px`}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Elevation" note="Three levels, and nothing between them.">
          <div className="flex flex-col gap-4">
            {elevation?.map((level) => (
              <div
                key={level.name}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4"
                style={{ boxShadow: level.shadow }}
              >
                <p className="text-sm font-medium">{level.name}</p>
                <p className="text-muted-foreground mt-1 text-xs">{level.usage}</p>
                <p className="text-muted-foreground mt-2 font-mono text-[10px] break-all">
                  {level.shadow}
                </p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

const Section = ({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: React.ReactNode
}) => (
  <section>
    <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
    <p className="text-muted-foreground mt-1.5 max-w-xl text-sm">{note}</p>
    <div className="mt-6">{children}</div>
  </section>
)

export default Tokens
