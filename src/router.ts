import { useEffect, useState } from 'react'

const EVENT = 'am:navigate'

export function navigate(path: string): void {
  window.history.pushState(null, '', path)
  window.dispatchEvent(new Event(EVENT))
}

export function usePathname(): string {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const update = (): void => setPath(window.location.pathname)
    window.addEventListener('popstate', update)
    window.addEventListener(EVENT, update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener(EVENT, update)
    }
  }, [])
  return path
}

export function getQuery(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}
