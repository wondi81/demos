'use strict';
const $ = s => document.querySelector(s);
const cv = $('#cv'), ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
const BUCKET = 'packing-video-demo';

const state = {
  cam: null,          // HTMLVideoElement when webcam is live
  camTried: false,
  rec: null,          // {invoice, start, recorder, chunks, thumb}
  station: '작업대 1',
  clips: [],          // CS search source
  stats: { count: 0, done: 0, saved: 0 },
};

/* ---------- utils ---------- */
const pad = n => String(n).padStart(2, '0');
const fmtDT = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const fmtStamp = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const fmtDur = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
const fmtMB = b => b >= 1048576 ? (b / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const randInvoice = () => Array.from({ length: 12 }, (_, i) => i === 0 ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10)).join('');
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- camera ---------- */
async function connectCam() {
  state.camTried = true;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.srcObject = stream;
    await v.play();
    state.cam = v;
    $('#camChip').textContent = '웹캠 연결됨'; $('#camChip').classList.add('live');
    $('#camBtn').hidden = true;
    return true;
  } catch {
    toast('웹캠을 사용할 수 없어 가상 카메라로 시연합니다');
    return false;
  }
}
$('#camBtn').onclick = connectCam;
// 이미 권한이 있으면 바로 웹캠 사용
navigator.permissions?.query({ name: 'camera' }).then(p => { if (p.state === 'granted') connectCam(); }).catch(() => {});

/* ---------- virtual camera (packing desk, top view) ---------- */
function drawVirtual(t) {
  // cutting mat
  ctx.fillStyle = '#2f5d50'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // tape roll + scanner on the side
  ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.arc(1110, 150, 62, 0, 7); ctx.fill();
  ctx.fillStyle = '#2f5d50'; ctx.beginPath(); ctx.arc(1110, 150, 30, 0, 7); ctx.fill();
  ctx.fillStyle = '#22262c'; roundRect(1050, 470, 150, 70, 14); ctx.fill();
  ctx.fillStyle = '#e5383b'; ctx.fillRect(1062, 498, 18, 14);

  const cyc = t % 9;                 // 9초 주기 포장 동작
  const bx = 400, by = 200, bw = 480, bh = 340;
  // box shadow + box
  ctx.fillStyle = 'rgba(0,0,0,.25)'; roundRect(bx + 12, by + 16, bw, bh, 6); ctx.fill();
  ctx.fillStyle = '#c8955a'; roundRect(bx, by, bw, bh, 6); ctx.fill();
  ctx.fillStyle = '#a8763f'; ctx.fillRect(bx + 18, by + 18, bw - 36, bh - 36);

  // item slides into box (0~3s)
  const k = Math.min(1, cyc / 3), e = 1 - Math.pow(1 - k, 3);
  const ix = 60 + (bx + 110 - 60) * e, iy = 420 - (420 - (by + 80)) * e;
  if (cyc < 4.5) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; roundRect(ix + 8, iy + 10, 260, 180, 8); ctx.fill();
    ctx.fillStyle = '#f4f6f8'; roundRect(ix, iy, 260, 180, 8); ctx.fill();
    ctx.fillStyle = '#2457f5'; ctx.fillRect(ix + 20, iy + 20, 90, 24);
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(ix + 20, iy + 60, 200, 10); ctx.fillRect(ix + 20, iy + 80, 150, 10);
    // hand
    if (cyc < 3.4) hand(ix + 250, iy + 120);
  }
  // flaps close (4.5~6s), tape (6~7.5s)
  if (cyc >= 4.5) {
    const f = Math.min(1, (cyc - 4.5) / 1.5);
    ctx.fillStyle = '#d6a468';
    ctx.fillRect(bx, by, bw / 2 * f, bh); ctx.fillRect(bx + bw - bw / 2 * f, by, bw / 2 * f, bh);
    ctx.strokeStyle = '#a8763f'; ctx.lineWidth = 2;
    if (f === 1) { ctx.beginPath(); ctx.moveTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2, by + bh); ctx.stroke(); }
  }
  if (cyc >= 6) {
    const g = Math.min(1, (cyc - 6) / 1.5);
    ctx.fillStyle = 'rgba(214,190,140,.95)'; ctx.fillRect(bx + bw / 2 - 30, by - 20, 60, (bh + 40) * g);
    if (g < 1) hand(bx + bw / 2 + 10, by - 20 + (bh + 40) * g);
  }
  // waybill label (7.5s~)
  if (cyc >= 7.5) {
    ctx.fillStyle = '#fff'; roundRect(bx + 60, by + 60, 150, 110, 4); ctx.fill();
    ctx.fillStyle = '#14171c';
    for (let i = 0; i < 26; i++) ctx.fillRect(bx + 72 + i * 5, by + 120, (i * 7) % 3 + 1, 36);
    ctx.fillRect(bx + 72, by + 76, 90, 8); ctx.fillRect(bx + 72, by + 92, 60, 8);
  }
}
function hand(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x + 10, y + 12, 70, 46, -.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8b896'; ctx.beginPath(); ctx.ellipse(x, y, 70, 46, -.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#3d4a5c'; ctx.beginPath(); ctx.ellipse(x + 90, y + 40, 60, 50, -.4, 0, 7); ctx.fill();
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

/* ---------- burned-in overlay ---------- */
function drawOverlay(now) {
  const r = state.rec; if (!r) return;
  const el = (now - r.start) / 1000;
  // REC
  ctx.fillStyle = 'rgba(0,0,0,.55)'; roundRect(24, 24, 190, 48, 10); ctx.fill();
  if (Math.floor(el * 2) % 2 === 0) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(50, 48, 9, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.font = '700 22px Pretendard, sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillText('REC', 68, 49);
  ctx.font = '600 22px Consolas, monospace'; ctx.fillText(fmtDur(el), 124, 49);
  // bottom bar
  ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, H - 78, W, 78);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '600 16px Pretendard, sans-serif';
  ctx.fillText('송장번호', 28, H - 52); ctx.fillText('일시', 560, H - 52); ctx.textAlign = 'right'; ctx.fillText('작업대', W - 28, H - 52);
  ctx.fillStyle = '#fff'; ctx.font = '700 30px Consolas, monospace';
  ctx.textAlign = 'left'; ctx.fillText(r.invoice.replace(/(\d{4})(?=\d)/g, '$1-'), 28, H - 24);
  ctx.font = '600 26px Consolas, monospace'; ctx.fillText(fmtDT(new Date(now)), 560, H - 24);
  ctx.textAlign = 'right'; ctx.font = '700 24px Pretendard, sans-serif'; ctx.fillText(state.station, W - 28, H - 24);
  ctx.textAlign = 'left';
}

function frame() {
  const now = Date.now();
  const v = state.cam;
  if (v && v.readyState >= 2) {
    const s = Math.max(W / v.videoWidth, H / v.videoHeight), w = v.videoWidth * s, h = v.videoHeight * s;
    ctx.drawImage(v, (W - w) / 2, (H - h) / 2, w, h);
  } else drawVirtual(now / 1000);
  drawOverlay(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- recording ---------- */
const MIME = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => window.MediaRecorder?.isTypeSupported(m));
const stream = cv.captureStream(30);

async function startRec(invoice) {
  if (!state.camTried) await connectCam();
  if (!MIME) { toast('이 브라우저는 녹화를 지원하지 않습니다 (Chrome 권장)'); return; }
  const recorder = new MediaRecorder(stream, { mimeType: MIME, videoBitsPerSecond: 2_500_000 });
  const r = { invoice, start: Date.now(), recorder, chunks: [], thumb: null };
  recorder.ondataavailable = e => e.data.size && r.chunks.push(e.data);
  recorder.onstop = () => saveClip(r);
  recorder.start(500);
  state.rec = r;
  setTimeout(() => { r.thumb = snapshot(); }, 400);
  setUI(true);
  toast(`송장 ${invoice} 녹화 시작`);
}
function stopRec() {
  const r = state.rec; if (!r) return;
  r.end = Date.now();
  if (!r.thumb) r.thumb = snapshot();
  state.rec = null;
  r.recorder.stop();
  setUI(false);
}
function snapshot() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 180;
  c.getContext('2d').drawImage(cv, 0, 0, 320, 180);
  return c.toDataURL('image/jpeg', .7);
}
function setUI(on) {
  $('#stage').classList.toggle('rec', on);
  $('#idle').classList.toggle('hide', on);
  $('#stopBtn').disabled = !on;
  $('#focusTag').textContent = on ? `녹화 중 · ${state.rec.invoice}` : '스캐너 준비됨';
}

function handleScan(raw) {
  const code = raw.replace(/\D/g, '');
  if (code.length < 8) { toast('송장번호는 숫자 8자리 이상이어야 합니다'); return; }
  const cur = state.rec;
  if (cur && cur.invoice === code) { stopRec(); return; }
  if (cur) { stopRec(); toast('이전 영상을 저장하고 새 송장 녹화를 시작합니다'); }
  startRec(code);
}

/* ---------- scanner input (keyboard wedge) ---------- */
const scan = $('#scan');
scan.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const v = scan.value.trim(); scan.value = '';
  if (v) handleScan(v); else stopRec();
});
// 작업대에서는 항상 스캐너 입력창에 포커스 유지
document.addEventListener('click', e => {
  if ($('#station').classList.contains('on') && !e.target.closest('input,select,button,video')) scan.focus();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && state.rec && !e.target.closest('input,select,button')) stopRec();
});
$('#sampleBtn').onclick = () => { handleScan(randInvoice()); scan.focus(); };
$('#stopBtn').onclick = () => { stopRec(); scan.focus(); };
$('#stationSel').onchange = e => { state.station = e.target.value; $('#stationTitle').textContent = state.station; };

/* ---------- upload queue (simulated compress + S3) ---------- */
function saveClip(r) {
  const blob = new Blob(r.chunks, { type: MIME });
  const d = new Date(r.start);
  const name = `${r.invoice}_${fmtStamp(d)}.mp4`;
  const key = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${name}`;
  // ponytail: 압축률은 H.264 CRF 28 기준 추정치(약 35%), 실제 프로그램은 FFmpeg 결과값 사용
  const comp = Math.round(blob.size * .35);
  const clip = { invoice: r.invoice, name, key, date: d, dur: (r.end - r.start) / 1000, size: comp, station: state.station, url: URL.createObjectURL(blob), thumb: r.thumb, isNew: true };

  state.stats.count++; state.stats.saved += (blob.size - comp) / 1048576; renderStats();

  const li = document.createElement('li'); li.className = 'qi';
  li.innerHTML = `<div class="qi-top"><span class="fname" title="데모는 브라우저 녹화(WebM)입니다. 실제 프로그램은 FFmpeg로 H.264 MP4 인코딩 후 업로드합니다.">${esc(name)}</span><span class="st wait">압축 중</span></div>
    <div class="sizes"><span>원본 <s>${fmtMB(blob.size)}</s></span>→<span>압축 후 <b>${fmtMB(comp)}</b></span><em>-65%</em></div>
    <div class="bar indet"><i></i></div><div class="qi-sub">FFmpeg H.264 인코딩 중…</div>`;
  $('#queue').prepend(li); $('#qEmpty').hidden = true; updateBadge();

  const st = li.querySelector('.st'), bar = li.querySelector('.bar'), fill = bar.querySelector('i'), sub = li.querySelector('.qi-sub');
  setTimeout(() => {
    bar.classList.remove('indet'); st.className = 'st up';
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(100, p + 6 + Math.random() * 14);
      fill.style.width = p + '%'; st.textContent = `업로드 ${Math.floor(p)}%`;
      sub.textContent = `s3://${BUCKET}/${key}`;
      if (p >= 100) {
        clearInterval(iv);
        st.className = 'st ok'; st.textContent = '업로드 완료'; bar.classList.add('ok');
        state.clips.unshift(clip); state.stats.done++; renderStats(); updateBadge(); renderResults();
      }
    }, 220);
  }, 1200);
}
function updateBadge() { $('#qBadge').textContent = $('#queue').children.length; }
function renderStats() {
  $('#stCount').textContent = state.stats.count;
  $('#stDone').textContent = state.stats.done;
  $('#stSaved').textContent = state.stats.saved.toFixed(1);
}

/* ---------- CS search ---------- */
(function seed() {
  const base = Date.now();
  [['638204917735', 1, 142, 18.4], ['520193884610', 3, 96, 12.1], ['771045239986', 2, 233, 29.8]].forEach(([inv, st, dur, mb], i) => {
    const d = new Date(base - (i + 1) * 86400000 * (i + 1) - 3600000 * (3 + i * 2));
    state.clips.push({ invoice: inv, name: `${inv}_${fmtStamp(d)}.mp4`, date: d, dur, size: mb * 1048576, station: `작업대 ${st}`, sample: true });
  });
})();

let selected = null;
function renderResults() {
  const q = $('#q').value.replace(/\D/g, '');
  const list = state.clips.filter(c => c.invoice.includes(q));
  $('#rCount').textContent = q ? `"${q}" 검색 결과 ${list.length}건` : `전체 ${list.length}건 · 최근 순`;
  const ul = $('#results');
  if (!list.length) {
    ul.innerHTML = `<li class="empty"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><p>일치하는 영상이 없습니다.<br>송장번호를 다시 확인해 주세요.</p></li>`;
    return;
  }
  ul.innerHTML = '';
  list.forEach(c => {
    const li = document.createElement('li'); li.className = 'ri' + (c === selected ? ' sel' : '');
    const hl = q ? esc(c.invoice).replace(q, `<mark>${q}</mark>`) : esc(c.invoice);
    li.innerHTML = `<div class="thumb ${c.thumb ? '' : 'ph'}" ${c.thumb ? `style="background-image:url(${c.thumb})"` : ''}>${c.thumb ? '' : '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>'}<span class="dur">${fmtDur(c.dur)}</span></div>
      <div class="ri-info"><b>${hl}</b><small>${fmtDT(c.date).slice(0, 16)} · ${esc(c.station)} · ${fmtMB(c.size)}${c.sample ? '<span class="tag">샘플 데이터</span>' : '<span class="tag new">방금 녹화</span>'}</small></div>`;
    li.onclick = () => play(c);
    ul.appendChild(li);
  });
}
function play(c) {
  selected = c; renderResults();
  if (innerWidth < 1000) $('#player').scrollIntoView({ behavior: 'smooth', block: 'center' });
  const v = $('#vid'), meta = $('#pMeta');
  meta.hidden = false; meta.textContent = (c.key ? `s3://${BUCKET}/${c.key}` : c.name);
  if (c.url) {
    $('#pEmpty').hidden = true; v.hidden = false; v.src = c.url; v.play().catch(() => {});
  } else {
    v.pause(); v.hidden = true; $('#pEmpty').hidden = false;
    $('#pEmpty').querySelector('p').innerHTML = '샘플 데이터라 영상 파일이 없습니다.<br>작업대 탭에서 직접 녹화하면 여기서 재생됩니다.';
  }
}
$('#q').addEventListener('input', renderResults);
renderResults();

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === b.dataset.tab));
  if (b.dataset.tab === 'station') scan.focus(); else { $('#vid').pause(); $('#q').focus(); }
});
scan.focus();
