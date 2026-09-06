import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { useTimeout } from '../../useTimeout'
import { toast } from '../../Toast'
import { PIERROT } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5500
const TYPE_MS = 25
const COMMENT_GAP = 450
const CHIP_GAP = 600
const VERDICT_AT = 4600
const NICKS = ['ㅇㅇ', '익명', '삐잘알', 'ㅇㅇ', '지나가던삐', '익명']

interface Comment {
  id: number
  nick: string
  text: string
}
interface Chip {
  id: number
  text: string
  x: number
  y: number
  rot: number
}

/** 삐에로 밈. "삐에로 남친이랑 결혼할 수 있어?" 커뮤니티 글 + OO삐 용어 폭격. */
export default function Pierrot({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(PIERROT.title, rng), [rng])
  const body = useMemo(() => pick(PIERROT.body, rng), [rng])
  const verdict = useMemo(() => pick(PIERROT.verdict, rng), [rng])
  const comments = useMemo(() => {
    const pool = [...PIERROT.comments]
    const out: string[] = []
    for (let i = 0; i < 5 && pool.length; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!)
    return out
  }, [rng])

  const [typed, setTyped] = useState(0)
  const [shown, setShown] = useState<Comment[]>([])
  const [chips, setChips] = useState<Chip[]>([])
  const [showVerdict, setShowVerdict] = useState(false)
  const doneRef = useRef(false)
  const rngRef = useRef(rng)
  rngRef.current = rng

  useEffect(() => {
    const timers: number[] = []
    const chars = Array.from(body).length
    let i = 0
    const typer = window.setInterval(() => {
      i++
      setTyped(i)
      if (i % 4 === 0) audio.sfx('typing')
      if (i >= chars) window.clearInterval(typer)
    }, TYPE_MS)
    const typingEnd = 200 + chars * TYPE_MS

    comments.forEach((text, idx) => {
      timers.push(
        window.setTimeout(() => {
          audio.sfx('kakao')
          setShown((prev) => [...prev, { id: idx, nick: NICKS[idx % NICKS.length]!, text }])
        }, typingEnd + 300 + idx * COMMENT_GAP),
      )
    })

    let chipSeq = 0
    for (let t = 900; t < VERDICT_AT; t += CHIP_GAP) {
      timers.push(
        window.setTimeout(() => {
          const r = rngRef.current
          const id = ++chipSeq
          setChips((prev) => [
            ...prev.slice(-3),
            { id, text: pick(PIERROT.terms, r), x: 8 + r() * 60, y: 10 + r() * 65, rot: (r() - 0.5) * 30 },
          ])
          timers.push(window.setTimeout(() => setChips((prev) => prev.filter((c) => c.id !== id)), 900))
        }, t),
      )
    }

    timers.push(
      window.setTimeout(() => {
        audio.sfx('tada')
        setShowVerdict(true)
      }, VERDICT_AT),
    )

    return () => {
      window.clearInterval(typer)
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [body, comments, audio])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  const bodyShown = useMemo(() => Array.from(body).slice(0, typed).join(''), [body, typed])

  return (
    <SceneFrame style={{ background: '#f2f3f5', color: '#111', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' }} className="justify-start pt-4">
      {/* 커뮤니티 글 */}
      <div className="relative z-10 w-full max-w-[340px] overflow-hidden rounded-xl bg-white text-left shadow-md">
        <div className="flex items-center justify-between bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600">
          <span>연애 고민</span>
          <span className="text-gray-400">조회 48,321</span>
        </div>
        <div className="px-3 py-2">
          <div className="text-base leading-snug font-black">{title}</div>
          <div className="mt-0.5 text-[10px] text-gray-400">익명 / 2026.08.13 / 추천 1,204</div>
          <div className="mt-2 min-h-[4.5rem] text-sm leading-relaxed text-gray-800" style={{ wordBreak: 'keep-all' }}>
            {bodyShown}
            {typed < Array.from(body).length && <span className="blink">|</span>}
          </div>
          <div className="mt-2 flex gap-2">
            <TrollButton label="추천" className="btn-ghost text-xs" style={{ color: '#111', borderColor: '#ddd' }} audio={audio} onPress={() => toast('비추 반영됨')} />
          </div>
        </div>
        <div className="border-t border-gray-200 px-3 py-2">
          <div className="text-xs font-bold text-gray-600">댓글 {shown.length}</div>
          <div className="mt-1 flex flex-col gap-1">
            <AnimatePresence>
              {shown.map((c) => (
                <motion.div key={c.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex gap-2 text-xs">
                  <span className="shrink-0 font-bold text-gray-500">{c.nick}</span>
                  <span className="text-gray-800">{c.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 저글링 삐에로 */}
      <div className="absolute right-4 bottom-28 z-10">
        <motion.div animate={{ y: [0, -8, 0], rotate: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 0.9 }} className="relative text-5xl">
          🤡
          {['🎈', '🟠', '🟡'].map((e, i) => (
            <motion.span
              key={e}
              className="absolute text-base"
              style={{ left: '50%', top: '50%' }}
              animate={{
                x: [0, 28, 0, -28, 0].map((v) => v * Math.cos((i * Math.PI * 2) / 3) - 8),
                y: [-30, -10, 10, -10, -30].map((v) => v - 20),
              }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.4, ease: 'linear' }}
            >
              {e}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* 용어 칩 */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <AnimatePresence>
          {chips.map((c) => (
            <motion.div
              key={c.id}
              className="meme-caption absolute text-2xl"
              style={{ left: `${c.x}%`, top: `${c.y}%`, rotate: c.rot }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {c.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 판정 */}
      <AnimatePresence>
        {showVerdict && (
          <motion.div
            key="v"
            initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            className="absolute inset-x-6 bottom-24 z-30 rounded-2xl bg-red-600 px-4 py-3 text-center text-lg font-black text-white shadow-2xl"
          >
            {verdict}
          </motion.div>
        )}
      </AnimatePresence>
    </SceneFrame>
  )
}
