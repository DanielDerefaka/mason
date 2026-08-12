import { COMPONENT_ATTR, readDesign, type DesignModel } from '@/lib/design-model'
import { childrenToJsx, elementToJsx } from '@/lib/html-to-jsx'
import { parseDeclarations, toTailwind } from '@/lib/tailwind-from-css'
import type { Shape } from '@/redux/slice/shapes'
import type { StyleGuide } from '@/types/style-guide'

/**
 * The design as a project rather than a page.
 *
 * The HTML export hands over an artefact and the brief hands over
 * instructions. This hands over the thing itself: a Next.js app that runs with
 * `npm install && npm run dev`, with the palette and the type scale as real
 * tokens, one component per section, and the design's own stylesheet carried
 * across so every hover and breakpoint it had still works.
 *
 * It reads the design through `design-model.ts` — the same reading the brief
 * uses — so a project and the brief beside it cannot disagree about what the
 * palette is.
 */

export type ProjectFile = { path: string; content: string }

/** A name that can be both a file and a React component. */
export const identifier = (text: string, fallback = 'Section'): string => {
  const words = text
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())

  const name = words.join('')
  // A component cannot start with a digit, and an empty heading is common.
  if (!name) return fallback
  return /^[0-9]/.test(name) ? `${fallback}${name}` : name
}

const unique = (name: string, taken: Set<string>): string => {
  if (!taken.has(name)) {
    taken.add(name)
    return name
  }
  let index = 2
  while (taken.has(`${name}${index}`)) index += 1
  taken.add(`${name}${index}`)
  return `${name}${index}`
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mason-design'

/**
 * The class the design's own stylesheet is confined beneath.
 *
 * In the editor it is `.mason-design`; in an exported project that name means
 * nothing to anybody, so the wrapper and every selector in the sheet are
 * renamed together. Renaming one without the other silently drops every hover
 * and breakpoint the design had.
 */
const PAGE_CLASS = 'page'

const rootOf = (body: HTMLElement): HTMLElement =>
  body.children.length === 1 ? (body.firstElementChild as HTMLElement) : body

/**
 * The heading a section is named after — its own, not one belonging to
 * something inside it.
 *
 * The first `h1, h2, h3` anywhere in the subtree is the obvious rule and the
 * wrong one: a grid of three cards takes its name from the first card, so a
 * feature grid exports as `Fast.tsx`. A section's own heading is a child of
 * it, or a child of the single container it wraps everything in — which is the
 * one nesting that is a layout device rather than content.
 */
const ownHeading = (section: Element): string => {
  let scope: Element = section
  while (scope.children.length === 1 && scope.firstElementChild) {
    scope = scope.firstElementChild
  }
  const heading = Array.from(scope.children).find((child) => /^H[1-3]$/.test(child.tagName))
  return heading?.textContent?.trim() ?? ''
}

/** The stylesheet the design carries, rescoped to the exported wrapper. */
const designStylesheet = (body: HTMLElement): string =>
  Array.from(body.querySelectorAll('style'))
    .map((sheet) => (sheet.textContent ?? '').trim())
    .filter(Boolean)
    .join('\n\n')
    .replace(/\.mason-design\b/g, `.${PAGE_CLASS}`)

const component = (name: string, jsx: string, imports: string[]): string => {
  const head = imports.length
    ? `${imports.map((child) => `import { ${child} } from './${child}'`).join('\n')}\n\n`
    : ''
  return `${head}export const ${name} = () => (\n${jsx}\n)\n`
}

/**
 * `--primary: #4F46E5` twice over.
 *
 * Once in `:root`, because the design's own markup references `var(--primary)`
 * directly and would render unpainted without it. Once in `@theme`, because
 * that is what makes `bg-primary` and `text-primary` exist as utilities — the
 * export is a Tailwind project, so the palette has to be part of Tailwind and
 * not merely present on the page.
 */
const globalsCss = (model: DesignModel, stylesheet: string): string => {
  const { colours, family, radii } = model.tokens

  const root = [
    ...colours.map((colour) => `  ${colour.token}: ${colour.hex};`),
    family ? `  --font-family: '${family}', system-ui, sans-serif;` : null,
    ...radii.map((step) => `  --radius-${slug(step.name)}: ${step.value === 9999 ? '9999px' : `${step.value}px`};`),
  ].filter(Boolean)

  const theme = [
    ...colours.map((colour) => `  --color-${slug(colour.name)}: var(${colour.token});`),
    family ? '  --font-sans: var(--font-family);' : null,
  ].filter(Boolean)

  return `@import "tailwindcss";

/* The design's tokens. The markup references these directly, so they have to
   exist on the root as well as inside the theme. */
:root {
${root.join('\n')}
}

/* Named so the palette is usable as Tailwind utilities too: bg-primary,
   text-foreground, and so on. */
@theme inline {
${theme.join('\n')}
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background, #ffffff);
  color: var(--foreground, #111111);
  font-family: var(--font-family, system-ui, sans-serif);
}
${stylesheet ? `\n/* Carried over from the design's own stylesheet — this is where its\n   hovers, focus rings and breakpoints live. */\n${stylesheet}\n` : ''}`
}

const layoutTsx = (model: DesignModel): string => {
  const { family } = model.tokens
  /**
   * A stylesheet link rather than `next/font`.
   *
   * `next/font/google` demands an explicit weight list for a static family and
   * refuses one for a variable family, and which of those a given design's
   * typeface is cannot be known from here. A link works for both, and the
   * README says how to swap it.
   */
  const font = family
    ? `
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@300;400;500;600;700;800&display=swap"
        />`
    : ''

  return `import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: ${JSON.stringify(model.name)},
  description: ${JSON.stringify(model.tokens.description ?? model.name)},
}

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <head>${font}
    </head>
    <body>{children}</body>
  </html>
)

export default RootLayout
`
}

const readme = (model: DesignModel, files: ProjectFile[]): string => {
  const components = files
    .filter((file) => file.path.startsWith('components/'))
    .map((file) => `- \`${file.path}\``)

  return `# ${model.name}

Exported from Mason. A Next.js App Router project with Tailwind v4.

\`\`\`bash
npm install
npm run dev
\`\`\`

## What is where

- \`app/page.tsx\` — the page, composed from the sections below.
- \`app/globals.css\` — the palette and type tokens${model.tokens.radii.length ? ', the radius scale' : ''}, and the design's own stylesheet.
${components.join('\n')}

## About the styles

Measurements are translated to Tailwind where a utility means exactly the same
thing — \`padding: 24px\` is \`p-6\` — and kept as an arbitrary value where it
does not, so nothing has been rounded to the nearest step. A declaration with
no utility form at all stays in a \`style\` prop on the element. The page
therefore renders exactly as it did in Mason.

${model.tokens.family ? `Type is loaded with a Google Fonts \`<link>\` in \`app/layout.tsx\`. To use \`next/font\` instead, replace it with an import of **${model.tokens.family}** and put the returned \`className\` on \`<body>\`.\n` : ''}
## Images

Photographs point back at the Mason deployment that exported this project, so
they load without any credentials. Swap them for your own before shipping.
`
}

const PACKAGE_JSON = (name: string) =>
  `${JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
      },
      dependencies: {
        next: '^15.5.0',
        react: '^19.1.0',
        'react-dom': '^19.1.0',
      },
      devDependencies: {
        '@tailwindcss/postcss': '^4',
        '@types/node': '^20',
        '@types/react': '^19',
        '@types/react-dom': '^19',
        tailwindcss: '^4',
        typescript: '^5',
      },
    },
    null,
    2,
  )}\n`

const TSCONFIG = `${JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2017',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  },
  null,
  2,
)}\n`

const STATIC_FILES: ProjectFile[] = [
  {
    path: 'postcss.config.mjs',
    content: `const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
`,
  },
  {
    path: 'next.config.ts',
    content: `import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
`,
  },
  {
    path: '.gitignore',
    content: ['node_modules', '.next', 'out', '.env*.local', '.DS_Store', ''].join('\n'),
  },
  { path: 'tsconfig.json', content: TSCONFIG },
]

/**
 * Photograph slots point at this application by relative path, which is right
 * everywhere Mason renders the design and wrong in a project on somebody
 * else's machine, where there is no origin to be relative to.
 */
const absolute = (origin: string) => (value: string) =>
  value.startsWith('/api/image/') ? `${origin}${value}` : value

export const buildProject = (
  design: Shape,
  guide: StyleGuide | null,
  options: { origin: string },
): ProjectFile[] => {
  const model = readDesign(design, guide)
  const doc = new DOMParser().parseFromString(`<body>${model.html}</body>`, 'text/html')
  const root = rootOf(doc.body)

  const url = absolute(options.origin)
  const taken = new Set<string>(['Page', 'RootLayout'])

  /**
   * Names are resolved before anything is rendered.
   *
   * A component's markup can contain a reference to another component, so
   * every name has to exist before the first file is written — otherwise the
   * first file to mention the last component imports a name that has not been
   * decided yet.
   */
  const names = new Map<string, string>()
  for (const entry of model.components) {
    names.set(entry.name, unique(identifier(entry.name), taken))
  }

  /** Which elements are a component boundary, and under what name. */
  const boundary = (element: Element): string | null => {
    const given = element.getAttribute(COMPONENT_ATTR)?.trim()
    return given ? (names.get(given) ?? null) : null
  }

  /** The components referenced inside a subtree, for its import list. */
  const referencedIn = (element: Element, self: Element | null): string[] => {
    const found = new Set<string>()
    for (const node of Array.from(element.querySelectorAll<HTMLElement>(`[${COMPONENT_ATTR}]`))) {
      if (node === self) continue
      const name = boundary(node)
      if (name) found.add(name)
    }
    return Array.from(found)
  }

  const files: ProjectFile[] = []
  const emitted = new Set<string>()

  const emit = (element: Element, name: string) => {
    if (emitted.has(name)) return
    emitted.add(name)
    files.push({
      path: `components/${name}.tsx`,
      content: component(name, elementToJsx(element, { boundary, url }, 1), referencedIn(element, element)),
    })
  }

  // Named components first: a section that is one is emitted from its
  // definition rather than twice under two names.
  for (const entry of model.components) {
    const holder = doc.createElement('div')
    holder.innerHTML = entry.html
    const element = holder.firstElementChild
    if (element) emit(element, names.get(entry.name)!)
  }

  /** The page: one reference per top-level section, in order. */
  const pageChildren: string[] = []
  for (const child of Array.from(root.children)) {
    if (child.tagName.toLowerCase() === 'style') continue

    const given = child.getAttribute(COMPONENT_ATTR)?.trim()
    if (given && names.has(given)) {
      pageChildren.push(names.get(given)!)
      continue
    }

    const name = unique(
      identifier(ownHeading(child) || child.tagName.toLowerCase(), 'Section'),
      taken,
    )
    emit(child, name)
    pageChildren.push(name)
  }

  // The wrapper's own styles belong on the page, not on the first section.
  const wrapper = root === doc.body ? '' : toTailwind(parseDeclarations(root.getAttribute('style') ?? '')).classes.join(' ')
  const wrapperClass = [PAGE_CLASS, root === doc.body ? '' : root.getAttribute('class') ?? '', wrapper]
    .filter(Boolean)
    .join(' ')

  const imports = Array.from(new Set(pageChildren))
  const page = `${imports.map((name) => `import { ${name} } from '@/components/${name}'`).join('\n')}

const Page = () => (
  <div className="${wrapperClass}">
${pageChildren.map((name) => `    <${name} />`).join('\n')}
  </div>
)

export default Page
`

  // Nothing at the top level at all — an empty or single-node design still has
  // to produce a page that runs.
  const body =
    pageChildren.length > 0
      ? page
      : `const Page = () => (
  <div className="${wrapperClass}">
${childrenToJsx(root, { boundary, url }, 2)}
  </div>
)

export default Page
`

  const project: ProjectFile[] = [
    { path: 'package.json', content: PACKAGE_JSON(slug(model.name)) },
    ...STATIC_FILES,
    { path: 'app/layout.tsx', content: layoutTsx(model) },
    { path: 'app/page.tsx', content: body },
    { path: 'app/globals.css', content: globalsCss(model, designStylesheet(doc.body)) },
    ...files,
  ]

  return [...project, { path: 'README.md', content: readme(model, project) }]
}

export const projectFilename = (design: Shape) => `${slug(design.label ?? 'design')}-nextjs.zip`
