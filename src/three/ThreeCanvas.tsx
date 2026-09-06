import { useEffect, useRef, type CSSProperties } from 'react'
import * as THREE from 'three'

export interface ThreeContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  width: number
  height: number
  /** 0~1 난수 (씬 rng 그대로) */
  rng: () => number
}

export interface ThreeSetup {
  /** 매 프레임. dt 초, t 누적 초 */
  update?: (dt: number, t: number) => void
  /** 리사이즈 후 */
  resize?: (width: number, height: number) => void
  dispose?: () => void
}

interface Props {
  /** 마운트 시 한 번. 반환한 update가 매 프레임 호출된다 */
  init: (ctx: ThreeContext) => ThreeSetup | void
  rng?: () => number
  className?: string
  style?: CSSProperties
  /** WebGL 생성 실패 시 (jsdom, 구형 기기). 씬은 이 경우에도 타이머로 진행해야 한다 */
  onError?: (err: unknown) => void
  /** 투명 배경 (기본 true) */
  alpha?: boolean
}

/**
 * three.js 풀스크린 캔버스. rAF 루프, 리사이즈, 정리까지 처리.
 * 씬 로직은 init 안에 두고 update로 프레임을 돌린다.
 * WebGL이 없으면 조용히 실패하고 onError만 부른다. 씬 진행(onDone)은 반드시 타이머로 따로 보장할 것.
 */
export function ThreeCanvas({ init, rng = Math.random, className = '', style, onError, alpha = true }: Props): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const initRef = useRef(init)
  initRef.current = init
  const errRef = useRef(onError)
  errRef.current = onError

  useEffect(() => {
    const host = ref.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha, powerPreference: 'high-performance' })
    } catch (e) {
      errRef.current?.(e)
      return
    }
    const width = host.clientWidth || window.innerWidth
    const height = host.clientHeight || window.innerHeight
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500)
    camera.position.set(0, 0, 10)

    let setup: ThreeSetup | void
    try {
      setup = initRef.current({ scene, camera, renderer, width, height, rng })
    } catch (e) {
      errRef.current?.(e)
      renderer.dispose()
      host.removeChild(renderer.domElement)
      return
    }

    let raf = 0
    let last = performance.now()
    let t = 0
    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      try {
        setup?.update?.(dt, t)
        renderer.render(scene, camera)
      } catch (e) {
        errRef.current?.(e)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onResize = (): void => {
      const w = host.clientWidth || window.innerWidth
      const h = host.clientHeight || window.innerHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      setup?.resize?.(w, h)
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null
    ro?.observe(host)
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', onResize)
      setup?.dispose?.()
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
    // init은 ref로 최신 유지. 마운트 시 한 번만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alpha, rng])

  return <div ref={ref} className={`absolute inset-0 ${className}`} style={style} />
}
