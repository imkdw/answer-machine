import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import type { SceneProps } from '../../types'

const DURATION = 3200
const TEXT = '답변을 불러오는 중입니다 잠시만 기다려 주세요'

/** 글자들이 중력에 떨어져 바닥에 쌓임 (rare) */
export default function TextGravity({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const chars = useMemo(
    () =>
      Array.from(TEXT).map((c, i) => ({
        c,
        i,
        delay: 0.6 + rng() * 1.2,
        drift: (rng() - 0.5) * 120,
        rot: (rng() - 0.5) * 200,
        floor: 260 + rng() * 60,
      })),
    [rng],
  )
  useEffect(() => {
    const t = window.setTimeout(() => audio.sfx('bang'), 1500)
    return () => window.clearTimeout(t)
  }, [audio])
  useTimeout(onDone, DURATION)

  return (
    <SceneFrame>
      <div className="flex max-w-sm flex-wrap justify-center text-2xl font-black">
        {chars.map((ch) => (
          <motion.span
            key={ch.i}
            className="inline-block"
            initial={{ y: 0, x: 0, rotate: 0 }}
            animate={{ y: ch.floor, x: ch.drift, rotate: ch.rot }}
            transition={{ delay: ch.delay, duration: 0.9, ease: [0.55, 0, 1, 0.45] }}
          >
            {ch.c === ' ' ? ' ' : ch.c}
          </motion.span>
        ))}
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 }} className="absolute bottom-24 text-sm opacity-70">
        아 글자가 떨어졌네
      </motion.p>
    </SceneFrame>
  )
}
