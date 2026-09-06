// Web Audio API로 효과음 합성. 파일 없음.

export type SfxName =
  | 'drumroll'
  | 'pop'
  | 'beep'
  | 'static'
  | 'bang'
  | 'tick'
  | 'tada'
  | 'whoosh'
  | 'boo'
  | 'ding'
  | 'error'
  | 'typing'
  | 'coin'
  | 'crack'
  | 'siren'
  | 'kakao'
  | 'shatter'
  | 'fanfare'
  | 'sparkle'
  | 'raeulla'
  | 'piano'

export interface SfxHandle {
  stop: () => void
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

function env(ctx: AudioContext, gain: GainNode, peak: number, attack: number, decay: number, at = ctx.currentTime): void {
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
}

function tone(
  ctx: AudioContext,
  out: AudioNode,
  opts: { type?: OscillatorType; from: number; to?: number; dur: number; peak?: number; at?: number },
): void {
  const at = opts.at ?? ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.from, at)
  if (opts.to !== undefined) osc.frequency.exponentialRampToValueAtTime(opts.to, at + opts.dur)
  env(ctx, g, opts.peak ?? 0.3, 0.005, opts.dur, at)
  osc.connect(g).connect(out)
  osc.start(at)
  osc.stop(at + opts.dur + 0.05)
}

function burst(ctx: AudioContext, out: AudioNode, opts: { dur: number; peak?: number; filter?: number; at?: number }): void {
  const at = opts.at ?? ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, opts.dur + 0.05)
  const g = ctx.createGain()
  env(ctx, g, opts.peak ?? 0.4, 0.003, opts.dur, at)
  let node: AudioNode = src
  if (opts.filter) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = opts.filter
    node = src.connect(f)
  }
  node.connect(g).connect(out)
  src.start(at)
  src.stop(at + opts.dur + 0.1)
}

/** 드럼롤. 점점 빨라지고 커진다. stop() 부를 때까지 반복. */
function drumroll(ctx: AudioContext, out: AudioNode): SfxHandle {
  let stopped = false
  let t = ctx.currentTime
  let interval = 0.16
  let vol = 0.15
  const schedule = (): void => {
    if (stopped) return
    const now = ctx.currentTime
    while (t < now + 0.3) {
      burst(ctx, out, { dur: 0.06, peak: vol, filter: 900, at: t })
      tone(ctx, out, { type: 'sine', from: 150, to: 60, dur: 0.08, peak: vol * 0.8, at: t })
      t += interval
      interval = Math.max(0.045, interval * 0.965)
      vol = Math.min(0.5, vol * 1.02)
    }
    timer = window.setTimeout(schedule, 120)
  }
  let timer = window.setTimeout(schedule, 0)
  return {
    stop: () => {
      stopped = true
      window.clearTimeout(timer)
    },
  }
}

export function playSfx(ctx: AudioContext, out: AudioNode, name: SfxName): SfxHandle {
  const none: SfxHandle = { stop: () => {} }
  switch (name) {
    case 'drumroll':
      return drumroll(ctx, out)
    case 'pop':
      tone(ctx, out, { type: 'sine', from: 400, to: 1400, dur: 0.12, peak: 0.4 })
      tone(ctx, out, { type: 'triangle', from: 900, to: 1800, dur: 0.18, peak: 0.2, at: ctx.currentTime + 0.03 })
      return none
    case 'beep':
      tone(ctx, out, { type: 'square', from: 880, dur: 0.15, peak: 0.15 })
      return none
    case 'error':
      tone(ctx, out, { type: 'square', from: 300, to: 200, dur: 0.25, peak: 0.15 })
      tone(ctx, out, { type: 'square', from: 220, to: 150, dur: 0.3, peak: 0.15, at: ctx.currentTime + 0.18 })
      return none
    case 'static': {
      const h = { stop: () => {} }
      burst(ctx, out, { dur: 0.6, peak: 0.25 })
      return h
    }
    case 'bang':
      burst(ctx, out, { dur: 0.5, peak: 0.6, filter: 2500 })
      tone(ctx, out, { type: 'sine', from: 120, to: 30, dur: 0.6, peak: 0.6 })
      return none
    case 'tick':
      burst(ctx, out, { dur: 0.02, peak: 0.25, filter: 3000 })
      return none
    case 'typing':
      burst(ctx, out, { dur: 0.015, peak: 0.12, filter: 4000 })
      return none
    case 'tada': {
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((f, i) => tone(ctx, out, { type: 'triangle', from: f, dur: 0.35, peak: 0.25, at: ctx.currentTime + i * 0.09 }))
      tone(ctx, out, { type: 'triangle', from: 1318.5, dur: 0.7, peak: 0.3, at: ctx.currentTime + 0.4 })
      return none
    }
    case 'ding':
      tone(ctx, out, { type: 'sine', from: 1760, dur: 0.5, peak: 0.25 })
      tone(ctx, out, { type: 'sine', from: 2637, dur: 0.4, peak: 0.12, at: ctx.currentTime + 0.02 })
      return none
    case 'whoosh':
      burst(ctx, out, { dur: 0.35, peak: 0.3, filter: 1200 })
      return none
    case 'boo':
      tone(ctx, out, { type: 'sawtooth', from: 220, to: 110, dur: 0.6, peak: 0.12 })
      tone(ctx, out, { type: 'sawtooth', from: 233, to: 116, dur: 0.6, peak: 0.12 })
      return none
    case 'coin':
      tone(ctx, out, { type: 'square', from: 987.77, dur: 0.08, peak: 0.18 })
      tone(ctx, out, { type: 'square', from: 1318.5, dur: 0.3, peak: 0.18, at: ctx.currentTime + 0.08 })
      return none
    case 'crack':
      burst(ctx, out, { dur: 0.12, peak: 0.5, filter: 5000 })
      burst(ctx, out, { dur: 0.25, peak: 0.3, filter: 1500, at: ctx.currentTime + 0.05 })
      return none
    case 'shatter':
      for (let i = 0; i < 6; i++) {
        burst(ctx, out, { dur: 0.08, peak: 0.35, filter: 6000 - i * 700, at: ctx.currentTime + i * 0.05 })
        tone(ctx, out, { type: 'triangle', from: 2400 - i * 250, to: 600, dur: 0.15, peak: 0.08, at: ctx.currentTime + i * 0.05 })
      }
      tone(ctx, out, { type: 'sine', from: 140, to: 40, dur: 0.5, peak: 0.4 })
      return none
    case 'siren':
      for (let i = 0; i < 3; i++) {
        tone(ctx, out, { type: 'sawtooth', from: 600, to: 900, dur: 0.25, peak: 0.12, at: ctx.currentTime + i * 0.5 })
        tone(ctx, out, { type: 'sawtooth', from: 900, to: 600, dur: 0.25, peak: 0.12, at: ctx.currentTime + i * 0.5 + 0.25 })
      }
      return none
    case 'kakao': {
      // 카톡 알림음 느낌. 짧게 두 번
      const at = ctx.currentTime
      tone(ctx, out, { type: 'sine', from: 1046.5, dur: 0.09, peak: 0.25, at })
      tone(ctx, out, { type: 'sine', from: 1318.5, dur: 0.09, peak: 0.25, at: at + 0.11 })
      tone(ctx, out, { type: 'sine', from: 1046.5, dur: 0.09, peak: 0.2, at: at + 0.22 })
      tone(ctx, out, { type: 'sine', from: 1318.5, dur: 0.2, peak: 0.2, at: at + 0.33 })
      return none
    }
    case 'fanfare': {
      const at = ctx.currentTime
      const seq = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.5]
      seq.forEach((f, i) => tone(ctx, out, { type: 'square', from: f, dur: i === seq.length - 1 ? 0.8 : 0.14, peak: 0.16, at: at + i * 0.13 }))
      seq.forEach((f, i) => tone(ctx, out, { type: 'triangle', from: f / 2, dur: i === seq.length - 1 ? 0.8 : 0.14, peak: 0.12, at: at + i * 0.13 }))
      return none
    }
    case 'raeulla': {
      // 하품하다 성악가처럼 "라을라~~~". 비브라토 붙은 글라이드
      const at = ctx.currentTime
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(330, at)
      osc.frequency.exponentialRampToValueAtTime(440, at + 0.25)
      osc.frequency.exponentialRampToValueAtTime(392, at + 0.6)
      osc.frequency.exponentialRampToValueAtTime(330, at + 1.1)
      lfo.frequency.value = 6
      lfoGain.gain.value = 12
      lfo.connect(lfoGain).connect(osc.frequency)
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 1800
      env(ctx, g, 0.2, 0.08, 1.2, at)
      osc.connect(f).connect(g).connect(out)
      osc.start(at)
      lfo.start(at)
      osc.stop(at + 1.4)
      lfo.stop(at + 1.4)
      return none
    }
    case 'piano': {
      // 피아노 학원 느낌 코드 한 번
      const at = ctx.currentTime
      ;[261.63, 329.63, 392.0].forEach((f) => tone(ctx, out, { type: 'triangle', from: f, dur: 0.5, peak: 0.12, at }))
      return none
    }
    case 'sparkle': {
      const at = ctx.currentTime
      for (let i = 0; i < 8; i++) tone(ctx, out, { type: 'sine', from: 1500 + Math.random() * 2500, dur: 0.12, peak: 0.07, at: at + i * 0.04 })
      return none
    }
  }
}
