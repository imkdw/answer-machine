// 글자 <-> 14비트 인덱스 매핑
//
// 인덱스 공간 (총 11318 + 이스케이프 1):
//   [0, 11172)          한글 완성형 (U+AC00 ~ U+D7A3)
//   [11172, 11223)      호환 자모 51자 (U+3131 ~ U+3163)
//   [11223, 11318)      ASCII 출력 가능 문자 95자 (U+0020 ~ U+007E)
//   11318               이스케이프. 뒤에 21비트 코드포인트가 따라온다.

export const CHAR_BITS = 14
export const CODEPOINT_BITS = 21

const HANGUL_START = 0xac00
const HANGUL_COUNT = 11172
const JAMO_START = 0x3131
const JAMO_COUNT = 51
const ASCII_START = 0x20
const ASCII_COUNT = 95

const JAMO_BASE = HANGUL_COUNT
const ASCII_BASE = JAMO_BASE + JAMO_COUNT
export const ESCAPE_INDEX = ASCII_BASE + ASCII_COUNT // 11318

export function codePointToIndex(cp: number): number | null {
  if (cp >= HANGUL_START && cp < HANGUL_START + HANGUL_COUNT) return cp - HANGUL_START
  if (cp >= JAMO_START && cp < JAMO_START + JAMO_COUNT) return JAMO_BASE + (cp - JAMO_START)
  if (cp >= ASCII_START && cp < ASCII_START + ASCII_COUNT) return ASCII_BASE + (cp - ASCII_START)
  return null
}

export function indexToCodePoint(index: number): number {
  if (index < JAMO_BASE) return HANGUL_START + index
  if (index < ASCII_BASE) return JAMO_START + (index - JAMO_BASE)
  if (index < ESCAPE_INDEX) return ASCII_START + (index - ASCII_BASE)
  throw new Error(`index out of range: ${index}`)
}
