import { Canvas } from '@/components/canvas'

export const metadata = { title: 'Canvas' }

export default function CanvasPage() {
  return (
    <div className="relative flex-1">
      <Canvas />
    </div>
  )
}
