import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextPlane } from '../../../three/textTexture'
import { EOJJEOL_CHAIN, MEME_CAPTIONS } from '../../../copy/memes'
import type { SceneProps } from '../../types'

const DURATION = 4500
const NEON = ['#ff2d95', '#2dffea', '#fff200', '#7cff4a', '#ff7a2d', '#a78bfa', '#ff4fd8', '#4fffd8']
const PLANE_COUNT = 36
const DEPTH = 60

/** 어쩔티비 무한 터널. 뇌절 카운터가 올라가고 끝에 "그만". */
export default function MemeTunnel({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const [level, setLevel] = useState(1)
  const [flash, setFlash] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    audio.sfx('whoosh')
    const timers: number[] = []
    for (let i = 2; i <= 12; i++) timers.push(window.setTimeout(() => setLevel(i), (i - 1) * 350))
    timers.push(window.setTimeout(() => audio.sfx('static'), DURATION - 900))
    timers.push(
      window.setTimeout(() => {
        setFlash(true)
        audio.sfx('bang')
      }, DURATION - 500),
    )
    timers.push(
      window.setTimeout(() => {
        if (doneRef.current) return
        doneRef.current = true
        onDone()
      }, DURATION),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [audio, onDone])

  const init = useMemo(
    () =>
      ({ scene, camera, rng: r }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; rng: () => number }) => {
        scene.background = new THREE.Color('#05010f')
        scene.fog = new THREE.Fog('#05010f', 8, DEPTH * 0.8)
        camera.position.set(0, 0, 0)
        camera.lookAt(0, 0, -1)

        // 별
        const starGeo = new THREE.BufferGeometry()
        const starPos = new Float32Array(900 * 3)
        for (let i = 0; i < 900; i++) {
          const a = r() * Math.PI * 2
          const rad = 4 + r() * 12
          starPos[i * 3] = Math.cos(a) * rad
          starPos[i * 3 + 1] = Math.sin(a) * rad
          starPos[i * 3 + 2] = -r() * DEPTH
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
        const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.08, transparent: true, opacity: 0.8 }))
        scene.add(stars)

        // 조명
        scene.add(new THREE.AmbientLight('#ffffff', 0.6))
        const lights = [0, 1, 2].map((i) => {
          const l = new THREE.PointLight('#ff2d95', 30, 40)
          l.position.set(Math.cos(i * 2.1) * 3, Math.sin(i * 2.1) * 3, -6 - i * 8)
          scene.add(l)
          return l
        })

        // 텍스트 링
        const words: string[] = []
        for (let i = 0; i < PLANE_COUNT; i++) {
          words.push(r() < 0.3 ? MEME_CAPTIONS[Math.floor(r() * MEME_CAPTIONS.length)]! : EOJJEOL_CHAIN[i % EOJJEOL_CHAIN.length]!)
        }
        const planes = words.map((w, i) => {
          const mesh = makeTextPlane(w, 0.9, { color: NEON[Math.floor(r() * NEON.length)]!, stroke: '#000', strokeWidth: 14, size: 96 })
          const a = (i / PLANE_COUNT) * Math.PI * 2 * 3 + r() * 0.4
          const rad = 3.5
          mesh.position.set(Math.cos(a) * rad, Math.sin(a) * rad, -(i / PLANE_COUNT) * DEPTH - 2)
          mesh.lookAt(0, 0, mesh.position.z)
          mesh.rotateY(Math.PI)
          mesh.userData.angle = a
          scene.add(mesh)
          return mesh
        })

        let speed = 6
        const color = new THREE.Color()
        return {
          update: (dt: number, t: number) => {
            speed += dt * 9
            const dz = speed * dt
            for (const p of planes) {
              p.position.z += dz
              const a = (p.userData.angle as number) + t * 0.6
              p.position.x = Math.cos(a) * 3.5
              p.position.y = Math.sin(a) * 3.5
              p.lookAt(0, 0, p.position.z)
              p.rotateY(Math.PI)
              if (p.position.z > 1) p.position.z -= DEPTH
            }
            const sp = starGeo.attributes.position as THREE.BufferAttribute
            for (let i = 0; i < sp.count; i++) {
              let z = sp.getZ(i) + dz * 1.5
              if (z > 0) z -= DEPTH
              sp.setZ(i, z)
            }
            sp.needsUpdate = true
            lights.forEach((l, i) => {
              color.setHSL((t * 0.25 + i / 3) % 1, 1, 0.55)
              l.color.copy(color)
              l.position.z += dz
              if (l.position.z > 2) l.position.z -= 30
            })
            camera.rotation.z = Math.sin(t * 1.3) * 0.15 + t * 0.15
            camera.position.x = Math.sin(t * 2.2) * 0.25
            camera.position.y = Math.cos(t * 1.7) * 0.25
          },
        }
      },
    [],
  )

  const label = level >= 5 ? `뇌절 ${level}절` : `${level}절`

  return (
    <SceneFrame style={{ background: '#05010f' }}>
      <ThreeCanvas init={init} rng={rng} alpha={false} />
      <motion.div key={level} initial={{ scale: 0.4, rotate: -10 }} animate={{ scale: 1 + level * 0.06, rotate: (level % 2 ? 1 : -1) * 4 }} className="meme-caption relative z-10 text-5xl">
        {flash ? '그만' : label}
      </motion.div>
      {flash && <motion.div className="absolute inset-0 z-20 bg-white" initial={{ opacity: 1 }} animate={{ opacity: 0.2 }} transition={{ duration: 0.5 }} />}
    </SceneFrame>
  )
}
