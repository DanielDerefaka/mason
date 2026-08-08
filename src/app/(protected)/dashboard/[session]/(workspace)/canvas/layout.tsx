export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  // The canvas fills the viewport under the navbar and must not scroll.
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
}
