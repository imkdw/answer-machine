import { MEME_AD_LINES, MEME_LOADING_LINES } from './memes'

export const LOADING_LINES = [
  '답변 압축 해제 중',
  '감정 이입 중',
  '눈치 보는 중',
  '답변자 깨우는 중',
  '오타 검사 중 (없음)',
  '스포일러 방지막 설치 중',
  '인내심 측정 중',
  '서버 없는데 서버 접속 중',
  '답변 글자 정렬 중',
  '진짜 거의 다 됨',
  '거짓말 아님',
  '자막 싱크 맞추는 중',
  '커피 한 잔 하는 중',
  '답변 온도 데우는 중',
  '99%에서 버티는 중',
  '용량 부족... 농담',
  '질문 다시 읽는 중',
  '변명 생성 중',
  ...MEME_LOADING_LINES,
] as const

export const WAIT_BUTTON_LABELS = ['잠시만요', '조금만요', '거의 다 됐어요', '거짓말이에요'] as const

export const FAKE_AD_LINES = [
  { title: '답변 프리미엄', body: '광고 없이 답변 보기. 월 9,900원 (결제 불가)' },
  { title: '인내심 보충제', body: '하루 한 알로 스킵 버튼 안 누르기' },
  { title: '질문 안 하기 강좌', body: '애초에 안 물어봤으면 됐잖아요' },
  { title: '이 광고는 가짜입니다', body: '근데 5초는 진짜임' },
  ...MEME_AD_LINES,
] as const
