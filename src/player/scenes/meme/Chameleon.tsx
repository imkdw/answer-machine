import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { SceneFrame } from '../../SceneFrame'
import { ThreeCanvas } from '../../../three/ThreeCanvas'
import { TrollButton } from '../../TrollButton'
import { toast } from '../../Toast'
import { CHAMELEON } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 5000
const HINT_AT = 2000
const REVEAL_AT = 3800

/** 벽 무늬. 답변 카드도 같은 텍스처를 써서 배경에 녹아든다. 답변 텍스트는 절대 그리지 않는다. */
function patternTexture(rng: () => number): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const ctx = c.getContext('2d')!
  const palette = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff8fab', '#845ec2', '#00c9a7']
  ctx.fillStyle = '#f4efe6'
  ctx.fillRect(0, 0, 512, 512)
  // 사선 줄무늬
  ctx.lineWidth = 14
  for (let i = -512; i < 1024; i += 48) {
    ctx.strokeStyle = palette[Math.floor(rng() * palette.length)]!
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + 512, 512)
    ctx.stroke()
  }
  // 도형
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = palette[Math.floor(rng() * palette.length)]!
    const x = rng() * 512
    const y = rng() * 512
    const s = 10 + rng() * 34
    const k = Math.floor(rng() * 3)
    if (k === 0) {
      ctx.beginPath()
      ctx.arc(x, y, s / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (k === 1) {
      ctx.fillRect(x - s / 2, y - s / 2, s, s)
    } else {
      ctx.beginPath()
      ctx.moveTo(x, y - s / 2)
      ctx.lineTo(x + s / 2, y + s / 2)
      ctx.lineTo(x - s / 2, y + s / 2)
      ctx.closePath()
      ctx.fill()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 멧챠 카멜레온. 답변 카드가 벽 무늬로 위장. 찾기를 눌러도 다시 숨는다. */
export default function Chameleon({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const intro = useMemo(() => pick(CHAMELEON.intro, rng), [rng])
  const hint = useMemo(() => pick(CHAMELEON.hint, rng), [rng])
  const fail = useMemo(() => pick(CHAMELEON.fail, rng), [rng])

  const [phase, setPhase] = useState<'seek' | 'hint' | 'fail'>('seek')
  const doneRef = useRef(false)
  const audioRef = useRef(audio)
  audioRef.current = audio
  /** update()가 읽는 외곽선 표시 종료 시각 (씬 시간 t 기준이 아니라 performance.now ms) */
  const outlineUntilRef = useRef(0)
  const wiggleRef = useRef(false)

  useEffect(() => {
    const timers: number[] = []
    const later = (fn: () => void, ms: number): void => {
      timers.push(window.setTimeout(fn, ms))
    }
    later(() => setPhase('hint'), HINT_AT)
    later(() => {
      wiggleRef.current = true
      outlineUntilRef.current = performance.now() + 900
      audioRef.current.sfx('crack')
    }, REVEAL_AT)
    later(() => {
      setPhase('fail')
      audioRef.current.sfx('tada')
    }, REVEAL_AT + 500)
    later(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }, DURATION)
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [onDone])

  const seek = (): void => {
    toast(pick(CHAMELEON.found, rng))
    audioRef.current.sfx('error')
    outlineUntilRef.current = performance.now() + 600
  }

  return (
    <SceneFrame style={{ background: '#f4efe6', color: '#222' }}>
      <ThreeCanvas
        rng={rng}
        alpha={false}
        init={({ scene, camera, rng: r }) => {
          scene.background = new THREE.Color(0xf4efe6)
          scene.add(new THREE.AmbientLight(0xffffff, 1.1))
          const key = new THREE.DirectionalLight(0xffffff, 0.8)
          key.position.set(2, 5, 6)
          scene.add(key)

          const tex = patternTexture(r)
          tex.repeat.set(3, 3)
          const wallMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
          const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), wallMat)
          wall.position.set(0, 0, -2)
          scene.add(wall)

          // 소품: 포스터 상자, 석상
          const posterMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
          const poster = new THREE.Mesh(new THREE.BoxGeometry(2, 2.8, 0.1), posterMat)
          poster.position.set(-2.8, 1.2, -1.5)
          poster.rotation.z = 0.06
          scene.add(poster)
          const posterFace = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.4), new THREE.MeshStandardMaterial({ color: 0x4d96ff }))
          posterFace.position.set(-2.8, 1.2, -1.44)
          scene.add(posterFace)
          const statueMat = new THREE.MeshStandardMaterial({ color: 0xcfc8bd, roughness: 0.6 })
          const statue = new THREE.Group()
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.2, 12), statueMat)
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), statueMat)
          head.position.y = 1.4
          const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), statueMat)
          base.position.y = -1.2
          statue.add(body, head, base)
          statue.position.set(3, -0.8, -1)
          scene.add(statue)

          // 답변 카드: 벽과 같은 텍스처. UV 오프셋으로 자연스럽게 이어지게
          const cardTex = tex.clone()
          cardTex.needsUpdate = true
          const cardW = 3
          const cardH = 1.6
          const cardMat = new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.9 })
          const card = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), cardMat)
          const cx = (r() - 0.5) * 3
          const cy = -0.6 + (r() - 0.5) * 1.5
          card.position.set(cx, cy, -1.9)
          // 벽 uv: (x + 12) / 24 * repeat. 카드 uv를 벽의 해당 구간으로
          const u0 = ((cx - cardW / 2 + 12) / 24) * 3
          const v0 = ((cy - cardH / 2 + 12) / 24) * 3
          cardTex.offset.set(u0, v0)
          cardTex.repeat.set((cardW / 24) * 3, (cardH / 24) * 3)
          scene.add(card)

          // 아주 옅은 외곽선 + 발견 시 빨간 외곽선
          const edge = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.PlaneGeometry(cardW, cardH)),
            new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 }),
          )
          edge.position.copy(card.position)
          edge.position.z += 0.01
          scene.add(edge)
          const redEdge = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.PlaneGeometry(cardW + 0.12, cardH + 0.12)),
            new THREE.LineBasicMaterial({ color: 0xff2020, linewidth: 3 }),
          )
          redEdge.position.copy(card.position)
          redEdge.position.z += 0.02
          redEdge.visible = false
          scene.add(redEdge)

          camera.position.set(0, 0, 7)

          return {
            update(dt, t) {
              const now = performance.now()
              const outline = now < outlineUntilRef.current
              redEdge.visible = outline && Math.floor(now / 90) % 2 === 0
              if (wiggleRef.current) {
                card.rotation.z = Math.sin(t * 30) * 0.06
                card.position.x = cx + Math.sin(t * 25) * 0.05
                edge.rotation.z = card.rotation.z
                edge.position.x = card.position.x
                redEdge.rotation.z = card.rotation.z
                redEdge.position.x = card.position.x
                statue.rotation.y += dt * 2
              } else {
                statue.rotation.y = Math.sin(t * 0.4) * 0.1
              }
              // 카메라 천천히 팬/줌
              const z = wiggleRef.current ? 5.5 : 7 - Math.sin(t * 0.25) * 0.8
              camera.position.z += (z - camera.position.z) * Math.min(1, dt * 3)
              camera.position.x = Math.sin(t * 0.3) * 1.2
              camera.position.y = Math.cos(t * 0.22) * 0.6
              camera.lookAt(wiggleRef.current ? cx : 0, wiggleRef.current ? cy : 0, -2)
            },
            dispose() {
              tex.dispose()
              cardTex.dispose()
              wallMat.dispose()
              cardMat.dispose()
              posterMat.dispose()
              statueMat.dispose()
            },
          }
        }}
      />

      <div className="pointer-events-none absolute inset-x-4 top-6 z-10 flex justify-center">
        <div className="rounded-full bg-black/75 px-4 py-1.5 text-sm font-black text-white">{intro}</div>
      </div>

      <div className="absolute inset-x-4 bottom-28 z-10 flex flex-col items-center gap-3">
        <AnimatePresence mode="wait">
          {phase !== 'fail' && (
            <motion.div key="seek" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
              {phase === 'hint' && (
                <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-700 shadow">
                  {hint}
                </motion.div>
              )}
              <TrollButton label="찾기" onPress={seek} audio={audio} className="btn text-lg" style={{ background: '#111', color: '#fff' }} hoverLabel="어디?" />
            </motion.div>
          )}
          {phase === 'fail' && (
            <motion.div
              key="fail"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [1.4, 1], opacity: 1 }}
              className="meme-caption flex flex-col items-center text-3xl"
              style={{ color: '#6bcb77' }}
            >
              <motion.span animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-6xl" style={{ WebkitTextStroke: '0', textShadow: 'none' }}>
                🦎
              </motion.span>
              <span style={{ maxWidth: 320 }}>{fail}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SceneFrame>
  )
}
