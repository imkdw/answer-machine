import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextPlane } from '../../../three/textTexture'
import { GEOJE } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5500
const LAUNCH_MS = 700
const CAPTION_AT = 3600
const BURST_N = 60

/** 거제 야호. 도시 이름이 불꽃처럼 바다에서 솟았다 터진다. 마지막엔 "답변~ 야호~!" */
export default function GeojeYaho({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const scold = useMemo(() => pick(GEOJE.scold, rng), [rng])
  const finalWord = useMemo(() => pick(GEOJE.finals, rng), [rng])
  const mind = useMemo(() => pick(GEOJE.mind, rng), [rng])

  const [intro, setIntro] = useState(true)
  const [caption, setCaption] = useState(false)
  const [mindLine, setMindLine] = useState(false)
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  /** update()가 소비하는 발사 대기 큐 */
  const launchQueue = useRef<string[]>([])
  const burstQueue = useRef(0)

  useEffect(() => {
    const timers: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timers.push(window.setTimeout(fn, ms))
    }
    later(() => setIntro(false), 700)
    const cities = [...GEOJE.cities]
    let shuffled = cities.slice()
    for (let i = 0; i < 6; i++) {
      later(() => {
        if (shuffled.length === 0) shuffled = cities.slice()
        const idx = Math.floor(rng() * shuffled.length)
        const city = shuffled.splice(idx, 1)[0]!
        launchQueue.current.push(city)
        audioRef.current.sfx('pop')
      }, 800 + i * LAUNCH_MS)
    }
    later(() => {
      setCaption(true)
      burstQueue.current += 3
      audioRef.current.sfx('tada')
      audioRef.current.sfx('sparkle')
    }, CAPTION_AT)
    later(() => setMindLine(true), CAPTION_AT + 700)
    later(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [onDone, rng])

  return (
    <SceneFrame style={{ background: 'linear-gradient(180deg, #ffb6e1 0%, #ffe3f3 45%, #7fd8ff 46%, #1e6fd9 100%)', color: '#3a1030' }}>
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, rng: r }) => {
          camera.position.set(0, 2.2, 12)
          camera.lookAt(0, 1.5, 0)
          scene.fog = new THREE.Fog(0xffd7ee, 18, 45)
          scene.add(new THREE.AmbientLight(0xffffff, 0.9))
          const sun = new THREE.DirectionalLight(0xfff0c0, 1.8)
          sun.position.set(-4, 8, 6)
          scene.add(sun)

          // 바다: 정점 흔들기
          const seaGeo = new THREE.PlaneGeometry(60, 40, 48, 32)
          const seaMat = new THREE.MeshStandardMaterial({ color: 0x2f8fe8, roughness: 0.35, metalness: 0.15, flatShading: true })
          const sea = new THREE.Mesh(seaGeo, seaMat)
          sea.rotation.x = -Math.PI / 2
          sea.position.y = 0
          scene.add(sea)
          const seaPos = seaGeo.attributes.position as THREE.BufferAttribute
          const base = new Float32Array(seaPos.array as Float32Array)

          // 섬/산
          const hillMat = new THREE.MeshStandardMaterial({ color: 0x3fa85a, roughness: 0.9, flatShading: true })
          const hills: THREE.Mesh[] = []
          for (let i = 0; i < 7; i++) {
            const h = 1.2 + r() * 3
            const m = new THREE.Mesh(new THREE.ConeGeometry(0.8 + r() * 2.2, h, 5 + Math.floor(r() * 3)), hillMat)
            m.position.set((r() - 0.5) * 26, h / 2 - 0.2, -8 - r() * 14)
            m.rotation.y = r() * Math.PI
            scene.add(m)
            hills.push(m)
          }

          // 해
          const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.95 }))
          sunSprite.scale.set(4, 4, 1)
          sunSprite.position.set(5, 9, -22)
          scene.add(sunSprite)

          // 반짝이 (핑크/골드)
          const GN = 220
          const gPos = new Float32Array(GN * 3)
          const gCol = new Float32Array(GN * 3)
          const pink = new THREE.Color(0xff6fcf)
          const gold = new THREE.Color(0xffd54a)
          for (let i = 0; i < GN; i++) {
            gPos[i * 3] = (r() - 0.5) * 24
            gPos[i * 3 + 1] = r() * 12
            gPos[i * 3 + 2] = (r() - 0.5) * 16 - 2
            const c = r() < 0.5 ? pink : gold
            gCol[i * 3] = c.r
            gCol[i * 3 + 1] = c.g
            gCol[i * 3 + 2] = c.b
          }
          const gGeo = new THREE.BufferGeometry()
          gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3))
          gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3))
          const gMat = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
          const glitter = new THREE.Points(gGeo, gMat)
          scene.add(glitter)

          // 불꽃 파편 풀
          interface Burst {
            pts: THREE.Points
            vel: Float32Array
            t0: number
            alive: boolean
          }
          const bursts: Burst[] = []
          const burstColors = [0xff4fd8, 0xffd54a, 0x4fffd8, 0xffffff, 0xff8a3c]
          const spawnBurst = (at: THREE.Vector3, t: number): void => {
            const pos = new Float32Array(BURST_N * 3)
            const vel = new Float32Array(BURST_N * 3)
            for (let i = 0; i < BURST_N; i++) {
              pos[i * 3] = at.x
              pos[i * 3 + 1] = at.y
              pos[i * 3 + 2] = at.z
              const a = r() * Math.PI * 2
              const b = (r() - 0.5) * Math.PI
              const sp = 2 + r() * 4
              vel[i * 3] = Math.cos(a) * Math.cos(b) * sp
              vel[i * 3 + 1] = Math.sin(b) * sp + 1.5
              vel[i * 3 + 2] = Math.sin(a) * Math.cos(b) * sp
            }
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
            const mat = new THREE.PointsMaterial({
              color: burstColors[Math.floor(r() * burstColors.length)]!,
              size: 0.18,
              transparent: true,
              opacity: 1,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            })
            const pts = new THREE.Points(geo, mat)
            scene.add(pts)
            bursts.push({ pts, vel, t0: t, alive: true })
          }

          // 도시 텍스트 로켓
          interface Rocket {
            mesh: THREE.Mesh
            vy: number
            t0: number
            popped: boolean
          }
          const rockets: Rocket[] = []
          const launch = (city: string, t: number): void => {
            const mesh = makeTextPlane(`${city}~ 야호~!`, 1.1, { size: 96, color: '#ff2d95', stroke: '#ffffff', strokeWidth: 16, padding: 30 })
            mesh.position.set((r() - 0.5) * 8, -0.5, (r() - 0.5) * 3)
            mesh.rotation.z = (r() - 0.5) * 0.4
            scene.add(mesh)
            rockets.push({ mesh, vy: 7.5 + r() * 2, t0: t, popped: false })
          }

          return {
            update(dt, t) {
              // 바다 파도
              for (let i = 0; i < seaPos.count; i++) {
                const x = base[i * 3]!
                const y = base[i * 3 + 1]!
                seaPos.setZ(i, Math.sin(x * 0.6 + t * 1.8) * 0.25 + Math.cos(y * 0.8 + t * 1.3) * 0.2)
              }
              seaPos.needsUpdate = true
              seaGeo.computeVertexNormals()

              // 발사 큐 소비
              while (launchQueue.current.length > 0) launch(launchQueue.current.shift()!, t)
              while (burstQueue.current > 0) {
                burstQueue.current--
                spawnBurst(new THREE.Vector3((r() - 0.5) * 8, 3 + r() * 4, (r() - 0.5) * 4), t)
              }

              for (const rk of rockets) {
                if (rk.popped) {
                  rk.mesh.scale.multiplyScalar(1 - dt * 4)
                  ;(rk.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (rk.mesh.material as THREE.MeshBasicMaterial).opacity - dt * 3)
                  continue
                }
                rk.vy -= 6 * dt
                rk.mesh.position.y += rk.vy * dt
                rk.mesh.rotation.z += dt * 0.6
                rk.mesh.lookAt(camera.position)
                if (rk.vy <= 0.4) {
                  rk.popped = true
                  spawnBurst(rk.mesh.position.clone(), t)
                  audioRef.current.sfx('sparkle')
                }
              }

              for (const b of bursts) {
                if (!b.alive) continue
                const age = t - b.t0
                const arr = (b.pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
                for (let i = 0; i < BURST_N; i++) {
                  b.vel[i * 3 + 1] -= 5 * dt
                  arr[i * 3] += b.vel[i * 3]! * dt
                  arr[i * 3 + 1] += b.vel[i * 3 + 1]! * dt
                  arr[i * 3 + 2] += b.vel[i * 3 + 2]! * dt
                }
                ;(b.pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
                ;(b.pts.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - age / 1.3)
                if (age > 1.4) {
                  b.alive = false
                  scene.remove(b.pts)
                  b.pts.geometry.dispose()
                  ;(b.pts.material as THREE.Material).dispose()
                }
              }

              glitter.rotation.y = t * 0.05
              gMat.opacity = 0.7 + Math.sin(t * 5) * 0.25
              hills.forEach((h, i) => {
                h.position.y += Math.sin(t * 1.2 + i) * 0.0015
              })
              sunSprite.scale.setScalar(4 + Math.sin(t * 2) * 0.3)

              camera.position.x = Math.sin(t * 0.35) * 1.2
              camera.position.y = 2.2 + Math.cos(t * 0.5) * 0.3
              camera.lookAt(0, 2, 0)
            },
            dispose() {
              seaGeo.dispose()
              seaMat.dispose()
              hillMat.dispose()
              gGeo.dispose()
              gMat.dispose()
            },
          }
        }}
      />

      <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full border-2 border-white bg-pink-500/90 px-4 py-1 text-sm font-black tracking-wide text-white shadow-lg">
        갸루의 마인드 <span className="inline-block" style={{ transform: 'rotate(180deg)' }}>✌️</span>
      </div>

      <div className="absolute inset-x-4 top-16 z-10 flex justify-center">
        <AnimatePresence>
          {intro && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex max-w-[320px] items-start gap-2 rounded-xl bg-white/95 px-3 py-2 text-left text-xs text-gray-800 shadow"
            >
              <div className="h-7 w-7 shrink-0 rounded-full bg-gray-300 text-center text-base leading-7">🙂</div>
              <div>
                <div className="font-bold text-gray-600">
                  @원이 <span className="font-normal text-gray-400">2분 전</span>
                </div>
                <div>{scold}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-28 z-10 flex flex-col items-center gap-3">
        <AnimatePresence>
          {caption && (
            <motion.div
              key="cap"
              initial={{ scale: 0, rotate: -14 }}
              animate={{ scale: [0, 1.4, 1], rotate: [-14, 5, -3] }}
              transition={{ duration: 0.5 }}
              className="meme-caption flex items-center gap-2 text-5xl"
            >
              <span>{finalWord}~ 야호~!</span>
              <motion.span
                animate={{ y: [0, -14, 0], rotate: [180, 170, 190, 180] }}
                transition={{ repeat: Infinity, duration: 0.7 }}
                className="inline-block text-4xl"
                style={{ WebkitTextStroke: '0', textShadow: 'none' }}
              >
                ✌️
              </motion.span>
            </motion.div>
          )}
          {mindLine && (
            <motion.div key="mind" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-full bg-black/70 px-4 py-1.5 text-sm font-bold text-pink-100">
              {mind}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
