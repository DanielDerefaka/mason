'use client'

/**
 * The last resort — this replaces the root layout, so it cannot use anything
 * from it: no fonts, no theme tokens, no shared components. Everything here is
 * inline on purpose, because whatever broke may be the layout itself.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0B0B0C',
          color: '#F4F4F5',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Mason could not start</h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: '#A1A1AA' }}>
            Something failed before the app finished loading. Your saved work is not
            affected.
          </p>
          {error.digest && (
            <p style={{ marginTop: 14, fontSize: 11, fontFamily: 'ui-monospace, monospace', color: '#71717A' }}>
              Reference {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#F4F4F5',
              color: '#0B0B0C',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
