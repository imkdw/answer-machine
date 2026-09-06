import { useEffect } from 'react'
import { useTimeout } from '../../useTimeout'
import type { SceneProps } from '../../types'

const DURATION = 2500

export default function BlueScreen({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const variant = rng() < 0.5 ? 'bsod' : 'offline'
  useEffect(() => {
    audio.sfx('static')
  }, [audio])
  useTimeout(onDone, DURATION)

  if (variant === 'offline') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-8 text-gray-700" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div className="text-6xl">🦖</div>
        <h1 className="mt-4 text-xl font-bold">연결이 끊겼습니다</h1>
        <p className="mt-2 text-sm text-gray-500">인터넷 연결을 확인하세요. (거짓말)</p>
        <p className="mt-6 text-xs text-gray-400">ERR_ANSWER_TOO_SPICY</p>
      </div>
    )
  }
  return (
    <div className="absolute inset-0 bg-[#0078d7] p-8 text-white sm:p-16" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
      <div className="text-7xl">:(</div>
      <p className="mt-6 text-lg leading-snug">답변을 불러오는 중 문제가 발생하여 PC를 다시 시작해야 합니다. (안 해도 됨)</p>
      <p className="mt-6 text-sm">0% 완료</p>
      <p className="mt-10 text-xs opacity-80">중지 코드: ANSWER_NOT_READY_YET</p>
    </div>
  )
}
