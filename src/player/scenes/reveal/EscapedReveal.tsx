import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { ESCAPED_RETRY, LEGENDARY_LINES, pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

/** 레전더리 (1%): "답변이 도망갔습니다" 후 처음부터 재시작 */
export default function EscapedReveal({ audio, rng, restart }: SceneProps): React.JSX.Element {
  const line = useMemo(() => pick(LEGENDARY_LINES.escaped, rng), [rng])
  const retry = useMemo(() => pick(ESCAPED_RETRY, rng), [rng])
  const [phase, setPhase] = useState<0 | 1>(0)
  useEffect(() => {
    audio.sfx('error')
    const t = window.setTimeout(() => {
      setPhase(1)
      audio.sfx('whoosh')
    }, 1800)
    const t2 = window.setTimeout(restart, 3000)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [audio, restart])
  return (
    <SceneFrame>
      <motion.div className="text-6xl" initial={{ x: 0 }} animate={{ x: '120vw' }} transition={{ duration: 1.4, ease: 'easeIn' }}>
        💬
      </motion.div>
      <div className="mt-6 text-2xl font-black">{phase === 0 ? line : retry}</div>
      <div className="mt-2 text-xs opacity-50">★ LEGENDARY / 처음부터 다시 (1% 확률)</div>
    </SceneFrame>
  )
}
