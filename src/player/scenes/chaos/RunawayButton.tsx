import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import type { SceneProps } from '../../types'

const LINES = ['어딜', '못 잡지', 'ㅋㅋ', '한 번만 더']

/** "답변 보기" 버튼이 손가락을 피함. 3번 실패하면 자동 진행. */
export default function RunawayButton({ onDone, audio }: SceneProps): React.JSX.Element {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [misses, setMisses] = useState(0)
  const doneRef = useRef(false)

  useTimeout(onDone, 6000)

  const finish = (): void => {
    if (doneRef.current) return
    doneRef.current = true
    audio.sfx('pop')
    window.setTimeout(onDone, 500)
  }

  const dodge = (): void => {
    if (misses >= 3) return
    const w = Math.min(window.innerWidth, 500) - 160
    const h = Math.min(window.innerHeight, 700) - 200
    setPos({ x: (Math.random() - 0.5) * w, y: (Math.random() - 0.5) * h })
    setMisses((m) => m + 1)
    audio.sfx('whoosh')
  }

  const caught = misses >= 3

  return (
    <SceneFrame>
      <div className="absolute top-16 text-lg font-bold opacity-80">{caught ? '알았어 알았어. 눌러' : `버튼을 눌러서 답변 보기 (${misses}/3)`}</div>
      <motion.button
        type="button"
        className="btn text-xl"
        animate={{ x: pos.x, y: pos.y }}
        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
        onPointerEnter={dodge}
        onPointerDown={caught ? undefined : dodge}
        onClick={caught ? finish : undefined}
      >
        {caught ? '답변 보기 (진짜)' : misses ? LINES[misses % LINES.length] : '답변 보기'}
      </motion.button>
    </SceneFrame>
  )
}
