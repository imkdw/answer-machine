import { BitWriter } from './bits'
import { CHAR_BITS, CODEPOINT_BITS, ESCAPE_INDEX, codePointToIndex } from './alphabet'
import { encodeHeader, DEFAULT_INTENSITY, type Intensity } from './header'
import { lookupCode } from './dictionary'
import { normalizeAnswer } from './normalize'

/** 텍스트 본문만 14비트 인코딩 (헤더 없음) */
export function encodeBody(text: string): string {
  const w = new BitWriter()
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    const idx = codePointToIndex(cp)
    if (idx === null) {
      w.write(ESCAPE_INDEX, CHAR_BITS)
      w.write(cp, CODEPOINT_BITS)
    } else {
      w.write(idx, CHAR_BITS)
    }
  }
  return w.toBase64Url()
}

export interface EncodeOptions {
  intensity?: Intensity
}

/**
 * 답변 -> URL 코드.
 * 정규화 후 사전에 있으면 사전 코드, 없으면 헤더 1자 + 14비트 본문.
 * 입력 검증(빈 문자열, 길이)은 validateAnswer에서 먼저 한다.
 */
export function encodeAnswer(raw: string, options: EncodeOptions = {}): string {
  const text = normalizeAnswer(raw)
  if (text.length === 0) throw new Error('empty answer')
  const intensity = options.intensity ?? DEFAULT_INTENSITY

  const dict = lookupCode(text)
  if (dict) {
    return intensity === DEFAULT_INTENSITY ? dict : `${dict}${intensity}`
  }
  const header = encodeHeader(intensity === DEFAULT_INTENSITY ? 0 : intensity)
  return header + encodeBody(text)
}
