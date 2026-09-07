import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextSprite } from '../../../three/textTexture'
import { RHYTHM } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 9000
const RESULT_AT = 7600
const LANES = 4
const LANE_W = 1.6
const HIGHWAY_LEN = 60
const HIT_Z = 6
const NOTE_SPEED = 14
const BEAT_MS = 60000 / 130
const LANE_COLORS = [0xff2d95, 0x2dffea, 0xffd400, 0x7cff4a]
const LANE_CSS = ['#ff2d95', '#2dffea', '#ffd400', '#7cff4a']

interface Judgement {
  id: number
  text: string
  lane: number
  bad: boolean
}

/** 답변 리듬게임. 노트는 오는데 판정은 조작됨. 콤보는 계속 끊긴다. */
export default function RhythmGame({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(RHYTHM.title, rng), [rng])
  const [judgements, setJudgements] = useState<Judgement[]>([])
  const [combo, setCombo] = useState(0)
  const [comboLine, setComboLine] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [hits, setHits] = useState({ good: 0, total: 0 })
  const [result, setResult] = useState<string | null>(null)
  const [taunt, setTaunt] = useState<string | null>(null)
  const [flash, setFlash] = useState<number | null>(null)
  const doneRef = useRef(false)
  const seq = useRef(0)
  const tapCount = useRef(0)
  const stopped = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  /** DOM 버튼 -> three 월드로 전달되는 탭 큐 */
  const tapQueue = useRef<number[]>([])
  const timersRef = useRef<number[]>([])

  const later = (fn: () => void, ms: number): void => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => {
    const timers = timersRef.current
    timers.push(
      window.setTimeout(() => {
        stopped.current = true
        setResult(pick(RHYTHM.result, rng))
        audioRef.current.sfx('boo')
      }, RESULT_AT),
    )
    timers.push(
      window.setTimeout(() => {
        if (doneRef.current) return
        doneRef.current = true
        onDone()
      }, DURATION),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [onDone, rng])

  const pushJudgement = (text: string, lane: number, bad: boolean): void => {
    const id = ++seq.current
    setJudgements((prev) => [...prev.slice(-5), { id, text, lane, bad }])
    later(() => setJudgements((prev) => prev.filter((j) => j.id !== id)), 700)
  }

  /** 미스: 노트가 판정선을 그냥 지나감 */
  const onMiss = (lane: number): void => {
    if (stopped.current) return
    pushJudgement(RHYTHM.judge.miss, lane, true)
    setCombo(0)
    setHits((h) => ({ ...h, total: h.total + 1 }))
    setComboLine(pick(RHYTHM.combo))
    later(() => setComboLine(null), 600)
    audioRef.current.sfx('error')
  }

  /** 탭: 노트 근처면 판정 (조작), 아니면 급함/느림 */
  const onTap = (lane: number, hitNote: boolean, early: boolean): void => {
    if (stopped.current) return
    setFlash(lane)
    later(() => setFlash(null), 120)
    tapCount.current++
    setHits((h) => ({ good: h.good + (hitNote ? 1 : 0), total: h.total + 1 }))
    if (!hitNote) {
      pushJudgement(early ? RHYTHM.judge.early : RHYTHM.judge.late, lane, true)
      setCombo(0)
      audioRef.current.sfx('beep')
      return
    }
    if (tapCount.current % 3 === 0) {
      // 3번째마다 맞아도 늙크크
      pushJudgement(RHYTHM.judge.miss, lane, true)
      setCombo(0)
      setTaunt(pick(RHYTHM.taunt))
      later(() => setTaunt(null), 1100)
      setComboLine(pick(RHYTHM.combo))
      later(() => setComboLine(null), 600)
      audioRef.current.sfx('boo')
      return
    }
    const perfect = Math.random() < 0.6
    pushJudgement(perfect ? RHYTHM.judge.perfect : RHYTHM.judge.great, lane, false)
    setCombo((c) => c + 1)
    setScore((s) => s + (perfect ? 1 : 0))
    audioRef.current.sfx(perfect ? 'ding' : 'tick')
  }

  const onMissRef = useRef(onMiss)
  onMissRef.current = onMiss
  const onTapRef = useRef(onTap)
  onTapRef.current = onTap

  const accuracy = hits.total === 0 ? 0 : Math.min(3, Math.round((hits.good / hits.total) * 3))

  return (
    <SceneFrame style={{ background: 'radial-gradient(ellipse at 50% 20%, #2a0a4a 0%, #07020f 70%)', color: '#fff' }}>
      <ThreeCanvas
        rng={rng}
        alpha
        init={({ scene, camera, renderer, rng: r }) => {
          camera.position.set(0, 4.2, 12)
          camera.lookAt(0, 0, -6)
          scene.fog = new THREE.Fog(0x07020f, 14, 46)
          scene.add(new THREE.AmbientLight(0xffffff, 0.5))
          const key = new THREE.PointLight(0xff2d95, 40, 40)
          key.position.set(0, 6, HIT_Z)
          scene.add(key)

          const totalW = LANES * LANE_W
          const laneX = (i: number): number => -totalW / 2 + LANE_W * (i + 0.5)

          // 하이웨이 바닥
          const road = new THREE.Mesh(
            new THREE.PlaneGeometry(totalW, HIGHWAY_LEN),
            new THREE.MeshStandardMaterial({ color: 0x120826, roughness: 0.6, metalness: 0.3, emissive: 0x1a0a30, emissiveIntensity: 0.5 }),
          )
          road.rotation.x = -Math.PI / 2
          road.position.set(0, 0, HIT_Z - HIGHWAY_LEN / 2 + 4)
          scene.add(road)

          // 레인 구분선 (네온)
          const lineMat = new THREE.MeshBasicMaterial({ color: 0x6f4bff, transparent: true, opacity: 0.8 })
          for (let i = 0; i <= LANES; i++) {
            const line = new THREE.Mesh(new THREE.PlaneGeometry(0.05, HIGHWAY_LEN), lineMat)
            line.rotation.x = -Math.PI / 2
            line.position.set(-totalW / 2 + LANE_W * i, 0.01, road.position.z)
            scene.add(line)
          }

          // 판정선
          const hitLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
          const hitLine = new THREE.Mesh(new THREE.PlaneGeometry(totalW + 0.4, 0.14), hitLineMat)
          hitLine.rotation.x = -Math.PI / 2
          hitLine.position.set(0, 0.02, HIT_Z)
          scene.add(hitLine)

          // 레인 받침 (탭하면 번쩍)
          const pads: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>[] = []
          for (let i = 0; i < LANES; i++) {
            const pad = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: LANE_COLORS[i]!, transparent: true, opacity: 0.35 }))
            pad.rotation.x = -Math.PI / 2
            pad.position.set(laneX(i), 0.03, HIT_Z)
            scene.add(pad)
            pads.push(pad)
          }

          // 배경 별
          const SN = 400
          const sPos = new Float32Array(SN * 3)
          for (let i = 0; i < SN; i++) {
            sPos[i * 3] = (r() - 0.5) * 60
            sPos[i * 3 + 1] = r() * 25
            sPos[i * 3 + 2] = -10 - r() * 40
          }
          const sGeo = new THREE.BufferGeometry()
          sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
          const stars = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.7 }))
          scene.add(stars)

          // 사이드 스피커 기둥
          const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2dffea, emissive: 0x2dffea, emissiveIntensity: 0.6 })
          const pillars: THREE.Mesh[] = []
          for (let i = 0; i < 10; i++) {
            for (const side of [-1, 1]) {
              const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1 + r() * 2, 0.3), pillarMat)
              p.position.set(side * (totalW / 2 + 1.2), 0.5, HIT_Z - i * 5)
              scene.add(p)
              pillars.push(p)
            }
          }

          // 노트
          interface Note {
            mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
            lane: number
            alive: boolean
            hit: boolean
          }
          const notes: Note[] = []
          const noteGeo = new THREE.BoxGeometry(LANE_W * 0.8, 0.3, 0.6)
          const noteMats = LANE_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.3 }))
          const spawn = (lane: number): void => {
            const mesh = new THREE.Mesh(noteGeo, noteMats[lane]!)
            mesh.position.set(laneX(lane), 0.2, HIT_Z - HIGHWAY_LEN + 6)
            scene.add(mesh)
            notes.push({ mesh, lane, alive: true, hit: false })
          }

          // 파편
          interface Burst {
            pts: THREE.Points
            vel: Float32Array
            t0: number
          }
          const bursts: Burst[] = []
          const BN = 24
          const burst = (x: number, z: number, color: number, t: number): void => {
            const pos = new Float32Array(BN * 3)
            const vel = new Float32Array(BN * 3)
            for (let i = 0; i < BN; i++) {
              pos[i * 3] = x
              pos[i * 3 + 1] = 0.3
              pos[i * 3 + 2] = z
              vel[i * 3] = (Math.random() - 0.5) * 6
              vel[i * 3 + 1] = 2 + Math.random() * 5
              vel[i * 3 + 2] = (Math.random() - 0.5) * 6
            }
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
            const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
            scene.add(pts)
            bursts.push({ pts, vel, t0: t })
          }

          // 3D 판정 스프라이트 (DOM 자막과 별개로 하이웨이 위에 뜸)
          interface Float {
            sprite: THREE.Sprite
            t0: number
          }
          const floats: Float[] = []
          const floatText = (text: string, lane: number, t: number, color: string): void => {
            const s = makeTextSprite(text, 0.8, { size: 72, color, stroke: '#000', strokeWidth: 12, padding: 24 })
            s.position.set(laneX(lane), 0.8, HIT_Z - 1)
            scene.add(s)
            floats.push({ sprite: s, t0: t })
          }

          // 스폰 스케줄 (130 BPM, 8분음표 섞음)
          const schedule: Array<{ at: number; lane: number }> = []
          let beat = 0
          for (let ms = 400; ms < RESULT_AT - 1500; ms += BEAT_MS) {
            schedule.push({ at: ms, lane: Math.floor(r() * LANES) })
            if (beat % 4 === 1 && r() < 0.6) schedule.push({ at: ms + BEAT_MS / 2, lane: Math.floor(r() * LANES) })
            beat++
          }
          let nextSpawn = 0

          const tryTap = (lane: number, t: number): void => {
            pads[lane]!.material.opacity = 1
            let best: Note | null = null
            let bestD = Infinity
            for (const n of notes) {
              if (!n.alive || n.hit || n.lane !== lane) continue
              const d = Math.abs(n.mesh.position.z - HIT_Z)
              if (d < bestD) {
                bestD = d
                best = n
              }
            }
            const hitNote = best !== null && bestD < 1.6
            const early = best !== null && best.mesh.position.z < HIT_Z
            if (hitNote && best) {
              best.hit = true
              best.alive = false
              scene.remove(best.mesh)
              burst(laneX(lane), HIT_Z, LANE_COLORS[lane]!, t)
            }
            onTapRef.current(lane, hitNote, early)
            if (hitNote) floatText(tapCount.current % 3 === 0 ? RHYTHM.judge.miss : RHYTHM.judge.perfect, lane, t, tapCount.current % 3 === 0 ? '#ff4d4d' : LANE_CSS[lane]!)
          }

          const onDown = (e: PointerEvent): void => {
            const rect = renderer.domElement.getBoundingClientRect()
            const nx = (e.clientX - rect.left) / rect.width
            tapQueue.current.push(Math.max(0, Math.min(LANES - 1, Math.floor(nx * LANES))))
          }
          renderer.domElement.style.touchAction = 'none'
          renderer.domElement.addEventListener('pointerdown', onDown)

          return {
            update(dt, t) {
              const ms = t * 1000
              if (!stopped.current) {
                while (nextSpawn < schedule.length && schedule[nextSpawn]!.at <= ms) {
                  spawn(schedule[nextSpawn]!.lane)
                  nextSpawn++
                }
              }
              while (tapQueue.current.length > 0) tryTap(tapQueue.current.shift()!, t)

              for (const n of notes) {
                if (!n.alive) continue
                n.mesh.position.z += NOTE_SPEED * dt
                n.mesh.rotation.y += dt * 2
                if (n.mesh.position.z > HIT_Z + 1.2) {
                  n.alive = false
                  scene.remove(n.mesh)
                  burst(n.mesh.position.x, HIT_Z, 0xff4d4d, t)
                  floatText(RHYTHM.judge.miss, n.lane, t, '#ff4d4d')
                  onMissRef.current(n.lane)
                }
              }

              for (const b of bursts) {
                const age = t - b.t0
                const arr = (b.pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
                for (let i = 0; i < BN; i++) {
                  b.vel[i * 3 + 1] -= 12 * dt
                  arr[i * 3] += b.vel[i * 3]! * dt
                  arr[i * 3 + 1] += b.vel[i * 3 + 1]! * dt
                  arr[i * 3 + 2] += b.vel[i * 3 + 2]! * dt
                }
                ;(b.pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
                ;(b.pts.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - age / 0.7)
                if (age > 0.8) {
                  scene.remove(b.pts)
                  b.pts.geometry.dispose()
                  ;(b.pts.material as THREE.Material).dispose()
                }
              }
              for (let i = bursts.length - 1; i >= 0; i--) if (t - bursts[i]!.t0 > 0.8) bursts.splice(i, 1)

              for (const f of floats) {
                const age = t - f.t0
                f.sprite.position.y = 0.8 + age * 2
                ;(f.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - age / 0.7)
                if (age > 0.75) {
                  scene.remove(f.sprite)
                  ;(f.sprite.material as THREE.SpriteMaterial).map?.dispose()
                  f.sprite.material.dispose()
                }
              }
              for (let i = floats.length - 1; i >= 0; i--) if (t - floats[i]!.t0 > 0.75) floats.splice(i, 1)

              for (const p of pads) p.material.opacity += (0.35 - p.material.opacity) * Math.min(1, dt * 10)
              hitLineMat.opacity = 0.7 + Math.sin(t * 14) * 0.25
              pillars.forEach((p, i) => {
                p.scale.y = 1 + Math.abs(Math.sin(t * 8.7 + i * 0.7)) * 0.8
              })
              stars.rotation.z = t * 0.03
              key.intensity = 30 + Math.sin(t * 8.7) * 12
              camera.position.x = Math.sin(t * 0.7) * 0.4
              camera.position.y = 4.2 + Math.sin(t * 1.1) * 0.15
              camera.lookAt(0, 0, -6)
            },
            dispose() {
              renderer.domElement.removeEventListener('pointerdown', onDown)
              noteGeo.dispose()
              noteMats.forEach((m) => m.dispose())
              sGeo.dispose()
            },
          }
        }}
      />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-1">
        <div className="rounded-full bg-black/60 px-4 py-1 text-sm font-black tracking-wide text-pink-200">{title}</div>
        <div className="text-xs opacity-70">노트를 치세요 (판정 조작됨)</div>
      </div>
      <div className="pointer-events-none absolute top-16 right-4 z-10 text-right font-mono text-xs leading-5 opacity-90">
        <div>SCORE {String(score).padStart(6, '0')}</div>
        <div>정확도 {accuracy}%</div>
        <div className="text-yellow-300">
          COMBO <span className="text-base font-black">{combo}</span>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <AnimatePresence>
          {judgements.map((j) => (
            <motion.div
              key={j.id}
              className="meme-caption absolute"
              style={{ left: `${12 + j.lane * 25}%`, top: '48%', fontSize: j.bad ? '2rem' : '1.6rem', color: j.bad ? '#ff5c5c' : LANE_CSS[j.lane] }}
              initial={{ scale: 0, opacity: 0, y: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: 1, y: -30 }}
              exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.3 }}
            >
              {j.text}
            </motion.div>
          ))}
          {comboLine && (
            <motion.div key={`combo-${comboLine}`} className="meme-caption absolute inset-x-0 top-[30%] text-center text-3xl" initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} exit={{ opacity: 0 }}>
              {comboLine}
            </motion.div>
          )}
          {taunt && (
            <motion.div key={`taunt-${taunt}`} className="absolute inset-x-6 top-[22%] rounded-xl bg-black/70 px-4 py-2 text-center text-base font-bold text-pink-200" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {taunt}
            </motion.div>
          )}
          {result && (
            <motion.div
              key="result"
              className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2"
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: [0, 1.3, 1], rotate: [-8, 3, -2] }}
              transition={{ duration: 0.5 }}
            >
              <div className="meme-caption text-7xl" style={{ color: '#ff5c5c' }}>
                F
              </div>
              <div className="meme-caption text-xl" style={{ whiteSpace: 'normal' }}>
                {result}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 레인 버튼 */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex h-24">
        {Array.from({ length: LANES }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`레인 ${i + 1}`}
            className="flex-1 select-none border-t-4 transition"
            style={{
              borderColor: LANE_CSS[i],
              background: flash === i ? `${LANE_CSS[i]}66` : 'rgba(0,0,0,0.35)',
              touchAction: 'manipulation',
            }}
            onPointerDown={() => tapQueue.current.push(i)}
          >
            <span className="text-2xl opacity-70" style={{ color: LANE_CSS[i] }}>
              ●
            </span>
          </button>
        ))}
      </div>
    </SceneFrame>
  )
}
