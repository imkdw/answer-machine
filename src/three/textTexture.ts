import * as THREE from 'three'

export interface TextTextureOptions {
  font?: string
  /** px. 캔버스 해상도 기준 */
  size?: number
  color?: string
  stroke?: string
  strokeWidth?: number
  background?: string
  /** 캔버스 여백 px */
  padding?: number
  /** 최대 줄 너비 px. 넘으면 줄바꿈 */
  maxWidth?: number
  lineHeight?: number
}

export interface TextTexture {
  texture: THREE.CanvasTexture
  /** 캔버스 픽셀 크기 */
  width: number
  height: number
  /** width / height */
  aspect: number
}

/**
 * 한글 텍스트를 CanvasTexture로. three.js 폰트 JSON 없이 브라우저 폰트 렌더링을 그대로 쓴다.
 * 이모지도 그려진다.
 */
export function makeTextTexture(text: string, opts: TextTextureOptions = {}): TextTexture {
  const size = opts.size ?? 96
  const padding = opts.padding ?? Math.round(size * 0.4)
  const font = `900 ${size}px ${opts.font ?? 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'}`
  const lineHeight = opts.lineHeight ?? 1.25
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = font

  const lines = wrap(ctx, text, opts.maxWidth ?? Infinity)
  const widths = lines.map((l) => ctx.measureText(l).width)
  const textW = Math.max(1, ...widths)
  const textH = lines.length * size * lineHeight
  canvas.width = Math.ceil(textW + padding * 2)
  canvas.height = Math.ceil(textH + padding * 2)

  // 크기 바꾸면 컨텍스트 리셋됨
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  const cx = canvas.width / 2
  lines.forEach((line, i) => {
    const y = padding + size * lineHeight * (i + 0.5)
    if (opts.stroke) {
      ctx.lineJoin = 'round'
      ctx.lineWidth = opts.strokeWidth ?? size * 0.18
      ctx.strokeStyle = opts.stroke
      ctx.strokeText(line, cx, y)
    }
    ctx.fillStyle = opts.color ?? '#ffffff'
    ctx.fillText(line, cx, y)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return { texture, width: canvas.width, height: canvas.height, aspect: canvas.width / canvas.height }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    if (!Number.isFinite(maxWidth) || ctx.measureText(para).width <= maxWidth) {
      out.push(para)
      continue
    }
    const words = para.split(' ')
    let line = ''
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w
      if (ctx.measureText(trial).width <= maxWidth) {
        line = trial
      } else {
        if (line) out.push(line)
        // 한 단어가 너무 길면 글자 단위로
        if (ctx.measureText(w).width > maxWidth) {
          let chunk = ''
          for (const ch of w) {
            if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
              out.push(chunk)
              chunk = ch
            } else chunk += ch
          }
          line = chunk
        } else line = w
      }
    }
    if (line) out.push(line)
  }
  return out.length ? out : ['']
}

/** 텍스트 텍스처를 입힌 평면 메시. height 월드 단위 기준으로 비율 유지 */
export function makeTextPlane(text: string, height: number, opts: TextTextureOptions = {}): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const tt = makeTextTexture(text, opts)
  const geo = new THREE.PlaneGeometry(height * tt.aspect, height)
  const mat = new THREE.MeshBasicMaterial({ map: tt.texture, transparent: true, side: THREE.DoubleSide, depthWrite: false })
  return new THREE.Mesh(geo, mat)
}

/** 항상 카메라를 보는 텍스트 스프라이트 */
export function makeTextSprite(text: string, height: number, opts: TextTextureOptions = {}): THREE.Sprite {
  const tt = makeTextTexture(text, opts)
  const mat = new THREE.SpriteMaterial({ map: tt.texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(height * tt.aspect, height, 1)
  return sprite
}

/**
 * 텍스트를 캔버스에 그려 픽셀 좌표를 샘플링. 파티클로 글자 모양 만들 때 사용.
 * 반환 좌표는 중심 0, 높이 1 기준으로 정규화 (x는 비율에 따라 넓어짐).
 */
export function sampleTextPoints(text: string, opts: { count?: number; font?: string; maxWidth?: number; rng?: () => number } = {}): Array<{ x: number; y: number }> {
  const rng = opts.rng ?? Math.random
  const tt = makeTextTexture(text, { size: 64, padding: 8, font: opts.font, maxWidth: opts.maxWidth ?? 640 })
  const canvas = tt.texture.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  const solid: Array<{ x: number; y: number }> = []
  const step = 2
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3]! > 128) solid.push({ x, y })
    }
  }
  tt.texture.dispose()
  const count = opts.count ?? Math.min(3000, solid.length)
  const out: Array<{ x: number; y: number }> = []
  if (solid.length === 0) return out
  for (let i = 0; i < count; i++) {
    const p = solid[Math.floor(rng() * solid.length)]!
    out.push({ x: (p.x - width / 2) / height, y: -(p.y - height / 2) / height })
  }
  return out
}
