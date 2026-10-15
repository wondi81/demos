'use strict';
/* 반려동물 AI 건강비서 — 작동 데모
   정적 데모: 답변은 규칙 기반(키워드 매칭)이며, 인용 논문은 모두 PubMed에서 존재를 확인한 실제 자료다. */

const TODAY = new Date(2026, 9, 16);
const DAYS = 14;
const WD = '일월화수목금토';
const dayDate = i => { const d = new Date(TODAY); d.setDate(d.getDate() - (DAYS - 1 - i)); return d; };
const addDays = n => { const d = new Date(TODAY); d.setDate(d.getDate() + n); return d; };
const md = d => `${d.getMonth() + 1}/${d.getDate()}`;
const hd = d => d.getFullYear() === TODAY.getFullYear() ? md(d) : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
const mdw = d => `${md(d)} (${WD[d.getDay()]})`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
const r0 = n => Math.round(n);
const r1 = n => Math.round(n * 10) / 10;

/* ---------- 지식DB: PubMed E-utilities로 확인한 실제 자료 ---------- */
const REFS = {
  '39935081': { t: '2025 iCatCare consensus guidelines on the diagnosis and management of lower urinary tract diseases in cats.', j: 'J Feline Med Surg', y: 2025, lv: '가이드라인', topic: '하부요로', ok: true },
  '41527203': { t: 'Diagnostic accuracy of symmetric dimethylarginine for chronic kidney disease in cats and dogs: A systematic review.', j: 'Vet Rec', y: 2026, lv: '체계적 문헌고찰', topic: '신장', ok: true },
  '40147044': { t: 'Understanding the current evidence base for the commonly recommended management strategies for recurrent feline idiopathic cystitis: a systematic review.', j: 'N Z Vet J', y: 2025, lv: '체계적 문헌고찰', topic: '하부요로', ok: true },
  '36142319': { t: 'A 2022 Systematic Review and Meta-Analysis of Enriched Therapeutic Diets and Nutraceuticals in Canine and Feline Osteoarthritis.', j: 'Int J Mol Sci', y: 2022, lv: '체계적 문헌고찰', topic: '관절 영양', ok: true },
  '20043800': { t: 'Multicenter veterinary practice assessment of the effects of omega-3 fatty acids on osteoarthritis in dogs.', j: 'J Am Vet Med Assoc', y: 2010, lv: '임상연구 · 무작위 대조', topic: '관절 영양', ok: true },
  '37815022': { t: 'Urinary cystatin B differentiates progressive versus stable IRIS Stage 1 chronic kidney disease in dogs.', j: 'J Vet Intern Med', y: 2023, lv: '임상연구 · 다기관', topic: '신장', ok: true },
  '39250933': { t: 'Medial patellar luxation induces cartilage erosion in dogs: a retrospective study of prevalence and risk factors.', j: 'Am J Vet Res', y: 2024, lv: '임상연구 · 후향', topic: '슬개골', ok: true },
  '33600015': { t: 'Canine medial patellar luxation.', j: 'J Small Anim Pract', y: 2021, lv: '종설', topic: '슬개골', ok: true },
  '31346113': { t: 'How to diagnose polyuria and polydipsia in dogs.', j: 'Vet Rec', y: 2019, lv: '종설', topic: '다음다뇨', ok: true },
  '25813400': { t: 'Feline idiopathic cystitis.', j: 'Vet Clin North Am Small Anim Pract', y: 2015, lv: '종설', topic: '하부요로', ok: false, why: '2025 가이드라인과 내용 중복 여부 검토 중' }
};
const LV_ORDER = ['가이드라인', '체계적 문헌고찰', '임상연구 · 무작위 대조', '임상연구 · 다기관', '임상연구 · 후향', '종설'];

/* ---------- 개체 데이터 (가상) ---------- */
const BASE_PETS = {
  kong: {
    id: 'kong', name: '콩이', initial: '콩', species: 'dog', breed: '말티즈', age: 7, sex: '중성화 수컷', weight: '3.2kg',
    actLabel: '산책·활동',
    history: [
      { date: new Date(2025, 2, 14), kind: '진료', title: '왼쪽 뒷다리 내측 슬개골 탈구 2기 진단', detail: '정형외과 진료. 수술 대신 체중 관리, 미끄럼 방지, 관절 영양제 급여를 권고받음.', tag: 'patella' },
      { date: new Date(2026, 8, 28), kind: '검사', title: '정기 혈액검사 — SDMA 15 µg/dL, 경계 소견', detail: '참고치 0–14. 크레아티닌 1.2 mg/dL(정상), 요비중 1.022. 3개월 뒤 재검 권고.', tag: 'kidney' }
    ],
    meds: [{ name: '관절 영양제 (오메가-3 EPA·DHA)', dose: '1일 1회 아침', since: '2025년 3월부터' }],
    series: {
      water: [218, 226, 212, 224, 229, 215, 221, 210, 227, 219, 231, 296, 308, 322],
      food: [100, 100, 95, 100, 100, 90, 100, 100, 100, 95, 100, 100, 90, 95],
      urine: [4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5, 6, 7, 7],
      activity: [42, 38, 45, 40, 35, 44, 40, 38, 41, 45, 39, 28, 34, 30],
      vomit: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      stool: ['정상', '정상', '정상', '정상', '정상', '무름', '정상', '정상', '정상', '정상', '정상', '정상', '정상', '정상'],
      cond: ['좋음', '좋음', '좋음', '좋음', '좋음', '보통', '좋음', '좋음', '보통', '좋음', '좋음', '보통', '보통', '보통'],
      memo: { 8: '아침 공복에 노란 거품 1회 구토', 11: '산책 후 왼쪽 뒷다리를 들고 깡총거림 (1분 안에 회복)', 13: '물그릇을 평소보다 자주 비움' }
    },
    alerts: [
      { kind: '복약', title: '관절 영양제', due: 0, daily: true, when: '매일 오전 8:00' },
      { kind: '예방', title: '심장사상충 예방약', due: 4 },
      { kind: '접종', title: '종합백신(DHPPL) 추가접종', due: 8 },
      { kind: '재검', title: '혈액검사 재검 (SDMA)', due: 73, sub: '9/28 진료 시 3개월 뒤 재검 권고' }
    ]
  },
  nabi: {
    id: 'nabi', name: '나비', initial: '나', species: 'cat', breed: '코리안 숏헤어', age: 5, sex: '중성화 수컷', weight: '4.6kg',
    actLabel: '놀이',
    history: [
      { date: new Date(2026, 5, 12), kind: '진료', title: '특발성 방광염(FIC) 진단 — 하부요로질환', detail: '요검사 혈뇨(+), 결정 없음, 세균 배양 음성. 요로 관리 처방 사료 시작, 물 섭취를 늘리도록 권고.', tag: 'flutd' },
      { date: new Date(2026, 5, 26), kind: '진료', title: '재진 — 증상 호전', detail: '혈뇨 소실. 처방 사료 유지, 스트레스 요인 줄이기 권고.', tag: 'flutd' }
    ],
    meds: [{ name: '요로 관리 처방 사료', dose: '하루 2회 나눠 급여', since: '2026년 6월부터' }],
    series: {
      water: [172, 180, 168, 175, 183, 170, 178, 174, 169, 181, 176, 171, 178, 174],
      food: [100, 100, 100, 95, 100, 100, 100, 100, 100, 100, 95, 100, 90, 90],
      urine: [3, 4, 3, 4, 3, 3, 4, 3, 4, 3, 4, 5, 5, 6],
      activity: [20, 25, 18, 22, 20, 24, 19, 21, 23, 20, 22, 15, 12, 14],
      vomit: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      stool: Array(14).fill('정상'),
      cond: ['좋음', '좋음', '좋음', '좋음', '보통', '좋음', '좋음', '좋음', '좋음', '좋음', '좋음', '보통', '보통', '보통'],
      memo: { 4: '헤어볼 1회 토함', 12: '화장실을 자주 들락날락, 소변 덩어리가 작음', 13: '모래 위에 오래 앉아 있음' }
    },
    alerts: [
      { kind: '급여', title: '요로 관리 처방 사료', due: 0, daily: true, when: '매일 아침·저녁' },
      { kind: '예방', title: '내·외부 구충제', due: 6 },
      { kind: '접종', title: '종합백신(FVRCP) 추가접종', due: 24 },
      { kind: '재검', title: '요검사 재검', due: 57, sub: '6/26 재진 시 6개월 뒤 확인 권고' }
    ]
  }
};
const PETS = structuredClone(BASE_PETS);
for (const p of Object.values(PETS)) { p.added = []; p.chat = []; p.alerts.forEach(a => a.done = false); }

const state = { pet: 'kong', tab: 'home', recFilter: 'daily', kbTopic: '전체' };
const pet = () => PETS[state.pet];
const other = () => PETS[state.pet === 'kong' ? 'nabi' : 'kong'];

/* ---------- 분석 ---------- */
const RANGE_BASE = `${md(dayDate(0))}–${md(dayDate(DAYS - 4))}`;
const RANGE_REC = `${md(dayDate(DAYS - 3))}–${md(dayDate(DAYS - 1))}`;
function trend(p, key) {
  const s = p.series[key];
  const base = avg(s.slice(0, DAYS - 3)), rec = avg(s.slice(DAYS - 3));
  return { base, rec, pct: r0((rec / base - 1) * 100) };
}
const hasTag = (p, tag) => p.history.find(h => h.tag === tag);
function recentMemos(p, re, n = 3) {
  const out = [];
  for (let i = DAYS - n; i < DAYS; i++) { const m = p.series.memo[i]; if (m && re.test(m)) out.push({ i, m }); }
  return out;
}
const LIMP_RE = /절뚝|절어|절름|들고|깡총|파행|다리/;
const sumLast = (p, key, n) => p.series[key].slice(DAYS - n).reduce((s, v) => s + v, 0);

function insights(p) {
  const out = [];
  const w = trend(p, 'water'), u = trend(p, 'urine');
  const kidney = hasTag(p, 'kidney'), flutd = hasTag(p, 'flutd'), patella = hasTag(p, 'patella');

  if (w.pct >= 25) {
    const chips = [
      { d: RANGE_REC, t: `음수량 평균 ${r0(w.rec)}ml` },
      { d: RANGE_BASE, t: `평소 평균 ${r0(w.base)}ml` }
    ];
    if (u.pct >= 15) chips.push({ d: RANGE_REC, t: `배뇨 하루 ${r1(u.rec)}회 (평소 ${r1(u.base)}회)` });
    if (kidney) chips.push({ d: md(kidney.date), t: 'SDMA 15 경계 소견' });
    out.push({
      level: kidney ? 'visit' : 'watch', key: 'water',
      title: `최근 3일 음수량이 평소보다 약 ${w.pct}% 늘었어요`,
      body: kidney
        ? `${md(kidney.date)} 혈액검사에서 신장 수치(SDMA)가 경계였던 만큼, 이번 변화는 그냥 넘기지 않는 게 좋아요. 진단은 아니지만 병원 상담을 권해요.`
        : '날씨나 활동량 때문일 수도 있어요. 며칠 더 같은 기준으로 기록해 보고, 계속되면 진료를 받아 보세요.',
      points: ['같은 그릇, 같은 시간 기준으로 하루 음수량 기록', '소변 양과 색, 횟수 변화', '식욕과 체중 변화'],
      chips, ask: '요즘 물을 많이 마시는데 괜찮을까요?'
    });
  } else if (w.pct <= -25 && flutd) {
    out.push({
      level: 'watch', key: 'water-down',
      title: `최근 3일 음수량이 평소보다 약 ${-w.pct}% 줄었어요`,
      body: '하부요로질환 이력이 있어 물 섭취 유지가 중요해요. 물그릇 위치를 늘리거나 습식 비중을 높이는 방법을 병원과 상의해 보세요.',
      points: ['음수량 회복 여부', '화장실 횟수와 소변 양'],
      chips: [{ d: RANGE_REC, t: `음수량 평균 ${r0(w.rec)}ml` }, { d: RANGE_BASE, t: `평소 ${r0(w.base)}ml` }, { d: md(flutd.date), t: '특발성 방광염 진단' }],
      ask: '요즘 물을 많이 마시는데 괜찮을까요?'
    });
  }

  if (p.species === 'cat' && u.pct >= 30) {
    const chips = [
      { d: RANGE_REC, t: `배뇨 하루 ${r1(u.rec)}회` },
      { d: RANGE_BASE, t: `평소 ${r1(u.base)}회` }
    ];
    recentMemos(p, /화장실|소변|모래/).forEach(x => chips.push({ d: md(dayDate(x.i)), t: x.m }));
    if (flutd) chips.push({ d: md(flutd.date), t: '특발성 방광염 진단' });
    out.push({
      level: 'visit', key: 'urine',
      title: `최근 3일 화장실 횟수가 평소보다 약 ${u.pct}% 늘었어요`,
      body: flutd ? `${md(flutd.date)} 특발성 방광염 진단 이력이 있어 재발 신호일 수 있어요. 오늘이나 내일 중 진료를 권해요.` : '방광 쪽 불편함의 신호일 수 있어요. 진료를 권해요.',
      points: ['소변 덩어리 크기가 줄었는지', '소변 색이 분홍빛이거나 붉은지', '힘을 주는데 소변이 안 나오면 바로 응급 진료'],
      chips, ask: '나비가 화장실을 자주 가요'
    });
  }

  const limps = recentMemos(p, LIMP_RE);
  if (limps.length) {
    const a = trend(p, 'activity');
    const chips = limps.map(x => ({ d: md(dayDate(x.i)), t: x.m }));
    if (a.pct <= -15) chips.push({ d: RANGE_REC, t: `활동 ${r0(a.rec)}분 (평소 ${r0(a.base)}분)` });
    if (patella) chips.push({ d: hd(patella.date), t: '슬개골 탈구 2기 진단' });
    out.push({
      level: limps.length >= 2 ? 'visit' : 'watch', key: 'limp',
      title: patella ? '산책 후 다리를 드는 모습이 기록됐어요' : '다리를 불편해하는 기록이 있어요',
      body: patella ? (limps.length >= 2 ? '최근 3일 안에 반복해서 기록됐어요. 슬개골 탈구 2기 이력이 있어 정형외과 진료를 권해요.' : '슬개골 탈구 2기 이력과 관련 있을 수 있어요. 한 번이면 지켜보고, 반복되면 정형외과 진료를 받으세요.') : '관절 관련 이력은 없어요. 반복되면 진료를 받아 보세요.',
      points: ['절는 순간을 10초 정도 영상으로 남기기', '계단·점프·미끄러운 바닥 피하기', '3일 넘게 반복되면 진료'],
      chips, ask: '산책 후 다리를 절어요'
    });
  }

  const v3 = sumLast(p, 'vomit', 3);
  if (v3 >= 2) {
    out.push({
      level: 'visit', key: 'vomit',
      title: `최근 3일 동안 구토가 ${v3}회 기록됐어요`,
      body: '구토가 반복되면 탈수 위험이 있어요. 기운이나 식욕이 떨어지면 바로 진료를 받으세요.',
      points: ['토한 내용물과 시각', '물을 마셔도 토하는지', '기운·식욕 변화'],
      chips: [{ d: RANGE_REC, t: `구토 ${v3}회` }], ask: '구토를 했는데 지켜봐도 될까요?'
    });
  }

  const soon = p.alerts.filter(a => !a.daily && !a.done && a.due <= 7);
  if (soon.length) {
    out.push({
      level: 'info', key: 'soon',
      title: soon.map(a => a.title).join(', ') + (soon.length > 1 ? ' 일정이 다가와요' : ' 일정이 다가와요'),
      body: soon.map(a => `${soon.length > 1 ? a.title + ' ' : ''}${mdw(addDays(a.due))}, ${a.due}일 남음`).join(' · '),
      points: [], chips: [], ask: '다음 접종이 언제예요?'
    });
  }
  if (!out.some(x => x.level !== 'info')) {
    out.unshift({ level: 'ok', key: 'ok', title: '최근 기록에서 눈에 띄는 변화는 없어요', body: '음수량, 배뇨, 활동, 구토 기록이 모두 평소 범위예요. 꾸준히 기록해 주시면 작은 변화도 먼저 알려드릴게요.', points: [], chips: [], ask: null });
  }
  return out;
}

/* ---------- AI 답변 (규칙 기반) ---------- */
const EMERGENCY_RE = /경련|발작|호흡\s*곤란|숨\s*(을|이)?\s*(못|헐떡|가쁘|차)|숨쉬기|숨을\s*안|청색증|잇몸이?\s*(하얗|파랗|창백)|쓰러|의식|기절|(소변|오줌)\s*(이|을|이가)?\s*(안|못|전혀)\s*(나|봐|누)|혈변|피를?\s*토|토혈|초콜릿|포도|자일리톨|중독|교통사고/;

function answer(p, q) {
  const text = q.trim();
  const o = other();
  if (EMERGENCY_RE.test(text)) return emergency(p, text);
  if (text.includes(o.name) && !text.includes(p.name)) return { switchTo: o.id, q: text };
  if (/영양제|오메가|보조제|글루코사민/.test(text)) return supplement(p);
  if (/절뚝|절어|절름|절룩|다리|파행|슬개골|무릎/.test(text)) return limp(p);
  if (/화장실|소변|오줌|배뇨|방광|요로|모래/.test(text)) return p.species === 'cat' ? toilet(p) : water(p);
  if (/물|음수|마시|갈증/.test(text)) return water(p);
  if (/접종|백신|예방약|심장사상충|구충|복약|약\s*(언제|먹)|일정/.test(text)) return schedule(p);
  if (/토(했|해|함|를|하)|구토|게워|헤어볼/.test(text)) return vomit(p);
  return fallback(p);
}

function water(p) {
  const w = trend(p, 'water'), u = trend(p, 'urine');
  const kidney = hasTag(p, 'kidney'), flutd = hasTag(p, 'flutd');
  const facts = [{ d: RANGE_REC, t: `음수량 하루 평균 ${r0(w.rec)}ml (평소 ${r0(w.base)}ml, ${w.pct >= 0 ? '+' : ''}${w.pct}%)` }];
  if (Math.abs(u.pct) >= 15) facts.push({ d: RANGE_REC, t: `배뇨 하루 평균 ${r1(u.rec)}회 (평소 ${r1(u.base)}회)` });
  if (kidney) facts.push({ d: md(kidney.date), t: '혈액검사 SDMA 15 µg/dL, 경계 소견. 3개월 뒤 재검 권고' });
  if (flutd) facts.push({ d: md(flutd.date), t: '특발성 방광염 진단, 물 섭취를 늘리도록 권고받음' });
  const m = p.series.memo[DAYS - 1]; if (m && /물/.test(m)) facts.push({ d: md(dayDate(DAYS - 1)), t: m });

  if (p.species === 'cat') {
    const low = w.pct <= -25;
    return {
      verdict: low ? 'watch' : 'record',
      lead: low
        ? `${p.name}의 최근 3일 음수량이 평소보다 약 ${-w.pct}% 적어요. 하부요로질환 이력이 있어 물 섭취가 줄어든 건 지켜볼 만한 변화예요.`
        : `${p.name}의 음수량은 평소 범위예요(${w.pct >= 0 ? '+' : ''}${w.pct}%). 많이 마시는 편이라면 6/12 진료에서 권고받은 방향과 맞아요.`,
      facts,
      evidence: { text: '고양이 하부요로질환의 진단과 관리는 2025년 International Cat Care(iCatCare) 합의 가이드라인에 정리돼 있어요. 비서는 이 가이드라인을 나비 답변의 기준 자료로 씁니다.', refs: ['39935081'] },
      unknown: '물을 많이 마시는 이유가 사료 변화 때문인지 다른 원인 때문인지는 기록만으로 알 수 없어요.',
      next: ['같은 그릇, 같은 시간 기준으로 계속 기록해 주세요', '화장실 횟수가 늘어난 것도 함께 보이면 진료를 받으세요']
    };
  }
  if (w.pct >= 25) {
    return {
      verdict: kidney ? 'visit' : 'watch',
      lead: kidney
        ? `지금은 지켜만 보기보다 병원에 상담해 보시길 권해요. ${p.name}의 최근 3일 음수량이 평소보다 약 ${w.pct}% 많고, ${md(kidney.date)} 검사에서 신장 수치(SDMA)가 경계였기 때문이에요.`
        : `최근 3일 음수량이 평소보다 약 ${w.pct}% 많아요. 며칠 더 기록해 보고 계속되면 진료를 받아 보세요.`,
      facts,
      evidence: {
        text: '물을 많이 마시고 소변이 늘어나는 증상(다음다뇨)은 원인이 여러 가지라 검사로 구분해야 한다는 것이 진료 안내 자료의 일반적인 접근이에요. SDMA는 신장 기능 평가에 쓰이는 지표로, 진단 정확도를 정리한 체계적 문헌고찰이 있어요. 초기(IRIS 1기) 신장 질환의 진행 여부를 가려내려는 연구도 진행되고 있어요.',
        refs: ['31346113', '41527203', '37815022']
      },
      unknown: '음수량 증가만으로 원인을 알 수는 없어요. 날씨, 활동량, 간식 변화 같은 일상 요인일 수도 있고, 기록만으로 신장 문제인지 판단할 수 없어요.',
      next: kidney
        ? ['12월로 잡힌 재검을 앞당길지 병원에 문의해 주세요', '음수량 기록을 계속해 주세요. 진료 때 리포트로 그대로 보여드릴 수 있어요', '식욕이 떨어지거나 구토가 함께 나타나면 바로 진료를 받으세요']
        : ['같은 기준으로 3일 더 기록해 주세요', '계속 늘어나면 진료를 받으세요']
    };
  }
  return {
    verdict: w.pct >= 15 ? 'uncertain' : 'record',
    lead: w.pct >= 15
      ? `최근 3일 음수량이 평소보다 약 ${w.pct}% 많지만, 아직 판단하기엔 이른 수준이에요.`
      : `최근 3일 음수량은 평소 범위예요(${w.pct >= 0 ? '+' : ''}${w.pct}%). 지금 기록만 보면 걱정할 만한 변화는 아니에요.`,
    facts,
    evidence: kidney ? { text: 'SDMA는 신장 기능 평가에 쓰이는 지표로, 진단 정확도를 정리한 체계적 문헌고찰이 있어요. 경계 소견이 있었던 만큼 예정된 재검은 꼭 받는 것이 좋아요.', refs: ['41527203'] } : null,
    unknown: '하루 이틀 기록으로는 추세를 확신하기 어려워요.',
    next: kidney ? ['12월 재검 일정을 유지해 주세요', '음수량 기록을 계속해 주세요'] : ['음수량 기록을 계속해 주세요']
  };
}

function limp(p) {
  const patella = hasTag(p, 'patella');
  const limps = recentMemos(p, LIMP_RE, 7);
  const a = trend(p, 'activity');
  const facts = [];
  if (patella) facts.push({ d: hd(patella.date), t: patella.title });
  limps.forEach(x => facts.push({ d: md(dayDate(x.i)), t: x.m }));
  if (a.pct <= -15) facts.push({ d: RANGE_REC, t: `${p.actLabel} 하루 평균 ${r0(a.rec)}분 (평소 ${r0(a.base)}분)` });
  if (!patella) {
    return {
      verdict: 'uncertain',
      lead: `${p.name}는 관절이나 정형외과 관련 기록이 없어요. 원인을 짐작해서 말씀드리지 않을게요.`,
      facts: facts.length ? facts : [{ d: '기록 없음', t: '최근 14일 다리 관련 메모 없음' }],
      evidence: null, noEvidence: '고양이 파행에 대해 검토 승인된 자료가 아직 지식DB에 없어 기록 기반으로만 안내해요.',
      unknown: '발바닥 상처, 발톱, 관절, 근육 문제 중 무엇인지 기록만으로는 구분할 수 없어요.',
      next: ['절는 모습을 짧은 영상으로 남기고 기록 탭에 메모해 주세요', '하루 넘게 계속되거나 발을 전혀 딛지 못하면 진료를 받으세요']
    };
  }
  return {
    verdict: limps.length >= 2 ? 'visit' : 'uncertain',
    lead: `${p.name}는 슬개골 탈구 2기 이력이 있어서, 산책 후 잠깐 다리를 들고 걷는 모습은 그 이력과 관련 있을 수 있어요. 다만 ${limps.length >= 2 ? '최근 여러 번 기록돼 진료를 권해요.' : '한 번의 기록만으로는 판단하기 어려워요.'}`,
    facts,
    evidence: { text: '내측 슬개골 탈구는 소형견에서 흔한 정형외과 질환이고 등급에 따라 관리 방법이 달라진다는 종설이 있어요. 슬개골 탈구와 관절 연골 손상의 관련성을 살펴본 연구도 있어요.', refs: ['33600015', '39250933'] },
    unknown: '이번 절뚝거림이 슬개골 때문인지, 발바닥 상처나 다른 관절 문제인지는 기록만으로 구분할 수 없어요.',
    next: ['절는 순간을 10초 정도 영상으로 남겨 주세요. 진료 때 큰 도움이 돼요', '3일 넘게 반복되거나 다리를 전혀 딛지 못하면 병원에 가세요', '당분간 계단, 점프, 미끄러운 바닥을 피해 주세요']
  };
}

function toilet(p) {
  const u = trend(p, 'urine'), flutd = hasTag(p, 'flutd');
  const facts = [{ d: RANGE_REC, t: `배뇨 하루 평균 ${r1(u.rec)}회 (평소 ${r1(u.base)}회, ${u.pct >= 0 ? '+' : ''}${u.pct}%)` }];
  recentMemos(p, /화장실|소변|모래/).forEach(x => facts.push({ d: md(dayDate(x.i)), t: x.m }));
  if (flutd) facts.push({ d: md(flutd.date), t: flutd.title });
  facts.push({ d: '복용', t: p.meds[0].name + ', ' + p.meds[0].since });
  const up = u.pct >= 30;
  return {
    verdict: up ? 'visit' : 'record',
    lead: up
      ? `${p.name}는 ${md(flutd.date)} 특발성 방광염 진단 이력이 있어서, 화장실 횟수가 늘어난 지금은 재발 신호일 수 있어요. 오늘이나 내일 중 진료를 권해요.`
      : `${p.name}의 최근 배뇨 횟수는 평소 범위예요. 하부요로질환 이력이 있으니 횟수와 소변 양은 계속 기록해 주세요.`,
    facts,
    evidence: { text: '고양이 하부요로질환의 진단과 관리는 2025년 iCatCare 합의 가이드라인에 정리돼 있어요. 재발성 특발성 방광염에 흔히 권장되는 관리법들의 근거 수준을 살펴본 체계적 문헌고찰도 있어요.', refs: ['39935081', '40147044'] },
    unknown: '횟수 증가가 방광염 재발인지, 결석이나 감염 같은 다른 원인인지는 소변 검사 없이 알 수 없어요.',
    warn: '힘을 주는데 소변이 거의 안 나오면 요도 폐색일 수 있어요. 이때는 기다리지 말고 바로 병원으로 가세요.',
    next: ['화장실에 다녀올 때마다 소변 덩어리 크기와 색을 기록해 주세요', '진료 전에 소변 샘플 받는 방법을 병원에 물어보세요', '처방 사료는 임의로 바꾸지 말고 그대로 유지해 주세요']
  };
}

function supplement(p) {
  const med = p.meds.find(m => /영양제/.test(m.name));
  if (!med) {
    return {
      verdict: 'uncertain',
      lead: `${p.name}는 복용 중인 관절 영양제 기록이 없어요. 지금은 ${p.meds[0].name}만 급여 중이에요.`,
      facts: [{ d: '복용', t: `${p.meds[0].name}, ${p.meds[0].since}` }, { d: hd(p.history[0].date), t: p.history[0].title }],
      evidence: null, noEvidence: '처방 사료와 관절 영양제를 함께 쓰는 경우에 대해 검토 승인된 자료가 아직 없어요.',
      unknown: '영양제 성분이 처방 사료의 영양 설계와 겹치거나 충돌하는지는 제품을 봐야 알 수 있어요.',
      next: ['영양제를 시작하기 전에 제품 성분표를 수의사에게 보여 주세요']
    };
  }
  const kidney = hasTag(p, 'kidney'), patella = hasTag(p, 'patella');
  const facts = [{ d: '복용', t: `${med.name}, ${med.dose}, ${med.since}` }];
  if (patella) facts.push({ d: hd(patella.date), t: '슬개골 탈구 2기 진단 시 관절 영양제 권고' });
  if (kidney) facts.push({ d: md(kidney.date), t: 'SDMA 15 경계 소견' });
  return {
    verdict: 'evidence',
    lead: `지금처럼 계속 먹이는 것은 대체로 무리가 없어 보여요. 오메가-3는 개 골관절염에서 연구가 비교적 많이 된 성분이에요. 다만 신장 수치 경계 이력이 있으니 다음 검사 때 제품을 수의사에게 보여 주세요.`,
    facts,
    evidence: { text: '개 골관절염에서 오메가-3 지방산 보충 효과를 살펴본 다기관 무작위 연구가 있고, 관절 영양제와 치료식 전반을 정리한 체계적 문헌고찰·메타분석도 있어요.', refs: ['20043800', '36142319'] },
    unknown: `${p.name}에게 지금 제품이 실제로 효과가 있는지는 기록만으로 알 수 없어요. 연구 대상은 주로 골관절염이 진단된 개였어요.`,
    next: ['제품명과 함량을 기록에 남겨 주세요. 다음 진료 때 함께 검토할 수 있어요', '12월 재검 때 신장 수치와 함께 복용 중인 보조제를 알려 주세요', '임의로 용량을 늘리지 마세요']
  };
}

function schedule(p) {
  const list = p.alerts.filter(a => !a.daily).sort((a, b) => a.due - b.due);
  return {
    verdict: 'record',
    lead: `${p.name}의 가장 가까운 일정은 ${list[0].title}, ${mdw(addDays(list[0].due))}이에요. ${list[0].due}일 남았어요.`,
    facts: list.map(a => ({ d: md(addDays(a.due)), t: `${a.title}${a.done ? ' (완료)' : ''}${a.sub ? ' · ' + a.sub : ''}` })),
    evidence: null, noEvidence: '일정 안내는 기록을 그대로 알려드리는 것이라 논문 근거를 붙이지 않았어요.',
    unknown: null,
    next: ['전날 오전 9시에 한 번 더 알려드릴게요', '병원 사정으로 날짜가 바뀌면 홈의 알림에서 수정할 수 있어요']
  };
}

function vomit(p) {
  const days = []; for (let i = DAYS - 7; i < DAYS; i++) if (p.series.vomit[i]) days.push(i);
  const v3 = sumLast(p, 'vomit', 3), w = trend(p, 'water');
  const facts = days.length ? days.map(i => ({ d: md(dayDate(i)), t: p.series.memo[i] || `구토 ${p.series.vomit[i]}회` })) : [{ d: '최근 7일', t: '구토 기록 없음' }];
  if (p.species === 'dog' && w.pct >= 25) facts.push({ d: RANGE_REC, t: `음수량 평소보다 약 ${w.pct}% 많음` });
  return {
    verdict: v3 >= 2 ? 'visit' : 'uncertain',
    lead: days.length
      ? `기록상 최근 7일 구토는 ${days.map(i => md(dayDate(i))).join(', ')}에 있었어요. ${v3 >= 2 ? '최근 3일 안에 반복되고 있어 진료를 권해요.' : '한 번의 구토만으로 큰 문제라고 보긴 어렵지만, 확실하다고 말씀드릴 수는 없어요.'}`
      : `최근 7일 동안 ${p.name}의 구토 기록은 없어요. 방금 토했다면 기록 탭에 남겨 주세요. 패턴을 같이 볼게요.`,
    facts,
    evidence: null, noEvidence: '이 주제는 아직 검토 승인된 근거 자료가 지식DB에 없어서, 기록과 일반적인 안전 수칙만 안내해요.',
    unknown: '구토 원인은 매우 다양해서 기록만으로는 추정하지 않을게요.',
    next: ['토한 시각과 내용물(사료, 거품, 털)을 기록해 주세요', '하루 2회 이상 토하거나, 물도 토하거나, 기운이 없으면 바로 진료를 받으세요'].concat(p.species === 'dog' && w.pct >= 25 ? ['물을 많이 마시는 변화와 겹치는 만큼 진료를 미루지 마세요'] : [])
  };
}

function emergency(p, text) {
  const steps = ['이동하면서 증상이 시작된 시각과 지속 시간을 메모해 주세요'];
  if (/경련|발작/.test(text)) steps.push('경련 중에는 입에 손을 넣지 말고 주변 물건을 치워 다치지 않게 해 주세요');
  if (/초콜릿|포도|자일리톨|중독/.test(text)) steps.push('먹은 것으로 의심되는 물건이나 포장지를 챙겨 가세요. 억지로 토하게 하지 마세요');
  if (/소변|오줌/.test(text)) steps.push(p.species === 'cat' ? '고양이가 소변을 못 보는 상태는 몇 시간 안에 위급해질 수 있어요' : '소변을 전혀 못 보는 상태는 빠르게 위급해질 수 있어요');
  if (/호흡|숨/.test(text)) steps.push('목줄이나 옷을 풀고, 안아서 가슴을 압박하지 않게 옮겨 주세요');
  steps.push('출발 전 병원에 전화해 도착 예정임을 알려 주세요');
  return {
    verdict: 'emergency',
    lead: '지금 바로 동물병원으로 가세요. 밤이라면 24시 응급 동물병원으로 가세요. 말씀하신 증상은 기록을 분석하며 기다릴 상황이 아닐 수 있어요.',
    facts: p.history.map(h => ({ d: hd(h.date), t: h.title })).concat(p.meds.map(m => ({ d: '복용', t: m.name }))),
    factsTitle: '병원에 바로 보여줄 정보',
    evidence: null, unknown: null,
    next: steps
  };
}

function fallback(p) {
  return {
    verdict: 'uncertain', insufficient: true,
    lead: `이 질문에 답할 만한 ${p.name}의 기록이나 검토된 근거 자료를 찾지 못했어요. 추측으로 답하지 않을게요.`,
    facts: [], evidence: null,
    unknown: '기록이 부족해 판단할 수 없어요.',
    next: ['증상이 언제부터, 얼마나 자주인지 기록 탭에 남겨 주세요', '식욕, 활동, 배변 변화가 함께 있으면 진료를 받아 보세요', '호흡 곤란, 경련, 소변이 안 나오는 증상은 바로 병원으로 가세요']
  };
}

/* ---------- 렌더링 ---------- */
const $ = s => document.querySelector(s);
const ICON = {
  home: '<path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  chat: '<path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8z"/><path d="M9 9h6M9 12h4"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19"/><path d="M9 7h6"/>',
  ext: '<path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>'
};
const ic = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
const TABS = [['home', '홈', 'home'], ['records', '기록', 'list'], ['chat', 'AI 비서', 'chat'], ['report', '리포트', 'chart'], ['kb', '근거DB', 'book']];
const VERDICT = {
  visit: ['병원 방문 권장', 'v-visit'], watch: ['관찰 필요', 'v-watch'], uncertain: ['불확실', 'v-unc'],
  evidence: ['근거 있음', 'v-ev'], record: ['기록 기반', 'v-rec'], emergency: ['지금 병원', 'v-em'], info: ['일정', 'v-rec'], ok: ['안정', 'v-ev']
};
const badge = k => `<span class="badge ${VERDICT[k][1]}">${VERDICT[k][0]}</span>`;
const SUGS = ['요즘 물을 많이 마시는데 괜찮을까요?', '산책 후 다리를 절어요', '나비가 화장실을 자주 가요', '관절 영양제 계속 먹여도 되나요?', '다음 접종이 언제예요?', '구토를 했는데 지켜봐도 될까요?'];

function renderPets() {
  $('#pets').innerHTML = Object.values(PETS).map(p => `
    <button role="tab" class="pet pet-${p.id}" aria-selected="${p.id === state.pet}" data-pet="${p.id}">
      <span class="ava" aria-hidden="true">${p.initial}</span>
      <span class="pet-t"><b>${p.name}</b><small>${p.breed} ${p.age}세</small></span>
    </button>`).join('');
}
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, label, icon]) => `
    <button class="tab" data-tab="${id}" aria-current="${id === state.tab ? 'page' : 'false'}">${ic(icon)}<span>${label}</span></button>`).join('');
}

const footNote = '<p class="foot">작동 데모입니다. 실제 서비스에서는 AI 모델과 논문 지식DB가 서버에서 동작하며, 진단·처방을 대신하지 않습니다.</p>';

function insightCard(c, i) {
  return `<article class="ins lvl-${c.level}" style="--i:${i}">
    <div class="ins-h">${badge(c.level)}${i === 0 && c.level !== 'ok' && c.level !== 'info' ? '<span class="ins-new">먼저 알려드려요</span>' : ''}</div>
    <h3>${esc(c.title)}</h3>
    <p>${esc(c.body)}</p>
    ${c.points.length ? `<div class="ins-pts"><p class="lbl">관찰 포인트</p><ul>${c.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${c.chips.length ? `<div class="ref-recs"><p class="lbl">참고한 기록</p><div class="chips">${c.chips.map(ch => `<span class="chip"><time>${esc(ch.d)}</time>${esc(ch.t)}</span>`).join('')}</div></div>` : ''}
    ${c.ask ? `<button class="link-btn" data-ask="${esc(c.ask)}">비서에게 자세히 묻기 ${ic('arrow', 'ic sm')}</button>` : ''}
  </article>`;
}

function statTile(p, key, label, unit) {
  const t = trend(p, key), v = p.series[key][DAYS - 1];
  const diff = r0((v / t.base - 1) * 100);
  const flag = Math.abs(diff) >= 25 ? (diff > 0 ? 'up' : 'down') : '';
  return `<div class="stat ${flag}"><p>${label}</p><b class="num">${v}<small>${unit}</small></b><span class="num">평소 ${key === 'urine' ? r1(t.base) : r0(t.base)}${unit}${flag ? ` · ${diff > 0 ? '+' : ''}${diff}%` : ''}</span></div>`;
}

function alertRow(a) {
  const d = addDays(a.due);
  const when = a.daily ? a.when : `${mdw(d)} · ${a.due}일 남음`;
  return `<li class="alert ${a.done ? 'done' : ''}">
    <span class="al-k">${a.kind}</span>
    <span class="al-t"><b>${esc(a.title)}</b><small>${esc(when)}${a.sub ? ' · ' + esc(a.sub) : ''}</small></span>
    <button class="al-c" data-alert="${esc(a.title)}" aria-pressed="${a.done}" aria-label="${esc(a.title)} ${a.done ? '완료 취소' : '완료 표시'}">${ic('check')}</button>
  </li>`;
}

function homeView(p) {
  const ins = insights(p);
  const memCount = DAYS * 6 + p.history.length + p.meds.length + p.added.length;
  return `
  <section class="hello">
    <p class="date">${TODAY.getMonth() + 1}월 ${TODAY.getDate()}일 ${WD[TODAY.getDay()]}요일</p>
    <h2>${p.name}의 건강 브리핑</h2>
    <p class="mem">${p.breed} · ${p.age}세 · ${p.weight} &nbsp;|&nbsp; 기록 <b class="num">${memCount}</b>건을 기억하고 있어요</p>
  </section>
  <section class="ins-list" aria-label="선제 안내">${ins.map(insightCard).join('')}</section>
  <section class="block">
    <h3 class="sec-h">오늘 기록 <small>평소 = ${RANGE_BASE} 평균</small></h3>
    <div class="stats">
      ${statTile(p, 'water', '음수량', 'ml')}
      ${statTile(p, 'urine', '배뇨', '회')}
      ${statTile(p, 'activity', p.actLabel, '분')}
      ${statTile(p, 'food', '식사', '%')}
    </div>
  </section>
  <section class="block">
    <h3 class="sec-h">복약·접종 알림</h3>
    <ul class="alerts">${p.alerts.slice().sort((a, b) => a.due - b.due).map(alertRow).join('')}</ul>
  </section>
  ${footNote}`;
}

const REC_TYPES = [
  ['water', '음수량', 'ml', 'number'], ['urine', '배뇨 횟수', '회', 'number'], ['food', '식사량', '%', 'number'],
  ['activity', '활동 시간', '분', 'number'], ['vomit', '구토', '회', 'number'], ['stool', '배변 상태', '', 'stool'], ['memo', '컨디션 메모', '', 'text']
];
function recordsView(p) {
  const w = trend(p, 'water'), u = trend(p, 'urine');
  const daily = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const s = p.series, d = dayDate(i);
    const hiW = s.water[i] >= w.base * 1.25, hiU = s.urine[i] >= u.base * 1.3;
    const added = p.added.filter(a => a.i === i);
    daily.push(`<li class="day">
      <div class="day-d"><b class="num">${md(d)}</b><small>${WD[d.getDay()]}</small></div>
      <div class="day-b">
        <div class="kv">
          <span class="${hiW ? 'hi' : ''}">음수 <b class="num">${s.water[i]}</b>ml</span>
          <span>식사 <b class="num">${s.food[i]}</b>%</span>
          <span class="${hiU ? 'hi' : ''}">배뇨 <b class="num">${s.urine[i]}</b>회</span>
          <span>${p.actLabel} <b class="num">${s.activity[i]}</b>분</span>
          <span class="${s.stool[i] !== '정상' ? 'warn' : ''}">배변 ${esc(s.stool[i])}</span>
          ${s.vomit[i] ? `<span class="warn">구토 <b class="num">${s.vomit[i]}</b>회</span>` : ''}
          <span>컨디션 ${esc(s.cond[i])}</span>
        </div>
        ${s.memo[i] ? `<p class="memo">${esc(s.memo[i])}</p>` : ''}
        ${added.map(a => `<p class="added">${ic('plus', 'ic sm')} 방금 추가 · ${esc(a.label)}</p>`).join('')}
      </div>
    </li>`);
  }
  const med = p.history.slice().sort((a, b) => b.date - a.date).map(h => `
    <li class="hx"><span class="hx-k">${h.kind}</span><div><time class="num">${h.date.getFullYear()}.${String(h.date.getMonth() + 1).padStart(2, '0')}.${String(h.date.getDate()).padStart(2, '0')}</time><b>${esc(h.title)}</b><p>${esc(h.detail)}</p></div></li>`).join('')
    + p.meds.map(m => `<li class="hx"><span class="hx-k rx">처방·복용</span><div><time>${esc(m.since)}</time><b>${esc(m.name)}</b><p>${esc(m.dose)}</p></div></li>`).join('');
  return `
  <section class="hello"><h2>${p.name}의 건강기록</h2><p class="mem">기록을 추가하면 홈 안내와 비서 답변에 바로 반영돼요.</p></section>
  <form class="addrec" id="addForm">
    <div class="row">
      <label class="fld"><span>항목</span>
        <select id="recType">${REC_TYPES.map(t => `<option value="${t[0]}">${t[1]}</option>`).join('')}</select></label>
      <label class="fld" id="valWrap"><span id="valLabel">오늘 값 (ml)</span>
        <input id="recVal" type="number" inputmode="numeric" min="0" max="2000" placeholder="예: 240"></label>
    </div>
    <label class="fld"><span>메모 (선택)</span><input id="recMemo" type="text" maxlength="80" placeholder="예: 산책 후 물을 한 번에 많이 마심"></label>
    <button class="btn primary" type="submit">${ic('plus')} 오늘 기록에 추가</button>
  </form>
  <div class="seg" role="tablist" aria-label="기록 종류">
    <button role="tab" data-rf="daily" aria-selected="${state.recFilter === 'daily'}">일상 기록 14일</button>
    <button role="tab" data-rf="med" aria-selected="${state.recFilter === 'med'}">병원·검사·처방</button>
  </div>
  ${state.recFilter === 'daily' ? `<ul class="days">${daily.join('')}</ul>` : `<ul class="hxs">${med}</ul>`}
  ${footNote}`;
}

function refCard(id) {
  const r = REFS[id];
  return `<a class="ref" href="https://pubmed.ncbi.nlm.nih.gov/${id}/" target="_blank" rel="noopener">
    <span class="ref-lv">${r.lv}</span>
    <span class="ref-t">${esc(r.t)}</span>
    <span class="ref-m"><span>${esc(r.j)} · ${r.y}</span><span>PMID ${id} ${ic('ext', 'ic xs')}</span></span>
  </a>`;
}

function answerHTML(p, a) {
  if (a.switchTo) {
    const o = PETS[a.switchTo];
    return `<article class="ans"><div class="ans-v">${badge('record')}</div>
      <p class="lead">지금 선택된 개체는 ${p.name}예요. ${o.name}의 기록은 ${p.name}와 따로 보관하고 있어서, ${o.name}로 전환한 뒤 답해 드릴게요.</p>
      <button class="btn primary sm" data-switch="${o.id}" data-q="${esc(a.q)}">${o.name}로 전환해서 답 보기</button></article>`;
  }
  return `<article class="ans ${a.verdict === 'emergency' ? 'em' : ''}">
    <div class="ans-v">${badge(a.verdict)}${a.insufficient ? '<span class="ans-why">기록이 부족해요</span>' : ''}</div>
    <p class="lead">${esc(a.lead)}</p>
    ${a.warn ? `<p class="warnbox">${esc(a.warn)}</p>` : ''}
    ${a.facts.length ? `<section><h4>${a.factsTitle || `${p.name} 기록에서 참고한 것`}</h4><ul class="facts">${a.facts.map(f => `<li><time>${esc(f.d)}</time><span>${esc(f.t)}</span></li>`).join('')}</ul></section>` : ''}
    ${a.evidence ? `<section><h4>${badge('evidence')} 검토 승인된 자료</h4><p>${esc(a.evidence.text)}</p><div class="refs">${a.evidence.refs.map(refCard).join('')}</div></section>` : ''}
    ${a.noEvidence ? `<section><h4>근거 자료</h4><p class="muted">${esc(a.noEvidence)}</p></section>` : ''}
    ${a.unknown ? `<section><h4>${badge('uncertain')} 아직 알 수 없는 것</h4><p>${esc(a.unknown)}</p></section>` : ''}
    <section><h4>${a.verdict === 'emergency' ? '가는 동안 할 일' : '다음에 할 일'}</h4><ol class="next">${a.next.map(n => `<li>${esc(n)}</li>`).join('')}</ol></section>
  </article>`;
}

function chatView(p) {
  const intro = `<div class="msg ai intro"><p><b>${p.name}의 건강비서예요.</b> ${p.name}의 일상 기록 14일, 병원·검사 기록 ${p.history.length}건, 복용 ${p.meds.length}건을 기억하고 있어요. 답할 때는 어떤 기록을 참고했는지, 근거가 있는지 없는지를 구분해서 알려드려요.</p></div>`;
  const msgs = p.chat.map(m => m.role === 'user'
    ? `<div class="msg user"><p>${esc(m.text)}</p></div>`
    : `<div class="msg ai">${answerHTML(p, m.a)}</div>`).join('');
  return `<div class="chat" id="chat">${intro}${msgs}<div id="typing"></div></div>`;
}

function chart(values, labels, opts) {
  const W = 320, H = 132, pl = 30, pr = 18, pt = 14, pb = 22;
  const max = Math.max(...values, opts.base || 0) * 1.15, min = 0;
  const x = i => pl + (W - pl - pr) * (opts.bars ? (i + 0.5) / values.length : i / (values.length - 1));
  const y = v => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
  const grid = [0, 0.5, 1].map(f => { const v = min + (max - min) * f / 1.15; return `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${pl - 6}" y="${y(v) + 3}" class="ax" text-anchor="end">${r0(v)}</text>`; }).join('');
  const xl = labels.map((l, i) => `<text x="${x(i)}" y="${H - 6}" class="ax" text-anchor="middle">${l}</text>`).join('');
  let body = '';
  if (opts.bars) {
    const bw = (W - pl - pr) / values.length * 0.5;
    body = values.map((v, i) => `<rect x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="3" class="${opts.hi && opts.hi(v) ? 'bar hi' : 'bar'}"/>`).join('');
  } else {
    const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    body = `<polyline points="${pts}" class="ln"/>` + values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.2" class="${opts.hi && opts.hi(v) ? 'dot hi' : 'dot'}"/>`).join('');
  }
  const base = opts.base ? `<line x1="${pl}" x2="${W - pr}" y1="${y(opts.base)}" y2="${y(opts.base)}" class="base"/><text x="${W - pr}" y="${y(opts.base) - 5}" class="ax base-t" text-anchor="end">평소 ${r0(opts.base)}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(opts.label)}">${grid}${base}${body}${xl}</svg>`;
}

function weekData(p) {
  const idx = Array.from({ length: 7 }, (_, k) => DAYS - 7 + k);
  const labels = idx.map(i => md(dayDate(i)));
  const s = p.series, w = trend(p, 'water'), u = trend(p, 'urine'), a = trend(p, 'activity');
  return { idx, labels, s, w, u, a, range: `${labels[0]}–${labels[6]}` };
}

function reportView(p) {
  const d = weekData(p), s = d.s, ins = insights(p).filter(c => c.level !== 'info');
  const pick = k => d.idx.map(i => s[k][i]);
  const sec = p.species === 'cat'
    ? { k: 'urine', t: '배뇨 횟수 (회)', base: d.u.base, hi: v => v >= d.u.base * 1.3 }
    : { k: 'activity', t: `${p.actLabel} (분)`, base: d.a.base, hi: v => v <= d.a.base * 0.75 };
  const vom = d.idx.reduce((t, i) => t + s.vomit[i], 0);
  return `
  <section class="hello"><p class="date">주간 리포트 · ${d.range}</p><h2>${p.name}의 7일 요약</h2></section>
  <div class="kpis">
    <div><p>음수 평균</p><b class="num">${r0(avg(pick('water')))}<small>ml</small></b></div>
    <div><p>배뇨 평균</p><b class="num">${r1(avg(pick('urine')))}<small>회</small></b></div>
    <div><p>구토</p><b class="num">${vom}<small>회</small></b></div>
  </div>
  <section class="card"><h3 class="card-h">음수량 (ml)</h3>${chart(pick('water'), d.labels, { base: d.w.base, hi: v => v >= d.w.base * 1.25, label: '7일 음수량 그래프' })}</section>
  <section class="card"><h3 class="card-h">${sec.t}</h3>${chart(pick(sec.k), d.labels, { bars: true, base: sec.base, hi: sec.hi, label: sec.t + ' 그래프' })}</section>
  <section class="card"><h3 class="card-h">이번 주 비서 요약</h3>
    <ul class="sum">${ins.map(c => `<li>${badge(c.level)}<span>${esc(c.title)}</span></li>`).join('')}</ul>
  </section>
  <button class="btn primary wide" id="printBtn">${ic('file')} 병원용 PDF로 저장</button>
  <p class="hint">A4 한 장으로 정리돼요. 인쇄 창에서 대상을 ‘PDF로 저장’으로 선택하세요.</p>
  ${footNote}`;
}

function kbView() {
  const topics = ['전체', ...new Set(Object.values(REFS).map(r => r.topic))];
  const items = Object.entries(REFS)
    .filter(([, r]) => state.kbTopic === '전체' || r.topic === state.kbTopic)
    .sort((a, b) => (b[1].ok - a[1].ok) || LV_ORDER.indexOf(a[1].lv) - LV_ORDER.indexOf(b[1].lv) || b[1].y - a[1].y);
  const all = Object.values(REFS), ok = all.filter(r => r.ok).length;
  return `
  <section class="hello"><h2>수의학 근거DB</h2><p class="mem">비서는 이 목록에서 <b>검토 승인</b>된 자료만 답변에 인용해요.</p></section>
  <ol class="flow" aria-label="자료 처리 흐름">
    <li><b>자동 수집</b><small>매주 PubMed·지침</small></li>
    <li><b>중복 제거</b><small>같은 연구 정리</small></li>
    <li><b>수의사 검토</b><small>근거수준 표시</small></li>
    <li class="on"><b>승인분만</b><small>답변에 인용</small></li>
  </ol>
  <div class="kb-count"><span>수집 <b class="num">${all.length}</b></span><span>승인 <b class="num">${ok}</b></span><span>검토 대기 <b class="num">${all.length - ok}</b></span></div>
  <div class="chips scroll" role="tablist" aria-label="주제">${topics.map(t => `<button class="fchip" role="tab" data-kb="${t}" aria-selected="${t === state.kbTopic}">${t}</button>`).join('')}</div>
  <ul class="kb">${items.map(([id, r]) => `
    <li class="kb-i ${r.ok ? '' : 'pending'}">
      <div class="kb-top"><span class="ref-lv">${r.lv}</span><span class="st ${r.ok ? 'ok' : 'wait'}">${r.ok ? '승인' : '검토 대기'}</span></div>
      <p class="kb-t">${esc(r.t)}</p>
      <p class="kb-m"><span>${esc(r.j)}</span><span class="num">${r.y}</span><span>${r.topic}</span></p>
      ${r.ok ? '' : `<p class="kb-why">${esc(r.why)} · 답변에 사용하지 않음</p>`}
      <a href="https://pubmed.ncbi.nlm.nih.gov/${id}/" target="_blank" rel="noopener" class="kb-l">PubMed ${id} ${ic('ext', 'ic xs')}</a>
    </li>`).join('')}</ul>
  <p class="hint">목록의 서지 정보는 PubMed에서 실제 존재를 확인한 자료입니다. 데모에서는 수집·검토 상태를 고정값으로 보여줍니다.</p>
  ${footNote}`;
}

function render(focusTop = true) {
  const p = pet();
  renderPets(); renderTabs();
  document.querySelector('.phone').dataset.pet = p.id;
  const v = { home: homeView, records: recordsView, chat: chatView, report: reportView, kb: kbView }[state.tab](p);
  const scr = $('#screen');
  scr.innerHTML = v;
  scr.dataset.tab = state.tab;
  $('#composer').hidden = state.tab !== 'chat';
  if (state.tab === 'chat') {
    $('#sugs').innerHTML = SUGS.map(q => `<button class="sug" data-ask="${esc(q)}">${esc(q)}</button>`).join('');
    scr.scrollTop = scr.scrollHeight;
  } else if (focusTop) scr.scrollTop = 0;
  if (state.tab === 'records') bindRecForm();
}

/* ---------- 동작 ---------- */
let busy = false;
function ask(q) {
  if (!q.trim() || busy) return;
  const p = pet();
  if (state.tab !== 'chat') { state.tab = 'chat'; render(); }
  p.chat.push({ role: 'user', text: q.trim() });
  render();
  busy = true;
  const typing = $('#typing');
  typing.innerHTML = `<div class="msg ai typing" aria-label="답변 작성 중"><span></span><span></span><span></span><em>${p.name}의 기록과 근거DB를 확인하는 중</em></div>`;
  const scr = $('#screen'); scr.scrollTop = scr.scrollHeight;
  setTimeout(() => {
    busy = false;
    if (pet() !== p) return;
    p.chat.push({ role: 'ai', a: answer(p, q) });
    render(false);
    const last = [...document.querySelectorAll('.msg.user')].pop();
    if (last) scr.scrollTop += last.getBoundingClientRect().top - scr.getBoundingClientRect().top - 12;
  }, 700);
}

function bindRecForm() {
  const sel = $('#recType'), val = $('#recVal'), wrap = $('#valWrap'), lab = $('#valLabel');
  const sync = () => {
    const t = REC_TYPES.find(x => x[0] === sel.value);
    wrap.hidden = t[3] === 'text';
    if (t[3] === 'stool') { val.type = 'text'; val.placeholder = '정상 / 무름 / 설사 / 딱딱함'; lab.textContent = '오늘 상태'; val.removeAttribute('inputmode'); }
    else if (t[3] === 'number') { val.type = 'number'; val.setAttribute('inputmode', 'numeric'); lab.textContent = t[0] === 'vomit' ? '오늘 추가 횟수 (회)' : `오늘 값 (${t[2]})`; val.placeholder = { water: '예: 240', urine: '예: 4', food: '예: 80', activity: '예: 30', vomit: '예: 1' }[t[0]]; }
    val.value = '';
  };
  sel.addEventListener('change', sync); sync();
  $('#addForm').addEventListener('submit', e => {
    e.preventDefault();
    const p = pet(), t = REC_TYPES.find(x => x[0] === sel.value), i = DAYS - 1;
    const memo = $('#recMemo').value.trim();
    let raw = val.value.trim(), label;
    if (t[3] === 'number') {
      const n = Number(raw);
      if (raw === '' || !Number.isFinite(n) || n < 0 || n > 2000) { toast('숫자를 0–2000 사이로 입력해 주세요'); val.focus(); return; }
      if (t[0] === 'vomit') p.series.vomit[i] += Math.max(1, r0(n)); else p.series[t[0]][i] = r0(n);
      label = `${t[1]} ${r0(n)}${t[2]}`;
    } else if (t[3] === 'stool') {
      if (!raw) { toast('배변 상태를 적어 주세요'); val.focus(); return; }
      p.series.stool[i] = raw.slice(0, 10); label = `배변 ${raw.slice(0, 10)}`;
    } else {
      if (!memo) { toast('메모를 적어 주세요'); $('#recMemo').focus(); return; }
      label = '메모';
    }
    if (memo) p.series.memo[i] = p.series.memo[i] ? `${p.series.memo[i]} / ${memo}` : memo;
    p.added.push({ i, label: memo && t[3] !== 'text' ? `${label} · ${memo}` : (t[3] === 'text' ? memo : label) });
    toast(`${p.name} 오늘 기록에 추가했어요. 홈 안내와 비서 답변에 반영됩니다`);
    state.recFilter = 'daily';
    render();
  });
}

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

function buildPrint(p) {
  const d = weekData(p), s = d.s;
  const ins = insights(p).filter(c => c.level !== 'info' && c.level !== 'ok');
  const rows = [['음수량 (ml)', 'water'], ['식사량 (%)', 'food'], ['배뇨 (회)', 'urine'], [`${p.actLabel} (분)`, 'activity'], ['구토 (회)', 'vomit'], ['배변', 'stool'], ['컨디션', 'cond']];
  const memos = d.idx.filter(i => s.memo[i]).map(i => `<li><b>${md(dayDate(i))}</b> ${esc(s.memo[i])}</li>`).join('');
  $('#printSheet').innerHTML = `
    <header class="ps-h"><div><p class="ps-k">보호자 제출용 건강 요약</p><h1>${p.name} <small>${p.species === 'dog' ? '개' : '고양이'} · ${p.breed} · ${p.age}세 · ${p.sex} · ${p.weight}</small></h1></div>
      <p class="ps-d">기간 ${TODAY.getFullYear()}.${d.range}<br>작성 ${TODAY.getFullYear()}.${md(TODAY)}</p></header>
    <section class="ps-2">
      <div><h2>과거 병력·검사</h2><ul>${p.history.map(h => `<li><b>${h.date.getFullYear()}.${md(h.date)}</b> ${esc(h.title)}<br><span>${esc(h.detail)}</span></li>`).join('')}</ul></div>
      <div><h2>복용·급여 중</h2><ul>${p.meds.map(m => `<li><b>${esc(m.name)}</b><br><span>${esc(m.dose)} · ${esc(m.since)}</span></li>`).join('')}</ul></div>
    </section>
    <section><h2>최근 7일 기록</h2>
      <table><thead><tr><th></th>${d.labels.map(l => `<th>${l}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(([lab, k]) => `<tr><th>${lab}</th>${d.idx.map(i => `<td>${esc(s[k][i])}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <p class="ps-n">평소 음수량 ${r0(d.w.base)}ml, 평소 배뇨 ${r1(d.u.base)}회 (${RANGE_BASE} 평균)</p>
    </section>
    ${memos ? `<section><h2>보호자 메모</h2><ul class="ps-m">${memos}</ul></section>` : ''}
    <section><h2>비서가 표시한 관찰 사항 <small>진단이 아닌 기록 기반 알림</small></h2>
      <ul>${ins.length ? ins.map(c => `<li><b>[${VERDICT[c.level][0]}]</b> ${esc(c.title)} — ${esc(c.body)}</li>`).join('') : '<li>특이 변화 없음</li>'}</ul></section>
    <section class="ps-q"><h2>진료 때 여쭤볼 것</h2><div class="lines"><span></span><span></span><span></span></div></section>
    <footer class="ps-f">작동 데모에서 생성된 문서입니다. 보호자가 입력한 기록을 정리한 것으로, 진단·처방을 대신하지 않습니다.</footer>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('button, [data-ask]');
  if (!b) return;
  if (b.dataset.pet && b.dataset.pet !== state.pet) { state.pet = b.dataset.pet; render(); toast(`${pet().name}의 기록으로 전환했어요`); return; }
  if (b.dataset.tab) { state.tab = b.dataset.tab; render(); return; }
  if (b.dataset.switch) { state.pet = b.dataset.switch; state.tab = 'chat'; render(); ask(b.dataset.q); return; }
  if (b.dataset.ask) { ask(b.dataset.ask); return; }
  if (b.dataset.rf) { state.recFilter = b.dataset.rf; render(false); return; }
  if (b.dataset.kb) { state.kbTopic = b.dataset.kb; render(false); return; }
  if (b.dataset.alert) {
    const a = pet().alerts.find(x => x.title === b.dataset.alert); a.done = !a.done;
    render(false); toast(a.done ? `${a.title} 완료로 표시했어요` : '완료 표시를 취소했어요'); return;
  }
  if (b.id === 'printBtn') { buildPrint(pet()); window.print(); }
});
$('#askForm').addEventListener('submit', e => {
  e.preventDefault();
  const inp = $('#askInput'); const q = inp.value; inp.value = ''; ask(q);
});

render();
