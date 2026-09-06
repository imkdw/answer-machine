import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextTexture } from '../../../three/textTexture'
import { Confetti } from './Confetti'
import type { SceneProps } from '../../types'

const SPIN_END = 2.2
const LAND_END = 3.0
const SHOW_AT = 3200
const DECOYS = ['?', '궁금?', '곧 나옴', 'ㅋㅋ', '여기 아님']
const DECOY_BG = ['#2dffea', '#ffd400', '#7cff4a', '#a78bfa', '#ff7a2d']
// BoxGeometry 면 순서: +x -x +y -y +z -z. 답변은 +z 면
const ANSWER_FACE = 4

/** 3D 큐브가 미친 듯이 돌다가 답변 면으로 착지. */
export default function CubeReveal({ answer, onDone, audio, rng }: SceneProps): React.JSX.Element {
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
      audio.sfx('pop')
      audio.sfx('tada')
      onDone()
    }
    timers.push(window.setTimeout(() => drum.stop(), SPIN_END * 1000))
    timers.push(window.setTimeout(() => audio.sfx('whoosh'), LAND_END * 1000 - 300))
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
      ({ scene, camera, rng: r }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; rng: () => number }) => {
        camera.position.set(0, 1.2, 9)
        camera.lookAt(0, 0, 0)
        scene.fog = new THREE.FogExp2('#0b0b12', 0.03)

        const textures: THREE.Texture[] = []
        const mats: THREE.MeshStandardMaterial[] = []
        for (let i = 0; i < 6; i++) {
          const isAnswer = i === ANSWER_FACE
          const tt = isAnswer
            ? makeTextTexture(answerRef.current, { maxWidth: 800, size: 72, color: '#fff', stroke: '#000', strokeWidth: 10, background: '#ff2d95', padding: 60 })
            : makeTextTexture(DECOYS[i > ANSWER_FACE ? i - 1 : i]!, { size: 160, color: '#111', background: DECOY_BG[i > ANSWER_FACE ? i - 1 : i]!, padding: 80 })
          // 정사각 면에 맞추기: 캔버스 비율 무시하고 늘림 (텍스트가 살짝 늘어나도 병맛)
          textures.push(tt.texture)
          mats.push(new THREE.MeshStandardMaterial({ map: tt.texture, roughness: 0.35, metalness: 0.2, emissive: isAnswer ? '#ff2d95' : '#000', emissiveIntensity: isAnswer ? 0.15 : 0 }))
        }
        const cube = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), mats)
        scene.add(cube)

        scene.add(new THREE.AmbientLight('#ffffff', 0.5))
        const lights = ['#ff2d95', '#2dffea', '#fff200'].map((col, i) => {
          const l = new THREE.PointLight(col, 60, 30)
          l.position.set(Math.cos(i * 2.1) * 5, 2, Math.sin(i * 2.1) * 5)
          scene.add(l)
          return l
        })

        // 주변 작은 큐브 링
        const ring = new THREE.Group()
        for (let i = 0; i < 14; i++) {
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.3, 0.3),
            new THREE.MeshStandardMaterial({ color: DECOY_BG[i % DECOY_BG.length]!, emissive: DECOY_BG[i % DECOY_BG.length]!, emissiveIntensity: 0.6 }),
          )
          const a = (i / 14) * Math.PI * 2
          m.position.set(Math.cos(a) * 4, Math.sin(a * 2) * 0.6, Math.sin(a) * 4)
          ring.add(m)
        }
        scene.add(ring)

        // 바닥 반사 느낌
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: '#15121f', roughness: 0.2, metalness: 0.8 }))
        floor.rotation.x = -Math.PI / 2
        floor.position.y = -2.2
        scene.add(floor)

        const spinAxis = new THREE.Vector3(0.6 + r() * 0.4, 1, 0.3 + r() * 0.5).normalize()
        const landQuat = new THREE.Quaternion() // +z 면이 카메라를 봄 = 단위 쿼터니언
        let fromQuat: THREE.Quaternion | null = null
        const q = new THREE.Quaternion()

        return {
          update: (dt: number, t: number) => {
            const color = new THREE.Color()
            lights.forEach((l, i) => {
              const a = t * 1.5 + i * 2.1
              l.position.set(Math.cos(a) * 5, 2 + Math.sin(t * 2 + i), Math.sin(a) * 5)
              color.setHSL((t * 0.2 + i / 3) % 1, 1, 0.55)
              l.color.copy(color)
            })
            ring.rotation.y = t * 0.8
            ring.children.forEach((m, i) => {
              m.rotation.x += dt * 2
              m.rotation.y += dt * 3
              m.position.y = Math.sin(t * 2 + i) * 0.6
            })

            if (t < SPIN_END) {
              const speed = 9 * (1 - Math.pow(t / SPIN_END, 2)) + 1.5
              q.setFromAxisAngle(spinAxis, speed * dt)
              cube.quaternion.multiply(q)
              cube.position.y = Math.sin(t * 5) * 0.2
            } else if (t < LAND_END) {
              if (!fromQuat) fromQuat = cube.quaternion.clone()
              const k = (t - SPIN_END) / (LAND_END - SPIN_END)
              const e = 1 - Math.pow(1 - k, 3)
              cube.quaternion.slerpQuaternions(fromQuat, landQuat, e)
              cube.position.y = Math.sin(t * 5) * 0.2 * (1 - k)
            } else {
              cube.quaternion.copy(landQuat)
              cube.rotation.y = Math.sin(t * 1.2) * 0.06
              cube.rotation.x = Math.cos(t * 0.9) * 0.04
              cube.position.y = Math.sin(t * 1.5) * 0.08
              camera.position.z = Math.max(6.5, camera.position.z - dt * 2.5)
              camera.position.y = Math.max(0.2, camera.position.y - dt * 0.8)
              camera.lookAt(0, 0, 0)
            }
          },
          dispose: () => textures.forEach((tx) => tx.dispose()),
        }
      },
    [],
  )

  return (
    <SceneFrame>
      <ThreeCanvas init={init} rng={rng} onError={() => (failed.current = true)} />
      {show && <Confetti rng={rng} />}
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="answer-text relative z-10 max-w-[90vw] rounded-3xl px-6 py-4"
          style={{ background: 'color-mix(in srgb, var(--bg) 82%, transparent)', color: 'var(--fg)', border: '2px solid var(--accent)', textShadow: '0 0 18px var(--accent)' }}
        >
          {answer}
        </motion.div>
      )}
    </SceneFrame>
  )
}
