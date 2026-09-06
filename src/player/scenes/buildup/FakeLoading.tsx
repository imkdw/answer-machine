import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useInterval, useTimeout } from '../../useTimeout'
import { LOADING_LINES } from '../../../copy/loadingLines'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5200

/** 99%에서 3초 버팀. 상태 문구는 계속 바뀜. */
export default function FakeLoading({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const [pct, setPct] = useState(0)
  const [line, setLine] = useState(() => pick(LOADING_LINES, rng))

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (): void => {
      const t = (performance.now() - start) / 2000 // 2초 안에 99%
      const eased = 1 - Math.pow(1 - Math.min(t, 1), 3)
      setPct(Math.min(99, Math.floor(eased * 99)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useInterval(() => {
    setLine(pick(LOADING_LINES, rng))
    audio.sfx('tick')
  }, 650)

  useTimeout(() => {
    setPct(100)
    audio.sfx('ding')
    window.setTimeout(onDone, 250)
  }, DURATION - 250)

  return (
    <SceneFrame>
      <div className="w-full max-w-sm">
        <div className="mb-3 flex items-baseline justify-between text-sm">
          <span className="opacity-80">{line}...</span>
          <span className="text-2xl font-black tabular-nums">{pct}%</span>
        </div>
        <div className="h-5 w-full overflow-hidden rounded-full border-2" style={{ borderColor: 'var(--fg)' }}>
          <motion.div className="h-full" style={{ background: 'var(--accent)', width: `${pct}%` }} />
        </div>
        {pct >= 99 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-4 text-xs opacity-60">
            99%는 원래 오래 걸림
          </motion.p>
        )}
      </div>
    </SceneFrame>
  )
}
