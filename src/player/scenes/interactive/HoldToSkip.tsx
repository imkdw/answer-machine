import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { HOLD } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 8000
const END_AT = 7000
const FILL_MS = 3000
const RESET_AT = 0.97
const GHOST_AT = 1500
const RING_R = 88
const CIRC = 2 * Math.PI * RING_R

/** 3초간 꾹 누르면 공개 (거짓말). 97%에서 알아서 리셋. 안 누르면 유령 손이 대신 눌러줌. */
export default function HoldToSkip({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(HOLD.title, rng), [rng])
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const [ghost, setGhost] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [caption, setCaption] = useState<{ id: number; text: string; bad: boolean } | null>(null)
  const [end, setEnd] = useState<string | null>(null)
  const doneRef = useRef(false)
  const endedRef = useRef(false)
  const holdingRef = useRef(false)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const seq = useRef(0)
  const touched = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const timersRef = useRef<number[]>([])

  const later = (fn: () => void, ms: number): void => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  const say = (text: string, bad: boolean): void => {
    const id = ++seq.current
    setCaption({ id, text, bad })
    later(() => setCaption((c) => (c?.id === id ? null : c)), 1100)
  }

  const stopLoop = (): void => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }

  const release = (reason: 'user' | 'almost'): void => {
    if (!holdingRef.current) return
    holdingRef.current = false
    stopLoop()
    setHolding(false)
    setGhost(false)
    setProgress(0)
    if (endedRef.current) return
    if (reason === 'almost') {
      say(pick(HOLD.almost), true)
      audioRef.current.sfx('boo')
    } else {
      say(pick(HOLD.released), true)
      audioRef.current.sfx('error')
    }
  }
  const releaseRef = useRef(release)
  releaseRef.current = release

  const press = (byGhost: boolean): void => {
    if (holdingRef.current || endedRef.current) return
    holdingRef.current = true
    startRef.current = performance.now()
    setHolding(true)
    setGhost(byGhost)
    setAttempts((n) => n + 1)
    audioRef.current.sfx('tick')
    const tick = (): void => {
      if (!holdingRef.current) return
      const k = Math.min(1, (performance.now() - startRef.current) / FILL_MS)
      setProgress(k)
      if (k >= RESET_AT) {
        releaseRef.current('almost')
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }
  const pressRef = useRef(press)
  pressRef.current = press

  useEffect(() => {
    const timers = timersRef.current
    // 안 누르면 유령 손이 대신 누름
    timers.push(
      window.setTimeout(() => {
        if (!touched.current) pressRef.current(true)
      }, GHOST_AT),
    )
    // jsdom 등 rAF가 안 도는 환경 대비: 유령 누름은 타이머로도 정리
    timers.push(
      window.setTimeout(() => {
        if (holdingRef.current && !touched.current) releaseRef.current('almost')
      }, GHOST_AT + FILL_MS * RESET_AT + 200),
    )
    timers.push(
      window.setTimeout(() => {
        endedRef.current = true
        holdingRef.current = false
        stopLoop()
        setHolding(false)
        setGhost(false)
        setProgress(0)
        setEnd(pick(HOLD.end, rng))
        audioRef.current.sfx('tada')
      }, END_AT),
    )
    timers.push(
      window.setTimeout(() => {
        if (doneRef.current) return
        doneRef.current = true
        onDone()
      }, DURATION),
    )
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      cancelAnimationFrame(rafRef.current)
    }
  }, [onDone, rng])

  const pct = Math.round(progress * 100)
  const progressLine = progress > 0.9 ? HOLD.progress[3] : progress > 0.7 ? HOLD.progress[2] : progress > 0.4 ? HOLD.progress[1] : HOLD.progress[0]
  const hue = 320 - progress * 200

  return (
    <SceneFrame
      style={{
        background: `radial-gradient(circle at 50% 40%, hsl(${hue} 90% 55% / 0.55) 0%, transparent 45%), linear-gradient(160deg, #1a0533 0%, #3a0b5e 45%, #0b1a3a 100%)`,
        color: '#fff',
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-6 z-10 flex flex-col items-center gap-1">
        <div className="text-lg font-black">{title}</div>
        <div className="text-xs opacity-70">시도 {attempts}회</div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative" style={{ width: 220, height: 220 }}>
          <svg width="220" height="220" viewBox="0 0 220 220" className="absolute inset-0 -rotate-90">
            <circle cx="110" cy="110" r={RING_R} stroke="rgba(255,255,255,0.15)" strokeWidth="14" fill="none" />
            <circle
              cx="110"
              cy="110"
              r={RING_R}
              stroke={`hsl(${hue} 95% 60%)`}
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - progress)}
              style={{ filter: `drop-shadow(0 0 ${6 + progress * 16}px hsl(${hue} 95% 60%))` }}
            />
          </svg>
          <motion.button
            type="button"
            aria-label="꾹 누르기"
            className="absolute inset-0 m-auto flex h-40 w-40 select-none flex-col items-center justify-center rounded-full font-black text-white shadow-2xl"
            style={{
              background: `radial-gradient(circle at 35% 30%, hsl(${hue} 95% 70%), hsl(${hue} 90% 45%) 70%)`,
              boxShadow: `0 0 ${20 + progress * 40}px hsl(${hue} 95% 60% / 0.8), inset 0 -8px 20px rgba(0,0,0,0.3)`,
              touchAction: 'none',
            }}
            animate={end ? { scale: [1, 1.15, 0.3], rotate: [0, 0, 40], opacity: [1, 1, 0.4] } : { scale: holding ? 0.92 : 1 }}
            transition={end ? { duration: 0.8 } : { type: 'spring', stiffness: 400, damping: 20 }}
            onPointerDown={(e) => {
              touched.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              pressRef.current(false)
            }}
            onPointerUp={() => releaseRef.current('user')}
            onPointerCancel={() => releaseRef.current('user')}
            onPointerLeave={() => {
              if (!ghost) releaseRef.current('user')
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="text-2xl">{holding ? `${pct}%` : '꾹 누르기'}</span>
            <span className="text-xs opacity-80">{holding ? progressLine : '3초'}</span>
          </motion.button>

          <AnimatePresence>
            {ghost && holding && (
              <motion.div
                key="ghost"
                className="pointer-events-none absolute text-6xl"
                style={{ left: '55%', top: '55%' }}
                initial={{ opacity: 0, x: 60, y: 60 }}
                animate={{ opacity: 0.85, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 80, y: 40 }}
                transition={{ duration: 0.3 }}
              >
                👆
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="text-xs opacity-60">{holding ? '손 떼지 마세요' : '누르고 계세요'}</div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <AnimatePresence>
          {caption && (
            <motion.div
              key={caption.id}
              className="meme-caption absolute inset-x-4 top-[22%] text-center text-3xl"
              style={{ whiteSpace: 'normal', color: caption.bad ? '#ff5c5c' : '#fff200' }}
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: [0, 1.3, 1], rotate: [-8, 4, -2] }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.3 }}
            >
              {caption.text}
            </motion.div>
          )}
          {end && (
            <motion.div
              key="end"
              className="meme-caption absolute inset-x-4 top-[70%] text-center text-3xl"
              style={{ whiteSpace: 'normal' }}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.4 }}
            >
              {end}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
