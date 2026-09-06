import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { useTimeout } from '../../useTimeout'
import { CONFIRM_REACTIONS, TRIPLE_CONFIRM_QUESTIONS, pick } from '../../../copy/reactions'
import { toast } from '../../Toast'
import type { SceneProps } from '../../types'

/**
 * "정말 보시겠습니까?" -> "확실합니까?" -> "진짜요?"
 * 예 -> "안 보신다고 하셨군요" 하고 한 단계 더 / 아니오 -> "그럼 보여드림" 하고 진행. 12초 지나면 자동 진행.
 */
export default function TripleConfirm({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const [step, setStep] = useState(0)
  const [swapped, setSwapped] = useState(false)
  const questions = useMemo(() => TRIPLE_CONFIRM_QUESTIONS, [])

  useTimeout(onDone, 12000)

  const next = (): void => {
    if (step + 1 >= questions.length) onDone()
    else setStep((s) => s + 1)
  }

  const yes = (): void => {
    toast(pick(CONFIRM_REACTIONS.yes, rng))
    audio.sfx('error')
    next()
  }
  const no = (): void => {
    toast(pick(CONFIRM_REACTIONS.no, rng))
    audio.sfx('pop')
    onDone()
  }

  return (
    <SceneFrame>
      <motion.div key={step} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-2xl border-2 p-6" style={{ borderColor: 'var(--fg)' }}>
        <div className="text-2xl font-black">{questions[step]}</div>
        <div className="mt-1 text-xs opacity-50">{step + 1} / {questions.length}</div>
        <div className="mt-6 flex justify-center gap-3" onPointerEnter={() => setSwapped((s) => !s)}>
          {swapped ? (
            <>
              <TrollButton label="아니오" onPress={no} className="btn-ghost" audio={audio} />
              <TrollButton label="예" onPress={yes} className="btn" audio={audio} hoverLabel="예?" />
            </>
          ) : (
            <>
              <TrollButton label="예" onPress={yes} className="btn" audio={audio} hoverLabel="예?" />
              <TrollButton label="아니오" onPress={no} className="btn-ghost" audio={audio} />
            </>
          )}
        </div>
      </motion.div>
    </SceneFrame>
  )
}
