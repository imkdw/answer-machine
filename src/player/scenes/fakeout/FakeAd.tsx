import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { FAKE_AD_LINES } from '../../../copy/loadingLines'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

// "5초 후 건너뛰기" 카운트가 4에서 다시 5로 올라감
const COUNT_SEQ = [5, 4, 5, 4, 3, 2, 1]

export default function FakeAd({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const ad = useMemo(() => pick(FAKE_AD_LINES, rng), [rng])
  const [i, setI] = useState(0)

  useEffect(() => {
    if (i >= COUNT_SEQ.length) {
      onDone()
      return
    }
    const t = window.setTimeout(() => {
      if (COUNT_SEQ[i + 1] !== undefined && COUNT_SEQ[i + 1]! > COUNT_SEQ[i]!) audio.sfx('error')
      setI(i + 1)
    }, 640)
    return () => window.clearTimeout(t)
  }, [i, audio, onDone])

  const n = COUNT_SEQ[Math.min(i, COUNT_SEQ.length - 1)]!
  const wentUp = i > 0 && COUNT_SEQ[i]! > (COUNT_SEQ[i - 1] ?? 0)

  return (
    <SceneFrame style={{ background: '#f5f5f5', color: '#111', fontFamily: 'system-ui, sans-serif' }}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-orange-400 to-pink-500 text-6xl">🛍️</div>
        <div className="p-5 text-left">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">광고 / Sponsored</div>
          <div className="text-xl font-black">{ad.title}</div>
          <div className="mt-1 text-sm text-gray-600">{ad.body}</div>
        </div>
      </div>
      <motion.div
        key={i}
        initial={wentUp ? { scale: 1.3, color: '#dc2626' } : { scale: 1 }}
        animate={{ scale: 1, color: '#374151' }}
        className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow"
      >
        {i >= COUNT_SEQ.length - 1 ? '건너뛰기 ▶' : `${n}초 후 건너뛰기`}
      </motion.div>
    </SceneFrame>
  )
}
