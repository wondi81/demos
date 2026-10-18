'use strict';
/* 반려동물 선제 건강 안내 데모 — 서버 없음. 알림·상담은 기록 데이터에서 규칙으로 계산한다. */

const KEY = 'luvo-proactive-demo-v1';
const DAYS = 30;
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayDate = i => { const d = new Date(TODAY); d.setDate(d.getDate() - (DAYS - 1 - i)); return d; };
const addDays = n => { const d = new Date(TODAY); d.setDate(d.getDate() + n); return d; };
const md = d => `${d.getMonth() + 1}/${d.getDate()}`;
const kd = d => `${d.getMonth() + 1}월 ${d.getDate()}일`;
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const R = x => Math.round(x);
const P = p => `${p >= 0 ? '+' : ''}${Math.round(p * 100)}%`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const monthsSince = ym => { const [y, m] = ym.split('-').map(Number); return (TODAY.getFullYear() - y) * 12 + TODAY.getMonth() + 1 - m; };
const ago = ym => { const m = monthsSince(ym), [y, mo] = ym.split('-'); return `${m >= 12 ? Math.floor(m / 12) + '년' : m + '개월'} 전(${y}년 ${+mo}월)`; };
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c % 28 ? a : b); };

/* ---------- 가상 개체 ---------- */
const PETS = {
  bori: {
    id: 'bori', name: '보리', kind: 'dog', breed: '말티즈', age: 8, sex: '중성화 수컷', weight: 3.9, ideal: 3.6, color: '#C98B4E',
    history: [
      { tag: 'patella', ym: '2023-05', title: '좌측 슬개골 내측 탈구 2기', detail: '수술 없이 체중·운동 관리로 경과 관찰 중' },
      { tag: 'kidney', ym: '2025-11', title: '신장 수치 경계', detail: 'SDMA 16 µg/dL(기준 14 이하), 크레아티닌 1.5 mg/dL · 6~12개월 내 재검 권고' },
    ],
    meds: [{ name: '관절 영양제(글루코사민)', dose: '1일 1회 · 아침' }, { name: '신장 보조제(인 흡착제)', dose: '1일 2회 · 식사와 함께' }],
    schedule: [{ name: '심장사상충 예방약', every: '매월', dueIn: 5 }, { name: '외부 구충', every: '매월', dueIn: 19 }, { name: '종합백신(DHPPL) 추가접종', every: '매년', dueIn: 41 }],
    examples: ['요즘 물을 많이 마시는데 괜찮을까요?', '산책은 얼마나 시켜도 될까요?', '다음 병원은 언제 가야 하나요?'],
  },
  nabi: {
    id: 'nabi', name: '나비', kind: 'cat', breed: '코리안 숏헤어', age: 5, sex: '중성화 암컷', weight: 4.2, ideal: 4.2, color: '#6F8C7E',
    history: [
      { tag: 'cystitis', ym: '2025-10', title: '특발성 방광염', detail: '잦은 배뇨·혈뇨로 2주 치료, 스트레스 요인 관리 권고' },
    ],
    meds: [{ name: '비뇨기 처방식(습식)', dose: '1일 2회' }],
    schedule: [{ name: '내부 구충', every: '3개월', dueIn: 12 }, { name: '종합백신(FVRCP)', every: '매년', dueIn: 23 }],
    examples: ['요즘 화장실을 자주 가요', '밥은 잘 먹고 있나요?', '예방접종은 언제예요?'],
  },
};

/* ---------- 결정적 시드 데이터 (시나리오가 알림을 유발하도록) ---------- */
function rng(a) { return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seed(id) {
  const r = rng(id === 'bori' ? 81 : 52), n = a => Math.round((r() * 2 - 1) * a), out = [];
  for (let i = 0; i < DAYS; i++) {
    const last3 = i >= DAYS - 3;
    if (id === 'bori') {
      const limp = i === DAYS - 11 || i === DAYS - 9; // 지난주 2회
      out.push({ water: last3 ? 296 + n(10) : 220 + n(14), food: 86 + n(6), walk: limp ? 14 + n(3) : 32 + n(8), limp, pee: 4 + n(1), poop: r() < .35 ? 2 : 1, vomit: i === 6 ? 1 : 0, cond: limp ? 3 : (r() < .2 ? 5 : 4) });
    } else {
      out.push({ water: 165 + n(12), food: 56 + n(4), walk: 22 + n(6), limp: false, pee: last3 ? [5, 6, 5][i - DAYS + 3] : 3 + (r() < .3 ? 1 : 0) - (r() < .15 ? 1 : 0), poop: 1, vomit: i === 11 ? 1 : 0, cond: last3 ? 3 : (r() < .25 ? 5 : 4) });
    }
  }
  return out;
}

/* ---------- 상태 ---------- */
const fresh = () => ({ date: iso(TODAY), recs: { bori: seed('bori'), nabi: seed('nabi') }, chat: { bori: [], nabi: [] }, mem: { bori: {}, nabi: {} } });
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.date === iso(TODAY) && s.recs) return s; } catch (e) { } return fresh(); }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { } }
let data = load();
const ui = { pet: 'bori', tab: 'home', focus: null, emergency: null, diff: null };

/* ---------- 규칙 엔진 ---------- */
const LV = { info: { r: 0, t: '일정' }, watch: { r: 1, t: '관찰' }, caution: { r: 2, t: '주의' }, high: { r: 3, t: '병원 권장' } };
const METRICS = { water: '음수량', food: '식사량', walk: '활동', pee: '배뇨' };
const take = (recs, k, a, b) => recs.slice(Math.max(0, a), b + 1).map(x => x[k]);
function stats(recs, t) {
  const o = {};
  for (const k of Object.keys(METRICS)) { const b = avg(take(recs, k, t - 16, t - 3)), r = avg(take(recs, k, t - 2, t)); o[k] = { b, r, p: b ? r / b - 1 : 0 }; }
  return o;
}

function evaluate(pet, recs, t = recs.length - 1) {
  const s = stats(recs, t), out = [], H = tag => pet.history.find(h => h.tag === tag), d = i => md(dayDate(i));
  const range = `${d(t - 2)}~${d(t)}`, cat = pet.kind === 'cat';

  // 1) 음수량 증가 × 신장 이력
  if (s.water.p >= .2) {
    const k = H('kidney'), lv = s.water.p >= .5 ? 'high' : s.water.p >= .3 ? 'caution' : 'watch';
    out.push({
      id: 'water', level: lv, title: `음수량이 평소보다 ${P(s.water.p)} 늘었어요`,
      seen: [`${range} 평균 ${R(s.water.r)}ml/일 — 직전 2주 평균 ${R(s.water.b)}ml`, `체중 ${pet.weight}kg 기준 하루 ${R(s.water.r / pet.weight)}ml/kg`],
      why: k ? `${ago(k.ym)} ${k.title} 기록(${k.detail.split(' · ')[0]})이 있어요. 신장 기능이 떨어지면 소변이 묽어지고 물을 더 찾게 되므로, 이번 변화는 재검 시점으로 보는 것이 좋습니다.`
        : '뚜렷한 이유 없이 음수량이 늘면 신장·내분비 질환의 초기 신호일 수 있어요.',
      todo: k ? [lv === 'high' ? '2~3일 안에 동물병원 내원 권장' : '이번 주 안에 혈액검사(BUN·크레아티닌·SDMA)와 소변검사 예약', `지난 검사 후 ${monthsSince(k.ym)}개월 경과 — 권고 재검 주기(6~12개월)에 해당`, '물그릇은 같은 시간에 계속 계량해 기록']
        : ['2~3일 더 같은 방법으로 계량해 추이 확인', '계속 늘면 혈액·소변 검사 상담'],
      metric: 'water', bands: [[t - 2, t]],
    });
  }

  // 2) 절뚝임 반복 × 슬개골 이력
  const limps = []; for (let i = Math.max(0, t - 13); i <= t; i++) if (recs[i].limp) limps.push(i);
  const pt = H('patella');
  if (limps.length >= 2 || (limps.length && pt)) {
    const lv = limps.length >= 4 ? 'high' : pt && limps.length >= 2 ? 'caution' : 'watch';
    out.push({
      id: 'limp', level: lv, title: `최근 2주 절뚝임 ${limps.length}회 기록`,
      seen: [`절뚝임 기록일 ${limps.map(d).join(', ')}`, `그날 산책 평균 ${R(avg(limps.map(i => recs[i].walk)))}분 (평소 ${R(s.walk.b)}분)`, `현재 체중 ${pet.weight}kg · 목표 ${pet.ideal}kg`],
      why: pt ? `${ago(pt.ym)} ${pt.title} 진단을 받았어요. 슬개골 탈구는 체중과 무리한 운동에 따라 악화되기 쉬워, 절뚝임이 반복되면 단계가 올라갔을 수 있습니다.`
        : '절뚝임이 반복되면 관절·인대 문제일 수 있어요.',
      todo: [pet.weight > pet.ideal ? `체중 ${(pet.weight - pet.ideal).toFixed(1)}kg 감량 목표 — 간식은 하루 열량의 10% 이내` : '현재 체중 유지', `산책은 평지 위주 ${R(s.walk.b / 2)}분씩 하루 2회로 나누기`, '미끄러운 바닥에 매트, 소파·침대 점프 막기', '다리를 들고 걷거나 3회 이상 반복되면 정형외과 진료'],
      metric: 'walk', bands: limps.map(i => [i, i]),
    });
  }

  // 3) 배뇨 증가 × 방광염 이력
  const c = H('cystitis');
  if (s.pee.p >= .4 && (cat || c)) {
    const lv = c ? (s.pee.p >= .9 ? 'high' : 'caution') : 'watch';
    out.push({
      id: 'pee', level: lv, title: `화장실 횟수가 ${P(s.pee.p)} 늘었어요`,
      seen: [`${range} 하루 ${s.pee.r.toFixed(1)}회 — 직전 2주 평균 ${s.pee.b.toFixed(1)}회`, `같은 기간 음수량 변화 ${P(s.water.p)}`],
      why: c ? `${ago(c.ym)} ${c.title}(${c.detail.split(',')[0]})을 앓았어요. 방광염은 재발이 잦고, ${Math.abs(s.water.p) < .15 ? '물을 더 마시지 않았는데 화장실만 잦아지는' : '화장실이 잦아지는'} 모습은 재발 초기와 비슷합니다.`
        : '물 섭취 변화 없이 배뇨가 잦아지면 하부요로 질환을 의심할 수 있어요.',
      todo: ['소변 색(붉은빛·갈색)과 모래 덩어리 크기를 확인해 기록', '화장실에 자주 들어가는데 소변이 거의 안 나오면 즉시 응급 진료', '습식 사료·물그릇 추가로 수분 섭취 늘리기', '최근 환경 변화(손님·모래 교체·소음) 점검'],
      metric: 'pee', bands: [[t - 2, t]],
    });
  }

  // 4) 고양이 무배뇨
  if (cat && recs[t].pee === 0) {
    out.push({
      id: 'pee0', level: 'high', title: '오늘 배뇨 기록이 없어요',
      seen: [`${d(t)} 배뇨 0회 — 평소 하루 ${s.pee.b.toFixed(1)}회`],
      why: `고양이는 요도가 막히면 하루 안에 위험해질 수 있어요${c ? `. ${pet.name}는 방광염 이력이 있어 더 주의가 필요합니다` : ''}.`,
      todo: ['화장실 모래에 소변 덩어리가 있는지 다시 확인', '12시간 넘게 소변이 없거나 힘주며 울면 즉시 24시 병원'],
      metric: 'pee', bands: [[t, t]],
    });
  }

  // 5) 식욕 감소
  if (s.food.p <= -.25) {
    const k = H('kidney');
    out.push({
      id: 'food', level: s.food.p <= -.5 ? 'high' : 'caution', title: `식사량이 ${P(s.food.p)} 줄었어요`,
      seen: [`${range} 평균 ${R(s.food.r)}g — 직전 2주 평균 ${R(s.food.b)}g`],
      why: k ? `${pet.name}는 신장 수치 경계 이력이 있어요. 신장 수치가 오르면 메스꺼움으로 식욕이 먼저 떨어지기도 합니다.` : '식욕 감소가 2~3일 넘게 이어지면 원인 확인이 필요해요.',
      todo: ['사료 교체·간식 증가 등 다른 이유가 있었는지 확인', '하루 더 줄면 진료 상담'],
      metric: 'food', bands: [[t - 2, t]],
    });
  }

  // 6) 구토 반복
  const vom = take(recs, 'vomit', t - 2, t).reduce((a, b) => a + b, 0);
  if (vom >= 2) out.push({
    id: 'vomit', level: vom >= 4 ? 'high' : 'caution', title: `최근 3일 구토 ${vom}회`,
    seen: [`${range} 구토 기록 합계 ${vom}회`],
    why: H('kidney') ? '신장 수치 경계 이력이 있어 반복 구토는 수치 확인이 필요한 신호예요.' : '구토가 반복되면 탈수로 이어질 수 있어요.',
    todo: ['구토물 사진을 남겨 진료 시 보여주기', '물도 토하거나 기운이 없으면 당일 진료'],
    metric: 'food', bands: [[t - 2, t]],
  });

  // 7) 컨디션 저하
  const cd = avg(take(recs, 'cond', t - 1, t));
  if (cd <= 2) out.push({
    id: 'cond', level: 'watch', title: '컨디션 점수가 낮아요', seen: [`최근 2일 평균 ${cd.toFixed(1)}점 (5점 만점)`],
    why: '보호자가 느끼는 컨디션 변화는 수치보다 먼저 나타나는 경우가 많아요.', todo: ['평소와 다른 행동(숨기, 잠 증가)을 메모해 두기'],
    metric: 'water', bands: [],
  });

  // 8) 예방 일정
  for (const sc of pet.schedule) {
    const left = sc.dueIn + (recs.length - 1 - t);
    if (left <= 7) out.push({
      id: 'sch-' + sc.name, level: 'info', title: `${sc.name} D-${left}`,
      seen: [`${sc.every} 주기 기록 기준 예정일 ${kd(addDays(sc.dueIn))}(${WD[addDays(sc.dueIn).getDay()]})`],
      why: `예정일을 넘기면 예방 공백이 생겨요.${pet.meds.length ? ` 현재 복용 중인 ${pet.meds.map(m => m.name.split('(')[0]).join('·')}와 같은 날 먹여도 되는지 병원에 확인해 두면 좋아요.` : ''}`,
      todo: [`${kd(addDays(sc.dueIn))} 전에 약·병원 예약 준비`, '투약 후 하루는 구토·가려움 여부 관찰'],
      metric: null, bands: [],
    });
  }
  return out.sort((a, b) => LV[b.level].r - LV[a.level].r);
}

/* ---------- 기억하는 상담 (규칙 기반) ---------- */
const EMERG = ['경련', '발작', '호흡곤란', '숨을 못', '숨을 헐떡', '혈변', '피를 토', '토혈', '의식', '쓰러', '소변을 못', '소변이 안 나', '오줌을 못', '중독', '초콜릿', '포도', '잇몸이 하얗', '청색'];
const TOPICS = [
  { id: 'hospital', keys: ['병원', '검사', '재검', '진료'] },
  { id: 'water', keys: ['물', '음수', '마시'] },
  { id: 'leg', keys: ['산책', '다리', '절뚝', '슬개', '관절', '운동'] },
  { id: 'pee', keys: ['화장실', '소변', '오줌', '배뇨', '모래'] },
  { id: 'schedule', keys: ['접종', '백신', '구충', '사상충', '예방'] },
  { id: 'vomit', keys: ['구토', '토해', '토했'] },
  { id: 'food', keys: ['밥', '사료', '식사', '식욕', '먹'] },
];
function answer(pet, q) {
  const recs = data.recs[pet.id], t = recs.length - 1, s = stats(recs, t), A = evaluate(pet, recs), N = pet.name;
  const H = tag => pet.history.find(h => h.tag === tag), mem = data.mem[pet.id];
  const hit = EMERG.find(k => q.includes(k));
  if (hit) {
    ui.emergency = hit;
    return `'${hit}' 증상은 기록으로 판단할 수 없는 응급 상황일 수 있어요. 지금 가까운 24시 동물병원에 전화한 뒤 바로 방문하세요. 이동 중에는 ${N}의 병력(${pet.history.map(h => h.title).join(', ')})과 복용약(${pet.meds.map(m => m.name).join(', ')})을 병원에 알려 주세요.`;
  }
  const topic = (TOPICS.find(tp => tp.keys.some(k => q.includes(k))) || { id: 'general' }).id;
  const prev = mem[topic], parts = [];
  const remember = (val, unit, label) => {
    if (prev && prev.val != null) parts.push(String(prev.val) === String(val) ? `지난번(${prev.when})에 물어보셨을 때와 같은 수치라, 그 사이 새 기록은 없었어요.` : `지난번(${prev.when}) 같은 질문 때 ${label}은 ${prev.val}${unit}였는데, 지금은 ${val}${unit}로 바뀌었어요.`);
    mem[topic] = { val, when: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) };
  };
  const k = H('kidney'), p = H('patella'), c = H('cystitis');
  if (topic === 'water') {
    parts.push(`${N}의 최근 3일 평균 음수량은 ${R(s.water.r)}ml로, 직전 2주 평균 ${R(s.water.b)}ml보다 ${P(s.water.p)}입니다.`);
    remember(R(s.water.r), 'ml', '최근 평균');
    if (k) parts.push(`${N}는 ${ago(k.ym)} 혈액검사에서 ${k.title} 판정(${k.detail.split(' · ')[0]})을 받았고 이번 주 음수량이 ${s.water.p >= .2 ? '늘었으니' : '아직 평소 범위지만'}, ${s.water.p >= .2 ? `지난 검사 후 ${monthsSince(k.ym)}개월이 지난 지금 혈액검사로 신장 수치를 다시 확인해 보는 것을 권해요.` : '같은 시간에 계속 계량해 주시면 변화를 먼저 알려드릴게요.'}`);
    else if (c) parts.push(`${N}에게 물을 많이 마시는 건 방광염 예방에 좋은 신호예요. 다만 화장실 횟수가 하루 ${s.pee.r.toFixed(1)}회(평소 ${s.pee.b.toFixed(1)}회)로 ${s.pee.p >= .4 ? '늘어 있어 소변 색도 함께 봐 주세요.' : '평소와 비슷해 괜찮아 보여요.'}`);
    else parts.push(s.water.p >= .2 ? '2~3일 더 이어지면 검사 상담을 권해요.' : '평소 범위예요.');
  } else if (topic === 'leg') {
    const limps = recs.slice(-14).map((r, i) => r.limp ? md(dayDate(t - 13 + i)) : null).filter(Boolean);
    parts.push(`최근 2주 평균 활동은 하루 ${R(avg(take(recs, 'walk', t - 13, t)))}분이고, 절뚝임 기록은 ${limps.length ? limps.length + '회(' + limps.join(', ') + ')' : '없어요'}.`);
    remember(limps.length, '회', '절뚝임 기록');
    if (p) parts.push(`${josa(N, '는', '는')} ${ago(p.ym)} ${p.title} 진단이 있어서, 한 번에 오래 걷기보다 평지 위주로 ${R(s.walk.b / 2)}분씩 하루 2회가 안전해요. 체중을 ${pet.weight}kg에서 ${pet.ideal}kg 쪽으로 줄이면 무릎 부담이 줄어듭니다.`);
    else parts.push('지금 활동량은 무리 없는 수준이에요.');
  } else if (topic === 'pee') {
    parts.push(`${N}의 최근 3일 배뇨는 하루 ${s.pee.r.toFixed(1)}회로 직전 2주 ${s.pee.b.toFixed(1)}회보다 ${P(s.pee.p)}입니다. 같은 기간 음수량은 ${P(s.water.p)}예요.`);
    remember(s.pee.r.toFixed(1), '회', '하루 배뇨');
    if (c) parts.push(`${josa(N, '는', '는')} ${ago(c.ym)} ${c.title}을 앓았기 때문에, 물을 더 마시지 않았는데 화장실만 잦아진 지금은 재발 초기일 수 있어요. 소변 색과 모래 덩어리 크기를 오늘부터 기록해 주시고, 화장실에서 힘만 주고 소변이 안 나오면 바로 병원에 가세요.`);
    else if (k) parts.push(`신장 수치 경계 이력이 있어 음수량과 배뇨가 함께 늘면 재검 신호로 봅니다.`);
  } else if (topic === 'food') {
    parts.push(`최근 3일 평균 식사량은 ${R(s.food.r)}g, 직전 2주 평균은 ${R(s.food.b)}g으로 ${Math.abs(s.food.p) < .15 ? '평소처럼 잘 먹고 있어요' : P(s.food.p) + ' 변했어요'}.`);
    remember(R(s.food.r), 'g', '최근 평균');
    if (k) parts.push('신장 수치가 오르면 식욕이 먼저 떨어지는 경우가 있어, 식사량이 줄면 바로 알려드릴게요.');
    if (c) parts.push('방광염 재발 예방에는 건식보다 습식 비중을 늘리는 게 도움이 돼요.');
  } else if (topic === 'vomit') {
    const v7 = take(recs, 'vomit', t - 6, t).reduce((a, b) => a + b, 0), v30 = recs.reduce((a, r) => a + r.vomit, 0);
    parts.push(`최근 7일 구토 기록은 ${v7}회, 30일 동안은 ${v30}회예요. ${v7 >= 2 ? '반복되고 있어 진료를 권해요.' : '반복되는 양상은 아니에요.'}`);
  } else if (topic === 'schedule') {
    parts.push(pet.schedule.map(sc => `${sc.name} ${kd(addDays(sc.dueIn))}(D-${sc.dueIn})`).join(', ') + '이 예정되어 있어요.');
    if (pet.schedule[0].dueIn <= 7) parts.push(`가장 가까운 ${pet.schedule[0].name}은 ${pet.schedule[0].dueIn}일 남아 홈 화면에도 먼저 알려 드렸어요.`);
  } else if (topic === 'hospital') {
    const urgent = A.filter(a => LV[a.level].r >= 2);
    parts.push(urgent.length ? `지금 기록으로는 ${urgent.map(a => a.title).join(', ')} 때문에 이번 주 안에 진료를 받는 것을 권해요.` : '지금 기록상 급하게 병원에 갈 이유는 보이지 않아요.');
    if (k) parts.push(`특히 ${ago(k.ym)} 신장 수치 경계 이후 ${monthsSince(k.ym)}개월이 지나 재검 시기이기도 해요.`);
    if (c && s.pee.p >= .4) parts.push(`${c.title} 이력이 있어 소변검사를 함께 받아 보세요.`);
    const next = pet.schedule[0]; parts.push(`정기 일정으로는 ${next.name}이 ${kd(addDays(next.dueIn))}이에요. 같은 날 묶으면 병원 방문을 한 번으로 줄일 수 있어요.`);
  } else {
    parts.push(`${N}에 대해 기억하고 있는 것: 병력 ${pet.history.map(h => `${h.title}(${h.ym.replace('-', '.')})`).join(', ')}, 복용약 ${pet.meds.length}가지, 최근 30일 기록.`);
    parts.push(A.length ? `지금 먼저 챙길 것은 ${A.map(a => a.title).join(' / ')}입니다.` : '지금은 따로 챙길 알림이 없어요.');
    parts.push('물, 산책·다리, 화장실, 식사, 접종 일정처럼 구체적으로 물어보시면 기록을 근거로 답해 드릴게요.');
  }
  return parts.join(' ');
}

/* ---------- 화면 ---------- */
const $app = document.getElementById('app');
const ICON = {
  home: '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  rec: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/>',
  trend: '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
  chat: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  report: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
};
const TABS = [['home', '먼저 알림'], ['rec', '기록'], ['trend', '추이'], ['chat', 'AI 상담'], ['report', '주간 리포트']];
const svg = (p, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

function render() {
  const pet = PETS[ui.pet], recs = data.recs[pet.id], alerts = evaluate(pet, recs);
  const counts = Object.fromEntries(Object.values(PETS).map(p => [p.id, evaluate(p, data.recs[p.id]).length]));
  const body = { home, rec, trend, chat, report }[ui.tab](pet, recs, alerts);
  $app.innerHTML = `
  <header class="hd">
    <div class="hd-row">
      <div class="title"><span class="logo">${svg('<path d="M12 19s-7-4.2-7-9.3A3.7 3.7 0 0 1 12 7.8a3.7 3.7 0 0 1 7 1.9C19 14.8 12 19 12 19z"/>')}</span>
        <div><b>반려동물 선제 건강 안내</b><small>데모 · LUVO 제안용</small></div></div>
      <button class="link" data-act="reset">데이터 초기화</button>
    </div>
    <div class="pets" role="tablist" aria-label="반려동물 선택">
      ${Object.values(PETS).map(p => `<button role="tab" aria-selected="${p.id === ui.pet}" class="pet ${p.id === ui.pet ? 'on' : ''}" data-act="pet" data-id="${p.id}">
        <span class="av" style="--c:${p.color}">${p.name[0]}</span>
        <span class="pi"><b>${p.name}</b><small>${p.breed} · ${p.age}살</small></span>
        ${counts[p.id] ? `<span class="cnt" aria-label="알림 ${counts[p.id]}건">${counts[p.id]}</span>` : ''}</button>`).join('')}
    </div>
  </header>
  ${ui.emergency ? `<div class="emerg" role="alert"><b>응급 가능성: '${esc(ui.emergency)}'</b><p>기록 분석을 기다리지 말고 가까운 24시 동물병원에 전화한 뒤 바로 방문하세요.</p><button class="link inv" data-act="emerg-x">닫기</button></div>` : ''}
  <main class="scroll" id="scroll">${body}</main>
  <nav class="tabs" aria-label="화면 이동">${TABS.map(([id, t]) => `<button data-act="tab" data-id="${id}" class="${ui.tab === id ? 'on' : ''}" ${ui.tab === id ? 'aria-current="page"' : ''}>${svg(ICON[id])}<span>${t}</span></button>`).join('')}</nav>`;
}

function alertCard(a, i) {
  return `<article class="alert lv-${a.level}" id="a-${i}">
    <div class="a-top"><span class="tag">${LV[a.level].t}</span><h3>${a.title}</h3></div>
    <dl>
      <dt>무엇을 봤나요</dt><dd><ul>${a.seen.map(x => `<li>${x}</li>`).join('')}</ul>
        ${a.metric ? `<button class="evid" data-act="evid" data-m="${a.metric}">근거 기록 보기 →</button>` : ''}</dd>
      <dt>왜 중요한가요</dt><dd>${a.why}</dd>
      <dt>할 일</dt><dd><ol>${a.todo.map(x => `<li>${x}</li>`).join('')}</ol></dd>
    </dl></article>`;
}

function home(pet, recs, alerts) {
  const other = Object.values(PETS).find(p => p.id !== pet.id), oa = evaluate(other, data.recs[other.id]);
  return `
  <section class="sec">
    <p class="eyebrow">${kd(TODAY)} ${WD[TODAY.getDay()]}요일 · 묻기 전에 먼저</p>
    <h2 class="h">${pet.name}에게 오늘 챙길 것 ${alerts.length}가지</h2>
    <p class="lead">최근 30일 기록과 과거 병력 ${pet.history.length}건을 연결해 찾았어요.</p>
    ${alerts.length ? `<ol class="sum">${alerts.map((a, i) => `<li><a href="#a-${i}" class="lv-${a.level}"><span class="tag sm">${LV[a.level].t}</span>${a.title}</a></li>`).join('')}</ol>` : ''}
    ${alerts.length ? alerts.map((a, i) => alertCard(a, i)).join('') : '<div class="card empty">지금은 먼저 알려드릴 변화가 없어요. 기록이 쌓이면 계속 살펴볼게요.</div>'}
    ${oa.length ? `<button class="card other" data-act="pet" data-id="${other.id}"><span class="av sm" style="--c:${other.color}">${other.name[0]}</span><span>${josa(other.name, '이', '')}에게도 알림 ${oa.length}건 — ${oa[0].title}</span><span aria-hidden="true">›</span></button>` : ''}
  </section>
  <section class="sec">
    <h2 class="h2">${pet.name} 건강 기록부</h2>
    <div class="card prof">
      <div class="kv"><span>정보</span><b>${pet.breed} · ${pet.age}살 · ${pet.sex} · ${pet.weight}kg</b></div>
      <h4>과거 병력</h4>
      <ul class="tl">${pet.history.slice().reverse().map(h => `<li><time>${h.ym.replace('-', '.')}</time><div><b>${h.title}</b><p>${h.detail}</p></div></li>`).join('')}</ul>
      <h4>복용 중인 약</h4>
      <ul class="plain">${pet.meds.map(m => `<li><b>${m.name}</b><span>${m.dose}</span></li>`).join('')}</ul>
      <h4>접종 · 구충 예정</h4>
      <ul class="plain">${pet.schedule.map(sc => `<li><b>${sc.name}</b><span class="${sc.dueIn <= 7 ? 'soon' : ''}">D-${sc.dueIn} · ${kd(addDays(sc.dueIn))}</span></li>`).join('')}</ul>
    </div>
  </section>`;
}

function rec(pet, recs) {
  const t = recs.length - 1, r = recs[t], s = stats(recs, t - 1);
  const num = (k, label, unit, base) => `<label class="fld"><span>${label}</span><div class="inp"><input type="number" inputmode="numeric" min="0" max="${unit === 'ml' ? 3000 : 600}" name="${k}" value="${r[k]}" required><em>${unit}</em></div><small>평소 ${base}</small></label>`;
  const cnt = (k, label) => `<label class="fld"><span>${label}</span><div class="inp"><input type="number" inputmode="numeric" min="0" max="20" name="${k}" value="${r[k]}" required><em>회</em></div></label>`;
  const d = ui.diff;
  return `
  <section class="sec">
    <p class="eyebrow">${kd(TODAY)} 기록</p>
    <h2 class="h">${pet.name}의 오늘 기록</h2>
    <p class="lead">저장하면 먼저 알림이 바로 다시 계산돼요.</p>
    ${d ? `<div class="card diff" role="status"><b>저장했어요 · 알림 다시 계산 결과</b>${d.length ? `<ul>${d.map(x => `<li><span class="tag sm lv-${x.to || x.from}">${x.kind}</span>${x.title}${x.from && x.to ? ` <i>${LV[x.from].t} → ${LV[x.to].t}</i>` : ''}</li>`).join('')}</ul>` : '<p>알림 변화는 없어요.</p>'}<button class="btn sm ghost" data-act="tab" data-id="home">먼저 알림 보기</button></div>` : ''}
    <form class="card form" id="recForm" novalidate>
      <div class="grid">
        ${num('food', '식사량', 'g', `${R(s.food.b)}g`)}
        ${num('water', '음수량', 'ml', `${R(s.water.b)}ml`)}
        ${num('walk', pet.kind === 'dog' ? '산책' : '놀이·활동', '분', `${R(s.walk.b)}분`)}
        ${cnt('pee', '배뇨')}${cnt('poop', '배변')}${cnt('vomit', '구토')}
      </div>
      <fieldset class="cond"><legend>컨디션</legend>
        <div class="seg">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="cond" value="${v}" ${r.cond === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</div>
        <div class="seg-l"><small>나쁨</small><small>아주 좋음</small></div>
      </fieldset>
      ${pet.kind === 'dog' ? `<label class="chk"><input type="checkbox" name="limp" ${r.limp ? 'checked' : ''}><span>산책 중 절뚝임이 있었어요</span></label>` : ''}
      <p class="err" id="err" role="alert"></p>
      <button class="btn full" type="submit">저장하고 알림 다시 계산</button>
    </form>
  </section>`;
}

function chartSVG(k, label, unit, recs, alerts) {
  const W = 344, Hh = 150, pl = 36, pr = 12, pt = 16, pb = 24, n = recs.length;
  const v = recs.map(r => r[k]), mx = Math.max(...v), mn = Math.min(...v);
  const lo = k === 'pee' ? 0 : Math.max(0, Math.floor(mn * .75 / 10) * 10), hi = k === 'pee' ? Math.max(4, mx + 1) : Math.ceil(mx * 1.12 / 10) * 10;
  const x = i => pl + i * (W - pl - pr) / (n - 1), y = val => pt + (hi - val) / (hi - lo || 1) * (Hh - pt - pb), step = (W - pl - pr) / (n - 1);
  const base = avg(take(recs, k, n - 17, n - 4));
  const bands = alerts.filter(a => a.metric === k).flatMap(a => a.bands.map(b => ({ b, lv: a.level })));
  const pts = v.map((val, i) => `${x(i).toFixed(1)},${y(val).toFixed(1)}`).join(' ');
  const limpDots = k === 'walk' ? recs.map((r, i) => r.limp ? `<circle cx="${x(i)}" cy="${y(r.walk)}" r="4.5" class="mk"/>` : '').join('') : '';
  const last = v[n - 1];
  return `<figure class="card chart ${ui.focus === k ? 'focus' : ''}" id="c-${k}">
    <figcaption><b>${label}</b><span>오늘 ${last}${unit} · 2주 평균 ${k === 'pee' ? base.toFixed(1) : R(base)}${unit}</span></figcaption>
    <svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${label} 지난 30일 추이, 오늘 ${last}${unit}">
      ${bands.map(({ b, lv }) => `<rect class="band lv-${lv}" x="${x(b[0]) - step / 2}" y="${pt - 6}" width="${(b[1] - b[0] + 1) * step}" height="${Hh - pt - pb + 6}" rx="3"/>`).join('')}
      <line class="ax" x1="${pl}" x2="${W - pr}" y1="${Hh - pb}" y2="${Hh - pb}"/>
      <text class="tk" x="${pl - 6}" y="${y(hi) + 4}" text-anchor="end">${hi}</text>
      <text class="tk" x="${pl - 6}" y="${y(lo) + 1}" text-anchor="end">${lo}</text>
      <line class="base" x1="${pl}" x2="${W - pr}" y1="${y(base)}" y2="${y(base)}"/>
      <polyline class="ln" points="${pts}"/>
      ${limpDots}
      <circle cx="${x(n - 1)}" cy="${y(last)}" r="4" class="end"/>
      ${[0, 14, n - 1].map(i => `<text class="tk" x="${x(i)}" y="${Hh - 6}" text-anchor="${i ? i === n - 1 ? 'end' : 'middle' : 'start'}">${md(dayDate(i))}</text>`).join('')}
    </svg>
    ${bands.length ? `<p class="cap"><span class="sw lv-${bands[0].lv}"></span>알림 근거 구간${k === 'walk' ? ' · 점: 절뚝임 기록일' : ''}</p>` : ''}
  </figure>`;
}

function trend(pet, recs, alerts) {
  const list = [['water', '음수량', 'ml'], ['food', '식사량', 'g'], ['walk', pet.kind === 'dog' ? '산책' : '놀이·활동', '분'], ['pee', '배뇨', '회']];
  return `<section class="sec">
    <p class="eyebrow">지난 30일 · ${md(dayDate(0))} ~ ${md(TODAY)}</p>
    <h2 class="h">${pet.name}의 추이</h2>
    <p class="lead">점선은 직전 2주 평균, 색 띠는 알림이 근거로 쓴 구간이에요.</p>
    ${list.map(([k, l, u]) => chartSVG(k, l, u, recs, alerts)).join('')}
  </section>`;
}

function chat(pet) {
  const msgs = data.chat[pet.id];
  const intro = `${pet.name}의 기록 30일, 과거 병력 ${pet.history.length}건(${pet.history.map(h => h.title).join(', ')}), 복용약 ${pet.meds.length}가지를 기억하고 있어요. 궁금한 걸 물어보세요.`;
  return `<section class="sec chatwrap">
    <div class="msgs" id="msgs" aria-live="polite">
      <div class="msg ai"><p>${intro}</p></div>
      ${msgs.map(m => `<div class="msg ${m.who}"><p>${esc(m.text)}</p></div>`).join('')}
    </div>
    <div class="ex">${pet.examples.map(e => `<button class="chip" data-act="ask" data-q="${esc(e)}">${e}</button>`).join('')}</div>
    <form class="ask" id="askForm"><label class="sr" for="q">질문</label><input id="q" name="q" autocomplete="off" maxlength="200" placeholder="${pet.name}에 대해 물어보세요"><button class="btn" type="submit">보내기</button></form>
    <p class="disc">AI 상담은 기록을 바탕으로 한 참고 정보이며 수의학적 진단이 아닙니다. 이상 증상이 있으면 동물병원 진료를 받으세요.</p>
  </section>`;
}

function report(pet, recs) {
  const t = recs.length - 1;
  const wk = (k, a, b) => avg(take(recs, k, a, b));
  const rows = [['water', '평균 음수량', 'ml'], ['food', '평균 식사량', 'g'], ['walk', pet.kind === 'dog' ? '평균 산책' : '평균 활동', '분'], ['pee', '평균 배뇨', '회'], ['cond', '컨디션', '점']];
  const sum = (k, a, b) => take(recs, k, a, b).reduce((x, y) => x + (+y), 0);
  const days = []; for (let d = t - 6; d <= t; d++) days.push({ d, a: evaluate(pet, recs, d) });
  const lastLv = {}, lastT = {};
  return `<section class="sec">
    <p class="eyebrow">${md(dayDate(t - 6))} ~ ${md(TODAY)} · 지난주와 비교</p>
    <h2 class="h">${pet.name} 주간 리포트</h2>
    <div class="stats">${rows.map(([k, l, u]) => { const a = wk(k, t - 6, t), b = wk(k, t - 13, t - 7), p = b ? a / b - 1 : 0, dec = k === 'pee' || k === 'cond';
      return `<div class="card st"><span>${l}</span><b>${dec ? a.toFixed(1) : R(a)}<small>${u}</small></b><em class="${Math.abs(p) >= .2 ? 'up' : ''}">지난주 대비 ${P(p)}</em></div>`; }).join('')}
      <div class="card st"><span>구토 · 절뚝임</span><b>${sum('vomit', t - 6, t)}<small>회</small> · ${sum('limp', t - 6, t)}<small>회</small></b><em>지난주 ${sum('vomit', t - 13, t - 7)} · ${sum('limp', t - 13, t - 7)}</em></div>
    </div>
    <h2 class="h2">이번 주 알림 이력</h2>
    <div class="card hist"><ul>${days.map(({ d, a }) => {
      const first = d === t - 6, items = [];
      for (const x of a) {
        const o = lastLv[x.id], label = first && o === undefined ? '' : o === undefined ? '새 ' : o !== x.level ? (LV[x.level].r > LV[o].r ? '상승 ' : '하락 ') : null;
        lastLv[x.id] = x.level; lastT[x.id] = x.title;
        if (label !== null) items.push(`<span class="tag sm lv-${x.level}">${label}${LV[x.level].t}</span>${x.title.replace(/ D-\d+$/, ' 예정')}`);
      }
      for (const id of Object.keys(lastLv)) if (!a.find(x => x.id === id)) { items.push(`<span class="tag sm lv-watch">해제</span>${lastT[id].replace(/ D-\d+$/, '')}`); delete lastLv[id]; }
      return `<li><time>${md(dayDate(d))} ${WD[dayDate(d).getDay()]}</time><div>${first ? '<span class="muted">주 시작 시점</span><br>' : ''}${items.length ? items.join('<br>') : `<span class="muted">변화 없음${a.length ? ` · 알림 ${a.length}건 유지` : ''}</span>`}</div></li>`; }).join('')}</ul></div>
    <div class="card next"><b>다음 주 확인할 것</b><ol>${(evaluate(pet, recs).flatMap(a => a.todo.slice(0, 1)).map(x => `<li>${x}</li>`).join('')) || '<li>지금처럼 기록 유지</li>'}</ol></div>
  </section>`;
}

/* ---------- 이벤트 ---------- */
$app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'tab') { ui.tab = b.dataset.id; ui.focus = null; if (ui.tab !== 'rec') ui.diff = null; }
  else if (act === 'pet') { ui.pet = b.dataset.id; ui.diff = null; ui.focus = null; }
  else if (act === 'evid') { ui.tab = 'trend'; ui.focus = b.dataset.m; }
  else if (act === 'emerg-x') ui.emergency = null;
  else if (act === 'ask') return ask(b.dataset.q);
  else if (act === 'reset') {
    if (!confirm('기록과 상담 내용을 처음 상태로 되돌릴까요?')) return;
    try { localStorage.removeItem(KEY); } catch (er) { }
    data = fresh(); Object.assign(ui, { tab: 'home', focus: null, emergency: null, diff: null });
  }
  render();
  const sc = document.getElementById('scroll');
  if (ui.focus) document.getElementById('c-' + ui.focus)?.scrollIntoView({ block: 'center' });
  else if (act !== 'emerg-x' && sc) sc.scrollTop = 0;
});

$app.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'askForm') return ask(e.target.q.value);
  if (e.target.id !== 'recForm') return;
  const f = e.target, pet = PETS[ui.pet], recs = data.recs[pet.id], err = f.querySelector('#err');
  const vals = {};
  for (const k of ['food', 'water', 'walk', 'pee', 'poop', 'vomit']) {
    const el = f.elements[k], v = Number(el.value);
    if (el.value === '' || !Number.isFinite(v) || v < 0 || v > Number(el.max)) { err.textContent = `${el.closest('.fld').querySelector('span').textContent} 값을 0~${el.max} 사이로 입력해 주세요.`; el.focus(); return; }
    vals[k] = Math.round(v);
  }
  vals.cond = Number(f.elements.cond.value) || 3;
  vals.limp = !!(f.elements.limp && f.elements.limp.checked);
  const before = evaluate(pet, recs);
  recs[recs.length - 1] = vals;
  const after = evaluate(pet, recs);
  const diff = [];
  for (const a of after) { const o = before.find(x => x.id === a.id); if (!o) diff.push({ kind: '새 알림', title: a.title, to: a.level }); else if (o.level !== a.level) diff.push({ kind: LV[a.level].r > LV[o.level].r ? '단계 상승' : '단계 하락', title: a.title, from: o.level, to: a.level }); }
  for (const o of before) if (!after.find(x => x.id === o.id)) diff.push({ kind: '해제', title: o.title, from: o.level });
  ui.diff = diff; persist(); render();
  document.getElementById('scroll').scrollTop = 0;
});

function ask(q) {
  q = String(q || '').trim(); if (!q) return;
  const pet = PETS[ui.pet], m = data.chat[pet.id];
  m.push({ who: 'me', text: q }, { who: 'ai', text: answer(pet, q) });
  persist(); render();
  const box = document.getElementById('scroll'); box.scrollTop = box.scrollHeight;
  document.getElementById('q')?.focus();
}

render();
