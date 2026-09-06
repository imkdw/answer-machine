import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { useTimeout } from '../../useTimeout'
import { toast } from '../../Toast'
import { NO_CONTACT } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5000
const SEND_GAP = 500
const COUNT_START = 600
const COUNT_STEP = 60
const MAX_MIN = 37
const BLOCK_AT = COUNT_START + COUNT_STEP * MAX_MIN // ~2820
const TWIST_AT = 4000

interface Msg {
  id: number
  text: string
}

/** 37분째 연락 없네 잘 살아. 타이머가 37을 찍으면 차단, 4초에 반전. */
export default function NoContact({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const goodbye = useMemo(() => pick(NO_CONTACT.goodbye, rng), [rng])
  const twist = useMemo(() => pick(NO_CONTACT.twist, rng), [rng])
  const sent = useMemo(() => NO_CONTACT.sent.slice(0, 4), [])

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [minutes, setMinutes] = useState(0)
  const [blocked, setBlocked] = useState(false)
  const [twisted, setTwisted] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    const timers: number[] = []
    sent.forEach((text, i) => {
      timers.push(
        window.setTimeout(() => {
          audio.sfx('kakao')
          setMsgs((m) => [...m, { id: i, text }])
        }, 200 + i * SEND_GAP),
      )
    })
    for (let n = 1; n <= MAX_MIN; n++) {
      timers.push(
        window.setTimeout(() => {
          setMinutes(n)
          if (n % 5 === 0) audio.sfx('tick')
        }, COUNT_START + COUNT_STEP * n),
      )
    }
    timers.push(
      window.setTimeout(() => {
        audio.sfx('siren')
        setBlocked(true)
      }, BLOCK_AT + 80),
    )
    timers.push(
      window.setTimeout(() => {
        audio.sfx('kakao')
        setBlocked(false)
        setTwisted(true)
      }, TWIST_AT),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [sent, audio])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  const hot = minutes > 30

  return (
    <SceneFrame style={{ background: '#b2c7d9', color: '#1a1a1a', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' }} className="p-0">
      <div className="absolute inset-0 flex flex-col">
        {/* 헤더 */}
        <div className={`flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors ${blocked ? 'bg-red-600 text-white' : 'bg-[#a3b8ca] text-[#1a1a1a]'}`}>
          <span className="text-lg">‹</span>
          <motion.span key={blocked ? 'b' : 'n'} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {blocked ? '차단됨' : '남친'}
          </motion.span>
          <span className="opacity-60">☰</span>
        </div>

        {/* 대화 */}
        <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 pt-3">
          <AnimatePresence>
            {msgs.map((m) => (
              <motion.div key={m.id} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-end justify-end gap-1">
                <span className="text-[10px] font-bold text-[#f5c400]">1</span>
                <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-[#fee500] px-3 py-2 text-sm">{m.text}</div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 타이머 카드 */}
          <div className="my-2 flex justify-center">
            <motion.div
              animate={hot ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ repeat: hot ? Infinity : 0, duration: 0.5 }}
              className="w-full max-w-[300px] rounded-2xl bg-black/85 px-4 py-4 text-center shadow-xl"
            >
              <div className="text-[10px] tracking-[0.3em] text-gray-400">읽지 않음</div>
              <div className="font-mono text-5xl font-black tabular-nums" style={{ color: hot ? '#ff3b3b' : '#fee500', textShadow: hot ? '0 0 16px #ff3b3b' : 'none' }}>
                {String(minutes).padStart(2, '0')}:00
              </div>
              <div className={`mt-1 text-sm font-bold ${hot ? 'text-red-400' : 'text-gray-200'}`}>{NO_CONTACT.line(minutes)}</div>
            </motion.div>
          </div>

          <AnimatePresence>
            {twisted && (
              <motion.div key="twist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="self-center rounded-full bg-black/25 px-3 py-1 text-xs text-white">
                {twist}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 입력 바 */}
        <div className={`flex items-center gap-2 px-3 py-2 transition-colors ${blocked ? 'bg-gray-300' : 'bg-white'}`}>
          <span className="text-xl opacity-60">+</span>
          <div className={`flex-1 rounded-full px-3 py-2 text-sm ${blocked ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-400'}`}>{blocked ? '차단된 상대입니다' : '메시지 입력'}</div>
          <TrollButton
            label="📞 전화"
            onPress={() => toast('통화 거절됨')}
            audio={audio}
            className="btn-ghost text-xs"
            style={{ color: blocked ? '#9ca3af' : '#1a1a1a', borderColor: blocked ? '#d1d5db' : '#1a1a1a' }}
          />
        </div>
      </div>

      {/* 잘 살아 도장 */}
      <AnimatePresence>
        {blocked && (
          <motion.div
            key="bye"
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1], rotate: -8, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
            className="meme-caption pointer-events-none absolute inset-x-0 top-[38%] z-20 text-center text-6xl"
            style={{ color: '#ff3b3b' }}
          >
            {goodbye}
          </motion.div>
        )}
      </AnimatePresence>
    </SceneFrame>
  )
}
