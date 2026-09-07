// 프리셋 사전. 배포 후에는 추가만 한다. 코드 삭제/변경 금지.
// 코드 규칙: 2글자, 첫 글자는 소문자 (헤더 글자 A~P와 구분).
// 세 번째 글자로 강도(1~3)를 붙일 수 있다. 예: k32 = "ㅇㅋ 가자" 강도 2

export const DICTIONARY: ReadonlyArray<readonly [code: string, text: string]> = [
  ['k3', 'ㅇㅋ 가자'],
  ['n1', '싫은데요'],
  ['m0', '몰라'],
  ['y0', '응'],
  ['n0', '아니'],
  ['o0', 'ㅇㅇ'],
  ['x0', 'ㄴㄴ'],
  ['k0', 'ㅇㅋ'],
  ['g0', 'ㄱㄱ'],
  ['a0', '알아서 해'],
  ['b0', '바빠'],
  ['h0', '하기 싫어'],
  ['s0', '생각 좀 해볼게'],
  ['s1', '싫어'],
  ['j0', '좋아'],
  ['j1', '조금만 기다려'],
  ['d0', '됐어'],
  ['d1', '다음에'],
  ['c0', '취소'],
  ['e0', '나중에'],
  ['p0', '보류'],
  ['w0', '왜'],
  ['r0', '몰라도 돼'],
  ['q0', '그건 좀'],
  ['t0', '당연하지'],
  ['t1', '절대 안 됨'],
  ['u0', '너가 해'],
  ['i0', '이미 늦음'],
  ['f0', '됐고 밥이나 먹자'],
  ['v0', '비밀'],
  ['z0', 'ㅋㅋㅋㅋ'],
  ['z1', 'ㅠㅠ'],
  ['l0', '나도 몰라'],
  ['l1', '내가 왜'],
  ['k1', '가능'],
  ['k2', '불가능'],
  // 2026-09 밈 추가분 (추가만, 변경 금지)
  ['v1', '완전 럭키비키잖아'],
  ['a1', '알빠노'],
  ['e1', '어쩔티비'],
  ['n2', '누칼협'],
  ['m1', '제가요? 이걸요? 왜요?'],
  ['o1', '오히려 좋아'],
  ['g1', '그건 니 생각이고'],
  ['y1', '응 아니야'],
  ['i1', '이븐하게 익었어요'],
  ['j2', '중요한 건 꺾이지 않는 마음'],
  ['r1', 'ㄹㅇㅋㅋ'],
  ['k4', '킹정'],
  ['e2', '예약중'],
  ['h1', '허거덩거덩스'],
  // 2026-09 밈 추가분 2차
  ['g2', '거제 야호'],
  ['n3', '난리자베스'],
  ['w1', '왜요 쌤'],
  ['j3', '좋다'],
  ['p1', '삐바삐'],
  ['s2', '잘 살아'],
  ['y2', '영크크'],
  ['r2', '라을라'],
  ['d2', '답변 포기하겠습니다'],
  ['u1', '운동 많이 된다'],
]

const textToCode = new Map<string, string>()
const codeToText = new Map<string, string>()

for (const [code, text] of DICTIONARY) {
  if (!/^[a-z][a-z0-9]$/.test(code)) throw new Error(`bad dictionary code: ${code}`)
  if (codeToText.has(code)) throw new Error(`duplicate dictionary code: ${code}`)
  if (textToCode.has(text)) throw new Error(`duplicate dictionary text: ${text}`)
  textToCode.set(text, code)
  codeToText.set(code, text)
}

export function lookupCode(normalizedText: string): string | undefined {
  return textToCode.get(normalizedText)
}

export function lookupText(code: string): string | undefined {
  return codeToText.get(code)
}

/** 홈 화면 프리셋 버튼용. 사전(DICTIONARY)은 그대로 두고 버튼만 줄임. 너무 많으면 안 고름. */
export const PRESETS: ReadonlyArray<string> = [
  'ㅇㅋ 가자',
  '싫은데요',
  '몰라',
  '알아서 해',
  '절대 안 됨',
  '너가 해',
  '비밀',
  '알빠노',
  '응 아니야',
  '거제 야호',
]
