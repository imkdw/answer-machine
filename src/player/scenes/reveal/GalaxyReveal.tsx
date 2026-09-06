import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { sampleTextPoints } from '../../../three/textTexture'
import type { SceneProps } from '../../types'

const COUNT = 2500
const SWIRL_END = 1.6
const FORM_END = 2.8
const SHOW_AT = 3200
const CAMERA_Z = 10

/** 은하수 파티클이 모여서 답변 글자를 만든다. */
export default function GalaxyReveal({ answer, onDone, audio, rng }: SceneProps): React.JSX.Element {
  const [show, setShow] = useState(false)
  const doneRef = useRef(false)
  const failed = useRef(false)
  const answerRef = useRef(answer)
  answerRef.current = answer

  useEffect(() => {
    const drum = audio.sfx('drumroll')
    const timers: number[] = []
    const finish = (): void => {
      if (doneRef.current) return
      doneRef.current = true
      setShow(true)
      onDone()
    }
    timers.push(window.setTimeout(() => drum.stop(), SWIRL_END * 1000))
    timers.push(window.setTimeout(() => audio.sfx('sparkle'), SWIRL_END * 1000 + 100))
    timers.push(window.setTimeout(() => audio.sfx('tada'), FORM_END * 1000))
    timers.push(
      window.setTimeout(() => {
        if (failed.current) finish()
      }, 1000),
    )
    timers.push(window.setTimeout(finish, SHOW_AT))
    return () => {
      drum.stop()
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [audio, onDone])

  const init = useMemo(
    () =>
      ({ scene, camera, width, height, rng: r }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; width: number; height: number; rng: () => number }) => {
        camera.position.set(0, 0, CAMERA_Z)
        camera.lookAt(0, 0, 0)
        scene.fog = new THREE.FogExp2('#0b0b12', 0.02)

        const pts = sampleTextPoints(answerRef.current, { count: COUNT, maxWidth: 560, rng: r })
        // 화면 폭에 맞춰 스케일. 세로 화면에서 텍스트 높이 2.2 기준
        const visibleH = 2 * Math.tan((camera.fov * Math.PI) / 360) * CAMERA_Z
        const visibleW = visibleH * (width / height)
        let maxX = 0
        let maxY = 0
        for (const p of pts) {
          maxX = Math.max(maxX, Math.abs(p.x))
          maxY = Math.max(maxY, Math.abs(p.y))
        }
        let scale = 2.2
        if (maxX * scale * 2 > visibleW * 0.9) scale = (visibleW * 0.9) / (maxX * 2)
        if (maxY * scale * 2 > visibleH * 0.6) scale = Math.min(scale, (visibleH * 0.6) / (maxY * 2))

        const n = Math.max(pts.length, 1)
        const start = new Float32Array(n * 3)
        const target = new Float32Array(n * 3)
        const pos = new Float32Array(n * 3)
        const colors = new Float32Array(n * 3)
        const c = new THREE.Color()
        for (let i = 0; i < n; i++) {
          const p = pts[i] ?? { x: 0, y: 0 }
          target[i * 3] = p.x * scale
          target[i * 3 + 1] = p.y * scale
          target[i * 3 + 2] = (r() - 0.5) * 0.15
          const arm = Math.floor(r() * 3)
          const dist = 1 + r() * 7
          const a = arm * ((Math.PI * 2) / 3) + dist * 0.7 + (r() - 0.5) * 0.6
          start[i * 3] = Math.cos(a) * dist
          start[i * 3 + 1] = Math.sin(a) * dist
          start[i * 3 + 2] = (r() - 0.5) * 4
          c.setHSL(((p.x * scale) / (maxX * scale * 2 || 1) + 0.5 + 0.1) % 1, 1, 0.65)
          colors[i * 3] = c.r
          colors[i * 3 + 1] = c.g
          colors[i * 3 + 2] = c.b
        }
        pos.set(start)
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        const mat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })
        const points = new THREE.Points(geo, mat)
        scene.add(points)

        // 배경 먼지
        const dustGeo = new THREE.BufferGeometry()
        const dust = new Float32Array(600 * 3)
        for (let i = 0; i < 600; i++) {
          dust[i * 3] = (r() - 0.5) * 30
          dust[i * 3 + 1] = (r() - 0.5) * 30
          dust[i * 3 + 2] = -5 - r() * 20
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3))
        const dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#8899ff', size: 0.05, transparent: true, opacity: 0.6 }))
        scene.add(dustPts)

        const ease = (x: number): number => 1 - Math.pow(1 - x, 3)
        return {
          update: (_dt: number, t: number) => {
            const attr = geo.attributes.position as THREE.BufferAttribute
            const arr = attr.array as Float32Array
            if (t < SWIRL_END) {
              const rot = t * 1.4
              const cs = Math.cos(rot)
              const sn = Math.sin(rot)
              for (let i = 0; i < n; i++) {
                const x = start[i * 3]!
                const y = start[i * 3 + 1]!
                const d = Math.hypot(x, y)
                const spin = rot * (1 + 2 / (d + 0.5))
                const cs2 = Math.cos(spin)
                const sn2 = Math.sin(spin)
                arr[i * 3] = x * cs2 - y * sn2
                arr[i * 3 + 1] = x * sn2 + y * cs2
                arr[i * 3 + 2] = start[i * 3 + 2]! * cs + Math.sin(t * 3 + i) * 0.1 * sn
              }
              points.rotation.z = 0
            } else if (t < FORM_END) {
              const k = ease((t - SWIRL_END) / (FORM_END - SWIRL_END))
              const rot = SWIRL_END * 1.4
              for (let i = 0; i < n; i++) {
                const x = start[i * 3]!
                const y = start[i * 3 + 1]!
                const d = Math.hypot(x, y)
                const spin = rot * (1 + 2 / (d + 0.5)) + (1 - k) * 2
                const sx = x * Math.cos(spin) - y * Math.sin(spin)
                const sy = x * Math.sin(spin) + y * Math.cos(spin)
                arr[i * 3] = sx + (target[i * 3]! - sx) * k
                arr[i * 3 + 1] = sy + (target[i * 3 + 1]! - sy) * k
                arr[i * 3 + 2] = start[i * 3 + 2]! * (1 - k) + target[i * 3 + 2]! * k
              }
            } else {
              for (let i = 0; i < n; i++) {
                arr[i * 3] = target[i * 3]! + Math.sin(t * 2 + i * 0.37) * 0.02
                arr[i * 3 + 1] = target[i * 3 + 1]! + Math.cos(t * 2.3 + i * 0.11) * 0.02
                arr[i * 3 + 2] = target[i * 3 + 2]!
              }
              points.rotation.z = Math.sin(t * 0.5) * 0.04
              points.rotation.y = Math.sin(t * 0.4) * 0.08
            }
            attr.needsUpdate = true
            dustPts.rotation.z = t * 0.05
            mat.size = t < SWIRL_END ? 0.07 : 0.06 + Math.sin(t * 6) * 0.01
          },
        }
      },
    [],
  )

  return (
    <SceneFrame>
      <ThreeCanvas init={init} rng={rng} onError={() => (failed.current = true)} />
      {show && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative z-10 flex flex-col items-center gap-3">
          <div className="answer-text max-w-[90vw]" style={{ textShadow: '0 0 24px var(--accent), 0 2px 0 rgba(0,0,0,0.5)' }}>
            {answer}
          </div>
          <div className="text-sm opacity-70">답변 소환 완료</div>
        </motion.div>
      )}
    </SceneFrame>
  )
}
