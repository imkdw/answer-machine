import { BitReader } from './bits'
import { CHAR_BITS, CODEPOINT_BITS, ESCAPE_INDEX, indexToCodePoint } from './alphabet'
import { decodeHeader, CODEC_VERSION, DEFAULT_INTENSITY, type Intensity } from './header'
import { lookupText } from './dictionary'

export interface DecodedAnswer {
  text: string
  intensity: Intensity
}

/** 14비트 본문 디코딩 (헤더 없음) */
export function decodeBody(encoded: string): string {
  const r = new BitReader(encoded)
  let out = ''
  while (r.remaining() >= CHAR_BITS) {
    const idx = r.read(CHAR_BITS)
    if (idx === ESCAPE_INDEX) {
      if (r.remaining() < CODEPOINT_BITS) throw new Error('truncated escape')
      out += String.fromCodePoint(r.read(CODEPOINT_BITS))
    } else {
      out += String.fromCodePoint(indexToCodePoint(idx))
    }
  }
  return out
}

/** URL 코드 -> 답변. 깨진 코드면 null. */
export function decodeAnswer(code: string): DecodedAnswer | null {
  if (!code) return null

  // 사전 코드: 2자, 또는 2자 + 강도 1자
  const dictMatch = /^([a-z][a-z0-9])([123])?$/.exec(code)
  if (dictMatch) {
    const text = lookupText(dictMatch[1]!)
    if (!text) return null
    const intensity = dictMatch[2] ? (Number(dictMatch[2]) as Intensity) : DEFAULT_INTENSITY
    return { text, intensity }
  }

  const header = decodeHeader(code[0]!)
  if (!header || header.version !== CODEC_VERSION) return null
  try {
    const text = decodeBody(code.slice(1))
    if (text.length === 0) return null
    return { text, intensity: header.intensity }
  } catch {
    return null
  }
}
