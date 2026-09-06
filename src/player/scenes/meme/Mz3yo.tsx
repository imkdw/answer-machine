import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { toast } from '../../Toast'
import { useTimeout } from '../../useTimeout'
import { MZ3 } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5000
const AUTO_MS = 1300

interface Bubble {
  id: number
  who: 'boss' | 'mz'
  text: string
  loud?: boolean
}

/** MZ 3요. 제가요? 이걸요? 왜요? 안 누르면 알아서 누름. */
export default function Mz3yo({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const bossLine = useMemo(() => pick(MZ3.boss, rng), [rng])
  const endLine = useMemo(() => pick(MZ3.end, rng), [rng])
  const [step, setStep] = useState(0)
  const [bubbles, setBubbles] = useState<Bubble[]>([{ id: 0, who: 'boss', text: MZ3.question }])
  const seq = useRef(1)
  const doneRef = useRef(false)

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  const press = (): void => {
    if (step >= MZ3.buttons.length) return
    const label = MZ3.buttons[step]!
    audio.sfx('beep')
    setBubbles((b) => [...b, { id: seq.current++, who: 'mz', text: label, loud: true }])
    setStep(step + 1)
  }

  // 안 누르면 자동으로
  useEffect(() => {
    if (step >= MZ3.buttons.length) return
    const t = window.setTimeout(press, AUTO_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // 3요 끝나면 마무리 대사
  useEffect(() => {
    if (step < MZ3.buttons.length) return
    const t1 = window.setTimeout(() => setBubbles((b) => [...b, { id: seq.current++, who: 'mz', text: bossLine }]), 350)
    const t2 = window.setTimeout(() => {
      setBubbles((b) => [...b, { id: seq.current++, who: 'boss', text: endLine }])
      audio.sfx('tada')
    }, 1100)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [step, bossLine, endLine, audio])

  return (
    <SceneFrame style={{ background: '#f2f3f5', color: '#1a1a1a', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' }} className="justify-start p-0">
      <div className="flex h-full w-full max-w-sm flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 text-left text-white" style={{ background: '#2b2d31' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">💼</span>
            <div>
              <div className="text-sm font-black">업무톡</div>
              <div className="text-[10px] opacity-60">#답변팀 / 팀장, MZ 사원 (2)</div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-[11px] font-bold"
            style={{ background: '#5865f2' }}
            onClick={() => {
              audio.sfx('error')
              toast('반려됨')
            }}
          >
            연차 신청
          </button>
        </div>

        {/* 대화 */}
        <div className="flex-1 space-y-3 overflow-hidden px-4 py-4 text-left">
          <AnimatePresence initial={false}>
            {bubbles.map((b) =>
              b.who === 'boss' ? (
                <motion.div key={b.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className="flex items-end gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-300 text-lg">👔</div>
                  <div>
                    <div className="mb-0.5 text-[10px] text-gray-500">팀장</div>
                    <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm shadow">{b.text}</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key={b.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} className="flex items-end justify-end gap-2">
                  <div className="text-right">
                    <div className="mb-0.5 text-[10px] text-gray-500">MZ 사원</div>
                    {b.loud ? (
                      <div className="meme-caption caption-pop inline-block text-3xl">{b.text}</div>
                    ) : (
                      <div className="rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white shadow" style={{ background: '#5865f2' }}>
                        {b.text}
                      </div>
                    )}
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-200 text-lg">🧑‍💻</div>
                </motion.div>
              ),
            )}
          </AnimatePresence>
        </div>

        {/* 버튼 */}
        <div className="flex min-h-24 items-center justify-center border-t border-gray-200 bg-white px-4 py-4">
          <AnimatePresence mode="wait">
            {step < MZ3.buttons.length ? (
              <motion.div key={step} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                <TrollButton label={MZ3.buttons[step]!} className="btn px-8 py-4 text-2xl" style={{ background: '#5865f2', color: '#fff' }} audio={audio} onPress={press} />
              </motion.div>
            ) : (
              <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-400">
                팀장이 입력 중...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SceneFrame>
  )
}
