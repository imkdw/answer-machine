import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { decodeAnswer } from '../codec'
import { createAudioBus } from '../audio/AudioBus'
import { SCENES, findScene, preloadScenes } from '../player/registry'
import { pickCombo, loadLastCombo, saveLastCombo, type Combo } from '../player/scenePicker'
import { createRng } from '../player/rng'
import { THEMES } from '../player/themes'
import { BGM_FILES } from '../audio/bgm'
import { ScenePlayer } from '../player/ScenePlayer'
import { MuteToggle } from '../player/MuteToggle'
import { RevealFooter } from '../player/RevealFooter'
import { TAP_WAIT_LINES, TAP_WAIT_SUBS, pick } from '../copy/reactions'
import { getQuery, navigate } from '../router'

const BGM_COUNT = BGM_FILES.length + 4
const WaitBackdrop = lazy(() => import('../player/WaitBackdrop'))

interface Props {
  code: string
}

export default function Play({ code }: Props): React.JSX.Element {
  const decoded = useMemo(() => decodeAnswer(code), [code])
  const query = useMemo(() => getQuery(), [])
  const seed = query.get('seed')
  const forcedScene = query.get('scene')
  const skipWait = query.has('skipwait')

  const audio = useMemo(() => createAudioBus(), [])
  const rng = useMemo(() => createRng(seed !== null ? Number(seed) : undefined), [seed])
  const [phase, setPhase] = useState<'wait' | 'play'>(skipWait ? 'play' : 'wait')
  const [round, setRound] = useState(0)
  const extraRef = useRef(0)
  const [combo, setCombo] = useState<Combo | null>(null)

  const makeCombo = useCallback(
    (avoid: string[] | null, extra: number): Combo => {
      if (forcedScene && findScene(forcedScene)) {
        return { sceneIds: [forcedScene], themeIndex: Math.floor(rng() * THEMES.length), bgmIndex: Math.floor(rng() * BGM_COUNT) }
      }
      const c = pickCombo(SCENES, {
        intensity: decoded?.intensity ?? 2,
        rng,
        avoid,
        extraScenes: extra,
        themeCount: THEMES.length,
        bgmCount: BGM_COUNT,
      })
      saveLastCombo(c.sceneIds)
      return c
    },
    [decoded, forcedScene, rng],
  )

  useEffect(() => {
    const c = makeCombo(loadLastCombo(), 0)
    setCombo(c)
    preloadScenes(c.sceneIds)
    window.setTimeout(() => preloadScenes(), 1500)
  }, [makeCombo])

  const restart = useCallback(
    (extra: number): void => {
      extraRef.current = extra
      setCombo((prev) => makeCombo(prev?.sceneIds ?? null, extra))
      setRound((r) => r + 1)
    },
    [makeCombo],
  )

  const start = (): void => {
    audio.unlock()
    audio.sfx('tick')
    setPhase('play')
  }

  const waitTitle = useMemo(() => pick(TAP_WAIT_LINES), [])
  const waitSub = useMemo(() => pick(TAP_WAIT_SUBS), [])

  if (!decoded) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div className="text-6xl">🫥</div>
        <h1 className="mt-4 text-2xl font-black">이 URL엔 답변이 없음</h1>
        <p className="mt-2 text-sm opacity-70">누가 링크를 잘못 보냈거나, 당신이 잘못 눌렀거나.</p>
        <button type="button" className="btn mt-8" onClick={() => navigate('/')}>
          내가 답변 만들기
        </button>
      </div>
    )
  }

  const theme = THEMES[combo?.themeIndex ?? 0]!
  const scenes = combo ? combo.sceneIds.map((id) => findScene(id)).filter((s): s is NonNullable<typeof s> => !!s) : []

  return (
    <div className={`absolute inset-0 ${theme.className ?? ''}`} style={theme.style}>
      {phase === 'wait' || !combo ? (
        <button type="button" onClick={start} className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
          <Suspense fallback={null}>
            <WaitBackdrop rng={rng} />
          </Suspense>
          <motion.div animate={{ rotate: [0, -12, 12, -8, 8, 0] }} transition={{ repeat: Infinity, repeatDelay: 1.2, duration: 0.7 }} className="relative z-10 text-7xl">
            📬
          </motion.div>
          <h1 className="relative z-10 mt-6 text-3xl font-black">{waitTitle}</h1>
          <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.6 }} className="relative z-10 mt-3 text-base">
            {waitSub}
          </motion.p>
          <p className="absolute bottom-8 z-10 text-xs opacity-40">약 30초 소요 (거짓말일 수 있음)</p>
        </button>
      ) : (
        <ScenePlayer
          key={round}
          scenes={scenes}
          allScenes={SCENES}
          answer={decoded.text}
          audio={audio}
          rng={rng}
          bgmIndex={combo.bgmIndex}
          onRestart={() => restart(0)}
          footer={({ skipCount }) => <RevealFooter audio={audio} skipCount={skipCount} onReplay={() => restart(extraRef.current + 1)} />}
        />
      )}
      {phase === 'play' && <MuteToggle audio={audio} />}
    </div>
  )
}
