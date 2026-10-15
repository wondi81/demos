/* Margin DS showcase - vanilla JS, no dependencies. All data is fictional. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var icon = function (id, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------------- segmented radio helper ---------------- */
  function bindSeg(group, onPick) {
    $$('[role="radio"]', group).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[role="radio"]', group).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
        if (onPick) onPick(b);
      });
    });
  }

  /* ---------------- theme + brand ---------------- */
  var listeners = [];
  function onThemeChange(fn) { listeners.push(fn); }
  function syncControls() {
    var t = root.getAttribute('data-theme');
    var br = root.getAttribute('data-brand') || 'teal';
    $$('[data-set-theme]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.setTheme === t)); });
    $$('[data-set-brand]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.setBrand === br)); });
  }
  function setTheme(t) { root.setAttribute('data-theme', t); store.set('mds-theme', t); syncControls(); listeners.forEach(function (f) { f(); }); }
  function setBrand(b) { if (b === 'teal') root.removeAttribute('data-brand'); else root.setAttribute('data-brand', b); syncControls(); listeners.forEach(function (f) { f(); }); }
  $$('[data-set-theme]').forEach(function (b) { b.addEventListener('click', function () { setTheme(b.dataset.setTheme); }); });
  $$('[data-set-brand]').forEach(function (b) { b.addEventListener('click', function () { setBrand(b.dataset.setBrand); }); });
  syncControls();

  /* ---------------- color resolving ---------------- */
  var probeHost = document.createElement('div');
  probeHost.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
  document.body.appendChild(probeHost);
  var probes = {};
  ['light', 'dark'].forEach(function (m) { var p = document.createElement('div'); p.setAttribute('data-theme', m); probeHost.appendChild(p); probes[m] = p; });
  function resolve(name, mode) {
    var p = probes[mode];
    p.style.color = 'var(' + name + ')';
    return getComputedStyle(p).color;
  }
  function parseRGB(s) {
    var m = s.match(/[\d.]+/g);
    if (!m) return [0, 0, 0];
    if (s.indexOf('color(') === 0) return [m[0] * 255, m[1] * 255, m[2] * 255];
    return [+m[0], +m[1], +m[2]];
  }
  function hex(s) { return '#' + parseRGB(s).map(function (v) { return Math.round(v).toString(16).padStart(2, '0'); }).join(''); }
  function lum(rgb) {
    var a = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function ratio(a, b) {
    var l1 = lum(parseRGB(a)), l2 = lum(parseRGB(b));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /* ---------------- primitives ---------------- */
  var RAMPS = {
    gray: ['0', '50', '100', '200', '300', '400', '500', '600', '700', '750', '800', '850', '900', '950'],
    brand: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
    red: ['50', '200', '300', '500', '600', '700', '900'],
    amber: ['50', '200', '300', '500', '700', '900'],
    blue: ['50', '200', '300', '500', '700', '900'],
    green: ['50', '300', '600', '700', '900']
  };
  function primMap() {
    var map = {};
    Object.keys(RAMPS).forEach(function (r) {
      RAMPS[r].forEach(function (s) { map[hex(resolve('--' + r + '-' + s, 'light'))] = r + '-' + s; });
    });
    return map;
  }
  function renderRamps() {
    $('#ramps').innerHTML = Object.keys(RAMPS).map(function (r) {
      return '<div class="ramp"><span class="ramp-name">' + r + '</span><div class="ramp-cells">' + RAMPS[r].map(function (s) {
        var c = resolve('--' + r + '-' + s, 'light');
        var fg = lum(parseRGB(c)) > 0.4 ? 'var(--gray-900)' : 'var(--gray-0)';
        return '<span class="ramp-cell" style="background:var(--' + r + '-' + s + ');color:' + fg + '" title="--' + r + '-' + s + ' ' + hex(c) + '">' + s + '</span>';
      }).join('') + '</div></div>';
    }).join('');
  }

  /* ---------------- semantic table ---------------- */
  var SEM = [
    ['배경', ['bg-canvas', 'bg-surface', 'bg-subtle', 'bg-muted', 'bg-inverse', 'bg-brand', 'bg-brand-hover', 'bg-brand-subtle', 'bg-danger', 'bg-danger-subtle', 'bg-success-subtle', 'bg-warning-subtle', 'bg-info-subtle']],
    ['글자', ['text-default', 'text-muted', 'text-subtle', 'text-disabled', 'text-on-brand', 'text-brand', 'text-danger', 'text-success', 'text-warning', 'text-info']],
    ['테두리', ['border-default', 'border-strong', 'border-input', 'border-focus', 'border-danger']],
    ['첨삭 주석', ['annot-spelling-bg', 'annot-spelling-line', 'annot-spelling-fg', 'annot-expression-bg', 'annot-expression-line', 'annot-expression-fg', 'annot-logic-bg', 'annot-logic-line', 'annot-logic-fg']],
    ['차트', ['chart-1', 'chart-2', 'chart-3', 'chart-grid']]
  ];
  function renderSemantic() {
    var pm = primMap();
    var cell = function (v) { var h = hex(v); return '<div class="tv"><i style="background:' + h + '"></i>' + (pm[h] || h) + '<span>' + h + '</span></div>'; };
    $('#semanticTable tbody').innerHTML = SEM.map(function (g) {
      return '<tr class="grp"><td colspan="4">' + g[0] + '</td></tr>' + g[1].map(function (t) {
        var name = '--color-' + t;
        var dot = 'color.' + t.replace('-', '.');
        return '<tr><td class="tn">' + dot + '</td><td class="cv">' + name + '</td><td>' + cell(resolve(name, 'light')) + '</td><td>' + cell(resolve(name, 'dark')) + '</td></tr>';
      }).join('');
    }).join('');
  }

  /* ---------------- contrast ---------------- */
  var PAIRS = [
    ['text-default', 'bg-surface', '본문 글자'],
    ['text-muted', 'bg-surface', '보조 글자'],
    ['text-subtle', 'bg-surface', 'placeholder'],
    ['text-on-brand', 'bg-brand', '주요 버튼'],
    ['text-brand', 'bg-surface', '링크 · 강조'],
    ['text-danger', 'bg-surface', '오류 문구'],
    ['text-warning', 'bg-warning-subtle', '경고 배지'],
    ['text-success', 'bg-success-subtle', '완료 배지'],
    ['annot-spelling-fg', 'annot-spelling-bg', '표기 첨삭'],
    ['annot-expression-fg', 'annot-expression-bg', '표현 첨삭'],
    ['annot-logic-fg', 'annot-logic-bg', '논리 첨삭'],
    ['text-default', 'annot-expression-bg', '하이라이트 본문']
  ];
  function renderContrast() {
    $('#contrastGrid').innerHTML = PAIRS.map(function (p) {
      var fg = '--color-' + p[0], bg = '--color-' + p[1];
      var rl = ratio(resolve(fg, 'light'), resolve(bg, 'light'));
      var rd = ratio(resolve(fg, 'dark'), resolve(bg, 'dark'));
      var badge = function (r) { return r >= 4.5 ? '<span class="ct-pass">' + icon('check') + r.toFixed(1) + '</span>' : '<span class="ct-fail">' + icon('x') + r.toFixed(1) + '</span>'; };
      return '<div class="ct"><div class="ct-sample" style="color:var(' + fg + ');background:var(' + bg + ')">' + p[2] + ' 가나다 Aa</div>' +
        '<div class="ct-meta"><span>라이트 ' + badge(rl) + '</span><span>다크 ' + badge(rd) + '</span></div></div>';
    }).join('');
  }

  /* ---------------- type / space / radius / elevation ---------------- */
  var TYPE = [
    ['display', '32/40 · 600', '글결 디자인 시스템'],
    ['title-lg', '24/32 · 600', '과제별 제출 현황'],
    ['title-md', '20/28 · 600', '청소년 SNS 사용 시간'],
    ['title-sm', '17/24 · 600', 'AI 총평 초안'],
    ['body-lg', '16/28 · 400', '첫째, SNS는 청소년이 정보를 얻고 친구와 소통하는 수단이다.'],
    ['body-md', '15/24 · 400', '근거의 출처를 밝히면 주장 전체의 신뢰도가 올라갑니다.'],
    ['body-sm', '13/20 · 400', '6월 10일 21:42 제출 · 1,124자'],
    ['caption', '12/16 · 500', '검토 필요 17']
  ];
  function renderScales() {
    $('#typeScale').innerHTML = TYPE.map(function (t) {
      return '<div class="ts-row"><span class="ts-sample" style="font:var(--text-' + t[0] + ')">' + t[2] + '</span><span class="ts-meta">text.' + t[0] + '<br>' + t[1] + '</span></div>';
    }).join('');
    $('#spaceScale').innerHTML = [['1', 4], ['2', 8], ['3', 12], ['4', 16], ['5', 20], ['6', 24], ['8', 32], ['10', 40], ['12', 48], ['16', 64]].map(function (s) {
      return '<div class="sp-row"><span>space.' + s[0] + '</span><span>' + s[1] + '</span><i class="sp-bar" style="width:var(--space-' + s[0] + ')"></i></div>';
    }).join('');
    $('#radiusScale').innerHTML = [['sm', 4, '체크박스'], ['md', 8, '버튼 · 입력'], ['lg', 12, '카드 · 패널'], ['xl', 16, '모달 · 시트'], ['full', '999', '배지 · 칩']].map(function (r) {
      return '<div class="rd"><i style="border-radius:var(--radius-' + r[0] + ')"></i>radius.' + r[0] + ' · ' + r[1] + '<small>' + r[2] + '</small></div>';
    }).join('');
    $('#elevScale').innerHTML = [['1', '카드 hover · 선택된 탭'], ['2', '드롭다운 · 고정 패널'], ['3', '모달 · 토스트']].map(function (e) {
      return '<div class="el" style="box-shadow:var(--shadow-' + e[0] + ')">shadow.' + e[0] + '<small>' + e[1] + '</small></div>';
    }).join('');
  }

  /* ---------------- screen map ---------------- */
  var MAP = [
    ['교사용', 'users', [['과제별 제출 현황', 'PC · M', true], ['AI 채점 검토 · 수정', 'PC · M', true], ['루브릭 설정', 'PC', false]], 5],
    ['학생용', 'pen', [['첨삭 보기', 'PC · M', true], ['고쳐 쓴 글 비교', 'M', true]], 3],
    ['리포트', 'chart', [['학급 성장 리포트', 'PC · M', true], ['개인 성장 리포트', 'PC · M', true]], 4]
  ];
  $('#screenMap').innerHTML = MAP.map(function (c) {
    return '<div class="sm-col"><h4>' + icon(c[1]) + c[0] + '<span class="count-chip">' + c[3] + '개</span></h4><ul>' + c[2].map(function (s) {
      return '<li><span class="nm">' + s[0] + '</span>' + (s[2] ? '<span class="tag tag-brand">시안 포함</span>' : '') + '<span class="dv">' + s[1] + '</span></li>';
    }).join('') + '</ul></div>';
  }).join('');

  /* ---------------- components ---------------- */
  (function buttons() {
    var states = [['default', ''], ['hover', 'is-hover'], ['focus', 'is-focus'], ['disabled', 'dis'], ['loading', 'is-loading']];
    var rows = [['primary', '공개하기'], ['secondary', '임시 저장'], ['ghost', '취소'], ['danger', '삭제']];
    var head = '<thead><tr><th></th>' + states.map(function (s) { return '<th>' + s[0] + '</th>'; }).join('') + '<th class="live">직접 눌러 보기</th></tr></thead>';
    var body = rows.map(function (r) {
      return '<tr><th scope="row">' + r[0] + '</th>' + states.map(function (s) {
        var dis = s[1] === 'dis';
        return '<td><button class="btn btn-' + r[0] + ' btn-md ' + (dis ? '' : s[1]) + '" type="button" tabindex="-1" ' + (dis ? 'disabled' : '') + ' aria-hidden="true">' + r[1] + '</button></td>';
      }).join('') + '<td><button class="btn btn-' + r[0] + ' btn-md" type="button" data-live-btn>' + r[1] + '</button></td></tr>';
    }).join('');
    $('#btnMatrix').innerHTML = head + '<tbody>' + body + '</tbody>';
    $('#btnSizes').innerHTML = '<span class="sz-label">size</span>' +
      '<button class="btn btn-primary btn-sm" type="button">' + icon('check') + 'sm 32</button>' +
      '<button class="btn btn-primary btn-md" type="button">' + icon('check') + 'md 40</button>' +
      '<button class="btn btn-primary btn-lg" type="button">' + icon('check') + 'lg 48</button>' +
      '<button class="btn btn-secondary btn-md" type="button">' + icon('pen') + 'icon=leading</button>';
    $$('[data-live-btn]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.classList.add('is-loading');
        setTimeout(function () { b.classList.remove('is-loading'); }, 900);
      });
    });
  })();

  (function inputs() {
    var st = [['default', ''], ['hover', 'is-hover'], ['focus', 'is-focus'], ['disabled', 'dis'], ['error', 'err']];
    var html = st.map(function (s) {
      var err = s[1] === 'err', dis = s[1] === 'dis';
      return '<div><span class="im-state">' + s[0] + '</span><label class="field' + (err ? ' is-error' : '') + '"><span class="field-label">내용 점수</span>' +
        '<input class="input ' + (err || dis ? '' : s[1]) + '" ' + (dis ? 'disabled' : '') + ' value="' + (err ? '28' : (s[0] === 'default' ? '' : '19')) + '" placeholder="0~25" tabindex="-1" aria-hidden="true">' +
        '<span class="field-help">' + (err ? icon('alert') + '0~25 사이로 입력해 주세요.' : '최대 25점') + '</span></label></div>';
    }).join('');
    html += '<div><span class="im-state live">직접 입력해 보기</span><label class="field" id="liveField"><span class="field-label">내용 점수</span>' +
      '<input class="input" id="liveInput" inputmode="numeric" placeholder="0~25" aria-describedby="liveHelp">' +
      '<span class="field-help" id="liveHelp">최대 25점</span></label></div>';
    $('#inputMatrix').innerHTML = html;
    var f = $('#liveField'), inp = $('#liveInput'), help = $('#liveHelp');
    inp.addEventListener('input', function () {
      var v = inp.value.trim();
      var bad = v !== '' && (!/^\d+$/.test(v) || +v > 25);
      f.classList.toggle('is-error', bad);
      inp.setAttribute('aria-invalid', String(bad));
      help.innerHTML = bad ? icon('alert') + '0~25 사이 정수로 입력해 주세요.' : '최대 25점';
    });
    $('#inputSizes').innerHTML = '<span class="sz-label">size</span>' + [['sm', 32], ['md', 40], ['lg', 48]].map(function (s) {
      return '<label class="field field-' + s[0] + '"><span class="sr-only">' + s[0] + ' 입력</span><span class="input-wrap">' + icon('search') + '<input class="input" placeholder="' + s[0] + ' ' + s[1] + ' · 학생 찾기"></span></label>';
    }).join('');
  })();

  $('#demoList').innerHTML = [
    ['default', '', '김서윤', '6월 10일 제출', '<span class="badge badge-warning">검토 필요</span>'],
    ['hover', 'is-hover', '이도현', '6월 10일 제출', '<span class="li-score">77</span>'],
    ['selected', 'is-selected', '박지호', '교사 수정 2항목', '<span class="li-score is-edited">84</span>'],
    ['disabled', 'is-disabled', '최하린', '미제출', '<span class="badge badge-neutral">미제출</span>']
  ].map(function (r) {
    return '<li><button class="li ' + r[1] + '" type="button" ' + (r[0] === 'disabled' ? 'disabled' : '') + '><span class="li-state">' + r[0] + '</span><span class="avatar avatar-sm">' + r[2][0] + '</span><span class="li-main"><span class="li-title">' + r[2] + '</span><span class="li-sub">' + r[3] + '</span></span>' + r[4] + '</button></li>';
  }).join('');

  $('#alertsDemo').innerHTML = [
    ['info', 'info', 'AI 채점이 끝났습니다', '17명의 점수를 검토해 주세요.', '검토 시작'],
    ['success', 'check-c', '12명에게 공개했습니다', '학생 화면에 점수와 총평이 보입니다.', ''],
    ['warning', 'warn', '2명이 아직 제출하지 않았습니다', '마감은 6월 12일(목)입니다.', '알림 보내기'],
    ['danger', 'alert', '3명의 글을 채점하지 못했습니다', '200자보다 짧은 글은 AI가 채점하지 않습니다.', '다시 시도']
  ].map(function (a) {
    return '<div class="alert alert-' + a[0] + '" role="' + (a[0] === 'danger' ? 'alert' : 'status') + '">' + icon(a[1]) + '<div class="alert-body"><b>' + a[2] + '</b>' + a[3] + '</div>' + (a[4] ? '<button class="alert-link" type="button">' + a[4] + '</button>' : '') + '</div>';
  }).join('');

  /* tabs & segments (generic) */
  $$('.tabs').forEach(function (tl) {
    $$('.tab', tl).forEach(function (t) {
      t.addEventListener('click', function () {
        if (t.disabled) return;
        $$('.tab', tl).forEach(function (x) { x.setAttribute('aria-selected', String(x === t)); });
        tl.dispatchEvent(new CustomEvent('pick', { detail: t }));
      });
    });
  });
  $$('.seg').forEach(function (g) { if (!g.closest('.side-controls') && !g.classList.contains('device-seg') && !g.id) bindSeg(g); });

  /* ---------------- toast ---------------- */
  var toastBox = $('#toasts');
  function toast(msg, tone, action) {
    var t = document.createElement('div');
    t.className = 'toast toast-' + (tone || 'success');
    t.setAttribute('role', tone === 'danger' ? 'alert' : 'status');
    t.innerHTML = icon(tone === 'danger' ? 'alert' : 'check-c') + '<span>' + esc(msg) + '</span>' + (action ? '<button type="button">' + action.label + '</button>' : '');
    toastBox.appendChild(t);
    var timer;
    var close = function () { clearTimeout(timer); t.classList.add('is-leaving'); setTimeout(function () { t.remove(); }, 160); };
    var arm = function () { timer = setTimeout(close, 4200); };
    t.addEventListener('mouseenter', function () { clearTimeout(timer); });
    t.addEventListener('mouseleave', arm);
    if (action) $('button', t).addEventListener('click', function () { action.fn(); close(); });
    arm();
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
  }
  $$('[data-toast]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.toast;
      if (k === 'success') toast('총평을 저장했습니다.', 'success');
      else if (k === 'danger') toast('네트워크가 불안정해 저장하지 못했습니다.', 'danger', { label: '다시 시도', fn: function () { toast('저장했습니다.'); } });
      else toast('첨삭 1건을 숨겼습니다.', 'success', { label: '되돌리기', fn: function () { toast('되돌렸습니다.'); } });
    });
  });
  $$('[data-toast-msg]').forEach(function (b) { b.addEventListener('click', function () { toast(b.dataset.toastMsg); }); });

  /* ---------------- modal ---------------- */
  var dlg = $('#modal');
  var modalCb = null;
  function openModal(o) {
    $('#modalTitle').textContent = o.title;
    $('#modalBody').textContent = o.body;
    var ok = $('#modalOk');
    ok.textContent = o.ok;
    ok.className = 'btn btn-md ' + (o.danger ? 'btn-danger' : 'btn-primary');
    $('#modalIcon').innerHTML = o.danger ? icon('alert') : '';
    modalCb = o.onOk || null;
    if (dlg.showModal) dlg.showModal(); else if (window.confirm(o.title) && modalCb) modalCb();
  }
  dlg.addEventListener('close', function () { if (dlg.returnValue === 'ok' && modalCb) modalCb(); modalCb = null; });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close('cancel'); });
  $$('[data-open-modal]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.openModal === 'danger') openModal({ title: '채점 결과를 삭제할까요?', body: 'AI 점수와 교사가 고친 내용이 모두 사라지며 되돌릴 수 없습니다.', ok: '삭제', danger: true, onOk: function () { toast('채점 결과를 삭제했습니다.'); } });
      else openModal({ title: '점수를 학생에게 공개할까요?', body: '공개 후에는 학생 화면에 점수와 총평이 바로 보입니다. 공개 전까지는 언제든 고칠 수 있습니다.', ok: '공개하기', onOk: function () { toast('학생에게 공개했습니다.'); } });
    });
  });

  /* ---------------- device toggles ---------------- */
  $$('.device-seg').forEach(function (g) {
    bindSeg(g, function (b) {
      var frame = g.closest('.sec').querySelector('.frame');
      frame.setAttribute('data-device', b.dataset.device);
      setTimeout(drawCharts, 320);
    });
  });

  /* =========================================================
     ESSAY DATA
     ========================================================= */
  var ESSAY = [
    ['요즘 ', { id: 1, k: 'logic', t: '청소년들은 하루에 평균 3시간 이상 SNS를 사용한다고 한다.' }, ' 그래서 일부 사람들은 법으로 청소년의 SNS 사용 시간을 제한해야 한다고 주장한다. 하지만 나는 법으로 사용 시간을 제한하는 것에 반대한다.'],
    ['첫째, SNS는 청소년이 정보를 얻고 친구와 소통하는 중요한 수단이다. 학교 과제를 위해 자료를 찾거나 모둠 활동을 ', { id: 2, k: 'spelling', t: '할때도' }, ' SNS를 사용한다. 사용 시간을 일괄적으로 제한하면 이런 긍정적인 활용까지 막게 된다.'],
    ['둘째, 법으로 제한해도 실효성이 없다. 부모님 계정을 쓰거나 다른 앱을 사용하면 ', { id: 3, k: 'logic', t: '얼마든지 피할 수 있기 때문이다.' }, ' ', { id: 4, k: 'expression', t: '왜냐하면 규제는 지켜질 수 있을 때 의미가 있다.' }],
    ['따라서 법으로 제한하기보다는 청소년 스스로 사용 시간을 조절하는 능력을 기르도록 학교와 가정에서 ', { id: 5, k: 'logic', t: '교육해야 한다고 생각한다.' }, ' 그렇게 되면 청소년들은 SNS를 ', { id: 6, k: 'expression', t: '더욱 더' }, ' 올바르게 사용하게 될 것이다.']
  ];
  var KLABEL = { spelling: '표기', expression: '표현', logic: '논리' };
  var NOTES = [
    { id: 1, k: 'logic', tag: '근거 출처', fix: ['평균 3시간 이상 … 한다고 한다', '조사 기관을 밝혀 쓰기'], body: '숫자를 근거로 쓸 때는 출처가 있어야 읽는 사람이 믿을 수 있어요. 예: "한 청소년 매체 설문 조사에 따르면"' },
    { id: 2, k: 'spelling', tag: '띄어쓰기', fix: ['할때도', '할 때도'], body: '"때"는 앞말과 띄어 씁니다.' },
    { id: 3, k: 'logic', tag: '반론 다루기', fix: null, body: '"우회할 수 있다"에는 "단속을 강화하면 된다"는 반론이 나올 수 있어요. 이 반론에 답하는 문장을 하나 더하면 논증이 단단해집니다.' },
    { id: 4, k: 'expression', tag: '문장 호응', fix: ['의미가 있다.', '의미가 있기 때문이다.'], body: '"왜냐하면"은 "~때문이다"와 짝을 이룹니다. 앞 문장과 순서를 바꾸면 흐름도 자연스러워져요.' },
    { id: 5, k: 'logic', tag: '결론 구체화', fix: null, body: '어떤 교육인지 예를 하나 들어 보세요. 예: 일주일 동안 사용 시간을 기록하고 스스로 목표 정하기' },
    { id: 6, k: 'expression', tag: '중복 표현', fix: ['더욱 더', '더욱'], body: '같은 뜻의 말이 겹쳤어요.' }
  ];
  function essayHTML(withNums) {
    return ESSAY.map(function (p) {
      return '<p>' + p.map(function (s) {
        if (typeof s === 'string') return esc(s);
        return '<mark class="an an-' + s.k + '" data-id="' + s.id + '" tabindex="0" role="button" aria-label="' + KLABEL[s.k] + ' 첨삭 ' + s.id + '">' + esc(s.t) + (withNums ? '<span class="an-n">' + s.id + '</span>' : '') + '</mark>';
      }).join('') + '</p>';
    }).join('');
  }

  /* =========================================================
     TEACHER
     ========================================================= */
  var NAMES = ['강예린', '김서윤', '이도현', '김민재', '나은우', '문하율', '박지호', '배소율', '서지안', '송태오', '신유나', '안시우', '오서준', '유채원', '윤하람', '이수아', '이준혁', '임다온', '장윤서', '정민준', '조아린', '진우주', '차은호', '최하린', '하도윤', '한지안', '허서연', '홍라온', '황시온', '권이현', '남궁별'];
  var CRIT = [
    { name: '주장과 근거', desc: '주장이 분명하고 근거가 타당한가', max: 25 },
    { name: '구성', desc: '서론·본론·결론이 짜임새 있게 이어지는가', max: 25 },
    { name: '표현', desc: '문장 호응과 어휘가 정확한가', max: 25 },
    { name: '표기', desc: '맞춤법·띄어쓰기를 지켰는가', max: 25 }
  ];
  var DONE = [0, 1, 4, 6, 9, 12, 15, 18, 20, 25, 27, 29];
  var students = NAMES.map(function (n, i) {
    var seed = (i * 37 + 11) % 23;
    var ai = [14 + seed % 9, 15 + (seed * 3) % 8, 13 + (seed * 5) % 9, 16 + (seed * 7) % 7];
    var st = i === 23 || i === 30 ? 'none' : (DONE.indexOf(i) > -1 ? 'done' : 'todo');
    return { no: i + 1, name: n, ai: ai, t: ai.slice(), st: st, time: '6월 ' + (9 + i % 3) + '일 ' + (17 + i % 6) + ':' + String((i * 13) % 60).padStart(2, '0') };
  });
  var me = students[2];
  me.ai = [18, 21, 18, 20]; me.t = me.ai.slice(); me.st = 'todo'; me.time = '6월 10일 21:42';
  var cur = me;
  var AI_COMMENT = '주장이 처음부터 끝까지 분명하고, 근거를 "첫째, 둘째"로 나눠 읽기 쉽게 썼습니다. 다만 첫 문단의 사용 시간 수치에 출처가 없고, "우회할 수 있다"는 근거에 예상되는 반론을 다루지 않아 설득력이 약해졌습니다. 결론에서 말한 교육의 예를 한 가지 들어 보세요.';
  var comments = {};
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  var stBadge = { todo: ['warning', '검토 필요'], done: ['success', '검토 완료'], none: ['neutral', '미제출'] };
  var tFilter = 'all', tQuery = '';

  function renderStudents() {
    var list = students.filter(function (s) { return (tFilter === 'all' || s.st === tFilter) && (!tQuery || s.name.indexOf(tQuery) > -1); });
    $('#tStudents').innerHTML = list.length ? list.map(function (s) {
      var edited = sum(s.t) !== sum(s.ai);
      var trailing = s.st === 'none' ? '<span class="badge badge-neutral">미제출</span>' :
        (s.st === 'done' ? '<span class="badge badge-success">완료</span>' : '') + '<span class="li-score' + (edited ? ' is-edited' : '') + '">' + sum(s.t) + '</span>';
      return '<li><button class="li" type="button" data-no="' + s.no + '" ' + (s === cur ? 'aria-current="true"' : '') + (s.st === 'none' ? ' disabled' : '') + '>' +
        '<span class="li-main"><span class="li-title">' + s.name + '<small>' + s.no + '번</small></span><span class="li-sub">' + (s.st === 'none' ? '아직 제출하지 않음' : s.time + ' 제출') + '</span></span>' + trailing + '</button></li>';
    }).join('') : '<li class="li-sub" style="padding:16px 12px">조건에 맞는 학생이 없습니다.</li>';
    var done = students.filter(function (s) { return s.st === 'done'; }).length;
    var todo = students.filter(function (s) { return s.st === 'todo'; }).length;
    $('#doneCount').textContent = done;
    $('#todoCount').textContent = todo;
    $('.sb-done').style.flexGrow = done; $('.sb-todo').style.flexGrow = todo;
  }
  $('#tStudents').addEventListener('click', function (e) {
    var b = e.target.closest('.li'); if (!b || b.disabled) return;
    cur = students[+b.dataset.no - 1];
    renderStudents(); renderReview();
    $('#appTeacher').classList.add('is-detail');
  });
  $('#rvBack').addEventListener('click', function () { $('#appTeacher').classList.remove('is-detail'); });
  $('#tFilter').addEventListener('pick', function (e) { tFilter = e.detail.dataset.f; renderStudents(); });
  $('#tSearch').addEventListener('input', function (e) { tQuery = e.target.value.trim(); renderStudents(); });

  function renderReview() {
    $('#rvName').innerHTML = cur.name + ' <small>' + cur.no + '번</small>';
    var b = stBadge[cur.st];
    $('#rvStatus').className = 'badge badge-' + b[0]; $('#rvStatus').textContent = b[1];
    $('#tEssay').innerHTML = essayHTML(true);
    $('#rubric tbody').innerHTML = CRIT.map(function (c, i) {
      var ed = cur.t[i] !== cur.ai[i];
      return '<tr><td><span class="rb-name">' + c.name + '</span><span class="rb-desc">' + c.desc + '</span></td><td class="num rb-ai">' + cur.ai[i] + '</td>' +
        '<td class="num"><span class="stepper' + (ed ? ' is-edited' : '') + '"><button type="button" data-i="' + i + '" data-d="-1" aria-label="' + c.name + ' 1점 내리기" ' + (cur.t[i] <= 0 ? 'disabled' : '') + '>' + icon('minus') + '</button>' +
        '<output aria-live="polite">' + cur.t[i] + '</output><button type="button" data-i="' + i + '" data-d="1" aria-label="' + c.name + ' 1점 올리기" ' + (cur.t[i] >= c.max ? 'disabled' : '') + '>' + icon('plus') + '</button></span></td></tr>';
    }).join('');
    $('#aiTotal').textContent = sum(cur.ai);
    $('#tTotal').textContent = sum(cur.t);
    renderComment();
  }
  $('#rubric').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b) return;
    var i = +b.dataset.i;
    cur.t[i] = Math.max(0, Math.min(CRIT[i].max, cur.t[i] + +b.dataset.d));
    renderReview(); renderStudents();
    var nb = $('#rubric button[data-i="' + i + '"][data-d="' + b.dataset.d + '"]'); if (nb && !nb.disabled) nb.focus();
  });

  function renderComment() {
    var edited = comments[cur.no];
    $('#rcText').textContent = edited || AI_COMMENT;
    $('#rcBadge').hidden = !edited;
    $('#rcRevert').hidden = !edited;
    $('#rcOrig').hidden = !edited;
    $('#rcOrigText').textContent = AI_COMMENT;
    $('#rcEditor').hidden = true; $('#rcText').hidden = false; $('#rcEdit').hidden = false;
  }
  $('#rcEdit').addEventListener('click', function () {
    $('#rcArea').value = comments[cur.no] || AI_COMMENT;
    $('#rcCount').textContent = $('#rcArea').value.length;
    $('#rcEditor').hidden = false; $('#rcText').hidden = true; $('#rcEdit').hidden = true;
    $('#rcArea').focus();
  });
  $('#rcArea').addEventListener('input', function () { $('#rcCount').textContent = this.value.length; });
  $('#rcCancel').addEventListener('click', renderComment);
  $('#rcSave').addEventListener('click', function () {
    var v = $('#rcArea').value.trim();
    if (v && v !== AI_COMMENT) comments[cur.no] = v; else delete comments[cur.no];
    renderComment();
    toast('총평을 반영했습니다. AI 원문은 따로 보관됩니다.');
  });
  $('#rcRevert').addEventListener('click', function () {
    var prev = comments[cur.no];
    delete comments[cur.no]; renderComment();
    toast('AI 원문으로 되돌렸습니다.', 'success', { label: '취소', fn: function () { comments[cur.no] = prev; renderComment(); } });
  });
  $('#rvPublish').addEventListener('click', function () {
    var who = cur;
    openModal({
      title: who.name + ' 학생에게 공개할까요?',
      body: '최종 ' + sum(who.t) + '점과 총평이 학생 화면에 바로 보입니다. 공개 후에도 점수를 고칠 수 있으며, 고치면 학생에게 다시 알립니다.',
      ok: '공개하기',
      onOk: function () {
        var prev = who.st; who.st = 'done';
        renderStudents(); renderReview();
        toast(who.name + ' 학생에게 공개했습니다.', 'success', { label: '되돌리기', fn: function () { who.st = prev; renderStudents(); renderReview(); } });
      }
    });
  });

  /* =========================================================
     STUDENT
     ========================================================= */
  $('#sEssay').innerHTML = essayHTML(true);
  $('#sNotes').innerHTML = NOTES.map(function (n) {
    var fix = n.fix ? '<span class="note-fix"><s>' + esc(n.fix[0]) + '</s>' + icon('chev-r') + '<b>' + esc(n.fix[1]) + '</b></span>' : '';
    return '<div class="note note-' + n.k + '" role="button" tabindex="0" data-id="' + n.id + '" data-k="' + n.k + '"><span class="note-top"><span class="an-' + n.k + '"><span class="an-n">' + n.id + '</span></span>' + KLABEL[n.k] + ' · ' + n.tag + '</span>' + fix + '<span class="note-body">' + esc(n.body) + '</span></div>';
  }).join('');
  var activeNote = null;
  function activate(id, fromText) {
    activeNote = id;
    $$('#sEssay .an').forEach(function (m) { m.classList.toggle('is-active', +m.dataset.id === id); });
    $$('#sNotes .note').forEach(function (n) { n.classList.toggle('is-active', +n.dataset.id === id); });
    var target = fromText ? $('#sNotes .note[data-id="' + id + '"]') : $('#sEssay .an[data-id="' + id + '"]');
    if (target) {
      var r = target.getBoundingClientRect();
      if (r.top < 60 || r.bottom > innerHeight - 20) target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }
  $('#sEssay').addEventListener('click', function (e) { var m = e.target.closest('.an'); if (m && !m.classList.contains('is-dim')) activate(+m.dataset.id, true); });
  $('#sEssay').addEventListener('keydown', function (e) { var m = e.target.closest('.an'); if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activate(+m.dataset.id, true); } });
  $('#sNotes').addEventListener('click', function (e) { var n = e.target.closest('.note'); if (n) activate(+n.dataset.id, false); });
  $('#sNotes').addEventListener('keydown', function (e) { var n = e.target.closest('.note'); if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activate(+n.dataset.id, false); } });
  activate(1, false);
  $$('#sChips .chip').forEach(function (c) {
    c.addEventListener('click', function () {
      var k = c.dataset.k;
      $$('#sChips .chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
      $$('#sEssay .an').forEach(function (m) { m.classList.toggle('is-dim', k !== 'all' && !m.classList.contains('an-' + k)); });
      $$('#sNotes .note').forEach(function (n) { n.hidden = k !== 'all' && n.dataset.k !== k; });
    });
  });
  $('#sTabs').addEventListener('pick', function (e) {
    var p = e.detail.dataset.p;
    $$('#appStudent .s-panel').forEach(function (x) { x.hidden = x.dataset.panel !== p; });
  });

  var V1 = [
    [{ d: '요즘 청소년들은 하루에 평균 3시간 이상 SNS를 사용한다고 한다.' }, { i: '한 청소년 매체의 설문 조사에 따르면 청소년의 하루 평균 SNS 사용 시간은 3시간이 넘는다.' }, ' 그래서 일부 사람들은 법으로 청소년의 SNS 사용 시간을 제한해야 한다고 주장한다. 하지만 나는 법으로 사용 시간을 제한하는 것에 반대한다.'],
    ['첫째, SNS는 청소년이 정보를 얻고 친구와 소통하는 중요한 수단이다. 학교 과제를 위해 자료를 찾거나 모둠 활동을 ', { d: '할때도' }, { i: '할 때도' }, ' SNS를 사용한다. 사용 시간을 일괄적으로 제한하면 이런 긍정적인 활용까지 막게 된다.'],
    ['둘째, 법으로 제한해도 실효성이 없다. ', { i: '규제는 지켜질 수 있을 때 의미가 있다. 그런데 ' }, '부모님 계정을 쓰거나 다른 앱을 사용하면 얼마든지 피할 수 있', { d: '기 때문이다. 왜냐하면 규제는 지켜질 수 있을 때 의미가 있다.' }, { i: '다. 단속을 강화하자는 의견도 있지만, 모든 계정을 확인하려면 개인 정보를 지나치게 들여다봐야 한다.' }],
    ['따라서 법으로 제한하기보다는 청소년 스스로 사용 시간을 조절하는 능력을 기르도록 학교와 가정에서 교육해야 한다', { d: '고 생각한다.' }, { i: '. 예를 들어 일주일 동안 자신의 사용 시간을 기록하고 스스로 목표를 정해 보는 활동을 할 수 있다.' }, ' 그렇게 되면 청소년들은 SNS를 ', { d: '더욱 더' }, { i: '더욱' }, ' 올바르게 사용하게 될 것이다.']
  ];
  function diffHTML() {
    return V1.map(function (p) {
      return '<p>' + p.map(function (s) { return typeof s === 'string' ? esc(s) : s.d ? '<del>' + esc(s.d) + '</del>' : '<ins>' + esc(s.i) + '</ins>'; }).join('') + '</p>';
    }).join('');
  }
  $('#diff').innerHTML = '<div class="diff-col v1"><h4><span>1차 제출 · 6월 10일</span><span>1,124자</span></h4>' + diffHTML() + '</div>' +
    '<div class="diff-col v2"><h4><span>고쳐 쓴 글 · 6월 13일</span><span>1,236자</span></h4>' + diffHTML() + '</div>';
  bindSeg($('#diffMode'), function (b) { $('#diff').setAttribute('data-mode', b.dataset.m); });

  var FINAL = [19, 21, 18, 20];
  var SNOTE = ['근거는 타당하지만 수치의 출처가 빠졌어요.', '서론·본론·결론의 짜임이 분명해요.', '"왜냐하면 ~때문이다" 호응을 다시 확인해요.', '띄어쓰기 한 곳만 고치면 돼요.'];
  $('#scoreList').innerHTML = CRIT.map(function (c, i) {
    return '<div class="sc-row"><div class="sc-top"><b>' + c.name + '</b><span>' + FINAL[i] + '<small>/' + c.max + '</small></span></div><div class="sc-bar"><i style="width:' + (FINAL[i] / c.max * 100) + '%"></i></div><p class="sc-note">' + SNOTE[i] + '</p></div>';
  }).join('');
  $('#sTeacherNote').textContent = '주장이 분명하고 근거를 "첫째, 둘째"로 나눠 읽기 쉬웠어요. 첫 문단 수치에 출처를 밝히고, 반론에 답하는 문장을 하나 더해 보세요.';

  /* =========================================================
     REPORT (inline SVG charts)
     ========================================================= */
  var R = {
    class: {
      title: '학급 성장 리포트',
      line: { main: [68.2, 71.5, 74.1, 78.4], lo: [58, 62, 65, 70], hi: [77, 80, 83, 86], legend: [['1', '학급 평균'], ['band', '중간 50% 범위']] },
      crit: [[15.8, 19.4], [17.2, 19.8], [16.1, 18.3], [19.1, 20.9]],
      kpi: [['평균 점수', '78.4', '점', '1회차보다 +10.2'], ['제출률', '94', '%', '29/31명', 'flat'], ['첨삭 반영률', '71', '%', '고쳐 쓰기에서 반영'], ['교사 수정 비율', '18', '%', 'AI 점수를 고친 항목', 'flat']],
      sum: { lead: '이번 학기, 반 평균이 68.2점에서 78.4점으로 올랐어요.', sub: '네 번의 글쓰기 모두 평균이 올랐고, 특히 "주장과 근거" 항목이 가장 많이 자랐습니다.', good: ['가장 많이 자란 항목', '주장과 근거 +3.6점'], next: ['다음 수업에서 함께 볼 것', '근거의 출처 밝히기 · 17명'] },
      errTitle: '자주 나온 첨삭',
      err: [['spelling', '띄어쓰기', '의존 명사 "때·것·수"', 41], ['expression', '문장 호응', '"왜냐하면 ~때문이다"', 23], ['logic', '근거 출처 누락', '수치·사례에 출처 없음', 17], ['expression', '중복 표현', '"더욱 더", "미리 예약"', 12], ['logic', '반론 다루기 부족', '예상 반론에 답하지 않음', 9]]
    },
    student: {
      title: '이도현 · 개인 성장 리포트',
      line: { main: [61, 66, 72, 78], cmp: [68.2, 71.5, 74.1, 78.4], legend: [['1', '이도현'], ['2', '학급 평균']] },
      crit: [[13, 19], [16, 21], [15, 18], [17, 20]],
      kpi: [['최근 점수', '78', '점', '1회차보다 +17'], ['제출', '4', '/4회', '모두 제출', 'flat'], ['첨삭 반영률', '83', '%', '6건 중 5건 반영'], ['학급 평균과 차이', '-0.4', '점', '1회차엔 -7.2점', 'flat']],
      sum: { lead: '도현이는 네 번의 글쓰기에서 17점이 올랐어요.', sub: '처음엔 학급 평균보다 7점 낮았지만, 4회차에는 평균과 거의 같아졌습니다.', good: ['잘하고 있는 점', '주장을 끝까지 분명하게 지켜요'], next: ['다음 한 걸음', '반론에 답하는 문장 하나 더하기'] },
      errTitle: '도현이가 자주 받은 첨삭',
      err: [['logic', '근거 출처 누락', '4회 중 3회', 3], ['spelling', '띄어쓰기', '"할때", "볼수"', 3], ['logic', '반론 다루기 부족', '논설문 2회 모두', 2], ['expression', '문장 호응', '"왜냐하면 ~다"', 2], ['expression', '중복 표현', '"더욱 더"', 1]]
    }
  };
  var HIST = [['50대', 1], ['60대', 4], ['70대', 11], ['80대', 10], ['90대', 3]];
  var LABELS = [['설명문', '3월'], ['건의문', '4월'], ['논설문 1', '5월'], ['논설문 2', '6월']];
  var CRIT_SHORT = ['주장·근거', '구성', '표현', '표기'];
  var scope = 'class';
  var NS = 'http://www.w3.org/2000/svg';

  function lineChart(el, d) {
    var W = Math.max(280, el.clientWidth), H = W < 420 ? 210 : 240;
    var pl = 32, pr = 20, pt = 16, pb = 40;
    var y0 = 50, y1 = 100;
    var x = function (i) { return pl + (W - pl - pr) * (i / 3); };
    var y = function (v) { return pt + (H - pt - pb) * (1 - (v - y0) / (y1 - y0)); };
    var s = '';
    [50, 60, 70, 80, 90, 100].forEach(function (g) { s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(g) + '" y2="' + y(g) + '"/><text x="' + (pl - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + g + '</text>'; });
    LABELS.forEach(function (l, i) {
      var anchor = i === 0 ? 'start' : i === 3 ? 'end' : 'middle';
      var lx = i === 0 ? x(i) - 6 : i === 3 ? x(i) + 6 : x(i);
      s += '<text class="t-ko" x="' + lx + '" y="' + (H - 20) + '" text-anchor="' + anchor + '">' + l[0] + '</text><text x="' + lx + '" y="' + (H - 4) + '" text-anchor="' + anchor + '">' + l[1] + '</text>';
    });
    if (d.lo) {
      var band = d.hi.map(function (v, i) { return x(i) + ',' + y(v); }).concat(d.lo.slice().reverse().map(function (v, i) { return x(3 - i) + ',' + y(v); }));
      s += '<polygon class="f-band" points="' + band.join(' ') + '"/>';
    }
    var path = function (arr) { return arr.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(''); };
    var len = function (arr) { var L = 0; for (var i = 1; i < arr.length; i++) L += Math.hypot(x(i) - x(i - 1), y(arr[i]) - y(arr[i - 1])); return Math.ceil(L); };
    if (d.cmp) s += '<path class="line line-dash s2" d="' + path(d.cmp) + '"/>';
    s += '<path class="line s1 draw" style="--len:' + len(d.main) + '" d="' + path(d.main) + '"/>';
    d.main.forEach(function (v, i) {
      s += '<circle class="dot s1" cx="' + x(i) + '" cy="' + y(v) + '" r="4"/>';
      s += '<text class="t-strong" x="' + x(i) + '" y="' + (y(v) - 10) + '" text-anchor="' + (i === 0 ? 'start' : i === 3 ? 'end' : 'middle') + '">' + v + '</text>';
    });
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="과제별 평균 점수: ' + d.main.join(', ') + '">' + s + '</svg>';
  }
  function critChart(el, d) {
    var W = Math.max(260, el.clientWidth), rowH = 46, pl = 72, pr = 36, H = rowH * 4 + 8;
    var x = function (v) { return (W - pl - pr) * (v / 25); };
    var s = '';
    d.forEach(function (r, i) {
      var top = i * rowH + 6;
      s += '<text class="t-ko" x="0" y="' + (top + 17) + '">' + CRIT_SHORT[i] + '</text>';
      s += '<rect class="bar f2" x="' + pl + '" y="' + top + '" width="' + x(r[0]) + '" height="12" rx="3"/>';
      s += '<rect class="bar f1" x="' + pl + '" y="' + (top + 16) + '" width="' + x(r[1]) + '" height="12" rx="3"/>';
      s += '<text x="' + (pl + x(r[0]) + 6) + '" y="' + (top + 10) + '">' + r[0] + '</text>';
      s += '<text class="t-strong" x="' + (pl + x(r[1]) + 6) + '" y="' + (top + 26) + '">' + r[1] + '</text>';
    });
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="항목별 1회차와 4회차 평균 비교">' + s + '</svg>';
  }
  function histChart(el) {
    var W = Math.max(260, el.clientWidth), H = 180, pb = 24, pt = 20;
    var max = 12, n = HIST.length, gap = 10, bw = (W - gap * (n - 1)) / n;
    var s = '';
    HIST.forEach(function (h, i) {
      var bh = (H - pb - pt) * (h[1] / max), bx = i * (bw + gap), by = H - pb - bh;
      var mine = scope === 'student' && i === 2;
      s += '<rect class="bar ' + (scope === 'class' || mine ? 'f1' : 'f2') + '" x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="4"/>';
      s += '<text class="t-strong" x="' + (bx + bw / 2) + '" y="' + (by - 6) + '" text-anchor="middle">' + h[1] + '</text>';
      s += '<text class="t-ko" x="' + (bx + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + h[0] + (mine ? ' · 이도현' : '') + '</text>';
    });
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="4회차 점수 분포">' + s + '</svg>';
  }
  function renderReport() {
    var d = R[scope];
    $('#rTitle').textContent = d.title;
    $('#rSummary').innerHTML = '<div><p class="rs-lead">' + d.sum.lead + '</p><p class="rs-sub">' + d.sum.sub + '</p></div>' +
      '<div class="rs-pills"><div class="rs-pill">' + icon('arrow-up') + '<div><span>' + d.sum.good[0] + '</span><b>' + d.sum.good[1] + '</b></div></div>' +
      '<div class="rs-pill rs-next">' + icon('chev-r') + '<div><span>' + d.sum.next[0] + '</span><b>' + d.sum.next[1] + '</b></div></div></div>';
    $('#kpis').innerHTML = d.kpi.map(function (k) {
      return '<div class="kpi' + (k[4] === 'note' ? ' kpi-note' : '') + '"><span>' + k[0] + '</span><b>' + k[1] + (k[2] ? '<small>' + k[2] + '</small>' : '') + '</b><em class="' + (k[4] === 'flat' || k[4] === 'note' ? 'flat' : '') + '">' + k[3] + '</em></div>';
    }).join('');
    $('#lineLegend').innerHTML = d.line.legend.map(function (l) { return '<span class="lgd lgd-' + (l[0] === 'band' ? '1' : l[0]) + '"' + (l[0] === 'band' ? ' style="opacity:.6"' : '') + '>' + l[1] + '</span>'; }).join('');
    $('#errTitle').textContent = d.errTitle;
    var emax = d.err[0][3];
    $('#errList').innerHTML = d.err.map(function (e) {
      return '<li><span class="err-name">' + e[1] + '<small>' + e[2] + '</small></span><span class="err-n"><i class="' + e[0] + '" style="width:' + Math.round(e[3] / emax * 64) + 'px"></i>' + e[3] + '</span></li>';
    }).join('');
    drawCharts();
  }
  function drawCharts() {
    var d = R[scope];
    lineChart($('#lineChart'), d.line);
    critChart($('#critChart'), d.crit);
    histChart($('#histChart'));
  }
  bindSeg($('#rScope'), function (b) { scope = b.dataset.s; renderReport(); });
  var rT;
  if (window.ResizeObserver) {
    var lastW = 0;
    new ResizeObserver(function (en) {
      var w = Math.round(en[0].contentRect.width);
      if (w === lastW) return; lastW = w;
      clearTimeout(rT); rT = setTimeout(drawCharts, 80);
    }).observe($('#appReport'));
  }

  /* ---------------- nav highlight ---------------- */
  var links = $$('#sideNav a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + en.target.id;
          if (on) { a.setAttribute('aria-current', 'true'); if (a.scrollIntoView && innerWidth < 1024) a.parentNode.scrollLeft = a.offsetLeft - 16; }
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    $$('.sec').forEach(function (s) { io.observe(s); });
  }

  /* ---------------- init ---------------- */
  var h2rgb = function (h) { return 'rgb(' + [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(',') + ')'; };
  $$('[data-ratio]').forEach(function (b) { var p = b.dataset.ratio.split('|'); b.textContent = ratio(h2rgb(p[0]), h2rgb(p[1])).toFixed(1) + ':1'; });
  function renderTokens() { renderRamps(); renderSemantic(); renderContrast(); }
  renderTokens(); renderScales();
  renderStudents(); renderReview(); renderReport();
  onThemeChange(function () { renderTokens(); drawCharts(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawCharts);
})();
