import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTimeout } from '../../useTimeout'
import type { SceneProps } from '../../types'

const DURATION = 2400

export default function CrtPowerOn({ onDone, audio }: SceneProps): React.JSX.Element {
  const [phase, setPhase] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    audio.sfx('beep')
    const t1 = window.setTimeout(() => {
      setPhase(1)
      audio.sfx('static')
    }, 500)
    const t2 = window.setTimeout(() => setPhase(2), 1300)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [audio])
  useTimeout(onDone, DURATION)

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black text-green-400" style={{ fontFamily: '"Courier New", monospace' }}>
      <motion.div
        className="scanlines relative w-full bg-green-950/60"
        initial={{ height: 2, opacity: 1, scaleX: 0.2 }}
        animate={phase === 0 ? { height: 2, scaleX: 1 } : { height: '100%', scaleX: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {phase === 2 && (
          <div className="absolute inset-0 p-6 text-left text-sm sm:text-base">
            <p>ANSWER MACHINE v0.1</p>
            <p>MEMORY TEST ... 64K OK</p>
            <p>LOADING ANSWER ... </p>
            <p className="mt-2">
              READY<span className="blink">_</span>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
