import { useCallback } from 'react'
import * as THREE from 'three'
import { ThreeCanvas, type ThreeContext, type ThreeSetup } from '../three/ThreeCanvas'
import { makeTextSprite } from '../three/textTexture'
import { MEME_CAPTIONS } from '../copy/memes'

interface Props {
  rng: () => number
}

/**
 * 탭 대기 화면 뒤에서 밈 자막들이 3D로 둥둥 떠다닌다.
 * 코드 스플리팅으로 늦게 붙어도 되는 장식 레이어. 씬 프리페치와 같이 three 청크를 미리 데운다.
 */
export default function WaitBackdrop({ rng }: Props): React.JSX.Element {
  const init = useCallback(
    (ctx: ThreeContext): ThreeSetup => {
      const { scene, camera } = ctx
      camera.position.set(0, 0, 14)
      scene.fog = new THREE.FogExp2(0x000000, 0.045)

      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff2d95'
      const fg = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#ffffff'

      const sprites: Array<{ s: THREE.Sprite; vx: number; vy: number; vz: number; spin: number }> = []
      const pool = [...MEME_CAPTIONS]
      for (let i = 0; i < 26; i++) {
        const text = pool[Math.floor(rng() * pool.length)]!
        const sprite = makeTextSprite(text, 0.7 + rng() * 0.6, {
          size: 72,
          color: rng() < 0.5 ? accent : fg,
          stroke: '#000',
          strokeWidth: 10,
        })
        sprite.position.set((rng() - 0.5) * 16, (rng() - 0.5) * 22, -6 + rng() * 14)
        sprite.material.opacity = 0.35 + rng() * 0.35
        sprite.material.rotation = (rng() - 0.5) * 0.6
        scene.add(sprite)
        sprites.push({ s: sprite, vx: (rng() - 0.5) * 0.4, vy: 0.3 + rng() * 0.7, vz: (rng() - 0.5) * 0.2, spin: (rng() - 0.5) * 0.4 })
      }

      // 별가루
      const starGeo = new THREE.BufferGeometry()
      const starPos = new Float32Array(600 * 3)
      for (let i = 0; i < 600; i++) {
        starPos[i * 3] = (rng() - 0.5) * 40
        starPos[i * 3 + 1] = (rng() - 0.5) * 40
        starPos[i * 3 + 2] = -20 + rng() * 30
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: new THREE.Color(accent), size: 0.08, transparent: true, opacity: 0.7 }))
      scene.add(stars)

      return {
        update: (dt, t) => {
          for (const it of sprites) {
            it.s.position.x += it.vx * dt
            it.s.position.y += it.vy * dt
            it.s.position.z += it.vz * dt
            it.s.material.rotation += it.spin * dt
            if (it.s.position.y > 12) it.s.position.y = -12
            if (it.s.position.x > 9) it.s.position.x = -9
            if (it.s.position.x < -9) it.s.position.x = 9
          }
          stars.rotation.z = t * 0.02
          camera.position.x = Math.sin(t * 0.3) * 0.6
          camera.position.y = Math.cos(t * 0.23) * 0.4
          camera.lookAt(0, 0, 0)
        },
      }
    },
    [rng],
  )

  return <ThreeCanvas init={init} rng={rng} className="pointer-events-none opacity-90" />
}
