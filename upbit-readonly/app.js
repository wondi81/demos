// 제안용 데모: 모든 출력은 가상 데이터. 네트워크 호출 없음.
const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 설정 단계 + 터미널 ---------- */
const P = '<span class="p">root@vps:~#</span> ';
const STEPS = [
  { t: '자산조회 권한만 켜기', d: '업비트 Open API 관리 화면에서 키 발급', who: 'client', title: '업비트 Open API 관리 (고객님 화면)',
    lines: [
      '<span class="c"># 업비트 > 마이페이지 > Open API 관리 > 키 발급</span>',
      '',
      '권한 선택',
      '  <span class="ok">[v] 자산조회</span>',
      '  [ ] 주문조회   [ ] 주문하기',
      '  [ ] 출금조회   [ ] 출금하기',
      '  [ ] 입금조회   [ ] 입금하기',
      '',
      '<span class="c"># 자산조회 하나만 켭니다. 주문·출금 권한이 없으면</span>',
      '<span class="c"># 키가 새어도 거래나 출금에 쓸 수 없습니다.</span>',
      '<span class="c"># 발급 화면의 만료일을 문서에 적어 둡니다.</span>'
    ] },
  { t: '허용 IP 등록', d: '서버 공인 IP 1개만 허용', who: 'us', title: 'root@vps — 공인 IP 확인',
    lines: [
      P + 'upbit-ro ip',
      '서버 공인 IP: <span class="ok">207.148.x.x</span>  (VPS 고정 IP와 일치)',
      '',
      '<span class="c"># 이 주소 하나만 업비트 허용 IP에 등록합니다.</span>',
      '<span class="c"># 키 하나에 최대 10개까지 등록되지만 1개면 충분합니다.</span>',
      '<span class="c"># 다른 곳에서 키를 써도 업비트가 거부합니다.</span>'
    ] },
  { t: '비밀키 입력 (숨김)', d: '고객님이 명령어 한 줄로 직접 입력', who: 'client', title: 'root@vps — 키 입력 (고객님 직접)',
    lines: [
      P + 'sudo upbit-ro set-key',
      'Access Key: <span class="c">AbCd••••••••••••••••••••••••••7xQ</span>',
      'Secret Key (입력해도 화면에 보이지 않습니다): ',
      '<span class="c">  … 입력 완료</span>',
      '',
      '<span class="ok">저장</span> /etc/upbit-readonly/keys.env',
      '     소유자 root:root · 권한 600 (root만 읽기)',
      '     셸 기록(history)·로그에 남지 않음',
      '',
      '<span class="c"># 키 원문은 이 파일 한 곳에만 있습니다.</span>',
      '<span class="c"># 저희는 이 파일을 열지 않고 시험만 돌립니다.</span>'
    ] },
  { t: '연결 시험', d: '인증 호출·권한 범위·만료일 확인', who: 'us', title: 'root@vps — 연결 시험',
    lines: [
      P + 'sudo upbit-ro check --verbose',
      '[1/5] 잔고 조회 /v1/accounts → <span class="ok">200 OK</span>',
      '      KRW  1,250,000    <span class="c">(가상)</span>',
      '      BTC  0.01230000   <span class="c">(가상)</span>',
      '      ETH  0.41000000   <span class="c">(가상)</span>',
      '[2/5] 권한 범위: 주문 조회 → <span class="ok">거부됨 = 정상</span>',
      '[3/5] 서버 IP → <span class="ok">등록 IP와 일치</span>',
      '[4/5] 키 만료일 /v1/api_keys → <span class="ok">D-312</span>',
      '[5/5] 서버 시계 NTP → <span class="ok">동기화됨</span>',
      '',
      '<span class="ok">통과 5/5</span> · 키 원문은 출력하지 않습니다'
    ] },
  { t: '매일 자동 점검', d: 'systemd 타이머 + 실패 시 알림', who: 'us', title: 'root@vps — 상시 점검',
    lines: [
      P + 'systemctl list-timers upbit-ro-check.timer',
      'NEXT                      LEFT      UNIT',
      'Fri 2026-10-16 09:00 KST  20h left  upbit-ro-check.timer',
      '',
      P + 'upbit-ro test-alert',
      '알림 시험 발송 → <span class="ok">텔레그램 전송됨</span>',
      '',
      '<span class="c"># 서버를 재부팅해도 타이머는 자동으로 다시 켜집니다.</span>',
      '<span class="c"># 실패하면 같은 날 알림이 가고, 원인 후보를 함께 적어 보냅니다.</span>'
    ] }
];

let cur = 0, timer = null;
const stepsEl = $('#steps'), term = $('#term'), runBtn = $('#runBtn');

function renderSteps() {
  stepsEl.innerHTML = STEPS.map((s, i) => `<li${i === cur ? ' aria-current="step"' : ''}${i < cur ? ' class="done"' : ''}>
    <button data-i="${i}"><b>${s.t}<em class="tag ${s.who}">${s.who === 'client' ? '고객님' : '저희'}</em></b><span>${s.d}</span></button></li>`).join('');
  $('#stepCount').textContent = `${cur + 1} / ${STEPS.length}`;
  $('#termTitle').textContent = STEPS[cur].title;
  const w = $('#termWho');
  w.textContent = STEPS[cur].who === 'client' ? '고객님 작업' : '저희 작업';
  w.className = 'who' + (STEPS[cur].who === 'us' ? ' us' : '');
}
stepsEl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  cur = +b.dataset.i; renderSteps(); play();
});

function play() {
  clearTimeout(timer);
  const lines = STEPS[cur].lines;
  runBtn.disabled = true;
  if (reduce) { term.innerHTML = lines.join('\n'); runBtn.disabled = false; return; }
  term.innerHTML = '';
  let i = 0;
  const next = () => {
    term.innerHTML = lines.slice(0, i + 1).join('\n') + (i < lines.length - 1 ? '\n<span class="cursor"></span>' : ' <span class="cursor"></span>');
    i++;
    if (i < lines.length) timer = setTimeout(next, lines[i - 1].startsWith(P) ? 520 : 170);
    else runBtn.disabled = false;
  };
  next();
}
runBtn.addEventListener('click', play);
$('#nextBtn').addEventListener('click', () => { cur = (cur + 1) % STEPS.length; renderSteps(); play(); });

/* ---------- 점검 기록 ---------- */
const TODAY = new Date(2026, 9, 15); // 가상 기준일
const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
const base = () => Array.from({ length: 30 }, (_, i) => ({ s: i === 11 ? 'warn' : 'ok', note: i === 11 ? '업비트 응답 지연(5초 초과) → 1분 뒤 재시도 통과' : '5개 항목 모두 통과' }));
let days = base(), expiryD = 312, sim = 'reset', ch = 'tg';
const CHECKS = [
  ['auth', '인증 호출 성공', '잔고 조회 /v1/accounts가 200으로 응답'],
  ['scope', '권한 범위 = 읽기 전용', '주문 조회 요청이 권한 부족으로 거부되는지 확인'],
  ['ip', '서버 IP 변동 없음', '공인 IP가 업비트에 등록해 둔 IP와 같은지 확인'],
  ['exp', '키 만료일 여유', '/v1/api_keys 의 expire_at, 30일 전부터 경고'],
  ['clock', '서버 시계 동기화', 'NTP 동기화 여부. 기록 시각과 만료 계산의 기준']
];

function renderHealth() {
  const g = $('#healthGrid');
  g.innerHTML = days.map((d, i) => {
    const dt = new Date(TODAY); dt.setDate(dt.getDate() - (29 - i));
    const lbl = { ok: '통과', warn: '경고', bad: '실패' }[d.s];
    return `<button role="listitem" class="${d.s}" data-i="${i}" aria-label="${fmt(dt)} ${lbl}" title="${fmt(dt)} ${lbl}"></button>`;
  }).join('');
  const last = days[29].s;
  const chip = $('#statusChip');
  chip.className = 'status-chip ' + last;
  chip.textContent = { ok: '정상', warn: '확인 필요', bad: '실패 · 알림 발송' }[last];
  $('#lastCheck').textContent = `${fmt(TODAY)} 09:00:04 · ${{ ok: '통과', warn: '경고', bad: '실패' }[last]}`;
  $('#expiry').textContent = `D-${expiryD}` + (expiryD <= 30 ? ' · 교체 필요' : '');
  const st = { auth: 'ok', scope: 'ok', ip: 'ok', exp: 'ok', clock: 'ok' };
  if (sim === 'ip') { st.ip = 'bad'; st.auth = 'bad'; }
  if (sim === 'exp') st.exp = 'warn';
  $('#checks').innerHTML = CHECKS.map(([k, t, s]) =>
    `<li><span class="ic ${st[k]}" aria-label="${{ ok: '통과', warn: '경고', bad: '실패' }[st[k]]}">${st[k] === 'ok' ? '✓' : '!'}</span><div><b>${t}</b><span>${s}</span></div></li>`).join('');
  const ap = $('#alertPreview');
  ap.hidden = sim === 'reset';
  $('#alertCh').textContent = ch === 'tg' ? '텔레그램' : '이메일';
  $('#alertText').textContent = sim === 'ip'
    ? '[업비트 점검 실패] 10/15 09:00\n인증 거부: 허용되지 않은 IP\n현재 서버 IP 207.148.y.y ≠ 등록 IP 207.148.x.x\n조치: 문서 3장 "IP가 바뀐 경우" 참고'
    : '[업비트 점검 경고] 10/15 09:00\nAPI 키 만료 21일 전 (11/05)\n조치: 문서 2장 "키 교체" 순서대로 새 키 발급 후 set-key 실행';
}
$('#healthGrid').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const i = +b.dataset.i, dt = new Date(TODAY); dt.setDate(dt.getDate() - (29 - i));
  document.querySelectorAll('#healthGrid button').forEach(x => x.setAttribute('aria-pressed', x === b));
  $('#dayDetail').textContent = `${fmt(dt)} 09:00 — ${days[i].note}`;
});
document.querySelectorAll('[data-sim]').forEach(b => b.addEventListener('click', () => {
  sim = b.dataset.sim; days = base(); expiryD = 312;
  if (sim === 'ip') days[29] = { s: 'bad', note: '인증 거부 — 서버 공인 IP가 바뀜. 같은 날 알림 발송' };
  if (sim === 'exp') { expiryD = 21; days[29] = { s: 'warn', note: '키 만료 21일 전 — 교체 안내 알림 발송' }; }
  $('#dayDetail').textContent = days[29].note === '5개 항목 모두 통과' ? '칸을 누르면 그날 점검 내용을 볼 수 있습니다.' : `${fmt(TODAY)} 09:00 — ${days[29].note}`;
  renderHealth();
}));
document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
  ch = b.dataset.ch;
  document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-checked', x === b));
  renderHealth();
}));

/* ---------- 설정 문서 ---------- */
const DOC = [
`<h3>1. 구성</h3><p class="sub">무엇이 어디에 있는지</p>
<table>
<tr><th>프로그램</th><td><code>/opt/upbit-readonly/</code> (Python 3, 표준 라이브러리 + PyJWT·requests)</td></tr>
<tr><th>키 파일</th><td><code>/etc/upbit-readonly/keys.env</code> · root:root · 600</td></tr>
<tr><th>점검 타이머</th><td><code>upbit-ro-check.timer</code> · 매일 09:00 KST · 재부팅 후 자동 시작</td></tr>
<tr><th>기록</th><td><code>journalctl -u upbit-ro-check</code> (키 원문은 기록하지 않음)</td></tr>
<tr><th>알림</th><td>텔레그램 봇 또는 이메일 중 1개 (설정 파일에서 변경)</td></tr>
<tr><th>업비트 키</th><td>자산조회 권한만 · 허용 IP 1개 · 만료일은 발급 화면과 /v1/api_keys로 확인</td></tr>
</table>
<div class="note">분석 코드에서는 <code>from upbit_ro import client</code> 한 줄로 인증된 조회를 쓰실 수 있습니다. 키를 코드에 적을 필요가 없습니다.</div>`,
`<h3>2. 키 교체</h3><p class="sub">만료 30일 전 경고가 오면, 또는 키가 새었다고 의심되면</p>
<ol>
<li>업비트 Open API 관리에서 새 키 발급 — 자산조회만 체크, 허용 IP에 서버 IP 1개</li>
<li>서버에서 아래 명령 실행 후 새 키 붙여넣기 (화면에 보이지 않음)</li>
</ol>
<pre>sudo upbit-ro set-key
sudo upbit-ro check</pre>
<ol start="3">
<li>"통과 5/5" 확인</li>
<li>업비트에서 <b>이전 키 삭제</b> — 새 키 확인 뒤에 지워야 공백이 없습니다</li>
<li>문서 표의 만료일 갱신</li>
</ol>
<div class="note">키를 메신저·메일로 주고받지 않습니다. 새 담당자에게 넘길 때도 그분이 서버에서 직접 set-key를 실행합니다.</div>`,
`<h3>3. 장애 대응</h3><p class="sub">알림이 왔을 때 확인 순서</p>
<h4>IP가 바뀐 경우</h4>
<ul><li><code>upbit-ro ip</code>로 현재 IP 확인 → 업비트 허용 IP 수정 → <code>upbit-ro check</code></li></ul>
<h4>요청 제한(429)</h4>
<ul><li>잔고 조회는 default 그룹 초당 30회. 분석 코드가 한꺼번에 몰아 부르면 거부됩니다. 클라이언트에 초당 호출 제한과 재시도 간격이 들어 있습니다. 429가 반복되면 일시 차단(418)으로 이어질 수 있어 바로 멈춥니다.</li></ul>
<h4>인증 실패</h4>
<ul><li>키 만료·삭제, IP 불일치, 권한 해제 중 하나입니다. 같은 요청을 반복해도 결과가 같으므로 재시도하지 않고 알림만 보냅니다.</li></ul>
<h4>서버 시계</h4>
<ul><li><code>timedatectl</code>에서 동기화가 꺼져 있으면 켭니다. 기록 시각과 만료일 계산이 어긋나지 않게 하기 위함입니다.</li></ul>`,
`<h3>4. 인계</h3><p class="sub">납품 시 드리는 것과 저희에게 남지 않는 것</p>
<table>
<tr><th>드리는 것</th><td>소스 전체, 이 문서(PDF·서버 README), 알림 설정 방법, 점검 결과 1회분</td></tr>
<tr><th>회수하는 것</th><td>작업용 SSH 접근 — 납품 당일 계정·키 삭제, 삭제 확인 화면 공유</td></tr>
<tr><th>남지 않는 것</th><td>업비트 키 원문 (처음부터 보지 않음)</td></tr>
<tr><th>월 유지보수</th><td>없음. 납품 후 30일 무상 하자보수만</td></tr>
</table>`
];
function showDoc(i) {
  $('#doc').innerHTML = DOC[i];
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', +b.dataset.tab === i));
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showDoc(+b.dataset.tab)));

/* ---------- 등장 효과 ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

renderSteps(); play(); renderHealth(); showDoc(0);
