/* © 제로투원 — 시연 전용, 무단 사용·복제 금지 */
(() => {
'use strict';

const EXPIRES = Date.parse('2026-12-10T00:00:00+09:00');
const BATCH_MAX = 20, SESSION_MAX = 50, PIN_MAX_FAIL = 5;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CSV_MARK = '# 제로투원 시연용 가짜 데이터 - 실사용 불가';
const PLATFORMS = {
  naver: { name: '네이버 플레이스', mark: 'N' },
  google: { name: '구글 지도', mark: 'G' },
  kakao: { name: '카카오맵', mark: 'K' },
  kakaoch: { name: '카카오톡 채널', mark: 'ch' },
  insta: { name: '인스타그램', mark: 'IG' },
  etc: { name: '기타 링크', mark: '•' }
};
const STATUS = { unused: '미사용', reg: '등록', used: '사용' };

const tags = new Map();
const batches = [];
let generated = 0;
let owner = null;

function detect(url) {
  let u;
  try { u = new URL(url); } catch { return 'etc'; }
  const h = u.hostname.toLowerCase().replace(/^www\./, '');
  if (['naver.me', 'map.naver.com', 'm.place.naver.com'].includes(h)) return 'naver';
  if ((h === 'google.com' && u.pathname.startsWith('/maps')) || h === 'g.page' || h === 'maps.app.goo.gl') return 'google';
  if (h === 'place.map.kakao.com' || h === 'kko.to') return 'kakao';
  if (h === 'pf.kakao.com') return 'kakaoch';
  if (h === 'instagram.com') return 'insta';
  return 'etc';
}

function checkUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return '주소 형식이 올바르지 않습니다. https://로 시작하는 전체 주소를 넣어 주세요.'; }
  if (u.protocol !== 'https:') return 'https://로 시작하는 주소만 등록할 수 있습니다.';
  if (!u.hostname.includes('.')) return '주소 형식이 올바르지 않습니다.';
  return '';
}

function addTag(id, pin, store, urls, batch) {
  tags.set(id, { id, pin, store, links: urls.map(url => ({ url, type: detect(url) })), fails: 0, scans: 0, batch });
}
addTag('ZT-DEMO01', '1234', '시연 카페 한잔', ['https://m.place.naver.com/place/0000000000'], 0);
addTag('ZT-DEMO02', '5678', '시연 베이커리', [
  'https://m.place.naver.com/place/0000000000',
  'https://maps.app.goo.gl/00000000000000000',
  'https://place.map.kakao.com/00000000'
], 0);

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const tagUrl = id => location.origin + location.pathname + '#t=' + id;
const host = url => { try { return new URL(url).hostname; } catch { return url; } };
const logo = (type, lg) => `<span class="logo ${type}${lg ? ' lg' : ''}" aria-hidden="true">${PLATFORMS[type].mark}</span>`;
const statusOf = t => t.scans > 0 ? 'used' : t.links.length ? 'reg' : 'unused';
const rand = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;

function qrSvg(text, cell) {
  if (typeof qrcode !== 'function') return '<p class="muted small">QR 라이브러리를 불러오지 못했습니다.</p>';
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag(cell || 4, 2);
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
}

function render(html, wide) {
  const app = $('#app');
  app.className = wide ? 'wide' : '';
  app.onclick = null;
  app.innerHTML = html;
  window.scrollTo(0, 0);
}

function route() {
  $('#modal').innerHTML = '';
  if (Date.now() >= EXPIRES) {
    document.body.classList.add('expired');
    render(`<div class="expired-box"><div><h1>시연 기간이 끝났습니다</h1><p class="muted">이 시연 데모는 2026년 12월 9일까지만 열람할 수 있습니다.</p></div></div>`);
    return;
  }
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith('t=')) return viewGuest(h.slice(2).trim().toUpperCase());
  if (h === 'owner') return viewOwner();
  if (h === 'admin') return viewAdmin();
  viewHome();
}

function viewHome() {
  const demo = ['ZT-DEMO01', 'ZT-DEMO02'].map(id => tags.get(id));
  render(`
    <h1>NFC·QR 스마트 리뷰 연결</h1>
    <p class="muted">매장 태그를 찍은 손님을 점주가 등록한 리뷰 페이지로 보내 주는 서비스의 시연판입니다.</p>
    <div class="entry" style="margin:18px 0 22px">
      <a href="#t=ZT-DEMO02"><span class="num">1</span><span><b>손님이 태그를 찍었을 때</b><small>리뷰 플랫폼 선택 → 이동</small></span></a>
      <a href="#owner"><span class="num">2</span><span><b>점주 설정</b><small>태그 번호 + PIN으로 리뷰 주소 등록</small></span></a>
      <a href="#admin"><span class="num">3</span><span><b>관리자</b><small>태그 대량 생성 · 엑셀 내보내기</small></span></a>
    </div>
    <h2>시연용 태그 QR</h2>
    <p class="muted small">폰 카메라로 찍으면 그 폰에서 손님 화면이 열립니다.</p>
    <div class="qr-row">
      ${demo.map(t => `<div class="qr-card">${qrSvg(tagUrl(t.id), 4)}<b>${esc(t.store)}</b><span class="muted small">${t.id} · 플랫폼 ${t.links.length}개</span></div>`).join('')}
    </div>
    <p class="muted small" style="margin-top:14px">점주 설정 시연: ZT-DEMO01 / PIN 1234, ZT-DEMO02 / PIN 5678</p>
  `);
}

function viewGuest(id, pick) {
  const t = tags.get(id);
  if (!t) {
    render(`<div class="card empty"><b>등록되지 않은 태그입니다</b><p class="muted">태그 번호: ${esc(id)}</p></div>`);
    return;
  }
  if (pick === undefined) t.scans++;
  const head = `<div class="guest-head"><p class="store">${esc(t.store)}</p><p class="muted">방문해 주셔서 감사합니다. 리뷰 한 줄이 큰 힘이 됩니다.</p></div>`;
  let body;
  if (!t.links.length) {
    body = `<div class="card empty"><b>아직 연결된 리뷰 페이지가 없습니다</b><p class="muted">매장 직원에게 알려 주세요.</p></div>`;
  } else if (t.links.length === 1 || typeof pick === 'number') {
    const l = t.links[pick || 0];
    const p = PLATFORMS[l.type];
    body = `<div class="card go">
      ${logo(l.type, true)}
      <p class="go-name">${p.name}(으)로 이동합니다</p>
      <div class="notice"><b>시연 안내</b><p>실제 서비스에서는 여기서 ${p.name} 리뷰 페이지로 바로 이동합니다.</p><code>${esc(l.url)}</code></div>
      ${t.links.length > 1 ? '<button class="btn block" data-back>다른 곳 고르기</button>' : ''}
    </div>`;
  } else {
    body = `<p class="muted" style="text-align:center">리뷰를 남길 곳을 골라 주세요</p>
      <div class="picks">${t.links.map((l, i) => `<button class="pick" data-pick="${i}">${logo(l.type)}<span><b>${PLATFORMS[l.type].name}</b><small>${esc(host(l.url))}</small></span><span class="chev" aria-hidden="true">›</span></button>`).join('')}</div>`;
  }
  render(head + body + `<p class="muted small" style="text-align:center;margin-top:20px">태그 ${t.id}</p>`);
  $('#app').onclick = e => {
    const b = e.target.closest('[data-pick],[data-back]');
    if (!b) return;
    viewGuest(id, b.dataset.pick !== undefined ? +b.dataset.pick : null);
  };
}

function viewOwner() {
  $('#app').onclick = null;
  if (!owner) return viewOwnerLogin();
  const t = tags.get(owner.id);
  const d = owner.draft;
  render(`
    <a class="back" href="#">← 처음으로</a>
    <div class="admin-head"><h1 style="margin:0">점주 설정</h1><span class="muted">${t.id}</span>
      <button class="btn sm" id="logout" style="margin-left:auto">나가기</button></div>
    <div class="card">
      <div class="field"><label for="store">매장명</label><input type="text" id="store" maxlength="30" value="${esc(d.store)}"></div>
      <label>리뷰 플랫폼 (손님에게 보이는 순서)</label>
      ${d.links.length ? `<ul class="links">${d.links.map((l, i) => `
        <li>${logo(l.type)}<div class="info"><b>${PLATFORMS[l.type].name}</b><small>${esc(l.url)}</small></div>
          <div class="ctl">
            <button class="btn" data-up="${i}" aria-label="위로" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn" data-down="${i}" aria-label="아래로" ${i === d.links.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn danger" data-del="${i}" aria-label="삭제">✕</button>
          </div></li>`).join('')}</ul>` : '<p class="muted">아직 등록한 플랫폼이 없습니다.</p>'}
      <label for="newurl">리뷰 페이지 주소 추가</label>
      <div class="row"><input type="url" id="newurl" placeholder="https://m.place.naver.com/place/..." autocomplete="off"><button class="btn" id="add">추가</button></div>
      <p class="detect" id="detect">주소를 넣으면 플랫폼을 자동으로 알아봅니다.</p>
      <p class="msg err" id="urlmsg"></p>
    </div>
    <button class="btn primary block" id="save">저장</button>
    <p class="msg" id="savemsg"></p>
    <button class="btn block" id="preview" ${owner.dirty ? 'disabled' : ''}>손님 화면 미리보기</button>
    ${owner.dirty ? '<p class="hint" style="text-align:center">저장하면 미리볼 수 있습니다.</p>' : ''}
  `);
  const dirty = () => { owner.dirty = true; viewOwner(); };
  $('#store').oninput = e => { d.store = e.target.value; if (!owner.dirty) { owner.dirty = true; $('#preview').disabled = true; } };
  $('#newurl').oninput = e => {
    const v = e.target.value.trim();
    $('#urlmsg').textContent = '';
    $('#detect').innerHTML = v ? `판별 결과: <b>${PLATFORMS[detect(v)].name}</b>` : '주소를 넣으면 플랫폼을 자동으로 알아봅니다.';
  };
  const add = () => {
    const v = $('#newurl').value.trim();
    const err = !v ? '주소를 입력해 주세요.' : checkUrl(v) || (d.links.some(l => l.url === v) ? '이미 등록된 주소입니다.' : '');
    if (err) { $('#urlmsg').textContent = err; return; }
    d.links.push({ url: v, type: detect(v) });
    dirty();
  };
  $('#add').onclick = add;
  $('#newurl').onkeydown = e => { if (e.key === 'Enter') add(); };
  $('#app').onclick = e => {
    const b = e.target.closest('[data-up],[data-down],[data-del]');
    if (!b) return;
    const i = +(b.dataset.up ?? b.dataset.down ?? b.dataset.del);
    if (b.dataset.del !== undefined) d.links.splice(i, 1);
    else {
      const j = b.dataset.up !== undefined ? i - 1 : i + 1;
      [d.links[i], d.links[j]] = [d.links[j], d.links[i]];
    }
    dirty();
  };
  $('#save').onclick = () => {
    const name = d.store.trim();
    if (!name) { $('#savemsg').className = 'msg err'; $('#savemsg').textContent = '매장명을 입력해 주세요.'; return; }
    t.store = name;
    t.links = d.links.map(l => ({ ...l }));
    owner.dirty = false;
    viewOwner();
    toast('저장했습니다');
  };
  $('#preview').onclick = () => { location.hash = 't=' + t.id; };
  $('#logout').onclick = () => { owner = null; viewOwner(); };
}

function viewOwnerLogin() {
  render(`
    <a class="back" href="#">← 처음으로</a>
    <h1>점주 설정</h1>
    <p class="muted">태그 뒷면의 고유번호와 PIN 4자리를 입력하세요.</p>
    <form class="card" id="login" novalidate>
      <div class="field"><label for="tid">태그 고유번호</label><input type="text" id="tid" placeholder="ZT-XXXXXX" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
      <div class="field"><label for="pin">PIN 4자리</label><input type="password" id="pin" inputmode="numeric" maxlength="4" autocomplete="off"></div>
      <button class="btn primary block">들어가기</button>
      <div id="loginmsg" class="msg err"></div>
    </form>
    <p class="muted small">시연 태그: ZT-DEMO01 / 1234 · ZT-DEMO02 / 5678</p>
  `);
  $('#login').onsubmit = e => {
    e.preventDefault();
    const id = $('#tid').value.trim().toUpperCase();
    const pin = $('#pin').value.trim();
    const out = $('#loginmsg');
    const t = tags.get(id);
    if (!t) { out.textContent = '등록되지 않은 태그 번호입니다.'; return; }
    if (t.fails >= PIN_MAX_FAIL) { out.innerHTML = '<div class="lock">PIN을 5회 틀려 이 태그가 잠겼습니다. 관리자에게 잠금 해제를 요청하세요.</div>'; return; }
    if (!/^\d{4}$/.test(pin)) { out.textContent = 'PIN은 숫자 4자리입니다.'; return; }
    if (pin !== t.pin) {
      t.fails++;
      out.innerHTML = t.fails >= PIN_MAX_FAIL
        ? '<div class="lock">PIN을 5회 틀려 이 태그가 잠겼습니다. 관리자에게 잠금 해제를 요청하세요.</div>'
        : `PIN이 맞지 않습니다. (${t.fails}/${PIN_MAX_FAIL}회, 5회 틀리면 잠김)`;
      $('#pin').value = '';
      return;
    }
    t.fails = 0;
    owner = { id, dirty: false, draft: { store: t.store, links: t.links.map(l => ({ ...l })) } };
    viewOwner();
  };
}

function newId() {
  let id;
  do { id = 'ZT-' + Array.from({ length: 6 }, () => CHARS[rand(CHARS.length)]).join(''); } while (tags.has(id));
  return id;
}

const admin = { q: '', batch: 'all', msg: '', ok: false };

function viewAdmin() {
  const left = SESSION_MAX - generated;
  render(`
    <a class="back" href="#">← 처음으로</a>
    <div class="admin-head"><h1 style="margin:0">태그 관리</h1><span class="pill">시연용 관리자</span></div>
    <div class="admin-grid">
      <div>
        <div class="card">
          <h2>태그 대량 생성</h2>
          <label for="cnt">생성 개수 (한 번에 최대 ${BATCH_MAX}개)</label>
          <div class="row"><input type="number" id="cnt" min="1" max="${BATCH_MAX}" value="5"><button class="btn primary" id="gen">생성</button></div>
          <p class="msg ${admin.ok ? 'ok' : 'err'}" id="genmsg">${esc(admin.msg)}</p>
          <p class="hint">이번 세션 남은 생성 수: ${left}개 / ${SESSION_MAX}개</p>
        </div>
        <div class="card">
          <h2>생산 차수</h2>
          ${batches.length ? `<div class="tbl-wrap"><table class="batches"><thead><tr><th>차수</th><th>개수</th><th>생성 시각</th></tr></thead><tbody>
            ${batches.map(b => `<tr><td>${b.no}차</td><td>${b.count}개</td><td>${b.at}</td></tr>`).join('')}</tbody></table></div>`
            : '<p class="muted">아직 생성한 차수가 없습니다.</p>'}
        </div>
        <div class="card">
          <h2>내보내기</h2>
          <div class="tools" style="margin:0">
            <button class="btn" id="csv-maker">제조업체용 CSV</button>
            <button class="btn" id="csv-pin">내부용 PIN CSV</button>
          </div>
          <p class="hint">제조업체용: 번호·태그 URL / 내부용: 번호·PIN</p>
          <p class="warn-line">PIN은 제조업체에 주지 않습니다.</p>
        </div>
      </div>
      <div class="card">
        <h2>태그 목록</h2>
        <p class="nfc-line">NFC 태그에는 이 URL을 NTAG213에 기록: <code>${esc(tagUrl('태그번호'))}</code></p>
        <div class="tools">
          <input type="search" id="q" placeholder="번호·매장명 검색" value="${esc(admin.q)}">
          <select id="bf" aria-label="차수로 거르기">
            <option value="all">전체 차수</option>
            <option value="0">시연 태그</option>
            ${batches.map(b => `<option value="${b.no}">${b.no}차</option>`).join('')}
          </select>
        </div>
        <div class="tbl-wrap"><table><thead><tr><th>번호</th><th>PIN</th><th>매장명</th><th>플랫폼</th><th>상태</th><th>차수</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
        <p class="hint">상태: 미사용(주소 미등록) · 등록(주소 등록됨) · 사용(손님 접속 있음)</p>
      </div>
    </div>
  `, true);
  $('#bf').value = admin.batch;
  drawRows();
  $('#q').oninput = e => { admin.q = e.target.value; drawRows(); };
  $('#bf').onchange = e => { admin.batch = e.target.value; drawRows(); };
  $('#gen').onclick = generate;
  $('#cnt').onkeydown = e => { if (e.key === 'Enter') generate(); };
  $('#csv-maker').onclick = () => download('nfc-tags-manufacturer-demo.csv', [['번호', '태그 접속 URL'], ...[...tags.values()].map(t => [t.id, tagUrl(t.id)])]);
  $('#csv-pin').onclick = () => download('nfc-tags-pin-internal-demo.csv', [['번호', 'PIN'], ...[...tags.values()].map(t => [t.id, t.pin])]);
  $('#app').onclick = e => {
    const b = e.target.closest('[data-qr]');
    if (b) showQr(b.dataset.qr);
  };
}

function drawRows() {
  const q = admin.q.trim().toUpperCase();
  const list = [...tags.values()].filter(t =>
    (admin.batch === 'all' || String(t.batch) === admin.batch) &&
    (!q || t.id.includes(q) || t.store.toUpperCase().includes(q)));
  $('#rows').innerHTML = list.length ? list.map(t => {
    const s = statusOf(t);
    return `<tr><td class="mono">${t.id}</td><td class="mono">${t.pin}</td><td>${t.store ? esc(t.store) : '<span class="muted">-</span>'}</td>
      <td>${t.links.length}개</td><td><span class="st ${s}">${STATUS[s]}</span>${t.fails >= PIN_MAX_FAIL ? '<span class="st locked">잠금</span>' : ''}</td>
      <td>${t.batch ? t.batch + '차' : '시연'}</td><td><button class="btn sm" data-qr="${t.id}">QR</button></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">검색 결과가 없습니다.</td></tr>';
}

function generate() {
  const n = Number($('#cnt').value);
  admin.ok = false;
  if (!Number.isInteger(n) || n < 1) admin.msg = '1 이상의 숫자를 입력해 주세요.';
  else if (n > BATCH_MAX) admin.msg = `한 번에 최대 ${BATCH_MAX}개까지 생성할 수 있습니다.`;
  else if (generated + n > SESSION_MAX) admin.msg = `시연판은 ${SESSION_MAX}개까지 생성할 수 있습니다. (남은 수 ${SESSION_MAX - generated}개)`;
  else {
    const no = batches.length + 1;
    for (let i = 0; i < n; i++) addTag(newId(), String(rand(10000)).padStart(4, '0'), '', [], no);
    generated += n;
    batches.push({ no, count: n, at: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) });
    admin.msg = `${no}차 ${n}개를 생성했습니다.`;
    admin.ok = true;
    admin.batch = 'all';
  }
  viewAdmin();
}

function csvCell(v) {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function download(name, rows) {
  const text = '﻿' + [CSV_MARK, ...rows.map(r => r.map(csvCell).join(','))].join('\r\n') + '\r\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(name + ' 내려받기');
}

function showQr(id) {
  $('#modal').innerHTML = `<div class="overlay" id="ov"><div class="sheet" role="dialog" aria-modal="true" aria-label="태그 QR">
    <b>${id}</b>${qrSvg(tagUrl(id), 6)}<p class="muted small"><code>${esc(tagUrl(id))}</code></p>
    <button class="btn block" id="close">닫기</button></div></div>`;
  const close = () => { $('#modal').innerHTML = ''; };
  $('#close').onclick = close;
  $('#ov').onclick = e => { if (e.target.id === 'ov') close(); };
  $('#close').focus();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#modal').innerHTML = ''; });
addEventListener('hashchange', route);
route();
})();
