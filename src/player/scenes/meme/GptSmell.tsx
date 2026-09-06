import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { useTimeout } from '../../useTimeout'
import { toast } from '../../Toast'
import { GPT_SMELL } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5000
const STEP_MS = 420
const R = 44
const CIRC = 2 * Math.PI * R

/** GPT 냄새 판독기. 97%까지 올라가는 게이지, 체크리스트, 그리고 지브리풍 변환 실패. */
export default function GptSmell({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(GPT_SMELL.title, rng), [rng])
  const result = useMemo(() => pick(GPT_SMELL.result, rng), [rng])
  const [step, setStep] = useState(0)
  const [pct, setPct] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [ghibli, setGhibli] = useState(-1)
  const doneRef = useRef(false)

  const steps = GPT_SMELL.steps
  const stepsDone = step >= steps.length

  // 체크리스트 한 줄씩
  useEffect(() => {
    if (stepsDone) return
    const t = window.setTimeout(() => {
      audio.sfx('tick')
      setStep((s) => s + 1)
      setPct(Math.round(((step + 1) / steps.length) * 97))
    }, STEP_MS)
    return () => window.clearTimeout(t)
  }, [step, stepsDone, steps.length, audio])

  // 결과
  useEffect(() => {
    if (!stepsDone || showResult) return
    const t = window.setTimeout(() => {
      setShowResult(true)
      audio.sfx('ding')
    }, 250)
    return () => window.clearTimeout(t)
  }, [stepsDone, showResult, audio])

  // 지브리풍 변환 3단계
  useEffect(() => {
    if (!showResult) return
    if (ghibli >= GPT_SMELL.ghibli.length - 1) return
    const t = window.setTimeout(
      () => {
        const next = ghibli + 1
        setGhibli(next)
        if (next === GPT_SMELL.ghibli.length - 1) audio.sfx('error')
        else audio.sfx('sparkle')
      },
      ghibli < 0 ? 350 : 600,
    )
    return () => window.clearTimeout(t)
  }, [showResult, ghibli, audio])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  const failed = ghibli === GPT_SMELL.ghibli.length - 1

  return (
    <SceneFrame style={{ background: '#0f1117', color: '#e6e6ef', fontFamily: 'system-ui, sans-serif' }}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#171a23] p-5 text-left shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-white/80">{title}</div>
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">v4.2 beta</span>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={R} fill="none" stroke="#2a2f3d" strokeWidth="9" />
              <motion.circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={pct > 80 ? '#ff4d6d' : '#7c9cff'}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                animate={{ strokeDashoffset: CIRC * (1 - pct / 100) }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl">👃</span>
              <span className="text-lg font-black tabular-nums">{pct}%</span>
            </div>
          </div>
          <ul className="flex-1 space-y-1 text-xs">
            {steps.map((s, i) => {
              const done = i < step
              const active = i === step
              if (!done && !active) return null
              return (
                <motion.li key={s} initial={{ x: 12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-1.5">
                  <span className={done ? 'text-emerald-400' : 'animate-pulse text-white/50'}>{done ? '✓' : '○'}</span>
                  <span className={done ? 'text-white/70' : 'text-white'}>{s}</span>
                </motion.li>
              )
            })}
          </ul>
        </div>

        <AnimatePresence>
          {showResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-lg bg-white/5 p-3 text-sm font-bold" style={{ color: '#ffd166' }}>
              {result}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {ghibli >= 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 overflow-hidden">
              <div className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-sky-200 to-emerald-200 text-3xl">
                  <motion.span animate={failed ? { opacity: 0.3 } : {}} style={ghibli >= 1 && !failed ? { filter: 'sepia(0.6) blur(0.5px) saturate(1.3)' } : undefined}>
                    🖼️
                  </motion.span>
                  {failed && (
                    <motion.span initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute text-4xl">
                      ❌
                    </motion.span>
                  )}
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-white/80">지브리풍 변환</div>
                  <div className={`mt-1 ${failed ? 'text-red-400' : 'text-white/60'}`}>{GPT_SMELL.ghibli[ghibli]}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex justify-end">
          <TrollButton label="재검사" className="btn-ghost text-xs" audio={audio} onPress={() => toast('결과 동일')} reactions={[{ sfx: 'beep' }, { toast: '결과 동일 (2회차)', proceed: false, sfx: 'error' }]} />
        </div>
      </div>
    </SceneFrame>
  )
}
