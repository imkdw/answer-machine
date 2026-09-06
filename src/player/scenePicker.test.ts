import { describe, it, expect } from 'vitest'
import { pickCombo, pickExtraScene } from './scenePicker'
import { createRng } from './rng'
import type { Scene, SceneTag, Rarity } from './types'

const Dummy = (): null => null

function scene(id: string, tag: SceneTag, duration: number, rarity: Rarity = 'common', weight = 1): Scene {
  return { id, tags: [tag], duration, weight, rarity, component: Dummy }
}

const SCENES: Scene[] = [
  scene('op1', 'opener', 2000),
  scene('op2', 'opener', 2500),
  scene('b1', 'buildup', 3000),
  scene('b2', 'buildup', 4000),
  scene('f1', 'fakeout', 3000),
  scene('f2', 'fakeout', 2500),
  scene('tripleConfirm', 'fakeout', 4000),
  scene('c1', 'chaos', 3000),
  scene('c2', 'chaos', 2000),
  scene('rareChaos', 'chaos', 3000, 'rare'),
  scene('rv1', 'reveal', 2000),
  scene('rv2', 'reveal', 3000),
  scene('mercy', 'reveal', 1000, 'legendary'),
]

const byId = new Map(SCENES.map((s) => [s.id, s]))
const opts = { themeCount: 5, bgmCount: 4 }

describe('pickCombo', () => {
  it('opener 1, reveal 1, 중간 2~3개, 중복 없음, 같은 태그 연속 지양 (강도 2)', () => {
    let repeats = 0
    for (let seed = 0; seed < 300; seed++) {
      const rng = createRng(seed)
      const combo = pickCombo(SCENES, { intensity: 2, rng, ...opts })
      const ids = combo.sceneIds
      if (ids.length === 1) {
        expect(byId.get(ids[0]!)!.rarity).toBe('legendary')
        continue
      }
      expect(byId.get(ids[0]!)!.tags).toContain('opener')
      expect(byId.get(ids[ids.length - 1]!)!.tags).toContain('reveal')
      const middle = ids.slice(1, -1)
      expect(middle.length).toBeGreaterThanOrEqual(2)
      expect(middle.length).toBeLessThanOrEqual(3)
      expect(new Set(ids).size).toBe(ids.length)
      for (let i = 1; i < middle.length; i++) {
        if (byId.get(middle[i]!)!.tags[0] === byId.get(middle[i - 1]!)!.tags[0]) repeats++
      }
      const total = ids.reduce((a, id) => a + byId.get(id)!.duration, 0)
      expect(total).toBeLessThanOrEqual(18000)
      expect(combo.themeIndex).toBeLessThan(5)
      expect(combo.bgmIndex).toBeLessThan(4)
    }
    // 예산이 빠듯할 때만 드물게 허용
    expect(repeats).toBeLessThan(15)
  })

  it('강도 3이면 tripleConfirm이 리빌 직전에 확정 포함', () => {
    for (let seed = 0; seed < 100; seed++) {
      const ids = pickCombo(SCENES, { intensity: 3, rng: createRng(seed), ...opts }).sceneIds
      if (ids.length === 1) continue
      expect(ids[ids.length - 2]).toBe('tripleConfirm')
    }
  })

  it('강도 1이면 중간 1~2개', () => {
    for (let seed = 0; seed < 100; seed++) {
      const ids = pickCombo(SCENES, { intensity: 1, rng: createRng(seed), ...opts }).sceneIds
      if (ids.length === 1) continue
      expect(ids.length - 2).toBeGreaterThanOrEqual(1)
      expect(ids.length - 2).toBeLessThanOrEqual(2)
    }
  })

  it('직전 조합과 같으면 다시 뽑는다', () => {
    const first = pickCombo(SCENES, { intensity: 2, rng: createRng(7), ...opts }).sceneIds
    let same = 0
    for (let seed = 0; seed < 200; seed++) {
      const next = pickCombo(SCENES, { intensity: 2, rng: createRng(seed), avoid: first, ...opts }).sceneIds
      if (next.join() === first.join()) same++
    }
    expect(same).toBe(0)
  })

  it('레전더리는 대략 1%, rare는 common보다 훨씬 드물다', () => {
    let legendary = 0
    let rare = 0
    const N = 5000
    for (let seed = 0; seed < N; seed++) {
      const ids = pickCombo(SCENES, { intensity: 2, rng: createRng(seed + 10000), ...opts }).sceneIds
      if (ids.length === 1) legendary++
      if (ids.includes('rareChaos')) rare++
    }
    expect(legendary / N).toBeGreaterThan(0.002)
    expect(legendary / N).toBeLessThan(0.03)
    expect(rare / N).toBeGreaterThan(0.02)
    expect(rare / N).toBeLessThan(0.25)
  })

  it('같은 시드면 같은 조합', () => {
    const a = pickCombo(SCENES, { intensity: 2, rng: createRng(42), ...opts })
    const b = pickCombo(SCENES, { intensity: 2, rng: createRng(42), ...opts })
    expect(a).toEqual(b)
  })

  it('pickExtraScene은 안 쓴 중간 씬을 준다', () => {
    const s = pickExtraScene(SCENES, ['op1', 'b1', 'f1', 'c1', 'rv1'], createRng(1))
    expect(s).not.toBeNull()
    expect(['op1', 'b1', 'f1', 'c1', 'rv1']).not.toContain(s!.id)
    expect(s!.rarity).not.toBe('legendary')
  })
})
