import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScenePlayer } from './ScenePlayer'
import { createSilentAudioBus } from '../audio/AudioBus'
import type { Scene, SceneProps } from './types'
import { useEffect } from 'react'

function timed(id: string, tag: Scene['tags'][number], ms: number): Scene {
  const C = ({ onDone, answer }: SceneProps): React.JSX.Element => {
    useEffect(() => {
      const t = window.setTimeout(onDone, ms)
      return () => window.clearTimeout(t)
    }, [onDone])
    return <div data-testid={`scene-${id}`}>{tag === 'reveal' ? answer : id}</div>
  }
  return { id, tags: [tag], duration: ms, weight: 1, rarity: 'common', component: C }
}

const SCENES = [timed('op', 'opener', 80), timed('mid', 'buildup', 80), timed('extra', 'chaos', 80), timed('rv', 'reveal', 80)]

describe('ScenePlayer', () => {
  it('씬을 순서대로 재생하고 리빌에서 멈춘 뒤 푸터를 보여준다', async () => {
    const queue = [SCENES[0]!, SCENES[1]!, SCENES[3]!]
    render(
      <ScenePlayer
        scenes={queue}
        allScenes={SCENES}
        answer="ㅇㅋ 가자"
        audio={createSilentAudioBus()}
        rng={Math.random}
        bgmIndex={0}
        onRestart={() => {}}
        footer={({ skipCount }) => <div data-testid="footer">skip:{skipCount}</div>}
      />,
    )
    expect(screen.getByTestId('scene-op')).toBeTruthy()
    expect(screen.queryByTestId('footer')).toBeNull()

    // 시간이 지나도 자동으로 넘어가지 않고 "다음" 버튼만 뜬다
    const next1 = await screen.findByLabelText('다음', {}, { timeout: 2000 })
    expect(screen.getByTestId('scene-op')).toBeTruthy()
    fireEvent.click(next1)
    expect(await screen.findByTestId('scene-mid', {}, { timeout: 2000 })).toBeTruthy()

    fireEvent.click(await screen.findByLabelText('다음', {}, { timeout: 2000 }))
    expect(await screen.findByText('ㅇㅋ 가자', {}, { timeout: 2000 })).toBeTruthy()
    const footer = await screen.findByTestId('footer', {}, { timeout: 2000 })
    expect(footer.textContent).toBe('skip:0')
    // 리빌 씬은 계속 떠 있다
    expect(screen.getByText('ㅇㅋ 가자')).toBeTruthy()
  })
})
