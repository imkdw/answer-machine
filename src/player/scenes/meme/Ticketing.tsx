import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { toast } from '../../Toast'
import { useTimeout } from '../../useTimeout'
import { TICKETING } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5000
const START = 4832
const JUMP = 9999
const FLOOR = 12
const FIRST_MS = 1800
const SECOND_START = 2500
const SECOND_MS = 1700

const easeOut = (x: number): number => 1 - Math.pow(1 - x, 3)

/** 티켓팅 대기열. 4,832명 -> 12명 -> 갑자기 9,999명 -> 0명 -> 매진. */
export default function Ticketing({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(TICKETING.title, rng), [rng])
  const note = useMemo(() => pick(TICKETING.note, rng), [rng])
  const jumpNote = useMemo(() => pick(TICKETING.note, rng), [rng])
  const doneLine = useMemo(() => pick(TICKETING.done, rng), [rng])
  const [count, setCount] = useState(START)
  const [phase, setPhase] = useState<'down1' | 'jump' | 'down2' | 'done'>('down1')
  const [flash, setFlash] = useState(false)
  const penalty = useRef(0)
  const doneRef = useRef(false)

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  // 카운트다운 rAF
  useEffect(() => {
    let raf = 0
    let lastTick = 0
    const t0 = performance.now()
    const loop = (now: number): void => {
      const el = now - t0
      let next: number
      if (el < FIRST_MS) {
        next = Math.round(START + penalty.current - (START + penalty.current - FLOOR) * easeOut(el / FIRST_MS))
      } else if (el < SECOND_START) {
        next = JUMP
      } else if (el < SECOND_START + SECOND_MS) {
        next = Math.round(JUMP + penalty.current - (JUMP + penalty.current) * easeOut((el - SECOND_START) / SECOND_MS))
      } else {
        next = 0
      }
      setCount(Math.max(0, next))
      if (now - lastTick > 150 && el < SECOND_START + SECOND_MS && !(el >= FIRST_MS && el < SECOND_START)) {
        lastTick = now
        audio.sfx('tick')
      }
      if (el < SECOND_START + SECOND_MS) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [audio])

  // 페이즈 전환
  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        setPhase('jump')
        setFlash(true)
        audio.sfx('error')
        toast(jumpNote)
        window.setTimeout(() => setFlash(false), 400)
      }, FIRST_MS),
      window.setTimeout(() => setPhase('down2'), SECOND_START),
      window.setTimeout(() => {
        setPhase('done')
        audio.sfx('fanfare')
      }, SECOND_START + SECOND_MS + 100),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [audio, jumpNote])

  const total = phase === 'down1' ? START : JUMP
  const pct = phase === 'done' ? 100 : Math.min(100, Math.max(2, (1 - count / total) * 100))

  return (
    <SceneFrame style={{ background: '#f4f5f7', color: '#1c1c1e', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' }} className={flash ? 'shake' : ''}>
      <AnimatePresence>
        {flash && <motion.div key="flash" className="absolute inset-0 z-0 bg-red-500" initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: '#5b3df5' }}>
          <span className="text-sm font-black">🎫 티켓</span>
          <span className="text-[11px] opacity-80">안전한 예매를 위한 대기열</span>
        </div>

        <div className="px-5 py-6 text-center">
          <div className="text-sm font-bold text-gray-500">{title}</div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} className="h-8 w-8 rounded-full border-4 border-gray-200" style={{ borderTopColor: '#5b3df5' }} />
            <div className="text-left">
              <div className="text-[11px] text-gray-400">앞에</div>
              <motion.div key={phase} initial={phase === 'jump' ? { scale: 1.6, color: '#dc2626' } : { scale: 1 }} animate={{ scale: 1, color: phase === 'done' ? '#16a34a' : phase === 'jump' ? '#dc2626' : '#1c1c1e' }} className="text-5xl font-black tabular-nums leading-none">
                {count.toLocaleString('ko-KR')}
                <span className="ml-1 text-xl">명</span>
              </motion.div>
            </div>
          </div>

          <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.15 }} style={{ background: phase === 'jump' ? '#dc2626' : 'linear-gradient(90deg, #5b3df5, #a78bfa)' }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>대기 시작</span>
            <span>{phase === 'done' ? '입장' : `예상 ${Math.max(1, Math.ceil(count / 400))}분`}</span>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'done' ? (
              <motion.div key="done" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-5 rounded-xl bg-green-50 px-3 py-2 text-base font-black text-green-700">
                {doneLine}
              </motion.div>
            ) : (
              <motion.div key="note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 text-xs text-gray-500">
                ⚠️ {phase === 'jump' ? jumpNote : note}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 flex justify-center">
            <TrollButton
              label="새로고침"
              className="btn-ghost text-sm"
              style={{ borderColor: '#5b3df5', color: '#5b3df5' }}
              audio={audio}
              reactions={[{ toast: '뒤로 갔습니다', sfx: 'error', shake: true }]}
              onPress={() => {
                penalty.current += 500
                setCount((c) => c + 500)
              }}
            />
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-3 text-[11px] opacity-50">매크로 사용 시 영구 대기</div>
    </SceneFrame>
  )
}
