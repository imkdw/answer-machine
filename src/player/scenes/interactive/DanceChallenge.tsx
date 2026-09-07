import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextSprite } from '../../../three/textTexture'
import { DANCE } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 9000
const END_AT = 7800
const BPM = 128
const BEAT = 60 / BPM
const MAX_DANCERS = 12
const START_DANCERS = 3
const HYPE_TIMES = [1800, 3600, 5400]

type StyleKey = (typeof DANCE.styles)[number]['key']

interface Dancer {
  root: THREE.Group
  body: THREE.Group
  head: THREE.Mesh
  lShoulder: THREE.Group
  rShoulder: THREE.Group
  lElbow: THREE.Group
  rElbow: THREE.Group
  lHip: THREE.Group
  rHip: THREE.Group
  lKnee: THREE.Group
  rKnee: THREE.Group
  phase: number
  baseX: number
  baseZ: number
  spawnT: number
}

const PALETTE = [0xff2d95, 0x2dffea, 0xffd54a, 0x7c4dff, 0xff8a3c, 0x4fff7a, 0xff4f4f, 0x4fa8ff]

function buildDancer(color: number, skin: number): Dancer {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)

  const shirt = new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true })
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7, flatShading: true })
  const pants = new THREE.MeshStandardMaterial({ color: 0x23233a, roughness: 0.8, flatShading: true })

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), shirt)
  torso.position.y = 1.35
  body.add(torso)

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat)
  head.position.y = 2.1
  body.add(head)

  // 팔: 어깨 피벗 -> 윗팔 -> 팔꿈치 피벗 -> 아랫팔
  const makeArm = (side: number): [THREE.Group, THREE.Group] => {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.45, 1.72, 0)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.22), shirt)
    upper.position.y = -0.22
    shoulder.add(upper)
    const elbow = new THREE.Group()
    elbow.position.y = -0.45
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), skinMat)
    lower.position.y = -0.22
    elbow.add(lower)
    shoulder.add(elbow)
    body.add(shoulder)
    return [shoulder, elbow]
  }
  const [lShoulder, lElbow] = makeArm(-1)
  const [rShoulder, rElbow] = makeArm(1)

  const makeLeg = (side: number): [THREE.Group, THREE.Group] => {
    const hip = new THREE.Group()
    hip.position.set(side * 0.2, 0.9, 0)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.45, 0.26), pants)
    upper.position.y = -0.22
    hip.add(upper)
    const knee = new THREE.Group()
    knee.position.y = -0.45
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.24), pants)
    lower.position.y = -0.22
    knee.add(lower)
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }))
    shoe.position.set(0, -0.48, 0.06)
    knee.add(shoe)
    hip.add(knee)
    body.add(hip)
    return [hip, knee]
  }
  const [lHip, lKnee] = makeLeg(-1)
  const [rHip, rKnee] = makeLeg(1)

  return { root, body, head, lShoulder, rShoulder, lElbow, rElbow, lHip, rHip, lKnee, rKnee, phase: 0, baseX: 0, baseZ: 0, spawnT: 0 }
}

/** 안무. b = 박자 (1당 한 박), 팔다리 회전 각도 세팅 */
function choreo(style: StyleKey, d: Dancer, b: number): void {
  const s = Math.sin(b * Math.PI)
  const c = Math.cos(b * Math.PI)
  const beat = Math.abs(Math.sin(b * Math.PI))
  const bounce = beat * 0.12
  let y = 0
  d.body.rotation.set(0, 0, 0)
  d.head.rotation.set(0, 0, 0)
  d.lElbow.rotation.set(0, 0, 0)
  d.rElbow.rotation.set(0, 0, 0)
  d.lKnee.rotation.set(0, 0, 0)
  d.rKnee.rotation.set(0, 0, 0)
  switch (style) {
    case 'tree': {
      // 팔 위로 쭉, 나무처럼 흔들
      const sway = Math.sin(b * Math.PI * 0.5) * 0.35
      d.lShoulder.rotation.set(0, 0, Math.PI - 0.3 + sway)
      d.rShoulder.rotation.set(0, 0, -Math.PI + 0.3 + sway)
      d.lElbow.rotation.z = -0.5 + sway * 0.6
      d.rElbow.rotation.z = 0.5 + sway * 0.6
      d.body.rotation.z = sway * 0.35
      d.lHip.rotation.set(0, 0, 0.08)
      d.rHip.rotation.set(0, 0, -0.08)
      d.head.rotation.z = -sway * 0.5
      y = bounce * 0.4
      break
    }
    case 'ppikki': {
      // 주먹 펌프 + 팔 웨이브, 무릎 바운스
      const pump = Math.max(0, s)
      const wave = Math.sin(b * Math.PI * 2)
      d.rShoulder.rotation.set(-Math.PI * 0.5 - pump * 1.2, 0, 0.3)
      d.rElbow.rotation.x = -1.4 + pump * 0.6
      d.lShoulder.rotation.set(-0.4, 0, 1.2 + wave * 0.5)
      d.lElbow.rotation.z = -0.8 - wave * 0.6
      d.lHip.rotation.x = -0.25 * beat
      d.rHip.rotation.x = -0.25 * beat
      d.lKnee.rotation.x = 0.5 * beat
      d.rKnee.rotation.x = 0.5 * beat
      d.body.rotation.y = wave * 0.2
      d.head.rotation.y = wave * 0.3
      y = -beat * 0.15
      break
    }
    case 'apt': {
      // 점프, 팔 번갈아 위로
      const jump = Math.max(0, Math.sin(b * Math.PI * 2))
      const alt = Math.floor(b) % 2 === 0 ? 1 : -1
      d.lShoulder.rotation.set(alt > 0 ? -Math.PI * 0.95 : -0.6, 0, alt > 0 ? 0.25 : 0.7)
      d.rShoulder.rotation.set(alt < 0 ? -Math.PI * 0.95 : -0.6, 0, alt < 0 ? -0.25 : -0.7)
      d.lElbow.rotation.x = alt > 0 ? -0.3 : -1.0
      d.rElbow.rotation.x = alt < 0 ? -0.3 : -1.0
      d.lHip.rotation.x = -jump * 0.6
      d.rHip.rotation.x = -jump * 0.6
      d.lKnee.rotation.x = jump * 1.2
      d.rKnee.rotation.x = jump * 1.2
      d.body.rotation.z = alt * 0.08
      y = jump * 0.7
      break
    }
    case 'yoonjung': {
      // 머리 좌우 틸트 콜앤리스폰스 + 팔 포인팅
      const half = Math.floor(b / 2) % 2 === 0 ? 1 : -1
      const tilt = half * (0.35 + beat * 0.15)
      d.head.rotation.z = tilt
      d.body.rotation.z = tilt * 0.25
      if (half > 0) {
        d.rShoulder.rotation.set(-Math.PI * 0.5, 0, -1.1)
        d.rElbow.rotation.z = 0.3
        d.lShoulder.rotation.set(0.1, 0, 0.35)
        d.lElbow.rotation.z = -0.3
      } else {
        d.lShoulder.rotation.set(-Math.PI * 0.5, 0, 1.1)
        d.lElbow.rotation.z = -0.3
        d.rShoulder.rotation.set(0.1, 0, -0.35)
        d.rElbow.rotation.z = 0.3
      }
      d.lHip.rotation.x = -0.15 * beat
      d.rHip.rotation.x = -0.15 * beat
      d.lKnee.rotation.x = 0.3 * beat
      d.rKnee.rotation.x = 0.3 * beat
      y = -beat * 0.08
      break
    }
    case 'yaho': {
      // 점프 + 브이 팔
      const jump = Math.max(0, Math.sin(b * Math.PI))
      d.lShoulder.rotation.set(-Math.PI * 0.75, 0, 0.9)
      d.rShoulder.rotation.set(-Math.PI * 0.75, 0, -0.9)
      d.lElbow.rotation.z = -0.5 + jump * 0.4
      d.rElbow.rotation.z = 0.5 - jump * 0.4
      d.lHip.rotation.x = -jump * 0.7
      d.rHip.rotation.x = -jump * 0.7
      d.lKnee.rotation.x = jump * 1.4
      d.rKnee.rotation.x = jump * 1.4
      d.head.rotation.x = -jump * 0.3
      d.body.rotation.y = Math.sin(b * Math.PI * 0.5) * 0.3
      y = jump * 0.9
      break
    }
    case 'jabeth': {
      // 난리. 팔다리 마구
      const f = b * Math.PI * 3
      d.lShoulder.rotation.set(Math.sin(f) * 1.6 - 1.2, Math.cos(f * 0.7) * 0.5, 0.6 + Math.sin(f * 1.3) * 0.8)
      d.rShoulder.rotation.set(Math.cos(f) * 1.6 - 1.2, Math.sin(f * 0.7) * 0.5, -0.6 + Math.cos(f * 1.3) * 0.8)
      d.lElbow.rotation.x = -Math.abs(Math.sin(f * 1.7)) * 1.5
      d.rElbow.rotation.x = -Math.abs(Math.cos(f * 1.7)) * 1.5
      d.lHip.rotation.x = Math.sin(f) * 0.6
      d.rHip.rotation.x = -Math.sin(f) * 0.6
      d.lKnee.rotation.x = Math.abs(Math.cos(f)) * 0.9
      d.rKnee.rotation.x = Math.abs(Math.sin(f)) * 0.9
      d.head.rotation.set(Math.sin(f * 2) * 0.3, Math.cos(f) * 0.6, Math.sin(f * 1.5) * 0.4)
      d.body.rotation.set(0, Math.sin(f * 0.5) * 0.5, Math.cos(f * 0.9) * 0.2)
      y = Math.abs(Math.sin(f)) * 0.3
      break
    }
  }
  void c
  d.root.position.y = y
}

/** 챌린지 춤. 블록 캐릭터들이 무대에서 챌린지를 춘다. 탭하면 댄서 추가. */
export default function DanceChallenge({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const style = useMemo(() => pick(DANCE.styles, rng), [rng])
  const title = useMemo(() => pick(DANCE.title, rng), [rng])
  const endLine = useMemo(() => pick(DANCE.end, rng), [rng])
  const hashtags = useMemo(() => {
    const arr = [...DANCE.hashtags]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      const t = arr[i]!
      arr[i] = arr[j]!
      arr[j] = t
    }
    return [style.tag, ...arr.slice(0, 3)]
  }, [rng, style])

  const [dancers, setDancers] = useState(START_DANCERS)
  const [views, setViews] = useState(() => 120000 + Math.floor(rng() * 800000))
  const [caption, setCaption] = useState<{ id: number; text: string; big?: boolean } | null>(null)
  const [ended, setEnded] = useState(false)
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const capSeq = useRef(0)
  /** update()가 소비하는 참여 큐 */
  const joinQueue = useRef(0)
  const dancerCountRef = useRef(START_DANCERS)

  const showCaption = (text: string, big = false): void => {
    const id = ++capSeq.current
    setCaption({ id, text, big })
    window.setTimeout(() => setCaption((c) => (c?.id === id ? null : c)), big ? 2200 : 1100)
  }
  const showCaptionRef = useRef(showCaption)
  showCaptionRef.current = showCaption

  const join = (): void => {
    if (dancerCountRef.current >= MAX_DANCERS) {
      showCaptionRef.current('무대 꽉 참')
      audioRef.current.sfx('boo')
      return
    }
    dancerCountRef.current++
    joinQueue.current++
    setDancers(dancerCountRef.current)
    setViews((v) => v + 10000 + Math.floor(Math.random() * 50000))
    audioRef.current.sfx('pop')
    showCaptionRef.current(pick(DANCE.join))
  }
  const joinRef = useRef(join)
  joinRef.current = join

  useEffect(() => {
    const timers: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timers.push(window.setTimeout(fn, ms))
    }
    for (const t of HYPE_TIMES) later(() => showCaptionRef.current(pick(DANCE.hype)), t)
    later(() => {
      setEnded(true)
      audioRef.current.sfx('tada')
    }, END_AT)
    // 조회수 틱
    const tick = window.setInterval(() => setViews((v) => v + 137 + Math.floor(Math.random() * 900)), 250)
    later(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      window.clearInterval(tick)
    }
  }, [onDone])

  return (
    <SceneFrame style={{ background: 'radial-gradient(circle at 50% 20%, #2a0f4d 0%, #0b0716 70%)', color: '#fff' }}>
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, renderer, rng: r }) => {
          camera.position.set(0, 4.2, 12)
          camera.lookAt(0, 1.4, 0)
          scene.fog = new THREE.Fog(0x0b0716, 16, 40)
          scene.add(new THREE.AmbientLight(0x8877cc, 0.55))

          // 무대 바닥: 디스코 타일
          const TILES = 10
          const TILE = 1.2
          const tileGeo = new THREE.BoxGeometry(TILE * 0.94, 0.15, TILE * 0.94)
          const tileMats: THREE.MeshStandardMaterial[] = []
          const tiles: THREE.Mesh[] = []
          for (let i = 0; i < TILES; i++) {
            for (let j = 0; j < TILES; j++) {
              const m = new THREE.MeshStandardMaterial({ color: 0x111122, emissive: PALETTE[(i + j) % PALETTE.length]!, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.4 })
              const mesh = new THREE.Mesh(tileGeo, m)
              mesh.position.set((i - TILES / 2 + 0.5) * TILE, -0.08, (j - TILES / 2 + 0.5) * TILE)
              scene.add(mesh)
              tileMats.push(m)
              tiles.push(mesh)
            }
          }
          const stageBase = new THREE.Mesh(new THREE.BoxGeometry(TILES * TILE + 1, 0.6, TILES * TILE + 1), new THREE.MeshStandardMaterial({ color: 0x1a1030, roughness: 0.9 }))
          stageBase.position.y = -0.45
          scene.add(stageBase)

          // 조명
          const lights: Array<{ light: THREE.SpotLight; cone: THREE.Mesh; phase: number }> = []
          const coneGeo = new THREE.ConeGeometry(2.4, 9, 24, 1, true)
          for (let i = 0; i < 3; i++) {
            const color = PALETTE[i * 2]!
            const light = new THREE.SpotLight(color, 60, 30, Math.PI / 7, 0.5, 1.2)
            light.position.set((i - 1) * 5, 9, 2)
            light.target.position.set(0, 0, 0)
            scene.add(light)
            scene.add(light.target)
            const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }))
            cone.position.copy(light.position)
            scene.add(cone)
            lights.push({ light, cone, phase: i * 2.1 })
          }
          const key = new THREE.DirectionalLight(0xffffff, 1.2)
          key.position.set(3, 8, 6)
          scene.add(key)

          // 반짝이 파티클
          const PN = 300
          const pPos = new Float32Array(PN * 3)
          const pCol = new Float32Array(PN * 3)
          const pVel = new Float32Array(PN)
          const col = new THREE.Color()
          for (let i = 0; i < PN; i++) {
            pPos[i * 3] = (r() - 0.5) * 16
            pPos[i * 3 + 1] = r() * 10
            pPos[i * 3 + 2] = (r() - 0.5) * 12
            col.setHex(PALETTE[Math.floor(r() * PALETTE.length)]!)
            pCol[i * 3] = col.r
            pCol[i * 3 + 1] = col.g
            pCol[i * 3 + 2] = col.b
            pVel[i] = 0.6 + r() * 1.4
          }
          const pGeo = new THREE.BufferGeometry()
          pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
          pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3))
          const pMat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
          scene.add(new THREE.Points(pGeo, pMat))

          // 댄서
          const dancersArr: Dancer[] = []
          const slotPos = (idx: number): [number, number] => {
            // 0,1,2는 앞줄 가운데. 이후는 뒤/옆으로 채움
            const layout: Array<[number, number]> = [
              [0, 0],
              [-2.2, 0],
              [2.2, 0],
              [-1.1, -2.2],
              [1.1, -2.2],
              [-3.3, -2.2],
              [3.3, -2.2],
              [0, -4.2],
              [-2.2, -4.2],
              [2.2, -4.2],
              [-4.4, -4.2],
              [4.4, -4.2],
            ]
            return layout[idx] ?? [(r() - 0.5) * 8, -4]
          }
          const spawn = (idx: number, t: number): void => {
            const d = buildDancer(PALETTE[Math.floor(r() * PALETTE.length)]!, [0xffcc99, 0xf1c27d, 0xe0ac69, 0xc68642][Math.floor(r() * 4)]!)
            const [x, z] = slotPos(idx)
            d.baseX = x
            d.baseZ = z
            d.phase = idx === 0 ? 0 : r() * 0.25
            d.spawnT = t
            d.root.position.set(x, 0, z)
            scene.add(d.root)
            dancersArr.push(d)
            if (idx === 0) {
              const label = makeTextSprite('답변', 0.8, { size: 96, color: '#fff200', stroke: '#000', strokeWidth: 14, padding: 30 })
              label.position.set(0, 2.9, 0)
              d.root.add(label)
            }
          }
          for (let i = 0; i < START_DANCERS; i++) spawn(i, -1)

          const onPointer = (): void => joinRef.current()
          renderer.domElement.style.touchAction = 'none'
          renderer.domElement.addEventListener('pointerdown', onPointer)

          return {
            update(_dt, t) {
              const b = t / BEAT
              while (joinQueue.current > 0) {
                joinQueue.current--
                spawn(dancersArr.length, t)
              }
              for (const d of dancersArr) {
                choreo(style.key, d, b + d.phase)
                const age = t - d.spawnT
                const sc = d.spawnT < 0 ? 1 : Math.min(1, age * 2.5)
                const pop = sc < 1 ? 1 + Math.sin(sc * Math.PI) * 0.4 : 1
                d.root.scale.setScalar(sc * pop)
                d.root.position.x = d.baseX
                d.root.position.z = d.baseZ
              }
              // 타일 비트
              const beatIdx = Math.floor(b)
              const flash = 1 - (b - beatIdx)
              for (let i = 0; i < tileMats.length; i++) {
                const m = tileMats[i]!
                const tx = i % TILES
                const tz = Math.floor(i / TILES)
                const on = (tx + tz + beatIdx) % 3 === 0
                m.emissive.setHex(PALETTE[(tx + tz + beatIdx) % PALETTE.length]!)
                m.emissiveIntensity = on ? 0.5 + flash * 1.2 : 0.15
              }
              for (const l of lights) {
                const a = t * 0.9 + l.phase
                l.light.target.position.set(Math.sin(a) * 4, 0, Math.cos(a * 0.7) * 3)
                l.light.intensity = 40 + flash * 40
                l.cone.lookAt(l.light.target.position)
                l.cone.rotateX(Math.PI / 2)
                ;(l.cone.material as THREE.MeshBasicMaterial).opacity = 0.05 + flash * 0.07
              }
              const arr = pGeo.attributes.position as THREE.BufferAttribute
              const pa = arr.array as Float32Array
              for (let i = 0; i < PN; i++) {
                pa[i * 3 + 1] -= pVel[i]! * _dt
                pa[i * 3] += Math.sin(t * 2 + i) * 0.01
                if (pa[i * 3 + 1]! < 0) pa[i * 3 + 1] = 10
              }
              arr.needsUpdate = true
              pMat.size = 0.13 + flash * 0.08

              const ca = t * 0.22
              camera.position.set(Math.sin(ca) * 6, 3.6 + Math.sin(t * 0.7) * 0.5 + flash * 0.1, 11 + Math.cos(ca) * 2.5)
              camera.lookAt(0, 1.3, -1)
            },
            dispose() {
              renderer.domElement.removeEventListener('pointerdown', onPointer)
              tileGeo.dispose()
              tileMats.forEach((m) => m.dispose())
              coneGeo.dispose()
              pGeo.dispose()
              pMat.dispose()
            },
          }
        }}
      />

      {/* 숏폼 UI 오버레이 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <div className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500 blink" />
          LIVE {title}
        </div>
        <div className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">👁 {views.toLocaleString()}</div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-1.5">
          {hashtags.map((h, i) => (
            <motion.span
              key={h}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className={`rounded-full px-2.5 py-0.5 text-xs font-black ${i === 0 ? 'bg-pink-500 text-white' : 'bg-white/15 text-white'}`}
            >
              {h}
            </motion.span>
          ))}
        </div>
        <div className="text-sm font-black text-white drop-shadow">{style.name}</div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/90">
          참여자 {dancers}명 {dancers < MAX_DANCERS ? '(탭해서 참여)' : '(만석)'}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <AnimatePresence>
          {caption && !ended && (
            <motion.div
              key={caption.id}
              initial={{ scale: 0, rotate: -10, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], rotate: [-10, 4, -2], opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0, y: -30 }}
              transition={{ duration: 0.3 }}
              className="meme-caption text-4xl"
            >
              {caption.text}
            </motion.div>
          )}
          {ended && (
            <motion.div
              key="end"
              initial={{ scale: 0, rotate: -14 }}
              animate={{ scale: [0, 1.4, 1], rotate: [-14, 5, -3] }}
              transition={{ duration: 0.5 }}
              className="meme-caption max-w-[90vw] text-center text-3xl"
              style={{ whiteSpace: 'normal', lineHeight: 1.15 }}
            >
              {endLine}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
