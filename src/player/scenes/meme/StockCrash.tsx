import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneFrame } from '../../SceneFrame'
import { TrollButton } from '../../TrollButton'
import { useTimeout } from '../../useTimeout'
import { STOCK } from '../../../copy/memes'
import { pick } from '../../../copy/reactions'
import type { SceneProps } from '../../types'

const DURATION = 4500
const BASE = 72400
const CRASH_AT = 1600
const CRASH_MS = 700
const END_AT = 3600
const UP = '#f04452'
const DOWN = '#3182f6'

/** 가격 곡선. 0~CRASH_AT 완만 상승, 그 뒤 급락 -29.9%, 이후 바닥 횡보. */
function priceAt(ms: number, wobble: (i: number) => number): number {
  if (ms < CRASH_AT) return BASE * (1 + 0.04 * (ms / CRASH_AT)) + wobble(ms) * 300
  const c = Math.min(1, (ms - CRASH_AT) / CRASH_MS)
  const eased = 1 - Math.pow(1 - c, 2)
  return BASE * 1.04 - BASE * (0.04 + 0.299) * eased + wobble(ms) * 120 * (1 - c)
}

/** 국장 차트. 상승하다 하한가. 파란색은 하락. */
export default function StockCrash({ onDone, audio, rng }: SceneProps): React.JSX.Element {
  const ticker = useMemo(() => pick(STOCK.ticker, rng), [rng])
  const endLine = useMemo(() => pick(STOCK.end, rng), [rng])
  const seed = useMemo(() => rng() * 1000, [rng])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [price, setPrice] = useState(BASE)
  const [crashed, setCrashed] = useState(false)
  const [ended, setEnded] = useState(false)
  const doneRef = useRef(false)

  useTimeout(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, DURATION)

  useEffect(() => {
    const t1 = window.setTimeout(() => {
      setCrashed(true)
      audio.sfx('siren')
    }, CRASH_AT)
    const t2 = window.setTimeout(() => {
      setEnded(true)
      audio.sfx('coin')
    }, END_AT)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [audio])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const wobble = (ms: number): number => Math.sin(ms / 90 + seed) * 0.6 + Math.sin(ms / 37 + seed * 2) * 0.4
    const points: number[] = []
    const t0 = performance.now()
    let raf = 0
    let lastPriceUpdate = 0

    const draw = (now: number): void => {
      const el = now - t0
      const p = priceAt(el, wobble)
      points.push(p)
      if (now - lastPriceUpdate > 80) {
        lastPriceUpdate = now
        setPrice(p)
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr
        canvas.height = H * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      // 격자
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      for (let i = 1; i < 5; i++) {
        const y = (H / 5) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      const lo = BASE * 0.66
      const hi = BASE * 1.08
      const toY = (v: number): number => H - ((v - lo) / (hi - lo)) * H
      const total = Math.max(points.length, Math.floor(END_AT / 16))
      const toX = (i: number): number => (i / total) * W

      // 기준선
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.beginPath()
      ctx.moveTo(0, toY(BASE))
      ctx.lineTo(W, toY(BASE))
      ctx.stroke()
      ctx.setLineDash([])

      // 곡선 (상승 구간 빨강, 하락 구간 파랑)
      const crashIdx = points.findIndex((_, i) => i * 16 >= CRASH_AT)
      const drawSeg = (from: number, to: number, color: string): void => {
        if (to <= from) return
        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.lineJoin = 'round'
        ctx.beginPath()
        for (let i = from; i < to; i++) {
          const x = toX(i)
          const y = toY(points[i]!)
          if (i === from) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        // 채우기
        const grad = ctx.createLinearGradient(0, 0, 0, H)
        grad.addColorStop(0, `${color}55`)
        grad.addColorStop(1, `${color}00`)
        ctx.fillStyle = grad
        ctx.lineTo(toX(to - 1), H)
        ctx.lineTo(toX(from), H)
        ctx.closePath()
        ctx.fill()
      }
      if (crashIdx < 0) drawSeg(0, points.length, UP)
      else {
        drawSeg(0, crashIdx + 1, UP)
        drawSeg(crashIdx, points.length, DOWN)
      }

      // 현재가 점
      const last = points.length - 1
      ctx.fillStyle = crashIdx < 0 ? UP : DOWN
      ctx.beginPath()
      ctx.arc(toX(last), toY(points[last]!), 4, 0, Math.PI * 2)
      ctx.fill()

      if (el < END_AT + 800) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [seed])

  const pct = ((price - BASE) / BASE) * 100
  const down = pct < 0
  const color = down ? DOWN : UP
  const newsLine = STOCK.news.join('  /  ')

  return (
    <SceneFrame style={{ background: '#101318', color: '#e8eaed', fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' }} className={`justify-start p-0 ${crashed && !ended ? 'shake-forever' : ''}`}>
      <div className="flex h-full w-full max-w-sm flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 text-left">
          <div>
            <div className="text-[11px] text-gray-400">KOSPI / 답변거래소</div>
            <div className="text-lg font-black">{ticker}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black tabular-nums" style={{ color }}>
              {Math.round(price).toLocaleString('ko-KR')}
              <span className="ml-0.5 text-xs">원</span>
            </div>
            <div className="text-sm font-bold tabular-nums" style={{ color }}>
              {down ? '▼' : '▲'} {Math.abs(pct).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* 뉴스 티커 */}
        <div className="overflow-hidden border-y border-white/10 bg-black/40 py-1 text-[11px] text-yellow-300">
          <div className="marquee">📢 {newsLine}</div>
        </div>

        {/* 차트 */}
        <div className="relative mx-4 mt-3 flex-1" style={{ minHeight: 200, maxHeight: 320 }}>
          <canvas ref={canvasRef} className="h-full w-full" />
          <AnimatePresence>
            {crashed && (
              <motion.div
                key="stamp"
                initial={{ scale: 4, opacity: 0, rotate: 20 }}
                animate={{ scale: 1, opacity: 1, rotate: -12 }}
                transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="rounded-lg border-4 px-5 py-2 text-5xl font-black" style={{ color: DOWN, borderColor: DOWN, textShadow: `0 0 20px ${DOWN}` }}>
                  하한가
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 호가 느낌 */}
        <div className="mx-4 mt-2 grid grid-cols-3 gap-1 text-center text-[11px]">
          {[
            ['시가', BASE, UP],
            ['고가', BASE * 1.04, UP],
            ['저가', Math.min(price, BASE), down ? DOWN : UP],
          ].map(([k, v, c]) => (
            <div key={String(k)} className="rounded bg-white/5 py-1">
              <div className="text-gray-400">{k}</div>
              <div className="font-bold tabular-nums" style={{ color: String(c) }}>
                {Math.round(Number(v)).toLocaleString('ko-KR')}
              </div>
            </div>
          ))}
        </div>

        {/* 하단 */}
        <div className="mx-4 mt-3 mb-4 flex items-center justify-between gap-2">
          <AnimatePresence mode="wait">
            {ended ? (
              <motion.div key="end" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-bold text-yellow-300">
                {endLine}
              </motion.div>
            ) : (
              <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-gray-400">
                {crashed ? '거래 정지 검토 중' : '실시간 체결 중'}
              </motion.div>
            )}
          </AnimatePresence>
          <TrollButton label="물타기" className="btn text-sm" style={{ background: DOWN, color: '#fff' }} audio={audio} reactions={[{ toast: '평단가 상승', sfx: 'error' }, { toast: '더 물렸습니다', sfx: 'boo' }]} onPress={() => {}} />
        </div>
      </div>
    </SceneFrame>
  )
}
