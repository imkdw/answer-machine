import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { JUDGE_NAMES } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 4200

/** 심사위원 3명이 점수판을 드는 척하다가 전원 "?" */
export default function JudgePanel({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const judges = useMemo(() => {
    const pool = [...JUDGE_NAMES]
    const out: string[] = []
    for (let i = 0; i < 3; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!)
    return out
  }, [rng])
  const scores = useMemo(() => judges.map(() => Math.floor(rng() * 4) + 6), [judges, rng])
  const [phase, setPhase] = useState<'wait' | 'raise' | 'what'>('wait')

  useEffect(() => {
    const h = audio.sfx('drumroll')
    const t1 = window.setTimeout(() => {
      h.stop()
      setPhase('raise')
      audio.sfx('ding')
    }, 1500)
    const t2 = window.setTimeout(() => {
      setPhase('what')
      audio.sfx('boo')
    }, 3000)
    return () => {
      h.stop()
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [audio])
  useTimeout(onDone, DURATION)

  return (
    <SceneFrame>
      <div className="mb-8 text-lg font-bold opacity-80">답변 심사 결과</div>
      <div className="flex gap-4">
        {judges.map((name, i) => (
          <div key={name} className="flex flex-col items-center gap-2">
            <motion.div
              className="flex h-24 w-20 items-center justify-center rounded-lg border-4 text-4xl font-black"
              style={{ borderColor: 'var(--fg)', background: 'color-mix(in srgb, var(--fg) 10%, transparent)' }}
              initial={{ y: 80, opacity: 0 }}
              animate={phase === 'wait' ? { y: 80, opacity: 0 } : { y: 0, opacity: 1, rotate: phase === 'what' ? [0, -8, 8, 0] : 0 }}
              transition={{ delay: i * 0.15, type: 'spring', stiffness: 250 }}
            >
              {phase === 'what' ? '?' : scores[i]}
            </motion.div>
            <span className="text-xs opacity-70">{name}</span>
          </div>
        ))}
      </div>
      {phase === 'what' && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-sm" style={{ color: 'var(--accent)' }}>
          심사위원들도 답을 모름
        </motion.p>
      )}
    </SceneFrame>
  )
}
