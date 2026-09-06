import { useRef, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { toast } from './Toast'
import type { SfxName } from '../audio/synth'
import type { AudioBus } from '../audio/AudioBus'

export interface TrollReaction {
  /** 토스트 멘트 */
  toast?: string
  /** 버튼 라벨 교체 */
  label?: string
  /** 실제 동작까지 지연 */
  delayMs?: number
  /** 이번 누름에서 실제 동작(onPress) 실행 여부. 기본 true */
  proceed?: boolean
  sfx?: SfxName
  /** 흔들기 */
  shake?: boolean
}

interface Props {
  label: string
  onPress: () => void
  /** 누른 횟수별 반응. 배열보다 많이 누르면 마지막 반응 반복 */
  reactions?: TrollReaction[]
  /** 커서/손가락이 다가오면 슬쩍 피하는 횟수 */
  dodge?: number
  /** 호버/터치 시작 시 라벨을 바꾼다 (예: "답변 보기" -> "답변 안 보기") */
  hoverLabel?: string
  audio?: AudioBus
  className?: string
  style?: CSSProperties
  disabled?: boolean
}

/**
 * 청개구리 버튼. 누른 것과 다르게 반응하지만 결국은 진행된다.
 */
export function TrollButton({ label, onPress, reactions = [], dodge = 0, hoverLabel, audio, className = 'btn', style, disabled }: Props): React.JSX.Element {
  const [count, setCount] = useState(0)
  const [text, setText] = useState(label)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [shaking, setShaking] = useState(false)
  const [hover, setHover] = useState(false)
  const dodged = useRef(0)
  const busy = useRef(false)

  const handleDodge = (): void => {
    if (dodged.current >= dodge) return
    dodged.current++
    const dir = Math.random() < 0.5 ? -1 : 1
    setOffset({ x: dir * (60 + Math.random() * 80), y: (Math.random() - 0.5) * 60 })
  }

  const handlePress = (): void => {
    if (disabled || busy.current) return
    const n = count + 1
    setCount(n)
    const r = reactions[Math.min(n - 1, reactions.length - 1)]
    if (r?.sfx && audio) audio.sfx(r.sfx)
    if (r?.toast) toast(r.toast)
    if (r?.label) setText(r.label)
    if (r?.shake) {
      setShaking(true)
      window.setTimeout(() => setShaking(false), 400)
    }
    const proceed = r?.proceed ?? true
    if (!proceed) return
    if (r?.delayMs) {
      busy.current = true
      window.setTimeout(() => {
        busy.current = false
        onPress()
      }, r.delayMs)
    } else {
      onPress()
    }
  }

  return (
    <motion.button
      type="button"
      className={`${className} ${shaking ? 'shake' : ''}`}
      style={style}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      onPointerEnter={() => {
        setHover(true)
        handleDodge()
      }}
      onPointerLeave={() => setHover(false)}
      onPointerDown={() => setHover(true)}
      onClick={handlePress}
      disabled={disabled}
    >
      {hover && hoverLabel ? hoverLabel : text}
    </motion.button>
  )
}
