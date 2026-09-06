import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { useInterval, useTimeout } from '../../useTimeout'
import { HOMETAX } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5500
const FAIL_INDEX = 3
const STEP_MS = 40
const PER_PROGRAM = 600
const INC = 100 / (PER_PROGRAM / STEP_MS)
const PW_LEN = 8

const XP_FONT = 'Tahoma, "MS Sans Serif", "Malgun Gothic", system-ui, sans-serif'

function TitleBar({ title }: { title: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-white" style={{ background: 'linear-gradient(90deg, #0a246a, #a6caf0)' }}>
      <span>{title}</span>
      <span className="flex gap-0.5">
        {['_', '□', '×'].map((c) => (
          <span key={c} className="flex h-4 w-4 items-center justify-center border border-white bg-[#d4d0c8] text-[10px] text-black" style={{ borderColor: '#fff #404040 #404040 #fff' }}>
            {c}
          </span>
        ))}
      </span>
    </div>
  )
}

/** 보안 프로그램 6개 설치 -> 인내심 모듈 실패 -> 인증서 선택 -> 비밀번호 오류. 공동인증서 지옥. */
export default function Hometax({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const doneLine = useMemo(() => pick(HOMETAX.done, rng), [rng])
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  const [stage, setStage] = useState<'install' | 'cert'>('install')
  const [pw, setPw] = useState(0)
  const [certError, setCertError] = useState(false)
  const failedOnce = useRef(false)
  const doneRef = useRef(false)

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  const installing = stage === 'install' && idx < HOMETAX.programs.length
  useInterval(
    () => {
      setProgress((p) => {
        const next = p + INC
        if (idx === FAIL_INDEX && !failedOnce.current && next >= 62) {
          failedOnce.current = true
          setFailed(true)
          audio.sfx('error')
          return 0
        }
        if (next >= 100) {
          setFailed(false)
          setIdx((i) => i + 1)
          return 0
        }
        return next
      })
    },
    installing ? STEP_MS : null,
  )

  // 설치 끝 -> 인증서 창
  useEffect(() => {
    if (stage !== 'install' || idx < HOMETAX.programs.length) return
    const t = window.setTimeout(() => setStage('cert'), 250)
    return () => window.clearTimeout(t)
  }, [stage, idx])

  // 비밀번호 점점점
  useInterval(
    () => {
      setPw((n) => n + 1)
      audio.sfx('typing')
    },
    stage === 'cert' && pw < PW_LEN ? 110 : null,
  )
  useEffect(() => {
    if (stage !== 'cert' || pw < PW_LEN) return
    const t = window.setTimeout(() => {
      setCertError(true)
      audio.sfx('error')
    }, 350)
    return () => window.clearTimeout(t)
  }, [stage, pw, audio])

  const statusText = failed ? HOMETAX.status[1] : idx === FAIL_INDEX && failedOnce.current ? HOMETAX.status[2] : idx >= HOMETAX.programs.length - 1 ? HOMETAX.status[3] : HOMETAX.status[0]

  return (
    <SceneFrame style={{ background: '#3a6ea5', color: '#000', fontFamily: XP_FONT }} className="justify-start p-0">
      {/* IE 정보 표시줄 */}
      <div className="flex w-full items-center gap-2 border-b border-[#8a8a5c] px-2 py-1 text-left text-[11px]" style={{ background: '#ffffe1' }}>
        <span>ℹ️</span>
        <span className="flex-1">이 웹사이트에서 ActiveX 컨트롤을 설치하려고 합니다. 설치하려면 여기를 클릭하세요.</span>
        <span className="font-bold">×</span>
      </div>

      <div className="relative flex w-full flex-1 items-center justify-center px-3">
        <AnimatePresence mode="wait">
          {stage === 'install' ? (
            <motion.div key="install" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, x: -30 }} className="w-full max-w-sm border-2 text-left shadow-[4px_4px_0_rgba(0,0,0,0.4)]" style={{ background: '#d4d0c8', borderColor: '#fff #404040 #404040 #fff' }}>
              <TitleBar title={HOMETAX.title} />
              <div className="p-3 text-xs">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  <span>답변을 안전하게 열람하려면 아래 보안 프로그램이 모두 필요합니다.</span>
                </div>
                <div className="border-2 bg-white p-2" style={{ borderColor: '#404040 #fff #fff #404040' }}>
                  {HOMETAX.programs.map((p, i) => {
                    const done = i < idx
                    const active = i === idx
                    const pct = done ? 100 : active ? progress : 0
                    return (
                      <div key={p} className="mb-1.5 last:mb-0">
                        <div className="flex justify-between">
                          <span className={done ? 'text-gray-500' : active ? 'font-bold' : ''}>
                            {done ? '✔ ' : active ? '▶ ' : '   '}
                            {p}
                          </span>
                          <span className="text-[10px] text-gray-500">{done ? '완료' : active ? `${Math.floor(pct)}%` : '대기'}</span>
                        </div>
                        <div className="mt-0.5 h-3 border p-[1px]" style={{ borderColor: '#404040 #fff #fff #404040' }}>
                          <div
                            className={`h-full ${active && failed ? 'shake' : ''}`}
                            style={{
                              width: `${pct}%`,
                              background: active && failed ? '#c00' : 'repeating-linear-gradient(90deg, #0a246a 0 6px, transparent 6px 8px)',
                              transition: 'width 40ms linear',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={failed ? 'font-bold text-red-700' : ''}>{installing ? statusText : '설치 완료'}</span>
                  <TrollButton
                    label="확인"
                    className="border-2 px-4 py-0.5 text-xs"
                    style={{ background: '#d4d0c8', borderColor: '#fff #404040 #404040 #fff', color: '#000' }}
                    audio={audio}
                    reactions={[{ toast: '재시작 필요', sfx: 'error', proceed: false }]}
                    onPress={() => {}}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="cert" initial={{ scale: 0.9, opacity: 0, x: 30 }} animate={{ scale: 1, opacity: 1, x: 0 }} className="w-full max-w-sm border-2 text-left shadow-[4px_4px_0_rgba(0,0,0,0.4)]" style={{ background: '#d4d0c8', borderColor: '#fff #404040 #404040 #fff' }}>
              <TitleBar title={HOMETAX.cert[0]} />
              <div className="p-3 text-xs">
                <div className="mb-1 text-[11px]">저장 위치: 하드디스크 / 이동식디스크 / 인내심</div>
                <div className="border-2 bg-white" style={{ borderColor: '#404040 #fff #fff #404040' }}>
                  <div className="grid grid-cols-[1fr_auto] border-b border-gray-300 bg-[#ece9d8] px-2 py-0.5 text-[10px] text-gray-600">
                    <span>구분 / 사용자</span>
                    <span>만료일</span>
                  </div>
                  {HOMETAX.cert.slice(1).map((c, i) => (
                    <div key={c} className="grid grid-cols-[1fr_auto] px-2 py-1" style={i === 0 ? { background: '#0a246a', color: '#fff' } : {}}>
                      <span>📜 {c}</span>
                      <span className="text-[10px]">{i === 0 ? '2019-12-31' : '-'}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="whitespace-nowrap">인증서 비밀번호</span>
                  <div className="h-6 flex-1 border-2 bg-white px-1 font-mono text-sm leading-5 tracking-widest" style={{ borderColor: '#404040 #fff #fff #404040' }}>
                    {'●'.repeat(pw)}
                    {pw < PW_LEN && <span className="blink">|</span>}
                  </div>
                </div>
                <AnimatePresence>
                  {certError && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="shake mt-2 flex items-start gap-1 font-bold text-red-700">
                      <span>⛔</span>
                      <span>{doneLine}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="mt-2 flex justify-end gap-1">
                  <TrollButton
                    label="확인"
                    className="border-2 px-4 py-0.5 text-xs"
                    style={{ background: '#d4d0c8', borderColor: '#fff #404040 #404040 #fff', color: '#000' }}
                    audio={audio}
                    reactions={[{ toast: '재시작 필요', sfx: 'error', proceed: false }]}
                    onPress={() => {}}
                  />
                  <span className="border-2 px-4 py-0.5 text-gray-500" style={{ borderColor: '#fff #404040 #404040 #fff' }}>
                    취소
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 작업 표시줄 */}
      <div className="flex w-full items-center gap-2 px-1 py-1 text-[11px] text-white" style={{ background: 'linear-gradient(#3168d5, #245edb)' }}>
        <span className="rounded px-2 py-0.5 font-black italic" style={{ background: '#3c9b3c' }}>
          시작
        </span>
        <span className="flex-1 truncate rounded border border-white/30 px-2 py-0.5">답변 열람 - Internet Explorer</span>
        <span className="opacity-80">오후 11:47</span>
      </div>
    </SceneFrame>
  )
}
