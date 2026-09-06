import type { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/** 씬 공통 풀스크린 프레임. 테마 변수(--bg, --fg, --accent, --font)를 그대로 쓴다. */
export function SceneFrame({ children, className = '', style }: Props): React.JSX.Element {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden p-6 text-center ${className}`}
      style={{ background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font)', ...style }}
    >
      {children}
    </div>
  )
}
