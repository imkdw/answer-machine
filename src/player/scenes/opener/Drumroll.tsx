import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import type { SceneProps } from '../../types'

const DURATION = 2600

export default function Drumroll({ onDone, audio }: SceneProps): React.JSX.Element {
  const [n, setN] = useState(1)

  useEffect(() => {
    const h = audio.sfx('drumroll')
    const t = window.setInterval(() => setN((v) => v + 1), 220)
    return () => {
      h.stop()
      window.clearInterval(t)
    }
  }, [audio])

  useTimeout(() => {
    audio.sfx('bang')
    onDone()
  }, DURATION)

  const text = '두구'.repeat(Math.min(n, 9))
  const scale = 1 + Math.min(n, 12) * 0.08

  return (
    <SceneFrame>
      <motion.div
        className="shake-forever font-black"
        style={{ fontSize: `clamp(1.5rem, ${2 + n * 0.5}vw + 1rem, 5rem)`, color: 'var(--accent)' }}
        animate={{ scale }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {text}
      </motion.div>
      <div className="mt-6 text-sm opacity-60">답변 등장 준비 중</div>
    </SceneFrame>
  )
}
