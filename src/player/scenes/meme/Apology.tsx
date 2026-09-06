import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { APOLOGY } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5500
const GUNGSEO = '"Apple Gungseo", Gungsuh, "궁서", "궁서체", "Nanum Myeongjo", serif'

/** 연예인 자필 사과문. 궁서체 타자기로 한 글자씩 쓰다가 마지막에 빨간 도장 "(진심 없음)". */
export default function Apology({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const lines = useMemo(() => {
    const pool = [...APOLOGY.body]
    const picked: string[] = []
    for (let i = 0; i < 3 && pool.length; i++) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!)
    return [APOLOGY.greeting[0], ...picked, pick(APOLOGY.sign, rng)]
  }, [rng])
  const ps = useMemo(() => pick(APOLOGY.ps, rng), [rng])

  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [stamped, setStamped] = useState(false)
  const doneRef = useRef(false)

  const totalChars = useMemo(() => lines.reduce((a, l) => a + l.length, 0), [lines])
  // 4초 안에 다 쓰도록 글자당 간격 계산
  const perChar = Math.max(18, Math.min(60, Math.floor(3900 / totalChars)))
  const finished = lineIdx >= lines.length

  useEffect(() => {
    if (finished) return
    const line = lines[lineIdx]!
    const t = window.setTimeout(() => {
      if (charIdx >= line.length) {
        setLineIdx((i) => i + 1)
        setCharIdx(0)
        return
      }
      if (charIdx % 3 === 0) audio.sfx('typing')
      setCharIdx((c) => c + 1)
    }, charIdx >= line.length ? 160 : perChar)
    return () => window.clearTimeout(t)
  }, [lineIdx, charIdx, lines, finished, perChar, audio])

  useEffect(() => {
    if (!finished || stamped) return
    const t = window.setTimeout(() => {
      setStamped(true)
      audio.sfx('boo')
    }, 250)
    return () => window.clearTimeout(t)
  }, [finished, stamped, audio])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  return (
    <SceneFrame style={{ background: '#d9d4c7', color: '#1a1a1a', fontFamily: 'system-ui, sans-serif' }}>
      <div className="absolute top-5 left-0 right-0 flex justify-center px-4">
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded bg-[#c8102e] px-3 py-1 text-sm font-black text-white shadow">
          [전문] 답변자 사과문
        </motion.div>
      </div>

      <motion.div
        initial={{ scale: 0.9, rotate: -4, opacity: 0 }}
        animate={{ scale: 1, rotate: -1.5, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="relative w-full max-w-sm rounded-sm px-6 pt-8 pb-10 text-left"
        style={{
          background: 'repeating-linear-gradient(#fffdf6 0 31px, #b9c4d6 31px 32px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.35), 0 2px 0 #fff inset',
          fontFamily: GUNGSEO,
          minHeight: 300,
        }}
      >
        <div className="absolute top-0 left-10 h-full w-px bg-[#f0a3a3]" />
        {lines.map((line, i) => {
          if (i > lineIdx) return null
          const shown = i < lineIdx ? line : line.slice(0, charIdx)
          const isSign = i === lines.length - 1
          const isCurrent = i === lineIdx
          return (
            <p key={i} className={`relative pl-8 text-[15px] leading-[32px] ${isSign ? 'text-right pr-2' : ''}`} style={{ minHeight: 32, wordBreak: 'keep-all' }}>
              {shown}
              {isCurrent && <span className="ml-0.5 inline-block text-lg leading-none align-middle">✍️</span>}
            </p>
          )
        })}

        {stamped && (
          <motion.div
            initial={{ scale: 3, rotate: 20, opacity: 0 }}
            animate={{ scale: 1, rotate: -14, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
            className="absolute right-4 bottom-8 rounded border-4 px-3 py-1 text-xl font-black"
            style={{ color: '#d0021b', borderColor: '#d0021b', fontFamily: 'system-ui, sans-serif', background: 'rgba(255,255,255,0.4)', mixBlendMode: 'multiply' }}
          >
            {ps}
          </motion.div>
        )}
      </motion.div>

      <p className="absolute bottom-6 text-xs opacity-50">{finished ? '사과문 게시 완료. 댓글 창 닫힘' : '작성 중...'}</p>
    </SceneFrame>
  )
}
