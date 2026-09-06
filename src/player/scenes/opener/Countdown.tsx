import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import type { SceneProps } from '../../types'

// 3, 2, 1, "잠깐", 10, 9, 8 ... 빠르게 ... 0
const SEQUENCE: Array<{ text: string; ms: number }> = [
  { text: '3', ms: 500 },
  { text: '2', ms: 500 },
  { text: '1', ms: 500 },
  { text: '잠깐', ms: 700 },
  { text: '10', ms: 260 },
  { text: '9', ms: 220 },
  { text: '8', ms: 180 },
  { text: '7', ms: 150 },
  { text: '6', ms: 120 },
  { text: '5', ms: 100 },
  { text: '4', ms: 90 },
  { text: '3', ms: 80 },
  { text: '2', ms: 80 },
  { text: '1', ms: 80 },
  { text: '0', ms: 400 },
]

export default function Countdown({ onDone, audio }: SceneProps): React.JSX.Element {
  const [i, setI] = useState(0)

  useEffect(() => {
    const step = SEQUENCE[i]
    if (!step) {
      onDone()
      return
    }
    audio.sfx(step.text === '잠깐' ? 'error' : 'tick')
    const t = window.setTimeout(() => setI(i + 1), step.ms)
    return () => window.clearTimeout(t)
  }, [i, audio, onDone])

  const step = SEQUENCE[i] ?? SEQUENCE[SEQUENCE.length - 1]!
  const isWord = step.text === '잠깐'

  return (
    <SceneFrame>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={i}
          initial={{ scale: 0.3, opacity: 0, rotate: isWord ? -8 : 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="font-black"
          style={{ fontSize: isWord ? 'clamp(3rem, 15vw, 7rem)' : 'clamp(6rem, 30vw, 14rem)', color: isWord ? 'var(--accent)' : 'var(--fg)' }}
        >
          {step.text}
        </motion.div>
      </AnimatePresence>
    </SceneFrame>
  )
}
