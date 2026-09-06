import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { SQUID } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 7000
const CHANT = Array.from(SQUID.game)

type Phase = 'intro' | 'chant' | 'look' | 'result' | 'end'

interface Round {
  /** 글자 간격 ms (라운드 2는 빠름) */
  charMs: number[]
  lookMs: number
}

const ROUNDS: Round[] = [
  { charMs: [220, 200, 180, 170, 160, 150, 140, 130, 120, 110, 90, 70], lookMs: 1000 },
  { charMs: [90, 80, 70, 60, 60, 50, 50, 45, 45, 40, 40, 40], lookMs: 800 },
]

/** 무궁화 꽃이 피었습니다. 영희가 돌아볼 때 움직이면 탈락 (근데 진행). */
export default function SquidGame({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const intro = useMemo(() => pick(SQUID.intro, rng), [rng])
  const caughtLines = useMemo(() => [pick(SQUID.caught, rng), pick(SQUID.caught, rng)], [rng])
  const safeLines = useMemo(() => [pick(SQUID.safe, rng), pick(SQUID.safe, rng)], [rng])
  const lookLine = useMemo(() => pick(SQUID.look, rng), [rng])

  const [phase, setPhase] = useState<Phase>('intro')
  const [chars, setChars] = useState(0)
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<{ caught: boolean; text: string } | null>(null)
  const [flash, setFlash] = useState(false)

  const lookingRef = useRef(false)
  const movedRef = useRef(false)
  const caughtFlashRef = useRef(false)
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio

  useEffect(() => {
    const timers: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timers.push(window.setTimeout(fn, ms))
    }

    const onMove = (): void => {
      if (lookingRef.current) movedRef.current = true
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchstart', onMove)
    window.addEventListener('keydown', onMove)

    const runRound = (idx: number, at: number): number => {
      const r = ROUNDS[idx]!
      let cursor = at
      later(() => {
        setRound(idx)
        setPhase('chant')
        setChars(0)
        setResult(null)
        lookingRef.current = false
      }, cursor)
      for (let i = 0; i < CHANT.length; i++) {
        cursor += r.charMs[i] ?? 60
        const n = i + 1
        later(() => {
          setChars(n)
          audioRef.current.sfx('tick')
        }, cursor)
      }
      cursor += 120
      later(() => {
        setPhase('look')
        movedRef.current = false
        lookingRef.current = true
        audioRef.current.sfx('whoosh')
      }, cursor)
      cursor += r.lookMs
      later(() => {
        lookingRef.current = false
        const caught = movedRef.current
        setPhase('result')
        setResult({ caught, text: caught ? caughtLines[idx]! : safeLines[idx]! })
        if (caught) {
          audioRef.current.sfx('siren')
          caughtFlashRef.current = true
          setFlash(true)
          later(() => setFlash(false), 350)
        } else {
          audioRef.current.sfx('ding')
        }
      }, cursor)
      cursor += 700
      return cursor
    }

    let t = 800
    t = runRound(0, t)
    t = runRound(1, t)
    later(() => setPhase('end'), t)

    later(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)

    return () => {
      timers.forEach((x) => window.clearTimeout(x))
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchstart', onMove)
      window.removeEventListener('keydown', onMove)
    }
  }, [onDone, caughtLines, safeLines])

  const phaseRef = useRef<Phase>('intro')
  phaseRef.current = phase

  return (
    <SceneFrame style={{ background: 'linear-gradient(180deg, #8fd3ff 0%, #d7efff 55%, #c9a36b 56%, #a67c48 100%)', color: '#1a1a1a' }}>
      <ThreeCanvas
        rng={rng}
        init={({ scene, camera, rng: r }) => {
          camera.position.set(0, 2.2, 11)
          scene.fog = new THREE.Fog(0xd7efff, 14, 40)
          scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a3a, 1.1))
          const sun = new THREE.DirectionalLight(0xffffff, 1.6)
          sun.position.set(4, 8, 6)
          scene.add(sun)

          // 땅
          const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0xb08650, roughness: 1 }))
          ground.rotation.x = -Math.PI / 2
          ground.position.y = -2
          scene.add(ground)

          // 나무
          const tree = new THREE.Group()
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.3, 9, 10), new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 0.9 }))
          trunk.position.y = 2.5
          tree.add(trunk)
          const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f7a2a, roughness: 0.8 })
          const leafGeo = new THREE.SphereGeometry(2.6, 14, 12)
          for (let i = 0; i < 6; i++) {
            const s = new THREE.Mesh(leafGeo, leafMat)
            const a = (i / 6) * Math.PI * 2
            s.position.set(Math.cos(a) * 2.2, 7 + Math.sin(a * 2) * 0.8, Math.sin(a) * 2.2)
            tree.add(s)
          }
          const top = new THREE.Mesh(leafGeo, leafMat)
          top.position.y = 9
          tree.add(top)
          tree.position.set(0, -2, -9)
          scene.add(tree)

          // 영희
          const doll = new THREE.Group()
          const skin = new THREE.MeshStandardMaterial({ color: 0xffd9b3, roughness: 0.6 })
          const hair = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4 })
          const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x000000, emissiveIntensity: 0 })
          const dress = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 20), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.7 }))
          dress.position.y = -0.3
          doll.add(dress)
          const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 1.2, 14), new THREE.MeshStandardMaterial({ color: 0xffd400, roughness: 0.7 }))
          shirt.position.y = 1.3
          doll.add(shirt)
          const armGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.2, 8)
          const armL = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: 0xffd400 }))
          armL.position.set(-0.85, 1.3, 0)
          armL.rotation.z = 0.35
          doll.add(armL)
          const armR = armL.clone()
          armR.position.x = 0.85
          armR.rotation.z = -0.35
          doll.add(armR)

          const head = new THREE.Group()
          head.position.y = 2.75
          const face = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 18), skin)
          head.add(face)
          const cap = new THREE.Mesh(new THREE.SphereGeometry(1.02, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), hair)
          cap.position.y = 0.05
          head.add(cap)
          const braidGeo = new THREE.CylinderGeometry(0.16, 0.12, 1.4, 8)
          const braidL = new THREE.Mesh(braidGeo, hair)
          braidL.position.set(-0.85, -0.4, 0)
          head.add(braidL)
          const braidR = braidL.clone()
          braidR.position.x = 0.85
          head.add(braidR)
          const eyeGeo = new THREE.SphereGeometry(0.11, 10, 8)
          const eyeL = new THREE.Mesh(eyeGeo, eyeMat)
          eyeL.position.set(-0.32, 0.1, 0.86)
          const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
          eyeR.position.set(0.32, 0.1, 0.86)
          head.add(eyeL, eyeR)
          const cheekMat = new THREE.MeshStandardMaterial({ color: 0xff9aa2 })
          const cheekGeo = new THREE.SphereGeometry(0.13, 8, 6)
          const cheekL = new THREE.Mesh(cheekGeo, cheekMat)
          cheekL.position.set(-0.5, -0.15, 0.78)
          const cheekR = cheekL.clone()
          cheekR.position.x = 0.5
          head.add(cheekL, cheekR)
          doll.add(head)
          doll.position.set(0, -0.5, -1)
          doll.rotation.y = Math.PI
          head.rotation.y = 0
          scene.add(doll)

          // 동그라미 세모 네모 (핑크 가드 심볼)
          const symMat = new THREE.MeshStandardMaterial({ color: 0xff2d95, emissive: 0xff2d95, emissiveIntensity: 0.4, side: THREE.DoubleSide })
          const syms = [new THREE.RingGeometry(0.35, 0.5, 24), new THREE.CircleGeometry(0.5, 3), new THREE.PlaneGeometry(0.8, 0.8)].map((g, i) => {
            const m = new THREE.Mesh(g, symMat)
            m.position.set(-4 + i * 4, 4.5 + (r() - 0.5), -4)
            scene.add(m)
            return m
          })

          // 흙먼지 파티클
          const N = 120
          const pos = new Float32Array(N * 3)
          for (let i = 0; i < N; i++) {
            pos[i * 3] = (r() - 0.5) * 24
            pos[i * 3 + 1] = -1.9 + r() * 2.5
            pos[i * 3 + 2] = (r() - 0.5) * 16
          }
          const pGeo = new THREE.BufferGeometry()
          pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
          const pMat = new THREE.PointsMaterial({ color: 0xe8c990, size: 0.08, transparent: true, opacity: 0.6, depthWrite: false })
          scene.add(new THREE.Points(pGeo, pMat))

          let flashT = -1

          return {
            update(dt, t) {
              const p = phaseRef.current
              const targetHead = p === 'look' || p === 'result' ? Math.PI : 0
              head.rotation.y += (targetHead - head.rotation.y) * Math.min(1, dt * (targetHead === Math.PI ? 22 : 6))
              const glow = p === 'look' || p === 'result'
              eyeMat.emissive.setHex(glow ? 0xff0000 : 0x000000)
              eyeMat.emissiveIntensity = glow ? 3 + Math.sin(t * 30) * 1.5 : 0

              if (caughtFlashRef.current) {
                caughtFlashRef.current = false
                flashT = t
              }
              const shake = flashT >= 0 ? Math.max(0, 0.5 - (t - flashT)) : 0

              doll.position.y = -0.5 + Math.sin(t * 2) * 0.03
              syms.forEach((m, i) => {
                m.rotation.y = t * 1.2 + i
                m.position.y = 4.5 + Math.sin(t * 1.5 + i) * 0.3
              })

              const zoom = p === 'look' || p === 'result' ? 8.2 : 11
              camera.position.z += (zoom - camera.position.z) * Math.min(1, dt * 5)
              camera.position.x = Math.sin(t * 0.4) * 0.4 + (r() - 0.5) * shake
              camera.position.y = 2.2 + (r() - 0.5) * shake
              camera.lookAt(0, 1.2, -1)
            },
            dispose() {
              pGeo.dispose()
              pMat.dispose()
            },
          }
        }}
      />

      {flash && <div className="absolute inset-0 z-20 bg-red-600/80" />}

      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="rounded-md bg-[#2b7a5b] px-2 py-1 text-xs font-black tracking-widest text-white shadow">참가번호</div>
        <div className="rounded-md bg-white px-2 py-1 text-xl font-black text-[#2b7a5b] shadow">456</div>
      </div>

      <div className="absolute inset-x-4 top-16 z-10 flex justify-center">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-black/70 px-4 py-2 text-sm font-bold text-white">
              {intro}
            </motion.div>
          )}
          {(phase === 'chant' || phase === 'look' || phase === 'result') && (
            <motion.div key={`chant-${round}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-black/60 px-3 py-0.5 text-[10px] font-bold tracking-widest text-white">라운드 {round + 1} / 2</div>
              <div
                className="rounded-2xl bg-white/85 px-4 py-2 text-2xl font-black tracking-tight text-[#1a1a1a] shadow-lg"
                style={{ fontFamily: '"Apple Gungseo", Gungsuh, "궁서", "궁서체", "Nanum Myeongjo", serif', minWidth: 260 }}
              >
                {CHANT.slice(0, chars).join('')}
                <span className="opacity-0">{CHANT.slice(chars).join('')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-4 bottom-24 z-10 flex justify-center">
        <AnimatePresence mode="wait">
          {phase === 'look' && (
            <motion.div
              key="look"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [1.4, 1], opacity: 1 }}
              exit={{ opacity: 0 }}
              className="meme-caption text-4xl"
              style={{ color: '#ff3b3b' }}
            >
              움직이면 탈락
            </motion.div>
          )}
          {phase === 'result' && result && (
            <motion.div
              key={`res-${round}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-2xl px-5 py-3 text-center text-lg font-black text-white shadow-xl ${result.caught ? 'bg-red-600 shake' : 'bg-emerald-600'}`}
              style={{ maxWidth: 320 }}
            >
              <div className="text-xs font-bold opacity-80">{result.caught ? lookLine : '통과'}</div>
              {result.text}
            </motion.div>
          )}
          {phase === 'end' && (
            <motion.div key="end" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl bg-black/75 px-5 py-3 text-lg font-black text-white">
              게임 종료. 상금 0원. 답변으로 이동
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
