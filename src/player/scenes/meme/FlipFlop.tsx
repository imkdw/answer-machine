import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { useTimeout } from '../../useTimeout'
import { toast } from '../../Toast'
import { FLIPFLOP } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5000
const FINAL_AT = 3800
// 점점 빨라지는 도착 간격
const GAPS = [900, 750, 600, 480, 380, 300, 250, 250]

interface Msg {
  id: number
  text: string
  time: string
  bold?: boolean
  system?: boolean
}

/** 면접 포기 번복 밈. 1분 간격으로 포기/진행을 반복해서 보낸 문자. */
export default function FlipFlop({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const header = useMemo(() => pick(FLIPFLOP.header, rng), [rng])
  const quit = useMemo(() => pick(FLIPFLOP.quit, rng), [rng])
  const resume = useMemo(() => pick(FLIPFLOP.resume, rng), [rng])
  const finalLine = useMemo(() => pick(FLIPFLOP.final, rng), [rng])

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState(true)
  const doneRef = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timers: number[] = []
    let t = 400
    GAPS.forEach((gap, i) => {
      if (t >= FINAL_AT - 150) return
      const at = t
      timers.push(
        window.setTimeout(() => {
          audio.sfx(i % 2 === 0 ? 'kakao' : 'error')
          setTyping(false)
          setMsgs((m) => [...m, { id: i, text: i % 2 === 0 ? quit : resume, time: `오후 2:${String(i + 1).padStart(2, '0')}` }])
          timers.push(window.setTimeout(() => setTyping(true), 120))
        }, at),
      )
      t += gap
    })
    timers.push(
      window.setTimeout(() => {
        audio.sfx('boo')
        setTyping(false)
        setMsgs((m) => [...m, { id: 100, text: finalLine, time: '오후 2:09', bold: true }])
      }, FINAL_AT),
    )
    timers.push(
      window.setTimeout(() => {
        setMsgs((m) => [...m, { id: 101, text: '결론: 답변 진행합니다 (아마)', time: '', system: true }])
      }, FINAL_AT + 600),
    )
    return () => timers.forEach((x) => window.clearTimeout(x))
  }, [audio, quit, resume, finalLine])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, typing])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  return (
    <SceneFrame style={{ background: '#ffffff', color: '#111', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' }} className="p-0">
      <div className="flex h-full w-full max-w-[400px] flex-col">
        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 pt-6 pb-2">
          <span className="text-xl text-blue-500">‹</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-300 text-lg">🙍</div>
          <div className="text-left">
            <div className="text-sm font-bold">{header}</div>
            <div className="h-4 text-[11px] text-gray-400">{typing ? '입력 중...' : ' '}</div>
          </div>
        </div>

        {/* 스레드 */}
        <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3 text-left">
          <div className="text-center text-[10px] text-gray-400">오늘</div>
          <AnimatePresence initial={false}>
            {msgs.map((m) =>
              m.system ? (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-1 text-center text-[11px] text-gray-400">
                  {m.text}
                </motion.div>
              ) : (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex items-end gap-1.5">
                  <div className={`max-w-[80%] rounded-2xl rounded-bl-sm bg-gray-200 px-3 py-2 text-sm leading-snug ${m.bold ? 'font-black text-red-600' : ''}`} style={{ wordBreak: 'keep-all' }}>
                    {m.text}
                  </div>
                  <span className="text-[10px] text-gray-400">{m.time}</span>
                </motion.div>
              ),
            )}
          </AnimatePresence>
          {typing && (
            <div className="flex w-14 items-center justify-center gap-1 rounded-2xl rounded-bl-sm bg-gray-200 px-3 py-2">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-500" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} />
              ))}
            </div>
          )}
        </div>

        {/* 입력 바 */}
        <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-3 py-2 pb-20">
          <div className="flex-1 rounded-full border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-400">메시지</div>
          <TrollButton label="답장" className="btn text-sm" style={{ background: '#007aff', color: '#fff' }} audio={audio} onPress={() => toast('답장 포기하겠습니다.. 생각해보니 답장하겠습니다..')} />
        </div>
      </div>
    </SceneFrame>
  )
}
