import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import type { SceneProps } from '../../types'

/** 화면이 터지면서 잔해 사이로 답변 */
export default function ExplosionReveal({ answer, onDone, audio, rng }: SceneProps): React.JSX.Element {
  const [boom, setBoom] = useState(false)
  const shards = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: (rng() - 0.5) * 160,
        y: (rng() - 0.5) * 160,
        rot: (rng() - 0.5) * 900,
        size: 30 + rng() * 80,
      })),
    [rng],
  )
  useEffect(() => {
    const t = window.setTimeout(() => {
      setBoom(true)
      audio.sfx('bang')
    }, 500)
    const t2 = window.setTimeout(() => audio.sfx('tada'), 1100)
    const t3 = window.setTimeout(onDone, 2200)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [audio, onDone])

  return (
    <SceneFrame>
      {!boom && (
        <motion.div className="text-6xl" animate={{ scale: [1, 1.3, 1.6], rotate: [0, -5, 5] }} transition={{ duration: 0.5 }}>
          💣
        </motion.div>
      )}
      {boom && (
        <>
          {shards.map((s) => (
            <motion.div
              key={s.id}
              className="absolute"
              style={{ width: s.size, height: s.size, background: 'var(--fg)', opacity: 0.85 }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: `${s.x}vw`, y: `${s.y}vh`, rotate: s.rot, opacity: 0 }}
              transition={{ duration: 1.3, ease: 'easeOut' }}
            />
          ))}
          <motion.div className="absolute inset-0" style={{ background: 'var(--accent)' }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} />
          <motion.div
            initial={{ scale: 3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 16 }}
            className="answer-text relative z-10 max-w-[90vw]"
          >
            {answer}
          </motion.div>
        </>
      )}
    </SceneFrame>
  )
}
