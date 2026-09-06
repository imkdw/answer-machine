import { useEffect, useRef, useState } from 'react'
import type { AudioBus } from '../audio/AudioBus'
import { MUTE_REACTIONS, pick } from '../copy/reactions'
import { toast } from './Toast'

/** 음소거. 첫 클릭엔 "검토 중..." 1초 뒤 실제 음소거. 두 번째부터 즉시. */
export function MuteToggle({ audio }: { audio: AudioBus }): React.JSX.Element {
  const [muted, setMuted] = useState(audio.muted())
  const [pending, setPending] = useState(false)
  const clicks = useRef(0)

  useEffect(() => audio.subscribe(setMuted), [audio])

  const toggle = (): void => {
    if (pending) return
    clicks.current++
    if (clicks.current === 1 && !muted) {
      toast(pick(MUTE_REACTIONS))
      setPending(true)
      window.setTimeout(() => {
        audio.setMuted(true)
        setPending(false)
      }, 1000)
      return
    }
    audio.setMuted(!muted)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full text-lg backdrop-blur"
      style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--fg) 30%, transparent)' }}
      aria-label={muted ? '소리 켜기' : '음소거'}
    >
      {pending ? '⏳' : muted ? '🔇' : '🔊'}
    </button>
  )
}
