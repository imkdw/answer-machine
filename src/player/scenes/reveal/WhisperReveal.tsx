import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import type { SceneProps } from '../../types'

/** 화면이 어두워지고 아주 작게 답변. 탭하면 커짐. */
export default function WhisperReveal({ answer, onDone, audio }: SceneProps): React.JSX.Element {
  const [big, setBig] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(onDone, 2400)
    return () => window.clearTimeout(t)
  }, [onDone])

  const grow = (): void => {
    if (big) return
    setBig(true)
    audio.sfx('pop')
  }

  return (
    <SceneFrame style={{ background: '#050505', color: '#ddd' }}>
      <button type="button" onClick={grow} className="absolute inset-0 cursor-pointer" aria-label="크게 보기" />
      <motion.div
        className="relative z-10 max-w-[90vw] text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, scale: big ? 1 : 0.28 }}
        transition={{ duration: big ? 0.3 : 1.2 }}
        style={{ fontSize: 'clamp(1.75rem, 6vw + 0.5rem, 4rem)', fontWeight: 900, lineHeight: 1.25, wordBreak: 'keep-all' }}
      >
        {answer}
      </motion.div>
      {!big && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 1.5 }} className="absolute bottom-28 text-xs">
          (속삭임) 안 보이면 탭
        </motion.p>
      )}
    </SceneFrame>
  )
}
