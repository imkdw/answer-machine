import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { Confetti } from './Confetti'
import type { SceneProps } from '../../types'

/** 뿅: 화면 번쩍 + 콘페티 + 스프링 팝업 (기본) */
export default function PopReveal({ answer, onDone, audio, rng }: SceneProps): React.JSX.Element {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => {
      setShow(true)
      audio.sfx('pop')
      audio.sfx('tada')
    }, 300)
    const t2 = window.setTimeout(onDone, 1800)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [audio, onDone])

  return (
    <SceneFrame>
      <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: show ? [0.9, 0] : 0 }} transition={{ duration: 0.5 }} />
      {show && <Confetti rng={rng} />}
      {show && (
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 12 }}
          className="answer-text relative z-10 max-w-[90vw] rounded-3xl px-6 py-4"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          {answer}
        </motion.div>
      )}
    </SceneFrame>
  )
}
