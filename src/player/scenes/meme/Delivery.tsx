import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextSprite } from '../../../three/textTexture'
import { DELIVERY } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5500
const STEP_MS = 700
const PASTEL = ['#ffd6e0', '#c9e4ff', '#d4f5d0', '#fff1b8', '#e6d6ff', '#ffe0c2', '#c2f0f0']

/** 배달앱 배달 추적 패러디. 3D 미니 도시 위를 라이더가 돌아다니다 딴 데로 샘. */
export default function Delivery({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const store = useMemo(() => pick(DELIVERY.store, rng), [rng])
  const fee = useMemo(() => pick(DELIVERY.fee, rng), [rng])
  const doneLine = useMemo(() => pick(DELIVERY.done, rng), [rng])
  const [step, setStep] = useState(0)
  const [etaIdx, setEtaIdx] = useState(0)
  const [bump, setBump] = useState(false)
  const doneRef = useRef(false)
  const stepRef = useRef(0)
  stepRef.current = step

  useEffect(() => {
    const timers: number[] = []
    for (let i = 1; i < DELIVERY.steps.length; i++) {
      timers.push(
        window.setTimeout(() => {
          setStep(i)
          if (i === DELIVERY.steps.length - 1) audio.sfx('kakao')
          else audio.sfx('tick')
        }, i * STEP_MS),
      )
    }
    // ETA 3분 -> 12분 -> 47분 -> 알 수 없음
    for (let i = 1; i < DELIVERY.eta.length; i++) {
      timers.push(
        window.setTimeout(() => {
          setEtaIdx(i)
          setBump(true)
          audio.sfx('error')
          timers.push(window.setTimeout(() => setBump(false), 350))
        }, 900 + i * 1100),
      )
    }
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
        scene.background = new THREE.Color('#dfe9f3')
        scene.fog = new THREE.Fog('#dfe9f3', 14, 30)
        camera.position.set(0, 12, 9)
        camera.lookAt(0, 0, 0)

        scene.add(new THREE.AmbientLight('#ffffff', 0.9))
        const sun = new THREE.DirectionalLight('#fff4d6', 1.6)
        sun.position.set(5, 12, 4)
        scene.add(sun)

        // 바닥 + 도로
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#8fc48f' }))
        ground.rotation.x = -Math.PI / 2
        ground.position.y = -0.01
        scene.add(ground)
        const roadMat = new THREE.MeshStandardMaterial({ color: '#3a3a44' })
        const spacing = 3
        for (let i = -3; i <= 3; i++) {
          const h = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.9), roadMat)
          h.rotation.x = -Math.PI / 2
          h.position.set(0, 0, i * spacing)
          scene.add(h)
          const v = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 40), roadMat)
          v.rotation.x = -Math.PI / 2
          v.position.set(i * spacing, 0, 0)
          scene.add(v)
        }

        // 건물
        for (let gx = -3; gx < 3; gx++) {
          for (let gz = -3; gz < 3; gz++) {
            if (r() < 0.15) continue
            const hgt = 0.6 + r() * 2.6
            const b = new THREE.Mesh(
              new THREE.BoxGeometry(1.7, hgt, 1.7),
              new THREE.MeshStandardMaterial({ color: PASTEL[Math.floor(r() * PASTEL.length)]!, roughness: 0.7 }),
            )
            b.position.set(gx * spacing + spacing / 2, hgt / 2, gz * spacing + spacing / 2)
            scene.add(b)
          }
        }

        // 목적지 핀
        const dest = new THREE.Vector3(6, 0, -6)
        const pin = new THREE.Group()
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1, 16), new THREE.MeshStandardMaterial({ color: '#ff3b5c', emissive: '#ff3b5c', emissiveIntensity: 0.4 }))
        cone.rotation.x = Math.PI
        cone.position.y = 0.5
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), new THREE.MeshStandardMaterial({ color: '#ff3b5c', emissive: '#ff3b5c', emissiveIntensity: 0.5 }))
        ball.position.y = 1.2
        pin.add(cone, ball)
        const home = makeTextSprite('우리집', 0.9, { color: '#fff', stroke: '#c0002a', strokeWidth: 12, size: 72 })
        home.position.y = 2.3
        pin.add(home)
        pin.position.copy(dest)
        scene.add(pin)

        // 라이더
        const rider = new THREE.Group()
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: '#2ac1bc' }))
        body.position.y = 0.45
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshStandardMaterial({ color: '#ffd400' }))
        head.position.set(0, 0.9, 0)
        const wheelMat = new THREE.MeshStandardMaterial({ color: '#222' })
        const w1 = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.07, 8, 16), wheelMat)
        w1.position.set(0.35, 0.2, 0)
        const w2 = w1.clone()
        w2.position.x = -0.35
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.45), new THREE.MeshStandardMaterial({ color: '#ff6f0f' }))
        bag.position.set(-0.4, 0.7, 0)
        rider.add(body, head, w1, w2, bag)
        scene.add(rider)

        // 도로 격자 위 경로. 목적지 향하다가 반대로 샜다가 복귀
        const waypoints = [
          new THREE.Vector3(-6, 0, 6),
          new THREE.Vector3(-6, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(3, 0, 0),
          new THREE.Vector3(3, 0, -3),
          // 딴 데로 샘
          new THREE.Vector3(-3, 0, -3),
          new THREE.Vector3(-3, 0, 3),
          new THREE.Vector3(0, 0, 3),
          // 복귀
          new THREE.Vector3(6, 0, 3),
          new THREE.Vector3(6, 0, -6),
        ]
        rider.position.copy(waypoints[0]!)
        let seg = 0
        let segT = 0
        const speed = 5.5
        const tmp = new THREE.Vector3()

        return {
          update: (dt: number, t: number) => {
            pin.position.y = Math.sin(t * 4) * 0.15
            pin.rotation.y = t * 1.5
            if (seg < waypoints.length - 1) {
              const a = waypoints[seg]!
              const b = waypoints[seg + 1]!
              const len = a.distanceTo(b)
              segT += (dt * speed) / len
              if (segT >= 1) {
                segT = 0
                seg++
              } else {
                tmp.lerpVectors(a, b, segT)
                rider.position.copy(tmp)
                rider.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x)
              }
            }
            rider.position.y = Math.abs(Math.sin(t * 20)) * 0.04
            w1.rotation.x += dt * 12
            w2.rotation.x += dt * 12
            camera.position.x = Math.sin(t * 0.3) * 2
            camera.lookAt(rider.position.x * 0.5, 0, rider.position.z * 0.5)
          },
        }
      },
    [],
  )

  const eta = DELIVERY.eta[etaIdx]!

  return (
    <SceneFrame style={{ background: '#dfe9f3', color: '#111', fontFamily: 'system-ui, sans-serif' }} className="justify-end p-0">
      <ThreeCanvas init={init} rng={rng} alpha={false} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white px-5 pb-6 pt-4 text-left shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-200" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">{store}</div>
            <motion.div
              key={etaIdx}
              initial={bump ? { scale: 1.4, color: '#e11d48' } : { scale: 1 }}
              animate={{ scale: 1, color: etaIdx >= 2 ? '#e11d48' : '#111' }}
              className="text-2xl font-black"
            >
              {eta}
            </motion.div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>{fee}</div>
            <div>메뉴: 답변 1개</div>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {DELIVERY.steps.map((s, i) => (
            <li key={s} className={`flex items-center gap-2 ${i <= step ? 'text-gray-900' : 'text-gray-300'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${i < step ? 'bg-teal-500 text-white' : i === step ? 'bg-teal-100 text-teal-700' : 'bg-gray-100'}`}>
                {i < step ? '✓' : i === step ? '●' : ''}
              </span>
              <span className={i === 4 && step >= 4 ? 'font-bold text-red-500' : ''}>{s}</span>
            </li>
          ))}
        </ul>
        {step >= DELIVERY.steps.length - 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl bg-yellow-100 px-3 py-2 text-sm font-bold text-yellow-900">
            {doneLine}
          </motion.div>
        )}
      </div>
    </SceneFrame>
  )
}
