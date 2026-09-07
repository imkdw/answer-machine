import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { makeTextTexture } from '../../../three/textTexture'
import { COIN } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 8000
const AUTO_FLIP_1 = 1500
const AUTO_FLIP_2 = 4200
const END_AT = 7000
const COIN_R = 1.6
const COIN_T = 0.22
const TABLE_Y = 0
const GRAVITY = 18

type Phase = 'idle' | 'air' | 'edge' | 'roll' | 'gone'

/** 동전 던지기. 첫 번째는 옆면으로 서고, 두 번째는 굴러서 도망간다. */
export default function CoinFlip({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const title = useMemo(() => pick(COIN.title, rng), [rng])
  const hint = useMemo(() => pick(COIN.hint, rng), [rng])
  const edgeLine = useMemo(() => pick(COIN.edge, rng), [rng])
  const rollLine = useMemo(() => pick(COIN.roll, rng), [rng])
  const endLine = useMemo(() => pick(COIN.end, rng), [rng])

  const [caption, setCaption] = useState<{ id: number; text: string } | null>(null)
  const [flips, setFlips] = useState(0)
  const [ended, setEnded] = useState(false)
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  const capSeq = useRef(0)
  /** 던지기 요청 큐. update()가 소비 */
  const flipQueue = useRef(0)
  const flipCount = useRef(0)

  const showCaption = (text: string): void => {
    const id = ++capSeq.current
    setCaption({ id, text })
  }
  const showCaptionRef = useRef(showCaption)
  showCaptionRef.current = showCaption

  const requestFlip = (): void => {
    if (flipCount.current >= 2) return
    flipCount.current++
    flipQueue.current++
    setFlips(flipCount.current)
    audioRef.current.sfx('coin')
  }
  const requestFlipRef = useRef(requestFlip)
  requestFlipRef.current = requestFlip

  useEffect(() => {
    const timers: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timers.push(window.setTimeout(fn, ms))
    }
    later(() => {
      if (flipCount.current < 1) requestFlipRef.current()
    }, AUTO_FLIP_1)
    later(() => {
      if (flipCount.current < 2) requestFlipRef.current()
    }, AUTO_FLIP_2)
    later(() => {
      setEnded(true)
      audioRef.current.sfx('boo')
    }, END_AT)
    later(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [onDone])

  return (
    <SceneFrame style={{ background: 'radial-gradient(circle at 50% 30%, #1d5a3a 0%, #071a10 75%)', color: '#fff' }}>
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, renderer, rng: r }) => {
          const camBase = new THREE.Vector3(0, 4.5, 9)
          camera.position.copy(camBase)
          camera.lookAt(0, 1, 0)
          scene.fog = new THREE.Fog(0x071a10, 14, 34)
          scene.add(new THREE.AmbientLight(0xffffff, 0.35))
          const spot = new THREE.SpotLight(0xfff3d0, 180, 40, Math.PI / 5, 0.5, 1.4)
          spot.position.set(2, 10, 4)
          spot.target.position.set(0, 0, 0)
          scene.add(spot)
          scene.add(spot.target)
          const rim = new THREE.PointLight(0x2dffea, 30, 20)
          rim.position.set(-5, 3, -3)
          scene.add(rim)
          const rim2 = new THREE.PointLight(0xff2d95, 25, 20)
          rim2.position.set(5, 2, 2)
          scene.add(rim2)

          // 펠트 테이블
          const table = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshStandardMaterial({ color: 0x1f7a4a, roughness: 1, metalness: 0 }))
          table.rotation.x = -Math.PI / 2
          table.position.y = TABLE_Y
          scene.add(table)
          const ring = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.4, 64), new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.5, side: THREE.DoubleSide }))
          ring.rotation.x = -Math.PI / 2
          ring.position.y = TABLE_Y + 0.01
          scene.add(ring)

          // 동전
          const heads = makeTextTexture(COIN.faces.heads, { size: 140, color: '#7a4b00', stroke: '#fff2b0', strokeWidth: 10, background: '#ffd54a', padding: 90 })
          const tails = makeTextTexture(COIN.faces.tails, { size: 120, color: '#7a4b00', stroke: '#fff2b0', strokeWidth: 10, background: '#f4b400', padding: 80 })
          const goldSide = new THREE.MeshStandardMaterial({ color: 0xe8b400, metalness: 0.85, roughness: 0.3 })
          const faceMat = (tex: THREE.CanvasTexture): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ map: tex, metalness: 0.7, roughness: 0.35, color: 0xffffff })
          const coinGeo = new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_T, 48)
          const coin = new THREE.Mesh(coinGeo, [goldSide, faceMat(heads.texture), faceMat(tails.texture)])
          const coinGroup = new THREE.Group()
          coinGroup.add(coin)
          // 초기: 테이블에 눕힘 (앞면 위)
          coinGroup.position.set(0, TABLE_Y + COIN_T / 2, 0)
          coinGroup.rotation.set(0, 0, 0)
          scene.add(coinGroup)

          // 그림자 대용 원반
          const shadow = new THREE.Mesh(new THREE.CircleGeometry(COIN_R * 1.05, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }))
          shadow.rotation.x = -Math.PI / 2
          shadow.position.y = TABLE_Y + 0.005
          scene.add(shadow)

          // 먼지/반짝이
          const PN = 180
          const pPos = new Float32Array(PN * 3)
          for (let i = 0; i < PN; i++) {
            pPos[i * 3] = (r() - 0.5) * 14
            pPos[i * 3 + 1] = r() * 7
            pPos[i * 3 + 2] = (r() - 0.5) * 10
          }
          const pGeo = new THREE.BufferGeometry()
          pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
          const pMat = new THREE.PointsMaterial({ color: 0xfff1a8, size: 0.08, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })
          scene.add(new THREE.Points(pGeo, pMat))

          // 착지 스파크 풀
          interface Burst {
            pts: THREE.Points
            vel: Float32Array
            t0: number
          }
          const bursts: Burst[] = []
          const BN = 40
          const spawnBurst = (at: THREE.Vector3, t: number): void => {
            const pos = new Float32Array(BN * 3)
            const vel = new Float32Array(BN * 3)
            for (let i = 0; i < BN; i++) {
              pos[i * 3] = at.x
              pos[i * 3 + 1] = at.y
              pos[i * 3 + 2] = at.z
              const a = r() * Math.PI * 2
              const sp = 1.5 + r() * 3
              vel[i * 3] = Math.cos(a) * sp
              vel[i * 3 + 1] = 1 + r() * 3
              vel[i * 3 + 2] = Math.sin(a) * sp
            }
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
            const mat = new THREE.PointsMaterial({ color: 0xffd54a, size: 0.14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
            const pts = new THREE.Points(geo, mat)
            scene.add(pts)
            bursts.push({ pts, vel, t0: t })
          }

          // 물리 상태
          let phase: Phase = 'idle'
          let vy = 0
          let spinSpeed = 0
          let spinAxis: 'x' | 'z' = 'x'
          let landedT = 0
          let shake = 0
          let rollX = 0
          let rollVel = 0
          let currentFlip = 0

          const startFlip = (): void => {
            currentFlip++
            phase = 'air'
            vy = 9 + r() * 1.5
            spinSpeed = 22 + r() * 8
            spinAxis = r() < 0.5 ? 'x' : 'z'
            coinGroup.position.y = TABLE_Y + COIN_T / 2
          }

          const onPointer = (): void => requestFlipRef.current()
          renderer.domElement.style.touchAction = 'none'
          renderer.domElement.addEventListener('pointerdown', onPointer)

          return {
            update(dt, t) {
              while (flipQueue.current > 0) {
                flipQueue.current--
                if (phase === 'idle' || phase === 'edge') startFlip()
              }

              if (phase === 'air') {
                vy -= GRAVITY * dt
                coinGroup.position.y += vy * dt
                if (spinAxis === 'x') coinGroup.rotation.x += spinSpeed * dt
                else coinGroup.rotation.z += spinSpeed * dt
                coinGroup.rotation.y += dt * 1.5
                if (vy < 0 && coinGroup.position.y <= TABLE_Y + COIN_T / 2) {
                  landedT = t
                  shake = 1
                  spawnBurst(coinGroup.position.clone(), t)
                  audioRef.current.sfx('bang')
                  if (currentFlip === 1) {
                    // 옆면으로 세움
                    phase = 'edge'
                    coinGroup.position.y = TABLE_Y + COIN_R
                    coinGroup.rotation.set(Math.PI / 2, coinGroup.rotation.y, 0)
                    window.setTimeout(() => {
                      audioRef.current.sfx('ding')
                      showCaptionRef.current(edgeLine)
                    }, 350)
                  } else {
                    // 눕지 않고 바로 굴러감
                    phase = 'roll'
                    coinGroup.position.y = TABLE_Y + COIN_R
                    coinGroup.rotation.set(Math.PI / 2, 0, 0)
                    rollX = 0
                    rollVel = 1.5
                    window.setTimeout(() => {
                      audioRef.current.sfx('whoosh')
                      showCaptionRef.current(rollLine)
                    }, 500)
                  }
                }
              } else if (phase === 'edge') {
                // 미세하게 흔들리며 서 있음
                const age = t - landedT
                coinGroup.rotation.z = Math.sin(age * 9) * Math.max(0, 0.18 - age * 0.05)
                coinGroup.rotation.y += dt * 0.4
              } else if (phase === 'roll') {
                rollVel += 5 * dt
                rollX += rollVel * dt
                coinGroup.position.x = rollX
                coinGroup.position.z = rollX * 0.35
                coinGroup.rotation.y = -0.35
                coin.rotation.y = 0
                // 굴러가는 회전: 링 축 기준
                coin.rotation.y -= (rollVel / COIN_R) * dt
                coinGroup.rotation.z = -Math.sin(rollX * 0.8) * 0.08
                if (rollX > 11) {
                  phase = 'gone'
                  coinGroup.visible = false
                  shadow.visible = false
                }
                shadow.position.x = coinGroup.position.x
                shadow.position.z = coinGroup.position.z
              }

              if (phase !== 'roll' && phase !== 'gone') {
                shadow.position.x = coinGroup.position.x
                shadow.position.z = coinGroup.position.z
                const h = coinGroup.position.y - TABLE_Y
                shadow.scale.setScalar(Math.max(0.3, 1 - h * 0.08))
                ;(shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.05, 0.35 - h * 0.03)
              }

              // 스파크
              for (let i = bursts.length - 1; i >= 0; i--) {
                const b = bursts[i]!
                const age = t - b.t0
                const arr = (b.pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
                for (let k = 0; k < BN; k++) {
                  b.vel[k * 3 + 1] -= 8 * dt
                  arr[k * 3] += b.vel[k * 3]! * dt
                  arr[k * 3 + 1] += b.vel[k * 3 + 1]! * dt
                  arr[k * 3 + 2] += b.vel[k * 3 + 2]! * dt
                }
                ;(b.pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
                ;(b.pts.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - age / 0.9)
                if (age > 1) {
                  scene.remove(b.pts)
                  b.pts.geometry.dispose()
                  ;(b.pts.material as THREE.Material).dispose()
                  bursts.splice(i, 1)
                }
              }

              // 먼지 부유
              const pa = (pGeo.attributes.position as THREE.BufferAttribute).array as Float32Array
              for (let i = 0; i < PN; i++) {
                pa[i * 3 + 1] += Math.sin(t * 0.8 + i) * 0.003
                pa[i * 3] += Math.cos(t * 0.5 + i * 0.3) * 0.002
              }
              ;(pGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true
              pMat.opacity = 0.5 + Math.sin(t * 3) * 0.2

              // 카메라: 살짝 궤도 + 착지 흔들림
              shake = Math.max(0, shake - dt * 3)
              const orbit = Math.sin(t * 0.3) * 1.2
              camera.position.set(camBase.x + orbit + (r() - 0.5) * shake * 0.5, camBase.y + (r() - 0.5) * shake * 0.4, camBase.z + Math.cos(t * 0.3) * 0.6)
              const lookY = phase === 'air' ? Math.min(3, coinGroup.position.y * 0.5 + 0.8) : 1
              camera.lookAt(0, lookY, 0)
            },
            dispose() {
              renderer.domElement.removeEventListener('pointerdown', onPointer)
              coinGeo.dispose()
              goldSide.dispose()
              heads.texture.dispose()
              tails.texture.dispose()
              pGeo.dispose()
              pMat.dispose()
            },
          }
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-6 z-10 flex flex-col items-center gap-2">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-full border-2 border-yellow-300 bg-black/60 px-4 py-1.5 text-base font-black text-yellow-200 shadow-lg">
          🪙 {title}
        </motion.div>
        <div className="text-xs font-bold text-white/70">
          앞면: {COIN.faces.heads} / 뒷면: {COIN.faces.tails}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex flex-col items-center gap-2">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.4 }} className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white">
          {flips >= 2 ? '던지기 종료' : hint}
        </motion.div>
        <div className="text-xs text-white/60">던진 횟수 {flips} / 2</div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <AnimatePresence>
          {caption && !ended && (
            <motion.div
              key={caption.id}
              initial={{ scale: 0, rotate: -10, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], rotate: [-10, 4, -2], opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0, y: -30 }}
              transition={{ duration: 0.3 }}
              className="meme-caption max-w-[90vw] text-center text-4xl"
              style={{ whiteSpace: 'normal', lineHeight: 1.15 }}
            >
              {caption.text}
            </motion.div>
          )}
          {ended && (
            <motion.div
              key="end"
              initial={{ scale: 0, rotate: -14 }}
              animate={{ scale: [0, 1.4, 1], rotate: [-14, 5, -3] }}
              transition={{ duration: 0.5 }}
              className="meme-caption max-w-[90vw] text-center text-3xl"
              style={{ whiteSpace: 'normal', lineHeight: 1.15 }}
            >
              {endLine}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
