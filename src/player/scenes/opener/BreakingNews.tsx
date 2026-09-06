import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { BREAKING_LINES, BREAKING_SUBS, pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 3000

export default function BreakingNews({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const head = useMemo(() => pick(BREAKING_LINES, rng), [rng])
  const sub = useMemo(() => pick(BREAKING_SUBS, rng), [rng])

  useEffect(() => {
    audio.sfx('ding')
    const t = window.setTimeout(() => audio.sfx('ding'), 350)
    const t2 = window.setTimeout(() => audio.sfx('ding'), 700)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [audio])
  useTimeout(onDone, DURATION)

  return (
    <SceneFrame style={{ background: '#101010', color: '#fff' }}>
      <motion.div
        initial={{ scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className="rounded bg-red-600 px-8 py-3 text-4xl font-black tracking-widest text-white"
      >
        {head}
      </motion.div>
      <div className="absolute inset-x-0 bottom-16 border-y-4 border-yellow-400 bg-red-700 py-3 text-lg font-bold text-white">
        <div className="marquee">{sub} &nbsp;&nbsp;&nbsp; {sub} &nbsp;&nbsp;&nbsp; {sub}</div>
      </div>
      <div className="absolute top-6 left-6 rounded bg-white/90 px-2 py-1 text-xs font-black text-red-700">LIVE ●</div>
    </SceneFrame>
  )
}
