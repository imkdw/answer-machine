import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TAP_EMOJI } from '../copy/memes'

interface Particle {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  emoji: string
  rot: number
}

let seq = 0
const PER_TAP = 7
const MIN_GAP_MS = 90

/**
 * 화면 아무 데나 탭하면 그 자리에서 이모지가 터진다. 씬과 무관한 전역 레이어.
 * 어떤 버튼을 눌러도 뭔가 반응은 있어야 계속 누르게 된다.
 */
export function TapBurst(): React.JSX.Element {
  const [items, setItems] = useState<Particle[]>([])

  useEffect(() => {
    let last = 0
    const timers: number[] = []
    const onDown = (e: PointerEvent): void => {
      const now = performance.now()
      if (now - last < MIN_GAP_MS) return
      last = now
      const batch: Particle[] = []
      for (let i = 0; i < PER_TAP; i++) {
        const a = (i / PER_TAP) * Math.PI * 2 + Math.random() * 0.6
        const d = 50 + Math.random() * 70
        batch.push({
          id: ++seq,
          x: e.clientX,
          y: e.clientY,
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d - 30,
          emoji: TAP_EMOJI[Math.floor(Math.random() * TAP_EMOJI.length)]!,
          rot: (Math.random() - 0.5) * 240,
        })
      }
      setItems((prev) => [...prev.slice(-40), ...batch])
      const ids = new Set(batch.map((p) => p.id))
      timers.push(window.setTimeout(() => setItems((prev) => prev.filter((p) => !ids.has(p.id))), 700))
    }
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <AnimatePresence>
        {items.map((p) => (
          <motion.span
            key={p.id}
            className="absolute text-xl select-none"
            style={{ left: p.x, top: p.y, marginLeft: -12, marginTop: -12 }}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
            animate={{ x: p.dx, y: p.dy + 40, scale: 1.2, opacity: 0, rotate: p.rot }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
