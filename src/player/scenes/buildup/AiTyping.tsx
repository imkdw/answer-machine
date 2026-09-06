import { useEffect, useMemo, useState } from 'react'
import { SceneFrame } from '../../SceneFrame'
import { AI_CANCEL, AI_FAKE_ANSWERS, pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

/** 타이핑으로 엉뚱한 답을 쓰다가 전부 지우고 "아 아니다" */
export default function AiTyping({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const fake = useMemo(() => pick(AI_FAKE_ANSWERS, rng), [rng])
  const cancel = useMemo(() => pick(AI_CANCEL, rng), [rng])
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'typing' | 'deleting' | 'cancel'>('typing')

  useEffect(() => {
    const chars = Array.from(fake)
    if (phase === 'typing') {
      if (text.length >= chars.length) {
        const t = window.setTimeout(() => setPhase('deleting'), 500)
        return () => window.clearTimeout(t)
      }
      const t = window.setTimeout(() => {
        setText(chars.slice(0, Array.from(text).length + 1).join(''))
        audio.sfx('typing')
      }, 55 + rng() * 40)
      return () => window.clearTimeout(t)
    }
    if (phase === 'deleting') {
      if (text.length === 0) {
        setPhase('cancel')
        audio.sfx('error')
        return
      }
      const t = window.setTimeout(() => setText((s) => Array.from(s).slice(0, -1).join('')), 22)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(onDone, 1100)
    return () => window.clearTimeout(t)
  }, [phase, text, fake, audio, onDone, rng])

  return (
    <SceneFrame>
      <div className="w-full max-w-md text-left">
        <div className="mb-2 flex items-center gap-2 text-xs opacity-60">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400" /> 답변 생성 AI (무료 버전)
        </div>
        <div className="min-h-[6rem] rounded-2xl border p-4 text-lg leading-relaxed" style={{ borderColor: 'color-mix(in srgb, var(--fg) 30%, transparent)' }}>
          {phase === 'cancel' ? <span style={{ color: 'var(--accent)' }}>{cancel}</span> : text}
          <span className="blink">▍</span>
        </div>
      </div>
    </SceneFrame>
  )
}
