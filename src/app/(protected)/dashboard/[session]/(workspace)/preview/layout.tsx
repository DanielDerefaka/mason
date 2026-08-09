/**
 * Preview is the design and nothing else, so it covers the workspace chrome
 * the same way the editor does.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-auto">{children}</div>
}
