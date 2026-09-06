import { playSfx, type SfxHandle, type SfxName } from './synth'
import { startBgm, type BgmHandle } from './bgm'

const MUTE_KEY = 'am:muted'

export interface AudioBus {
  /** 사용자 제스처 안에서 호출. 컨텍스트 생성/재개. */
  unlock: () => void
  sfx: (name: SfxName) => SfxHandle
  bgm: { start: (index: number) => void; stop: () => void; current: () => string | null }
  muted: () => boolean
  setMuted: (muted: boolean) => void
  subscribe: (fn: (muted: boolean) => void) => () => void
}

export function createAudioBus(): AudioBus {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let bgmHandle: BgmHandle | null = null
  let muted = readMuted()
  const listeners = new Set<(muted: boolean) => void>()

  const applyGain = (): void => {
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02)
  }

  const unlock = (): void => {
    if (typeof window === 'undefined') return
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    if (!ctx) {
      ctx = new Ctor()
      master = ctx.createGain()
      master.connect(ctx.destination)
      applyGain()
    }
    if (ctx.state === 'suspended') void ctx.resume()
  }

  return {
    unlock,
    sfx: (name) => {
      if (!ctx || !master) return { stop: () => {} }
      try {
        return playSfx(ctx, master, name)
      } catch {
        return { stop: () => {} }
      }
    },
    bgm: {
      start: (index) => {
        if (!ctx || !master) return
        bgmHandle?.stop()
        try {
          bgmHandle = startBgm(ctx, master, index)
        } catch {
          bgmHandle = null
        }
      },
      stop: () => {
        bgmHandle?.stop()
        bgmHandle = null
      },
      current: () => bgmHandle?.name ?? null,
    },
    muted: () => muted,
    setMuted: (next) => {
      muted = next
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      } catch {
        /* 사생활 모드 등 */
      }
      applyGain()
      listeners.forEach((fn) => fn(muted))
    },
    subscribe: (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

/** 테스트나 씬 미리보기용 무음 버스 */
export function createSilentAudioBus(): AudioBus {
  let muted = false
  return {
    unlock: () => {},
    sfx: () => ({ stop: () => {} }),
    bgm: { start: () => {}, stop: () => {}, current: () => null },
    muted: () => muted,
    setMuted: (m) => {
      muted = m
    },
    subscribe: () => () => {},
  }
}
