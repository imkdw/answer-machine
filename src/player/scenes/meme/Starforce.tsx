import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { TrollButton } from '../../TrollButton'
import { STARFORCE } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 6000
const FRAG_COUNT = 14

type Phase = 'idle' | 'rolling' | 'boom' | 'restore' | 'done'

function starShape(outer: number, inner: number): THREE.Shape {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

/** 메이플 스타포스 강화 패러디. 강화 누르면 터지고 복구되고 변화 없음. */
export default function Starforce({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const chance = useMemo(() => pick(STARFORCE.chance, rng), [rng])
  const item = useMemo(() => pick(STARFORCE.item, rng), [rng])
  const destroyLine = useMemo(() => pick(STARFORCE.destroy, rng), [rng])
  const restoreLine = useMemo(() => pick(STARFORCE.restore, rng), [rng])
  const failLine = useMemo(() => pick(STARFORCE.fail, rng), [rng])

  const [phase, setPhase] = useState<Phase>('idle')
  const [flash, setFlash] = useState(false)
  const phaseRef = useRef<Phase>('idle')
  const phaseAtRef = useRef(0)
  const doneRef = useRef(false)
  const pressedRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const timersRef = useRef<number[]>([])

  const setPhaseBoth = (p: Phase): void => {
    phaseRef.current = p
    phaseAtRef.current = -1 // update()에서 현재 t로 채움
    setPhase(p)
  }

  const enhance = (): void => {
    if (pressedRef.current) return
    pressedRef.current = true
    setPhaseBoth('rolling')
    const roll = audioRef.current.sfx('drumroll')
    const later = (fn: () => void, ms: number): void => {
      timersRef.current.push(window.setTimeout(fn, ms))
    }
    later(() => {
      roll.stop()
      audioRef.current.sfx('shatter')
      setFlash(true)
      setPhaseBoth('boom')
      later(() => setFlash(false), 220)
    }, 1200)
    later(() => {
      audioRef.current.sfx('sparkle')
      setPhaseBoth('restore')
    }, 2500)
    later(() => {
      audioRef.current.sfx('error')
      setPhaseBoth('done')
    }, 3600)
  }

  useEffect(() => {
    const auto = window.setTimeout(enhance, 1800)
    const end = window.setTimeout(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    const timers = timersRef.current
    return () => {
      window.clearTimeout(auto)
      window.clearTimeout(end)
      timers.forEach((t) => window.clearTimeout(t))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDone])

  return (
    <SceneFrame style={{ background: 'radial-gradient(circle at 50% 40%, #2a1f4d 0%, #0b0716 70%)', color: '#fff' }}>
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, rng: r }) => {
          camera.position.set(0, 0.6, 9)
          scene.fog = new THREE.FogExp2(0x0b0716, 0.03)

          scene.add(new THREE.AmbientLight(0xffffff, 0.35))
          const key = new THREE.PointLight(0xffd54a, 40, 40)
          key.position.set(3, 4, 5)
          scene.add(key)
          const rim = new THREE.PointLight(0xff4fd8, 25, 40)
          rim.position.set(-4, -2, 3)
          scene.add(rim)
          const core = new THREE.PointLight(0xffe680, 12, 12)
          scene.add(core)

          const goldMat = new THREE.MeshStandardMaterial({
            color: 0xffc31f,
            emissive: 0xff9b00,
            emissiveIntensity: 0.5,
            metalness: 0.85,
            roughness: 0.25,
          })
          const starGeo = new THREE.ExtrudeGeometry(starShape(1.8, 0.8), { depth: 0.5, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3 })
          starGeo.center()
          const star = new THREE.Mesh(starGeo, goldMat)
          scene.add(star)

          // 파편
          const fragGeo = new THREE.ExtrudeGeometry(starShape(0.45, 0.2), { depth: 0.2, bevelEnabled: false })
          fragGeo.center()
          const frags: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; spin: THREE.Vector3; home: THREE.Vector3 }> = []
          for (let i = 0; i < FRAG_COUNT; i++) {
            const m = new THREE.Mesh(fragGeo, goldMat)
            m.visible = false
            const a = (i / FRAG_COUNT) * Math.PI * 2
            const home = new THREE.Vector3(Math.cos(a) * 0.9, Math.sin(a) * 0.9, (r() - 0.5) * 0.3)
            m.position.copy(home)
            scene.add(m)
            frags.push({
              mesh: m,
              vel: new THREE.Vector3(Math.cos(a) * (4 + r() * 4), Math.sin(a) * (4 + r() * 4) + 3, (r() - 0.5) * 4),
              spin: new THREE.Vector3(r() * 8, r() * 8, r() * 8),
              home,
            })
          }

          // 반짝이 파티클
          const N = 260
          const pos = new Float32Array(N * 3)
          const orbit: Array<{ radius: number; speed: number; phase: number; y: number }> = []
          for (let i = 0; i < N; i++) {
            orbit.push({ radius: 2.6 + r() * 3.5, speed: 0.3 + r() * 0.9, phase: r() * Math.PI * 2, y: (r() - 0.5) * 5 })
          }
          const pGeo = new THREE.BufferGeometry()
          pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
          const pMat = new THREE.PointsMaterial({ color: 0xfff3b0, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
          const points = new THREE.Points(pGeo, pMat)
          scene.add(points)

          // 바닥 그리드 느낌
          const grid = new THREE.GridHelper(30, 30, 0x5a3fa8, 0x2a1f4d)
          grid.position.y = -3.2
          scene.add(grid)

          let phaseT = 0
          let lastPhase: Phase = 'idle'
          let boomT = 0
          let restoreT = 0

          return {
            update(dt, t) {
              const p = phaseRef.current
              if (p !== lastPhase) {
                lastPhase = p
                phaseT = t
                if (p === 'boom') boomT = t
                if (p === 'restore') restoreT = t
              }
              const since = t - phaseT

              // 파티클 궤도
              const arr = pGeo.attributes.position as THREE.BufferAttribute
              const speedMul = p === 'rolling' ? 4 : p === 'boom' ? 0.2 : 1
              for (let i = 0; i < N; i++) {
                const o = orbit[i]!
                const a = o.phase + t * o.speed * speedMul
                const rad = p === 'boom' ? o.radius + since * 6 : o.radius
                arr.setXYZ(i, Math.cos(a) * rad, o.y + Math.sin(t * 0.8 + o.phase) * 0.3, Math.sin(a) * rad)
              }
              arr.needsUpdate = true

              camera.position.x = Math.sin(t * 0.4) * 0.6
              camera.position.y = 0.6 + Math.cos(t * 0.3) * 0.3
              camera.lookAt(0, 0, 0)

              if (p === 'idle') {
                star.visible = true
                star.rotation.y += dt * 0.8
                star.rotation.z = Math.sin(t) * 0.1
                star.scale.setScalar(1 + Math.sin(t * 2) * 0.04)
                core.intensity = 12 + Math.sin(t * 3) * 4
              } else if (p === 'rolling') {
                star.visible = true
                star.rotation.y += dt * (3 + since * 12)
                const s = 1 + since * 0.35
                star.scale.setScalar(s)
                goldMat.emissiveIntensity = 0.5 + since * 1.6
                core.intensity = 12 + since * 60
                camera.position.x += (r() - 0.5) * since * 0.25
                camera.position.y += (r() - 0.5) * since * 0.25
              } else if (p === 'boom') {
                star.visible = false
                goldMat.emissiveIntensity = 1.2
                core.intensity = Math.max(2, 80 - since * 60)
                const bt = t - boomT
                for (const f of frags) {
                  f.mesh.visible = true
                  f.mesh.position.copy(f.home).addScaledVector(f.vel, bt).add(new THREE.Vector3(0, -4 * bt * bt, 0))
                  f.mesh.rotation.x += f.spin.x * dt
                  f.mesh.rotation.y += f.spin.y * dt
                  f.mesh.rotation.z += f.spin.z * dt
                }
                camera.position.x += (r() - 0.5) * Math.max(0, 0.6 - bt)
                camera.position.y += (r() - 0.5) * Math.max(0, 0.6 - bt)
              } else if (p === 'restore') {
                const rt = Math.min(1, (t - restoreT) / 0.9)
                const ease = 1 - Math.pow(1 - rt, 3)
                for (const f of frags) {
                  f.mesh.visible = rt < 1
                  const bt = restoreT - boomT
                  const far = f.home.clone().addScaledVector(f.vel, bt).add(new THREE.Vector3(0, -4 * bt * bt, 0))
                  f.mesh.position.lerpVectors(far, new THREE.Vector3(0, 0, 0), ease)
                  f.mesh.rotation.y += 6 * dt
                }
                star.visible = rt >= 0.85
                star.scale.setScalar(Math.max(0.01, (rt - 0.85) / 0.15))
                star.rotation.y += dt * 4
                goldMat.emissiveIntensity = 0.5 + (1 - rt) * 1.5
                core.intensity = 12 + (1 - rt) * 30
              } else {
                star.visible = true
                star.scale.setScalar(1)
                star.rotation.y += dt * 0.8
                goldMat.emissiveIntensity = 0.5
                core.intensity = 12
                for (const f of frags) f.mesh.visible = false
              }
            },
            dispose() {
              starGeo.dispose()
              fragGeo.dispose()
              pGeo.dispose()
              pMat.dispose()
              goldMat.dispose()
            },
          }
        }}
      />

      {flash && <div className="absolute inset-0 z-20 bg-white" />}

      <div className="relative z-10 flex w-full max-w-[340px] flex-col items-center gap-3">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full rounded-2xl border-2 border-yellow-400/70 bg-black/60 px-4 py-3 text-left shadow-[0_0_30px_rgba(255,195,31,0.35)] backdrop-blur"
        >
          <div className="text-xs font-bold tracking-widest text-yellow-300">{STARFORCE.title}</div>
          <div className="mt-1 text-xl font-black text-white">
            {item} <span className="text-yellow-300">+12성</span> <span className="opacity-60">→</span> <span className="text-pink-300">+13성</span>
          </div>
          <div className="mt-1 truncate text-sm tracking-tight text-yellow-200">★★★★★★★★★★★★</div>
          <div className="mt-2 text-xs text-gray-300">{chance}</div>
        </motion.div>

        <div className="h-24 w-full">
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.div key="idle" exit={{ opacity: 0, scale: 0.8 }} className="flex justify-center">
                <TrollButton
                  label="강화"
                  onPress={enhance}
                  audio={audio}
                  className="btn text-xl"
                  style={{ background: '#ffc31f', color: '#1a0f00', boxShadow: '0 0 24px rgba(255,195,31,0.7)' }}
                />
              </motion.div>
            )}
            {phase === 'rolling' && (
              <motion.div key="rolling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-lg font-bold text-yellow-200">
                강화 중<span className="blink">...</span>
              </motion.div>
            )}
            {phase === 'boom' && (
              <motion.div
                key="boom"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [1.4, 1], opacity: 1 }}
                exit={{ opacity: 0 }}
                className="shake text-2xl font-black text-red-500"
                style={{ textShadow: '0 0 20px rgba(255,0,0,0.8)' }}
              >
                <div>{failLine}</div>
                <div className="mt-1 text-lg">{destroyLine}</div>
              </motion.div>
            )}
            {phase === 'restore' && (
              <motion.div key="restore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-base font-bold text-cyan-200">
                {restoreLine}
              </motion.div>
            )}
            {phase === 'done' && (
              <motion.div key="done" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-xl font-black text-yellow-300">
                +12성 (변화 없음)
                <div className="mt-1 text-xs font-semibold text-gray-300">강화 비용: 인내심 1,200,000</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SceneFrame>
  )
}
