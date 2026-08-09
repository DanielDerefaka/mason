/**
 * The editor is its own full-screen surface, so it opts out of the workspace
 * chrome — the navbar above it belongs to the canvas, and the editor has its
 * own header with the controls that apply here.
 */
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-hidden">{children}</div>
}
