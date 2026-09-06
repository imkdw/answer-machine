import { useEffect, useRef } from 'react'

/** 마운트 후 ms 뒤에 fn 한 번. fn은 최신 클로저를 쓴다. */
export function useTimeout(fn: () => void, ms: number | null): void {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (ms === null) return
    const t = window.setTimeout(() => ref.current(), ms)
    return () => window.clearTimeout(t)
  }, [ms])
}

/** 일정 간격으로 fn. ms가 null이면 정지. */
export function useInterval(fn: () => void, ms: number | null): void {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (ms === null) return
    const t = window.setInterval(() => ref.current(), ms)
    return () => window.clearInterval(t)
  }, [ms])
}
