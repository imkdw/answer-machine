import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { DONT_PRESS, pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

/** 빨간 버튼 하나. 누르면 "누를 줄 알았음", 10초 안 누르면 "인내심 테스트 통과. 근데 어차피 진행". */
export default function DontPress({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const [result, setResult] = useState<string | null>(null)
  const [left, setLeft] = useState(10)
  const pressedLine = useMemo(() => pick(DONT_PRESS.pressed, rng), [rng])
  const waitedLine = useMemo(() => pick(DONT_PRESS.waited, rng), [rng])

  useTimeout(() => {
    if (!result) finish(waitedLine)
  }, 10000)
  useTimeout(() => setLeft((n) => Math.max(0, n - 1)), result ? null : left > 0 ? 1000 : null)

  const finish = (line: string): void => {
    setResult(line)
    audio.sfx(line === pressedLine ? 'boo' : 'tada')
    window.setTimeout(onDone, 1400)
  }

  return (
    <SceneFrame>
      {result ? (
        <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="text-3xl font-black" style={{ color: 'var(--accent)' }}>
          {result}
        </motion.div>
      ) : (
        <>
          <div className="mb-8 text-xl font-bold">절대 누르지 마시오</div>
          <motion.button
            type="button"
            onClick={() => finish(pressedLine)}
            className="h-36 w-36 rounded-full border-8 border-red-900 bg-red-600 text-lg font-black text-white shadow-[0_10px_0_#7f1d1d] active:translate-y-2 active:shadow-none"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            누르지 마
          </motion.button>
          <div className="mt-8 text-xs opacity-50">안 누르면 {left}초 뒤 뭔가 있음 (없음)</div>
        </>
      )}
    </SceneFrame>
  )
}
