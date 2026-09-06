import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { useTimeout } from '../../useTimeout'
import { CAPTCHA_FAIL, pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

/** "당신이 사람임을 증명하세요" 체크박스. 체크하면 바로 해제되며 "로봇 확정". 3.5초 후 자동 진행. */
export default function FakeCaptcha({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const [checked, setChecked] = useState(false)
  const [fails, setFails] = useState(0)
  const msg = useMemo(() => pick(CAPTCHA_FAIL, rng), [rng, fails]) // eslint-disable-line react-hooks/exhaustive-deps

  useTimeout(onDone, 3500 + Math.min(fails, 2) * 800)

  const handle = (): void => {
    setChecked(true)
    audio.sfx('tick')
    window.setTimeout(() => {
      setChecked(false)
      setFails((n) => n + 1)
      audio.sfx('error')
    }, 350)
  }

  return (
    <SceneFrame style={{ background: '#fafafa', color: '#222', fontFamily: 'system-ui, sans-serif' }}>
      <div className="w-full max-w-sm rounded-md border border-gray-300 bg-white p-4 text-left shadow">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handle}
            className="flex h-7 w-7 items-center justify-center rounded border-2 border-gray-400 bg-white"
            aria-label="사람임"
          >
            {checked && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-600">✓</motion.span>}
          </button>
          <span className="text-sm">당신이 사람임을 증명하세요</span>
          <span className="ml-auto text-[10px] text-gray-400">reCAPTCHA 아님</span>
        </div>
        <div className="mt-3 min-h-[1.25rem] text-xs font-semibold text-red-600">{fails > 0 && msg}</div>
      </div>
      <p className="mt-6 text-xs text-gray-400">확인 중... 로봇 판정 시스템 가동</p>
    </SceneFrame>
  )
}
