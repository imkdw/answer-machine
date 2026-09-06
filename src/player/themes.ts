import type { CSSProperties } from 'react'

export interface Theme {
  id: string
  name: string
  style: CSSProperties & Record<`--${string}`, string>
  className?: string
}

// CSS 변수로 팔레트를 넘기고, 씬은 var(--bg) var(--fg) var(--accent) var(--font)만 쓴다.
export const THEMES: Theme[] = [
  {
    id: 'neon',
    name: '네온',
    style: { '--bg': '#0b0b12', '--fg': '#f4f4ff', '--accent': '#ff2d95', '--accent2': '#2dffea', '--font': 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' },
  },
  {
    id: 'xp',
    name: '윈도우 XP',
    style: { '--bg': '#3a6ea5', '--fg': '#ffffff', '--accent': '#ffcc00', '--accent2': '#3c9b3c', '--font': 'Tahoma, "MS Sans Serif", "Malgun Gothic", system-ui, sans-serif' },
  },
  {
    id: 'gungseo',
    name: '조서',
    style: { '--bg': '#f3e9d2', '--fg': '#2b1d0e', '--accent': '#a3261e', '--accent2': '#6b4f2a', '--font': '"Apple Gungseo", Gungsuh, "궁서", "궁서체", "Nanum Myeongjo", serif' },
  },
  {
    id: 'web90',
    name: '90년대 홈페이지',
    style: { '--bg': '#000080', '--fg': '#ffff00', '--accent': '#00ff00', '--accent2': '#ff00ff', '--font': '"Courier New", Gulim, "굴림", monospace' },
  },
  {
    id: 'silent',
    name: '무성영화',
    style: { '--bg': '#111111', '--fg': '#e8e8e8', '--accent': '#ffffff', '--accent2': '#888888', '--font': 'Georgia, "Times New Roman", Batang, "바탕", serif' },
    className: 'theme-silent',
  },
  {
    id: 'kakao',
    name: '카톡',
    style: { '--bg': '#b2c7d9', '--fg': '#1a1a1a', '--accent': '#fee500', '--accent2': '#3c1e1e', '--font': 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' },
  },
  {
    id: 'yenung',
    name: '예능 자막',
    style: { '--bg': '#1a0f2e', '--fg': '#fff200', '--accent': '#ff4fd8', '--accent2': '#4fffd8', '--font': '"Black Han Sans", "Jalnan", Impact, "Arial Black", "Malgun Gothic", system-ui, sans-serif' },
    className: 'theme-yenung',
  },
  {
    id: 'daangn',
    name: '당근',
    style: { '--bg': '#fff7ed', '--fg': '#1f1f1f', '--accent': '#ff6f0f', '--accent2': '#00a05b', '--font': 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' },
  },
  {
    id: 'y2016',
    name: '2026 is the new 2016',
    style: { '--bg': '#1c1a2e', '--fg': '#fdf3e7', '--accent': '#ff9a3c', '--accent2': '#6ec6ff', '--font': 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' },
    className: 'theme-2016',
  },
  {
    id: 'toxic',
    name: '형광',
    style: { '--bg': '#ccff00', '--fg': '#111111', '--accent': '#ff0044', '--accent2': '#0044ff', '--font': 'Impact, "Arial Black", "Malgun Gothic", system-ui, sans-serif' },
  },
]

export function pickTheme(rng: () => number): Theme {
  return THEMES[Math.floor(rng() * THEMES.length)]!
}
