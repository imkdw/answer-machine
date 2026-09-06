import type { ComponentType, LazyExoticComponent } from 'react'
import type { AudioBus } from '../audio/AudioBus'

export type SceneTag = 'opener' | 'buildup' | 'fakeout' | 'chaos' | 'reveal'
export type Rarity = 'common' | 'rare' | 'legendary'

export interface SceneProps {
  answer: string
  onDone: () => void
  audio: AudioBus
  /** 스킵 버튼 등이 씬 시간을 늘릴 때 */
  extendTime: (ms: number) => void
  /** 리빌 씬에서 통계 표시용 */
  skipCount: number
  /** 0~1 난수. 씬 내부 변주용 */
  rng: () => number
  /** 씬 플레이어에 재시작 요청 (레전더리 "답변이 도망갔습니다") */
  restart: () => void
}

export interface Scene {
  id: string
  tags: SceneTag[]
  /** ms. 씬이 직접 onDone을 불러도 되지만 예산 계산에는 이 값을 쓴다 */
  duration: number
  weight: number
  rarity: Rarity
  component: LazyExoticComponent<ComponentType<SceneProps>> | ComponentType<SceneProps>
  /** 코드 스플리팅 프리페치용 */
  preload?: () => Promise<unknown>
}
