import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { CHEF } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5000

type Phase = { kind: 'intro' } | { kind: 'think'; round: number } | { kind: 'fail'; round: number; line: string } | { kind: 'pass'; line: string }

/** 흑백요리사 블라인드 심사. 두 번 탈락 찍고 마지막에 생존. 답변은 끝까지 블러. */
export default function ChefJudge({ answer, onDone, audio, rng }: SceneProps): React.JSX.Element {
  const judge = useMemo(() => pick(CHEF.names, rng), [rng])
  const intro = useMemo(() => pick(CHEF.intro, rng), [rng])
  const passLine = useMemo(() => pick(CHEF.pass, rng), [rng])
  const failLines = useMemo(() => {
    const pool = [...CHEF.judge]
    const a = pool.splice(Math.floor(rng() * pool.length), 1)[0]!
    const b = pool.splice(Math.floor(rng() * pool.length), 1)[0]!
    return [a, b]
  }, [rng])
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' })
  const doneRef = useRef(false)

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase({ kind: 'think', round: 0 }), 900),
      window.setTimeout(() => {
        setPhase({ kind: 'fail', round: 0, line: failLines[0]! })
        audio.sfx('boo')
      }, 1700),
      window.setTimeout(() => setPhase({ kind: 'think', round: 1 }), 2500),
      window.setTimeout(() => {
        setPhase({ kind: 'fail', round: 1, line: failLines[1]! })
        audio.sfx('boo')
      }, 3200),
      window.setTimeout(() => setPhase({ kind: 'think', round: 3 }), 3900),
      window.setTimeout(() => {
        setPhase({ kind: 'pass', line: passLine })
        audio.sfx('ding')
      }, 4400),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [audio, failLines, passLine])

  const tasting = phase.kind === 'think'
  const roundLabel = phase.kind === 'think' || phase.kind === 'fail' ? CHEF.round[Math.min(phase.round, CHEF.round.length - 1)] : phase.kind === 'pass' ? CHEF.round[3] : null
  const caption = phase.kind === 'intro' ? intro : phase.kind === 'think' ? '...' : phase.line

  return (
    <SceneFrame style={{ background: '#050505', color: '#f5f5f5', fontFamily: '"Nanum Myeongjo", Georgia, "Apple SD Gothic Neo", serif' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.12), transparent 60%)' }} />
      <div className="scanlines absolute inset-0 opacity-60" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="text-[11px] tracking-[0.5em] opacity-60">블라인드 테스트</div>
        <AnimatePresence mode="wait">
          {roundLabel && (
            <motion.div key={roundLabel} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-xs font-bold tracking-widest" style={{ color: '#d4af37' }}>
              {roundLabel}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 심사위원 */}
        <div className="mt-5 flex items-end gap-4">
          <motion.div animate={tasting ? { y: [0, -4, 0] } : { y: 0 }} transition={{ repeat: tasting ? Infinity : 0, duration: 0.6 }} className="flex flex-col items-center">
            <div className="text-6xl">🕶️</div>
            <div className="mt-1 text-[11px] font-bold">{judge}</div>
          </motion.div>
          <div className="flex flex-col items-center opacity-70">
            <div className="text-5xl">👨‍🍳</div>
            <div className="mt-1 text-[10px]">요리사 (긴장)</div>
          </div>
        </div>

        {/* 접시 */}
        <div className="relative mt-6 flex h-40 w-40 items-center justify-center rounded-full border-4 border-white/80 bg-white/10 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/5 px-3 text-center text-sm font-bold" style={{ filter: 'blur(9px)', userSelect: 'none' }} aria-hidden>
            {answer}
          </div>
          <motion.div
            className="absolute -top-4 -right-2 text-3xl"
            animate={tasting ? { x: [-6, -30, -6], y: [0, 40, 0], rotate: [0, -30, 0] } : { x: 0, y: 0, rotate: 0 }}
            transition={{ repeat: tasting ? Infinity : 0, duration: 0.7 }}
          >
            🍴
          </motion.div>

          <AnimatePresence>
            {phase.kind === 'fail' && (
              <motion.div
                key={`fail-${phase.round}`}
                initial={{ scale: 3, opacity: 0, rotate: 20 }}
                animate={{ scale: 1, opacity: 1, rotate: -14 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="rounded border-4 px-4 py-1 text-4xl font-black" style={{ color: '#e11d48', borderColor: '#e11d48', textShadow: '0 0 12px rgba(225,29,72,0.6)' }}>
                  탈락
                </div>
              </motion.div>
            )}
            {phase.kind === 'pass' && (
              <motion.div
                key="pass"
                initial={{ scale: 3, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="rounded border-4 px-4 py-1 text-4xl font-black" style={{ color: '#22c55e', borderColor: '#22c55e', textShadow: '0 0 12px rgba(34,197,94,0.6)' }}>
                  생존
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 자막 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={caption}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-6 min-h-8 max-w-[90vw] rounded bg-black/70 px-4 py-1.5 text-base font-bold"
            style={{ color: phase.kind === 'fail' ? '#fca5a5' : phase.kind === 'pass' ? '#86efac' : '#fff' }}
          >
            {phase.kind === 'think' ? (
              <span className="blink">{caption}</span>
            ) : (
              <>
                <span className="opacity-60">{judge}: </span>
                {caption}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
