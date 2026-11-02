// Gallery Haneul — 제안용 시연. 작품 이미지는 모두 캔버스로 생성한 추상화(외부 이미지 없음).
// ponytail: 데이터는 메모리에만 둠(새로고침 시 초기화). 실납품은 아임웹 게시판·갤러리 위젯이 저장 담당.
const TODAY = '2026-11-02'; // 시연 기준일 고정 — 전시 상태(현재/예정/지난)를 이 날짜로 나눔

/* ---------- 작품 생성기 ---------- */
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let grain;
function grainPattern(ctx) {
  if (!grain) {
    grain = document.createElement('canvas'); grain.width = grain.height = 180;
    const g = grain.getContext('2d'), d = g.createImageData(180, 180), r = rng(7);
    for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
  }
  return ctx.createPattern(grain, 'repeat');
}
const P = {
  field(c, W, H, r, pal) {
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    const m = W * .075, n = r() < .5 ? 2 : 3, gap = H * .045;
    const hs = Array.from({ length: n }, () => .6 + r()), sum = hs.reduce((a, b) => a + b);
    let y = m;
    c.filter = `blur(${W * .011}px)`;
    hs.forEach((h, i) => {
      const hh = (H - 2 * m - gap * (n - 1)) * h / sum;
      c.globalAlpha = .93; c.fillStyle = pal[1 + (i % (pal.length - 1))];
      c.fillRect(m, y, W - 2 * m, hh);
      c.filter = `blur(${W * .04}px)`; c.globalAlpha = .13; c.fillStyle = '#fff';
      c.fillRect(m + W * .08, y + hh * .2, W - 2 * m - W * .16, hh * .45);
      c.filter = `blur(${W * .011}px)`;
      y += hh + gap;
    });
    c.filter = 'none'; c.globalAlpha = 1;
  },
  grid(c, W, H, r, pal) {
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    const m = W * .06, step = H / (26 + Math.floor(r() * 18));
    for (let y = m, i = 0; y < H - m; y += step, i++) {
      if (i % 2) { c.globalAlpha = .28; c.fillStyle = pal[1 + (Math.floor(i / 2) % (pal.length - 1))]; c.fillRect(m, y, W - 2 * m, step); }
    }
    c.globalAlpha = 1; c.strokeStyle = 'rgba(40,40,40,.38)'; c.lineWidth = .7;
    for (let y = m; y <= H - m + 1; y += step) {
      c.beginPath(); c.moveTo(m, y);
      for (let x = m; x <= W - m; x += 12) c.lineTo(x, y + (r() - .5) * .9);
      c.stroke();
    }
    const vs = W / (6 + Math.floor(r() * 6));
    c.strokeStyle = 'rgba(40,40,40,.18)';
    for (let x = m; x <= W - m + 1; x += vs) { c.beginPath(); c.moveTo(x, m); c.lineTo(x + (r() - .5) * 2, H - m); c.stroke(); }
  },
  gesture(c, W, H, r, pal) {
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    const k = 4 + Math.floor(r() * 3);
    for (let s = 0; s < k; s++) {
      const col = pal[1 + Math.floor(r() * (pal.length - 1))];
      const x0 = r() * W, y0 = r() * H, x3 = r() * W, y3 = r() * H;
      const x1 = r() * W, y1 = r() * H, x2 = r() * W, y2 = r() * H;
      const len = Math.hypot(x3 - x0, y3 - y0) || 1, nx = -(y3 - y0) / len, ny = (x3 - x0) / len;
      const width = W * (.05 + r() * .12), bristles = 46;
      c.strokeStyle = col; c.lineCap = 'round';
      for (let b = 0; b < bristles; b++) {
        const o = (b / bristles - .5) * width, j = (r() - .5) * 6;
        c.globalAlpha = .15 + r() * .5; c.lineWidth = .8 + r() * 2.2;
        c.beginPath(); c.moveTo(x0 + nx * o, y0 + ny * o);
        c.bezierCurveTo(x1 + nx * (o + j), y1 + ny * (o + j), x2 + nx * (o - j), y2 + ny * (o - j), x3 + nx * o * .6, y3 + ny * o * .6);
        c.stroke();
      }
    }
    c.globalAlpha = 1;
  },
  square(c, W, H, r, pal) {
    // 알베르스식 중첩 사각형: 안쪽 사각형은 위 여백 1.5 : 아래 0.5
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    let size = Math.min(W, H), x = (W - size) / 2, y = (H - size) / 2;
    [.78, .56, .34].forEach((f, i) => {
      const ns = Math.min(W, H) * f, g = (size - ns) / 2;
      x += g; y += g * 1.5; size = ns;
      c.fillStyle = pal[1 + (i % (pal.length - 1))]; c.fillRect(x, y, ns, ns);
    });
  },
  ecriture(c, W, H, r, pal) {
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    const bands = 2 + Math.floor(r() * 2), bh = H / bands;
    c.strokeStyle = pal[1]; c.lineCap = 'round';
    for (let b = 0; b < bands; b++) {
      const top = b * bh + H * .04, bot = (b + 1) * bh - H * .04;
      for (let x = W * .05; x < W * .95; x += 3.2 + r() * 2.5) {
        c.globalAlpha = .18 + r() * .35; c.lineWidth = 1 + r() * 1.6;
        c.beginPath(); c.moveTo(x, top);
        for (let y = top; y < bot; y += 8) c.lineTo(x + Math.sin(y * .05 + b) * 3 + (r() - .5) * 1.5, y);
        c.stroke();
      }
    }
    c.globalAlpha = 1;
  },
  moon(c, W, H, r, pal) {
    c.fillStyle = pal[0]; c.fillRect(0, 0, W, H);
    const cx = W * (.45 + r() * .1), cy = H * (.42 + r() * .08), R = Math.min(W, H) * (.3 + r() * .06);
    const g = c.createRadialGradient(cx - R * .25, cy - R * .3, R * .1, cx, cy, R * 1.05);
    g.addColorStop(0, pal[2] || '#fff'); g.addColorStop(.85, pal[1]); g.addColorStop(1, pal[1] + '00');
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, R * 1.03, R, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(30,30,30,.25)'; c.lineWidth = 1;
    const hy = cy + R * 1.25; c.beginPath(); c.moveTo(W * .08, hy); c.lineTo(W * .92, hy); c.stroke();
  },
};
function paint(work) {
  const [h, w] = work.size.match(/[\d.]+/g).map(Number);
  const L = 760, W = Math.round(w >= h ? L : L * w / h), H = Math.round(h > w ? L : L * h / w);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), r = rng(work.seed);
  P[work.style](c, W, H, r, work.pal);
  c.globalCompositeOperation = 'overlay'; c.globalAlpha = .09; c.fillStyle = grainPattern(c); c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  return cv.toDataURL('image/jpeg', .88);
}

/* ---------- 데이터(가상) ---------- */
const SPACES = {
  jongno: { ko: '종로', en: 'Jongno', addr: { ko: '서울 종로구 북촌로 OO길 12', en: '12, Bukchon-ro OO-gil, Jongno-gu, Seoul' } },
  yongsan: { ko: '용산', en: 'Yongsan', addr: { ko: '서울 용산구 회나무로 OO, 1–2층', en: 'OO Hoenamu-ro, Yongsan-gu, Seoul, 1F–2F' } },
};
const ARTISTS = {
  yoon: { ko: '윤서진', en: 'Yoon Seojin', b: 1979, bio: { ko: '스며드는 색면으로 빛의 체감 속도를 그린다. 서울에서 작업한다.', en: 'Paints the felt speed of light through soaking color fields. Lives and works in Seoul.' } },
  han: { ko: '한도경', en: 'Han Dokyung', b: 1986, bio: { ko: '연필 선과 옅은 색띠를 반복해 시간의 결을 쌓는다.', en: 'Accumulates the grain of time through repeated pencil lines and pale bands.' } },
  kim: { ko: '김해온', en: 'Kim Haeon', b: 1964, bio: { ko: '단색의 반복 행위와 둥근 형상으로 비움을 탐구한다.', en: 'Explores emptiness through monochrome repetition and round forms.' } },
  lefevre: { ko: '마리 르페브르', en: 'Marie Lefèvre', b: 1972, bio: { ko: '리옹 출생. 붓의 속도와 날씨의 변화를 겹쳐 그린다. 한국 첫 개인전.', en: 'Born in Lyon. Layers the speed of the brush with shifts of weather. First solo show in Korea.' } },
  jung: { ko: '정이안', en: 'Jung Ian', b: 1991, bio: { ko: '인접한 색이 서로를 바꾸는 순간을 사각형의 질서로 실험한다.', en: 'Tests how adjacent colors alter one another within the order of squares.' } },
};
const M = { oil: { ko: '캔버스에 유채', en: 'Oil on canvas' }, acr: { ko: '캔버스에 아크릴', en: 'Acrylic on canvas' }, pen: { ko: '캔버스에 연필, 아크릴', en: 'Pencil and acrylic on canvas' }, mix: { ko: '한지에 혼합재료', en: 'Mixed media on hanji' }, pan: { ko: '패널에 아크릴', en: 'Acrylic on panel' } };

let seed = 100;
const w = (artist, ko, en, year, mat, size, style, pal) => ({ artist, title: { ko, en }, year, material: M[mat], size, style, pal, seed: seed++ });
const EXHIBITIONS = [
  {
    id: 'slow-light', space: 'jongno', start: '2026-10-15', end: '2026-12-20', artists: ['yoon'],
    title: { ko: '느린 빛', en: 'Slow Light' },
    desc: { ko: '윤서진의 네 번째 개인전. 여러 겹의 묽은 유채로 쌓은 색면은 멀리서는 고요하지만 가까이 갈수록 가장자리가 흔들린다. 작가는 빛이 화면에 도착하는 속도를 늦추는 일을 "보는 사람의 시간을 돌려주는 일"이라 부른다.', en: 'Yoon Seojin’s fourth solo exhibition. Built from thin layers of oil, her color fields seem still from afar, yet their edges tremble as one comes closer. The artist calls slowing the arrival of light “returning time to the viewer.”' },
    works: [
      w('yoon', '느린 빛 26-01', 'Slow Light 26-01', 2026, 'oil', '194 × 130 cm', 'field', ['#2b2f3a', '#a2442e', '#d37a3d', '#4a2a2a']),
      w('yoon', '느린 빛 26-03', 'Slow Light 26-03', 2026, 'oil', '162 × 130 cm', 'field', ['#e9e1d3', '#c9a46a', '#8b9a8f']),
      w('yoon', '새벽 쪽으로', 'Toward Dawn', 2025, 'oil', '130 × 162 cm', 'field', ['#1d2433', '#3e5a7a', '#9db4c8']),
      w('yoon', '느린 빛 26-07', 'Slow Light 26-07', 2026, 'oil', '116 × 91 cm', 'field', ['#5a1f1f', '#c4542f', '#e7b45c']),
      w('yoon', '남은 온기', 'Remaining Warmth', 2025, 'oil', '91 × 73 cm', 'field', ['#efe8de', '#e2a28a', '#d8c6a7']),
      w('yoon', '수평의 숨', 'Horizontal Breath', 2026, 'oil', '97 × 162 cm', 'field', ['#2a2a28', '#6b6a4b', '#2f3c3a']),
      w('yoon', '느린 빛 26-11', 'Slow Light 26-11', 2026, 'oil', '72 × 60 cm', 'field', ['#d9dde0', '#7d97ad', '#e4cfa9']),
    ],
  },
  {
    id: 'time-of-lines', space: 'yongsan', start: '2026-10-22', end: '2026-12-27', artists: ['han', 'kim'],
    title: { ko: '선의 시간', en: 'The Time of Lines' },
    desc: { ko: '한 줄을 긋는 일은 한 순간을 남기는 일이다. 연필 선으로 화면을 채우는 한도경과, 반복된 획과 둥근 형상으로 비움을 다루는 김해온의 2인전. 두 세대의 작가가 같은 질문을 서로 다른 속도로 답한다.', en: 'To draw a line is to leave a moment. A two-person exhibition of Han Dokyung, who fills surfaces with pencil lines, and Kim Haeon, who treats emptiness through repeated strokes and round forms. Two generations answer the same question at different speeds.' },
    works: [
      w('han', '하루의 높이', 'Height of a Day', 2026, 'pen', '150 × 150 cm', 'grid', ['#f3f0ea', '#c7d3d8', '#e8d6c4']),
      w('kim', '묘법 No.2611', 'Écriture No.2611', 2026, 'mix', '162 × 130 cm', 'ecriture', ['#e9e4da', '#6e6457']),
      w('han', '옅은 오후', 'Pale Afternoon', 2025, 'pen', '120 × 100 cm', 'grid', ['#f6f3ee', '#efd9d0', '#d9e2d5']),
      w('kim', '달항아리 · 밤', 'Moon Jar · Night', 2025, 'acr', '100 × 100 cm', 'moon', ['#1f2226', '#d9d1c1', '#f6f1e7']),
      w('han', '열두 개의 수평', 'Twelve Horizontals', 2026, 'pen', '91 × 116 cm', 'grid', ['#eeece6', '#b9c6d6', '#d8d2bd']),
      w('kim', '묘법 No.2604', 'Écriture No.2604', 2026, 'mix', '130 × 97 cm', 'ecriture', ['#2d3a4a', '#c8d0d8']),
      w('kim', '달항아리 · 새벽', 'Moon Jar · Dawn', 2026, 'acr', '73 × 73 cm', 'moon', ['#e7e2d9', '#c9b79a', '#fbf8f2']),
      w('han', '조용한 축적', 'Quiet Accumulation', 2026, 'pen', '73 × 61 cm', 'grid', ['#f4f2ee', '#d3c7dd', '#c9d9d6']),
    ],
  },
  {
    id: 'weather-inside', space: 'jongno', start: '2027-01-14', end: '2027-03-07', artists: ['lefevre'],
    title: { ko: '안쪽의 날씨', en: 'Weather Inside' },
    desc: { ko: '프랑스 작가 마리 르페브르의 한국 첫 개인전. 큰 붓의 빠른 움직임과 그 위에 남은 마른 흔적이 한 화면 안에서 계절처럼 바뀐다.', en: 'French artist Marie Lefèvre’s first solo exhibition in Korea. Swift sweeps of a broad brush and the dry traces left on top shift like seasons within a single surface.' },
    works: [
      w('lefevre', '3월의 비', 'Rain in March', 2026, 'acr', '200 × 160 cm', 'gesture', ['#efece6', '#1f3b5a', '#7aa0b8', '#c6c1b6']),
      w('lefevre', '남풍', 'South Wind', 2026, 'acr', '160 × 200 cm', 'gesture', ['#f2ede2', '#c2492c', '#e3a33b', '#2b2b2b']),
      w('lefevre', '흐린 정원', 'Clouded Garden', 2025, 'acr', '130 × 130 cm', 'gesture', ['#e8eae4', '#4f6b4a', '#a9b88e', '#2c3a2e']),
      w('lefevre', '저녁의 기압', 'Evening Pressure', 2026, 'oil', '146 × 112 cm', 'gesture', ['#1c1c22', '#8a5a9e', '#d9c3e0', '#e07a5f']),
      w('lefevre', '마른 빛', 'Dry Light', 2025, 'acr', '100 × 81 cm', 'gesture', ['#f4efe4', '#b88b4a', '#5b4636']),
      w('lefevre', '안쪽의 날씨 I', 'Weather Inside I', 2026, 'acr', '116 × 91 cm', 'gesture', ['#f0f0ee', '#222', '#9aa6ad']),
    ],
  },
  {
    id: 'adjacent-colors', space: 'yongsan', start: '2026-07-03', end: '2026-09-13', artists: ['jung'],
    title: { ko: '인접한 색', en: 'Adjacent Colors' },
    desc: { ko: '정이안은 세 개의 사각형만으로 색이 서로를 어떻게 바꾸는지 보여 준다. 같은 노랑도 옆에 무엇이 오느냐에 따라 다른 온도가 된다.', en: 'Using only three squares, Jung Ian shows how colors transform one another. The same yellow takes on a different temperature depending on what sits beside it.' },
    works: [
      w('jung', '인접 No.14', 'Adjacent No.14', 2026, 'pan', '100 × 100 cm', 'square', ['#e9b23a', '#d9822b', '#b5452a', '#f2d16b']),
      w('jung', '인접 No.9', 'Adjacent No.9', 2026, 'pan', '100 × 100 cm', 'square', ['#2e4a62', '#4f7a8c', '#9cc0c4', '#e8e2c8']),
      w('jung', '인접 No.21', 'Adjacent No.21', 2026, 'pan', '80 × 80 cm', 'square', ['#6d7f4e', '#a7b46a', '#e4dc9c', '#3b4a2c']),
      w('jung', '인접 No.3', 'Adjacent No.3', 2025, 'pan', '80 × 80 cm', 'square', ['#d6cfc4', '#b6a998', '#8f7f6e', '#efe9df']),
      w('jung', '인접 No.17', 'Adjacent No.17', 2026, 'pan', '120 × 120 cm', 'square', ['#a4343a', '#d0644d', '#efb08a', '#3a1f24']),
      w('jung', '인접 No.6', 'Adjacent No.6', 2025, 'pan', '60 × 60 cm', 'square', ['#c9c6e0', '#9690c2', '#5d5598', '#efeef7']),
    ],
  },
];

/* ---------- 문구 ---------- */
const S = {
  ko: { nav_ex: 'Exhibitions', nav_ar: 'Artists', nav_vi: 'Visit', current: '현재 전시', upcoming: '예정 전시', past: '지난 전시', viewAll: '전체 보기', spaces: '두 공간', exhibitions: '전시', artists: '작가', visit: '방문 안내', hours: '운영시간', hoursV: '화–토 10:00–18:00 · 일 12:00–18:00', closed: '휴관', closedV: '월요일, 공휴일', admission: '관람료', admissionV: '무료', address: '주소', map: '지도에서 보기 →', mapNote: '실납품 시 네이버·카카오 지도로 연결', period: '기간', space: '공간', artist: '작가', works: '작품', back: '← 전시 목록', none: '해당하는 전시가 없습니다.', born: '년생', visitNote: '단체 관람·도슨트 예약은 실납품 시 예약 폼으로 연결됩니다. 주소·운영시간은 시연용 가상 정보입니다.', newBadge: 'NEW' },
  en: { nav_ex: 'Exhibitions', nav_ar: 'Artists', nav_vi: 'Visit', current: 'Current', upcoming: 'Upcoming', past: 'Past', viewAll: 'View all', spaces: 'Two Spaces', exhibitions: 'Exhibitions', artists: 'Artists', visit: 'Visit', hours: 'Hours', hoursV: 'Tue–Sat 10:00–18:00 · Sun 12:00–18:00', closed: 'Closed', closedV: 'Mondays, public holidays', admission: 'Admission', admissionV: 'Free', address: 'Address', map: 'View on map →', mapNote: 'Linked to Naver/Kakao Map on delivery', period: 'Dates', space: 'Space', artist: 'Artist', works: 'Works', back: '← All exhibitions', none: 'No exhibitions here.', born: 'b.', visitNote: 'Group visits and docent bookings will link to a booking form on delivery. Address and hours are fictional for this demo.', newBadge: 'NEW' },
};
let lang = 'ko';
const tx = (v) => (v == null ? '' : typeof v === 'object' ? v[lang] ?? v.ko : v);
const s = (k) => S[lang][k];
const esc = (v) => String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const status = (e) => (e.end < TODAY ? 'past' : e.start > TODAY ? 'upcoming' : 'current');
const fmtD = (d) => d.replaceAll('-', '.');
const dates = (e) => `${fmtD(e.start)} – ${fmtD(e.end)}`;
const artistName = (k) => (ARTISTS[k] ? tx(ARTISTS[k]) : k);
const exArtists = (e) => [...new Set(e.works.map((x) => x.artist))].map(artistName).join(', ');
const spaceTag = (sp) => `<span class="space-tag">${SPACES[sp].en}<i>${lang === 'ko' ? SPACES[sp].ko : ''}</i></span>`;

/* ---------- 화면 ---------- */
const view = document.getElementById('view');
const art = (wk, cls = '') => `<img src="${wk.src}" alt="${esc(tx(wk.title))}" class="${cls}" loading="lazy">`;

function exCard(e) {
  return `<a class="ex-card" href="#/exhibition/${e.id}">
    <div class="hero-art">${art(e.works[0])}</div>
    <div class="hero-text">${spaceTag(e.space)}${e.isNew ? `<span class="badge">${s('newBadge')}</span>` : ''}
      <h3>${esc(tx(e.title))}</h3><div class="who">${esc(exArtists(e))}</div><div class="dates">${dates(e)}</div></div></a>`;
}
function spaceCard(sp) {
  const v = SPACES[sp];
  return `<div class="space-card">${`<span class="kicker">${lang === 'ko' ? v.en : v.ko}</span>`}<h3>${tx(v)}</h3>
    <dl><dt>${s('address')}</dt><dd>${tx(v.addr)}</dd><dt>${s('hours')}</dt><dd>${s('hoursV')}</dd><dt>${s('closed')}</dt><dd>${s('closedV')}</dd><dt>${s('admission')}</dt><dd>${s('admissionV')}</dd></dl></div>`;
}

const pages = {
  home() {
    const cur = EXHIBITIONS.filter((e) => status(e) === 'current');
    const heroes = ['jongno', 'yongsan'].map((sp) => cur.find((e) => e.space === sp)).filter(Boolean);
    const up = EXHIBITIONS.find((e) => status(e) === 'upcoming');
    return `<section class="hero">${heroes.map((e) => `
      <a class="hero-item" href="#/exhibition/${e.id}">
        <div class="hero-art">${art(e.works[0])}</div>
        <div class="hero-text">${spaceTag(e.space)}<h2>${esc(tx(e.title))}</h2>
          <div class="who">${esc(exArtists(e))}</div><div class="dates">${dates(e)}</div></div>
      </a>`).join('')}</section>
    ${up ? `<section class="section"><div class="sec-head"><h2>${s('upcoming')}</h2><a href="#/exhibitions/upcoming">${s('viewAll')}</a></div>
      <a class="feature" href="#/exhibition/${up.id}"><div class="hero-art">${art(up.works[1] || up.works[0])}</div>
        <div>${spaceTag(up.space)}<h3>${esc(tx(up.title))}</h3><div class="who">${esc(exArtists(up))}</div><div class="dates">${dates(up)}</div>
        <p class="lede">${esc(tx(up.desc)).slice(0, 140)}${tx(up.desc).length > 140 ? '…' : ''}</p></div></a></section>` : ''}
    <section class="section"><div class="sec-head"><h2>${s('spaces')}</h2><a href="#/visit">${s('visit')}</a></div>
      <div class="spaces">${spaceCard('jongno')}${spaceCard('yongsan')}</div></section>`;
  },
  exhibitions(tab = 'current') {
    const counts = { current: 0, upcoming: 0, past: 0 };
    EXHIBITIONS.forEach((e) => counts[status(e)]++);
    const list = EXHIBITIONS.filter((e) => status(e) === tab);
    return `<div class="page-title"><span class="kicker">Gallery Haneul</span><h1>${s('exhibitions')}</h1></div>
      <div class="tabs">${['current', 'upcoming', 'past'].map((k) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${s(k)}<sup>${counts[k]}</sup></button>`).join('')}</div>
      ${list.length ? `<div class="ex-list">${list.map(exCard).join('')}</div>` : `<p class="empty-state">${s('none')}</p>`}`;
  },
  exhibition(id) {
    const e = EXHIBITIONS.find((x) => x.id === id);
    if (!e) return pages.exhibitions();
    return `<div class="detail-head"><div>${spaceTag(e.space)}<span class="kicker" style="margin-left:14px">${s(status(e))}</span><h1>${esc(tx(e.title))}</h1></div>
      <div class="meta"><div><span>${s('artist')}</span><span>${esc(exArtists(e))}</span></div><div><span>${s('period')}</span><span>${dates(e)}</span></div>
      <div><span>${s('space')}</span><span>${tx(SPACES[e.space])}</span></div><div><span>${s('works')}</span><span>${e.works.length}</span></div></div></div>
      ${tx(e.desc) ? `<p class="desc">${esc(tx(e.desc))}</p>` : ''}
      <div class="works">${e.works.map((wk, i) => `<figure class="work" data-lb="${e.id}" data-i="${i}">
        <div class="frame">${art(wk)}</div>
        <figcaption>${esc(artistName(wk.artist))}<br><em>${esc(tx(wk.title))}</em>${wk.year ? `, ${esc(wk.year)}` : ''}<br><span class="m">${esc(tx(wk.material))}${wk.size ? ` · ${esc(wk.size)}` : ''}</span></figcaption></figure>`).join('')}</div>
      <a class="back" href="#/exhibitions/${status(e)}">${s('back')}</a>`;
  },
  artists() {
    const keys = Object.keys(ARTISTS);
    return `<div class="page-title"><span class="kicker">Gallery Haneul</span><h1>${s('artists')}</h1></div>
      <div class="wrap" style="padding-top:48px">${keys.map((k) => {
        const a = ARTISTS[k], works = EXHIBITIONS.flatMap((e) => e.works.map((wk, i) => ({ wk, e, i }))).filter((x) => x.wk.artist === k).slice(0, 4);
        return `<div class="artist-row"><div><h3>${tx(a)}</h3><div class="sub">${lang === 'ko' ? `${a.en} · ${a.b}${s('born')}` : `${a.ko} · ${s('born')} ${a.b}`}</div><p>${tx(a.bio)}</p></div>
          <div class="thumbs">${works.map((x) => `<button data-lb="${x.e.id}" data-i="${x.i}" aria-label="${esc(tx(x.wk.title))}">${art(x.wk)}</button>`).join('')}</div></div>`;
      }).join('')}</div>`;
  },
  visit() {
    return `<div class="page-title"><span class="kicker">Gallery Haneul</span><h1>${s('visit')}</h1></div>
      <div class="visit">${['jongno', 'yongsan'].map((sp) => `<div>${spaceCard(sp)}<a class="maplink" href="#/visit" title="${s('mapNote')}">${s('map')}</a><div class="dates">${s('mapNote')}</div></div>`).join('')}</div>
      <p class="visit-note">${s('visitNote')}</p>`;
  },
};

function render() {
  const [, page = '', arg] = location.hash.split('/');
  const name = page || 'home';
  view.innerHTML = name === 'exhibitions' ? pages.exhibitions(arg) : name === 'exhibition' ? pages.exhibition(arg) : (pages[name] || pages.home)();
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === name || (name === 'exhibition' && a.dataset.nav === 'exhibitions')));
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = s(el.dataset.t); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
  document.documentElement.lang = lang;
  document.getElementById('foot-spaces').innerHTML = ['jongno', 'yongsan'].map((sp) => `<div><strong>${SPACES[sp].en} ${lang === 'ko' ? SPACES[sp].ko : ''}</strong>${tx(SPACES[sp].addr)}<br>${s('hoursV')}</div>`).join('');
}

view.addEventListener('click', (ev) => {
  const tab = ev.target.closest('[data-tab]');
  if (tab) { location.hash = `#/exhibitions/${tab.dataset.tab}`; return; }
  const lb = ev.target.closest('[data-lb]');
  if (lb) openLb(lb.dataset.lb, +lb.dataset.i);
});
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { lang = b.dataset.lang; render(); }));
addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
const head = document.querySelector('.site-head');
addEventListener('scroll', () => head.classList.toggle('scrolled', scrollY > 10), { passive: true });

/* ---------- 라이트박스 ---------- */
const lbEl = document.getElementById('lb');
let lbList = [], lbIdx = 0;
function openLb(exId, i) {
  lbList = EXHIBITIONS.find((e) => e.id === exId).works; lbIdx = i; showLb(); lbEl.hidden = false; document.body.style.overflow = 'hidden';
}
function showLb() {
  const wk = lbList[lbIdx];
  document.getElementById('lb-img').src = wk.src;
  document.getElementById('lb-img').alt = tx(wk.title);
  document.getElementById('lb-cap').innerHTML = `<div class="a">${esc(artistName(wk.artist))}</div><div class="t">${esc(tx(wk.title))}${wk.year ? `, ${esc(wk.year)}` : ''}</div>
    <div class="m">${esc(tx(wk.material))}${wk.size ? ` · ${esc(wk.size)}` : ''}</div><span class="lb-count">${lbIdx + 1} / ${lbList.length}</span>`;
}
const step = (d) => { lbIdx = (lbIdx + d + lbList.length) % lbList.length; showLb(); };
const closeLb = () => { lbEl.hidden = true; document.body.style.overflow = ''; };
lbEl.querySelector('.lb-prev').onclick = () => step(-1);
lbEl.querySelector('.lb-next').onclick = () => step(1);
lbEl.querySelector('.lb-close').onclick = closeLb;
lbEl.addEventListener('click', (ev) => { if (ev.target === lbEl || ev.target.tagName === 'FIGURE') closeLb(); });
addEventListener('keydown', (ev) => {
  if (lbEl.hidden) return;
  if (ev.key === 'Escape') closeLb(); else if (ev.key === 'ArrowRight') step(1); else if (ev.key === 'ArrowLeft') step(-1);
});

/* ---------- 직원 업로드 시연 ---------- */
const $ = (id) => document.getElementById(id);
const admin = $('admin'), rowsEl = $('rows');
let items = [];
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
function resetForm() {
  $('f-title').value = ''; $('f-desc').value = ''; $('f-start').value = TODAY; $('f-end').value = addDays(TODAY, 45);
  items = []; drawRows(); $('f-msg').textContent = '';
}
const toggleAdmin = (open) => {
  admin.hidden = !open; $('admin-toggle').textContent = open ? '사이트 보기' : '관리 화면 보기';
};
$('admin-toggle').onclick = () => toggleAdmin(admin.hidden);
$('admin-close').onclick = () => toggleAdmin(false);

// 대량 업로드 대비: 긴 변 2400px로 줄이고 WebP로 바꿔 용량을 미리 보여 줌
const MAX_SIDE = 2400, WEBP_Q = 0.82;
const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB');
const readAs = (blob) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
async function optimize(f) {
  const orig = await readAs(f);
  const im = new Image(); im.src = orig; await im.decode();
  const k = Math.min(1, MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
  const cv = document.createElement('canvas');
  cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
  cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
  const webp = await new Promise((res) => cv.toBlob(res, 'image/webp', WEBP_Q));
  const useWebp = webp && webp.size < f.size; // 이미 작은 파일은 원본 유지
  return {
    src: useWebp ? await readAs(webp) : orig, artist: '', title: f.name.replace(/\.[^.]+$/, ''), year: '', material: '', size: '',
    before: f.size, after: useWebp ? webp.size : f.size, dims: `${im.naturalWidth}×${im.naturalHeight} → ${cv.width}×${cv.height}`,
  };
}
function addFiles(files) {
  const imgs = [...files].filter((f) => f.type.startsWith('image/'));
  if (!imgs.length) { msg('이미지 파일만 올릴 수 있습니다.'); return; }
  msg(`${imgs.length}장 변환 중…`, true);
  Promise.all(imgs.map((f) => optimize(f).catch(() => null)))
    .then((list) => { items.push(...list.filter(Boolean)); drawRows(); msg(''); });
}
const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (ev) => { if (ev.dataTransfer.types.includes('Files')) { ev.preventDefault(); drop.classList.add('over'); } }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
drop.addEventListener('drop', (ev) => { ev.preventDefault(); addFiles(ev.dataTransfer.files); });
$('f-files').addEventListener('change', (ev) => { addFiles(ev.target.files); ev.target.value = ''; });

const COLS = [['artist', '작가'], ['title', '제목'], ['year', '연도'], ['material', '재료'], ['size', '크기 (cm)']];
function drawRows() {
  if (!items.length) { rowsEl.innerHTML = '<p class="empty">아직 올린 이미지가 없습니다.</p>'; return; }
  const tb = items.reduce((a, x) => a + x.before, 0), ta = items.reduce((a, x) => a + x.after, 0);
  rowsEl.innerHTML = `<div class="opt-sum"><strong>${items.length}장</strong> · 원본 ${kb(tb)} → 변환 후 ${kb(ta)} <b>−${Math.round((1 - ta / tb) * 100)}%</b><span>긴 변 ${MAX_SIDE}px 자동 축소 · WebP 변환</span></div><div class="row head"><span></span><span>이미지</span>${COLS.map((c) => `<span>${c[1]}</span>`).join('')}<span></span></div>` +
    items.map((it, i) => `<div class="row" data-row="${i}">
      <span class="handle" draggable="true" title="끌어서 순서 바꾸기">⋮⋮</span>
      <span class="th"><img src="${it.src}" alt=""></span>
      ${COLS.map(([k, label]) => `<input data-k="${k}" placeholder="${label}" value="${esc(it[k])}">`).join('')}
      <button class="del" data-del="${i}" aria-label="삭제">×</button>
      <span class="sz">${it.dims} · ${kb(it.before)} → ${kb(it.after)} <b>−${Math.round((1 - it.after / it.before) * 100)}%</b></span></div>`).join('');
}
rowsEl.addEventListener('input', (ev) => { const r = ev.target.closest('[data-row]'); if (r && ev.target.dataset.k) items[+r.dataset.row][ev.target.dataset.k] = ev.target.value; });
rowsEl.addEventListener('click', (ev) => { const d = ev.target.closest('[data-del]'); if (d) { items.splice(+d.dataset.del, 1); drawRows(); } });
let dragFrom = null;
rowsEl.addEventListener('dragstart', (ev) => {
  const r = ev.target.closest('[data-row]'); if (!r) return;
  dragFrom = +r.dataset.row; r.classList.add('dragging');
  ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(dragFrom));
  ev.dataTransfer.setDragImage(r, 20, 20);
});
rowsEl.addEventListener('dragover', (ev) => {
  const r = ev.target.closest('[data-row]'); if (!r || dragFrom === null) return;
  ev.preventDefault(); rowsEl.querySelectorAll('.over').forEach((x) => x.classList.remove('over')); r.classList.add('over');
});
rowsEl.addEventListener('drop', (ev) => {
  const r = ev.target.closest('[data-row]'); if (!r || dragFrom === null) return;
  ev.preventDefault();
  const to = +r.dataset.row, [moved] = items.splice(dragFrom, 1);
  items.splice(to, 0, moved); dragFrom = null; drawRows();
});
rowsEl.addEventListener('dragend', () => { dragFrom = null; rowsEl.querySelectorAll('.dragging,.over').forEach((x) => x.classList.remove('dragging', 'over')); });

$('b-apply').onclick = () => {
  const vals = { artist: $('b-artist').value.trim(), year: $('b-year').value.trim(), material: $('b-material').value.trim() };
  if (!items.length) { msg('먼저 이미지를 올려 주세요.'); return; }
  items.forEach((it) => Object.entries(vals).forEach(([k, v]) => { if (v) it[k] = v; }));
  drawRows(); msg('');
};
function msg(t, ok) { const m = $('f-msg'); m.textContent = t; m.classList.toggle('ok', !!ok); }

$('publish').onclick = () => {
  const title = $('f-title').value.trim(), start = $('f-start').value, end = $('f-end').value;
  if (!title) return msg('전시 제목을 입력해 주세요.');
  if (!start || !end || end < start) return msg('기간을 확인해 주세요. 종료일이 시작일보다 빠릅니다.');
  if (!items.length) return msg('작품 이미지를 한 장 이상 올려 주세요.');
  const space = document.querySelector('[name=f-space]:checked').value;
  const id = 'new-' + Date.now();
  EXHIBITIONS.unshift({
    id, space, start, end, isNew: true, title, desc: $('f-desc').value.trim(),
    works: items.map((it) => ({ src: it.src, artist: it.artist || '작가 미입력', title: it.title || '무제', year: it.year, material: it.material, size: it.size ? `${it.size}${/cm/.test(it.size) ? '' : ' cm'}` : '' })),
  });
  resetForm(); toggleAdmin(false);
  location.hash = `#/exhibitions/${status(EXHIBITIONS[0])}`;
};

/* ---------- 시작 ---------- */
EXHIBITIONS.forEach((e) => e.works.forEach((wk) => { wk.src = paint(wk); }));
resetForm();
render();
