import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { HEEJIN_LINES, LUCKY_VICKY_LINES, THINKING_MODES } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5000
const CLOVERS = 150
const TYPE_MS = 38

function cloverGeometry(): THREE.BufferGeometry {
  // 잎 4장 + 줄기. 정점 병합 없이 그룹 하나로 합친다.
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.SphereGeometry(0.22, 10, 8)
    leaf.scale(1, 1, 0.35)
    const a = (i / 4) * Math.PI * 2
    leaf.translate(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0)
    parts.push(leaf)
  }
  const stem = new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6)
  stem.translate(0.05, -0.45, 0)
  parts.push(stem)
  return mergeGeometries(parts)
}

/** 간단 병합. 모든 파트가 non-indexed position/normal만 있으면 됨 */
function mergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  for (const g of parts) {
    const ng = g.toNonIndexed()
    positions.push(...Array.from(ng.attributes.position!.array as Float32Array))
    normals.push(...Array.from(ng.attributes.normal!.array as Float32Array))
    ng.dispose()
    g.dispose()
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  return out
}

/** 원영적 사고. 클로버 비 + 럭키비키 대사 타이핑 + 마지막 희진적 사고 한 줄. */
export default function LuckyVicky({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  // 원영적 / 장항준적 / 동현적 사고 중 하나. 2026엔 긍정 사고도 삼파전
  const mode = useMemo(() => pick(THINKING_MODES, rng), [rng])
  const line = useMemo(() => pick(mode.lines ?? LUCKY_VICKY_LINES, rng), [mode, rng])
  const heejin = useMemo(() => pick(HEEJIN_LINES, rng), [rng])
  const capText = mode.tag === '원영적 사고' ? '완전 럭키비키잖아 🍀' : mode.tag === '장항준적 사고' ? '가진 건 없지만 자신은 있다' : '운동 많이 된다'
  const [typed, setTyped] = useState(0)
  const [caption, setCaption] = useState(false)
  const [dark, setDark] = useState(false)
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const burstRef = useRef(false)

  useEffect(() => {
    const chars = Array.from(line).length
    let i = 0
    const typer = window.setInterval(() => {
      i++
      setTyped(i)
      if (i % 3 === 0) audioRef.current.sfx('typing')
      if (i >= chars) window.clearInterval(typer)
    }, TYPE_MS)
    const capT = window.setTimeout(() => {
      setCaption(true)
      burstRef.current = true
      audioRef.current.sfx('sparkle')
      audioRef.current.sfx('tada')
    }, Math.min(3300, chars * TYPE_MS + 250))
    const darkT = window.setTimeout(() => setDark(true), DURATION - 900)
    const end = window.setTimeout(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    return () => {
      window.clearInterval(typer)
      window.clearTimeout(capT)
      window.clearTimeout(darkT)
      window.clearTimeout(end)
    }
  }, [line, onDone])

  const shown = useMemo(() => Array.from(line).slice(0, typed).join(''), [line, typed])

  return (
    <SceneFrame style={{ background: 'linear-gradient(160deg, #ffd6ec 0%, #ffe9f4 40%, #d9fff0 100%)', color: '#3a1a2e' }}>
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, rng: r }) => {
          camera.position.set(0, 0, 9)
          scene.add(new THREE.AmbientLight(0xffffff, 0.9))
          const sun = new THREE.DirectionalLight(0xfff5c0, 2.2)
          sun.position.set(3, 6, 5)
          scene.add(sun)
          const pinkLight = new THREE.PointLight(0xff8fd0, 20, 30)
          pinkLight.position.set(-4, 2, 4)
          scene.add(pinkLight)

          const geo = cloverGeometry()
          const mat = new THREE.MeshStandardMaterial({ color: 0x3ccf5a, emissive: 0x0a5a1e, emissiveIntensity: 0.35, roughness: 0.55, metalness: 0.05 })
          const inst = new THREE.InstancedMesh(geo, mat, CLOVERS)
          scene.add(inst)

          const dummy = new THREE.Object3D()
          const items = Array.from({ length: CLOVERS }, () => ({
            x: (r() - 0.5) * 14,
            y: (r() - 0.5) * 20,
            z: (r() - 0.5) * 8 - 1,
            speed: 0.6 + r() * 1.2,
            rot: new THREE.Vector3(r() * 2, r() * 2, r() * 2),
            phase: r() * Math.PI * 2,
            scale: 0.6 + r() * 0.9,
          }))

          // 반짝이
          const N = 180
          const pos = new Float32Array(N * 3)
          for (let i = 0; i < N; i++) {
            pos[i * 3] = (r() - 0.5) * 16
            pos[i * 3 + 1] = (r() - 0.5) * 16
            pos[i * 3 + 2] = (r() - 0.5) * 8
          }
          const pGeo = new THREE.BufferGeometry()
          pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
          const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })
          const sparkles = new THREE.Points(pGeo, pMat)
          scene.add(sparkles)

          let burstT = -1

          return {
            update(dt, t) {
              if (burstRef.current && burstT < 0) burstT = t
              const boost = burstT >= 0 ? Math.max(0, 1 - (t - burstT) / 1.2) * 6 : 0
              for (let i = 0; i < CLOVERS; i++) {
                const it = items[i]!
                it.y -= dt * (it.speed + boost)
                it.x += Math.sin(t * 0.9 + it.phase) * dt * 0.4
                if (it.y < -11) {
                  it.y = 11
                  it.x = (r() - 0.5) * 14
                }
                dummy.position.set(it.x, it.y, it.z)
                dummy.rotation.set(t * it.rot.x + it.phase, t * it.rot.y, t * it.rot.z)
                const s = it.scale * (burstT >= 0 ? 1 + boost * 0.08 : 1)
                dummy.scale.setScalar(s)
                dummy.updateMatrix()
                inst.setMatrixAt(i, dummy.matrix)
              }
              inst.instanceMatrix.needsUpdate = true
              sparkles.rotation.y = t * 0.08
              sparkles.rotation.x = Math.sin(t * 0.2) * 0.1
              pMat.opacity = 0.6 + Math.sin(t * 4) * 0.25 + boost * 0.05
              camera.position.x = Math.sin(t * 0.5) * 0.8
              camera.position.y = Math.cos(t * 0.35) * 0.5
              camera.lookAt(0, 0, 0)
            },
            dispose() {
              geo.dispose()
              mat.dispose()
              pGeo.dispose()
              pMat.dispose()
            },
          }
        }}
      />

      <div className="relative z-10 flex w-full max-w-[340px] flex-col items-center gap-4">
        <motion.div
          animate={{ y: [0, -18, 0], rotate: [0, -10, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
          className="text-7xl drop-shadow-[0_6px_8px_rgba(0,0,0,0.25)]"
        >
          🍀
        </motion.div>

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="relative w-full rounded-3xl bg-white/90 px-5 py-4 text-left text-base font-bold leading-relaxed shadow-xl"
          style={{ color: '#3a1a2e', minHeight: 110, wordBreak: 'keep-all' }}
        >
          <span className="absolute -top-3 left-6 rounded-full px-3 py-0.5 text-xs font-black text-white" style={{ background: mode.color }}>
            {mode.tag}
          </span>
          {shown}
          <span className="blink">|</span>
        </motion.div>

        <div className="h-16">
          <AnimatePresence>
            {caption && (
              <motion.div
                key="cap"
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: [0, 1.35, 1], rotate: [-12, 4, -3] }}
                transition={{ duration: 0.45 }}
                className="meme-caption text-3xl"
              >
                {capText}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {dark && (
          <motion.div
            key="heejin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 px-8 text-center"
          >
            <motion.div initial={{ y: 12 }} animate={{ y: 0 }} className="text-2xl font-black text-gray-200">
              <div className="mb-2 text-xs font-semibold tracking-widest text-gray-500">희진적 사고</div>
              {heejin}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SceneFrame>
  )
}
