import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface ToastItem {
  id: number
  text: string
}

const listeners = new Set<(t: ToastItem) => void>()
let seq = 0

/** 어디서든 호출 가능한 토스트 */
export function toast(text: string): void {
  const item = { id: ++seq, text }
  listeners.forEach((fn) => fn(item))
}

export function ToastHost(): React.JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    const fn = (t: ToastItem): void => {
      setItems((prev) => [...prev.slice(-2), t])
      window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 2200)
    }
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="rounded-full bg-black/85 px-4 py-2 text-sm font-semibold text-white shadow-lg"
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
