// 브금. 파일이 있으면 파일, 없으면 Web Audio로 합성한 칩튠 루프.
// public/bgm/ 에 mp3를 넣고 BGM_FILES에 경로를 추가하면 파일이 우선 선택된다.

export const BGM_FILES: ReadonlyArray<string> = []

export interface BgmHandle {
  stop: () => void
  name: string
}

type Step = number | null // 주파수(Hz) 또는 쉼표
interface Track {
  name: string
  bpm: number
  wave: OscillatorType
  melody: Step[]
  bass: Step[]
}

const N = (n: number): number => 440 * Math.pow(2, (n - 69) / 12)
const _ = null

const TRACKS: Track[] = [
  {
    name: '뽕짝',
    bpm: 150,
    wave: 'square',
    melody: [N(72), N(72), N(76), N(79), N(76), N(72), N(74), _, N(77), N(77), N(81), N(79), N(77), N(74), N(72), _],
    bass: [N(48), _, N(55), _, N(48), _, N(55), _, N(53), _, N(60), _, N(55), _, N(62), _],
  },
  {
    name: '긴장감',
    bpm: 120,
    wave: 'triangle',
    melody: [N(69), _, N(69), N(70), N(69), _, N(67), _, N(65), _, N(65), N(67), N(65), _, N(64), _],
    bass: [N(45), N(45), _, N(45), N(45), N(45), _, N(45), N(41), N(41), _, N(41), N(43), N(43), _, N(43)],
  },
  {
    name: '엘리베이터',
    bpm: 96,
    wave: 'sine',
    melody: [N(76), N(79), N(83), N(81), N(79), N(76), N(74), N(72), N(74), N(77), N(81), N(79), N(77), N(74), N(72), _],
    bass: [N(48), _, _, N(52), N(55), _, _, N(52), N(50), _, _, N(53), N(57), _, _, N(53)],
  },
  {
    name: '8비트 보스전',
    bpm: 168,
    wave: 'sawtooth',
    melody: [N(64), N(64), N(67), N(64), N(70), N(69), N(67), N(64), N(63), N(63), N(66), N(63), N(69), N(68), N(66), N(63)],
    bass: [N(40), N(40), N(52), N(40), N(40), N(40), N(52), N(40), N(39), N(39), N(51), N(39), N(39), N(39), N(51), N(39)],
  },
]

export function pickBgmIndex(rng: () => number): number {
  const total = BGM_FILES.length + TRACKS.length
  return Math.floor(rng() * total)
}

export function startBgm(ctx: AudioContext, out: AudioNode, index: number): BgmHandle {
  if (index < BGM_FILES.length) return startFile(ctx, out, BGM_FILES[index]!)
  return startSynth(ctx, out, TRACKS[(index - BGM_FILES.length) % TRACKS.length]!)
}

function startFile(ctx: AudioContext, out: AudioNode, url: string): BgmHandle {
  const el = new Audio(url)
  el.loop = true
  el.crossOrigin = 'anonymous'
  const src = ctx.createMediaElementSource(el)
  const g = ctx.createGain()
  g.gain.value = 0.5
  src.connect(g).connect(out)
  void el.play().catch(() => {})
  return {
    name: url,
    stop: () => {
      el.pause()
      src.disconnect()
    },
  }
}

function startSynth(ctx: AudioContext, out: AudioNode, track: Track): BgmHandle {
  const stepDur = 60 / track.bpm / 2 // 8분음표
  const master = ctx.createGain()
  master.gain.value = 0.11
  master.connect(out)

  let step = 0
  let nextTime = ctx.currentTime + 0.05
  let stopped = false

  const play = (freq: number, at: number, dur: number, type: OscillatorType, vol: number): void => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.9)
    osc.connect(g).connect(master)
    osc.start(at)
    osc.stop(at + dur)
  }

  const tick = (): void => {
    if (stopped) return
    while (nextTime < ctx.currentTime + 0.25) {
      const i = step % track.melody.length
      const m = track.melody[i]
      const b = track.bass[i]
      if (m) play(m, nextTime, stepDur, track.wave, 0.5)
      if (b) play(b, nextTime, stepDur * 1.5, 'triangle', 0.7)
      if (i % 4 === 0) play(60, nextTime, 0.08, 'sine', 0.9)
      nextTime += stepDur
      step++
    }
    timer = window.setTimeout(tick, 100)
  }
  let timer = window.setTimeout(tick, 0)

  return {
    name: track.name,
    stop: () => {
      stopped = true
      window.clearTimeout(timer)
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05)
      window.setTimeout(() => master.disconnect(), 300)
    },
  }
}
