import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SKIP_REACTIONS, pick } from '../copy/reactions'
import { toast } from './Toast'
import type { AudioBus } from '../audio/AudioBus'

interface Props {
  audio: AudioBus
  count: number
  onPress: (nextCount: number) => void
  /** 2회: 연출 3초 추가 */
  onExtend: (ms: number) => void
  /** 7회: 씬 하나 추가 */
  onExtraScene: () => void
}

/**
 * 페이크 스킵 버튼 상태머신.
 * 1회 반응 라벨 + 흔들림, 2회 토스트 + 3초 추가, 3회 도망, 4회 이후 반려 팝업 + 화면 밖으로, 7회 인내심 보상.
 */
export function SkipButton({ audio, count, onPress, onExtend, onExtraScene }: Props): React.JSX.Element {
  const [label, setLabel] = useState('건너뛰기')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [shaking, setShaking] = useState(false)
  const [flying, setFlying] = useState<null | 'left' | 'right'>(null)
  const [popup, setPopup] = useState<string | null>(null)
  const runawayLeft = useRef(0)

  const shake = (): void => {
    setShaking(true)
    window.setTimeout(() => setShaking(false), 400)
  }

  const runaway = (): void => {
    if (runawayLeft.current <= 0) return
    runawayLeft.current--
    const w = Math.min(window.innerWidth, 480)
    setOffset({ x: (Math.random() - 0.5) * (w - 140), y: -(40 + Math.random() * 180) })
    audio.sfx('whoosh')
  }

  const handleClick = (): void => {
    if (flying) return
    const n = count + 1
    onPress(n)
    if (n === 1) {
      setLabel(pick(SKIP_REACTIONS.first))
      shake()
      audio.sfx('beep')
    } else if (n === 2) {
      toast(pick(SKIP_REACTIONS.second))
      window.setTimeout(() => toast(pick(SKIP_REACTIONS.toast)), 700)
      onExtend(3000)
      audio.sfx('error')
      shake()
    } else if (n === 3) {
      setLabel(pick(SKIP_REACTIONS.runaway))
      runawayLeft.current = 3
      runaway()
    } else if (n >= 7 && n % 7 === 0) {
      toast(pick(SKIP_REACTIONS.patience))
      audio.sfx('tada')
      onExtraScene()
      setLabel('그만 눌러요')
      setOffset({ x: 0, y: 0 })
    } else {
      setPopup(pick(SKIP_REACTIONS.rejected))
      audio.sfx('error')
      const dir = Math.random() < 0.5 ? 'left' : 'right'
      window.setTimeout(() => setFlying(dir), 900)
      window.setTimeout(() => setPopup(null), 1800)
      window.setTimeout(() => {
        setFlying(null)
        setOffset({ x: 0, y: 0 })
        setLabel('건너뛰기 (진짜)')
      }, 3200)
    }
  }

  const flyX = flying === 'left' ? '-120vw' : flying === 'right' ? '120vw' : offset.x

  return (
    <>
      <motion.button
        type="button"
        className={`btn-ghost fixed bottom-6 left-1/2 z-40 -translate-x-1/2 text-sm backdrop-blur ${shaking ? 'shake' : ''}`}
        style={{ background: 'color-mix(in srgb, var(--bg) 70%, transparent)' }}
        animate={{ x: flyX, y: offset.y, rotate: flying ? 720 : 0 }}
        transition={flying ? { duration: 0.9, ease: 'easeIn' } : { type: 'spring', stiffness: 400, damping: 22 }}
        onPointerEnter={runaway}
        onPointerDown={runaway}
        onClick={handleClick}
        aria-label="건너뛰기"
      >
        {label}
      </motion.button>
      <AnimatePresence>
        {popup && (
          <motion.div
            key="popup"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-x-6 top-1/3 z-50 mx-auto max-w-sm rounded-lg border border-gray-400 bg-[#ececec] p-4 text-left text-gray-900 shadow-2xl"
            style={{ fontFamily: 'Tahoma, system-ui, sans-serif' }}
          >
            <div className="mb-2 flex items-center justify-between border-b border-gray-300 pb-1 text-xs font-bold">
              <span>시스템 알림</span>
              <span className="rounded border border-gray-500 px-1">×</span>
            </div>
            <div className="text-sm">⚠️ {popup}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
