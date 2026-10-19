'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- 탭 ---------- */
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== 'tab-' + b.dataset.tab);
});

/* ---------- 1) 상품 데이터 ---------- */
const OLD = ['상품코드', '상품명', '판매가', '소비자가', '재고', '옵션', '이미지URL', '카테고리'];
// 퍼스트몰 컬럼: '상품번호·상태·상품명·오픈마켓 상품명·정가·할인가·재고·필수옵션값'은 공식 FAQ 확인, 나머지는 가칭
const MAP = [
  ['상품번호', '(비움)', '신규 등록은 비워 둠 (FAQ 확인)'],
  ['상태', '(고정값)', '필수 열. 값 표기는 계정 양식으로 확인'],
  ['상품명', '상품명', '필수 열. 앞뒤 공백 제거'],
  ['오픈마켓 상품명', '상품명', '필수 열. 상품명과 동일하게 채움'],
  ['정가', '소비자가', '숫자만'],
  ['할인가', '판매가', '숫자만. 실제 판매가'],
  ['재고', '재고', ''],
  ['필수옵션값', '옵션', '옵션 관련 열 세트는 계정 양식 기준'],
  ['카테고리 (가칭)', '카테고리', '컬럼명 미확인 · 카테고리 대응표로 변환'],
  ['대표이미지 (가칭)', '이미지URL', '컬럼명 미확인'],
  ['기존상품코드 (참고)', '상품코드', '검수용 참고 열, 업로드 전 삭제'],
];
const OUT = MAP.map(m => m[0]);
const CAT = {'주방>식기':'주방 > 식기','주방>조리도구':'주방 > 조리도구','침구>이불':'침구 > 이불','침구>베개':'침구 > 베개','수납>정리함':'수납 > 정리함','욕실>타월':'욕실 > 타월','패브릭>쿠션':'패브릭 > 쿠션','조명>무드등':'조명 > 무드등'};

function sample() {
  const names = ['스톤웨어 접시','린넨 앞치마','실리콘 뒤집개','무지 머그컵','워싱 이불','메모리폼 베개','패브릭 정리함','호텔 타월','벨벳 쿠션','원목 무드등'];
  const cats = Object.keys(CAT);
  const rows = [];
  for (let i = 0; i < 30; i++) {
    const n = names[i % 10], price = 9900 + (i * 3700) % 60000;
    rows.push({
      '상품코드': 'OK' + String(1001 + i), '상품명': n + (i >= 10 ? ' ' + (i < 20 ? 'S' : 'L') : ''),
      '판매가': String(price), '소비자가': String(Math.round(price * 1.25 / 100) * 100), '재고': String((i * 7) % 40 + 3),
      '옵션': i % 3 === 0 ? '색상:아이보리|그레이|차콜' : i % 3 === 1 ? '사이즈:S|M|L' : '',
      '이미지URL': `https://img.example-mall.kr/goods/ok${1001 + i}.jpg`, '카테고리': cats[i % cats.length],
    });
  }
  // 일부러 넣은 오류
  rows[3]['판매가'] = '';                              // 가격 없음
  rows[7]['판매가'] = '12,900원';                      // 숫자 형식 (자동)
  rows[11]['옵션'] = 'ìƒ‰ìƒ:ë¸”ëž™|í™”ì´íŠ¸';         // 인코딩 깨짐
  rows[14]['옵션'] = '사이즈:S/M/L';                   // 구분자 다름 (자동)
  rows[18]['이미지URL'] = '';                          // 이미지 주소 없음
  rows[21]['카테고리'] = '기타>시즌오프';               // 카테고리 매칭 안 됨
  rows[25]['상품코드'] = 'OK1006';                     // 중복 상품코드
  rows[27]['상품명'] = '  ' + rows[27]['상품명'] + ' '; // 공백 (자동)
  return rows;
}

let rows = sample(), result = [];

function convert(src) {
  const errs = [], seen = {}, out = [];
  src.forEach(r => { seen[r['상품코드']] = (seen[r['상품코드']] || 0) + 1; });
  src.forEach((r, i) => {
    const line = i + 2, code = r['상품코드'] || '(코드 없음)', mark = {};
    const add = (type, col, msg) => { errs.push({type, line, code, msg}); mark[col] = type; };
    const num = (v, col, label) => {
      const raw = String(v ?? '').trim();
      if (!raw) { add('check', col, `${label} 비어 있음`); return ''; }
      const n = raw.replace(/[,원\s]/g, '');
      if (!/^\d+$/.test(n)) { add('check', col, `${label} 숫자가 아님: "${raw}"`); return raw; }
      if (n !== raw) add('auto', col, `${label} "${raw}" → ${n}`);
      return n;
    };
    const name = String(r['상품명'] ?? '');
    if (name !== name.trim()) add('auto', '상품명', '상품명 앞뒤 공백 제거');
    let opt = String(r['옵션'] ?? '');
    if (/[À-ÿ][\u0080-ÿ]/.test(opt) || opt.includes('�')) add('check', '필수옵션값', '옵션 문자열 깨짐(인코딩). 원본 확인 필요');
    else if (opt.includes('/')) { opt = opt.replace(/\//g, '|'); add('auto', '필수옵션값', '옵션 구분자 "/" → "|"'); }
    const optOut = opt.replace(/\|/g, ',');
    const img = String(r['이미지URL'] ?? '').trim();
    if (!img) add('check', '대표이미지 (가칭)', '이미지 주소 없음');
    const cat = CAT[String(r['카테고리'] ?? '').replace(/\s/g, '')];
    if (!cat) add('check', '카테고리 (가칭)', `카테고리 "${r['카테고리'] ?? ''}" 대응 없음`);
    if (seen[r['상품코드']] > 1) add('check', '기존상품코드 (참고)', '상품코드 중복');
    const o = {
      '상품번호': '', '상태': '정상', '상품명': name.trim(), '오픈마켓 상품명': name.trim(),
      '정가': num(r['소비자가'], '정가', '소비자가'), '할인가': num(r['판매가'], '할인가', '판매가'),
      '재고': String(r['재고'] ?? '').trim(), '필수옵션값': optOut,
      '카테고리 (가칭)': cat || String(r['카테고리'] ?? ''), '대표이미지 (가칭)': img, '기존상품코드 (참고)': r['상품코드'] ?? '',
    };
    out.push({o, mark});
  });
  return {out, errs};
}

function renderProducts() {
  const {out, errs} = convert(rows);
  result = out;
  const auto = errs.filter(e => e.type === 'auto').length, check = errs.length - auto;
  const okRows = out.filter(r => !Object.values(r.mark).includes('check')).length;
  $('#stats').innerHTML = `<span class="stat"><b>${out.length}</b>상품</span><span class="stat"><b>${okRows}</b>바로 등록 가능</span><span class="stat"><b>${auto}</b>자동 수정</span><span class="stat"><b>${check}</b>확인 필요</span>`;
  $('#map').innerHTML = '<tr><th>퍼스트몰 일괄등록 컬럼</th><th>기존몰 컬럼</th><th>변환 규칙</th></tr>' +
    MAP.map(m => `<tr><td>${esc(m[0])}</td><td>${esc(m[1])}</td><td>${esc(m[2])}</td></tr>`).join('');
  $('#errcount').textContent = errs.length ? `${errs.length}건` : '없음';
  const lab = {auto: '자동 수정', check: '확인 필요'};
  $('#errs').innerHTML = errs.length ? errs.sort((a, b) => (a.type > b.type) - (a.type < b.type) || a.line - b.line)
    .map(e => `<li><span class="tag ${e.type}">${lab[e.type]}</span><code>${e.line}행 · ${esc(e.code)}</code>${esc(e.msg)}</li>`).join('')
    : '<li>오류가 없습니다.</li>';
  $('#grid').innerHTML = '<tr><th>#</th>' + OUT.map(c => `<th>${esc(c)}</th>`).join('') + '</tr>' +
    out.map((r, i) => '<tr><td>' + (i + 1) + '</td>' + OUT.map(c =>
      `<td class="${r.mark[c] === 'check' ? 'bad' : r.mark[c] === 'auto' ? 'fix' : ''}" title="${esc(r.o[c])}">${esc(r.o[c]) || '<span class="muted">-</span>'}</td>`).join('') + '</tr>').join('');
}

function parseCSV(t) {
  const out = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); out.push(row); }
  return out.filter(r => r.some(x => x.trim()));
}
const csvCell = v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;

$('#file').onchange = async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  const buf = await file.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(buf);
  if (text.includes('�')) text = new TextDecoder('euc-kr').decode(buf); // 국내 솔루션 엑셀 내보내기 대비
  const data = parseCSV(text.replace(/^﻿/, ''));
  const head = (data[0] || []).map(h => h.trim());
  const miss = OLD.filter(h => !head.includes(h));
  if (miss.length === OLD.length || data.length < 2) { alert('첫 줄에 ' + OLD.join(', ') + ' 컬럼이 있는 CSV가 필요합니다.'); return; }
  rows = data.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
  renderProducts();
  if (miss.length) alert('없는 컬럼은 빈 값으로 처리했습니다: ' + miss.join(', '));
};
$('#reset').onclick = () => { rows = sample(); renderProducts(); };
$('#dl').onclick = () => {
  const csv = '﻿' + [OUT, ...result.map(r => OUT.map(c => r.o[c]))].map(r => r.map(v => csvCell(String(v))).join(',')).join('\r\n');
  const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(new Blob([csv], {type: 'text/csv'})), download: 'firstmall_변환결과.csv'});
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
renderProducts();

/* ---------- 2) 회원·게시글 체크리스트 ---------- */
const S = '퍼스트몰 이전 서비스', X = '직접 엑셀', N = '이전 안 함';
const CHECKS = [
  ['회원', [
    ['m1', '회원 기본정보 (아이디·이름·연락처·주소)', S, '이전 후 전화번호·이메일·주소가 맞는지 검수'],
    ['m2', 'SNS 간편가입 회원', S, '회원 식별값(고유 키)을 기존몰에서 함께 받아야 함'],
    ['m3', '회원 비밀번호', N, '암호화되어 있어 이전되지 않음. 오픈 공지와 함께 \'정보 찾기\'로 재설정 안내'],
    ['m4', '회원등급', S, '등급 체계를 퍼스트몰에 먼저 만들고 대응'],
    ['m5', '휴면·탈퇴 회원', S, '정상 이전 여부 검수'],
    ['m6', '적립금 잔액', X, '이전 서비스 포함 여부 미확인. 담당자 확인 후 결정'],
  ]],
  ['게시글', [
    ['b1', '상품후기', S, '답변·댓글 매칭에 게시글 고유번호 필요'],
    ['b2', '상품문의', S, '답변 매칭 검수'],
    ['b3', '1:1 문의', S, '1:1 문의의 댓글은 이전되지 않음'],
    ['b4', '공지사항·이벤트 게시판', X, '이전 서비스 안내 목록(상품문의·상품후기·1:1 문의)에 없어 직접 이관'],
    ['b5', '게시글 첨부파일·본문 이미지', S, '이미지 노출 여부 검수'],
  ]],
  ['오픈 전', [
    ['o1', '주문 내역', N, '이번 범위 제외. 퍼스트몰 기본 이전 대상도 아님'],
    ['o2', '상품 수정은 1차 이전 후 퍼스트몰에서', null, '최종 이전 때 상품 데이터는 다시 옮기지 않음'],
    ['o3', '검수 기간 데이터 수정 자제', null, '검수 중 수정한 내용은 최종 이전에 반영되지 않음'],
    ['o4', '최종 이전 확인 후 대표 도메인 연결', null, '도메인 연결 뒤에는 최종·추가 이전 불가'],
    ['o5', '결제(PG)·SMS·알림톡·이메일 발송 점검', null, '오픈 전 점검 항목'],
  ]],
];
const KEY = 'mall-migration-checks';
let st = {};
try { st = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { st = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

function renderChecks() {
  $('#checks').innerHTML = CHECKS.map(([g, items]) => `<div class="group"><h2>${g}</h2>` + items.map(([id, t, m, note]) => {
    const s = st[id] || {}, method = s.m || m;
    const sel = m ? `<select data-m="${id}" aria-label="${esc(t)} 이전 방법">${[S, X, N].map(o => `<option${o === method ? ' selected' : ''}>${o}</option>`).join('')}</select>` : '';
    return `<label class="item${s.d ? ' done' : ''}"><input type="checkbox" data-d="${id}"${s.d ? ' checked' : ''}><span><b>${esc(t)}</b><p>${esc(note)}</p></span>${sel}</label>`;
  }).join('') + '</div>').join('');
  const all = CHECKS.flatMap(g => g[1]), done = all.filter(i => st[i[0]]?.d).length, pct = Math.round(done / all.length * 100);
  $('#pct').textContent = pct + '%'; $('#pcnt').textContent = `${done} / ${all.length}`; $('#pbar').style.width = pct + '%';
}
$('#checks').addEventListener('change', e => {
  const id = e.target.dataset.d || e.target.dataset.m;
  if (!id) return;
  st[id] = st[id] || {};
  if (e.target.dataset.d) st[id].d = e.target.checked; else st[id].m = e.target.value;
  save(); renderChecks();
});
renderChecks();

/* ---------- 3) 스킨 미리보기 ---------- */
const G = [['스톤웨어 접시 2P', 18900, 24000, '#DCD3C6'], ['린넨 앞치마', 22000, 0, '#C9D1C4'], ['워싱 이불 Q', 79000, 98000, '#E4DCD0'], ['원목 무드등', 34500, 0, '#D6C3A8'],
  ['호텔 타월 5P', 29900, 39000, '#E8E4DE'], ['벨벳 쿠션', 15900, 0, '#BFC6CF'], ['패브릭 정리함 L', 12900, 16000, '#D9CFC2'], ['무지 머그컵', 8900, 0, '#CDC4B8']];
$('#goods').innerHTML = G.map(([n, p, o, c]) => `<div class="g"><i style="background:${c}"></i><p>${n}</p><b>${p.toLocaleString()}원</b>${o ? `<s>${o.toLocaleString()}원</s>` : ''}</div>`).join('');
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', x === b));
  $('#frame').classList.toggle('mo', b.dataset.view === 'mo');
});
