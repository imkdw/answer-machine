import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { YOONJUNG } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5500
const LINE_MS = 1000
const ENCORE_AT = 4300
const ENCORE_LINE_MS = 380
const WHITE_KEYS = 12
const BLACK_KEY_SLOTS = [0, 1, 3, 4, 5, 7, 8, 10] // 흰 건반 사이 검은 건반 위치

interface Line {
  who: 'teacher' | 'kid'
  text: string
}

/** 윤정아 챌린지. 콜앤리스폰스 노래방 자막 + 피아노 학원. */
export default function Yoonjung({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const scold = useMemo(() => pick(YOONJUNG.scold, rng), [rng])
  const encore = useMemo(() => pick(YOONJUNG.encore, rng), [rng])
  const lines = useMemo<Line[]>(
    () => [
      { who: 'teacher', text: YOONJUNG.call },
      { who: 'kid', text: YOONJUNG.response },
      { who: 'teacher', text: scold },
      { who: 'kid', text: YOONJUNG.sorry },
    ],
    [scold],
  )

  const [lineIdx, setLineIdx] = useState(0)
  const [syl, setSyl] = useState(0)
  const [encoreMode, setEncoreMode] = useState(false)
  const [litKeys, setLitKeys] = useState<number[]>([])
  const doneRef = useRef(false)
  const rngRef = useRef(rng)
  rngRef.current = rng

  useEffect(() => {
    const timers: number[] = []
    const light = (): void => {
      const r = rngRef.current
      const keys = [Math.floor(r() * WHITE_KEYS), Math.floor(r() * WHITE_KEYS)]
      setLitKeys(keys)
      timers.push(window.setTimeout(() => setLitKeys([]), 160))
    }

    // 본편: 4줄, 각 1000ms, 음절별 하이라이트
    lines.forEach((line, li) => {
      const chars = Array.from(line.text)
      const start = 200 + li * LINE_MS
      timers.push(
        window.setTimeout(() => {
          setLineIdx(li)
          setSyl(0)
          audio.sfx('piano')
        }, start),
      )
      const per = Math.min(140, (LINE_MS - 200) / Math.max(1, chars.length))
      chars.forEach((_, ci) => {
        timers.push(
          window.setTimeout(() => {
            setSyl(ci + 1)
            audio.sfx('tick')
            light()
          }, start + 80 + ci * per),
        )
      })
    })

    // 앵콜: 빠르게 반복
    timers.push(
      window.setTimeout(() => {
        setEncoreMode(true)
        audio.sfx('tada')
      }, ENCORE_AT),
    )
    let i = 0
    for (let t = ENCORE_AT + 200; t < DURATION; t += ENCORE_LINE_MS) {
      const idx = i % lines.length
      timers.push(
        window.setTimeout(() => {
          setLineIdx(idx)
          setSyl(Array.from(lines[idx]!.text).length)
          audio.sfx(idx % 2 === 0 ? 'piano' : 'pop')
          light()
        }, t),
      )
      i++
    }

    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [lines, audio])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  const current = lines[lineIdx]!
  const chars = Array.from(current.text)
  const speaking = current.who

  return (
    <SceneFrame style={{ background: 'linear-gradient(180deg, #ffe4f1 0%, #fff7fb 60%, #ffd6e8 100%)', color: '#3a1a2e', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' }}>
      {/* 학원 간판 */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-6 rounded-2xl border-4 border-pink-400 bg-white px-5 py-2 text-xl font-black text-pink-500 shadow-lg"
        style={{ letterSpacing: '0.05em' }}
      >
        🎹 {YOONJUNG.academy}
      </motion.div>

      {/* 캐릭터 둘 */}
      <div className="relative z-10 flex w-full max-w-[340px] items-end justify-between px-2 pt-16">
        <motion.div
          animate={speaking === 'teacher' ? { rotate: [-8, 8, -8], y: [0, -6, 0] } : { rotate: 0, y: 0 }}
          transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }}
          className="flex flex-col items-center"
        >
          <div className="text-6xl">🧑‍🏫</div>
          <div className="mt-1 rounded-full bg-pink-500 px-2 py-0.5 text-xs font-bold text-white">쌤</div>
        </motion.div>
        <motion.div
          animate={speaking === 'kid' ? { rotate: [8, -8, 8], y: [0, -6, 0] } : { rotate: 0, y: 0 }}
          transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }}
          className="flex flex-col items-center"
        >
          <div className="text-6xl">🧒</div>
          <div className="mt-1 rounded-full bg-sky-500 px-2 py-0.5 text-xs font-bold text-white">윤정</div>
        </motion.div>
      </div>

      {/* 노래방 자막 */}
      <div className="relative z-10 mt-4 flex min-h-[4.5rem] w-full max-w-[340px] items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${lineIdx}-${encoreMode ? 'e' : 'm'}`}
            initial={{ scale: 0.7, opacity: 0, x: speaking === 'teacher' ? -30 : 30 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className={`relative rounded-2xl bg-white px-4 py-2 shadow-lg ${encoreMode ? 'text-lg' : 'text-2xl'} font-black`}
            style={{ border: `3px solid ${speaking === 'teacher' ? '#ec4899' : '#0ea5e9'}` }}
          >
            {chars.map((ch, i) => (
              <span
                key={i}
                className="inline-block transition-colors duration-100"
                style={{ color: i < syl ? (speaking === 'teacher' ? '#ec4899' : '#0ea5e9') : '#c4b5c0', minWidth: ch === ' ' ? '0.4em' : undefined }}
              >
                {ch}
              </span>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 mt-2 h-10">
        <AnimatePresence>
          {encoreMode && (
            <motion.div key="enc" initial={{ scale: 0, rotate: -10 }} animate={{ scale: [0, 1.3, 1], rotate: [-10, 4, -2] }} className="meme-caption text-2xl">
              🎵 {encore}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 피아노 건반 */}
      <div className="absolute inset-x-0 bottom-0 flex h-24 justify-center">
        <div className="relative flex w-full max-w-[360px]">
          {Array.from({ length: WHITE_KEYS }, (_, i) => (
            <div
              key={i}
              className="flex-1 rounded-b-md border border-gray-300 transition-colors duration-100"
              style={{ background: litKeys.includes(i) ? '#ff5fb0' : '#ffffff' }}
            />
          ))}
          {BLACK_KEY_SLOTS.map((slot) => (
            <div
              key={slot}
              className="absolute top-0 h-14 rounded-b-md bg-gray-900"
              style={{ left: `calc(${((slot + 1) / WHITE_KEYS) * 100}% - 3.5%)`, width: '7%' }}
            />
          ))}
        </div>
      </div>
    </SceneFrame>
  )
}
