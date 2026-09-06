import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { toast } from '../../Toast'
import { useTimeout } from '../../useTimeout'
import { DAANGN } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5000

type Status = '판매중' | '예약중' | '거래완료'

const STATUS_STYLE: Record<Status, { bg: string; fg: string }> = {
  판매중: { bg: '#ff6f0f', fg: '#fff' },
  예약중: { bg: '#00a05b', fg: '#fff' },
  거래완료: { bg: '#8b8b8b', fg: '#fff' },
}

/** 당근 매물. 판매중 -> 예약중 -> 거래완료 -> 끌올. 채팅해도 예약중. */
export default function Daangn({ answer, onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(DAANGN.title, rng), [rng])
  const desc = useMemo(() => pick(DAANGN.desc, rng), [rng])
  const temp = useMemo(() => pick(DAANGN.temp, rng), [rng])
  const chat = useMemo(() => pick(DAANGN.chat, rng), [rng])
  const reply = useMemo(() => pick(DAANGN.reply, rng), [rng])
  const emoji = useMemo(() => (rng() < 0.5 ? '🥕' : '📦'), [rng])
  const [status, setStatus] = useState<Status>('판매중')
  const [sheet, setSheet] = useState(false)
  const [replied, setReplied] = useState(false)
  const doneRef = useRef(false)

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setSheet(true), 900),
      window.setTimeout(() => {
        setReplied(true)
        audio.sfx('kakao')
      }, 1800),
      window.setTimeout(() => {
        setStatus('예약중')
        audio.sfx('error')
      }, 2400),
      window.setTimeout(() => setStatus('거래완료'), 3500),
      window.setTimeout(() => {
        toast('판매자가 답변을 끌올함')
        audio.sfx('pop')
      }, 4300),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [audio])

  const tempNum = parseFloat(temp)
  const tempPct = Math.max(4, Math.min(100, ((tempNum + 10) / 110) * 100))
  const style = STATUS_STYLE[status]

  return (
    <SceneFrame style={{ background: '#ffffff', color: '#212124', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' }} className="justify-start p-0">
      {/* 상단 바 */}
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 text-left" style={{ background: '#ff6f0f', color: '#fff' }}>
          <div className="flex items-center gap-1 text-lg font-black">
            답변동 <span className="text-xs">▼</span>
          </div>
          <div className="flex gap-3 text-base">
            <span>🔍</span>
            <span>☰</span>
            <span className="relative">
              🔔<span className="absolute -top-1 -right-1 rounded-full bg-white px-1 text-[9px] font-bold text-orange-600">99</span>
            </span>
          </div>
        </div>
        <div className="flex border-b border-gray-200 bg-white text-xs font-semibold text-gray-500">
          {['동네생활', '내 근처', '채팅'].map((t, i) => (
            <div key={t} className="flex-1 py-2 text-center" style={i === 0 ? { color: '#212124', borderBottom: '2px solid #212124' } : {}}>
              {t}
            </div>
          ))}
        </div>

        {/* 매물 */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full text-left">
          <div className="relative flex h-44 items-center justify-center bg-gray-200 text-7xl">
            {emoji}
            <span className="absolute bottom-2 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">1 / 1</span>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-lg">🙂</div>
              <div className="flex-1">
                <div className="text-sm font-bold">답변자</div>
                <div className="text-[11px] text-gray-500">답변동 / 인증 12회</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black" style={{ color: tempNum >= 36 ? '#ff6f0f' : '#3b82f6' }}>
                  {temp}
                </div>
                <div className="h-1.5 w-16 rounded-full bg-gray-200">
                  <div className="h-1.5 rounded-full" style={{ width: `${tempPct}%`, background: tempNum >= 36 ? '#ff6f0f' : '#3b82f6' }} />
                </div>
                <div className="text-[9px] text-gray-400">매너온도</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={status}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className="rounded px-1.5 py-0.5 text-[11px] font-bold"
                  style={{ background: style.bg, color: style.fg }}
                >
                  {status}
                </motion.span>
              </AnimatePresence>
              <span className="text-lg font-bold">{title}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-gray-400">기타 중고물품 / 끌올 3분 전</div>
            <div className="mt-1 text-xl font-black">0원 나눔</div>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{desc}</p>
            <p className="mt-1 text-sm text-gray-400" style={{ filter: 'blur(6px)' }} aria-hidden>
              {answer}
            </p>
            <div className="mt-3 text-[11px] text-gray-400">관심 4,832 / 채팅 999+ / 조회 1</div>
          </div>
        </motion.div>
      </div>

      {/* 채팅 시트 */}
      <AnimatePresence>
        {sheet && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-sm rounded-t-2xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 text-left">
              <div className="h-7 w-7 rounded-full bg-orange-100 text-center text-sm leading-7">🙂</div>
              <div className="text-sm font-bold">답변자</div>
              <div className="text-[11px] text-gray-400">{temp}</div>
            </div>
            <div className="space-y-2 px-4 py-3 pb-20 text-left text-sm">
              <div className="flex justify-end">
                <span className="rounded-2xl rounded-tr-sm px-3 py-1.5 text-white" style={{ background: '#ff6f0f' }}>
                  {chat}
                </span>
              </div>
              {replied && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                  <span className="rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-1.5">{reply}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 하단 채팅하기 */}
      <div className="absolute inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-sm items-center gap-3 border-t border-gray-200 bg-white px-4 py-3">
        <span className="text-2xl">🤍</span>
        <div className="flex-1 text-left">
          <div className="text-base font-black">0원</div>
          <div className="text-[11px] text-orange-600">나눔</div>
        </div>
        <TrollButton
          label="채팅하기"
          className="btn text-sm"
          style={{ background: '#ff6f0f', color: '#fff' }}
          audio={audio}
          reactions={[{ toast: '예약중이에요', sfx: 'error', proceed: false }, { toast: '다른 분이 먼저 연락 주셨어요', sfx: 'error', proceed: false }]}
          onPress={() => {}}
        />
      </div>
    </SceneFrame>
  )
}
