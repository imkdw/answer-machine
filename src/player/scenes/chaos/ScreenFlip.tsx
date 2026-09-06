import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import type { SceneProps } from '../../types'

const DURATION = 3000

/** 페이지 전체가 뒤집힌 채 "잠시만요" */
export default function ScreenFlip({ onDone, audio }: SceneProps): React.JSX.Element {
  const [rot, setRot] = useState(0)
  useEffect(() => {
    audio.sfx('whoosh')
    const t1 = window.setTimeout(() => {
      setRot(180)
    }, 100)
    const t2 = window.setTimeout(() => {
      setRot(90)
      audio.sfx('whoosh')
    }, 1500)
    const t3 = window.setTimeout(() => {
      setRot(360)
      audio.sfx('whoosh')
    }, 2400)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [audio])
  useTimeout(onDone, DURATION)

  return (
    <motion.div className="absolute inset-0" animate={{ rotate: rot }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
      <SceneFrame>
        <div className="text-4xl font-black">잠시만요</div>
        <div className="mt-3 text-sm opacity-70">화면이 좀 이상한데 원래 이럼</div>
        <div className="mt-8 text-6xl">🙃</div>
      </SceneFrame>
    </motion.div>
  )
}
