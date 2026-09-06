import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { Confetti } from '../reveal/Confetti'
import { JABETH } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 4000
const STORM_START = 900
const STORM_GAP = 180
const FINALE_AT = 3200

interface Word {
  id: number
  text: string
  x: number
  y: number
  rot: number
  size: number
  drift: number
}

/** 난리자베스. 왕관 떨어지고 [감정]자베스 폭풍, 마지막에 거대 난리자베스. */
export default function Jabeth({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const banner = useMemo(() => pick(JABETH.crown, rng), [rng])
  const [crown, setCrown] = useState(false)
  const [words, setWords] = useState<Word[]>([])
  const [finale, setFinale] = useState(false)
  const doneRef = useRef(false)
  const seq = useRef(0)

  useEffect(() => {
    const timers: number[] = []
    timers.push(
      window.setTimeout(() => {
        setCrown(true)
        audio.sfx('fanfare')
      }, 150),
    )
    const count = Math.floor((FINALE_AT - STORM_START) / STORM_GAP)
    for (let i = 0; i < count; i++) {
      timers.push(
        window.setTimeout(() => {
          const id = ++seq.current
          const w: Word = {
            id,
            text: pick(JABETH.words, rng),
            x: 8 + rng() * 64,
            y: 12 + rng() * 66,
            rot: (rng() - 0.5) * 40,
            size: 1.2 + i * 0.11 + rng() * 0.5,
            drift: (rng() - 0.5) * 60,
          }
          setWords((prev) => [...prev.slice(-9), w])
          if (i % 2 === 0) audio.sfx('pop')
          timers.push(window.setTimeout(() => setWords((prev) => prev.filter((x) => x.id !== id)), 1100))
        }, STORM_START + i * STORM_GAP),
      )
    }
    timers.push(
      window.setTimeout(() => {
        setFinale(true)
        audio.sfx('tada')
      }, FINALE_AT),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [audio, rng])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  return (
    <SceneFrame style={{ background: 'radial-gradient(circle at 50% 30%, #4b1d8f 0%, #23103f 70%)', color: '#ffd700' }}>
      {/* 유니언잭 느낌 사선 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          background:
            'repeating-linear-gradient(45deg, #c8102e 0 14px, transparent 14px 40px, #012169 40px 54px, transparent 54px 80px), repeating-linear-gradient(-45deg, #c8102e 0 14px, transparent 14px 40px, #012169 40px 54px, transparent 54px 80px)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-3">
        <AnimatePresence>
          {crown && (
            <motion.div
              key="crown"
              initial={{ y: -300, rotate: -30 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 12 }}
              className="text-8xl drop-shadow-[0_8px_12px_rgba(0,0,0,0.5)]"
            >
              👑
            </motion.div>
          )}
        </AnimatePresence>
        {crown && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-md border-2 border-[#ffd700] bg-[#2a0f4d] px-5 py-2 text-lg font-black tracking-wide"
            style={{ fontFamily: 'Georgia, "Times New Roman", Batang, "바탕", serif', boxShadow: '0 0 24px rgba(255,215,0,0.4)' }}
          >
            {banner}
          </motion.div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <AnimatePresence>
          {words.map((w) => (
            <motion.div
              key={w.id}
              className="meme-caption absolute"
              style={{ left: `${w.x}%`, top: `${w.y}%`, fontSize: `${w.size}rem` }}
              initial={{ scale: 0, rotate: w.rot - 15, opacity: 0, y: 0 }}
              animate={{ scale: [0, 1.3, 1], rotate: w.rot, opacity: 1, y: w.drift }}
              exit={{ opacity: 0, scale: 0.6, y: w.drift - 40 }}
              transition={{ duration: 0.35 }}
            >
              {w.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {finale && (
          <motion.div
            key="finale"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: [0, 1.5, 1.2], rotate: [-10, 5, -3] }}
            transition={{ duration: 0.5 }}
            className="meme-caption absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 text-center"
            style={{ fontSize: 'clamp(3rem, 16vw, 6rem)', whiteSpace: 'normal', lineHeight: 1 }}
          >
            난리자베스
          </motion.div>
        )}
      </AnimatePresence>
      {finale && <Confetti rng={rng} count={80} />}
    </SceneFrame>
  )
}
