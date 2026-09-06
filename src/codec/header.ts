import { B64URL } from './bits'

// 코드 앞 1자 = 헤더. 6비트를 이렇게 쓴다:
//   상위 2비트: 인코딩 버전 (현재 0)
//   중간 2비트: 꼴받음 강도 (0 = 미지정, 1~3)
//   하위 2비트: 예약
// 버전 0이면 헤더 글자는 항상 대문자 A~P 범위. 사전 코드는 소문자로 시작하므로 겹치지 않는다.

export const CODEC_VERSION = 0
export const DEFAULT_INTENSITY = 2
export type Intensity = 1 | 2 | 3

export interface Header {
  version: number
  intensity: Intensity
}

export function encodeHeader(intensity: Intensity | 0): string {
  const value = (CODEC_VERSION << 4) | (intensity << 2)
  return B64URL[value]!
}

export function decodeHeader(ch: string): Header | null {
  const value = B64URL.indexOf(ch)
  if (value < 0) return null
  const version = value >> 4
  const rawIntensity = (value >> 2) & 0b11
  const intensity = rawIntensity === 0 ? DEFAULT_INTENSITY : (rawIntensity as Intensity)
  return { version, intensity }
}
