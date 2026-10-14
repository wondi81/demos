// 웹 시뮬레이션. 실제 납품은 엑셀 수식/구글시트 수식·Apps Script로 같은 계산을 만든다.
const $ = s => document.querySelector(s);
const won = n => n.toLocaleString('ko-KR') + '원';
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addMonths = (s, n) => { const d = parse(s), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return ymd(d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const T = ymd(TODAY);
const dday = s => Math.round((parse(s) - TODAY) / 864e5);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 가상 데이터: 오늘 기준으로 생성해 언제 열어도 임박/연체가 보이게 함
let seq = 0;
const members = [
  ['김하늘', 14, -3, 80000], ['이도윤', 9, 2, 120000], ['박서연', 6, 5, 80000], ['최민준', 11, 12, 150000],
  ['정유나', 4, 20, 60000], ['한지호', 7, 9, 100000], ['오세린', 3, 27, 80000], ['윤태경', 2, 1, 120000],
].map(([name, monthsAgo, nextIn, fee]) => {
  const next = ymd(addDays(TODAY, nextIn));
  return { id: ++seq, name, join: addMonths(ymd(addDays(TODAY, nextIn)), -monthsAgo), next, fee };
});
const log = [];
members.forEach(m => {
  for (let d = addMonths(m.next, -1); d >= m.join; d = addMonths(d, -1)) log.push({ date: d, mid: m.id, amt: m.fee });
});
log.sort((a, b) => a.date < b.date ? -1 : 1);

let sheet = 'members', onlySoon = false;
const nameOf = id => members.find(m => m.id === id)?.name ?? '(삭제된 회원)';
const paidSum = id => log.reduce((a, r) => a + (r.mid === id ? r.amt : 0), 0);
const status = m => { const d = dday(m.next); return d < 0 ? ['over', `연체 ${-d}일`] : d <= 7 ? ['soon', d === 0 ? '오늘' : `D-${d}`] : ['ok', '정상']; };
const ym = T.slice(0, 7);
const monthly = () => {
  const map = {};
  log.forEach(r => { const k = r.date.slice(0, 7); (map[k] ||= { n: 0, sum: 0 }); map[k].n++; map[k].sum += r.amt; });
  return Object.entries(map).sort((a, b) => a[0] < b[0] ? 1 : -1);
};

function kpis() {
  $('#kMembers').textContent = members.length + '명';
  $('#kMonth').textContent = won(log.filter(r => r.date.startsWith(ym)).reduce((a, r) => a + r.amt, 0));
  $('#kTotal').textContent = won(log.reduce((a, r) => a + r.amt, 0));
  $('#kSoon').textContent = members.filter(m => status(m)[0] !== 'ok').length + '명';
}

const COLS = 'ABCDEFG';
function calcCell(ref, formula, text, cls = '') {
  return `<td class="calc num ${cls}" tabindex="0" data-ref="${ref}" data-f="${esc(formula)}">${text}</td>`;
}

function renderMembers() {
  const rows = members.filter(m => !onlySoon || status(m)[0] !== 'ok');
  const body = rows.map(m => {
    const r = members.indexOf(m) + 2, [st, label] = status(m);
    return `<tr class="${st === 'ok' ? '' : st}" data-id="${m.id}">
      <td class="rn">${r}</td>
      <td class="ed"><input aria-label="${r}행 이름" data-k="name" value="${esc(m.name)}" data-ref="A${r}"></td>
      <td class="ed"><input type="date" aria-label="${r}행 가입일" data-k="join" value="${m.join}" data-ref="B${r}"></td>
      <td class="ed"><input type="date" aria-label="${r}행 다음 결제일" data-k="next" value="${m.next}" data-ref="C${r}"></td>
      <td class="ed"><input type="number" min="0" step="1000" inputmode="numeric" aria-label="${r}행 월 결제금액" data-k="fee" value="${m.fee}" data-ref="D${r}"></td>
      ${calcCell('E' + r, `=SUMIF(결제기록!B:B, A${r}, 결제기록!C:C)`, won(paidSum(m.id)))}
      ${calcCell('F' + r, `=IF(C${r}<TODAY(), "연체", IF(C${r}-TODAY()<=7, "D-"&(C${r}-TODAY()), "정상"))`, `<span class="st ${st}">${label}</span>`, 'stc')}
      <td><button class="pay" data-pay="${m.id}" aria-label="${esc(m.name)} ${won(m.fee)} 결제 처리">결제 처리</button></td>
    </tr>`;
  }).join('');
  const n = members.length + 1;
  return `<div class="scroller"><table>
    <thead><tr><th class="rn col"></th>${[...COLS].map(c => `<th class="col">${c}</th>`).join('')}</tr>
    <tr><th class="rn">1</th><th>이름</th><th>가입일</th><th>다음 결제일</th><th>월 결제금액</th><th>누적 금액</th><th>상태</th><th>작업</th></tr></thead>
    <tbody>${body || `<tr><td colspan="8" class="empty">7일 안에 결제할 회원이 없습니다</td></tr>`}</tbody>
    <tfoot><tr><td class="rn">${n + 1}</td><td>합계</td><td></td><td></td>
      ${calcCell('D' + (n + 1), `=SUM(D2:D${n})`, won(members.reduce((a, m) => a + m.fee, 0)))}
      ${calcCell('E' + (n + 1), `=SUM(E2:E${n})`, won(members.reduce((a, m) => a + paidSum(m.id), 0)))}
      <td></td><td></td></tr></tfoot>
  </table></div>
  <div class="legend"><span><i style="background:var(--amber-soft)"></i>7일 안 결제 예정</span><span><i style="background:var(--red-soft)"></i>결제일 지남</span><span>파란 글씨 셀은 자동 계산(누르면 수식 표시)</span></div>`;
}

function renderLog() {
  const rows = [...log].reverse();
  return `<div class="scroller"><table>
    <thead><tr><th class="rn col"></th><th class="col">A</th><th class="col">B</th><th class="col">C</th></tr>
    <tr><th class="rn">1</th><th>결제일</th><th>이름</th><th>금액</th></tr></thead>
    <tbody>${rows.map((r, i) => `<tr><td class="rn">${i + 2}</td><td>${r.date}</td><td>${esc(nameOf(r.mid))}</td><td class="num">${won(r.amt)}</td></tr>`).join('')}</tbody>
  </table></div>
  <div class="legend"><span>‘회원 목록’에서 결제 처리를 누르면 여기에 한 줄씩 쌓입니다(최신순 표시)</span></div>`;
}

function renderMonthly() {
  const m = monthly(), max = Math.max(1, ...m.map(([, v]) => v.sum)), n = m.length + 1;
  return `<div class="scroller"><table>
    <thead><tr><th class="rn col"></th><th class="col">A</th><th class="col">B</th><th class="col">C</th><th class="col">D</th></tr>
    <tr><th class="rn">1</th><th>월</th><th>결제 건수</th><th>합계</th><th>비교</th></tr></thead>
    <tbody>${m.map(([k, v], i) => `<tr><td class="rn">${i + 2}</td><td>${k}${k === ym ? ' (이번 달)' : ''}</td>
      ${calcCell('B' + (i + 2), `=COUNTIFS(결제기록!A:A, ">="&DATE(${k.slice(0, 4)},${+k.slice(5)},1), 결제기록!A:A, "<"&EDATE(DATE(${k.slice(0, 4)},${+k.slice(5)},1),1))`, v.n + '건')}
      ${calcCell('C' + (i + 2), `=SUMIFS(결제기록!C:C, 결제기록!A:A, ">="&DATE(${k.slice(0, 4)},${+k.slice(5)},1), 결제기록!A:A, "<"&EDATE(DATE(${k.slice(0, 4)},${+k.slice(5)},1),1))`, won(v.sum))}
      <td style="min-width:120px"><span class="bars" style="width:${Math.round(v.sum / max * 100)}px" aria-hidden="true"></span></td></tr>`).join('')}</tbody>
    <tfoot><tr><td class="rn">${n + 1}</td><td>총 금액</td>
      ${calcCell('B' + (n + 1), `=SUM(B2:B${n})`, log.length + '건')}
      ${calcCell('C' + (n + 1), `=SUM(C2:C${n})`, won(log.reduce((a, r) => a + r.amt, 0)))}<td></td></tr></tfoot>
  </table></div>`;
}

function render() {
  $('#panel').innerHTML = sheet === 'members' ? renderMembers() : sheet === 'log' ? renderLog() : renderMonthly();
  kpis();
}

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }

function showFormula(el) {
  $('#ref').textContent = el.dataset.ref || '';
  $('#formula').textContent = el.dataset.f || (el.value ?? '');
}
$('#panel').addEventListener('focusin', e => { if (e.target.dataset.ref) showFormula(e.target); });
$('#panel').addEventListener('click', e => {
  const c = e.target.closest('td.calc'); if (c) { c.focus(); showFormula(c); }
  const p = e.target.closest('[data-pay]'); if (!p) return;
  const m = members.find(x => x.id === +p.dataset.pay);
  log.push({ date: T, mid: m.id, amt: m.fee });
  m.next = addMonths(m.next, 1);
  render();
  toast(`${m.name} ${won(m.fee)} 결제 기록 · 다음 결제일 ${m.next}`);
  document.querySelector(`[data-pay="${m.id}"]`)?.focus();
});
$('#panel').addEventListener('change', e => {
  const k = e.target.dataset.k; if (!k) return;
  const m = members.find(x => x.id === +e.target.closest('tr').dataset.id);
  const v = e.target.value;
  if (k === 'fee') m.fee = Math.max(0, parseInt(v, 10) || 0);
  else if ((k === 'join' || k === 'next') && !v) { e.target.value = m[k]; return; }
  else m[k] = k === 'name' ? (v.trim() || '이름 없음') : v;
  const ref = e.target.dataset.ref;
  render();
  document.querySelector(`[data-ref="${ref}"]`)?.focus();
});

$('#addRow').addEventListener('click', () => {
  if (onlySoon) { onlySoon = false; $('#onlySoon').checked = false; }
  sheet = 'members'; syncTabs();
  members.push({ id: ++seq, name: '새 회원', join: T, next: addMonths(T, 1), fee: 0 });
  render();
  const inp = document.querySelector(`[data-ref="A${members.length + 1}"]`);
  inp.focus(); inp.select();
  toast('행을 추가했습니다. 이름·결제일·금액을 입력하세요');
});
$('#onlySoon').addEventListener('change', e => { onlySoon = e.target.checked; sheet = 'members'; syncTabs(); render(); });

function syncTabs() { document.querySelectorAll('.sheets button').forEach(b => b.setAttribute('aria-selected', b.dataset.s === sheet)); }
document.querySelectorAll('.sheets button').forEach(b => b.addEventListener('click', () => { sheet = b.dataset.s; syncTabs(); render(); }));

// CSV: 현재 보고 있는 시트를 엑셀에서 한글이 깨지지 않게 BOM 포함으로 저장
$('#csv').addEventListener('click', () => {
  let rows;
  if (sheet === 'members') rows = [['이름', '가입일', '다음 결제일', '월 결제금액', '누적 금액', '상태'], ...members.map(m => [m.name, m.join, m.next, m.fee, paidSum(m.id), status(m)[1]])];
  else if (sheet === 'log') rows = [['결제일', '이름', '금액'], ...log.map(r => [r.date, nameOf(r.mid), r.amt])];
  else rows = [['월', '결제 건수', '합계'], ...monthly().map(([k, v]) => [k, v.n, v.sum]), ['총 금액', log.length, log.reduce((a, r) => a + r.amt, 0)]];
  const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = { members: '회원목록', log: '결제기록', monthly: '월별합계' }[sheet] + `_${T}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(a.download + ' 저장');
});

$('#today').textContent = `기준일 ${T} (오늘)`;
render();
