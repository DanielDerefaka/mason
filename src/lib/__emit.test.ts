import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'vitest'

import { buildProject } from '@/lib/project-export'
import type { Shape } from '@/redux/slice/shapes'
import type { StyleGuide } from '@/types/style-guide'

const OUT = process.env.EMIT_TO ?? '/tmp/mason-emit'

const html = `
<div style="background:var(--background);font-family:var(--font-family);color:var(--foreground)">
  <style>.mason-design .cta:hover { transform: translateY(-2px) } @media (max-width: 640px) { .mason-design .grid { grid-template-columns: 1fr } }</style>
  <header data-mason-component="Site nav" style="display:flex;align-items:center;justify-content:space-between;padding:20px 48px;border-bottom:1px solid var(--border)">
    <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em">Northwind</span>
    <nav style="display:flex;gap:32px">
      <a href="#work" style="font-size:14px;color:var(--muted-foreground);text-decoration:none">Work</a>
      <a href="#pricing" style="font-size:14px;color:var(--muted-foreground);text-decoration:none">Pricing</a>
      <button class="cta" style="padding:10px 18px;border:none;border-radius:9999px;background:var(--primary);color:var(--primary-foreground);font-size:14px;font-weight:600;cursor:pointer">Get started</button>
    </nav>
  </header>

  <section style="display:flex;flex-direction:column;align-items:center;gap:24px;padding:96px 24px;text-align:center">
    <h1 style="margin:0;font-size:56px;font-weight:700;line-height:1.05;letter-spacing:-0.03em;max-width:720px">Ship the interface you drew</h1>
    <p style="margin:0;font-size:18px;line-height:1.6;color:var(--muted-foreground);max-width:520px">A sketch in, a working page out &mdash; with 5 &lt; 6 and {braces} intact.</p>
    <img alt="" src="/api/image/abc123" style="width:100%;max-width:960px;height:420px;object-fit:cover;border-radius:26px">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/><circle cx="12" cy="12" r="9"/></svg>
  </section>

  <section class="grid" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:20px;padding:0 48px 96px">
    <div data-mason-component="Feature card" style="display:flex;flex-direction:column;gap:8px;padding:26px;border-radius:12px;background:var(--card);box-shadow:0 1px 2px 0 rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255,255,255,0.06)">
      <h3 style="margin:0;font-size:20px;font-weight:600">Fast</h3>
      <p style="margin:0;font-size:14px;color:var(--muted-foreground)">Draw it, generate it.</p>
    </div>
    <div data-mason-component="Feature card" style="display:flex;flex-direction:column;gap:8px;padding:26px;border-radius:12px;background:var(--card)">
      <h3 style="margin:0;font-size:20px;font-weight:600">Faithful</h3>
      <p style="margin:0;font-size:14px;color:var(--muted-foreground)">Your palette, not ours.</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;padding:26px;border-radius:12px;background:var(--card)">
      <h3 style="margin:0;font-size:20px;font-weight:600">Yours</h3>
      <p style="margin:0;font-size:14px;color:var(--muted-foreground)">Export and own it.</p>
    </div>
  </section>

  <footer style="padding:32px 48px;border-top:1px solid var(--border)">
    <p style="margin:0;font-size:13px;color:var(--muted-foreground)">&copy; Northwind. All&nbsp;rights reserved.</p>
  </footer>
</div>`

const design: Shape = {
  id: 'd1',
  kind: 'generated-ui',
  x: 0,
  y: 0,
  width: 1280,
  height: 2000,
  fill: 'transparent',
  label: 'Northwind marketing',
  html,
}

const guide = {
  theme: 'Quiet Industrial',
  description: 'Restrained, high contrast, built around one accent.',
  colorSections: [
    {
      title: 'Core',
      swatches: [
        { name: 'Background', token: '--background', color: '#0a0a0a' },
        { name: 'Foreground', token: '--foreground', color: '#fafafa' },
        { name: 'Muted foreground', token: '--muted-foreground', color: '#a1a1aa' },
        { name: 'Card', token: '--card', color: '#141416' },
        { name: 'Border', token: '--border', color: '#27272a' },
        { name: 'Primary', token: '--primary', color: '#4F46E5', description: 'Actions only' },
        { name: 'Primary foreground', token: '--primary-foreground', color: '#ffffff' },
      ],
    },
  ],
  typography: { fontFamily: 'Plus Jakarta Sans, sans-serif', styles: [{ name: 'Bold', weight: 700 }] },
  typeScale: [
    { name: 'Display', fontSize: 56, fontWeight: 700, lineHeight: 1.05, letterSpacing: -0.03, usage: 'Hero' },
  ],
  radii: [
    { name: 'Medium', value: 12 },
    { name: 'Pill', value: 9999 },
  ],
  elevation: [{ name: 'Card', shadow: '0 1px 2px rgba(0,0,0,.4)', usage: 'Cards' }],
} as unknown as StyleGuide

describe('emit', () => {
  it('writes a project to disk', () => {
    const files = buildProject(design, guide, { origin: 'https://mason-puce.vercel.app' })
    for (const file of files) {
      const target = join(OUT, file.path)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, file.content)
    }
    console.log(files.map((f) => f.path).join('\n'))
  })
})
