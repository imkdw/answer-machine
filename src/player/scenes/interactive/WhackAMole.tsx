import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextSprite } from '../../../three/textTexture'
import { MOLE } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 8500
const END_AT = 7300
const GRID = 3
const GAP = 2.6
const UP_Y = 0.9
const DOWN_Y = -1.3

interface Caption {
  id: number
  text: string
  x: number
  y: number
  color: string
}

/** 두더지가 된 답변. 때리면 피하고, 맞아도 0마리. */
export default function WhackAMole({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(MOLE.title, rng), [rng])
  const hint = useMemo(() => pick(MOLE.hint, rng), [rng])
  const [captions, setCaptions] = useState<Caption[]>([])
  const [taps, setTaps] = useState(0)
  const [counterShake, setCounterShake] = useState(false)
  const [end, setEnd] = useState<string | null>(null)
  const doneRef = useRef(false)
  const seq = useRef(0)
  const ended = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const timersRef = useRef<number[]>([])

  const later = (fn: () => void, ms: number): void => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => {
    const timers = timersRef.current
    timers.push(
      window.setTimeout(() => {
        ended.current = true
        setEnd(pick(MOLE.end, rng))
        audioRef.current.sfx('tada')
      }, END_AT),
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

  const caption = (text: string, x: number, y: number, color = '#fff200'): void => {
    const id = ++seq.current
    setCaptions((prev) => [...prev.slice(-4), { id, text, x, y, color }])
    later(() => setCaptions((prev) => prev.filter((c) => c.id !== id)), 900)
  }
  const captionRef = useRef(caption)
  captionRef.current = caption

  const onTapRef = useRef((hit: boolean, x: number, y: number) => {
    setTaps((n) => n + 1)
    if (hit) {
      captionRef.current(pick(MOLE.hit), x, y, '#ff6a3c')
      audioRef.current.sfx('bang')
    } else {
      captionRef.current(pick(MOLE.dodge), x, y)
      audioRef.current.sfx('whoosh')
    }
    // 카운터는 흔들리기만 하고 절대 안 오름
    setCounterShake(true)
    later(() => setCounterShake(false), 400)
  })

  return (
    <SceneFrame style={{ background: 'linear-gradient(180deg, #7fd8ff 0%, #bfefff 55%, #58c25a 56%, #2f8f3a 100%)', color: '#123' }}>
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, renderer, rng: r }) => {
          camera.position.set(0, 8.5, 9)
          camera.lookAt(0, 0, -0.5)
          scene.fog = new THREE.Fog(0xbfefff, 20, 40)
          scene.add(new THREE.HemisphereLight(0xffffff, 0x3a8f3a, 1.1))
          const sun = new THREE.DirectionalLight(0xfff4c0, 2)
          sun.position.set(4, 10, 5)
          scene.add(sun)

          // 잔디밭
          const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({ color: 0x4fb84f, roughness: 1 }))
          ground.rotation.x = -Math.PI / 2
          ground.position.y = -0.01
          scene.add(ground)

          // 잔디 (작은 삼각뿔들)
          const grassMat = new THREE.MeshStandardMaterial({ color: 0x6fd35f, roughness: 1, flatShading: true })
          const grassGeo = new THREE.ConeGeometry(0.08, 0.5, 3)
          const grass = new THREE.InstancedMesh(grassGeo, grassMat, 500)
          const m4 = new THREE.Matrix4()
          const pos = new THREE.Vector3()
          const quat = new THREE.Quaternion()
          const scl = new THREE.Vector3()
          for (let i = 0; i < 500; i++) {
            const a = r() * Math.PI * 2
            const d = 5 + r() * 8
            pos.set(Math.cos(a) * d, 0.2, Math.sin(a) * d)
            quat.setFromEuler(new THREE.Euler(0, r() * Math.PI, (r() - 0.5) * 0.4))
            scl.setScalar(0.6 + r() * 1.2)
            m4.compose(pos, quat, scl)
            grass.setMatrixAt(i, m4)
          }
          scene.add(grass)

          // 구멍 9개
          const holes: THREE.Vector3[] = []
          const holeMat = new THREE.MeshStandardMaterial({ color: 0x2b1a0e, roughness: 1 })
          const rimMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1, flatShading: true })
          for (let i = 0; i < GRID; i++) {
            for (let j = 0; j < GRID; j++) {
              const x = (i - 1) * GAP
              const z = (j - 1) * GAP - 0.5
              const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 24), holeMat)
              hole.position.set(x, -0.8, z)
              scene.add(hole)
              const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.18, 8, 24), rimMat)
              rim.rotation.x = Math.PI / 2
              rim.position.set(x, 0.05, z)
              scene.add(rim)
              holes.push(new THREE.Vector3(x, 0, z))
            }
          }

          // 두더지
          const mole = new THREE.Group()
          const brown = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 })
          const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 0.7, 6, 16), brown)
          body.position.y = 0.6
          mole.add(body)
          const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd9b48a, roughness: 1 }))
          belly.position.set(0, 0.45, 0.4)
          belly.scale.set(1, 1.2, 0.5)
          mole.add(belly)
          for (const s of [-1, 1]) {
            const ear = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), brown)
            ear.position.set(s * 0.45, 1.25, 0)
            mole.add(ear)
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x111111 }))
            eye.position.set(s * 0.22, 1.0, 0.55)
            mole.add(eye)
          }
          const nose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff6a8a }))
          nose.position.set(0, 0.85, 0.66)
          mole.add(nose)
          const label = makeTextSprite('답변', 0.55, { size: 72, color: '#ffffff', stroke: '#c0392b', strokeWidth: 14, padding: 20 })
          label.position.set(0, 0.55, 0.75)
          mole.add(label)
          const badge = makeTextSprite('ㅋ', 0.4, { size: 64, color: '#fff200', stroke: '#000', strokeWidth: 10, padding: 16 })
          badge.position.set(0.7, 1.5, 0.2)
          badge.visible = false
          mole.add(badge)
          // 클리핑용: 구멍 아래는 안 보이게 (바닥보다 낮은 부분은 흙 원판으로 가림)
          mole.position.set(holes[4]!.x, DOWN_Y, holes[4]!.z)
          scene.add(mole)
          const lids: THREE.Mesh[] = []
          for (const h of holes) {
            const lid = new THREE.Mesh(new THREE.CircleGeometry(0.88, 24), new THREE.MeshBasicMaterial({ color: 0x1a0f07 }))
            lid.rotation.x = -Math.PI / 2
            lid.position.set(h.x, -0.02, h.z)
            scene.add(lid)
            lids.push(lid)
          }

          // 망치
          const hammer = new THREE.Group()
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 10), new THREE.MeshStandardMaterial({ color: 0xc9a06a }))
          handle.position.y = 1.1
          hammer.add(handle)
          const head = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 16), new THREE.MeshStandardMaterial({ color: 0xff2d95, roughness: 0.4 }))
          head.rotation.z = Math.PI / 2
          head.position.y = 2.2
          hammer.add(head)
          hammer.position.set(3.5, 0.8, 3)
          hammer.rotation.z = -0.5
          scene.add(hammer)
          let hammerTarget = new THREE.Vector3(3.5, 0.8, 3)
          let swingT = -10

          // 흙 파편
          interface Puff {
            pts: THREE.Points
            vel: Float32Array
            t0: number
          }
          const puffs: Puff[] = []
          const PN = 30
          const puff = (at: THREE.Vector3, t: number, color = 0x7a4a1e): void => {
            const p = new Float32Array(PN * 3)
            const v = new Float32Array(PN * 3)
            for (let i = 0; i < PN; i++) {
              p[i * 3] = at.x
              p[i * 3 + 1] = 0.1
              p[i * 3 + 2] = at.z
              v[i * 3] = (Math.random() - 0.5) * 4
              v[i * 3 + 1] = 2 + Math.random() * 4
              v[i * 3 + 2] = (Math.random() - 0.5) * 4
            }
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.BufferAttribute(p, 3))
            const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.14, transparent: true, depthWrite: false }))
            scene.add(pts)
            puffs.push({ pts, vel: v, t0: t })
          }

          // 상태머신
          let holeIdx = 4
          let phase: 'down' | 'rising' | 'up' | 'ducking' | 'squash' = 'down'
          let phaseT = 0
          let nextPopAt = 0.6
          let upUntil = 0
          let tapCount = 0
          let squashK = 0

          const raycaster = new THREE.Raycaster()
          const ndc = new THREE.Vector2()
          const toScreen = (v: THREE.Vector3): { x: number; y: number } => {
            const p = v.clone().project(camera)
            return { x: (p.x + 1) * 50, y: (1 - p.y) * 50 }
          }

          const onDown = (e: PointerEvent): void => {
            if (ended.current) return
            const rect = renderer.domElement.getBoundingClientRect()
            ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1))
            raycaster.setFromCamera(ndc, camera)
            // 망치를 바닥 교점으로
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
            const hitPt = new THREE.Vector3()
            if (raycaster.ray.intersectPlane(plane, hitPt)) {
              hammerTarget = hitPt.clone().add(new THREE.Vector3(0.6, 0.4, 0.6))
            }
            swingT = 0
            const hits = raycaster.intersectObject(mole, true)
            const onMole = hits.length > 0 && (phase === 'up' || phase === 'rising')
            const sc = toScreen(mole.position.clone().setY(1.2))
            if (!onMole) {
              // 헛스윙
              puff(hitPt, 0, 0x6fd35f)
              return
            }
            tapCount++
            const allowHit = tapCount % 4 === 0
            if (allowHit) {
              phase = 'squash'
              phaseT = 0
              squashK = 0
              onTapRef.current(true, sc.x, sc.y)
            } else {
              phase = 'ducking'
              phaseT = 0
              badge.visible = true
              onTapRef.current(false, sc.x, sc.y)
            }
          }
          renderer.domElement.style.touchAction = 'none'
          renderer.domElement.addEventListener('pointerdown', onDown)

          return {
            update(dt, t) {
              phaseT += dt
              if (phase === 'down') {
                mole.position.y = DOWN_Y
                if (t >= nextPopAt && !ended.current) {
                  holeIdx = Math.floor(Math.random() * holes.length)
                  const nh = holes[holeIdx]!
                  mole.position.set(nh.x, DOWN_Y, nh.z)
                  mole.rotation.y = (Math.random() - 0.5) * 0.6
                  badge.visible = false
                  mole.scale.set(1, 1, 1)
                  phase = 'rising'
                  phaseT = 0
                  upUntil = t + 0.9 + Math.random() * 0.8
                  puff(nh, t)
                  audioRef.current.sfx('pop')
                }
              } else if (phase === 'rising') {
                const k = Math.min(1, phaseT / 0.18)
                mole.position.y = DOWN_Y + (UP_Y - DOWN_Y) * (1 - Math.pow(1 - k, 3))
                if (k >= 1) phase = 'up'
              } else if (phase === 'up') {
                mole.position.y = UP_Y + Math.sin(t * 9) * 0.06
                mole.rotation.z = Math.sin(t * 7) * 0.12
                if (t >= upUntil) {
                  // 자동으로 약올리고 내려감
                  badge.visible = true
                  phase = 'ducking'
                  phaseT = 0
                  const sc = toScreen(mole.position.clone().setY(1.2))
                  if (Math.random() < 0.5) captionRef.current(pick(MOLE.dodge), sc.x, sc.y)
                }
              } else if (phase === 'ducking') {
                const k = Math.min(1, phaseT / 0.12)
                mole.position.y = UP_Y + (DOWN_Y - UP_Y) * k
                if (k >= 1) {
                  phase = 'down'
                  nextPopAt = t + 0.3 + Math.random() * 0.5
                }
              } else if (phase === 'squash') {
                squashK = Math.min(1, phaseT / 0.25)
                mole.scale.set(1 + squashK * 0.6, 1 - squashK * 0.7, 1 + squashK * 0.6)
                mole.position.y = UP_Y - squashK * 0.5
                if (phaseT > 0.6) {
                  phase = 'ducking'
                  phaseT = 0
                }
              }
              // 두더지가 있는 구멍 뚜껑만 열기
              lids.forEach((l, i) => {
                l.visible = i !== holeIdx || phase === 'down'
              })

              // 망치
              hammer.position.lerp(hammerTarget, Math.min(1, dt * 14))
              if (swingT >= 0) {
                swingT += dt
                const s = swingT < 0.12 ? swingT / 0.12 : Math.max(0, 1 - (swingT - 0.12) / 0.25)
                hammer.rotation.z = -0.5 - s * 1.4
                hammer.rotation.x = s * 0.6
                if (swingT > 0.5) swingT = -10
              } else {
                hammer.rotation.z += (-0.5 - hammer.rotation.z) * dt * 6
                hammer.rotation.x += (0 - hammer.rotation.x) * dt * 6
                hammer.position.y = 0.8 + Math.sin(t * 2) * 0.1
              }

              for (const p of puffs) {
                const age = t - p.t0
                const arr = (p.pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
                for (let i = 0; i < PN; i++) {
                  p.vel[i * 3 + 1] -= 10 * dt
                  arr[i * 3] += p.vel[i * 3]! * dt
                  arr[i * 3 + 1] = Math.max(0, arr[i * 3 + 1]! + p.vel[i * 3 + 1]! * dt)
                  arr[i * 3 + 2] += p.vel[i * 3 + 2]! * dt
                }
                ;(p.pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
                ;(p.pts.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - age / 0.8)
                if (age > 0.85) {
                  scene.remove(p.pts)
                  p.pts.geometry.dispose()
                  ;(p.pts.material as THREE.Material).dispose()
                }
              }
              for (let i = puffs.length - 1; i >= 0; i--) if (t - puffs[i]!.t0 > 0.85) puffs.splice(i, 1)

              camera.position.x = Math.sin(t * 0.4) * 0.8
              camera.position.z = 9 + Math.cos(t * 0.3) * 0.4
              camera.lookAt(0, 0.3, -0.5)
            },
            dispose() {
              renderer.domElement.removeEventListener('pointerdown', onDown)
              grassGeo.dispose()
              grassMat.dispose()
              holeMat.dispose()
              rimMat.dispose()
              brown.dispose()
              ;(label.material as THREE.SpriteMaterial).map?.dispose()
              ;(badge.material as THREE.SpriteMaterial).map?.dispose()
            },
          }
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-1">
        <div className="rounded-full border-2 border-white bg-green-700/90 px-4 py-1 text-sm font-black text-white shadow">{title}</div>
        <div className="text-xs font-bold text-green-900/80">{hint}</div>
      </div>

      <div className={`pointer-events-none absolute top-16 right-4 z-10 rounded-xl bg-white/90 px-3 py-2 text-right shadow ${counterShake ? 'shake' : ''}`}>
        <div className="text-[10px] font-bold text-gray-500">잡은 답변</div>
        <div className="text-2xl font-black text-red-600">0마리</div>
        <div className="text-[10px] text-gray-500">헛스윙 {taps}회</div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <AnimatePresence>
          {captions.map((c) => (
            <motion.div
              key={c.id}
              className="meme-caption absolute -translate-x-1/2 text-2xl"
              style={{ left: `${c.x}%`, top: `${c.y}%`, color: c.color }}
              initial={{ scale: 0, opacity: 0, rotate: -10 }}
              animate={{ scale: [0, 1.3, 1], opacity: 1, rotate: 4, y: -30 }}
              exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.3 }}
            >
              {c.text}
            </motion.div>
          ))}
          {end && (
            <motion.div
              key="end"
              className="meme-caption absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-4xl"
              style={{ whiteSpace: 'normal' }}
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: [0, 1.3, 1], rotate: [-8, 3, -2] }}
              transition={{ duration: 0.5 }}
            >
              {end}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
