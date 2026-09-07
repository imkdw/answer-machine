import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextSprite } from '../../../three/textTexture'
import { CLAW } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 9000
/** 1차 시도: 안 누르면 여기서 자동 정지 */
const AUTO_STOP_1 = 2200
const DROP_1 = 4400
const RETRY_AT = 4700
const AUTO_STOP_2 = 5100
const DROP_2 = 7300
const END_AT = 7800

type Cmd = 'stop' | 'drop' | 'retry'
type Phase = 'osc' | 'descend' | 'close' | 'rise' | 'move' | 'hold' | 'open' | 'return'

const RAIL_Y = 3.1
const FLOOR_Y = -2.8
const PRIZE_R = 0.42
const CHUTE_X = -2.0
const CHUTE_Z = 1.0
const OPEN_ANGLE = 0.8
const CLOSED_ANGLE = 0.12

/** 인형뽑기. 집게가 답변을 잡았다가 슈트 앞에서 놓친다. 두 번. 3,000원 소진. */
export default function ClawMachine({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(CLAW.title, rng), [rng])
  const hint = useMemo(() => pick(CLAW.hint, rng), [rng])
  const dropLines = useMemo(() => [pick(CLAW.drop, rng), pick(CLAW.drop, rng)], [rng])
  const grabLine = useMemo(() => pick(CLAW.grab, rng), [rng])
  const retryLine = useMemo(() => pick(CLAW.retry, rng), [rng])
  const endLine = useMemo(() => pick(CLAW.end, rng), [rng])

  const [credit, setCredit] = useState(1000)
  const [caption, setCaption] = useState<{ id: number; text: string; big?: boolean } | null>(null)
  const [showHint, setShowHint] = useState(true)
  const [ended, setEnded] = useState(false)
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const cmds = useRef<Cmd[]>([])
  /** 유저가 이미 멈췄으면 자동 정지 타이머는 무시 */
  const stoppedByUser = useRef(false)
  const capSeq = useRef(0)

  useEffect(() => {
    const timers: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timers.push(window.setTimeout(fn, ms))
    }
    const say = (text: string, big = false): void => setCaption({ id: ++capSeq.current, text, big })

    later(() => {
      if (!stoppedByUser.current) cmds.current.push('stop')
      setShowHint(false)
    }, AUTO_STOP_1)
    later(() => say(grabLine), AUTO_STOP_1 + 1300)
    later(() => {
      cmds.current.push('drop')
      audioRef.current.sfx('boo')
      say(dropLines[0]!, true)
    }, DROP_1)
    later(() => {
      cmds.current.push('retry')
      stoppedByUser.current = false
      setCredit(2000)
      audioRef.current.sfx('coin')
      say(retryLine)
    }, RETRY_AT)
    later(() => {
      if (!stoppedByUser.current) cmds.current.push('stop')
    }, AUTO_STOP_2)
    later(() => {
      cmds.current.push('drop')
      audioRef.current.sfx('boo')
      say(dropLines[1]!, true)
    }, DROP_2)
    later(() => {
      setCredit(3000)
      setEnded(true)
      audioRef.current.sfx('tada')
      say(endLine, true)
    }, END_AT)
    later(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [onDone, grabLine, dropLines, retryLine, endLine])

  return (
    <SceneFrame style={{ background: 'radial-gradient(circle at 50% 20%, #2a0a4a 0%, #0b0418 70%)', color: '#fff' }}>
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, renderer, rng: r }) => {
          camera.position.set(0, 1.4, 11.5)
          camera.lookAt(0, 0.2, 0)
          scene.fog = new THREE.Fog(0x0b0418, 14, 30)
          scene.add(new THREE.AmbientLight(0xffffff, 0.55))
          const key = new THREE.DirectionalLight(0xffffff, 1.6)
          key.position.set(3, 8, 6)
          scene.add(key)
          const neonA = new THREE.PointLight(0xff2d95, 40, 20)
          neonA.position.set(-4, 3, 4)
          scene.add(neonA)
          const neonB = new THREE.PointLight(0x2dffea, 40, 20)
          neonB.position.set(4, -1, 4)
          scene.add(neonB)

          // 바닥 (오락실 카펫 느낌)
          const floorMat = new THREE.MeshStandardMaterial({ color: 0x1b0f3a, roughness: 0.9 })
          const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat)
          floor.rotation.x = -Math.PI / 2
          floor.position.y = FLOOR_Y - 0.9
          scene.add(floor)
          const grid = new THREE.GridHelper(60, 40, 0xff2d95, 0x3a1a6a)
          grid.position.y = FLOOR_Y - 0.89
          scene.add(grid)

          // 캐비닛
          const W = 5.6
          const H = 6.4
          const D = 3.4
          const cabY = FLOOR_Y + H / 2 - 0.1
          const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.13, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false })
          const glass = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), glassMat)
          glass.position.y = cabY
          scene.add(glass)
          const edgeMat = new THREE.LineBasicMaterial({ color: 0xff4fd8 })
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), edgeMat)
          edges.position.y = cabY
          scene.add(edges)
          const frameMat = new THREE.MeshStandardMaterial({ color: 0xff2d95, emissive: 0xff2d95, emissiveIntensity: 0.6, roughness: 0.4 })
          const cornerGeo = new THREE.BoxGeometry(0.16, H, 0.16)
          for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
              const c = new THREE.Mesh(cornerGeo, frameMat)
              c.position.set((sx * W) / 2, cabY, (sz * D) / 2)
              scene.add(c)
            }
          }
          const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.9, D + 0.4), new THREE.MeshStandardMaterial({ color: 0x3b1670, roughness: 0.6 }))
          base.position.y = FLOOR_Y - 0.45
          scene.add(base)
          const top = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.5, D + 0.4), new THREE.MeshStandardMaterial({ color: 0x3b1670, roughness: 0.6 }))
          top.position.y = FLOOR_Y + H + 0.1
          scene.add(top)
          const inner = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.2, D - 0.2), new THREE.MeshStandardMaterial({ color: 0x241048, roughness: 0.8 }))
          inner.position.y = FLOOR_Y - 0.1
          scene.add(inner)

          // 슈트 (구멍)
          const chute = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 1.1), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 }))
          chute.position.set(CHUTE_X, FLOOR_Y + 0.02, CHUTE_Z)
          scene.add(chute)
          const chuteEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, 0.06, 1.1)), new THREE.LineBasicMaterial({ color: 0x2dffea }))
          chuteEdge.position.copy(chute.position)
          scene.add(chuteEdge)

          // 전광판 전구
          const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffe066, emissiveIntensity: 1 })
          const bulbs: THREE.Mesh[] = []
          const bulbGeo = new THREE.SphereGeometry(0.1, 10, 10)
          for (let i = 0; i < 14; i++) {
            const b = new THREE.Mesh(bulbGeo, bulbMat.clone())
            b.position.set(-W / 2 + (i / 13) * W, FLOOR_Y + H + 0.4, D / 2 + 0.2)
            scene.add(b)
            bulbs.push(b)
          }

          // 경품
          interface Prize {
            mesh: THREE.Mesh
            vx: number
            vy: number
            held: boolean
            answer: boolean
            resting: boolean
          }
          const prizes: Prize[] = []
          const prizeGeo = new THREE.SphereGeometry(PRIZE_R, 20, 16)
          const palette = [0xffd54a, 0x4fffd8, 0x7c9dff, 0xff8a3c, 0xb8ff5c, 0xff6fcf]
          const labelIdx = new Set<number>()
          while (labelIdx.size < 4) labelIdx.add(Math.floor(r() * 12))
          for (let i = 0; i < 12; i++) {
            const mat = new THREE.MeshStandardMaterial({ color: palette[i % palette.length]!, roughness: 0.35, metalness: 0.1 })
            const m = new THREE.Mesh(prizeGeo, mat)
            const col = i % 6
            const row = Math.floor(i / 6)
            m.position.set(-2.1 + col * 0.84 + (r() - 0.5) * 0.2, FLOOR_Y + PRIZE_R + row * 0.25, -0.9 + row * 1.1 + (r() - 0.5) * 0.3)
            if (labelIdx.has(i)) {
              const s = makeTextSprite(pick(CLAW.prizes, r), 0.36, { size: 56, color: '#ffffff', stroke: '#000000', strokeWidth: 10, padding: 18 })
              s.position.y = PRIZE_R + 0.25
              m.add(s)
            }
            scene.add(m)
            prizes.push({ mesh: m, vx: 0, vy: 0, held: false, answer: false, resting: true })
          }
          const ansMat = new THREE.MeshStandardMaterial({ color: 0xff2d95, roughness: 0.25, metalness: 0.2, emissive: 0xff2d95, emissiveIntensity: 0.25 })
          const ans = new THREE.Mesh(new THREE.SphereGeometry(PRIZE_R * 1.25, 24, 18), ansMat)
          ans.position.set((r() - 0.5) * 2.4, FLOOR_Y + PRIZE_R * 1.25 + 0.5, 0.15)
          const ansLabel = makeTextSprite('답변', 0.6, { size: 72, color: '#ffffff', stroke: '#ff2d95', strokeWidth: 14, padding: 24 })
          ansLabel.position.y = PRIZE_R * 1.25 + 0.4
          ans.add(ansLabel)
          scene.add(ans)
          prizes.push({ mesh: ans, vx: 0, vy: 0, held: false, answer: true, resting: false })
          const answerPrize = prizes[prizes.length - 1]!

          // 집게
          const gantry = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.14, 0.14), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 }))
          gantry.position.y = RAIL_Y + 0.2
          scene.add(gantry)
          const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0x2dffea, emissive: 0x2dffea, emissiveIntensity: 0.4 }))
          scene.add(carriage)
          const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), new THREE.MeshStandardMaterial({ color: 0xdddddd }))
          scene.add(rope)
          const head = new THREE.Group()
          const hub = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd54a, metalness: 0.7, roughness: 0.25 }))
          head.add(hub)
          const fingerMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.85, roughness: 0.25 })
          const bends: THREE.Group[] = []
          for (let i = 0; i < 3; i++) {
            const pivot = new THREE.Group()
            pivot.rotation.y = (i * Math.PI * 2) / 3
            const bend = new THREE.Group()
            const seg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), fingerMat)
            seg.position.set(0.2, -0.36, 0)
            const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.1), fingerMat)
            tip.position.set(0.12, -0.85, 0)
            tip.rotation.z = -0.7
            bend.add(seg, tip)
            bend.rotation.z = OPEN_ANGLE
            pivot.add(bend)
            head.add(pivot)
            bends.push(bend)
          }
          scene.add(head)

          // 반짝이 파편 풀
          const SPARK_N = 80
          const sparkPos = new Float32Array(SPARK_N * 3)
          const sparkVel = new Float32Array(SPARK_N * 3)
          const sparkGeo = new THREE.BufferGeometry()
          sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3))
          const sparkMat = new THREE.PointsMaterial({ color: 0xfff1a8, size: 0.14, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
          const sparks = new THREE.Points(sparkGeo, sparkMat)
          scene.add(sparks)
          let sparkT = -1
          const burst = (at: THREE.Vector3): void => {
            for (let i = 0; i < SPARK_N; i++) {
              sparkPos[i * 3] = at.x
              sparkPos[i * 3 + 1] = at.y
              sparkPos[i * 3 + 2] = at.z
              const a = r() * Math.PI * 2
              const b = (r() - 0.5) * Math.PI
              const sp = 1.5 + r() * 3
              sparkVel[i * 3] = Math.cos(a) * Math.cos(b) * sp
              sparkVel[i * 3 + 1] = Math.sin(b) * sp + 1
              sparkVel[i * 3 + 2] = Math.sin(a) * Math.cos(b) * sp
            }
            sparkT = 0
          }

          // 상태
          let phase: Phase = 'osc'
          let phaseT = 0
          let cx = 0
          let oscT = r() * 3
          let drop = 0
          let target: Prize | null = null
          let dropPending = false
          let openAmt = 1
          const headPos = new THREE.Vector3()

          const setPhase = (p: Phase): void => {
            phase = p
            phaseT = 0
          }
          const onDown = (): void => {
            if (phase === 'osc') {
              stoppedByUser.current = true
              cmds.current.push('stop')
              setShowHint(false)
            }
          }
          renderer.domElement.style.touchAction = 'none'
          renderer.domElement.addEventListener('pointerdown', onDown)

          const targetDropY = (p: Prize): number => RAIL_Y - (p.mesh.position.y + PRIZE_R + 0.75)

          return {
            update(dt, t) {
              // 명령 소비
              while (cmds.current.length > 0) {
                const c = cmds.current.shift()!
                if (c === 'stop' && phase === 'osc') {
                  const near = answerPrize.held ? null : answerPrize
                  let best: Prize | null = null
                  let bestD = Infinity
                  for (const p of prizes) {
                    if (p.held) continue
                    const d = Math.abs(p.mesh.position.x - cx)
                    if (d < bestD) {
                      bestD = d
                      best = p
                    }
                  }
                  target = near && Math.abs(near.mesh.position.x - cx) < 1.6 ? near : (best ?? answerPrize)
                  setPhase('descend')
                  audioRef.current.sfx('whoosh')
                } else if (c === 'drop') {
                  if (phase === 'hold') setPhase('open')
                  else dropPending = true
                } else if (c === 'retry') {
                  if (phase !== 'osc') setPhase('return')
                }
              }

              phaseT += dt
              const ease = (x: number): number => 1 - Math.pow(1 - Math.min(1, x), 3)

              if (phase === 'osc') {
                oscT += dt
                cx = Math.sin(oscT * 1.5) * (W / 2 - 0.9)
                drop = Math.max(0, drop - dt * 3)
                openAmt = 1
              } else if (phase === 'descend' && target) {
                const goal = targetDropY(target)
                cx += (target.mesh.position.x - cx) * Math.min(1, dt * 4)
                drop += (goal - drop) * Math.min(1, dt * 5)
                if (phaseT > 0.7) setPhase('close')
              } else if (phase === 'close' && target) {
                openAmt = 1 - ease(phaseT / 0.25)
                if (phaseT > 0.3) {
                  target.held = true
                  target.resting = false
                  burst(headPos.clone())
                  audioRef.current.sfx('sparkle')
                  setPhase('rise')
                }
              } else if (phase === 'rise') {
                drop += (0.7 - drop) * Math.min(1, dt * 4)
                if (phaseT > 0.7) setPhase('move')
              } else if (phase === 'move') {
                cx += (CHUTE_X - cx) * Math.min(1, dt * 3)
                // 흔들흔들, 위태위태
                if (phaseT > 0.8) {
                  setPhase('hold')
                  if (dropPending) {
                    dropPending = false
                    setPhase('open')
                  }
                }
              } else if (phase === 'hold') {
                cx = CHUTE_X + Math.sin(t * 9) * 0.05
              } else if (phase === 'open' && target) {
                openAmt = ease(phaseT / 0.2)
                if (phaseT > 0.12 && target.held) {
                  target.held = false
                  target.vx = 2.2 + r() * 1.5
                  target.vy = 0.5
                }
                if (phaseT > 1.2) setPhase('return')
              } else if (phase === 'return') {
                drop = Math.max(0, drop - dt * 3)
                openAmt = 1
                cx += (0 - cx) * Math.min(1, dt * 2.5)
                target = null
                if (phaseT > 0.9) {
                  setPhase('osc')
                  oscT = 0
                }
              }

              // 집게 배치
              carriage.position.set(cx, RAIL_Y, 0)
              rope.scale.y = Math.max(0.01, drop)
              rope.position.set(cx, RAIL_Y - drop / 2, 0)
              headPos.set(cx, RAIL_Y - drop, 0)
              head.position.copy(headPos)
              head.rotation.y += dt * 0.6
              for (const b of bends) b.rotation.z = CLOSED_ANGLE + (OPEN_ANGLE - CLOSED_ANGLE) * openAmt

              // 경품 물리
              for (const p of prizes) {
                const rad = p.answer ? PRIZE_R * 1.25 : PRIZE_R
                if (p.held) {
                  p.mesh.position.set(headPos.x, headPos.y - 0.75 - rad * 0.4 + Math.sin(t * 12) * 0.02, headPos.z)
                  p.mesh.rotation.z = Math.sin(t * 8) * 0.15
                  continue
                }
                if (p.resting) continue
                p.vy -= 12 * dt
                p.mesh.position.x += p.vx * dt
                p.mesh.position.y += p.vy * dt
                p.mesh.rotation.z -= p.vx * dt * 1.5
                const minY = FLOOR_Y + rad
                if (p.mesh.position.y < minY) {
                  p.mesh.position.y = minY
                  if (Math.abs(p.vy) > 1.2) {
                    p.vy = -p.vy * 0.45
                    audioRef.current.sfx('pop')
                  } else {
                    p.vy = 0
                    p.vx = 0
                    p.resting = true
                  }
                  p.vx *= 0.7
                }
                const lim = W / 2 - rad - 0.15
                if (p.mesh.position.x > lim) {
                  p.mesh.position.x = lim
                  p.vx = -Math.abs(p.vx) * 0.5
                }
              }

              // 파편
              if (sparkT >= 0) {
                sparkT += dt
                for (let i = 0; i < SPARK_N; i++) {
                  sparkVel[i * 3 + 1] -= 6 * dt
                  sparkPos[i * 3] += sparkVel[i * 3]! * dt
                  sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1]! * dt
                  sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2]! * dt
                }
                ;(sparkGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true
                sparkMat.opacity = Math.max(0, 1 - sparkT / 0.9)
                if (sparkT > 1) sparkT = -1
              }

              // 전구 체이스
              bulbs.forEach((b, i) => {
                const on = (Math.floor(t * 8) + i) % 3 === 0
                ;(b.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 2.2 : 0.15
              })
              neonA.intensity = 30 + Math.sin(t * 3) * 12
              neonB.intensity = 30 + Math.cos(t * 2.3) * 12

              camera.position.x = Math.sin(t * 0.3) * 1.4
              camera.position.y = 1.4 + Math.sin(t * 0.45) * 0.4
              camera.lookAt(0, 0.2, 0)
            },
            dispose() {
              renderer.domElement.removeEventListener('pointerdown', onDown)
              prizeGeo.dispose()
              bulbGeo.dispose()
              cornerGeo.dispose()
            },
          }
        }}
      />

      <div className="pointer-events-none absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full border-2 border-pink-400 bg-black/70 px-4 py-1 text-sm font-black tracking-wide text-pink-100 shadow-lg">
        🕹️ {title}
      </div>
      <div className="pointer-events-none absolute top-14 right-4 z-10 rounded-md border border-cyan-300 bg-black/70 px-3 py-1 font-mono text-xs text-cyan-200">
        CREDIT <span className="text-base font-black text-yellow-300">{credit.toLocaleString()}</span>원
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-full bg-black/70 px-4 py-1.5 text-sm font-bold text-cyan-100">
            사용 금액 3,000원 / 획득 답변 0개
          </motion.div>
        )}
      </div>
    </SceneFrame>
  )
}
