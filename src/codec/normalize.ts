export const MAX_ANSWER_LENGTH = 200

/** 앞뒤 공백 제거, 연속 공백(줄바꿈 포함)은 하나로 */
export function normalizeAnswer(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** 코드포인트 기준 글자 수 (이모지도 1글자) */
export function answerLength(text: string): number {
  return Array.from(text).length
}

export type ValidationResult = { ok: true; text: string } | { ok: false; reason: string }

export function validateAnswer(raw: string): ValidationResult {
  const text = normalizeAnswer(raw)
  if (text.length === 0) return { ok: false, reason: '빈 답변은 못 보냄' }
  if (answerLength(text) > MAX_ANSWER_LENGTH) {
    return { ok: false, reason: `${MAX_ANSWER_LENGTH}자 넘으면 답변이 아니라 편지임` }
  }
  return { ok: true, text }
}
