import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { CAME_BACK } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 3200

/** "감옥에서 누가 돌아왔~게". 출소한 남친이 공주님 지켜주겠다며 택시기사 앞에서 전화하는 상황극 (팔리아치 2026-06). */
export default function CameBack({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const princess = useMemo(() => pick(CAME_BACK.princess, rng), [rng])
  const where = useMemo(() => pick(CAME_BACK.where, rng), [rng])
  const who = useMemo(() => pick(CAME_BACK.who, rng), [rng])

  const [step, setStep] = useState(0)
  const [sec, setSec] = useState(0)
  const [shake, setShake] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    const timers: number[] = []
    timers.push(window.setTimeout(() => setStep(1), 300))
    timers.push(
      window.setTimeout(() => {
        audio.sfx('whoosh')
        setStep(2)
      }, 1000),
    )
    timers.push(window.setTimeout(() => audio.sfx('raeulla'), 1250))
    timers.push(
      window.setTimeout(() => {
        audio.sfx('bang')
        setShake(true)
        setStep(3)
      }, 2300),
    )
    timers.push(window.setTimeout(() => setShake(false), 2800))
    const clock = window.setInterval(() => setSec((s) => s + 1), 1000)
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      window.clearInterval(clock)
    }
  }, [audio])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')

  // "왔"과 "게" 뒤의 "~"를 늘어뜨린다
  const parts = useMemo(() => {
    const text = `${where}${CAME_BACK.line}`
    const out: Array<{ t: string; stretch: boolean }> = []
    const chars = Array.from(text)
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!
      if (ch === '~') {
        const prev = chars[i - 1]
        out.push({ t: '~', stretch: prev === '왔' || prev === '게' })
      } else out.push({ t: ch, stretch: false })
    }
    // "게" 뒤에 늘어지는 ~ 하나 추가
    out.push({ t: '~', stretch: true })
    return out
  }, [where])

  return (
    <SceneFrame style={{ background: '#050505', color: '#f5f5f5', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' }} className={shake ? 'shake' : ''}>
      {/* 통화 UI */}
      <div className="absolute inset-x-0 top-8 flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-pink-400 text-4xl shadow-[0_0_30px_rgba(255,200,80,0.5)]">👑</div>
        <div className="mt-3 text-xl font-bold">공주님</div>
        <div className="mt-1 text-sm text-green-400">
          통화 중 {mm}:{ss}
        </div>
      </div>

      {/* 택시 미터기 */}
      <div className="absolute top-4 right-4 rounded-md border border-yellow-500/60 bg-black/70 px-2 py-1 text-left font-mono text-[10px] text-yellow-300">
        <div className="opacity-70">TAXI</div>
        <div className="text-sm font-bold">4,800원</div>
        <div className="opacity-70">(이상한 길)</div>
      </div>

      <div className="relative z-10 flex w-full max-w-[340px] flex-col items-center gap-4 pt-24">
        <AnimatePresence>
          {step >= 1 && (
            <motion.div key="p" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-gray-400">
              {princess}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-h-[7rem] w-full">
          <AnimatePresence>
            {step >= 2 && (
              <motion.div
                key="line"
                initial={{ scale: 0.3, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                className="flex flex-wrap items-baseline justify-center text-[2.1rem] leading-tight font-black tracking-tight"
                style={{ textShadow: '0 0 24px rgba(255,255,255,0.35)' }}
              >
                {parts.map((p, i) =>
                  p.stretch ? (
                    <motion.span
                      key={i}
                      className="inline-block origin-left text-pink-400"
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: [1, 4, 3.6, 4] }}
                      transition={{ delay: 0.25 + i * 0.03, duration: 0.9, ease: 'easeOut' }}
                    >
                      ~
                    </motion.span>
                  ) : (
                    <span key={i} className={p.t === ' ' ? 'inline-block w-2' : ''}>
                      {p.t}
                    </span>
                  ),
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {step >= 3 && (
            <motion.div
              key="who"
              initial={{ scale: 2.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="rounded-full bg-red-600 px-5 py-2 text-xl font-black text-white shadow-[0_0_30px_rgba(255,0,0,0.6)]"
            >
              {who} 돌아옴
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 통화 버튼 */}
      <div className="absolute inset-x-0 bottom-20 flex items-center justify-center gap-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 text-2xl">🔇</div>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-3xl shadow-lg">📵</div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 text-2xl">🔊</div>
      </div>
    </SceneFrame>
  )
}
