import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { TrollButton } from '../../TrollButton'
import { BACKROOMS } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5500
const DIALOG_MS = 900
const LINE_MS = 900
const EXIT_AT = 4600

const WALL_H = 3
const CELL = 4
const GRID = 9

function wallpaperTexture(rng: () => number): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#d9c96a'
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = '#c9b85a'
  for (let x = 0; x < 256; x += 16) ctx.fillRect(x, 0, 6, 256)
  const img = ctx.getImageData(0, 0, 256, 256)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rng() - 0.5) * 28
    img.data[i] = Math.max(0, Math.min(255, img.data[i]! + n))
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1]! + n))
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2]! + n * 0.5))
  }
  ctx.putImageData(img, 0, 0)
  // 얼룩
  ctx.fillStyle = 'rgba(90,70,20,0.18)'
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.ellipse(rng() * 256, 200 + rng() * 56, 20 + rng() * 40, 8 + rng() * 14, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 백룸. 노란 벽지 복도를 1인칭으로 떠다닌다. 형광등은 깜빡이고 출구는 없다. */
export default function Backrooms({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const enterLine = useMemo(() => pick(BACKROOMS.enter, rng), [rng])
  const exitLine = useMemo(() => pick(BACKROOMS.exit, rng), [rng])
  const lines = useMemo(() => {
    const pool = [...BACKROOMS.lines]
    const out: string[] = []
    while (pool.length && out.length < 4) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!)
    return out
  }, [rng])

  const [phase, setPhase] = useState<'dialog' | 'walk' | 'exit'>('dialog')
  const [lineIdx, setLineIdx] = useState(0)
  const [flash, setFlash] = useState(false)
  const [swapped, setSwapped] = useState(false)
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const walkingRef = useRef(false)

  useEffect(() => {
    const timers: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timers.push(window.setTimeout(fn, ms))
    }
    later(() => {
      setPhase((p) => (p === 'dialog' ? 'walk' : p))
      walkingRef.current = true
    }, DIALOG_MS)
    for (let i = 0; i < lines.length; i++) later(() => setLineIdx(i), DIALOG_MS + i * LINE_MS)
    // 형광등 소음 흉내
    for (let ms = 300; ms < EXIT_AT; ms += 900) later(() => audioRef.current.sfx('static'), ms)
    later(() => {
      setFlash(true)
      setPhase('exit')
      audioRef.current.sfx('whoosh')
      later(() => setFlash(false), 250)
    }, EXIT_AT)
    later(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [onDone, lines.length])

  const enter = (): void => {
    walkingRef.current = true
    setPhase((p) => (p === 'dialog' ? 'walk' : p))
  }

  return (
    <SceneFrame style={{ background: '#c9b85a', color: '#2b2410', fontFamily: '"Courier New", Courier, monospace' }}>
      <ThreeCanvas
        rng={rng}
        alpha={false}
        init={({ scene, camera, rng: r }) => {
          scene.background = new THREE.Color(0xc9b85a)
          scene.fog = new THREE.FogExp2(0xc9b85a, 0.09)
          scene.add(new THREE.AmbientLight(0xfff3b0, 0.55))
          const hemi = new THREE.HemisphereLight(0xfff8c0, 0x6b5a20, 0.6)
          scene.add(hemi)

          const wallTex = wallpaperTexture(r)
          wallTex.repeat.set(2, 1.5)
          const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 })
          const doorMat = new THREE.MeshBasicMaterial({ color: 0x050403 })
          const floorMat = new THREE.MeshStandardMaterial({ color: 0x8a7d3a, roughness: 1 })
          const ceilMat = new THREE.MeshStandardMaterial({ color: 0xe8dca0, roughness: 0.9 })
          const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffbe0 })

          const size = GRID * CELL
          const floor = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size * 2), floorMat)
          floor.rotation.x = -Math.PI / 2
          scene.add(floor)
          const ceil = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size * 2), ceilMat)
          ceil.rotation.x = Math.PI / 2
          ceil.position.y = WALL_H
          scene.add(ceil)

          // 미로: 랜덤 벽 블록. 복도 경로는 십자 두 줄을 비워둔다
          const wallGeo = new THREE.BoxGeometry(CELL * 0.6, WALL_H, CELL * 0.6)
          const pillars: THREE.Mesh[] = []
          for (let gx = -GRID; gx <= GRID; gx++) {
            for (let gz = -GRID; gz <= GRID; gz++) {
              const onPath = gx === 0 || gz === 0 || gx === 3 || gz === -3
              if (onPath || r() < 0.35) continue
              const m = new THREE.Mesh(wallGeo, r() < 0.08 ? doorMat : wallMat)
              m.position.set(gx * CELL, WALL_H / 2, gz * CELL)
              scene.add(m)
              pillars.push(m)
            }
          }
          // 긴 벽도 몇 개
          const longGeo = new THREE.BoxGeometry(CELL * 3, WALL_H, 0.4)
          for (let i = 0; i < 24; i++) {
            const m = new THREE.Mesh(longGeo, wallMat)
            const gx = Math.floor((r() - 0.5) * GRID * 2)
            const gz = Math.floor((r() - 0.5) * GRID * 2)
            if (gx === 0 || gz === 0 || gx === 3 || gz === -3) continue
            m.position.set(gx * CELL, WALL_H / 2, gz * CELL + CELL / 2)
            if (r() < 0.5) m.rotation.y = Math.PI / 2
            scene.add(m)
          }

          // 형광등 패널
          const lampGeo = new THREE.BoxGeometry(1.6, 0.06, 0.5)
          const lamps: Array<{ m: THREE.Mesh; l: THREE.PointLight; flicker: number; seed: number }> = []
          for (let gx = -GRID; gx <= GRID; gx += 2) {
            for (let gz = -GRID; gz <= GRID; gz += 2) {
              const m = new THREE.Mesh(lampGeo, lampMat.clone())
              m.position.set(gx * CELL, WALL_H - 0.04, gz * CELL)
              scene.add(m)
              const onPath = gx === 0 || gz === 0
              const l = onPath ? new THREE.PointLight(0xfff2b0, 6, 14) : null
              if (l) {
                l.position.set(gx * CELL, WALL_H - 0.3, gz * CELL)
                scene.add(l)
              }
              lamps.push({ m, l: l ?? new THREE.PointLight(0, 0, 0), flicker: r() < 0.3 ? 1 : 0, seed: r() * 100 })
            }
          }

          // 경로: 원점에서 +z 방향으로 가다 90도씩 꺾음
          const path = [new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0, 1.6, -10), new THREE.Vector3(12, 1.6, -12), new THREE.Vector3(12, 1.6, -30)]
          let seg = 0
          let segT = 0
          let yaw = Math.PI // -z를 바라봄
          let targetYaw = Math.PI
          camera.position.copy(path[0]!)
          camera.rotation.order = 'YXZ'
          const speed = 3.2

          return {
            update(dt, t) {
              if (walkingRef.current && seg < path.length - 1) {
                const a = path[seg]!
                const b = path[seg + 1]!
                const len = a.distanceTo(b)
                segT += (speed * dt) / len
                if (segT >= 1) {
                  segT = 0
                  seg = Math.min(seg + 1, path.length - 1)
                }
                const from = path[seg]!
                const to = path[Math.min(seg + 1, path.length - 1)]!
                camera.position.lerpVectors(from, to, segT)
                const dir = to.clone().sub(from)
                if (dir.lengthSq() > 0.001) targetYaw = Math.atan2(-dir.x, -dir.z)
              }
              // 90도 꺾기 보간
              let d = targetYaw - yaw
              while (d > Math.PI) d -= Math.PI * 2
              while (d < -Math.PI) d += Math.PI * 2
              yaw += d * Math.min(1, dt * 2.5)
              camera.rotation.set(Math.sin(t * 0.9) * 0.02, yaw + Math.sin(t * 0.7) * 0.05, Math.sin(t * 1.3) * 0.015)
              camera.position.y = 1.6 + Math.sin(t * 2.2) * 0.05

              for (const lp of lamps) {
                if (!lp.flicker) continue
                const on = Math.sin(t * 17 + lp.seed) + Math.sin(t * 31 + lp.seed * 2) > -0.4
                lp.m.visible = on
                lp.l.intensity = on ? 6 : 0.5
              }
              hemi.intensity = 0.55 + Math.sin(t * 40) * 0.04
            },
            dispose() {
              wallTex.dispose()
              wallMat.dispose()
              doorMat.dispose()
              floorMat.dispose()
              ceilMat.dispose()
              lampMat.dispose()
              wallGeo.dispose()
              longGeo.dispose()
              lampGeo.dispose()
            },
          }
        }}
      />

      {/* VHS 느낌 스캔라인 */}
      <div className="scanlines pointer-events-none absolute inset-0 z-[6]" />
      {flash && <div className="absolute inset-0 z-20 bg-white" />}

      <div className="pointer-events-none absolute top-4 left-4 z-10 text-xs font-bold text-red-600">
        <span className="blink">●</span> REC 1996-05-13 03:33
      </div>
      <div className="pointer-events-none absolute top-4 right-4 z-10 rounded border border-black/40 bg-black/60 px-2 py-0.5 text-xs font-black tracking-widest text-yellow-200">
        LEVEL 0
      </div>

      <div className="absolute inset-x-4 top-1/3 z-10 flex justify-center">
        <AnimatePresence mode="wait">
          {phase === 'dialog' && (
            <motion.div
              key="dialog"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-xs rounded border border-gray-500 bg-[#ececec] p-3 text-left text-gray-900 shadow-2xl"
              style={{ fontFamily: 'Tahoma, system-ui, sans-serif' }}
            >
              <div className="mb-2 flex items-center justify-between border-b border-gray-300 pb-1 text-xs font-bold">
                <span>시스템</span>
                <span className="rounded border border-gray-500 px-1">×</span>
              </div>
              <div className="text-sm">⚠️ {enterLine}</div>
              <div className="mt-3 flex justify-end gap-2" onPointerEnter={() => setSwapped((s) => !s)}>
                {swapped ? (
                  <>
                    <TrollButton label="아니오" onPress={enter} className="btn-ghost text-sm" audio={audio} hoverLabel="예" style={{ color: '#111', borderColor: '#999' }} />
                    <TrollButton label="예" onPress={enter} className="btn text-sm" audio={audio} hoverLabel="아니오" style={{ background: '#2b5cbf', color: '#fff' }} />
                  </>
                ) : (
                  <>
                    <TrollButton label="예" onPress={enter} className="btn text-sm" audio={audio} hoverLabel="아니오" style={{ background: '#2b5cbf', color: '#fff' }} />
                    <TrollButton label="아니오" onPress={enter} className="btn-ghost text-sm" audio={audio} hoverLabel="예" style={{ color: '#111', borderColor: '#999' }} />
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-28 z-10 flex justify-center">
        <AnimatePresence mode="wait">
          {phase === 'walk' && (
            <motion.div
              key={`line-${lineIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glitch rounded bg-black/75 px-4 py-2 text-center text-base font-bold text-yellow-100"
              data-text={lines[lineIdx] ?? ''}
              style={{ maxWidth: 320 }}
            >
              {lines[lineIdx] ?? ''}
            </motion.div>
          )}
          {phase === 'exit' && (
            <motion.div
              key="exit"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="meme-caption text-3xl"
              style={{ color: '#fff8c0' }}
            >
              {exitLine}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
