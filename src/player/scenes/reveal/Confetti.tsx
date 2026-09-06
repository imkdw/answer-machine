import { useMemo } from 'react'
import { motion } from 'framer-motion'

const COLORS = ['#ff2d95', '#2dffea', '#ffd400', '#7cff4a', '#ff7a2d', '#a78bfa']

export function Confetti({ count = 60, rng = Math.random }: { count?: number; rng?: () => number }): React.JSX.Element {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: 50 + (rng() - 0.5) * 20,
        dx: (rng() - 0.5) * 140,
        dy: -(rng() * 60 + 20),
        color: COLORS[i % COLORS.length]!,
        rot: rng() * 720,
        size: 6 + rng() * 8,
        delay: rng() * 0.15,
      })),
    [count, rng],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {parts.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-sm"
          style={{ left: `${p.x}%`, top: '55%', width: p.size, height: p.size * 0.6, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: `${p.dx}vw`, y: [`${p.dy}vh`, '60vh'], opacity: [1, 1, 0], rotate: p.rot }}
          transition={{ delay: p.delay, duration: 1.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
