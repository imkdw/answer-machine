import { describe, it, expect } from 'vitest'
import { encodeAnswer, encodeBody } from './encode'
import { decodeAnswer, decodeBody } from './decode'
import { DICTIONARY } from './dictionary'
import { normalizeAnswer, validateAnswer } from './normalize'

const SAMPLES = [
  'ㅇㅋ 가자',
  '싫은데요',
  '그건 좀 아닌 것 같은데 다시 생각해봐',
  'ㅋㅋㅋㅋㅋ ㅠㅠ',
  'Hello, world! 123 ~`@#$%^&*()_+-=[]{}|;:\'",.<>/?\\',
  '이모지 🎉🔥 섞임 👍🏽',
  '한자 漢字 그리고 일본어 ひらがな',
  '가',
  '힣',
  'ㄱ',
  'ㅣ',
  ' ',
  '~',
  '뷁뷁뷁 똠방각하',
  '\u{1F600}\u{1F601}\u{10FFFF}',
]

describe('encodeBody / decodeBody', () => {
  it.each(SAMPLES)('왕복: %s', (text) => {
    expect(decodeBody(encodeBody(text))).toBe(text)
  })

  it('한글 완성형 전체 왕복', () => {
    let s = ''
    for (let cp = 0xac00; cp <= 0xd7a3; cp++) s += String.fromCodePoint(cp)
    expect(decodeBody(encodeBody(s))).toBe(s)
  })

  it('자모/ASCII 전체 왕복', () => {
    let s = ''
    for (let cp = 0x3131; cp <= 0x3163; cp++) s += String.fromCodePoint(cp)
    for (let cp = 0x20; cp <= 0x7e; cp++) s += String.fromCodePoint(cp)
    expect(decodeBody(encodeBody(s))).toBe(s)
  })

  it('한글은 글자당 14비트 -> base64 대비 짧다', () => {
    const text = '그건 좀 아닌 것 같은데 다시 생각해봐'
    const utf8b64 = btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    expect(encodeBody(text).length).toBeLessThan(utf8b64.length)
    expect(encodeBody(text).length).toBe(49)
  })

  it('base64url 알파벳만 쓴다', () => {
    for (const s of SAMPLES) expect(encodeBody(s)).toMatch(/^[A-Za-z0-9_-]*$/)
  })
})

describe('encodeAnswer / decodeAnswer', () => {
  it('사전에 있는 문구는 사전 코드', () => {
    expect(encodeAnswer('ㅇㅋ 가자')).toBe('k3')
    expect(encodeAnswer('  ㅇㅋ   가자 \n')).toBe('k3')
    expect(decodeAnswer('k3')).toEqual({ text: 'ㅇㅋ 가자', intensity: 2 })
  })

  it('사전 코드 + 강도', () => {
    expect(encodeAnswer('싫은데요', { intensity: 3 })).toBe('n13')
    expect(decodeAnswer('n13')).toEqual({ text: '싫은데요', intensity: 3 })
    expect(decodeAnswer('n12')).toEqual({ text: '싫은데요', intensity: 2 })
  })

  it('사전 전체 왕복', () => {
    for (const [code, text] of DICTIONARY) {
      expect(encodeAnswer(text)).toBe(code)
      expect(decodeAnswer(code)?.text).toBe(text)
    }
  })

  it('사전에 없는 문구는 헤더 + 본문', () => {
    const code = encodeAnswer('그건 좀 아닌 것 같은데 다시 생각해봐')
    expect(code[0]).toBe('A')
    expect(code.length).toBe(50)
    expect(decodeAnswer(code)).toEqual({ text: '그건 좀 아닌 것 같은데 다시 생각해봐', intensity: 2 })
  })

  it('강도가 헤더에 실린다', () => {
    for (const intensity of [1, 2, 3] as const) {
      const code = encodeAnswer('오늘은 안 됨', { intensity })
      expect(decodeAnswer(code)).toEqual({ text: '오늘은 안 됨', intensity })
    }
    expect(encodeAnswer('오늘은 안 됨', { intensity: 1 })[0]).toBe('E')
    expect(encodeAnswer('오늘은 안 됨', { intensity: 3 })[0]).toBe('M')
  })

  it('같은 문구는 항상 같은 코드', () => {
    expect(encodeAnswer('배고파')).toBe(encodeAnswer('  배고파 '))
  })

  it('깨진 코드는 null', () => {
    expect(decodeAnswer('')).toBeNull()
    expect(decodeAnswer('zz')).toBeNull()
    expect(decodeAnswer('A')).toBeNull()
    expect(decodeAnswer('A!!!')).toBeNull()
    expect(decodeAnswer('_AAAA')).toBeNull() // 버전 3 (미래)
  })

  it('헤더는 A~P, 사전 코드는 소문자 시작이라 겹치지 않는다', () => {
    const dictTexts = new Set(DICTIONARY.map(([, t]) => t))
    for (const s of SAMPLES) {
      const text = s.trim() || 'x'
      if (dictTexts.has(text)) continue
      expect(encodeAnswer(text)[0]).toMatch(/[A-P]/)
    }
  })
})

describe('normalize / validate', () => {
  it('공백 정규화', () => {
    expect(normalizeAnswer('  a   b\n\nc\t d ')).toBe('a b c d')
  })
  it('빈 문자열 거부', () => {
    expect(validateAnswer('   ').ok).toBe(false)
  })
  it('200자 초과 거부, 200자는 허용', () => {
    expect(validateAnswer('가'.repeat(200)).ok).toBe(true)
    expect(validateAnswer('가'.repeat(201)).ok).toBe(false)
    expect(validateAnswer('🎉'.repeat(200)).ok).toBe(true)
  })
})
