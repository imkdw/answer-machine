import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { APT } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5500
const BEAT_MS = 280
const COLLAPSE_AT = 12
const FLOOR_H = 0.7
const COLORS = [0xff6b6b, 0xffb84d, 0x4dd2ff, 0x9b6bff, 0x5ef0a0, 0xff7ad9, 0xfff05e]

type Phase = 'stack' | 'wobble' | 'collapse' | 'after'

function windowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#2a2a3a'
  ctx.fillRect(0, 0, 256, 128)
  const cols = 6
  const rows = 2
  const w = 256 / cols
  const h = 128 / rows
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = Math.random() < 0.8 ? '#ffe680' : '#3a3a4a'
      ctx.fillRect(x * w + w * 0.2, y * h + h * 0.2, w * 0.6, h * 0.6)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 로제 APT 게임. 박자마다 층이 올라가고 "아파트" 외치다가 무너짐. 탭하면 층 추가. */
export default function AptStack({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const collapseLine = useMemo(() => pick(APT.collapse, rng), [rng])
  const topLine = useMemo(() => pick(APT.top, rng), [rng])

  const [phase, setPhase] = useState<Phase>('stack')
  const [floors, setFloors] = useState(0)
  const [chants, setChants] = useState<Array<{ id: number; side: 'l' | 'r'; size: number; y: number }>>([])
  const phaseRef = useRef<Phase>('stack')
  const floorsRef = useRef(0)
  const pendingAddRef = useRef(0)
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const seqRef = useRef(0)

  const addFloor = (): void => {
    if (phaseRef.current !== 'stack') return
    floorsRef.current++
    pendingAddRef.current++
    const n = floorsRef.current
    setFloors(n)
    audioRef.current.sfx('pop')
    const id = ++seqRef.current
    setChants((prev) => [...prev.slice(-3), { id, side: n % 2 === 0 ? 'r' : 'l', size: 1.6 + Math.min(n, 14) * 0.22, y: 20 + ((n * 37) % 45) }])
    window.setTimeout(() => setChants((prev) => prev.filter((c) => c.id !== id)), 700)
    if (n >= COLLAPSE_AT) {
      phaseRef.current = 'wobble'
      setPhase('wobble')
      window.setTimeout(() => {
        phaseRef.current = 'collapse'
        setPhase('collapse')
        audioRef.current.sfx('bang')
        audioRef.current.sfx('shatter')
      }, 700)
      window.setTimeout(() => {
        phaseRef.current = 'after'
        setPhase('after')
      }, 1900)
    }
  }
  const addRef = useRef(addFloor)
  addRef.current = addFloor

  useEffect(() => {
    const beat = window.setInterval(() => addRef.current(), BEAT_MS)
    const end = window.setTimeout(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    return () => {
      window.clearInterval(beat)
      window.clearTimeout(end)
    }
  }, [onDone])

  return (
    <SceneFrame style={{ background: 'linear-gradient(180deg, #120a2e 0%, #3a1a5e 60%, #ff5e8a 100%)', color: '#fff' }} className="cursor-pointer">
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, rng: r }) => {
          camera.position.set(6, 3, 10)
          scene.fog = new THREE.FogExp2(0x2a1250, 0.035)
          scene.add(new THREE.AmbientLight(0xffffff, 0.5))
          const key = new THREE.DirectionalLight(0xffffff, 1.6)
          key.position.set(5, 10, 6)
          scene.add(key)
          const neon = new THREE.PointLight(0xff5e8a, 30, 40)
          neon.position.set(-5, 4, 4)
          scene.add(neon)

          const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshStandardMaterial({ color: 0x1c1235, roughness: 0.9 }))
          ground.rotation.x = -Math.PI / 2
          ground.position.y = 0
          scene.add(ground)
          const grid = new THREE.GridHelper(40, 40, 0xff5e8a, 0x3a1a5e)
          grid.position.y = 0.01
          scene.add(grid)

          const winTex = windowTexture()
          const boxGeo = new THREE.BoxGeometry(2.4, FLOOR_H, 2.4)
          const roofMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 })
          const tower = new THREE.Group()
          scene.add(tower)

          interface Floor {
            mesh: THREE.Mesh
            targetY: number
            vel: THREE.Vector3
            spin: THREE.Vector3
            dropT: number
          }
          const list: Floor[] = []

          // 별 배경
          const N = 300
          const pos = new Float32Array(N * 3)
          for (let i = 0; i < N; i++) {
            pos[i * 3] = (r() - 0.5) * 60
            pos[i * 3 + 1] = r() * 40
            pos[i * 3 + 2] = (r() - 0.5) * 60 - 10
          }
          const pGeo = new THREE.BufferGeometry()
          pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
          const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false })
          scene.add(new THREE.Points(pGeo, pMat))

          let collapseT = -1
          let lastPhase: Phase = 'stack'

          return {
            update(dt, t) {
              while (pendingAddRef.current > 0) {
                pendingAddRef.current--
                const idx = list.length
                const wallMat = new THREE.MeshStandardMaterial({ color: COLORS[idx % COLORS.length], map: winTex, roughness: 0.6 })
                const mesh = new THREE.Mesh(boxGeo, [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat])
                const targetY = FLOOR_H / 2 + idx * FLOOR_H
                mesh.position.set((r() - 0.5) * 0.5, targetY + 6, (r() - 0.5) * 0.5)
                tower.add(mesh)
                list.push({ mesh, targetY, vel: new THREE.Vector3(), spin: new THREE.Vector3(), dropT: t })
              }

              const p = phaseRef.current
              if (p !== lastPhase) {
                lastPhase = p
                if (p === 'collapse') {
                  collapseT = t
                  for (const f of list) {
                    f.vel.set((r() - 0.5) * 9, 2 + r() * 6, (r() - 0.5) * 9)
                    f.spin.set((r() - 0.5) * 8, (r() - 0.5) * 8, (r() - 0.5) * 8)
                  }
                }
              }

              if (p === 'stack' || p === 'wobble') {
                for (const f of list) {
                  const k = Math.min(1, dt * 14)
                  f.mesh.position.y += (f.targetY - f.mesh.position.y) * k
                  f.mesh.position.x *= 1 - k * 0.5
                  f.mesh.position.z *= 1 - k * 0.5
                  const s = 1 + Math.max(0, 0.25 - (t - f.dropT)) * 1.2
                  f.mesh.scale.set(s, 1 / s, s)
                }
                const wob = p === 'wobble' ? Math.sin(t * 9) * 0.18 : Math.sin(t * 2) * 0.01 * list.length
                tower.rotation.z = wob
                tower.rotation.x = p === 'wobble' ? Math.cos(t * 7) * 0.1 : 0
              } else if (p === 'collapse' || p === 'after') {
                const ct = t - collapseT
                tower.rotation.set(0, 0, 0)
                for (const f of list) {
                  f.vel.y -= 14 * dt
                  f.mesh.position.addScaledVector(f.vel, dt)
                  if (f.mesh.position.y < FLOOR_H / 2) {
                    f.mesh.position.y = FLOOR_H / 2
                    f.vel.y *= -0.35
                    f.vel.x *= 0.8
                    f.vel.z *= 0.8
                    f.spin.multiplyScalar(0.7)
                  }
                  f.mesh.rotation.x += f.spin.x * dt
                  f.mesh.rotation.y += f.spin.y * dt
                  f.mesh.rotation.z += f.spin.z * dt
                }
                const shake = Math.max(0, 0.6 - ct)
                camera.position.x += (r() - 0.5) * shake
                camera.position.y += (r() - 0.5) * shake
              }

              const h = list.length * FLOOR_H
              const targetCamY = p === 'collapse' || p === 'after' ? 3 : 2.5 + h * 0.75
              camera.position.y += (targetCamY - camera.position.y) * Math.min(1, dt * 4)
              const targetDist = p === 'collapse' || p === 'after' ? 13 : 9 + h * 0.5
              const ang = t * 0.35
              camera.position.x = Math.cos(ang) * targetDist
              camera.position.z = Math.sin(ang) * targetDist
              camera.lookAt(0, p === 'collapse' || p === 'after' ? 1 : h * 0.55, 0)
              neon.position.y = 2 + h * 0.5
            },
            dispose() {
              winTex.dispose()
              boxGeo.dispose()
              roofMat.dispose()
              pGeo.dispose()
              pMat.dispose()
            },
          }
        }}
      />

      <button type="button" className="absolute inset-0 z-[5]" aria-label="층 추가" onClick={() => addRef.current()} />

      <div className="pointer-events-none absolute inset-0 z-10">
        <AnimatePresence>
          {chants.map((c) => (
            <motion.div
              key={c.id}
              className="meme-caption absolute"
              style={{ fontSize: `${c.size}rem`, top: `${c.y}%`, [c.side === 'l' ? 'left' : 'right']: '6%' }}
              initial={{ scale: 0, rotate: c.side === 'l' ? -12 : 12, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: 1 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.3 }}
            >
              아파트
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="absolute top-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1 text-sm font-black text-white backdrop-blur">
          {phase === 'stack' || phase === 'wobble' ? `${floors}층 (탭해서 더 쌓기)` : '층수: 0 (재건축)'}
        </div>

        <div className="absolute inset-x-4 bottom-24 flex justify-center">
          <AnimatePresence mode="wait">
            {phase === 'wobble' && (
              <motion.div key="wob" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="shake-forever text-2xl font-black text-yellow-300">
                어어어어
              </motion.div>
            )}
            {phase === 'collapse' && (
              <motion.div
                key="col"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: [1.6, 1], opacity: 1 }}
                exit={{ opacity: 0 }}
                className="meme-caption text-5xl"
                style={{ color: '#ff5e5e' }}
              >
                {collapseLine}
              </motion.div>
            )}
            {phase === 'after' && (
              <motion.div key="after" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-2xl bg-black/75 px-5 py-3 text-center text-lg font-black text-white" style={{ maxWidth: 320 }}>
                {topLine}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SceneFrame>
  )
}
