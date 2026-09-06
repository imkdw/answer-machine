import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { KO_LINES, pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

/** 격투게임 K.O. 연출 후 답변 */
export default function KoReveal({ answer, onDone, audio, rng }: SceneProps): React.JSX.Element {
  const line = useMemo(() => pick(KO_LINES, rng), [rng])
  const [phase, setPhase] = useState<0 | 1>(0)
  useEffect(() => {
    audio.sfx('bang')
    const t = window.setTimeout(() => {
      setPhase(1)
      audio.sfx('tada')
    }, 1300)
    const t2 = window.setTimeout(onDone, 2600)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [audio, onDone])

  return (
    <SceneFrame style={{ background: '#000', color: '#fff' }}>
      <div className="absolute inset-x-0 top-8 flex justify-between px-6 text-xs font-bold opacity-80">
        <div className="w-2/5">
          <div>질문자</div>
          <div className="mt-1 h-3 w-full bg-yellow-400">
            <motion.div className="h-full bg-red-600" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 0.8 }} />
          </div>
        </div>
        <div className="w-2/5 text-right">
          <div>답변자</div>
          <div className="mt-1 h-3 w-full bg-yellow-400" />
        </div>
      </div>
      {phase === 0 ? (
        <motion.div
          initial={{ scale: 4, opacity: 0, skewX: -20 }}
          animate={{ scale: 1, opacity: 1, skewX: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="text-7xl font-black italic text-red-500 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)] sm:text-9xl"
        >
          {line}
        </motion.div>
      ) : (
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="answer-text max-w-[90vw] text-yellow-300">
          {answer}
        </motion.div>
      )}
    </SceneFrame>
  )
}
