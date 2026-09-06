import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import type { SceneProps } from '../../types'

const DURATION = 3200
const EMOJI = ['🤣', '💀', '🔥', '👀', '🫠', '😭', '🤡', '💩', '🙏', '🐸', '🍕', '🚨', '🫡', '🥴', '🧐', '🎉']

export default function EmojiStorm({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const items = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        e: EMOJI[Math.floor(rng() * EMOJI.length)]!,
        x: rng() * 100,
        delay: rng() * 1.2,
        dur: 1.4 + rng() * 1.6,
        size: 1.5 + rng() * 2.5,
        spin: (rng() - 0.5) * 720,
      })),
    [rng],
  )
  useEffect(() => {
    audio.sfx('whoosh')
  }, [audio])
  useTimeout(onDone, DURATION)

  return (
    <SceneFrame>
      {items.map((it) => (
        <motion.span
          key={it.id}
          className="pointer-events-none absolute select-none"
          style={{ left: `${it.x}%`, fontSize: `${it.size}rem` }}
          initial={{ top: '-10%', rotate: 0 }}
          animate={{ top: '110%', rotate: it.spin }}
          transition={{ delay: it.delay, duration: it.dur, ease: 'easeIn' }}
        >
          {it.e}
        </motion.span>
      ))}
      <div className="relative z-10 rounded-xl px-4 py-2 text-2xl font-black backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)' }}>
        답변 찾는 중
      </div>
    </SceneFrame>
  )
}
