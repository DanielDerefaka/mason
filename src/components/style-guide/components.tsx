'use client'

import { Check, ChevronDown, Search, X } from 'lucide-react'

import { useGoogleFont } from '@/hooks/use-google-font'
import type { StyleGuide } from '@/types/style-guide'
import { STYLE_GUIDE } from './config'

/**
 * The kit sheet: the system applied to real controls.
 *
 * Everything here is styled from the guide's own tokens rather than the app's
 * theme, so it answers the question a palette cannot — what a button actually
 * looks like in this system, in each of its states.
 *
 * A generated guide stores hex values; the built-in one stores only token
 * names and reads its colours from the live stylesheet. So a lookup that
 * misses falls through to the CSS variable, which resolves either way.
 */
const useTokens = (guide: StyleGuide | null) => {
  const map = new Map<string, string>()
  for (const section of guide?.colorSections ?? []) {
    for (const swatch of section.swatches) map.set(swatch.token, swatch.color)
  }
  return (token: string) => map.get(token) ?? `var(${token})`
}

export const Components = ({ guide }: { guide: StyleGuide | null }) => {
  const colour = useTokens(guide)
  const family = guide?.typography.fontFamily ?? STYLE_GUIDE.typography.fontFamily
  useGoogleFont(family, [400, 500, 600, 700])

  const radii = guide?.radii?.length ? guide.radii : STYLE_GUIDE.radii
  const control = radii?.[0]?.value ?? 8
  const pill = radii?.find((r) => r.value >= 999)?.value ?? 9999

  const scale = guide?.typeScale?.length ? guide.typeScale : STYLE_GUIDE.typeScale
  const button = scale?.find((s) => s.name === 'Button')
  const buttonType = {
    fontFamily: `'${family}', sans-serif`,
    fontSize: button?.fontSize ?? 14,
    fontWeight: button?.fontWeight ?? 600,
    letterSpacing: `${button?.letterSpacing ?? 0}em`,
  }

  const primary = colour('--primary')
  const onPrimary = colour('--primary-foreground')
  const surface = colour('--card')
  const onSurface = colour('--card-foreground')
  const muted = colour('--muted-foreground')
  const border = colour('--border')
  const destructive = colour('--destructive')

  /** Contained / Outlined / Text, across the states a control actually has. */
  const STATES = ['Enabled', 'Hover', 'Pressed', 'Disabled'] as const

  const contained = (state: (typeof STATES)[number]) => ({
    background: primary,
    color: onPrimary,
    border: '1px solid transparent',
    opacity: state === 'Disabled' ? 0.4 : 1,
    filter:
      state === 'Hover' ? 'brightness(1.12)' : state === 'Pressed' ? 'brightness(0.88)' : 'none',
  })
  const outlined = (state: (typeof STATES)[number]) => ({
    background: state === 'Enabled' || state === 'Disabled' ? 'transparent' : `${primary}1F`,
    color: primary,
    border: `1px solid ${primary}`,
    opacity: state === 'Disabled' ? 0.4 : 1,
  })
  const text = (state: (typeof STATES)[number]) => ({
    background: state === 'Enabled' || state === 'Disabled' ? 'transparent' : `${primary}14`,
    color: primary,
    border: '1px solid transparent',
    opacity: state === 'Disabled' ? 0.4 : 1,
  })

  const VARIANTS = [
    { name: 'Contained', style: contained },
    { name: 'Outlined', style: outlined },
    { name: 'Text', style: text },
  ]

  return (
    <div
      className="flex flex-col gap-16"
      style={{ fontFamily: `'${family}', sans-serif` }}
    >
      <Section
        title="Buttons"
        note="Three variants across four states. Every one is built from the tokens above — nothing here is hand-picked."
      >
        <div className="overflow-x-auto">
          <div className="grid min-w-[520px] grid-cols-[110px_repeat(4,1fr)] items-center gap-x-4 gap-y-5">
            <span />
            {STATES.map((state) => (
              <span key={state} className="text-muted-foreground text-[11px]">
                {state}
              </span>
            ))}

            {VARIANTS.map((variant) => (
              <ReactFragmentRow key={variant.name} label={variant.name}>
                {STATES.map((state) => (
                  <button
                    key={state}
                    type="button"
                    disabled={state === 'Disabled'}
                    className="h-10 px-4"
                    style={{
                      ...buttonType,
                      ...variant.style(state),
                      borderRadius: control,
                      cursor: state === 'Disabled' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Button
                  </button>
                ))}
              </ReactFragmentRow>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Inputs" note="Label, field, helper — and what an error looks like.">
        <div className="grid gap-6 md:grid-cols-3">
          <Field label="Label" colour={muted}>
            <input
              placeholder="Placeholder"
              className="h-11 w-full px-3 outline-none"
              style={{
                background: surface,
                color: onSurface,
                border: `1px solid ${border}`,
                borderRadius: control,
              }}
            />
          </Field>

          <Field label="Select" colour={muted}>
            <div
              className="flex h-11 w-full items-center justify-between px-3"
              style={{
                background: surface,
                color: muted,
                border: `1px solid ${border}`,
                borderRadius: control,
              }}
            >
              Choose one
              <ChevronDown className="size-4" />
            </div>
          </Field>

          <Field label="Search" colour={muted}>
            <div
              className="flex h-11 w-full items-center gap-2 px-3"
              style={{
                background: surface,
                color: muted,
                border: `1px solid ${border}`,
                borderRadius: pill === 9999 ? 9999 : control,
              }}
            >
              <Search className="size-4 shrink-0" />
              Search
            </div>
          </Field>

          <Field label="With an error" colour={destructive}>
            <input
              defaultValue="Not a valid address"
              className="h-11 w-full px-3 outline-none"
              style={{
                background: surface,
                color: onSurface,
                border: `1px solid ${destructive}`,
                borderRadius: control,
              }}
            />
            <p className="mt-1.5 text-[11px]" style={{ color: destructive }}>
              Enter an email we can reach you on.
            </p>
          </Field>

          <Field label="Disabled" colour={muted}>
            <input
              disabled
              placeholder="Placeholder"
              className="h-11 w-full px-3 outline-none"
              style={{
                background: surface,
                color: muted,
                border: `1px solid ${border}`,
                borderRadius: control,
                opacity: 0.5,
              }}
            />
          </Field>
        </div>
      </Section>

      <Section title="Controls and chips" note="The small parts, in both states.">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
          <div className="flex items-center gap-3">
            <span
              className="grid size-5 place-items-center"
              style={{ border: `1px solid ${border}`, borderRadius: 4, background: surface }}
            />
            <span
              className="grid size-5 place-items-center"
              style={{ background: primary, borderRadius: 4 }}
            >
              <Check className="size-3.5" style={{ color: onPrimary }} />
            </span>
            <span className="text-xs" style={{ color: muted }}>
              Checkbox
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="size-5 rounded-full"
              style={{ border: `1px solid ${border}`, background: surface }}
            />
            <span
              className="grid size-5 place-items-center rounded-full"
              style={{ border: `5px solid ${primary}`, background: surface }}
            />
            <span className="text-xs" style={{ color: muted }}>
              Radio
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="flex h-5 w-9 items-center rounded-full px-0.5"
              style={{ background: border }}
            >
              <span className="size-4 rounded-full" style={{ background: surface }} />
            </span>
            <span
              className="flex h-5 w-9 items-center justify-end rounded-full px-0.5"
              style={{ background: primary }}
            >
              <span className="size-4 rounded-full" style={{ background: onPrimary }} />
            </span>
            <span className="text-xs" style={{ color: muted }}>
              Switch
            </span>
          </div>

          <div className="flex items-center gap-2">
            {['Primary', 'Muted'].map((chip, index) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px]"
                style={{
                  background: index === 0 ? `${primary}24` : `${border}66`,
                  color: index === 0 ? primary : muted,
                  borderRadius: 9999,
                }}
              >
                {chip}
                <X className="size-3" />
              </span>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

/** A labelled row inside the button grid. */
const ReactFragmentRow = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <>
    <span className="text-sm font-medium">{label}</span>
    {children}
  </>
)

const Field = ({
  label,
  colour,
  children,
}: {
  label: string
  colour: string
  children: React.ReactNode
}) => (
  <div>
    <span className="mb-1.5 block text-[11px]" style={{ color: colour }}>
      {label}
    </span>
    {children}
  </div>
)

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

export default Components
