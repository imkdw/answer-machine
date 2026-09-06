import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { useTimeout } from '../../useTimeout'
import { toast } from '../../Toast'
import { TETO_EGEN } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 6000
const AUTO_MS = 1500

type Phase = 'quiz' | 'analyzing' | 'result'

/** 테토/에겐 판독. 뭘 골라도 결과는 랜덤. 안 골라도 알아서 넘어감. */
export default function TetoEgen({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const questions = TETO_EGEN.questions
  const result = useMemo(() => pick(TETO_EGEN.results, rng), [rng])
  const endLine = useMemo(() => pick(TETO_EGEN.end, rng), [rng])
  const emoji = useMemo(() => (rng() < 0.5 ? '💪' : '🌸'), [rng])
  const teto = useMemo(() => 35 + Math.floor(rng() * 40), [rng])

  const [q, setQ] = useState(0)
  const [phase, setPhase] = useState<Phase>('quiz')
  const [showEnd, setShowEnd] = useState(false)
  const doneRef = useRef(false)

  const advance = (): void => {
    if (phase !== 'quiz') return
    audio.sfx('pop')
    if (q + 1 >= questions.length) setPhase('analyzing')
    else setQ((n) => n + 1)
  }

  // 안 누르면 자동 진행
  useEffect(() => {
    if (phase !== 'quiz') return
    const t = window.setTimeout(() => {
      audio.sfx('pop')
      if (q + 1 >= questions.length) setPhase('analyzing')
      else setQ((n) => n + 1)
    }, AUTO_MS)
    return () => window.clearTimeout(t)
  }, [q, phase, questions.length, audio])

  useEffect(() => {
    if (phase !== 'analyzing') return
    const roll = audio.sfx('drumroll')
    const t = window.setTimeout(() => {
      roll.stop()
      setPhase('result')
      audio.sfx('tada')
    }, 700)
    return () => {
      window.clearTimeout(t)
      roll.stop()
    }
  }, [phase, audio])

  useEffect(() => {
    if (phase !== 'result') return
    const t = window.setTimeout(() => setShowEnd(true), 700)
    return () => window.clearTimeout(t)
  }, [phase])

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  const cur = questions[Math.min(q, questions.length - 1)]!

  return (
    <SceneFrame style={{ background: 'linear-gradient(160deg, #ffe0ec 0%, #dbe7ff 100%)', color: '#1f1f2e', fontFamily: 'system-ui, sans-serif' }}>
      <div className="w-full max-w-sm rounded-3xl bg-white/90 p-6 shadow-2xl backdrop-blur">
        <div className="text-center text-xs font-bold tracking-wide text-pink-500">{TETO_EGEN.title}</div>

        <AnimatePresence mode="wait">
          {phase === 'quiz' && (
            <motion.div key={`q${q}`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="mt-3 flex justify-center gap-1.5">
                {questions.map((_, i) => (
                  <span key={i} className={`h-2 w-2 rounded-full ${i <= q ? 'bg-pink-500' : 'bg-gray-300'}`} />
                ))}
              </div>
              <div className="mt-5 text-center text-xl font-black">
                Q{q + 1}. {cur.q}
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <TrollButton label={cur.a[0]!} hoverLabel={cur.a[1]!} className="btn w-full text-base" audio={audio} onPress={advance} />
                <TrollButton label={cur.a[1]!} hoverLabel={cur.a[0]!} className="btn-ghost w-full text-base" audio={audio} onPress={advance} />
              </div>
            </motion.div>
          )}

          {phase === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} className="h-10 w-10 rounded-full border-4 border-pink-200 border-t-pink-500" />
              <div className="mt-4 text-sm font-bold text-gray-600">분석 중...</div>
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div key="result" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} className="text-center">
              <div className="mt-4 text-6xl">{emoji}</div>
              <div className="mt-3 text-lg font-black leading-snug" style={{ wordBreak: 'keep-all' }}>
                {result}
              </div>
              <div className="mt-4 flex justify-between text-[11px] font-bold">
                <span className="text-blue-600">테토 {teto}%</span>
                <span className="text-pink-500">에겐 {100 - teto}%</span>
              </div>
              <div className="mt-1 flex h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <motion.div initial={{ width: 0 }} animate={{ width: `${teto}%` }} transition={{ duration: 0.6 }} className="bg-blue-500" />
                <motion.div initial={{ width: 0 }} animate={{ width: `${100 - teto}%` }} transition={{ duration: 0.6 }} className="bg-pink-400" />
              </div>
              <AnimatePresence>
                {showEnd && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-sm font-bold text-gray-500">
                    {endLine}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="mt-4">
                <TrollButton label="결과 공유" className="btn-ghost text-sm" audio={audio} onPress={() => toast('공유할 사람 없음')} reactions={[{ sfx: 'beep' }, { toast: '아직도 없음', proceed: false, sfx: 'error' }]} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
