import { lazy } from 'react'
import type { Scene } from './types'

// 씬 추가: 컴포넌트 파일 하나 만들고 여기 한 줄 등록하면 끝.
// component는 lazy로 코드 스플리팅, preload는 탭 대기 중 프리페치용.

function reg(id: string, tags: Scene['tags'], duration: number, loader: () => Promise<{ default: React.ComponentType<import('./types').SceneProps> }>, opts: { weight?: number; rarity?: Scene['rarity'] } = {}): Scene {
  return {
    id,
    tags,
    duration,
    weight: opts.weight ?? 1,
    rarity: opts.rarity ?? 'common',
    component: lazy(loader),
    preload: loader,
  }
}

export const SCENES: Scene[] = [
  // opener
  reg('drumroll', ['opener'], 2600, () => import('./scenes/opener/Drumroll'), { weight: 1.5 }),
  reg('breakingNews', ['opener'], 3000, () => import('./scenes/opener/BreakingNews')),
  reg('countdown', ['opener'], 3400, () => import('./scenes/opener/Countdown')),
  reg('crtPowerOn', ['opener'], 2400, () => import('./scenes/opener/CrtPowerOn')),

  // buildup
  reg('fakeLoading', ['buildup'], 5200, () => import('./scenes/buildup/FakeLoading'), { weight: 1.5 }),
  reg('aiTyping', ['buildup'], 4500, () => import('./scenes/buildup/AiTyping')),
  reg('judgePanel', ['buildup'], 4200, () => import('./scenes/buildup/JudgePanel')),

  // fakeout
  reg('fakeAd', ['fakeout'], 4500, () => import('./scenes/fakeout/FakeAd'), { weight: 1.3 }),
  reg('blueScreen', ['fakeout'], 2500, () => import('./scenes/fakeout/BlueScreen')),
  reg('fakeCaptcha', ['fakeout'], 3500, () => import('./scenes/fakeout/FakeCaptcha')),
  reg('fakePopup', ['fakeout'], 3000, () => import('./scenes/fakeout/FakePopup')),
  reg('tripleConfirm', ['fakeout'], 4000, () => import('./scenes/fakeout/TripleConfirm'), { weight: 0.8 }),
  reg('dontPress', ['fakeout'], 3500, () => import('./scenes/fakeout/DontPress'), { weight: 0.8 }),

  // chaos
  reg('screenFlip', ['chaos'], 3000, () => import('./scenes/chaos/ScreenFlip')),
  reg('emojiStorm', ['chaos'], 3200, () => import('./scenes/chaos/EmojiStorm'), { weight: 1.3 }),
  reg('runawayButton', ['chaos'], 4000, () => import('./scenes/chaos/RunawayButton')),
  reg('textGravity', ['chaos'], 3200, () => import('./scenes/chaos/TextGravity'), { rarity: 'rare' }),

  // 2026 밈 씬
  reg('cameBack', ['opener'], 3200, () => import('./scenes/meme/CameBack'), { weight: 1.6 }),
  reg('geojeYaho', ['chaos'], 5500, () => import('./scenes/meme/GeojeYaho'), { weight: 1.6 }),
  reg('yoonjung', ['buildup'], 5500, () => import('./scenes/meme/Yoonjung'), { weight: 1.6 }),
  reg('backrooms', ['fakeout'], 5500, () => import('./scenes/meme/Backrooms'), { weight: 1.4 }),
  reg('flipFlop', ['fakeout'], 5000, () => import('./scenes/meme/FlipFlop'), { weight: 1.4 }),
  reg('pierrot', ['buildup'], 5500, () => import('./scenes/meme/Pierrot'), { weight: 1.3 }),
  reg('noContact', ['buildup'], 5000, () => import('./scenes/meme/NoContact'), { weight: 1.3 }),
  reg('jabeth', ['chaos'], 4000, () => import('./scenes/meme/Jabeth'), { weight: 1.2 }),
  reg('nyanya', ['fakeout'], 5000, () => import('./scenes/meme/Nyanya'), { weight: 1.2 }),
  reg('chameleon', ['fakeout'], 5000, () => import('./scenes/meme/Chameleon'), { weight: 1.2 }),

  // 밈 씬 (2024~2025 한국 밈)
  reg('starforce', ['buildup'], 6000, () => import('./scenes/meme/Starforce'), { weight: 1.4 }),
  reg('luckyVicky', ['buildup'], 5000, () => import('./scenes/meme/LuckyVicky'), { weight: 1.3 }),
  reg('squidGame', ['fakeout'], 7000, () => import('./scenes/meme/SquidGame'), { weight: 1.4 }),
  reg('aptStack', ['chaos'], 5500, () => import('./scenes/meme/AptStack'), { weight: 1.2 }),
  reg('delivery', ['buildup'], 5500, () => import('./scenes/meme/Delivery')),
  reg('memeTunnel', ['chaos'], 4500, () => import('./scenes/meme/MemeTunnel'), { weight: 1.2 }),
  reg('daangn', ['fakeout'], 5000, () => import('./scenes/meme/Daangn')),
  reg('mz3yo', ['fakeout'], 5000, () => import('./scenes/meme/Mz3yo'), { weight: 1.2 }),
  reg('chefJudge', ['buildup'], 5000, () => import('./scenes/meme/ChefJudge')),
  reg('hometax', ['fakeout'], 5500, () => import('./scenes/meme/Hometax'), { weight: 1.2 }),
  reg('ticketing', ['buildup'], 5000, () => import('./scenes/meme/Ticketing')),
  reg('stockCrash', ['chaos'], 4500, () => import('./scenes/meme/StockCrash')),
  reg('apology', ['buildup'], 5500, () => import('./scenes/meme/Apology'), { weight: 0.8 }),
  reg('gptSmell', ['buildup'], 5000, () => import('./scenes/meme/GptSmell')),
  reg('tetoEgen', ['fakeout'], 6000, () => import('./scenes/meme/TetoEgen'), { weight: 0.9 }),
  reg('kakaoRead', ['buildup'], 5500, () => import('./scenes/meme/KakaoRead'), { weight: 1.3 }),

  // 3D 인터랙티브 씬 (2026-09). 탭/홀드로 조작되지만 결과는 항상 꼴받음
  reg('danceChallenge', ['chaos'], 9000, () => import('./scenes/interactive/DanceChallenge'), { weight: 1.8 }),
  reg('clawMachine', ['fakeout'], 9000, () => import('./scenes/interactive/ClawMachine'), { weight: 1.4 }),
  reg('slotMachine', ['fakeout'], 8500, () => import('./scenes/interactive/SlotMachine'), { weight: 1.3 }),
  reg('rouletteWheel', ['buildup'], 9000, () => import('./scenes/interactive/RouletteWheel'), { weight: 1.4 }),
  reg('rhythmGame', ['chaos'], 9000, () => import('./scenes/interactive/RhythmGame'), { weight: 1.3 }),
  reg('whackAMole', ['chaos'], 8500, () => import('./scenes/interactive/WhackAMole'), { weight: 1.3 }),
  reg('coinFlip', ['buildup'], 8000, () => import('./scenes/interactive/CoinFlip'), { weight: 1.3 }),
  reg('holdToSkip', ['fakeout'], 8000, () => import('./scenes/interactive/HoldToSkip'), { weight: 1.2 }),

  // reveal
  reg('galaxyReveal', ['reveal'], 4500, () => import('./scenes/reveal/GalaxyReveal'), { weight: 1.5 }),
  reg('cubeReveal', ['reveal'], 4000, () => import('./scenes/reveal/CubeReveal'), { weight: 1.2 }),
  reg('koreanSpeedReveal', ['reveal'], 4500, () => import('./scenes/reveal/KoreanSpeedReveal'), { weight: 1.2 }),
  reg('popReveal', ['reveal'], 2500, () => import('./scenes/reveal/PopReveal'), { weight: 2 }),
  reg('explosionReveal', ['reveal'], 2800, () => import('./scenes/reveal/ExplosionReveal')),
  reg('scrollReveal', ['reveal'], 3200, () => import('./scenes/reveal/ScrollReveal')),
  reg('koReveal', ['reveal'], 3000, () => import('./scenes/reveal/KoReveal')),
  reg('whisperReveal', ['reveal'], 3000, () => import('./scenes/reveal/WhisperReveal'), { weight: 0.7 }),
  reg('fakeAnswerReveal', ['reveal'], 5000, () => import('./scenes/reveal/FakeAnswerReveal'), { rarity: 'rare' }),

  // legendary (1%): 조합 전체를 대체
  reg('mercyReveal', ['reveal'], 1500, () => import('./scenes/reveal/MercyReveal'), { rarity: 'legendary' }),
  reg('escapedReveal', ['reveal'], 3000, () => import('./scenes/reveal/EscapedReveal'), { rarity: 'legendary' }),
]

export function findScene(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id)
}

/** 탭 대기 중 씬 코드 프리페치 */
export function preloadScenes(ids?: string[]): void {
  const targets = ids ? SCENES.filter((s) => ids.includes(s.id)) : SCENES
  for (const s of targets) void s.preload?.()
}
