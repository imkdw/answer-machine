import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextPlane } from '../../../three/textTexture'
import { SLOT } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 8500
const STOP_AT = [2500, 3400, 4300] as const
const NEAR_AT = 5000
const RESULT_AT = 5700
const END_AT = 7400

const N = SLOT.symbols.length
const STEP = (Math.PI * 2) / N
const REEL_R = 1.05
const SPIN_SPEED = 13

/** 조작된 조합: 앞 두 릴 확정, 세 번째는 pause 심볼에서 멈추는 척하다 final로 한 칸 튐 */
interface Rig {
  first: number
  second: number
  pause: number
  final: number
  resultIdx: number
}
const RIGS: Rig[] = [
  // 7 7 7 -> 7 7 ㅋ
  { first: 0, second: 0, pause: 0, final: 7, resultIdx: 2 },
  // 답 변 🍒 -> 답 변 꽝
  { first: 1, second: 2, pause: 4, final: 3, resultIdx: 1 },
]

type Cmd = 'stop' | 'coins'

/** 슬롯머신. 777 직전에 세 번째 릴이 한 칸 튄다. 잭팟은 사장님 것. */
export default function SlotMachine({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(SLOT.title, rng), [rng])
  const hint = useMemo(() => pick(SLOT.hint, rng), [rng])
  const rig = useMemo(() => RIGS[Math.floor(rng() * RIGS.length)]!, [rng])
  const nearLine = useMemo(() => pick(SLOT.near, rng), [rng])
  const endLine = useMemo(() => pick(SLOT.end, rng), [rng])
  const resultLine = SLOT.results[rig.resultIdx]!

  const [caption, setCaption] = useState<{ id: number; text: string; big?: boolean } | null>(null)
  const [showHint, setShowHint] = useState(true)
  const [stopped, setStopped] = useState(0)
  const [ended, setEnded] = useState(false)
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const cmds = useRef<Cmd[]>([])
  /** React 쪽 타이머와 탭이 공유하는 정지 카운트 (three가 없어도 진행) */
  const stopCount = useRef(0)
  const capSeq = useRef(0)

  const requestStop = (): void => {
    if (stopCount.current >= 3) return
    stopCount.current++
    setStopped(stopCount.current)
    setShowHint(false)
    cmds.current.push('stop')
    audioRef.current.sfx('ding')
  }
  const requestStopRef = useRef(requestStop)
  requestStopRef.current = requestStop

  useEffect(() => {
    const timers: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timers.push(window.setTimeout(fn, ms))
    }
    const say = (text: string, big = false): void => setCaption({ id: ++capSeq.current, text, big })

    // 릴 도는 소리
    const tick = window.setInterval(() => {
      if (stopCount.current >= 3) {
        window.clearInterval(tick)
        return
      }
      audioRef.current.sfx('tick')
    }, 110)
    later(() => audioRef.current.sfx('coin'), 200)
    STOP_AT.forEach((at, i) => {
      later(() => {
        if (stopCount.current <= i) requestStopRef.current()
      }, at)
    })
    later(() => {
      say(nearLine, true)
      audioRef.current.sfx('error')
    }, NEAR_AT)
    later(() => {
      say(resultLine)
      cmds.current.push('coins')
      audioRef.current.sfx('coin')
      audioRef.current.sfx('boo')
    }, RESULT_AT)
    later(() => {
      setEnded(true)
      audioRef.current.sfx('boo')
      say(endLine, true)
    }, END_AT)
    later(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    return () => {
      window.clearInterval(tick)
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [onDone, nearLine, resultLine, endLine])

  return (
    <SceneFrame style={{ background: 'radial-gradient(circle at 50% 30%, #5a0a0a 0%, #1a0404 70%)', color: '#fff' }}>
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, renderer, rng: r }) => {
          camera.position.set(0, 0.6, 9.5)
          camera.lookAt(0, 0.2, 0)
          scene.fog = new THREE.Fog(0x1a0404, 12, 28)
          scene.add(new THREE.AmbientLight(0xffffff, 0.5))
          const key = new THREE.DirectionalLight(0xfff4d6, 1.8)
          key.position.set(2, 6, 8)
          scene.add(key)
          const gold = new THREE.PointLight(0xffc82d, 50, 20)
          gold.position.set(0, 4, 4)
          scene.add(gold)
          const red = new THREE.PointLight(0xff2d2d, 30, 18)
          red.position.set(-4, -2, 4)
          scene.add(red)

          // 바닥
          const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: 0x2a0606, roughness: 0.6, metalness: 0.3 }))
          floor.rotation.x = -Math.PI / 2
          floor.position.y = -3.2
          scene.add(floor)

          // 캐비닛
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc41e3a, roughness: 0.4, metalness: 0.3 })
          const body = new THREE.Mesh(new THREE.BoxGeometry(6.2, 5.6, 2.4), bodyMat)
          body.position.set(0, 0, -1.2)
          scene.add(body)
          const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc82d, roughness: 0.25, metalness: 0.9, emissive: 0x553300, emissiveIntensity: 0.4 })
          const trim = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.4, 2.8), goldMat)
          trim.position.set(0, 2.9, -1.2)
          scene.add(trim)
          const trimB = trim.clone()
          trimB.position.y = -2.9
          scene.add(trimB)
          const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.7, 0.3), new THREE.MeshStandardMaterial({ color: 0x1a0a0a, roughness: 0.6 }))
          windowFrame.position.set(0, 0.5, -0.05)
          scene.add(windowFrame)
          const tray = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 1.2), goldMat)
          tray.position.set(0, -2.2, 0.5)
          scene.add(tray)
          const banner = makeTextPlane('JACKPOT', 0.7, { size: 96, color: '#ffe066', stroke: '#7a0000', strokeWidth: 14, padding: 24 })
          banner.position.set(0, 2.2, 0.15)
          scene.add(banner)

          // 전구
          const bulbGeo = new THREE.SphereGeometry(0.09, 10, 10)
          const bulbs: THREE.Mesh[] = []
          const addBulb = (x: number, y: number): void => {
            const b = new THREE.Mesh(bulbGeo, new THREE.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0xffe066, emissiveIntensity: 1 }))
            b.position.set(x, y, 0.15)
            scene.add(b)
            bulbs.push(b)
          }
          for (let i = 0; i <= 12; i++) {
            addBulb(-3 + (i / 12) * 6, 2.75)
            addBulb(-3 + (i / 12) * 6, -2.75)
          }
          for (let i = 1; i < 11; i++) {
            addBulb(-3, -2.75 + (i / 11) * 5.5)
            addBulb(3, -2.75 + (i / 11) * 5.5)
          }

          // 릴
          interface Reel {
            group: THREE.Group
            alpha: number
            mode: 'spin' | 'tween' | 'idle'
            tw: { a0: number; a1: number; t0: number; dur: number; back: boolean } | null
            /** 정지 후 한 칸 튀기 예약 (세 번째 릴) */
            jerkTo: number | null
            jerkAt: number
          }
          const reels: Reel[] = []
          const drumGeo = new THREE.CylinderGeometry(REEL_R * 0.96, REEL_R * 0.96, 1.3, 32)
          const drumMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.5 })
          for (let i = 0; i < 3; i++) {
            const g = new THREE.Group()
            g.position.set(-1.7 + i * 1.7, 0.5, 0.2)
            const drum = new THREE.Mesh(drumGeo, drumMat)
            drum.rotation.z = Math.PI / 2
            g.add(drum)
            for (let s = 0; s < N; s++) {
              const th = s * STEP
              const plane = makeTextPlane(SLOT.symbols[s]!, 0.62, { size: 96, color: s === 0 ? '#e11d2e' : '#1a1a1a', padding: 20 })
              plane.position.set(0, Math.sin(th) * REEL_R, Math.cos(th) * REEL_R)
              plane.rotation.x = -th
              g.add(plane)
            }
            scene.add(g)
            reels.push({ group: g, alpha: r() * Math.PI * 2, mode: 'spin', tw: null, jerkTo: null, jerkAt: 0 })
          }
          // 릴 사이 구분 기둥 + 당첨선
          const sepMat = new THREE.MeshStandardMaterial({ color: 0x2a0a0a })
          for (const x of [-2.55, -0.85, 0.85, 2.55]) {
            const sep = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.4), sepMat)
            sep.position.set(x, 0.5, 1.1)
            scene.add(sep)
          }
          const line = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0xff2d2d }))
          line.position.set(0, 0.5, 1.35)
          scene.add(line)

          // 레버
          const lever = new THREE.Group()
          lever.position.set(3.7, 0.4, -0.6)
          const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 10), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 }))
          stick.position.y = 0.9
          lever.add(stick)
          const knob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), new THREE.MeshStandardMaterial({ color: 0xff2d2d, roughness: 0.3 }))
          knob.position.y = 1.85
          lever.add(knob)
          lever.rotation.x = -0.45
          scene.add(lever)
          const leverBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), goldMat)
          leverBase.position.set(3.7, 0.4, -0.6)
          scene.add(leverBase)
          let leverT = -1

          // 코인
          const COIN_N = 140
          const coinPos = new Float32Array(COIN_N * 3)
          const coinVel = new Float32Array(COIN_N * 3)
          const coinGeo = new THREE.BufferGeometry()
          coinGeo.setAttribute('position', new THREE.BufferAttribute(coinPos, 3))
          const coinMat = new THREE.PointsMaterial({ color: 0xffd54a, size: 0.22, transparent: true, opacity: 0, depthWrite: false })
          const coins = new THREE.Points(coinGeo, coinMat)
          scene.add(coins)
          let coinT = -1

          const targetAlpha = (from: number, sym: number, minTurns: number): number => {
            // 심볼 sym이 정면(각도 0)에 오는 alpha = -theta(sym) + 2πk, from + minTurns 이상
            const base = -sym * STEP
            const k = Math.ceil((from + minTurns * Math.PI * 2 - base) / (Math.PI * 2))
            return base + k * Math.PI * 2
          }

          const stopReel = (t: number): void => {
            const idx = reels.findIndex((rl) => rl.mode === 'spin')
            if (idx < 0) return
            const rl = reels[idx]!
            const symbols = [rig.first, rig.second, rig.pause]
            const a1 = targetAlpha(rl.alpha, symbols[idx]!, 1)
            rl.mode = 'tween'
            rl.tw = { a0: rl.alpha, a1, t0: t, dur: idx === 2 ? 0.8 : 0.6, back: idx !== 2 }
            if (idx === 2) {
              rl.jerkTo = targetAlpha(a1 + 0.01, rig.final, 0)
              rl.jerkAt = t + 0.8 + 0.45
            }
          }

          const onDown = (): void => {
            leverT = 0
            requestStopRef.current()
          }
          renderer.domElement.style.touchAction = 'none'
          renderer.domElement.addEventListener('pointerdown', onDown)

          const easeOutBack = (x: number): number => {
            const c1 = 1.70158
            const c3 = c1 + 1
            return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
          }
          const easeOut = (x: number): number => 1 - Math.pow(1 - x, 3)

          return {
            update(dt, t) {
              while (cmds.current.length > 0) {
                const c = cmds.current.shift()!
                if (c === 'stop') stopReel(t)
                else if (c === 'coins') {
                  for (let i = 0; i < COIN_N; i++) {
                    coinPos[i * 3] = (r() - 0.5) * 1.5
                    coinPos[i * 3 + 1] = -1.9
                    coinPos[i * 3 + 2] = 0.8
                    coinVel[i * 3] = (r() - 0.5) * 6
                    coinVel[i * 3 + 1] = 4 + r() * 6
                    coinVel[i * 3 + 2] = 1 + r() * 4
                  }
                  coinT = 0
                }
              }

              for (const rl of reels) {
                if (rl.mode === 'spin') {
                  rl.alpha += SPIN_SPEED * dt
                } else if (rl.mode === 'tween' && rl.tw) {
                  const k = Math.min(1, (t - rl.tw.t0) / rl.tw.dur)
                  rl.alpha = rl.tw.a0 + (rl.tw.a1 - rl.tw.a0) * (rl.tw.back ? easeOutBack(k) : easeOut(k))
                  if (k >= 1) {
                    rl.alpha = rl.tw.a1
                    rl.mode = 'idle'
                    rl.tw = null
                  }
                } else if (rl.mode === 'idle' && rl.jerkTo !== null && t >= rl.jerkAt) {
                  rl.mode = 'tween'
                  rl.tw = { a0: rl.alpha, a1: rl.jerkTo, t0: t, dur: 0.35, back: true }
                  rl.jerkTo = null
                  audioRef.current.sfx('crack')
                }
                rl.group.rotation.x = rl.alpha
              }

              // 레버
              if (leverT >= 0) {
                leverT += dt
                const k = Math.min(1, leverT / 0.45)
                const pull = Math.sin(k * Math.PI)
                lever.rotation.x = -0.45 + pull * 1.1
                if (k >= 1) leverT = -1
              }

              // 코인: 튀어나왔다가 다시 빨려 들어감
              if (coinT >= 0) {
                coinT += dt
                const suck = coinT > 1.1
                for (let i = 0; i < COIN_N; i++) {
                  if (suck) {
                    const dx = 0 - coinPos[i * 3]!
                    const dy = -1.9 - coinPos[i * 3 + 1]!
                    const dz = 0.8 - coinPos[i * 3 + 2]!
                    coinVel[i * 3] = dx * 6
                    coinVel[i * 3 + 1] = dy * 6
                    coinVel[i * 3 + 2] = dz * 6
                  } else {
                    coinVel[i * 3 + 1] -= 14 * dt
                  }
                  coinPos[i * 3] += coinVel[i * 3]! * dt
                  coinPos[i * 3 + 1] += coinVel[i * 3 + 1]! * dt
                  coinPos[i * 3 + 2] += coinVel[i * 3 + 2]! * dt
                }
                ;(coinGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true
                coinMat.opacity = coinT < 1.1 ? 1 : Math.max(0, 1 - (coinT - 1.1) / 0.5)
                if (coinT > 1.7) coinT = -1
              }

              // 전구 체이스
              bulbs.forEach((b, i) => {
                const on = (Math.floor(t * 10) + i) % 4 === 0
                ;(b.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 2.5 : 0.2
              })
              gold.intensity = 40 + Math.sin(t * 4) * 15
              banner.position.y = 2.2 + Math.sin(t * 3) * 0.05
              banner.scale.setScalar(1 + Math.sin(t * 6) * 0.03)

              camera.position.x = Math.sin(t * 0.4) * 1.1
              camera.position.y = 0.6 + Math.cos(t * 0.6) * 0.35
              camera.lookAt(0, 0.2, 0)
            },
            dispose() {
              renderer.domElement.removeEventListener('pointerdown', onDown)
              drumGeo.dispose()
              bulbGeo.dispose()
            },
          }
        }}
      />

      <div className="pointer-events-none absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full border-2 border-yellow-300 bg-black/70 px-4 py-1 text-sm font-black tracking-wide text-yellow-100 shadow-lg">
        🎰 {title}
      </div>
      <div className="pointer-events-none absolute top-14 right-4 z-10 rounded-md border border-yellow-300 bg-black/70 px-3 py-1 font-mono text-xs text-yellow-100">
        REEL <span className="text-base font-black text-yellow-300">{stopped}</span>/3
      </div>

      <div className="pointer-events-none absolute inset-x-4 top-24 z-10 flex justify-center">
        <AnimatePresence>
          {showHint && (
            <motion.div
              key="hint"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: [1, 0.5, 1], y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { repeat: Infinity, duration: 0.9 } }}
              className="rounded-xl bg-white/90 px-3 py-1.5 text-sm font-bold text-gray-900 shadow"
            >
              👆 {hint}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-28 z-10 flex flex-col items-center gap-3">
        <AnimatePresence mode="wait">
          {caption && (
            <motion.div
              key={caption.id}
              initial={{ scale: 0, rotate: -12, opacity: 0 }}
              animate={{ scale: [0, 1.35, 1], rotate: [-12, 4, -2], opacity: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.4 }}
              className={`meme-caption ${caption.big ? 'text-4xl' : 'text-2xl'}`}
              style={{ whiteSpace: 'normal', lineHeight: 1.1 }}
            >
              {caption.text}
            </motion.div>
          )}
        </AnimatePresence>
        {ended && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-full bg-black/70 px-4 py-1.5 text-sm font-bold text-yellow-100">
            잭팟 확률: 0% (사장님 설정)
          </motion.div>
        )}
      </div>
    </SceneFrame>
  )
}
