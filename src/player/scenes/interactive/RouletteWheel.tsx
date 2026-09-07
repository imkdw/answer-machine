import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextPlane } from '../../../three/textTexture'
import { ROULETTE } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 9000
/** 스핀 i는 늦어도 AUTO_START[i]에 시작하고 정확히 STOP_AT[i]에 멈춘다 */
const AUTO_START = [1200, 3900, 5900] as const
const STOP_AT = [3400, 5700, 7200] as const
const END_AT = 7800

const SLICES = ROULETTE.slices
const ANSWER_IDX = SLICES.length - 1
const ANSWER_THETA = 0.15
const OTHER_THETA = (Math.PI * 2 - ANSWER_THETA) / (SLICES.length - 1)
const WHEEL_R = 3.1
/** 플래퍼가 있는 각도 (휠 로컬). 기울인 그룹에서 -z가 화면 위쪽이라 π */
const FLAPPER_ANGLE = Math.PI
const COLORS = [0xff2d95, 0x2dffea, 0xffd54a, 0x7c5cff, 0xff8a3c, 0x4ade80, 0xff5c5c, 0xffffff]

/** 조각 i의 시작 각도와 길이 */
function sliceRange(i: number): { start: number; len: number } {
  if (i === ANSWER_IDX) return { start: (SLICES.length - 1) * OTHER_THETA, len: ANSWER_THETA }
  return { start: i * OTHER_THETA, len: OTHER_THETA }
}

/** 룰렛. 답변 공개 칸은 0.15rad. 3번 돌려서 3번 다 빗나감. */
export default function RouletteWheel({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(ROULETTE.title, rng), [rng])
  const hint = useMemo(() => pick(ROULETTE.hint, rng), [rng])
  const endLine = useMemo(() => pick(ROULETTE.end, rng), [rng])
  const riggedLine = useMemo(() => pick(ROULETTE.rigged, rng), [rng])
  /** 세 번의 착지: 조각 인덱스와 조각 안에서의 위치 (0~1). 답변 옆 조각 가장자리에 붙는 건 "아깝" 연출 */
  const landings = useMemo(() => {
    const out: Array<{ idx: number; frac: number }> = []
    for (let i = 0; i < 3; i++) {
      if (rng() < 0.5) {
        // 답변 칸 바로 옆 (앞 조각 끝 또는 첫 조각 시작)
        const before = rng() < 0.5
        out.push(before ? { idx: ANSWER_IDX - 1, frac: 0.97 } : { idx: 0, frac: 0.03 })
      } else {
        out.push({ idx: Math.floor(rng() * (SLICES.length - 1)), frac: 0.25 + rng() * 0.5 })
      }
    }
    return out
  }, [rng])
  const landedLines = useMemo(() => landings.map((l) => pick(ROULETTE.landed, rng).replace('{s}', SLICES[l.idx]!)), [landings, rng])

  const [caption, setCaption] = useState<{ id: number; text: string; big?: boolean } | null>(null)
  const [sub, setSub] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(true)
  const [spinNo, setSpinNo] = useState(0)
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const spinReq = useRef(0)
  const cmds = useRef<number[]>([])
  const capSeq = useRef(0)

  const requestSpin = (): void => {
    if (spinReq.current >= 3) return
    const i = spinReq.current++
    cmds.current.push(i)
    setSpinNo(i + 1)
    setShowHint(false)
    setCaption(null)
    audioRef.current.sfx('whoosh')
  }
  const requestSpinRef = useRef(requestSpin)
  requestSpinRef.current = requestSpin

  useEffect(() => {
    const timers: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timers.push(window.setTimeout(fn, ms))
    }
    const say = (text: string, big = false): void => setCaption({ id: ++capSeq.current, text, big })

    AUTO_START.forEach((at, i) => {
      later(() => {
        if (spinReq.current <= i) requestSpinRef.current()
      }, at)
    })
    STOP_AT.forEach((at, i) => {
      later(() => {
        say(landedLines[i]!, true)
        audioRef.current.sfx(i === 2 ? 'boo' : 'ding')
        if (i === 0) later(() => setSub(riggedLine), 500)
        if (i === 1) later(() => setShowHint(true), 400)
      }, at)
    })
    later(() => setShowHint(false), AUTO_START[2])
    later(() => {
      say(endLine, true)
      setSub('답변 공개 확률: 2.4% (체감 0%)')
      audioRef.current.sfx('boo')
    }, END_AT)
    later(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [onDone, landedLines, riggedLine, endLine])

  return (
    <SceneFrame style={{ background: 'radial-gradient(circle at 50% 35%, #12305a 0%, #050a18 70%)', color: '#fff' }}>
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, renderer, rng: r }) => {
          camera.position.set(0, 2.2, 9.2)
          camera.lookAt(0, 0.4, 0)
          scene.fog = new THREE.Fog(0x050a18, 12, 30)
          scene.add(new THREE.AmbientLight(0xffffff, 0.6))
          const key = new THREE.DirectionalLight(0xffffff, 1.5)
          key.position.set(2, 8, 6)
          scene.add(key)
          const spotA = new THREE.SpotLight(0xff2d95, 120, 30, 0.6, 0.5)
          spotA.position.set(-5, 7, 4)
          spotA.target.position.set(0, 0, 0)
          scene.add(spotA, spotA.target)
          const spotB = new THREE.SpotLight(0x2dffea, 120, 30, 0.6, 0.5)
          spotB.position.set(5, 7, 4)
          spotB.target.position.set(0, 0, 0)
          scene.add(spotB, spotB.target)

          // 바닥
          const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x0b1a33, roughness: 0.35, metalness: 0.5 }))
          floor.rotation.x = -Math.PI / 2
          floor.position.y = -3.6
          scene.add(floor)
          const grid = new THREE.GridHelper(60, 30, 0x2dffea, 0x14305a)
          grid.position.y = -3.59
          scene.add(grid)

          // 휠 (기울인 그룹 안에서 y축 회전)
          const tilt = new THREE.Group()
          tilt.rotation.x = Math.PI / 2 - 0.42
          tilt.position.y = 0.3
          scene.add(tilt)
          const spinner = new THREE.Group()
          tilt.add(spinner)

          const wedgeMats: THREE.MeshStandardMaterial[] = []
          for (let i = 0; i < SLICES.length; i++) {
            const { start, len } = sliceRange(i)
            const isAns = i === ANSWER_IDX
            const mat = new THREE.MeshStandardMaterial({ color: isAns ? 0xffd700 : COLORS[i % COLORS.length]!, roughness: 0.45, metalness: 0.15, emissive: isAns ? 0xffaa00 : 0x000000, emissiveIntensity: isAns ? 0.8 : 0 })
            wedgeMats.push(mat)
            const wedge = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.35, 12, 1, false, start, len), mat)
            spinner.add(wedge)
            const thC = start + len / 2
            const label = makeTextPlane(SLICES[i]!, isAns ? 0.26 : 0.46, { size: 72, color: '#ffffff', stroke: '#000000', strokeWidth: 12, padding: 20, maxWidth: 520 })
            label.rotation.order = 'YXZ'
            label.rotation.x = -Math.PI / 2
            label.rotation.y = thC + Math.PI
            const rad = isAns ? 2.35 : 1.95
            label.position.set(Math.sin(thC) * rad, 0.19, Math.cos(thC) * rad)
            spinner.add(label)
          }
          // 허브
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0xffd54a, metalness: 0.9, roughness: 0.2 }))
          hub.position.y = 0.2
          spinner.add(hub)
          // 핀
          const pegGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.4, 8)
          const pegMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 })
          const pegAngles: number[] = []
          for (let i = 0; i < SLICES.length; i++) {
            const { start } = sliceRange(i)
            pegAngles.push(start)
            const peg = new THREE.Mesh(pegGeo, pegMat)
            peg.position.set(Math.sin(start) * (WHEEL_R - 0.2), 0.3, Math.cos(start) * (WHEEL_R - 0.2))
            spinner.add(peg)
          }
          // 테두리
          const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R + 0.1, 0.16, 12, 48), new THREE.MeshStandardMaterial({ color: 0xffd54a, metalness: 0.9, roughness: 0.25 }))
          rim.rotation.x = Math.PI / 2
          rim.position.y = 0.1
          tilt.add(rim)
          // 플래퍼 (고정, 위쪽)
          const flapper = new THREE.Group()
          flapper.position.set(Math.sin(FLAPPER_ANGLE) * (WHEEL_R + 0.25), 0.45, Math.cos(FLAPPER_ANGLE) * (WHEEL_R + 0.25))
          const flapMesh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 4), new THREE.MeshStandardMaterial({ color: 0xff2d2d, emissive: 0xff2d2d, emissiveIntensity: 0.5 }))
          flapMesh.rotation.x = Math.PI / 2
          flapMesh.position.z = 0.35
          flapper.add(flapMesh)
          tilt.add(flapper)
          // 받침
          const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, 3.4, 16), new THREE.MeshStandardMaterial({ color: 0x1e3a6a, roughness: 0.5, metalness: 0.4 }))
          stand.position.y = -1.9
          scene.add(stand)

          // 컨페티
          const CN = 160
          const cPos = new Float32Array(CN * 3)
          const cVel = new Float32Array(CN * 3)
          const cCol = new Float32Array(CN * 3)
          const cGeo = new THREE.BufferGeometry()
          cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3))
          cGeo.setAttribute('color', new THREE.BufferAttribute(cCol, 3))
          const cMat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0, depthWrite: false })
          const confetti = new THREE.Points(cGeo, cMat)
          scene.add(confetti)
          let confT = -1
          const tmpC = new THREE.Color()
          const burstConfetti = (): void => {
            for (let i = 0; i < CN; i++) {
              cPos[i * 3] = (r() - 0.5) * 2
              cPos[i * 3 + 1] = 3.2
              cPos[i * 3 + 2] = 1 + (r() - 0.5) * 2
              cVel[i * 3] = (r() - 0.5) * 7
              cVel[i * 3 + 1] = 2 + r() * 5
              cVel[i * 3 + 2] = (r() - 0.5) * 4
              tmpC.setHex(COLORS[Math.floor(r() * COLORS.length)]!)
              cCol[i * 3] = tmpC.r
              cCol[i * 3 + 1] = tmpC.g
              cCol[i * 3 + 2] = tmpC.b
            }
            confT = 0
          }

          // 스핀 상태
          let alpha = r() * Math.PI * 2
          let tw: { a0: number; a1: number; t0: number; t1: number } | null = null
          let lastPegSlot = 0
          let flapKick = 0
          let wobble = 0

          /** 조각 idx 안 frac 위치가 플래퍼 아래 오도록 하는 alpha (>= from + minTurns) */
          const targetAlpha = (from: number, idx: number, frac: number, minTurns: number): number => {
            const { start, len } = sliceRange(idx)
            const th = start + len * frac
            // 스핀 각 alpha일 때 플래퍼 아래 로컬 각도 = FLAPPER_ANGLE - alpha  =>  alpha = FLAPPER_ANGLE - th + 2πk
            const base = FLAPPER_ANGLE - th
            const k = Math.ceil((from + minTurns * Math.PI * 2 - base) / (Math.PI * 2))
            return base + k * Math.PI * 2
          }

          const startSpin = (i: number, t: number): void => {
            const land = landings[i]!
            const t1 = STOP_AT[i]! / 1000
            const dur = Math.max(0.5, t1 - t)
            tw = { a0: alpha, a1: targetAlpha(alpha, land.idx, land.frac, 2 + i), t0: t, t1: t + dur }
          }

          const onDown = (): void => {
            if (tw) {
              wobble = 1
              audioRef.current.sfx('pop')
              return
            }
            requestSpinRef.current()
          }
          renderer.domElement.style.touchAction = 'none'
          renderer.domElement.addEventListener('pointerdown', onDown)

          const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4)

          return {
            update(dt, t) {
              while (cmds.current.length > 0) startSpin(cmds.current.shift()!, t)

              if (tw) {
                const k = Math.min(1, (t - tw.t0) / (tw.t1 - tw.t0))
                alpha = tw.a0 + (tw.a1 - tw.a0) * easeOutQuart(k)
                if (k >= 1) {
                  alpha = tw.a1
                  tw = null
                  burstConfetti()
                  audioRef.current.sfx('sparkle')
                }
              }
              spinner.rotation.y = alpha

              // 핀이 플래퍼를 지날 때 틱
              const local = ((FLAPPER_ANGLE - alpha) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
              let slot = 0
              for (let i = 0; i < pegAngles.length; i++) if (local >= pegAngles[i]!) slot = i
              if (slot !== lastPegSlot) {
                lastPegSlot = slot
                flapKick = 1
                if (tw) audioRef.current.sfx('tick')
              }
              flapKick = Math.max(0, flapKick - dt * 6)
              flapper.rotation.y = -flapKick * 0.6
              wobble = Math.max(0, wobble - dt * 3)
              tilt.rotation.z = Math.sin(t * 20) * wobble * 0.04

              // 답변 칸 반짝
              wedgeMats[ANSWER_IDX]!.emissiveIntensity = 0.6 + Math.sin(t * 8) * 0.5

              if (confT >= 0) {
                confT += dt
                for (let i = 0; i < CN; i++) {
                  cVel[i * 3 + 1] -= 6 * dt
                  cPos[i * 3] += cVel[i * 3]! * dt
                  cPos[i * 3 + 1] += cVel[i * 3 + 1]! * dt
                  cPos[i * 3 + 2] += cVel[i * 3 + 2]! * dt
                }
                ;(cGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true
                cMat.opacity = Math.max(0, 1 - confT / 1.6)
                if (confT > 1.7) confT = -1
              }

              spotA.intensity = 90 + Math.sin(t * 2.5) * 40
              spotB.intensity = 90 + Math.cos(t * 2.1) * 40
              camera.position.x = Math.sin(t * 0.35) * 1.3
              camera.position.y = 2.2 + Math.sin(t * 0.5) * 0.4
              camera.lookAt(0, 0.3, 0)
            },
            dispose() {
              renderer.domElement.removeEventListener('pointerdown', onDown)
              pegGeo.dispose()
              pegMat.dispose()
            },
          }
        }}
      />

      <div className="pointer-events-none absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full border-2 border-cyan-300 bg-black/70 px-4 py-1 text-sm font-black tracking-wide text-cyan-100 shadow-lg">
        🎡 {title}
      </div>
      <div className="pointer-events-none absolute top-14 right-4 z-10 rounded-md border border-cyan-300 bg-black/70 px-3 py-1 font-mono text-xs text-cyan-100">
        SPIN <span className="text-base font-black text-yellow-300">{spinNo}</span>/3
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
        <AnimatePresence mode="wait">
          {sub && (
            <motion.div key={sub} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-full bg-black/70 px-4 py-1.5 text-sm font-bold text-cyan-100">
              {sub}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
