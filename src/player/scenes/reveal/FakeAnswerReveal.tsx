import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { Confetti } from './Confetti'
import type { SceneProps } from '../../types'

const POSITIVE = ['응', '좋아', 'ㅇㅋ', '당연하지', '가능']
const NEGATIVE = ['싫어', '아니', 'ㄴㄴ', '절대 안 됨', '불가능']
const NEG_HINT = /싫|아니|안 |안됨|안 됨|ㄴㄴ|불가|못|말|절대|no/i

/** 가짜 답변 먼저 보여주고 2초 뒤 "농담 ㅋㅋ 진짜 답은" 하고 진짜 답 (rare) */
export default function FakeAnswerReveal({ answer, onDone, audio, rng }: SceneProps): React.JSX.Element {
  const fake = useMemo(() => {
    const pool = NEG_HINT.test(answer) ? POSITIVE : NEGATIVE
    return pool[Math.floor(rng() * pool.length)]!
  }, [answer, rng])
  const [phase, setPhase] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    audio.sfx('pop')
    const t1 = window.setTimeout(() => {
      setPhase(1)
      audio.sfx('error')
    }, 2000)
    const t2 = window.setTimeout(() => {
      setPhase(2)
      audio.sfx('tada')
    }, 3300)
    const t3 = window.setTimeout(onDone, 4600)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [audio, onDone])

  return (
    <SceneFrame>
      {phase === 0 && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }} className="answer-text max-w-[90vw]">
          {fake}
        </motion.div>
      )}
      {phase === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-black" style={{ color: 'var(--accent)' }}>
          농담 ㅋㅋ 진짜 답은
        </motion.div>
      )}
      {phase === 2 && (
        <>
          <Confetti rng={rng} />
          <motion.div
            initial={{ scale: 0, rotate: 10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 12 }}
            className="answer-text relative z-10 max-w-[90vw] rounded-3xl px-6 py-4"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            {answer}
          </motion.div>
        </>
      )}
    </SceneFrame>
  )
}
