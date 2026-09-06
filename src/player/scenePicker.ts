import type { Scene, SceneTag } from './types'
import type { Intensity } from '../codec/header'

export interface Combo {
  sceneIds: string[]
  themeIndex: number
  bgmIndex: number
}

export interface PickOptions {
  intensity: Intensity
  rng: () => number
  /** 직전 재생 조합. 같은 조합은 피한다 */
  avoid?: string[] | null
  /** "다시 보기"나 인내심 보상으로 씬 하나 더 */
  extraScenes?: number
  themeCount: number
  bgmCount: number
}

const MIDDLE_TAGS: SceneTag[] = ['buildup', 'fakeout', 'chaos']

interface IntensityProfile {
  min: number
  max: number
  budgetMin: number
  budgetMax: number
  /** 강도 3에서 확정 포함되는 씬 */
  forced: string[]
}

const PROFILES: Record<Intensity, IntensityProfile> = {
  1: { min: 1, max: 2, budgetMin: 6000, budgetMax: 12000, forced: [] },
  2: { min: 2, max: 3, budgetMin: 10000, budgetMax: 18000, forced: [] },
  3: { min: 3, max: 4, budgetMin: 15000, budgetMax: 26000, forced: ['tripleConfirm'] },
}

const RARITY_MULTIPLIER = { common: 1, rare: 0.12, legendary: 0 } as const
const LEGENDARY_CHANCE = 0.01

function weightedPick(pool: Scene[], rng: () => number): Scene | null {
  const weights = pool.map((s) => s.weight * RARITY_MULTIPLIER[s.rarity])
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return null
  let r = rng() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]!
    if (r <= 0) return pool[i]!
  }
  return pool[pool.length - 1]!
}

function hasTag(s: Scene, tag: SceneTag): boolean {
  return s.tags.includes(tag)
}

function primaryTag(s: Scene): SceneTag {
  return s.tags.find((t) => MIDDLE_TAGS.includes(t)) ?? s.tags[0]!
}

/**
 * opener 1 + 중간 씬 n개 + reveal 1.
 * 중간 씬은 중복 없음, 같은 태그 연속 지양, duration 합이 예산 안.
 */
export function pickCombo(scenes: Scene[], opts: PickOptions): Combo {
  const { rng } = opts
  const themeIndex = Math.floor(rng() * opts.themeCount)
  const bgmIndex = Math.floor(rng() * opts.bgmCount)

  // 레전더리: 1% 확률로 조합 전체를 레전더리 씬 하나로 대체
  const legendary = scenes.filter((s) => s.rarity === 'legendary')
  if (legendary.length > 0 && rng() < LEGENDARY_CHANCE && !opts.extraScenes) {
    const s = legendary[Math.floor(rng() * legendary.length)]!
    return { sceneIds: [s.id], themeIndex, bgmIndex }
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const ids = buildOnce(scenes, opts)
    if (!opts.avoid || ids.join(',') !== opts.avoid.join(',')) {
      return { sceneIds: ids, themeIndex, bgmIndex }
    }
  }
  return { sceneIds: buildOnce(scenes, opts), themeIndex, bgmIndex }
}

function buildOnce(scenes: Scene[], opts: PickOptions): string[] {
  const { rng } = opts
  const profile = PROFILES[opts.intensity]
  const extra = opts.extraScenes ?? 0
  const targetCount = profile.min + Math.floor(rng() * (profile.max - profile.min + 1)) + extra
  const budget = profile.budgetMin + rng() * (profile.budgetMax - profile.budgetMin) + extra * 4000

  const opener = weightedPick(scenes.filter((s) => hasTag(s, 'opener')), rng)
  const reveal = weightedPick(scenes.filter((s) => hasTag(s, 'reveal')), rng)

  const middle: Scene[] = []
  const used = new Set<string>()
  let spent = (opener?.duration ?? 0) + (reveal?.duration ?? 0)

  // 강도 3 확정 씬
  for (const id of profile.forced) {
    const s = scenes.find((x) => x.id === id)
    if (s && !used.has(s.id)) {
      middle.push(s)
      used.add(s.id)
      spent += s.duration
    }
  }

  const middlePool = scenes.filter((s) => MIDDLE_TAGS.some((t) => hasTag(s, t)) && s.rarity !== 'legendary')

  let guard = 0
  while (middle.length < targetCount && guard++ < 40) {
    const lastTag = middle.length ? primaryTag(middle[middle.length - 1]!) : null
    let pool = middlePool.filter((s) => !used.has(s.id) && spent + s.duration <= budget)
    if (pool.length === 0) break
    const noRepeat = pool.filter((s) => primaryTag(s) !== lastTag)
    if (noRepeat.length > 0) pool = noRepeat
    const s = weightedPick(pool, rng)
    if (!s) break
    middle.push(s)
    used.add(s.id)
    spent += s.duration
  }

  // 최소 개수 못 채웠으면 예산 무시하고 하나 채움
  if (middle.length < profile.min) {
    const lastTag = middle.length ? primaryTag(middle[middle.length - 1]!) : null
    let pool = middlePool.filter((s) => !used.has(s.id))
    const noRepeat = pool.filter((s) => primaryTag(s) !== lastTag)
    if (noRepeat.length > 0) pool = noRepeat
    const s = weightedPick(pool, rng)
    if (s) middle.push(s)
  }

  // 강제 씬은 리빌 직전에 오도록 뒤로 보낸다
  const forcedSet = new Set(profile.forced)
  const ordered = [...middle.filter((s) => !forcedSet.has(s.id)), ...middle.filter((s) => forcedSet.has(s.id))]

  const ids: string[] = []
  if (opener) ids.push(opener.id)
  ids.push(...ordered.map((s) => s.id))
  if (reveal) ids.push(reveal.id)
  return ids
}

/** 조합에 끼워 넣을 중간 씬 하나 (인내심 보상, 잘못 보냄 등) */
export function pickExtraScene(scenes: Scene[], usedIds: string[], rng: () => number): Scene | null {
  const used = new Set(usedIds)
  const pool = scenes.filter((s) => MIDDLE_TAGS.some((t) => hasTag(s, t)) && s.rarity !== 'legendary' && !used.has(s.id))
  return weightedPick(pool.length ? pool : scenes.filter((s) => MIDDLE_TAGS.some((t) => hasTag(s, t)) && s.rarity !== 'legendary'), rng)
}

const LAST_COMBO_KEY = 'am:lastCombo'

export function loadLastCombo(): string[] | null {
  try {
    const raw = sessionStorage.getItem(LAST_COMBO_KEY)
    return raw ? (JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

export function saveLastCombo(ids: string[]): void {
  try {
    sessionStorage.setItem(LAST_COMBO_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}
