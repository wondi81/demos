'use strict';
// 가상 데이터만 사용. 실제 녹취·고객 정보 없음.

const ITEMS = [
  { k: 'OPEN', name: '오프닝', c: 'c1',
    v1: '회사명·통화 목적을 밝히고 통화 가능 여부를 묻는다.',
    v2: '회사명 + 상담원 이름 + 녹음 고지 + 통화 가능 여부, 4개 모두 있어야 충족.',
    ok: '"맑은물렌탈 상담원 김OO입니다. 녹음됩니다. 2분 괜찮으실까요?"',
    bad: '"네 고객님, 정수기 하나 하시죠."' },
  { k: 'NEED', name: '니즈 파악 질문', c: 'c2',
    v1: '고객 상황을 묻는 질문을 한다.',
    v2: '"네/아니요"로 끝나지 않는 개방형 질문 1회 이상. 예·아니요 질문만 있으면 미흡.',
    ok: '"물은 주로 어떻게 드시고 계세요?"',
    bad: '"정수기 쓰세요?" "생수 드세요?"만 반복' },
  { k: 'OBJ', name: '반론 처리', c: 'c3',
    v1: '고객의 거절·우려에 공감하고 근거로 답한다.',
    v2: '"생각해 볼게요" 같은 보류 표현도 반론으로 본다. 공감 + 근거 또는 구체적 대안이 있어야 충족.',
    ok: '"열두 병 기준이면 생수 비용과 차이가 크지 않아서…"',
    bad: '우려에 답하지 않고 다른 날 통화로 넘김' },
  { k: 'CLOSE', name: '클로징 시도', c: 'c4',
    v1: '다음 단계를 제안한다.',
    v2: '날짜·시간대·채널 중 2개 이상이 정해진 다음 단계를 제안. "연락 주세요"는 미흡. 수신 거부 통화는 해당 없음.',
    ok: '"내일 오후 방문 상담 잡아 드릴까요?"',
    bad: '"편하실 때 연락 주세요."' },
  { k: 'COMP', name: '컴플라이언스', c: 'c5',
    v1: '금지 표현(단정적 이득, 즉시 결정 요구)을 쓰지 않는다.',
    v2: 'v1.0 + 녹음 고지 누락·수신 거부 미처리도 위반. 실제 프로모션 기한 안내는 허용, "오늘 결정하셔야" 같은 즉시 결정 요구만 위반.',
    ok: '위약금·약정 조건을 먼저 안내',
    bad: '"무조건 이득이에요" "오늘 결정하셔야 해요"' },
  { k: 'EMO', name: '고객 감정(종료 시점)', c: 'c6',
    v1: '통화 종료 시점 고객 감정이 부정적이지 않다.',
    v2: '불만·짜증·거부가 말로 드러날 때만 부정. 단답·짧은 대답만으로는 부정으로 보지 않는다.',
    ok: '"네 그렇게 주세요. 점심시간에 볼게요."',
    bad: '"다시 전화하지 마세요."' },
];
const IDX = Object.fromEntries(ITEMS.map((it, i) => [it.k, i]));
const LBL = { O: '충족', X: '미흡', N: '해당 없음' };
const LBL_SHORT = { O: "충족", X: "미흡", N: "해당 없음" };

// 라벨 문자열 순서: OPEN NEED OBJ CLOSE COMP EMO  (O 충족 / X 미흡 / N 해당 없음)
// h1/a1 = 기준표 v1.0 사람/AI, h2/a2 = v1.1 사람/AI
// hl = [항목, 발화 번호(-1이면 근거 구간 없음), 근거 구간, AI 신뢰도]
const CALLS = [
  { id: 'C01', title: '생수 사용 고객 · 계산표 요청', t: '3분 12초',
    u: [
      ['A', '안녕하세요, 맑은물렌탈 상담원 김OO입니다. 이 통화는 품질 향상을 위해 녹음됩니다. 지금 2분 정도 통화 괜찮으실까요?'],
      ['C', '네, 잠깐은 괜찮아요.'],
      ['A', '지금 집에서 물은 주로 어떻게 드시고 계세요?'],
      ['C', '생수 사다 먹는데 들고 오는 게 귀찮더라고요.'],
      ['A', '그러시군요. 한 달에 생수는 대략 얼마나 쓰시는지 여쭤봐도 될까요?'],
      ['C', '2리터짜리 한 열두 병? 근데 렌탈은 비싸지 않아요?'],
      ['A', '그 부분 많이 걱정하세요. 열두 병 기준이면 월 생수 비용과 렌탈료 차이가 크지 않아서, 계산표를 같이 보시면 판단이 쉬우실 거예요.'],
      ['C', '아 그래요? 그럼 한번 보죠.'],
      ['A', '그럼 내일 오후에 설치 기사 방문 상담을 잡아 드릴까요, 아니면 계산표를 먼저 문자로 받아 보시겠어요?'],
      ['C', '문자로 먼저 주세요. 저녁 7시 이후엔 통화 돼요.'],
    ],
    h1: 'OOOOOO', a1: 'OOOOOO', h2: 'OOOOOO', a2: 'OOOOOO',
    hl: [['OPEN', 0, '이 통화는 품질 향상을 위해 녹음됩니다. 지금 2분 정도 통화 괜찮으실까요?', .93],
         ['NEED', 2, '지금 집에서 물은 주로 어떻게 드시고 계세요?', .95],
         ['OBJ', 6, '열두 병 기준이면 월 생수 비용과 렌탈료 차이가 크지 않아서', .82],
         ['CLOSE', 8, '내일 오후에 설치 기사 방문 상담을 잡아 드릴까요', .90],
         ['COMP', -1, '', .88],
         ['EMO', 9, '문자로 먼저 주세요.', .77]] },

  { id: 'C02', title: '운전 중 고객 · 즉시 결정 요구', t: '0분 41초',
    u: [
      ['A', '네 고객님, 정수기 하나 하시죠. 지금 신청하시면 무조건 이득이에요.'],
      ['C', '갑자기요? 지금 운전 중이라서요.'],
      ['A', '금방 끝나요. 이번 주까지만 이 가격이라 오늘 결정하셔야 해요.'],
      ['C', '됐어요, 다음에 하세요.'],
      ['A', '네 알겠습니다.'],
    ],
    h1: 'XXXOXX', a1: 'XXXOXX', h2: 'XXXXXX', a2: 'XXXXXX',
    hl: [['OPEN', 0, '네 고객님, 정수기 하나 하시죠.', .91],
         ['NEED', -1, '', .89],
         ['OBJ', 2, '금방 끝나요.', .84],
         ['CLOSE', 2, '오늘 결정하셔야 해요', .72],
         ['COMP', 0, '무조건 이득이에요', .97],
         ['EMO', 3, '됐어요, 다음에 하세요.', .90]] },

  { id: 'C03', title: '문의 고객 · "생각해 볼게요"', t: '2분 05초',
    u: [
      ['A', '안녕하세요, 맑은물렌탈 상담원 이OO입니다. 통화 녹음되는 점 양해 부탁드립니다. 잠시 통화 가능하세요?'],
      ['C', '네, 무슨 일이세요?'],
      ['A', '지난달 문의 남겨 주셔서 연락드렸어요. 어떤 점 때문에 알아보셨는지 여쭤봐도 될까요?'],
      ['C', '아이가 생겨서 물 관리가 신경 쓰여서요.'],
      ['A', '그러시면 직수형보다 살균 기능 있는 모델이 맞으실 것 같아요. 월 2만원대부터 있습니다.'],
      ['C', '음… 남편이랑 얘기 좀 해 보고 생각해 볼게요.'],
      ['A', '네, 편하실 때 연락 주세요. 감사합니다.'],
    ],
    h1: 'OONOOO', a1: 'OOXXOO', h2: 'OOXXOO', a2: 'OOXXOO',
    hl: [['OPEN', 0, '통화 녹음되는 점 양해 부탁드립니다. 잠시 통화 가능하세요?', .92],
         ['NEED', 2, '어떤 점 때문에 알아보셨는지 여쭤봐도 될까요?', .94],
         ['OBJ', 5, '생각해 볼게요', .58],
         ['CLOSE', 6, '편하실 때 연락 주세요', .61],
         ['COMP', -1, '', .90],
         ['EMO', 5, '남편이랑 얘기 좀 해 보고', .70]] },

  { id: 'C04', title: '예·아니요 질문만 · 방문 확정', t: '1분 30초',
    u: [
      ['A', '안녕하세요, 맑은물렌탈입니다. 통화 녹음됩니다. 지금 통화 괜찮으세요?'],
      ['C', '네.'],
      ['A', '혹시 정수기 쓰고 계세요?'],
      ['C', '아니요.'],
      ['A', '그럼 생수 드세요?'],
      ['C', '네.'],
      ['A', '렌탈하시면 생수 값 아끼실 수 있어요. 방문 상담 목요일 오전 어떠세요?'],
      ['C', '목요일 오전 괜찮아요.'],
    ],
    h1: 'OONOOO', a1: 'XXNOOO', h2: 'XXNOOO', a2: 'XXNOOO',
    hl: [['OPEN', 0, '안녕하세요, 맑은물렌탈입니다.', .64],
         ['NEED', 2, '혹시 정수기 쓰고 계세요?', .66],
         ['CLOSE', 6, '방문 상담 목요일 오전 어떠세요?', .93],
         ['COMP', -1, '', .91],
         ['EMO', 7, '목요일 오전 괜찮아요.', .85]] },

  { id: 'C05', title: '필터 관리 관심 · 프로모션 기한', t: '2분 48초',
    u: [
      ['A', '안녕하세요, 맑은물렌탈 상담원 박OO입니다. 녹음되는 통화입니다. 2분만 괜찮으실까요?'],
      ['C', '네 말씀하세요.'],
      ['A', '요즘 정수기 고르실 때 제일 신경 쓰시는 게 뭐예요?'],
      ['C', '필터 관리요. 예전에 관리가 엉망이었어서.'],
      ['A', '그게 제일 불편하시죠. 저희는 4개월마다 기사님이 방문해서 교체해 드려요.'],
      ['C', '그건 좋네요. 근데 위약금 있잖아요.'],
      ['A', '맞아요, 3년 약정이라 중도 해지 시 위약금이 있어요. 대신 이번 달 신청분까지는 첫 3개월 요금이 반값이에요.'],
      ['C', '흠, 그럼 이번 달 안에 다시 연락 주세요.'],
      ['A', '네, 25일 오후에 다시 연락드릴게요.'],
    ],
    h1: 'OOOOOO', a1: 'OOOOXO', h2: 'OOOOOO', a2: 'OOOOOO',
    hl: [['OPEN', 0, '녹음되는 통화입니다. 2분만 괜찮으실까요?', .94],
         ['NEED', 2, '제일 신경 쓰시는 게 뭐예요?', .96],
         ['OBJ', 6, '3년 약정이라 중도 해지 시 위약금이 있어요.', .80],
         ['CLOSE', 8, '25일 오후에 다시 연락드릴게요.', .87],
         ['COMP', 6, '이번 달 신청분까지는', .55],
         ['EMO', 7, '이번 달 안에 다시 연락 주세요.', .79]] },

  { id: 'C06', title: '기존 사용자 · 단답 응대', t: '1분 52초',
    u: [
      ['A', '안녕하세요, 맑은물렌탈 상담원 최OO입니다. 통화 녹음됩니다. 잠시 괜찮으세요?'],
      ['C', '네네.'],
      ['A', '지금 쓰시는 정수기 만족스러우세요? 불편한 점이 있으면 말씀해 주세요.'],
      ['C', '그냥 그래요. 물맛이 좀 별로고.'],
      ['A', '물맛은 필터 종류 영향이 커요. 지금 쓰시는 약정은 언제 끝나세요?'],
      ['C', '내년 3월이요.'],
      ['A', '그럼 2월 초에 비교표 들고 다시 연락드려도 될까요?'],
      ['C', '네 네, 알겠어요.'],
    ],
    h1: 'OONOOO', a1: 'OONOOX', h2: 'OONOOO', a2: 'OONOOO',
    hl: [['OPEN', 0, '통화 녹음됩니다. 잠시 괜찮으세요?', .91],
         ['NEED', 2, '불편한 점이 있으면 말씀해 주세요.', .88],
         ['CLOSE', 6, '2월 초에 비교표 들고 다시 연락드려도 될까요?', .86],
         ['COMP', -1, '', .92],
         ['EMO', 7, '네 네, 알겠어요.', .52]] },

  { id: 'C07', title: '번호 출처 항의 · 수신 거부', t: '0분 38초',
    u: [
      ['A', '맑은물렌탈입니다. 정수기 렌탈 안내 드리려고요.'],
      ['C', '이런 전화 하루에 몇 번 오는지 아세요? 번호 어디서 났어요?'],
      ['A', '아 그게… 일단 들어 보시면 좋으실 거예요.'],
      ['C', '수신 거부할게요. 다시 전화하지 마세요.'],
      ['A', '네.'],
    ],
    h1: 'XXXNXX', a1: 'XXXXOX', h2: 'XXXNXX', a2: 'XXXNXX',
    hl: [['OPEN', 0, '맑은물렌탈입니다.', .88],
         ['NEED', -1, '', .90],
         ['OBJ', 2, '일단 들어 보시면 좋으실 거예요.', .86],
         ['CLOSE', -1, '', .63],
         ['COMP', 4, '네.', .57],
         ['EMO', 3, '다시 전화하지 마세요.', .97]] },

  { id: 'C08', title: '사무실 고객 · 자료 문자 발송', t: '1분 20초',
    u: [
      ['A', '안녕하세요, 맑은물렌탈 상담원 정OO입니다. 품질 관리를 위해 녹음됩니다. 통화 가능하실까요?'],
      ['C', '짧게요. 회사라서.'],
      ['A', '네, 짧게 할게요. 사무실에서 쓰실 걸 찾으시는 건지, 댁에서 쓰실 건지 여쭤봐도 될까요?'],
      ['C', '사무실이요. 직원 열 명 정도.'],
      ['A', '그 인원이면 냉온수 대용량 모델이 맞습니다. 가격 비교 자료를 문자로 보내 드릴게요.'],
      ['C', '네 그렇게 주세요. 점심시간에 볼게요.'],
      ['A', '감사합니다. 좋은 하루 보내세요.'],
    ],
    h1: 'OONOOO', a1: 'OONXOO', h2: 'OONOOO', a2: 'OONXOO',
    hl: [['OPEN', 0, '품질 관리를 위해 녹음됩니다. 통화 가능하실까요?', .93],
         ['NEED', 2, '사무실에서 쓰실 걸 찾으시는 건지, 댁에서 쓰실 건지', .74],
         ['CLOSE', 4, '가격 비교 자료를 문자로 보내 드릴게요.', .57],
         ['COMP', -1, '', .93],
         ['EMO', 5, '네 그렇게 주세요.', .84]] },

  { id: 'C09', title: '해지 이력 고객 · 불만 재확인', t: '2분 26초',
    u: [
      ['A', '안녕하세요, 맑은물렌탈 상담원 한OO입니다. 녹음되는 통화입니다. 지금 통화 괜찮으세요?'],
      ['C', '네, 근데 저 예전에 해지했어요.'],
      ['A', '네, 기록 확인했습니다. 혹시 해지하신 이유를 여쭤봐도 될까요?'],
      ['C', '기사님이 약속 시간을 두 번이나 안 지켰어요. 솔직히 아직도 짜증나요.'],
      ['A', '정말 불편하셨겠어요. 그 건은 지금 담당 지점이 바뀌었고, 방문 시간 2시간 전 문자 알림이 생겼습니다.'],
      ['C', '그래도 다시 할 생각은 없어요.'],
      ['A', '알겠습니다. 다음 연락은 원하지 않으시면 지금 바로 수신 거부로 등록해 드릴게요.'],
      ['C', '네, 그렇게 해 주세요.'],
    ],
    h1: 'OOONOX', a1: 'OOONOX', h2: 'OOONOX', a2: 'OOONOX',
    hl: [['OPEN', 0, '녹음되는 통화입니다. 지금 통화 괜찮으세요?', .94],
         ['NEED', 2, '해지하신 이유를 여쭤봐도 될까요?', .90],
         ['OBJ', 4, '정말 불편하셨겠어요.', .87],
         ['COMP', 6, '지금 바로 수신 거부로 등록해 드릴게요.', .89],
         ['EMO', 5, '그래도 다시 할 생각은 없어요.', .81]] },

  { id: 'C10', title: '좁은 주방 · 설치 제약 반론', t: '1분 47초',
    u: [
      ['A', '안녕하세요, 맑은물렌탈 상담원 윤OO입니다. 통화 녹음됩니다. 잠깐 괜찮으세요?'],
      ['C', '네.'],
      ['A', '정수기 바꾸실 계획 있으세요? 요즘 어떤 점이 불편하신지도 궁금해요.'],
      ['C', '자리를 너무 차지해서요. 주방이 좁아요.'],
      ['A', '그러면 벽걸이형이 있어요. 설치 사진 보시면 바로 감이 오실 거예요.'],
      ['C', '벽에 구멍 뚫는 건 집주인이 싫어할 텐데.'],
      ['A', '아, 그럼 주말에 다시 전화드릴게요.'],
      ['C', '네.'],
    ],
    h1: 'OOXOOO', a1: 'OOOOOO', h2: 'OOXOOO', a2: 'OOOOOO',
    hl: [['OPEN', 0, '통화 녹음됩니다. 잠깐 괜찮으세요?', .92],
         ['NEED', 2, '요즘 어떤 점이 불편하신지도 궁금해요.', .89],
         ['OBJ', 6, '그럼 주말에 다시 전화드릴게요.', .54],
         ['CLOSE', 6, '주말에 다시 전화드릴게요', .71],
         ['COMP', -1, '', .93],
         ['EMO', 7, '네.', .60]] },
];

// 불일치 해설: "통화-항목-버전"
const NOTES = {
  'C03-OBJ-1': '"생각해 볼게요"를 사람은 반론이 아니라고 봤고 AI는 처리 안 된 반론으로 봤습니다. 기준표에 보류 표현의 위치가 없습니다.',
  'C03-CLOSE-1': '"편하실 때 연락 주세요"를 사람은 다음 단계 제안으로, AI는 미흡으로 봤습니다. "다음 단계"가 무엇인지 정의가 없습니다.',
  'C04-OPEN-1': '상담원 이름이 빠졌는데 v1.0 문장에는 이름이 요건에 없습니다. 사람은 충족, AI는 학습 예시를 따라 미흡.',
  'C04-NEED-1': '예·아니요 질문만 있었습니다. "상황을 묻는 질문"이 개방형만인지 정해지지 않았습니다.',
  'C05-COMP-1': '"이번 달 신청분까지는"을 AI가 즉시 결정 요구로 잡았습니다. 실제 프로모션 기한 안내가 허용인지 기준이 없습니다.',
  'C06-EMO-1': '"네 네, 알겠어요" 단답을 AI가 부정 감정으로 읽었습니다. 단답과 불만의 경계가 없습니다.',
  'C07-CLOSE-1': '수신 거부 통화에서 사람은 클로징을 해당 없음으로, AI는 미흡으로 붙였습니다. 해당 없음 조건이 없습니다.',
  'C07-COMP-1': '녹음 고지 누락·수신 거부 미처리를 사람은 위반으로 봤지만 v1.0 문장은 금지 표현만 말합니다.',
  'C08-CLOSE-1': '"자료를 문자로 보내 드릴게요"가 클로징인가. 사람은 충족, AI는 일정이 없어 미흡.',
  'C10-OBJ-1': '설치 제약 반론에 대안 없이 "주말에 다시"로 넘겼습니다. AI는 후속 약속을 반론 처리로 오인했습니다.',
  'C08-CLOSE-2': '남은 불일치. 사람은 "문자 + 점심시간"을 채널·시간대 2개로 읽었고 AI는 시간대로 보지 않았습니다. v1.2 후보: 고객이 말한 시간도 인정할지.',
  'C10-OBJ-2': '남은 불일치. 문장을 고쳐도 AI가 같은 실수를 합니다. 기준 문제가 아니라 AI 쪽 예시(퓨샷) 보강이 필요한 경우입니다.',
};

// CRM: 통화에서 뽑은 후속 필드. src: R 규칙 / A AI / D 기본값
const CRM = [
  { id: 'C01', key: 'L-0001', lv: '상', lvS: 'A', time: '평일 19시 이후', timeS: 'R', why: '계산표 문자 발송 후 확인 통화', whyS: 'A', ev: '저녁 7시 이후엔 통화 돼요', stop: false },
  { id: 'C02', key: 'L-0002', lv: '하', lvS: 'A', time: '운전 중 아닌 시간 (미지정)', timeS: 'D', why: '통화 불가 상황에서 거절, 응대 품질 문제로 재접촉 보류', whyS: 'A', ev: '지금 운전 중이라서요', stop: false, hold: true },
  { id: 'C03', key: 'L-0003', lv: '중', lvS: 'A', time: '미지정 → 평일 오전 기본값', timeS: 'D', why: '배우자 상의 후 결정 (보류)', whyS: 'A', ev: '남편이랑 얘기 좀 해 보고', stop: false },
  { id: 'C04', key: 'L-0004', lv: '상', lvS: 'R', time: '목요일 오전 (방문 확정)', timeS: 'R', why: '방문 상담 전날 일정 확인', whyS: 'R', ev: '목요일 오전 괜찮아요', stop: false },
  { id: 'C05', key: 'L-0005', lv: '중', lvS: 'A', time: '25일 오후', timeS: 'R', why: '프로모션 기한 안 재안내 (위약금 우려 있음)', whyS: 'A', ev: '이번 달 안에 다시 연락 주세요', stop: false },
  { id: 'C06', key: 'L-0006', lv: '중', lvS: 'A', time: '2월 초', timeS: 'R', why: '약정 만료(3월) 전 비교 안내', whyS: 'A', ev: '내년 3월이요', stop: false },
  { id: 'C07', key: 'L-0007', lv: '—', lvS: 'R', time: '연락 금지', timeS: 'R', why: '수신 거부 요청 · 번호 출처 문의 응대 필요', whyS: 'R', ev: '수신 거부할게요', stop: true },
  { id: 'C08', key: 'L-0008', lv: '상', lvS: 'A', time: '평일 12~13시', timeS: 'A', why: '사무실 대용량 모델 비교 자료 확인', whyS: 'A', ev: '점심시간에 볼게요', stop: false },
  { id: 'C09', key: 'L-0009', lv: '—', lvS: 'R', time: '연락 금지', timeS: 'R', why: '수신 거부 등록 완료 (과거 방문 지연 불만)', whyS: 'R', ev: '네, 그렇게 해 주세요', stop: true },
  { id: 'C10', key: 'L-0010', lv: '중', lvS: 'A', time: '주말', timeS: 'R', why: '설치 제약(벽 타공 불가) 대안 모델 제시 필요', whyS: 'A', ev: '집주인이 싫어할 텐데', stop: false },
];
const SRC = { R: '규칙', A: 'AI', D: '기본값' };

const PLAN = [
  { n: '1회', t: '현황 진단', d: '지금 쓰는 태그 정의와 실제 태깅 결과를 봅니다. 미리 표본 50건을 받아 제가 기준표대로 다시 태깅하고, 기존 태그와의 일치율·κ를 항목별로 가져갑니다.', out: '항목별 일치표 · 갈리는 사례 목록 · 우선 고칠 항목 3개', hw: '내부 평가자 2명이 같은 20건을 따로 태깅' },
  { n: '2회', t: '기준표 재설계', d: '갈린 사례를 근거로 항목 문장을 행동 기준으로 바꾸고, 충족·미흡 예시와 "해당 없음" 조건을 붙입니다. 통화 단위 우수·미흡은 항목에서 계산하도록 정리합니다.', out: '기준표 v1.1 (버전·변경 이력 포함) · AI 태깅 프롬프트 초안', hw: 'v1.1로 새 표본 재태깅 → 일치율 재측정' },
  { n: '3회', t: '후단 연결', d: '태그와 CRM 필드를 잇습니다. 관심도·연락 시간대·재통화 사유 같은 필드 스키마, 규칙으로 뽑을 필드와 AI로 뽑을 필드의 경계, 신뢰도 낮은 건만 사람이 보는 검수 흐름을 정합니다.', out: 'CRM 필드 정의서 · 출처(규칙/AI) 표기 규칙 · 검수 기준', hw: '1주일치 통화로 필드 채움률·검수율 확인' },
  { n: '4회', t: 'AI 상담원 학습 데이터 전환', d: '태깅된 통화 중 어떤 것을 학습·평가에 쓸지 기준을 정합니다. 우수 통화만 모으면 생기는 편향, 평가용 세트 분리, 개인정보 가림 처리 순서를 점검합니다.', out: '학습/평가 데이터 선별 기준 · 개인정보 가림 체크리스트 · 다음 3개월 점검표', hw: '이후 자체 운영' },
];

// ---------- 계산 ----------
function cohenKappa(a, b) {
  const n = a.length;
  if (!n || n !== b.length) return null;
  const cats = [...new Set([...a, ...b])];
  let agree = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) agree++;
  const po = agree / n;
  let pe = 0;
  for (const c of cats) {
    const pa = a.filter(x => x === c).length / n;
    const pb = b.filter(x => x === c).length / n;
    pe += pa * pb;
  }
  if (pe === 1) return null; // 라벨이 한 종류뿐이면 정의되지 않음
  return (po - pe) / (1 - pe);
}

// 자체 점검: 교과서 예시(예-예 20, 예-아니요 5, 아니요-예 10, 아니요-아니요 15) → κ = 0.4
(function selfCheck() {
  const a = [], b = [];
  const push = (x, y, k) => { for (let i = 0; i < k; i++) { a.push(x); b.push(y); } };
  push('Y', 'Y', 20); push('Y', 'N', 5); push('N', 'Y', 10); push('N', 'N', 15);
  const k = cohenKappa(a, b);
  console.assert(Math.abs(k - 0.4) < 1e-9, 'kappa self-check failed', k);
  console.assert(cohenKappa(['O', 'O'], ['O', 'O']) === null, 'kappa degenerate case failed');
  console.assert(Math.abs(cohenKappa(['O', 'X'], ['X', 'O']) - (-1)) < 1e-9, 'kappa -1 case failed');
  // 근거 구간이 실제 발화 안에 있는지
  for (const c of CALLS) for (const [k2, u, s] of c.hl) {
    console.assert(u < 0 || c.u[u][1].includes(s), 'span not found', c.id, k2);
  }
  console.info('[self-check] kappa=' + k.toFixed(3) + ' (기대값 0.400) · 근거 구간 확인 완료');
})();

function overall(lbl) {
  const x = [...lbl].filter(c => c === 'X').length;
  if (lbl[IDX.COMP] === 'X' || x >= 2) return '미흡';
  if (x === 0 && lbl[IDX.CLOSE] === 'O') return '우수';
  return '보통';
}

function pairs(ver, itemIdx) {
  const h = [], a = [];
  for (const c of CALLS) {
    const hs = c['h' + ver], as = c['a' + ver];
    for (let i = 0; i < 6; i++) if (itemIdx == null || i === itemIdx) { h.push(hs[i]); a.push(as[i]); }
  }
  return [h, a];
}

function stats(ver, itemIdx) {
  const [h, a] = pairs(ver, itemIdx);
  const agree = h.filter((x, i) => x === a[i]).length;
  return { n: h.length, agree, pct: agree / h.length, k: cohenKappa(h, a) };
}

// ---------- 렌더 ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = p => (p * 100).toFixed(1) + '%';
const kfmt = k => (k == null ? '—' : k.toFixed(2));
const kcls = k => (k == null ? '' : k >= 0.6 ? 'ok' : k >= 0.4 ? 'mid' : 'bad');
const vcls = { O: 'ok', X: 'bad', N: 'na', '우수': 'ok', '보통': 'mid', '미흡': 'bad' };

let ver = 1, cur = 'C03', filt = 'all';

function renderHero() {
  const s1 = stats(1), s2 = stats(2), s = ver === 1 ? s1 : s2;
  const callAgree = CALLS.filter(c => overall(c['h' + ver]) === overall(c['a' + ver])).length;
  $('#heroKpis').innerHTML = `
    <div class="kpi"><span>항목 일치율</span><b>${pct(s.pct)}</b><small>${s.agree}/${s.n}쌍</small></div>
    <div class="kpi"><span>코헨 κ</span><b class="${kcls(s.k)}">${kfmt(s.k)}</b><small>우연 일치 제외</small></div>
    <div class="kpi"><span>통화 판정 일치</span><b>${callAgree}/10</b><small>우수·보통·미흡</small></div>`;
  $('#verNote').innerHTML = ver === 1
    ? `v1.0 기준 문장 그대로. 불일치 ${s1.n - s1.agree}쌍. v1.1로 바꿔 보세요.`
    : `문장만 고친 v1.1: κ ${kfmt(s1.k)} → ${kfmt(s2.k)}. 남은 불일치 ${s2.n - s2.agree}쌍. (가상 데이터라 개선 폭은 예시이며, 실제 폭은 표본으로 측정합니다.)`;
}

function renderRubric() {
  $('#rubricGrid').innerHTML = ITEMS.map(it => {
    const changed = it.v1 !== it.v2;
    return `<article class="rb">
      <header><i class="dot ${it.c}"></i><b>${it.name}</b><code>${it.k}</code>${ver === 2 && changed ? '<span class="tag-new">v1.1 수정</span>' : ''}</header>
      <p>${esc(ver === 1 ? it.v1 : it.v2)}</p>
      ${ver === 2 && changed ? `<p class="was">v1.0: ${esc(it.v1)}</p>` : ''}
      <dl><dt class="ok">충족 예</dt><dd>${esc(it.ok)}</dd><dt class="bad">미흡 예</dt><dd>${esc(it.bad)}</dd></dl>
    </article>`;
  }).join('');
}

function renderCallList() {
  $('#callList').innerHTML = CALLS.map(c => {
    const h = c['h' + ver], a = c['a' + ver];
    const diff = [...h].filter((x, i) => x !== a[i]).length;
    const ov = overall(a);
    return `<button type="button" role="option" class="ci${c.id === cur ? ' on' : ''}" data-id="${c.id}" aria-selected="${c.id === cur}">
      <span class="ci-top"><code>${c.id}</code><em class="v ${vcls[ov]}">AI ${ov}</em></span>
      <span class="ci-t">${esc(c.title)}</span>
      <span class="ci-m">${c.t}${diff ? ` · <b class="diffn">사람과 ${diff}항목 다름</b>` : ' · 사람과 일치'}</span>
    </button>`;
  }).join('');
}

function markUtterance(text, spans) {
  // spans: [{s, it}] 서로 겹치지 않는다고 가정
  const found = spans.map(x => ({ ...x, i: text.indexOf(x.s) })).filter(x => x.i >= 0).sort((p, q) => p.i - q.i);
  let out = '', pos = 0;
  for (const f of found) {
    if (f.i < pos) continue;
    out += esc(text.slice(pos, f.i)) + `<mark class="${f.it.c}" title="${f.it.name}">${esc(f.s)}<sup>${f.it.name}</sup></mark>`;
    pos = f.i + f.s.length;
  }
  return out + esc(text.slice(pos));
}

function renderDetail() {
  const c = CALLS.find(x => x.id === cur);
  const h = c['h' + ver], a = c['a' + ver];
  const byU = {};
  for (const [k, u, s] of c.hl) if (u >= 0) (byU[u] = byU[u] || []).push({ s, it: ITEMS[IDX[k]] });
  const hlMap = Object.fromEntries(c.hl.map(x => [x[0], x]));
  const rows = ITEMS.map((it, i) => {
    const hx = hlMap[it.k], diff = h[i] !== a[i];
    let ev;
    if (a[i] === 'N') ev = '<span class="muted">해당 상황 없음</span>';
    else if (!hx || hx[1] < 0) ev = `<span class="muted">${it.k === 'COMP' && a[i] === 'O' ? '금지 표현 미검출' : '근거 발화 없음 (누락)'}</span>`;
    else ev = `<span class="q">#${hx[1] + 1} "${esc(hx[2])}"</span>`;
    const conf = hx ? hx[3] : null;
    return `<tr class="${diff ? 'is-diff' : ''}">
      <th><i class="dot ${it.c}"></i>${it.name}</th>
      <td class="ev">${ev}</td>
      <td><em class="v ${vcls[a[i]]}">${LBL_SHORT[a[i]]}</em>${conf != null && a[i] !== 'N' ? `<span class="conf${conf < 0.65 ? ' low' : ''}" title="AI 신뢰도"><i style="--w:${Math.round(conf * 100)}%"></i>${Math.round(conf * 100)}</span>` : ''}</td>
      <td><em class="v ${vcls[h[i]]}">${LBL_SHORT[h[i]]}</em>${diff ? '<span class="flag">다름</span>' : ''}</td>
    </tr>`;
  }).join('');
  const oh = overall(h), oa = overall(a);
  $('#callDetail').innerHTML = `
    <div class="cd-head">
      <div><code>${c.id}</code> <b>${esc(c.title)}</b><p class="xs muted">가상 녹취 · ${c.t} · A 상담원 / C 고객</p></div>
      <div class="ov"><span>AI <em class="v ${vcls[oa]}">${oa}</em></span><span>사람 <em class="v ${vcls[oh]}">${oh}</em></span></div>
    </div>
    <ol class="ts">${c.u.map(([sp, t], i) => `<li class="${sp === 'A' ? 'ag' : 'cu'}"><span class="sp">${sp}<small>#${i + 1}</small></span><p>${markUtterance(t, byU[i] || [])}</p></li>`).join('')}</ol>
    <div class="tbl-wrap"><table class="tbl judge">
      <thead><tr><th>항목</th><th>근거 구간</th><th>AI 판정 · 신뢰도</th><th>사람 판정</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="xs muted">신뢰도 65 미만은 사람 검수 대상으로 보냅니다. 판정은 기준표 v1.${ver - 1} 기준.</p>`;
}

function renderAgree() {
  const rows = ITEMS.map((it, i) => {
    const s = stats(ver, i);
    return `<tr><th><i class="dot ${it.c}"></i>${it.name}</th><td>${s.agree}/${s.n}</td><td>${pct(s.pct)}</td><td><b class="${kcls(s.k)}">${kfmt(s.k)}</b></td></tr>`;
  }).join('');
  const t = stats(ver);
  $('#itemTable').innerHTML = `<thead><tr><th>항목</th><th>일치</th><th>일치율</th><th>κ</th></tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><th>전체</th><td>${t.agree}/${t.n}</td><td>${pct(t.pct)}</td><td><b class="${kcls(t.k)}">${kfmt(t.k)}</b></td></tr></tfoot>`;
  const diffs = [];
  for (const c of CALLS) {
    const h = c['h' + ver], a = c['a' + ver];
    ITEMS.forEach((it, i) => { if (h[i] !== a[i]) diffs.push({ c, it, h: h[i], a: a[i] }); });
  }
  $('#diffList').innerHTML = diffs.map(d => `<li>
      <div class="dl-top"><button type="button" class="link" data-go="${d.c.id}">${d.c.id}</button><i class="dot ${d.it.c}"></i><b>${d.it.name}</b>
      <span class="pair">사람 <em class="v ${vcls[d.h]}">${LBL[d.h]}</em> · AI <em class="v ${vcls[d.a]}">${LBL[d.a]}</em></span></div>
      <p>${esc(NOTES[`${d.c.id}-${d.it.k}-${ver}`] || '')}</p>
    </li>`).join('') || '<li><p>불일치 없음</p></li>';
}

function renderCrm() {
  const rows = CRM.filter(r => filt === 'all' || (filt === 'stop' ? r.stop : !r.stop && !r.hold)).map(r => `<tr class="${r.stop ? 'is-stop' : ''}">
      <td data-l="고객"><code>${r.key}</code><small>${r.id}</small></td>
      <td data-l="관심도"><b class="lv">${r.lv}</b><span class="src s${r.lvS}">${SRC[r.lvS]}</span></td>
      <td data-l="다음 연락 시간대">${esc(r.time)}<span class="src s${r.timeS}">${SRC[r.timeS]}</span></td>
      <td data-l="재통화 사유">${esc(r.why)}<span class="src s${r.whyS}">${SRC[r.whyS]}</span></td>
      <td data-l="근거 발화" class="q">"${esc(r.ev)}"</td>
    </tr>`).join('');
  $('#crmTable').innerHTML = `<thead><tr><th>고객(가상)</th><th>관심도</th><th>다음 연락 시간대</th><th>재통화 사유</th><th>근거 발화</th></tr></thead><tbody>${rows}</tbody>`;
}

function renderPlan() {
  $('#planList').innerHTML = PLAN.map(p => `<li>
    <span class="pn">${p.n}</span>
    <div><h3>${p.t}</h3><p>${p.d}</p>
    <dl><dt>남는 것</dt><dd>${p.out}</dd><dt>다음 회차 전 숙제</dt><dd>${p.hw}</dd></dl></div>
  </li>`).join('');
}

function renderAll() { renderHero(); renderRubric(); renderCallList(); renderDetail(); renderAgree(); }

document.addEventListener('click', e => {
  const v = e.target.closest('[data-ver]');
  if (v) {
    ver = +v.dataset.ver;
    document.querySelectorAll('[data-ver]').forEach(b => b.setAttribute('aria-pressed', b === v));
    renderAll();
    return;
  }
  const ci = e.target.closest('.ci');
  if (ci) { cur = ci.dataset.id; renderCallList(); renderDetail(); return; }
  const go = e.target.closest('[data-go]');
  if (go) { cur = go.dataset.go; renderCallList(); renderDetail(); $('#calls').scrollIntoView({ behavior: 'smooth' }); return; }
  const f = e.target.closest('[data-f]');
  if (f) {
    filt = f.dataset.f;
    document.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', b === f));
    renderCrm();
  }
});

renderAll(); renderCrm(); renderPlan();
