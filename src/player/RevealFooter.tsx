import { useMemo, useState } from 'react'
import type { AudioBus } from '../audio/AudioBus'
import { COPY_REACTIONS, FAKE_STATS, HELPFUL_REACTIONS, MAKE_REACTIONS, REPLAY_REACTIONS, pick } from '../copy/reactions'
import { TrollButton } from './TrollButton'
import { toast } from './Toast'
import { navigate } from '../router'

interface Props {
  audio: AudioBus
  skipCount: number
  onReplay: () => void
}

export function RevealFooter({ audio, skipCount, onReplay }: Props): React.JSX.Element {
  const [confirm, setConfirm] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const stats = useMemo(() => {
    const pool = [...FAKE_STATS]
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!
    const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!
    return [a, b]
  }, [])

  const copyUrl = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      /* 실패해도 멘트는 같음 */
    }
    toast(pick(COPY_REACTIONS.fail))
    window.setTimeout(() => toast(pick(COPY_REACTIONS.ok)), 1000)
  }

  const feedbackOnce = (kind: 'up' | 'down'): void => {
    if (feedback) {
      toast(pick(HELPFUL_REACTIONS.again))
      return
    }
    const line = pick(HELPFUL_REACTIONS[kind])
    setFeedback(line)
    audio.sfx(kind === 'up' ? 'boo' : 'ding')
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-6" style={{ fontFamily: 'var(--font)' }}>
      <div
        className="rounded-3xl p-4 shadow-lg"
        style={{ background: 'var(--bg)', color: 'var(--fg)', border: '1px solid color-mix(in srgb, var(--fg) 35%, transparent)' }}
      >
        <div className="mb-4 space-y-1.5 text-center text-base font-semibold" style={{ color: 'color-mix(in srgb, var(--fg) 85%, transparent)' }}>
          <p>스킵 시도 {skipCount}회{skipCount >= 7 ? '. 다 봤음.' : skipCount === 0 ? '. 착하네요' : ''}</p>
          {stats.map((s) => (
            <p key={s}>{s}</p>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-center gap-3 text-lg">
          {feedback ? (
            <span style={{ color: 'var(--accent)' }}>{feedback}</span>
          ) : (
            <>
              <span className="font-semibold">이 답변이 도움이 되었나요?</span>
              <button type="button" className="text-2xl" onClick={() => feedbackOnce('up')} aria-label="좋아요">
                👍
              </button>
              <button type="button" className="text-2xl" onClick={() => feedbackOnce('down')} aria-label="싫어요">
                👎
              </button>
            </>
          )}
        </div>

        {confirm ? (
          <div className="flex flex-col items-center gap-2">
            <div className="font-bold">{confirm}</div>
            <div className="flex gap-2">
              <TrollButton
                label="예"
                className="btn text-base"
                audio={audio}
                reactions={[{ toast: pick(REPLAY_REACTIONS.yes), sfx: 'pop' }]}
                onPress={onReplay}
              />
              <TrollButton
                label="아니오"
                className="btn-ghost text-base"
                audio={audio}
                reactions={[{ toast: pick(REPLAY_REACTIONS.no), sfx: 'pop' }]}
                onPress={onReplay}
                dodge={1}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <TrollButton label="다시 보기" className="btn-ghost text-base" audio={audio} onPress={() => setConfirm(pick(REPLAY_REACTIONS.confirm))} />
            <TrollButton
              label="나도 만들기"
              className="btn-ghost text-base"
              audio={audio}
              reactions={[{ toast: pick(MAKE_REACTIONS), delayMs: 900, sfx: 'boo' }]}
              onPress={() => navigate('/')}
            />
            <TrollButton label="URL 복사" className="btn text-base" audio={audio} onPress={() => void copyUrl()} />
          </div>
        )}
      </div>
    </div>
  )
}
