import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { SCENES } from './registry'
import { createSilentAudioBus } from '../audio/AudioBus'
import { createRng } from './rng'
import type { SceneProps } from './types'

// 모든 등록 씬이 jsdom(WebGL 없음)에서 크래시 없이 마운트되고, 등록 duration + 여유 안에 onDone을 정확히 한 번 부르는지.
// 씬이 상호작용을 요구하더라도 자동 진행돼야 한다는 규칙("결국은 진행된다")의 회귀 테스트.

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe.each(SCENES.map((s) => [s.id, s] as const))('scene %s', (_id, scene) => {
  it('마운트되고 onDone을 한 번 부른다', async () => {
    const mod = (await scene.preload!()) as { default: React.ComponentType<SceneProps> }
    const Comp = mod.default
    vi.useFakeTimers()
    const onDone = vi.fn()
    const props: SceneProps = {
      answer: 'ㅇㅋ 가자 근데 좀 늦을 듯',
      onDone,
      audio: createSilentAudioBus(),
      extendTime: () => {},
      skipCount: 0,
      rng: createRng(7),
      restart: () => {},
    }
    const restart = vi.fn()
    props.restart = restart
    const { unmount } = render(<Comp {...props} />)
    // 상태 → 이펙트 → 타이머 체인이 진행되려면 act를 잘게 끊어서 돌려야 한다
    const total = scene.duration + 8000
    for (let t = 0; t < total; t += 100) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })
    }
    // 레전더리 "답변이 도망갔습니다"는 onDone 대신 restart로 끝난다
    if (restart.mock.calls.length > 0) expect(onDone).toHaveBeenCalledTimes(0)
    else expect(onDone).toHaveBeenCalledTimes(1)
    unmount()
  })
})
