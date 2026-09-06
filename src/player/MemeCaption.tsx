import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MEME_CAPTIONS } from '../copy/memes'
import { pick } from '../copy/reactions'

interface Props {
  rng: () => number
  /** 씬 바뀔 때마다 리셋용 키 */
  sceneKey: string
  /** 리빌 뒤엔 끔 */
  enabled: boolean
}

interface Caption {
  id: number
  text: string
  x: number
  y: number
  rot: number
  size: number
}

let seq = 0

/**
 * 예능 자막 오버레이. 씬마다 40% 확률로 랜덤 타이밍에 밈 한 줄이 툭 튀어나왔다 사라진다.
 * 씬 로직과 무관한 독립 레이어라 어떤 씬에서든 나올 수 있다.
 */
export function MemeCaption({ rng, sceneKey, enabled }: Props): React.JSX.Element {
  const [items, setItems] = useState<Caption[]>([])

  useEffect(() => {
    if (!enabled) return
    if (rng() > 0.45) return
    const count = rng() < 0.25 ? 2 : 1
    const timers: number[] = []
    for (let i = 0; i < count; i++) {
      const delay = 600 + rng() * 2200 + i * 1200
      timers.push(
        window.setTimeout(() => {
          const c: Caption = {
            id: ++seq,
            text: pick(MEME_CAPTIONS, rng),
            x: 15 + rng() * 55,
            y: 12 + rng() * 60,
            rot: (rng() - 0.5) * 24,
            size: 1.4 + rng() * 1.4,
          }
          setItems((prev) => [...prev, c])
          timers.push(window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== c.id)), 1300 + rng() * 700))
        }, delay),
      )
    }
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      setItems([])
    }
  }, [sceneKey, enabled, rng])

  return (
    <div className="pointer-events-none absolute inset-0 z-[35] overflow-hidden">
      <AnimatePresence>
        {items.map((c) => (
          <motion.div
            key={c.id}
            className="meme-caption absolute"
            style={{ left: `${c.x}%`, top: `${c.y}%`, fontSize: `${c.size}rem`, rotate: c.rot }}
            initial={{ scale: 0, opacity: 0, rotate: c.rot - 10 }}
            animate={{ scale: [0, 1.3, 1], opacity: 1, rotate: c.rot }}
            exit={{ scale: 0.6, opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
          >
            {c.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
