// 버튼 반응 멘트 풀. 씬과 분리해서 대사만 늘리기 쉽게.

import { MEME_SKIP_LINES, MEME_STATS } from './memes'

export const SKIP_REACTIONS = {
  first: ['응 안되쥬~', '어림도 없지', '건너뛰기? 그런 거 없음', '누르지 마세요', ...MEME_SKIP_LINES.first],
  second: ['ㅋㅋ 또 눌렀네', '두 번 눌러도 똑같음', '조급하시네요', '아 진짜 급하신가 봐요', ...MEME_SKIP_LINES.second],
  runaway: ['잡아봐', '못 잡지롱', '어딜 만져', '나 잡아봐라', ...MEME_SKIP_LINES.runaway],
  rejected: [
    '스킵 요청이 반려되었습니다 (사유: 그냥)',
    '스킵 요청이 반려되었습니다 (사유: 마음에 안 듦)',
    '스킵 권한이 없습니다 (당신은 평생 없음)',
    '건너뛰기 기능은 유료입니다 (결제 불가)',
    ...MEME_SKIP_LINES.rejected,
  ],
  patience: ['축하합니다. 인내심 테스트 통과. 상으로 씬 하나 더 드림', '7번이나 눌렀네요. 존경합니다. 하나 더 보세요', ...MEME_SKIP_LINES.patience],
  toast: ['연출 3초 추가됨', '보너스 연출 적립', '+3초 (본인 부담)', '+3초 (완전 럭키비키잖아)'],
} as const

export const HELPFUL_REACTIONS = {
  up: ['도움이 안 됐다고 하셨습니다. 수고용', '"별로"로 접수되었습니다', '싫어요 1개 반영됨', '피라미드에도 악플 달리는데요 뭐'],
  down: ['도움이 됐다니 다행이네요', '"최고"로 접수되었습니다. 감사합니다', '좋아요 1개 반영됨', '좋🤙다👍 접수됨'],
  again: ['이미 접수됨. 번복 불가', '한 번만 하세요', '접수 시스템이 퇴근했습니다'],
} as const

export const REPLAY_REACTIONS = {
  confirm: ['또 보게요?', '진짜 또 보시게요?', '한 번 더요? 취향 독특하시네'],
  yes: ['그럼 더 길게 보여드림', '알겠습니다. 이번엔 한 개 더 김'],
  no: ['안 본다고 하셨으니 보여드림', '아니오 = 예 (내부 규정)'],
} as const

export const COPY_REACTIONS = {
  fail: ['복사 실패 ㅋㅋ', '클립보드가 거부함', '복사 안 됨 (거짓말)'],
  ok: ['농담. 복사됨', '됐음. 붙여넣기 하세요', '복사됨. 이제 남한테 넘기세요'],
} as const

export const MAKE_REACTIONS = ['재능 없으실 것 같은데', '따라 하기 있기 없기?', '본인도 당해보셔야죠? 아 만드는 거지', '늙크크도 만들 수 있음', '만들기 포기하겠습니다.. 생각해보니 진행하겠습니다..'] as const

export const MUTE_REACTIONS = ['음소거 요청 접수. 검토 중...', '음소거 신청이 대기열 3번째입니다', '음소거 심사 중 (약 1초 소요)'] as const

export const CONFIRM_REACTIONS = {
  yes: ['안 보신다고 하셨군요', '"예"는 "아니오"로 처리됩니다 (내부 규정)', '예를 누르셨네요. 그럼 조금만 더'],
  no: ['그럼 보여드림', '아니오라니 솔직하시네요. 보여드림', '거절하셨으니 보여드립니다'],
} as const

export const TRIPLE_CONFIRM_QUESTIONS = ['정말 보시겠습니까?', '확실합니까?', '진짜요?', '마지막으로 묻습니다. 진짜 진짜요?'] as const

export const FAKE_STATS = [
  '이 답변을 본 사람 4,832명 (당신 제외)',
  '평균 대기 시간 12.4초. 당신은 상위 3% 인내심',
  '참고로 질문한 사람은 이미 답을 알고 있었음',
  '이 답변은 3초 만에 작성됨. 당신은 그보다 오래 기다림',
  '답변 작성자는 현재 딴짓 중',
  '이 URL을 열어본 횟수: 굳이 세어보지 않음',
  '답변 신뢰도 100% (근거 없음)',
  ...MEME_STATS,
] as const

export const AI_FAKE_ANSWERS = [
  '답변을 생성하고 있습니다... 제 생각에는 지구는 둥글고',
  '이 질문에 대한 답은 42입니다. 아니 잠깐',
  '먼저 사용자의 감정을 분석해보면 매우 조급한 상태로',
  '결론부터 말씀드리면 점심 메뉴는 제육',
  '해당 요청은 제 능력 밖입니다만 굳이 답하자면',
] as const

export const AI_CANCEL = ['아 아니다', '이게 아닌데', '취소 취소', '잘못 썼다'] as const

export const CAPTCHA_FAIL = ['실패. 로봇 확정', '사람이 아니신 것 같은데요', '체크 해제됨. 의심스러움', '검증 실패 (사유: 너무 빨리 누름)'] as const

export const POPUP_LINES = {
  login: ['답변을 보려면 로그인이 필요합니다', '회원 전용 답변입니다', '프리미엄 구독자만 열람 가능'],
  close: ['농담', '농담임 ㅋㅋ', '장난이고요', '로그인 같은 거 없음'],
} as const

export const LEGENDARY_LINES = {
  mercy: ['오늘은 봐줌', '연출 준비하는 사람이 결근함', '레전더리. 그냥 보여줌 (1% 확률)'],
  escaped: ['답변이 도망갔습니다', '답변을 찾을 수 없습니다. 잡으러 갑니다', '앗 답변이 탈출함'],
} as const

export const DONT_PRESS = {
  pressed: ['누를 줄 알았음', '역시 눌렀네', '3초도 못 참네요'],
  waited: ['인내심 테스트 통과. 근데 어차피 진행', '안 누르셨네요. 상 없음. 진행'],
} as const

export const JUDGE_NAMES = ['심사위원 A', '심사위원 B', '심사위원 C', '옆집 아저씨', '지나가던 고양이'] as const

export const KO_LINES = ['K.O.', 'PERFECT', 'FINISH', 'YOU LOSE'] as const

export const BREAKING_LINES = ['긴급 속보', '단독', '속보', '특보'] as const
export const BREAKING_SUBS = [
  '답변 도착... 내용은 잠시 후',
  '질문자 "답 좀 빨리" 요구... 답변자 "ㅋㅋ"',
  '전문가들 "이 답변, 기다릴 가치 있어"',
  '답변 공개 임박... 현장 분위기 초긴장',
] as const

export const TAP_WAIT_LINES = ['답변이 도착했습니다', '누가 답장함', '메시지 1건', '답변 배송 완료', '답변 (거의 새것) 나눔', '문 앞에 답변 두고 갔습니다', '읽씹 대신 답변 옴', '감옥에서 누가 돌아왔~게', '답변 삐에로 도착'] as const
export const TAP_WAIT_SUBS = ['탭해서 확인', '눌러야 보임', '여기 눌러', '(소리 켜면 더 꼴받음)', '탭하면 완전 럭키비키잖아', '안 누르면 예약중 됨', '무궁화 꽃이 피었습니다 (탭)', '탭하면 거제~ 야호~!', '냐냐냥 대신 탭'] as const

export const ESCAPED_RETRY = ['다시 잡아옴', '붙잡았음. 다시 시작', '잡았다 요놈'] as const

export function pick<T>(arr: ReadonlyArray<T>, rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]!
}
