import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Scene } from './types'
import type { AudioBus } from '../audio/AudioBus'
import { SkipButton } from './SkipButton'
import { pickExtraScene } from './scenePicker'
import { MemeCaption } from './MemeCaption'
import { BaitLayer } from './BaitLayer'
import { TapBurst } from './TapBurst'

interface Props {
  scenes: Scene[]
  allScenes: Scene[]
  answer: string
  audio: AudioBus
  rng: () => number
  bgmIndex: number
  /** 레전더리 "답변이 도망갔습니다" 등에서 처음부터 다시 */
  onRestart: () => void
  /** 리빌이 끝난 뒤 아래에 붙는 푸터 (다시 보기, 나도 만들기, URL 복사) */
  footer: (stats: { skipCount: number }) => ReactNode
}

/** 씬 배열을 순서대로 재생하고 마지막(리빌)에서 멈춘다. */
export function ScenePlayer({ scenes, allScenes, answer, audio, rng, bgmIndex, onRestart, footer }: Props): React.JSX.Element {
  const [queue, setQueue] = useState<Scene[]>(scenes)
  const [idx, setIdx] = useState(0)
  const [skipCount, setSkipCount] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [ready, setReady] = useState(false)
  const doneRef = useRef(false)
  const pendingExt = useRef(0)

  useEffect(() => {
    doneRef.current = false
    setReady(false)
  }, [idx])

  useEffect(() => {
    audio.bgm.start(bgmIndex)
    return () => audio.bgm.stop()
  }, [audio, bgmIndex])

  const current = queue[idx]
  const isLast = idx >= queue.length - 1

  const advance = useCallback((): void => {
    if (isLast) {
      setRevealed(true)
      audio.bgm.stop()
      return
    }
    setIdx((i) => i + 1)
  }, [isLast, audio])

  const handleDone = useCallback((): void => {
    if (doneRef.current) return
    doneRef.current = true
    const ext = pendingExt.current
    pendingExt.current = 0
    // 리빌은 그대로 열고, 씬 사이 이동은 사용자가 눌러야 넘어간다
    const finish = isLast ? advance : (): void => setReady(true)
    if (ext > 0) window.setTimeout(finish, ext)
    else finish()
  }, [advance, isLast])

  const extendTime = useCallback((ms: number): void => {
    pendingExt.current += ms
  }, [])

  const addExtraScene = useCallback((): void => {
    setQueue((q) => {
      const extra = pickExtraScene(
        allScenes,
        q.map((s) => s.id),
        rng,
      )
      if (!extra) return q
      const reveal = q[q.length - 1]!
      return [...q.slice(0, -1), extra, reveal]
    })
  }, [allScenes, rng])

  const sceneRng = useMemo(() => rng, [rng])

  if (!current) return <div />
  const Comp = current.component

  return (
    <div className="absolute inset-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.id}-${idx}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <Suspense fallback={<div className="absolute inset-0" style={{ background: 'var(--bg)' }} />}>
            <Comp answer={answer} onDone={handleDone} audio={audio} extendTime={extendTime} skipCount={skipCount} rng={sceneRng} restart={onRestart} />
          </Suspense>
        </motion.div>
      </AnimatePresence>

      <MemeCaption rng={sceneRng} sceneKey={`${current.id}-${idx}`} enabled={!revealed} />
      <BaitLayer rng={sceneRng} sceneKey={`${current.id}-${idx}`} enabled={!revealed} audio={audio} onExtend={extendTime} />
      <TapBurst />

      {!revealed && !ready && (
        <SkipButton audio={audio} count={skipCount} onPress={setSkipCount} onExtend={extendTime} onExtraScene={addExtraScene} />
      )}

      <AnimatePresence>
        {ready && !revealed && (
          <motion.button
            key="next"
            type="button"
            autoFocus
            onClick={advance}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex cursor-pointer items-end justify-center pb-20"
            aria-label="다음"
          >
            <motion.span
              className="btn text-base shadow-lg"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            >
              다음 →
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revealed && (
          <motion.div
            key="footer"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="absolute inset-x-0 bottom-0 z-30"
          >
            {footer({ skipCount })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
