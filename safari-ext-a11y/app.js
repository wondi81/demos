(() => {
'use strict';
const $ = (id) => document.getElementById(id);

/* ---------- 1. manifest 호환성 점검기 ---------- */

/* MDN browser-compat-data (webextensions/api/<name>.json), 가져온 날짜 2026-11-02.
   값: c=Chrome, s=Safari macOS, i=Safari iOS. false=미지원, "mirror"=Safari와 동일(BCD 규칙).
   출처: https://raw.githubusercontent.com/mdn/browser-compat-data/main/webextensions/api/<name>.json
   404(파일 없음): tts, offscreen, contextMenus -> 크롬 전용 이름. 사파리는 contextMenus 대신 menus 사용.
   그래서 tts·offscreen은 "Safari 미지원(크롬 전용 API)"으로 표기하고, contextMenus는 menus 수치를 빌려 쓴다. */
const BCD = {
  notifications: { c: '28',  s: false,  i: 'mirror' },
  alarms:        { c: '22',  s: '14',   i: '15' },
  storage:       { c: '19',  s: '14',   i: '15',
                   sub: [['storage.session', '102', '16.4', 'mirror'], ['storage.managed', '33', false, 'mirror']] },
  scripting:     { c: '88',  s: '15.4', i: 'mirror',
                   sub: [['scripting.ExecutionWorld', '102', '27.2', 'mirror']] },
  tabs:          { c: '4',   s: '14',   i: '15',
                   sub: [['tabs.group', '88', false, 'mirror'], ['tabs.discard', '54', false, 'mirror']] },
  runtime:       { c: '22',  s: '14',   i: '15',
                   sub: [['runtime.sendNativeMessage', '29', '14', '15'], ['runtime.getContexts', '116', false, 'mirror']] },
  menus:         { c: '6',   s: '14',   i: false },
  i18n:          { c: '17',  s: '14',   i: '15' },
  tts:           { chromeOnly: true },      // webextensions/api/tts.json 404
  offscreen:     { chromeOnly: true },      // webextensions/api/offscreen.json 404
};

// manifest 권한 -> BCD 키와 한 줄 설명. warn=true면 수치가 지원이어도 '주의'.
const PERM = {
  notifications: { k: 'notifications', note: 'iOS에서는 확장 알림 API가 없어, 앱 쪽 로컬 알림(UNUserNotificationCenter)으로 전달하고 확장은 browser.runtime.sendNativeMessage로 일정만 넘기는 구조로 보완.' },
  alarms:        { k: 'alarms', warn: true, note: '지원되지만 iOS 백그라운드는 수시로 중단(suspend)됩니다. 정해진 시각에 깨어나는지 실기기 확인이 필요하고, 일정은 storage에 저장해 둬야 합니다.' },
  storage:       { k: 'storage', warn: true, note: 'local·sync는 지원. session은 16.4 이상이고 managed는 미지원이라 쓰는 영역만 확인하면 됩니다.' },
  scripting:     { k: 'scripting', warn: true, note: '15.4 이상 지원. 페이지 컨텍스트(MAIN world) 주입은 더 높은 버전만 가능합니다.' },
  tabs:          { k: 'tabs', warn: true, note: '핵심 메서드는 지원. group·discard 같은 일부 메서드는 미지원이라 쓰는 메서드를 코드에서 확인합니다.' },
  tts:           { k: 'tts', note: 'Safari 미지원(크롬 전용 API). 웹 Speech(speechSynthesis) 또는 앱의 AVSpeechSynthesizer로 대체.' },
  offscreen:     { k: 'offscreen', note: 'Safari 미지원(크롬 전용 API). 오디오·DOM 작업은 콘텐츠 스크립트나 확장 페이지로 옮기거나 앱에 위임.' },
  contextMenus:  { k: 'menus', alias: true, note: 'MDN에 contextMenus 파일 없음(크롬 전용 이름). 사파리는 menus이며 수치도 menus 기준. iOS는 컨텍스트 메뉴 자체가 없어 팝업·툴바 버튼으로 대체.' },
  nativeMessaging: { k: 'runtime', sub0: 'runtime.sendNativeMessage', note: '앱과 일정을 주고받는 통로. 사파리 확장은 앱 번들 안에서만 동작하며 호스트 이름 대신 앱 확장 핸들러로 연결됩니다.' },
};

const SAMPLE = {
  manifest_version: 3,
  name: '강의 알림 도우미 (가상)',
  version: '1.4.0',
  description: '온라인 강의 중 정해진 시각에 알림을 읽어 주고 대체자료 문서를 맞춰 주는 보조 도구',
  permissions: ['notifications', 'alarms', 'storage', 'tts', 'offscreen', 'contextMenus', 'scripting', 'tabs'],
  host_permissions: ['https://lecture.example.com/*'],
  background: { service_worker: 'background.js' },
  content_scripts: [{ matches: ['https://lecture.example.com/*'], js: ['content.js'], run_at: 'document_idle' }],
  action: { default_popup: 'popup.html', default_title: '강의 알림 도우미' },
};
const SAMPLE_TEXT = JSON.stringify(SAMPLE, null, 2);

const resolve = (v, s) => (v === 'mirror' ? s : v);
// 셀 하나를 {t:표시글, k:y|n|u} 로
function cell(v) {
  if (v === 'chrome-only') return { t: '– 크롬 전용', k: 'u' };
  if (v === false || v == null) return { t: '✕ 미지원', k: 'n' };
  return { t: '✓ ' + String(v).replace('≤', '') + '+', k: 'y' };
}
function verdict(kinds, warn) {
  if (kinds.includes('n')) return ['bad', '대체 필요'];
  if (warn) return ['warn', '주의'];
  return ['ok', '문제없음'];
}
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function row(label, cells, v, note, sub) {
  const tr = el('tr');
  tr.append(el('td', 'api', label));
  cells.forEach((c) => tr.append(el('td', 'sup ' + c.k, c.t)));
  const td = el('td'); td.append(el('span', 'bdg ' + v[0], v[1])); tr.append(td);
  const m = el('td', 'memo', note);
  if (sub && sub.length) {
    m.append(el('span', 'sub', '세부: ' + sub.map(([n, , s]) => n + ' ' + cell(s).t.replace('✓ ', 'Safari ').replace('✕ ', '')).join(' · ')));
  }
  tr.append(m);
  ['권한·API','Chrome','Safari macOS','Safari iOS','판정','메모'].forEach((l,i)=>{ if(tr.cells[i]) tr.cells[i].dataset.l=l; });
  return tr;
}
const manualRow = (label, v, note) => row(label, ['–', '–', '–'].map((t) => ({ t, k: 'u' })), v, note);

function check() {
  const err = $('mErr'), res = $('result'), body = $('tbl').tBodies[0];
  err.hidden = true; res.hidden = true; body.textContent = '';
  let m;
  try { m = JSON.parse($('manifest').value); }
  catch (e) {
    err.textContent = 'JSON 형식이 올바르지 않습니다. 쉼표·따옴표·괄호를 확인해 주세요. (' + e.message + ')';
    err.hidden = false; return;
  }
  if (!m || typeof m !== 'object' || Array.isArray(m)) {
    err.textContent = 'manifest는 { } 로 감싼 객체여야 합니다.'; err.hidden = false; return;
  }
  const perms = Array.isArray(m.permissions) ? m.permissions : [];
  const rows = [];
  const add = (p) => {
    const spec = PERM[p];
    if (!spec) { rows.push(['warn', manualRow(p, ['warn', '주의'], '이 시연의 점검표에 없는 권한입니다. 사파리 지원 여부를 직접 확인해야 합니다.')]); return; }
    const d = BCD[spec.k];
    const label = spec.alias ? p + ' → menus' : p;
    const cells = d.chromeOnly
      ? [cell('chrome-only'), cell(false), cell(false)]
      : [cell(d.c), cell(d.s), cell(resolve(d.i, d.s))];
    const v = verdict(cells.map((c) => c.k), spec.warn);
    const sub = spec.sub0 ? d.sub.filter((x) => x[0] === spec.sub0) : d.sub;
    const tr = row(label, cells, v, spec.note, spec.sub0 ? null : sub);
    if (spec.sub0) { const x = d.sub[0]; tr.cells[1].textContent = cell(x[1]).t; tr.cells[2].textContent = cell(x[2]).t; tr.cells[3].textContent = cell(resolve(x[3], x[2])).t; }
    rows.push([v[0], tr]);
  };
  perms.forEach((p) => add(String(p)));
  if (!perms.includes('nativeMessaging')) {
    const tr = row('nativeMessaging (추가 필요)', [cell('29'), cell('14'), cell('15')], ['warn', '주의'], 'iOS 알림 대체 구조에 필요합니다. 현재 manifest에는 없어 새로 추가해야 합니다. runtime.sendNativeMessage는 Safari 14·iOS 15 이상 지원.');
    rows.push(['warn', tr]);
  }
  const bg = m.background && (m.background.service_worker || (m.background.scripts || []).join(', '));
  rows.push(['warn', manualRow('background' + (m.background && m.background.service_worker ? '.service_worker' : ''), ['warn', '주의'], 'iOS는 비상주(non-persistent) 백그라운드만 허용합니다. 서비스 워커가 수시로 멈춰 전역 변수와 setTimeout 상태가 사라지므로, 일정은 storage에 저장하고 alarms로 다시 깨우는 구조가 필요합니다.' + (bg ? '' : ' (이 manifest에는 background 항목이 없습니다.)') )]);
  const hosts = [].concat(m.host_permissions || [], ...(m.content_scripts || []).map((c) => c.matches || []));
  const uniq = [...new Set(hosts)];
  rows.push(['warn', manualRow('host_permissions · content_scripts', ['warn', '주의'], (uniq.length ? uniq.join(', ') + ' 에서 동작. ' : '대상 사이트가 지정돼 있지 않습니다. ') + '사파리는 사이트별로 사용자가 웹사이트 접근을 직접 허용해야 해서 첫 실행 안내 화면이 필요합니다.')]);

  rows.forEach(([, tr]) => body.append(tr));
  const n = { ok: 0, warn: 0, bad: 0 };
  rows.forEach(([k]) => { n[k]++; });
  const sum = $('sum'); sum.textContent = '';
  [['ok', '문제없음 ' + n.ok], ['warn', '주의 ' + n.warn], ['bad', '대체 필요 ' + n.bad]].forEach(([k, t]) => sum.append(el('span', 'bdg ' + k, t)));
  if (m.manifest_version !== 3) sum.append(el('span', 'bdg warn', 'manifest_version이 3이 아님'));
  res.hidden = false;
}

$('manifest').value = SAMPLE_TEXT;
$('check').addEventListener('click', check);
$('resetM').addEventListener('click', () => { $('manifest').value = SAMPLE_TEXT; $('result').hidden = true; $('mErr').hidden = true; });

/* ---------- 2. 강의 알림 접근성 미리보기 ---------- */

const ALERTS = [
  { t: 5, msg: '3쪽 표 설명 시작' },
  { t: 12, msg: '그래프 대체 설명' },
  { t: 20, msg: '퀴즈' },
];
const TOTAL = 25; // 분. 1초 = 1분
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

// 색 대비(WCAG 상대 휘도). 아래 색은 style.css의 .before.on / .after.on 과 같은 값
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(1); };
$('crB').textContent = ratio('#b8a56a', '#ffe08a');
$('crA').textContent = ratio('#191f28', '#fff4e0');

let min = 0, timer = null, last = null, prevFocus = null;
const tl = $('tl'), before = $('before'), after = $('after');
ALERTS.forEach((a, i) => {
  const li = el('li'); li.dataset.i = i;
  li.append(el('b', null, hhmm(a.t)), document.createTextNode(' ' + a.msg));
  tl.append(li);
});

function announce(a) {
  last = a;
  before.textContent = hhmm(a.t) + ' ' + a.msg;
  before.classList.add('on');
  after.textContent = ''; // 비웠다가 다시 채워야 같은 문구도 다시 읽힘
  setTimeout(() => {
    const b = el('b', null, hhmm(a.t));
    after.replaceChildren(b, document.createTextNode(a.msg));
    after.classList.add('on');
    $('close').hidden = false;
    if ($('optFocus').checked) {
      if (!after.contains(document.activeElement) && document.activeElement !== $('close')) prevFocus = document.activeElement;
      after.focus();
    }
  }, 60);
}
function repeat() {
  if (last) announce(last);
  else { after.textContent = ''; setTimeout(() => { after.textContent = '아직 받은 알림이 없습니다.'; }, 60); }
}
function render() {
  $('clk').textContent = hhmm(min);
  $('fill').style.width = (min / TOTAL * 100) + '%';
  [...tl.children].forEach((li, i) => li.classList.toggle('done', min >= ALERTS[i].t));
}
function stop() { clearInterval(timer); timer = null; $('play').textContent = '재생'; }
function tick() {
  min++;
  render();
  const a = ALERTS.find((x) => x.t === min);
  if (a) announce(a);
  if (min >= TOTAL) stop();
}
function reset() {
  stop(); min = 0; last = null; render();
  before.textContent = '대기 중'; before.classList.remove('on');
  after.textContent = ''; after.classList.remove('on'); $('close').hidden = true;
}
$('play').addEventListener('click', () => {
  if (timer) { stop(); return; }
  if (min >= TOTAL) reset();
  $('play').textContent = '일시정지';
  timer = setInterval(tick, 1000);
});
$('rst').addEventListener('click', reset);
$('again').addEventListener('click', repeat);
$('close').addEventListener('click', () => {
  after.textContent = ''; after.classList.remove('on'); $('close').hidden = true;
  (prevFocus && document.contains(prevFocus) ? prevFocus : $('play')).focus();
});
$('big').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', on);
  before.classList.toggle('lg', on); after.classList.toggle('lg', on);
});
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.code === 'KeyR') { e.preventDefault(); repeat(); } // 맥은 Option+R이 ® 로 입력되므로 code로 비교
});
render();
})();
