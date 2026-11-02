'use strict';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 탭 ---------- */
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); });
  document.querySelectorAll('.panel').forEach(p => { p.hidden = p.id !== t.dataset.tab; });
  window.scrollTo({ top: 0 });
}));

/* =========================================================
   1. 수강증 자동 인증
   ========================================================= */
const CUR_MONTH = '2026-11';
const ME = 'me***';
const FIELDS = [['name', '이름'], ['level', '레벨'], ['track', '트랙(요일)'], ['time', '수강시간'], ['month', '수강월'], ['mode', '온라인/현장']];
const MATCH_KEYS = ['level', 'track', 'time', 'mode'];

const OPEN = [
  { id: 'M07', label: '월수금 07시 · 과정A LC', level: '중급 (750+)', track: '월수금', time: '07:00–08:00', mode: '현장' },
  { id: 'M08', label: '월수금 08시 · 과정A RC', level: '중급 (750+)', track: '월수금', time: '08:00–09:00', mode: '현장' },
  { id: 'M120', label: '월수금 07–09시 · 120분 반', level: '중급 (750+)', track: '월수금', time: '07:00–09:00', mode: '현장', kids: ['M07', 'M08'] },
  { id: 'T19', label: '화목금 19시 · 과정B LC', level: '고급 (850+)', track: '화목금', time: '19:00–20:00', mode: '온라인' },
  { id: 'T20', label: '화목금 20시 · 과정B RC', level: '고급 (850+)', track: '화목금', time: '20:00–21:00', mode: '온라인' },
  { id: 'T120', label: '화목금 19–21시 · 120분 반', level: '고급 (850+)', track: '화목금', time: '19:00–21:00', mode: '온라인', kids: ['T19', 'T20'] },
];

// 시연용 미리 정한 판독 결과 (실제: 서버 자체 OCR)
const CERTS = [
  { id: 'c1', title: '정상 · 이번 달', expect: 'approve', no: 'NR-2611-0381', capture: '2026.11.01 21:14:08',
    read: { name: '김하늘', level: '중급 (750+)', track: '월수금', time: '07:00–09:00', month: '2026-11', mode: '현장' },
    conf: { name: .99, level: .97, track: .98, time: .96, month: .99, mode: .97 } },
  { id: 'c2', title: '지난달 수강증', expect: 'reject', no: 'NR-2610-0127', capture: '2026.10.02 08:41:55',
    read: { name: '박서준', level: '중급 (750+)', track: '월수금', time: '07:00–08:00', month: '2026-10', mode: '현장' },
    conf: { name: .98, level: .95, track: .97, time: .97, month: .99, mode: .96 } },
  { id: 'c3', title: '다음 달 수강증', expect: 'hold', no: 'NR-2612-0044', capture: '2026.11.01 23:02:31',
    read: { name: '이유진', level: '고급 (850+)', track: '화목금', time: '19:00–20:00', month: '2026-12', mode: '온라인' },
    conf: { name: .99, level: .96, track: .98, time: .95, month: .98, mode: .97 } },
  { id: 'c4', title: '다른 계정과 같은 파일', expect: 'review', no: 'NR-2611-0219', capture: '2026.10.31 19:27:03',
    read: { name: '최민호', level: '중급 (750+)', track: '월수금', time: '08:00–09:00', month: '2026-11', mode: '현장' },
    conf: { name: .98, level: .97, track: .97, time: .96, month: .99, mode: .96 }, otherAcct: 'sky***' },
];
const EXPECT_LABEL = { approve: '자동 승인', reject: '거절', hold: '보관', review: '관리자 검토' };

const hashSeen = new Map();     // 파일 해시 → 제출 계정
const captureSeen = new Map();  // 캡처 시각 → 제출 계정
const monthLabel = m => `${m.slice(0, 4)}년 ${+m.slice(5)}월`;

function drawCert(c) {
  const cv = document.createElement('canvas');
  const W = 480, H = 640; cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const F = '"Pretendard Variable", "Malgun Gothic", sans-serif';
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  // 휴대폰 상태바 + 주소창 (캡처 느낌)
  g.fillStyle = '#111'; g.font = `600 15px ${F}`; g.fillText(c.capture.slice(11, 16), 22, 22);
  g.strokeStyle = '#111'; g.lineWidth = 1.5; g.strokeRect(W - 46, 10, 24, 12); g.fillRect(W - 44, 12, 16, 8); g.fillRect(W - 21, 14, 2, 4);
  g.fillStyle = '#f1f3f5'; round(g, 16, 34, W - 32, 30, 15); g.fill();
  g.fillStyle = '#868e96'; g.font = `13px ${F}`; g.fillText('academy-hq.example/mypage/certificate', 34, 54);
  // 헤더
  g.fillStyle = '#1e3a8a'; g.fillRect(0, 76, W, 86);
  g.fillStyle = '#fff'; g.font = `700 24px ${F}`; g.fillText('누리어학원 수강증', 28, 118);
  g.font = `14px ${F}`; g.fillStyle = '#c7d2fe'; g.fillText('본사 마이페이지 · 수강 확인서 (가상)', 28, 144);
  // 항목
  const rows = [['수강생', c.read.name], ['레벨', c.read.level], ['수강 요일', c.read.track + (c.read.track === '월수금' ? ' (월·수·금)' : ' (화·목·금)')],
    ['수강 시간', c.read.time], ['수강월', monthLabel(c.read.month)], ['수강 형태', c.read.mode], ['수강증 번호', c.no]];
  let y = 200;
  rows.forEach(([k, v]) => {
    g.fillStyle = '#868e96'; g.font = `15px ${F}`; g.fillText(k, 28, y);
    g.fillStyle = '#212529'; g.font = `600 19px ${F}`; g.fillText(v, 150, y);
    g.strokeStyle = '#f1f3f5'; g.lineWidth = 1; g.beginPath(); g.moveTo(28, y + 18); g.lineTo(W - 28, y + 18); g.stroke();
    y += 50;
  });
  // 직인
  g.save(); g.translate(W - 90, H - 92); g.rotate(-.18);
  g.strokeStyle = 'rgba(220,38,38,.75)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(220,38,38,.8)'; g.font = `700 15px ${F}`; g.textAlign = 'center'; g.fillText('누리어학원', 0, -2); g.fillText('수강확인', 0, 18);
  g.restore();
  g.fillStyle = '#adb5bd'; g.font = `13px ${F}`; g.fillText('발급 ' + c.capture.slice(0, 10) + ' · 본 화면은 시연용 가상 수강증입니다', 28, H - 26);
  return cv;
}
function round(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }

async function sha256(buf) {
  if (crypto.subtle) {
    const d = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0x811c9dc5; for (const b of new Uint8Array(buf)) h = Math.imul(h ^ b, 16777619) >>> 0; // ponytail: 비보안 컨텍스트 폴백(FNV), 실제는 서버 SHA-256
  return h.toString(16).padStart(8, '0');
}
const canvasHash = cv => new Promise(r => cv.toBlob(b => b.arrayBuffer().then(sha256).then(r), 'image/png'));

let ready;
async function initCerts() {
  await (document.fonts ? document.fonts.ready : Promise.resolve());
  const box = $('#samples');
  const jobs = CERTS.map(async c => {
    const cv = drawCert(c);
    const btn = document.createElement('button');
    btn.className = 'sample'; btn.dataset.cert = c.id;
    btn.innerHTML = `<img alt="${esc(c.title)} 가상 수강증" src="${cv.toDataURL('image/png')}"><span class="exp k-${c.expect}">${EXPECT_LABEL[c.expect]} 예상</span><b>${esc(c.title)}</b><small>${esc(c.read.name)} · ${monthLabel(c.read.month)} · ${esc(c.read.track)}</small>`;
    btn.addEventListener('click', () => runCert(c));
    box.appendChild(btn);
    c.hash = await canvasHash(cv);
    if (c.otherAcct) { hashSeen.set(c.hash, c.otherAcct + ' (10/31 제출)'); captureSeen.set(c.capture, c.otherAcct); }
  });
  await Promise.all(jobs);
}

function renderOpen() {
  $('#openTbl').innerHTML = `<tr><th>반</th><th>레벨</th><th>시간</th><th>형태</th></tr>` +
    OPEN.map(o => `<tr><td><b>${esc(o.label)}</b></td><td>${esc(o.level)}</td><td>${o.time}</td><td>${o.mode}</td></tr>`).join('');
}

function decide(c) {
  const r = c.read;
  const matches = OPEN.filter(o => MATCH_KEYS.every(k => o[k] === r[k]));
  const minConf = Math.min(...Object.values(c.conf));
  const dupHash = hashSeen.get(c.hash);
  const dupCap = captureSeen.get(c.capture);
  const otherHash = dupHash && !dupHash.startsWith(ME) ? dupHash : null;
  const otherCap = dupCap && dupCap !== ME ? dupCap : null;
  let kind, title, why;
  if ($('#kill').checked) {
    kind = 'review'; title = '관리자 검토로 이동';
    why = '긴급 정지 스위치가 켜져 있어 자동 판정을 멈추고 모든 수강증을 관리자 검토 대기열로 보냈습니다.';
  } else if (otherHash || otherCap) {
    kind = 'review'; title = '위조 의심 · 관리자 검토';
    why = [otherHash && `같은 파일(해시 일치)이 다른 계정 ${otherHash}에서 이미 제출됨`, otherCap && `캡처 시각(${c.capture})이 다른 계정 제출본과 동일`].filter(Boolean).join(' · ') + '. 자동 승인하지 않고 검토로 넘깁니다.';
  } else if (minConf < .85) {
    kind = 'review'; title = '관리자 검토로 이동';
    why = `판독 신뢰도 ${Math.round(minConf * 100)}%로 기준(85%)에 못 미쳐 사람이 확인합니다.`;
  } else if (r.month < CUR_MONTH) {
    kind = 'reject'; title = '거절 · 지난달 수강증';
    why = `${monthLabel(r.month)} 수강증입니다. 이번 달(${monthLabel(CUR_MONTH)}) 수강증을 다시 올려 주세요. (학생에게 사유와 함께 알림 발송)`;
  } else if (r.month > CUR_MONTH) {
    kind = 'hold'; title = '보관 · 다음 달 자동 배정 대기';
    why = `${monthLabel(r.month)} 수강증이라 보관했습니다. ${monthLabel(r.month)} 반이 열리면 ${r.track} ${r.time} 반으로 자동 배정됩니다.`;
  } else if (matches.length === 1) {
    const m = matches[0];
    kind = 'approve'; title = '자동 승인 · 반 배정 완료';
    why = `${m.label}에 배정했습니다.` + (m.kids ? ` 120분 반이라 안의 60분 반(${m.kids.map(k => OPEN.find(o => o.id === k).label).join(', ')}) 자료도 자동으로 열립니다.` : '');
  } else {
    kind = 'review'; title = '관리자 검토로 이동';
    why = matches.length ? `조건이 맞는 반이 ${matches.length}개라 자동으로 고를 수 없습니다.` : '읽어낸 레벨·트랙·시간·형태와 정확히 맞는 열린 반이 없습니다.';
  }
  return { kind, title, why, matches };
}

let busy = false;
async function runCert(c) {
  if (busy) return; busy = true;
  await ready;
  const dlg = $('#dlg'), body = $('#dlgBody');
  const steps = ['이미지 수신 · 파일 해시 계산', '서버 OCR 판독 (자체 엔진)', '이름·레벨·트랙·시간·수강월·형태 추출', '중복 제출 · 위조 의심 확인', '열린 반과 대조'];
  body.innerHTML = `<h3>판별 중…</h3><p class="sub">${esc(c.title)}</p><ul class="steps">${steps.map(s => `<li><i></i>${s}</li>`).join('')}</ul>`;
  if (!dlg.open) dlg.showModal();
  const lis = body.querySelectorAll('.steps li');
  for (const li of lis) { li.className = 'run'; await sleep(340); li.className = 'done'; }
  await sleep(150);

  const d = decide(c);
  if (!hashSeen.has(c.hash)) hashSeen.set(c.hash, ME);
  if (c.id !== 'up' && !captureSeen.has(c.capture)) captureSeen.set(c.capture, ME);

  const fieldRows = FIELDS.map(([k, l]) => {
    const p = Math.round(c.conf[k] * 100);
    const v = k === 'month' && /^\d{4}-\d{2}$/.test(c.read[k]) ? monthLabel(c.read[k]) : c.read[k];
    return `<tr><td>${l}</td><td><b>${esc(v)}</b></td><td><span class="conf"><span class="bar"><i class="${p < 85 ? 'low' : ''}" style="width:${p}%"></i></span>${p}%</span></td></tr>`;
  }).join('');
  const cmpRows = OPEN.map(o => {
    const hit = d.matches.includes(o);
    return `<tr class="${hit && c.read.month === CUR_MONTH ? 'hit' : ''}"><td>${esc(o.label)}</td>${MATCH_KEYS.map(k => `<td class="${o[k] === c.read[k] ? 'y' : 'n'}">${o[k] === c.read[k] ? '일치' : '—'}</td>`).join('')}</tr>`;
  }).join('');

  body.innerHTML = `
    <div class="verdict v-${d.kind}" data-kind="${d.kind}">
      <div class="vk">판정 결과</div><div class="vt">${esc(d.title)}</div><p>${esc(d.why)}</p>
    </div>
    <h4>읽어낸 항목</h4>
    <div class="tbl-wrap"><table class="tbl"><tr><th>항목</th><th>판독값</th><th>신뢰도</th></tr>${fieldRows}</table></div>
    <h4>열린 반 대조 (${monthLabel(CUR_MONTH)})</h4>
    <div class="tbl-wrap"><table class="tbl"><tr><th>반</th><th>레벨</th><th>트랙</th><th>시간</th><th>형태</th></tr>${cmpRows}</table></div>
    <p class="meta">파일 해시 ${c.hash.slice(0, 24)}… · 캡처 시각 ${esc(c.capture)}</p>
    <p class="hint">시연용 판독값입니다. 실제는 서버에서 PaddleOCR 등 자체 OCR을 실행하며, 개인정보라 외부 OCR API를 쓰지 않습니다.</p>
    <div class="dlg-foot"><button class="btn primary" id="dlgClose">확인</button></div>`;
  $('#dlgClose').addEventListener('click', () => dlg.close());
  addLog(c, d);
  busy = false;
}

function addLog(c, d) {
  const log = $('#log');
  $('.empty', log)?.remove();
  const li = document.createElement('li');
  const now = new Date();
  li.innerHTML = `<span class="exp k-${d.kind}">${EXPECT_LABEL[d.kind]}</span>${esc(c.read.name)} · ${esc(c.title)}<span class="t">${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}</span>`;
  log.prepend(li);
}

$('#file').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  const hash = await sha256(await f.arrayBuffer());
  e.target.value = '';
  runCert({
    id: 'up', title: '직접 올린 이미지 · ' + f.name, hash, capture: '읽지 못함',
    read: { name: '판독 불가', level: '판독 불가', track: '판독 불가', time: '판독 불가', month: '판독 불가', mode: '판독 불가' },
    conf: { name: .41, level: .38, track: .44, time: .36, month: .47, mode: .40 },
  });
});

/* =========================================================
   2. 수업 달력
   ========================================================= */
const TRACK_NAME = { MWF: '월수금', TTF: '화목금', SP: '특강' };
const SLOTS = [
  { t: '07:00–08:00', MWF: ['A', 'LC'], TTF: ['A', 'RC'], pack: '07–09시 120분 반' },
  { t: '08:00–09:00', MWF: ['A', 'RC'], TTF: ['A', 'LC'], pack: '07–09시 120분 반' },
  { t: '12:00–13:00', MWF: ['B', 'LC'], TTF: ['B', 'RC'], pack: '—' },
  { t: '19:00–20:00', MWF: ['B', 'RC'], TTF: ['B', 'LC'], pack: '19–21시 120분 반' },
  { t: '20:00–21:00', MWF: ['B', 'LC'], TTF: ['B', 'RC'], pack: '19–21시 120분 반' },
];
const cal = { y: 2026, m: 10, days: {}, swap: false };
let brush = 'MWF';

function genMonth(y, m, firstFri) {
  const days = {}, n = new Date(y, m + 1, 0).getDate();
  let fri = firstFri;
  for (let d = 1; d <= n; d++) {
    const w = new Date(y, m, d).getDay();
    if (w === 1 || w === 3) days[d] = 'MWF';
    else if (w === 2 || w === 4) days[d] = 'TTF';
    else if (w === 5) { days[d] = fri; fri = fri === 'MWF' ? 'TTF' : 'MWF'; }
  }
  return days;
}
cal.days = genMonth(2026, 10, 'MWF');
cal.days[21] = 'SP'; // 11/21(토) 특강 예시

function renderCal() {
  const { y, m, days } = cal;
  $('#calTitle').textContent = `${y}년 ${m + 1}월`;
  const first = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
  let h = ['일', '월', '화', '수', '목', '금', '토'].map((d, i) => `<div class="dow${i ? '' : ' sun'}">${d}</div>`).join('');
  h += '<div class="day blank"></div>'.repeat(first);
  for (let d = 1; d <= n; d++) {
    const w = (first + d - 1) % 7, v = days[d];
    h += `<button class="day${w === 0 ? ' sun' : ''}${w === 5 ? ' fri-x' : ''}" data-d="${d}" aria-label="${m + 1}월 ${d}일 ${v ? TRACK_NAME[v] : '수업 없음'}"><span class="d">${d}</span>${v ? `<span class="chip ${v}">${TRACK_NAME[v]}</span>` : ''}</button>`;
  }
  $('#calGrid').innerHTML = h;
  const cnt = k => Object.values(days).filter(v => v === k).length;
  const fris = Object.keys(days).filter(d => new Date(y, m, d).getDay() === 5 && days[d] !== 'SP').map(d => `${d}일 ${TRACK_NAME[days[d]] || '없음'}`);
  $('#calStats').innerHTML = `
    <div class="stat"><b>${cnt('MWF')}일</b>월수금 트랙</div>
    <div class="stat"><b>${cnt('TTF')}일</b>화목금 트랙</div>
    <div class="stat"><b>${cnt('MWF') + cnt('TTF')}일</b>주5일반 (학생에겐 "주5일" 하나로 표시)</div>
    <div class="stat"><b>${cnt('SP')}일</b>특강</div>
    <div class="stat" style="flex-basis:100%"><b style="font-size:14px">금요일 격주 교차</b>${fris.join(' → ') || '지정 없음'}</div>`;
  renderSlots();
}
function renderSlots(flash) {
  const ab = x => cal.swap ? (x === 'A' ? 'B' : 'A') : x;
  $('#abBadge').textContent = `${cal.m + 1}월 · ${cal.swap ? 'A/B 교대 적용' : 'A/B 기본'}`;
  $('#slotTbl').innerHTML = `<tr><th>시간대</th><th>월수금</th><th>화목금</th><th>120분 묶음</th></tr>` + SLOTS.map(s =>
    `<tr class="${flash ? 'flash' : ''}"><td><b>${s.t}</b></td>${['MWF', 'TTF'].map(k => `<td><span class="ab ${ab(s[k][0])}">${ab(s[k][0])}</span>${s[k][1]}</td>`).join('')}<td>${s.pack}</td></tr>`).join('');
}
$('#calGrid').addEventListener('click', e => {
  const b = e.target.closest('.day[data-d]'); if (!b) return;
  if (brush) cal.days[b.dataset.d] = brush; else delete cal.days[b.dataset.d];
  renderCal();
});
$('#brushes').addEventListener('click', e => {
  const b = e.target.closest('.brush'); if (!b) return;
  brush = b.dataset.b;
  document.querySelectorAll('.brush').forEach(x => x.classList.toggle('on', x === b));
});
$('#nextMonth').addEventListener('click', () => {
  const { y, m, days } = cal;
  const lastFri = Object.keys(days).map(Number).filter(d => new Date(y, m, d).getDay() === 5 && (days[d] === 'MWF' || days[d] === 'TTF')).pop();
  const nextFri = lastFri && days[lastFri] === 'MWF' ? 'TTF' : 'MWF';
  const nd = new Date(y, m + 1, 1);
  Object.assign(cal, { y: nd.getFullYear(), m: nd.getMonth(), days: genMonth(nd.getFullYear(), nd.getMonth(), nextFri), swap: !cal.swap });
  renderCal(); renderSlots(true);
});

/* =========================================================
   3. 권한 시뮬레이터
   ========================================================= */
const CLASSES = [
  { id: 'C1', name: '월수금 07시 · 과정A LC (60분)', start: '2026-11-02', end: '2026-11-27', teacher: '강도윤', items: ['Part 2 질의응답 패턴 30선 (영상)', 'LC 받아쓰기 Day 1–12', '주간 모의 LC'] },
  { id: 'C2', name: '월수금 08시 · 과정A RC (60분)', start: '2026-11-02', end: '2026-11-27', teacher: '강도윤', items: ['Part 5 문법 핵심 40제', 'RC 어휘 퀴즈', '주간 모의 RC'] },
  { id: 'C3', name: '월수금 07–09시 · 120분 반', start: '2026-11-02', end: '2026-11-27', teacher: '강도윤', kids: ['C1', 'C2'], items: ['120분 반 전용 실전 모의고사 2회', '오답 클리닉 영상'] },
  { id: 'C4', name: '화목금 19시 · 과정B LC (60분)', start: '2026-11-03', end: '2026-11-27', teacher: '윤서진', items: ['Part 3·4 패러프레이징', 'LC 쉐도잉 세트'] },
];
const STUDENTS = [
  { name: '김하늘', cls: 'C3', phone: '010-****-2041', level: '중급 750', att: '92%', cert: '자동 승인' },
  { name: '최유나', cls: 'C3', phone: '010-****-7712', level: '중급 780', att: '88%', cert: '자동 승인' },
  { name: '박서준', cls: 'C1', phone: '010-****-3390', level: '중급 720', att: '95%', cert: '관리자 승인' },
  { name: '이도현', cls: 'C2', phone: '010-****-5128', level: '중급 760', att: '81%', cert: '자동 승인' },
  { name: '정민재', cls: 'C4', phone: '010-****-6604', level: '고급 870', att: '90%', cert: '자동 승인' },
  { name: '한소율', cls: 'C4', phone: '010-****-1957', level: '고급 890', att: '97%', cert: '자동 승인' },
];
const COLS = [['name', '이름'], ['cls', '반'], ['phone', '연락처'], ['level', '레벨'], ['att', '출석률'], ['cert', '수강증']];
const ROLE = {
  student: { label: '학생', who: '김하늘', mine: ['C3'] },
  ta: { label: '조교', who: '오세린 조교', mine: ['C1', 'C2', 'C3'] },
  teacher: { label: '강사', who: '강도윤 강사', mine: ['C1', 'C2', 'C3'] },
  admin: { label: '관리자', who: '운영 관리자', mine: CLASSES.map(c => c.id) },
};
let role = 'student';
const BASE = new Date(2026, 9, 26);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const md = s => `${+s.slice(5, 7)}/${+s.slice(8)}`;
const statusOf = (c, today) => today < c.start ? 'pre' : today > c.end ? 'end' : 'live';
const ST_LABEL = { pre: '개강 전', live: '수강 중', end: '종강' };

function renderPerm() {
  const d = new Date(BASE); d.setDate(d.getDate() + +$('#day').value);
  const today = iso(d);
  $('#dayLabel').textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`;
  const R = ROLE[role];
  // 접근 가능한 반: 배정 반 + (120분 반이면) 안의 60분 반
  const access = [];
  R.mine.forEach(id => { const c = CLASSES.find(x => x.id === id); access.push({ c }); (c.kids || []).forEach(k => role === 'student' && access.push({ c: CLASSES.find(x => x.id === k), via: c })); });

  const c3 = CLASSES[2], st = statusOf(c3, today);
  $('#who').innerHTML = role === 'student'
    ? `<b>김하늘</b> · 현재 등급 <b>${{ pre: '예비수강생', live: '수강생', end: '수료생' }[st]}</b> · 120분 반 배정 (반 기간 ${md(c3.start)}~${md(c3.end)}). ${st === 'end' ? '종강 다음 날부터 수업 자료가 자동으로 닫혔습니다.' : st === 'pre' ? '개강일에 자동으로 열립니다.' : '120분 반이라 안의 60분 반 자료도 함께 보입니다.'}`
    : `<b>${R.who}</b> · ${R.label} · ${role === 'admin' ? '전체 반' : '담당 반 ' + R.mine.join('·')} ${role === 'ta' ? '· 학생 정보는 이름만 받습니다.' : '· 기간과 관계없이 담당 반 자료를 관리합니다.'}`;

  $('#classList').innerHTML = access.map(({ c, via }) => {
    const s = statusOf(c, today);
    const blocked = role === 'student' && s !== 'live';
    const tag = via ? `<span class="st inc">120분 반 포함</span>` : '';
    return `<div class="cls${blocked ? ' blocked' : ''}" data-cls="${c.id}" data-open="${!blocked}">
      <div class="cls-h"><b>${esc(c.name)}</b><span class="st ${s}">${ST_LABEL[s]}</span>${tag}</div>
      ${blocked
        ? `<p class="why ${s}">${s === 'pre' ? `${md(c.start)} 개강일에 자동으로 열립니다.` : `종강(${md(c.end)}) 다음 날부터 자동 차단되었습니다.`}</p>`
        : `<ul>${c.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`}
    </div>`;
  }).join('');

  const rows = role === 'student' ? STUDENTS.filter(s => s.name === '김하늘')
    : STUDENTS.filter(s => R.mine.includes(s.cls));
  const shown = k => role !== 'ta' || k === 'name';
  $('#stuTbl').innerHTML = `<tr>${COLS.map(([k, l]) => `<th class="${shown(k) ? '' : 'lock'}">${l}</th>`).join('')}</tr>` +
    rows.map(s => `<tr>${COLS.map(([k]) => shown(k) ? `<td>${esc(s[k])}</td>` : `<td class="lock">없음</td>`).join('')}</tr>`).join('');
  $('#stuHint').textContent = {
    student: '학생은 본인 행만 조회됩니다 (다른 학생 행은 정책에서 걸러짐).',
    ta: '조교에게는 이름 열만 있는 뷰가 열려 있어, 연락처·레벨 등은 API 응답에 아예 담기지 않습니다.',
    teacher: '강사는 담당 반 학생의 정보를 모두 봅니다.',
    admin: '관리자는 전체 반·전체 학생을 봅니다.',
  }[role];
}
$('#roles').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  role = b.dataset.r;
  document.querySelectorAll('#roles button').forEach(x => x.classList.toggle('on', x === b));
  renderPerm();
});
$('#day').addEventListener('input', renderPerm);

/* ---------- 시작 ---------- */
renderOpen(); renderCal(); renderPerm();
ready = initCerts();
