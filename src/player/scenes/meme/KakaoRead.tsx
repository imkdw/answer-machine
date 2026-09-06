import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { useTimeout } from '../../useTimeout'
import { toast } from '../../Toast'
import { KAKAO } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5500

// 타임라인 (ms)
const SEND_GAP = 700
const READ_AT = 2400
const TYPING_END = READ_AT + 1500
const REPLY_AT = TYPING_END + 800

interface Msg {
  id: number
  text: string
  mine: boolean
}

/** 카톡 읽씹. 1이 안 없어짐 -> 읽음 -> 입력 중... -> 답 없음 -> "ㅋ" */
export default function KakaoRead({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const name = useMemo(() => pick(KAKAO.name, rng), [rng])
  const time = useMemo(() => pick(KAKAO.time, rng), [rng])
  const reply = useMemo(() => pick(KAKAO.reply, rng), [rng])
  const myLines = useMemo(() => {
    const pool = [...KAKAO.me]
    const out: string[] = []
    for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!)
    return out
  }, [rng])

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [read, setRead] = useState(false)
  const [typing, setTyping] = useState(false)
  const [ghosted, setGhosted] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    const timers: number[] = []
    myLines.forEach((text, i) => {
      timers.push(
        window.setTimeout(() => {
          audio.sfx('kakao')
          setMsgs((m) => [...m, { id: i, text, mine: true }])
        }, 300 + i * SEND_GAP),
      )
    })
    timers.push(
      window.setTimeout(() => {
        audio.sfx('tick')
        setRead(true)
        setTyping(true)
      }, READ_AT),
    )
    timers.push(
      window.setTimeout(() => {
        audio.sfx('error')
        setTyping(false)
        setGhosted(true)
      }, TYPING_END),
    )
    timers.push(
      window.setTimeout(() => {
        audio.sfx('kakao')
        setMsgs((m) => [...m, { id: 99, text: reply, mine: false }])
      }, REPLY_AT),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [myLines, reply, audio])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  return (
    <SceneFrame style={{ background: '#b2c7d9', color: '#111', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif', padding: 0 }}>
      <div className="absolute inset-0 flex flex-col">
        {/* 상단 바 */}
        <div className="flex items-center gap-3 bg-[#a4bbd0] px-4 py-3 text-base font-bold">
          <span className="text-xl">‹</span>
          <span className="flex-1 truncate">{name}</span>
          <span className="text-lg opacity-70">🔍</span>
          <span className="text-lg opacity-70">☰</span>
        </div>

        {/* 대화 */}
        <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3 pb-3">
          <div className="mb-2 self-center rounded-full bg-black/15 px-3 py-0.5 text-[11px] text-white">2026년 9월 6일 토요일</div>
          <AnimatePresence>
            {msgs.map((m) =>
              m.mine ? (
                <motion.div key={m.id} initial={{ x: 40, opacity: 0, scale: 0.9 }} animate={{ x: 0, opacity: 1, scale: 1 }} className="flex items-end justify-end gap-1">
                  <div className="flex flex-col items-end text-[10px] leading-tight text-[#556]">
                    {!read && (
                      <motion.span key="one" exit={{ opacity: 0 }} className="font-bold text-[#f7b500]">
                        1
                      </motion.span>
                    )}
                    <span>{time}</span>
                  </div>
                  <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-[#fee500] px-3 py-2 text-[15px]" style={{ wordBreak: 'keep-all' }}>
                    {m.text}
                  </div>
                </motion.div>
              ) : (
                <motion.div key={m.id} initial={{ x: -40, opacity: 0, scale: 0.9 }} animate={{ x: 0, opacity: 1, scale: 1 }} className="flex items-start gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-xl">🙂</div>
                  <div>
                    <div className="mb-0.5 text-[11px] text-[#334]">{name}</div>
                    <div className="flex items-end gap-1">
                      <div className="max-w-[70vw] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[15px]">{m.text}</div>
                      <span className="text-[10px] text-[#556]">{time}</span>
                    </div>
                  </div>
                </motion.div>
              ),
            )}
          </AnimatePresence>

          <AnimatePresence>
            {typing && (
              <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-xl">🙂</div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-3 py-2">
                  <span className="text-xs text-[#667]">{KAKAO.typing}</span>
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} className="h-1.5 w-1.5 rounded-full bg-[#889]" />
                    ))}
                  </span>
                </div>
              </motion.div>
            )}
            {ghosted && (
              <motion.div key="ghost" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-center rounded-full bg-black/25 px-3 py-1 text-[11px] font-bold text-white">
                읽씹 당했습니다
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 입력 바 */}
        <div className="flex items-center gap-2 bg-white px-3 py-2">
          <span className="text-2xl text-[#889]">+</span>
          <div className="flex-1 rounded-full bg-[#f2f2f2] px-3 py-2 text-sm text-[#999]">메시지 입력</div>
          <span className="text-xl">😊</span>
          <TrollButton
            label="전송"
            className="rounded-full bg-[#fee500] px-3 py-1.5 text-sm font-bold text-[#3c1e1e]"
            audio={audio}
            onPress={() => toast('안읽씹 확정')}
            reactions={[{ sfx: 'kakao' }, { toast: '전송 실패 (사유: 상대가 차단함)', proceed: false, sfx: 'error' }]}
          />
        </div>
      </div>
    </SceneFrame>
  )
}
