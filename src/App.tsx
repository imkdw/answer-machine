import { lazy, Suspense } from 'react'
import { usePathname } from './router'
import { ToastHost } from './player/Toast'
import Home from './pages/Home'

const Play = lazy(() => import('./pages/Play'))

export default function App(): React.JSX.Element {
  const path = usePathname()
  const code = decodeURIComponent(path.replace(/^\/+/, '').replace(/\/+$/, ''))

  return (
    <>
      {code === '' ? (
        <Home />
      ) : (
        <Suspense fallback={<div className="absolute inset-0" style={{ background: 'var(--bg)' }} />}>
          <Play code={code} />
        </Suspense>
      )}
      <ToastHost />
    </>
  )
}
