import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BAIT } from '../copy/memes'
import { pick } from '../copy/reactions'
import { toast } from './Toast'
import type { AudioBus } from '../audio/AudioBus'

interface Props {
  rng: () => number
  /** 씬 바뀔 때마다 리셋용 키 */
  sceneKey: string
  enabled: boolean
  audio: AudioBus
  /** 미끼를 물면 연출 시간 추가 */
  onExtend: (ms: number) => void
  /** 문 횟수 통계 */
  onBite?: () => void
}

interface Bait {
  id: number
  label: string
  x: number
  y: number
  rot: number
}

let seq = 0
const BITE_PENALTY_MS = 2000

/**
 * 씬과 무관하게 "여기 눌러서 바로 보기" 같은 미끼 링크가 툭 튀어나온다.
 * 누르면 연출이 2초 늘고 링크는 도망간다. 안 누르면 알아서 사라진다.
 */
export function BaitLayer({ rng, sceneKey, enabled, audio, onExtend, onBite }: Props): React.JSX.Element {
  const [bait, setBait] = useState<Bait | null>(null)
  const [bitten, setBitten] = useState(false)

  useEffect(() => {
    if (!enabled) return
    if (rng() > 0.4) return
    const timers: number[] = []
    const delay = 900 + rng() * 2600
    timers.push(
      window.setTimeout(() => {
        setBitten(false)
        setBait({
          id: ++seq,
          label: pick(BAIT.labels, rng),
          x: 12 + rng() * 50,
          y: 18 + rng() * 55,
          rot: (rng() - 0.5) * 10,
        })
        timers.push(window.setTimeout(() => setBait(null), 3200))
      }, delay),
    )
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      setBait(null)
      setBitten(false)
    }
  }, [sceneKey, enabled, rng])

  const bite = (): void => {
    if (!bait || bitten) return
    setBitten(true)
    toast(pick(BAIT.tapped))
    audio.sfx('error')
    onExtend(BITE_PENALTY_MS)
    onBite?.()
    window.setTimeout(() => setBait(null), 500)
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[36] overflow-hidden">
      <AnimatePresence>
        {bait && (
          <motion.button
            key={bait.id}
            type="button"
            onClick={bite}
            className="pointer-events-auto absolute rounded-full border-2 border-blue-300 bg-white px-3 py-1.5 text-sm font-bold text-blue-700 underline shadow-lg"
            style={{ left: `${bait.x}%`, top: `${bait.y}%`, fontFamily: 'system-ui, sans-serif' }}
            initial={{ scale: 0, rotate: bait.rot - 20, opacity: 0 }}
            animate={bitten ? { x: 600, y: -200, rotate: 540, opacity: 0 } : { scale: [0, 1.15, 1], rotate: bait.rot, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={bitten ? { duration: 0.5, ease: 'easeIn' } : { duration: 0.3 }}
          >
            {bait.label}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
