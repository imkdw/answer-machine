import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { LEGENDARY_LINES, pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

/** 레전더리 (1%): 연출 없이 바로 답변. "오늘은 봐줌" */
export default function MercyReveal({ answer, onDone, audio, rng }: SceneProps): React.JSX.Element {
  const line = useMemo(() => pick(LEGENDARY_LINES.mercy, rng), [rng])
  useEffect(() => {
    audio.sfx('ding')
    const t = window.setTimeout(onDone, 1200)
    return () => window.clearTimeout(t)
  }, [audio, onDone])
  return (
    <SceneFrame>
      <div className="answer-text max-w-[90vw]">{answer}</div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
        ★ LEGENDARY / {line}
      </motion.div>
    </SceneFrame>
  )
}
