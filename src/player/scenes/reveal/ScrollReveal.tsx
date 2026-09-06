import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import type { SceneProps } from '../../types'

const GUNGSEO = '"Apple Gungseo", Gungsuh, "궁서", "궁서체", "Nanum Myeongjo", serif'

/** 옛날 조서 펼치기, 궁서체 */
export default function ScrollReveal({ answer, onDone, audio }: SceneProps): React.JSX.Element {
  useEffect(() => {
    audio.sfx('whoosh')
    const t = window.setTimeout(() => audio.sfx('ding'), 1200)
    const t2 = window.setTimeout(onDone, 2600)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [audio, onDone])

  return (
    <SceneFrame style={{ background: '#2b1d0e', fontFamily: GUNGSEO }}>
      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-sm border-y-8 border-amber-900 bg-[#f3e6c8] px-6 py-10 text-[#2b1d0e] shadow-2xl"
        initial={{ scaleY: 0.02, opacity: 0.6 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
          <div className="text-xs tracking-[0.5em] text-amber-900">교 지</div>
          <div className="answer-text mt-4" style={{ fontFamily: GUNGSEO }}>
            {answer}
          </div>
          <div className="mt-6 text-right text-sm text-amber-900">이상. 어명이니라.</div>
          <div className="absolute right-6 bottom-6 h-10 w-10 rotate-6 rounded-sm border-2 border-red-700 text-center text-[10px] leading-[2.2rem] text-red-700">印</div>
        </motion.div>
      </motion.div>
    </SceneFrame>
  )
}
