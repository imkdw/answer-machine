import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { POPUP_LINES, pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

/** "답변을 보려면 로그인" 팝업. X 누르면 하나 더 열림, 3번째에 닫히며 "농담". */
export default function FakePopup({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const line = useMemo(() => pick(POPUP_LINES.login, rng), [rng])
  const closeLine = useMemo(() => pick(POPUP_LINES.close, rng), [rng])
  const [layers, setLayers] = useState(1)
  const [closed, setClosed] = useState(false)

  useTimeout(onDone, closed ? 1000 : 3000)

  const close = (): void => {
    if (layers < 3) {
      setLayers((n) => n + 1)
      audio.sfx('error')
    } else {
      setClosed(true)
      audio.sfx('pop')
    }
  }

  return (
    <SceneFrame style={{ background: 'rgba(0,0,0,0.6)' }}>
      {closed ? (
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-4xl font-black" style={{ color: 'var(--accent)' }}>
          {closeLine}
        </motion.div>
      ) : (
        Array.from({ length: layers }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.7, opacity: 0, x: 0, y: 0 }}
            animate={{ scale: 1, opacity: 1, x: i * 14, y: i * 14 }}
            className="absolute w-[85%] max-w-sm rounded-lg bg-white p-5 text-left text-gray-900 shadow-2xl"
            style={{ fontFamily: 'system-ui, sans-serif', zIndex: i }}
          >
            <div className="flex items-start justify-between">
              <div className="text-base font-bold">🔒 {line}</div>
              {i === layers - 1 && (
                <button type="button" onClick={close} className="ml-3 rounded px-2 text-gray-500 hover:bg-gray-100" aria-label="닫기">
                  ✕
                </button>
              )}
            </div>
            <input className="mt-4 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="아이디 (입력해도 소용없음)" readOnly />
            <input className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="비밀번호" type="password" readOnly />
            <button type="button" onClick={close} className="mt-4 w-full rounded bg-blue-600 py-2 text-sm font-bold text-white">
              로그인
            </button>
          </motion.div>
        ))
      )}
    </SceneFrame>
  )
}
