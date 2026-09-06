import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { Confetti } from './Confetti'
import { KOREAN_SPEED } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const FLASH_AT = 600
const FLASH_MS = 90
const SLOW_AT = 1800
const SLOW_BUDGET = 2300

type Phase = 'intro' | 'flash' | 'gone' | 'slow' | 'done'

/**
 * 한국인이 좋아하는 속도. 답변을 90ms만 보여주고 "봤죠?" 한 뒤,
 * 달팽이 속도로 한 글자씩 다시 보여준다. 끝나면 답변은 그대로 남는다.
 */
export default function KoreanSpeedReveal({ answer, onDone, audio, rng }: SceneProps): React.JSX.Element {
  const fastLine = useMemo(() => pick(KOREAN_SPEED.fast, rng), [rng])
  const slowLine = useMemo(() => pick(KOREAN_SPEED.slow, rng), [rng])
  const chars = useMemo(() => Array.from(answer), [answer])
  const perChar = useMemo(() => Math.min(250, SLOW_BUDGET / Math.max(1, chars.length)), [chars.length])

  const [phase, setPhase] = useState<Phase>('intro')
  const [shown, setShown] = useState(0)
  const doneRef = useRef(false)

  // 인트로 -> 번쩍 -> 사라짐 -> 느리게
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase('flash'), FLASH_AT),
      window.setTimeout(() => {
        setPhase('gone')
        audio.sfx('beep')
      }, FLASH_AT + FLASH_MS),
      window.setTimeout(() => setPhase('slow'), SLOW_AT),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [audio])

  // 한 글자씩
  useEffect(() => {
    if (phase !== 'slow') return
    if (shown >= chars.length) {
      if (doneRef.current) return
      doneRef.current = true
      audio.sfx('tada')
      setPhase('done')
      onDone()
      return
    }
    const t = window.setTimeout(() => {
      audio.sfx('tick')
      setShown((n) => n + 1)
    }, perChar)
    return () => window.clearTimeout(t)
  }, [phase, shown, chars.length, perChar, audio, onDone])

  const slowing = phase === 'slow' || phase === 'done'
  const progress = chars.length ? shown / chars.length : 1

  return (
    <SceneFrame>
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-xl font-black" style={{ color: 'var(--accent)' }}>
            한국인이 좋아하는 속도로 보여드림
          </motion.div>
        )}
        {phase === 'flash' && (
          <motion.div key="flash" className="answer-text max-w-[90vw]">
            {answer}
          </motion.div>
        )}
        {phase === 'gone' && (
          <motion.div key="gone" initial={{ scale: 0.6, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} exit={{ opacity: 0 }} className="text-2xl font-black" style={{ color: 'var(--accent)' }}>
            {fastLine}
          </motion.div>
        )}
      </AnimatePresence>

      {slowing && (
        <>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: phase === 'done' ? 0 : 1, y: 0 }} className="absolute top-[18%] px-4 text-base font-bold opacity-70">
            {slowLine}
          </motion.div>

          <motion.div
            layout
            className="answer-text relative z-10 max-w-[90vw] rounded-3xl px-6 py-4"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            initial={{ scale: 0.9 }}
            animate={phase === 'done' ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {chars.map((c, i) => (
              <span key={i} style={{ opacity: i < shown ? 1 : 0.12, transition: 'opacity 0.15s' }}>
                {c}
              </span>
            ))}
          </motion.div>

          <motion.div
            className="pointer-events-none absolute bottom-10 select-none text-6xl"
            style={{ left: 0 }}
            animate={{ x: `${8 + progress * 72}vw`, rotate: phase === 'done' ? [0, -10, 10, 0] : 0 }}
            transition={{ x: { duration: perChar / 1000, ease: 'linear' } }}
          >
            🐌
          </motion.div>

          {phase === 'done' && <Confetti rng={rng} />}
        </>
      )}
    </SceneFrame>
  )
}
