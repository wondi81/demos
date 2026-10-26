'use strict';
/* 모든 데이터는 가상입니다. */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 데이터 ---------- */
const MATRIX = {
  cols: ['로그인', '멀티 접속', '결제', '인벤토리', '성능 체감'],
  rows: [
    ['Android 14', '갤럭시 S23', ['●', '●', '●', '●', '●']],
    ['Android 13', '갤럭시 S22', ['●', '●', '●', '●', '○']],
    ['Android 12', '갤럭시 A23 (저사양)', ['○', '○', '', '○', '●']],
    ['iOS 17', '아이폰 13', ['●', '●', '●', '●', '●']],
    ['iOS 16', '아이폰 SE 3', ['○', '○', '○', '', '●']],
    ['iPadOS 17', '아이패드 10세대', ['○', '○', '', '○', '']],
    ['Windows 11', '크롬 130 · 엣지 130', ['●', '●', '○', '○', '']],
    ['macOS 14', '사파리 17 · 크롬 130', ['●', '○', '', '', '']],
  ],
};
const TIMELINE = [
  ['11/16 ~ 11/17', '착수', '빌드·계정 수령, 스모크 10건, 케이스 확정', true],
  ['11/18 ~ 11/23', '1차 실행', '전체 케이스 실행, 버그 등록, 부하 1회차', true],
  ['11/24 ~ 11/27', '재검증', '수정 빌드 회귀, 실패 케이스 재실행, 부하 2회차', false],
  ['11/28', '최종 보고', '요약 리포트, 녹화 영상, 자동화 스크립트 전달', false],
];

const CASES = [
  ['LG-001', '로그인', '구글 소셜 로그인 (신규 계정)', '구글 테스트 계정, 앱 최초 설치', ['앱 실행', '구글로 시작 선택', '계정 선택 후 권한 동의'], '닉네임 생성 화면으로 이동, 계정 1개 생성', 'Pass'],
  ['LG-002', '로그인', '애플 로그인 (이메일 가리기)', 'iOS 기기, 애플 테스트 계정', ['Apple로 계속하기 선택', '이메일 가리기 선택', '로그인 완료'], '릴레이 이메일로 계정 생성, 재로그인 시 같은 계정', 'Pass'],
  ['LG-003', '로그인', '카카오 연동 해제 후 재로그인', '카카오 연동 계정, 개발자 콘솔 권한', ['카카오 계정 설정에서 앱 연결 끊기', '게임 재실행', '카카오 로그인 시도'], '재동의 화면 노출 후 기존 계정 복귀', 'Block'],
  ['LG-004', '로그인', '게스트 로그인 계정 생성', '앱 최초 설치', ['게스트로 시작 선택', '경고 팝업 확인'], '게스트 계정 생성, 데이터 유실 경고 노출', 'Pass'],
  ['LG-005', '로그인', '게스트에서 소셜 계정으로 연동', '게스트 계정, 레벨 5 진행', ['설정 > 계정 연동', '구글 선택', '앱 재설치 후 구글 로그인'], '레벨·재화·인벤토리 그대로 유지', 'Pass'],
  ['LG-006', '로그인', '연동 안 한 게스트 재설치', '게스트 계정, 연동 없음', ['앱 삭제', '재설치 후 실행'], '복구 불가 안내와 새 게스트 생성 선택지 노출', 'Pass'],
  ['LG-007', '로그인', '중복 로그인 시 기존 기기 처리', '기기 A 로비 접속 중', ['기기 B에서 같은 계정 로그인', '기기 A 화면 확인'], 'A에 "다른 기기에서 접속" 알림 후 타이틀로 이동', 'Fail', 'BUG-003'],
  ['LG-008', '로그인', '세션 만료 후 복귀', '로그인 상태, 앱 백그라운드 31분', ['앱 복귀', '상점 진입'], '재인증 팝업 1회 노출, 확인 시 자동 재로그인', 'Fail', 'BUG-005'],
  ['LG-009', '로그인', '액세스 토큰 만료 중 API 호출', '토큰 수명 1분으로 설정한 테스트 서버', ['로그인', '61초 후 우편함 열기'], '리프레시 토큰으로 자동 갱신, 사용자 개입 없음', 'Pass'],
  ['LG-010', '로그인', '오프라인 상태 로그인 시도', '비행기 모드', ['앱 실행', '로그인 선택'], '네트워크 확인 안내와 재시도 버튼', 'Pass'],
  ['MP-001', '멀티 접속', '동일 계정 2기기 동시 접속', '기기 A·B 같은 계정', ['A 로그인', 'B 로그인', '양쪽 상태 확인'], '후접속 B만 유지, A는 세션 종료', 'Pass'],
  ['MP-002', '멀티 접속', '100ms 차이 동시 로그인', '자동화 스크립트로 2기기 동시 요청', ['A·B 로그인 요청 동시 전송', '서버 세션 수 조회'], '활성 세션 1개, 중복 토큰 없음', 'Pass'],
  ['MP-003', '멀티 접속', '강제 종료된 기기의 전투 결과', 'A에서 전투 진행 중', ['B 로그인으로 A 세션 종료', 'B에서 전투 기록 확인'], '진행 중 전투는 무효 처리, 보상 미지급 기록', 'Pass'],
  ['MP-004', '멀티 접속', '방 마지막 1자리 동시 입장', '4인 방 3명 입장, 대기 5명', ['5명이 동시에 입장 요청', '방 인원 확인'], '1명만 입장, 나머지 "방이 가득 찼습니다"', 'Fail', 'BUG-004'],
  ['MP-005', '멀티 접속', '방장 퇴장 시 방장 위임', '4인 방', ['방장 앱 강제 종료', '남은 인원 화면 확인'], '입장 순서 2번에게 방장 위임, 알림 표시', 'Pass'],
  ['MP-006', '멀티 접속', 'Wi-Fi에서 LTE 전환 재접속', '방 안에서 대기 중', ['Wi-Fi 끄기', '재접속 시간 측정'], '10초 안에 같은 방으로 복귀', 'Fail', 'BUG-006'],
  ['MP-007', '멀티 접속', '30초 끊김 후 재접속', '전투 중, 네트워크 링크 컨디셔너', ['30초 패킷 차단', '복구'], '같은 전투로 복귀, 진행 상태 유지', 'Pass'],
  ['MP-008', '멀티 접속', '60초 초과 끊김', '방 안에서 대기 중', ['65초 패킷 차단', '복구'], '방 퇴장 처리, 로비 복귀와 사유 안내', 'Pass'],
  ['MP-009', '멀티 접속', 'PC 브라우저 탭 2개 같은 계정', '크롬 130', ['탭 1 로그인', '탭 2 로그인'], '탭 1에 한국어 안내 후 세션 종료', 'Pass', 'BUG-008'],
  ['PY-001', '결제', '샌드박스 결제 성공', '스토어 샌드박스 계정', ['상점에서 젬 300 구매', '결제 승인'], '3초 안에 젬 300 지급, 영수증 기록', 'Pass'],
  ['PY-002', '결제', '결제창에서 취소', '샌드박스 계정', ['구매 선택', '결제창에서 취소'], '재화 변동 없음, 취소 안내', 'Pass'],
  ['PY-003', '결제', '결제 승인 직후 네트워크 끊김', '샌드박스 계정, 링크 컨디셔너', ['구매 승인', '승인 직후 1초 안에 네트워크 차단', '재접속'], '재접속 시 미지급 영수증 재검증 후 지급', 'Fail', 'BUG-001'],
  ['PY-004', '결제', '같은 영수증 재전송', '정상 결제 1건 완료', ['프록시로 영수증 검증 요청 재전송'], '서버가 중복 거부, 추가 지급 없음', 'Pass'],
  ['PY-005', '결제', '환불 후 재화 회수', '결제 1건 완료', ['스토어 환불 처리', '게임 재접속'], '지급 재화 회수, 부족 시 마이너스 표시', 'Block'],
  ['IV-001', '인벤토리', '아이템 획득 즉시 반영', '전투 1회 완료', ['보상 수령', '인벤토리 열기'], '획득 아이템 즉시 노출, 개수 일치', 'Pass'],
  ['IV-002', '인벤토리', '인벤토리 가득 찬 상태 획득', '인벤토리 200/200', ['보상 수령'], '초과분 우편함 이동, 안내 노출', 'Pass'],
  ['IV-003', '인벤토리', '2기기에서 같은 아이템 동시 판매', 'PC 크롬과 Android에 같은 계정', ['양쪽에서 같은 아이템 판매 동시 실행', '골드 확인'], '판매 1회만 처리, 골드 중복 없음', 'Pass', 'BUG-002'],
  ['IV-004', '인벤토리', '정렬 기준 유지', '정렬: 등급순', ['앱 재시작', '인벤토리 열기'], '등급순 유지', 'Pass'],
];

const BUGS = [
  { id: 'BUG-001', sev: '치명', status: '수정중', title: '결제 승인 직후 네트워크가 끊기면 재접속해도 젬이 지급되지 않음', rate: '4/10', env: 'Android 13 · 갤럭시 S22 · LTE', build: '0.9.4', tc: 'PY-003',
    steps: ['샌드박스 계정으로 상점 > 젬 300 구매', '스토어 결제 승인', '승인 팝업이 닫히기 전에 비행기 모드 켜기', '10초 후 비행기 모드 끄고 게임 재접속', '젬 잔액과 우편함 확인'],
    actual: '스토어에는 결제 완료로 남지만 젬이 지급되지 않음. 앱 재시작 후에도 미지급 영수증 재검증 요청이 서버로 가지 않음.',
    expected: '재접속 시 미처리 영수증을 서버에 다시 보내 젬 지급', video: '0:48', files: ['logcat_bug001.txt', 'receipt_bug001.json'] },
  { id: 'BUG-002', sev: '치명', status: '재검증 통과', title: '2기기에서 같은 아이템을 동시에 팔면 골드가 두 번 지급됨', rate: '7/10', env: 'Windows 11 크롬 130 + Android 14', build: '0.9.2 → 0.9.4 수정', tc: 'IV-003',
    steps: ['PC 크롬과 Android에 같은 계정 로그인 (PC는 관전 모드)', '양쪽 인벤토리에서 같은 장비 선택', '판매 버튼을 동시에 누름 (자동화 스크립트 사용)', '골드 로그 확인'],
    actual: '0.9.2 빌드에서 판매 요청 2건이 모두 처리되어 골드 2배 지급.',
    expected: '아이템 단위 잠금으로 1건만 처리', video: '0:31', files: ['server_log_sell.txt'] },
  { id: 'BUG-003', sev: '높음', status: '수정 완료', title: '중복 로그인 시 기존 기기가 알림 없이 무한 로딩', rate: '10/10', env: 'iOS 17 · 아이폰 13 · Wi-Fi', build: '0.9.4', tc: 'LG-007',
    steps: ['기기 A(아이폰 13) 로비 대기', '기기 B에서 같은 계정으로 로그인', '기기 A에서 메뉴 터치'],
    actual: '기기 A가 로딩 아이콘에서 멈추고 앱을 강제 종료해야 함.',
    expected: '"다른 기기에서 접속했습니다" 알림 후 타이틀 화면', video: '0:22', files: ['xcode_console_bug003.txt'] },
  { id: 'BUG-004', sev: '높음', status: '수정중', title: '방 마지막 자리에 동시 입장하면 정원 4명 방에 5명이 들어감', rate: '3/10', env: '스테이징 서버 · 자동화 클라이언트 5개', build: '0.9.4', tc: 'MP-004',
    steps: ['4인 방에 3명 입장', '대기 클라이언트 5개가 50ms 안에 입장 요청', '방 인원과 서버 로그 확인'],
    actual: '2명이 입장되어 인원 5/4 표시, 전투 시작 시 1명 튕김.',
    expected: '1명만 입장, 나머지 4명은 정원 초과 안내', video: '0:40', files: ['join_race.k6.js', 'room_log.txt'] },
  { id: 'BUG-005', sev: '보통', status: '신규', title: '세션 만료 후 복귀하면 재인증 팝업이 두 번 뜸', rate: '10/10', env: 'Android 14 · 갤럭시 S23', build: '0.9.4', tc: 'LG-008',
    steps: ['로그인 후 홈 버튼으로 백그라운드 전환', '31분 대기', '앱 복귀 후 상점 진입'],
    actual: '재인증 팝업이 겹쳐 2개 노출, 첫 번째 확인 후 두 번째가 남음.',
    expected: '팝업 1회 노출', video: '0:18', files: [] },
  { id: 'BUG-006', sev: '보통', status: '신규', title: 'Wi-Fi에서 LTE 전환 시 재접속이 12~15초 걸림', rate: '6/10', env: 'iOS 17 · 아이폰 13', build: '0.9.4', tc: 'MP-006',
    steps: ['방 안에서 대기', '제어 센터에서 Wi-Fi 끄기', '방 화면 복귀 시간 측정 (10회)'],
    actual: '평균 13.2초, 최대 15.1초. 재연결 재시도 간격이 5초 고정으로 보임.',
    expected: '10초 이내 복귀', video: '1:05', files: ['reconnect_timing.csv'] },
  { id: 'BUG-007', sev: '낮음', status: '보류', title: '저해상도 기기에서 계정 연동 완료 문구가 잘림', rate: '10/10', env: 'Android 12 · 갤럭시 A23', build: '0.9.4', tc: 'LG-005',
    steps: ['게스트 계정으로 설정 > 계정 연동', '구글 연동 완료'],
    actual: '토스트 문구 끝 "...유지됩니다"가 잘려 보임.',
    expected: '문구 전체 노출 또는 두 줄 처리', video: '0:09', files: ['screenshot_a23.png'] },
  { id: 'BUG-008', sev: '낮음', status: '재검증 통과', title: 'PC 브라우저 두 번째 탭 로그인 시 경고 문구가 영어로 나옴', rate: '10/10', env: 'Windows 11 · 크롬 130', build: '0.9.3 → 0.9.4 수정', tc: 'MP-009',
    steps: ['탭 1 로그인', '같은 브라우저 탭 2에서 로그인', '탭 1 확인'],
    actual: '"Session terminated" 영문 문구 노출.',
    expected: '한국어 안내 문구', video: '0:12', files: [] },
];
const OPEN = ['신규', '수정중', '수정 완료'];
const SEV_ORDER = ['치명', '높음', '보통', '낮음'];

const PERF = {
  vu: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
  p50: [82, 88, 95, 104, 118, 135, 160, 192, 240, 305],
  p95: [190, 205, 228, 260, 310, 380, 470, 590, 760, 980],
  err: [0.02, 0.03, 0.03, 0.05, 0.08, 0.12, 0.21, 0.38, 0.74, 1.86],
  rps: [160, 318, 470, 618, 760, 890, 1004, 1090, 1140, 1150],
};

const RUNS = [
  ['smoke.spec (웹)', 'Playwright · 크롬', 12, 0, '0:48'],
  ['login.spec (웹)', 'Playwright · 크롬·사파리', 18, 1, '2:31'],
  ['multi-session.spec', 'Playwright · 2 컨텍스트', 9, 1, '3:05'],
  ['login.e2e (Android)', 'Appium · 갤럭시 S23', 14, 0, '6:12'],
  ['login.e2e (iOS)', 'Appium · 아이폰 13', 14, 1, '7:40'],
  ['inventory.e2e (Android)', 'Appium · 갤럭시 S22', 11, 0, '5:03'],
];
const FLOW = [
  ['푸시·PR', '개발 저장소 변경', '매 커밋'],
  ['빌드', '웹 번들, APK, IPA 생성', '매 커밋'],
  ['스모크', 'Playwright 12건, 실패 시 중단', '약 1분'],
  ['E2E 병렬', '웹 3개, 실기기 3대 동시 실행', '약 8분'],
  ['부하', 'k6 램프업 100→1,000 VU', '매일 밤'],
  ['리포트', 'HTML 리포트와 실패 영상 첨부, 채팅 알림', '자동'],
];

const CODE = {
  k6: `import http from 'k6/http';
import { check, sleep } from 'k6';

// 가상 프로젝트 X 스테이징: 로그인 → 로비 → 방 입장
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '2m', target: 300 },
    { duration: '2m', target: 500 },
    { duration: '2m', target: 800 },
    { duration: '2m', target: 1000 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL; // 스테이징 주소는 환경 변수로 주입

export default function () {
  const login = http.post(\`\${BASE}/auth/guest\`, JSON.stringify({ device: \`vu-\${__VU}\` }),
    { headers: { 'Content-Type': 'application/json' } });
  check(login, { '로그인 200': r => r.status === 200 });
  const token = login.json('accessToken');
  const auth = { headers: { Authorization: \`Bearer \${token}\` } };

  http.get(\`\${BASE}/lobby\`, auth);
  const join = http.post(\`\${BASE}/rooms/join\`, JSON.stringify({ mode: 'pvp4' }), auth);
  check(join, { '방 입장 성공': r => r.status === 200 || r.status === 409 });
  sleep(1);
}`,
  pw: `import { test, expect } from '@playwright/test';

// 동일 계정으로 브라우저 컨텍스트 2개를 열어 중복 로그인 처리를 확인
test('후접속 탭만 세션 유지', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();

  for (const page of [a, b]) {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(process.env.QA_USER);
    await page.getByLabel('비밀번호').fill(process.env.QA_PASS);
    await page.getByRole('button', { name: '로그인' }).click();
  }

  await expect(b.getByTestId('lobby')).toBeVisible();
  await a.getByRole('button', { name: '상점' }).click();
  await expect(a.getByRole('dialog')).toContainText('다른 기기에서 접속했습니다');
  await expect(a).toHaveURL(/\\/title/);
});`,
  ap: `// WebdriverIO + Appium (UiAutomator2 / XCUITest)
describe('세션 만료 후 복귀', () => {
  it('재인증 팝업은 한 번만 뜬다', async () => {
    await $('~guest-start').click();
    await expect($('~lobby')).toBeDisplayed();

    // 테스트 서버에서 세션 수명을 60초로 줄여 둔 상태
    await driver.background(61);

    await $('~menu-shop').click();
    const dialogs = await $$('~reauth-dialog');
    expect(dialogs.length).toBe(1);

    await dialogs[0].$('~confirm').click();
    await expect($('~shop')).toBeDisplayed();
  });
});`,
};

/* ---------- 공통 ---------- */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 1600);
}
function highlight(src) {
  const re = /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|default|const|let|function|return|await|async|for|of|new|describe|it|test)\b|\b(\d+(?:\.\d+)?)\b/g;
  let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : 'n';
    out += `<span class="${cls}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}
document.addEventListener('click', e => {
  const b = e.target.closest('.copy'); if (!b) return;
  const text = $('#' + b.dataset.copy).textContent;
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
    .then(() => toast('코드를 복사했습니다'), () => toast('복사 권한이 없어 직접 선택해 주세요'));
});

/* ---------- 탭 ---------- */
const tabs = [...document.querySelectorAll('.tabs [role=tab]')];
function show(id) {
  if (!document.getElementById(id)) id = 'plan';
  tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.tab === id));
  document.querySelectorAll('.panel').forEach(p => { p.hidden = p.id !== id; });
  const t = tabs.find(x => x.dataset.tab === id), bar = t.parentElement;
  bar.scrollLeft = t.offsetLeft - (bar.clientWidth - t.offsetWidth) / 2;
  requestAnimationFrame(() => window.scrollTo(0, 0)); // 해시 이동 시 패널 위치로 튀는 것 방지
  if (id === 'perf') drawCharts();
  if (id === 'summary') renderSummary();
}
tabs.forEach(t => t.addEventListener('click', () => { history.replaceState(null, '', '#' + t.dataset.tab); show(t.dataset.tab); }));

/* ---------- 1. 계획 ---------- */
$('#matrix').innerHTML = `<thead><tr><th>OS</th><th>기기·브라우저</th>${MATRIX.cols.map(c => `<th class="c">${c}</th>`).join('')}</tr></thead>
<tbody>${MATRIX.rows.map(([os, dev, v]) => `<tr><td><b>${os}</b></td><td>${dev}</td>${v.map(x => `<td class="c">${x}</td>`).join('')}</tr>`).join('')}</tbody>`;
$('#timeline').innerHTML = TIMELINE.map(([d, t, p, done]) => `<li class="${done ? 'done' : ''}"><span class="d">${d}</span><b>${t}</b><p>${p}</p></li>`).join('');

/* ---------- 2. 케이스 ---------- */
const areas = [...new Set(CASES.map(c => c[1]))];
$('#fArea').innerHTML += areas.map(a => `<option>${a}</option>`).join('');
function mark(text, q) {
  const s = esc(text); if (!q) return s;
  const i = text.toLowerCase().indexOf(q); if (i < 0) return s;
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}
function renderCases() {
  const q = $('#q').value.trim().toLowerCase(), a = $('#fArea').value, r = $('#fRes').value;
  const list = CASES.filter(c => (!a || c[1] === a) && (!r || c[6] === r) &&
    (!q || [c[0], c[2], c[3], c[4].join(' '), c[5]].join(' ').toLowerCase().includes(q)));
  $('#caseBody').innerHTML = list.map(([id, area, title, pre, steps, exp, res, bug]) => `<tr>
    <td data-l="ID">${mark(id, q)}</td>
    <td class="t" data-l="케이스"><b>${mark(title, q)}</b><small>${area}</small></td>
    <td data-l="사전조건">${mark(pre, q)}</td>
    <td data-l="단계"><ol>${steps.map(s => `<li>${mark(s, q)}</li>`).join('')}</ol></td>
    <td data-l="기대결과">${mark(exp, q)}</td>
    <td data-l="결과"><span class="pill ${res}">${res}</span>${bug ? `<a href="#bugs" data-bug="${bug}">${bug}</a>` : ''}</td></tr>`).join('');
  $('#caseCount').textContent = `${list.length} / ${CASES.length}건`;
  $('#caseEmpty').hidden = list.length > 0;
}
['input', 'change'].forEach(ev => ['#q', '#fArea', '#fRes'].forEach(s => $(s).addEventListener(ev, renderCases)));
$('#caseBody').addEventListener('click', e => {
  const a = e.target.closest('[data-bug]'); if (!a) return;
  e.preventDefault(); sevFilter = ''; renderBugs(a.dataset.bug);
  history.replaceState(null, '', '#bugs'); show('bugs');
});
renderCases();

/* ---------- 3. 버그 ---------- */
let sevFilter = '', currentBug = BUGS[0].id;
function renderBugs(select) {
  if (select) currentBug = select;
  $('#sevStrip').innerHTML = [['', '전체', BUGS.length], ...SEV_ORDER.map(s => [s, s, BUGS.filter(b => b.sev === s).length])]
    .map(([v, l, n]) => `<button data-sev="${v}" aria-pressed="${sevFilter === v}">${l} ${n}</button>`).join('');
  const list = BUGS.filter(b => !sevFilter || b.sev === sevFilter);
  if (!list.some(b => b.id === currentBug) && list[0]) currentBug = list[0].id;
  $('#bugList').innerHTML = list.map(b => `<li><button data-id="${b.id}" aria-current="${b.id === currentBug}">
    <span class="row"><span class="sev ${b.sev}">${b.sev}</span>${b.id}<span class="st">${b.status}</span></span><b>${esc(b.title)}</b></button></li>`).join('');
  const b = BUGS.find(x => x.id === currentBug);
  $('#bugDetail').innerHTML = `<span class="sev ${b.sev}">${b.sev}</span> <span class="note">${b.id} · 연결 케이스 ${b.tc}</span>
    <h2>${esc(b.title)}</h2>
    <dl class="meta"><div><dt>상태</dt><dd>${b.status}</dd></div><div><dt>재현율</dt><dd>${b.rate}</dd></div><div><dt>빌드</dt><dd>${b.build}</dd></div><div><dt>환경</dt><dd>${b.env}</dd></div></dl>
    <h3>재현 단계</h3><ol>${b.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <h3>실제 결과</h3><p>${esc(b.actual)}</p>
    <h3>기대 결과</h3><p>${esc(b.expected)}</p>
    <h3>첨부</h3>
    <div class="video" role="img" aria-label="녹화 영상 자리"><div><div class="play"></div>녹화 영상 자리 · ${b.id}_repro.mp4 (${b.video})<br>실제 납품 시 화면 녹화 영상 링크가 들어갑니다</div></div>
    ${b.files.length ? `<div class="files">${b.files.map(f => `<span>${f}</span>`).join('')}</div>` : ''}`;
}
$('#sevStrip').addEventListener('click', e => { const b = e.target.closest('[data-sev]'); if (b) { sevFilter = b.dataset.sev; renderBugs(); } });
$('#bugList').addEventListener('click', e => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  renderBugs(b.dataset.id);
  if (innerWidth <= 900) $('#bugDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
renderBugs();

/* ---------- 4. 성능 ---------- */
const PASS_P95 = 800, PASS_ERR = 1;
const lastOk = PERF.vu.filter((v, i) => PERF.p95[i] <= PASS_P95 && PERF.err[i] <= PASS_ERR).pop();
const n = PERF.vu.length - 1;
$('#perfKpi').innerHTML = [
  ['기준 충족 최대', `${lastOk.toLocaleString()} VU`, 'p95 800ms, 오류 1% 이하', 'good'],
  ['1,000 VU p95', `${PERF.p95[n]}ms`, `p50 ${PERF.p50[n]}ms`, PERF.p95[n] > PASS_P95 ? 'bad' : 'good'],
  ['1,000 VU 오류율', `${PERF.err[n]}%`, '주로 rooms/join 504', PERF.err[n] > PASS_ERR ? 'bad' : 'good'],
  ['최대 처리량', `${Math.max(...PERF.rps).toLocaleString()} rps`, '900 VU 이후 포화', ''],
].map(([l, v, s, c]) => `<div class="kpi ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`).join('');
$('#perfFinding').textContent = `${lastOk} VU까지는 목표를 충족했습니다. 1,000 VU에서 p95 ${PERF.p95[n]}ms, 오류율 ${PERF.err[n]}%로 기준을 넘었고 처리량은 1,140 rps 부근에서 더 늘지 않습니다. 방 입장 API의 DB 잠금 대기가 원인으로 보여 서버 측 확인을 요청했습니다.`;
$('#k6').innerHTML = highlight(CODE.k6);

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function chart(cv, series, { max, target, fmt, area }) {
  const w = cv.clientWidth; if (!w) return;
  const h = +cv.getAttribute('height'), dpr = devicePixelRatio || 1;
  cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px';
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const L = 46, R = 20, T = 10, B = 26, pw = w - L - R, ph = h - T - B;
  const x = i => L + pw * i / (PERF.vu.length - 1), y = v => T + ph * (1 - v / max);
  g.font = '11px system-ui,sans-serif'; g.fillStyle = cssVar('--ink3'); g.strokeStyle = cssVar('--line'); g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    const v = max * k / 4, yy = Math.round(y(v)) + .5;
    g.beginPath(); g.moveTo(L, yy); g.lineTo(w - R, yy); g.stroke();
    g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(fmt(v), L - 6, yy);
  }
  const step = pw < 360 ? 3 : 1;
  g.textAlign = 'center'; g.textBaseline = 'top';
  PERF.vu.forEach((v, i) => { if (i % step === 0 || i === PERF.vu.length - 1) g.fillText(v, x(i), h - B + 8); });
  if (target != null) {
    g.save(); g.setLineDash([4, 4]); g.strokeStyle = cssVar('--ink3');
    g.beginPath(); g.moveTo(L, y(target)); g.lineTo(w - R, y(target)); g.stroke(); g.restore();
  }
  series.forEach(({ data, color }) => {
    const c = cssVar(color);
    if (area) {
      g.beginPath(); g.moveTo(x(0), y(0)); data.forEach((v, i) => g.lineTo(x(i), y(v))); g.lineTo(x(data.length - 1), y(0));
      g.fillStyle = cssVar('--accent-soft'); g.fill();
    }
    g.beginPath(); data.forEach((v, i) => (i ? g.lineTo : g.moveTo).call(g, x(i), y(v)));
    g.strokeStyle = c; g.lineWidth = 2.2; g.stroke();
    g.fillStyle = c; data.forEach((v, i) => { g.beginPath(); g.arc(x(i), y(v), 2.6, 0, 7); g.fill(); });
  });
}
function drawCharts() {
  chart($('#cLat'), [{ data: PERF.p50, color: '--accent' }, { data: PERF.p95, color: '--fail' }], { max: 1000, target: PASS_P95, fmt: v => v });
  chart($('#cErr'), [{ data: PERF.err, color: '--fail' }], { max: 2, target: PASS_ERR, fmt: v => v.toFixed(1) });
  chart($('#cRps'), [{ data: PERF.rps, color: '--accent' }], { max: 1200, fmt: v => v.toLocaleString(), area: true });
}
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!$('#perf').hidden) drawCharts(); }, 120); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!$('#perf').hidden) drawCharts(); });

/* ---------- 5. 자동화 ---------- */
$('#flow').innerHTML = FLOW.map(([t, d, w]) => `<li><span class="when">${w}</span><b>${t}</b><small>${d}</small></li>`).join('');
const tp = RUNS.reduce((s, r) => s + r[2], 0), tf = RUNS.reduce((s, r) => s + r[3], 0);
$('#runs').innerHTML = `<thead><tr><th>스위트</th><th>도구·환경</th><th class="num">통과</th><th class="num">실패</th><th class="num">소요</th></tr></thead>
<tbody>${RUNS.map(([s, e, p, f, d]) => `<tr><td><b>${s}</b></td><td>${e}</td><td class="num ok">${p}</td><td class="num ${f ? 'ng' : ''}">${f}</td><td class="num">${d}</td></tr>`).join('')}
<tr><td><b>합계</b></td><td>11/23 야간 실행 (가상)</td><td class="num ok">${tp}</td><td class="num ng">${tf}</td><td class="num">통과율 ${((tp / (tp + tf)) * 100).toFixed(1)}%</td></tr></tbody>`;
const codeTabs = [...document.querySelectorAll('.code-tabs [role=tab]')];
function showCode(k) { codeTabs.forEach(b => b.setAttribute('aria-selected', b.dataset.code === k)); $('#codeView').innerHTML = highlight(CODE[k]); }
codeTabs.forEach(b => b.addEventListener('click', () => showCode(b.dataset.code)));
showCode('pw');

/* ---------- 6. 요약 ---------- */
let assumeFixed = false;
function renderSummary() {
  const status = b => (assumeFixed && b.id === 'BUG-001') ? '재검증 통과' : b.status;
  const open = BUGS.filter(b => OPEN.includes(status(b)));
  const crit = open.filter(b => b.sev === '치명').length, high = open.filter(b => b.sev === '높음').length;
  const pass = CASES.filter(c => c[6] === 'Pass').length, fail = CASES.filter(c => c[6] === 'Fail').length, block = CASES.length - pass - fail;
  const rate = pass / (CASES.length - block) * 100;
  const perfOk = PERF.p95[n] <= PASS_P95 && PERF.err[n] <= PASS_ERR;
  let cls, head, body;
  if (crit) { cls = 'hold'; head = '출시 보류 권고'; body = `미해결 치명 버그 ${crit}건(결제 미지급)이 남아 있습니다. 수정 빌드 재검증 후 다시 판단합니다.`; }
  else if (high > 2 || !perfOk) { cls = 'cond'; head = '조건부 출시 권고'; body = `치명 버그는 없습니다. 다만 ${!perfOk ? `동시접속 1,000 VU에서 성능 기준 초과(최대 ${lastOk} VU까지 충족)` : ''}${!perfOk && high ? ', ' : ''}${high ? `높음 ${high}건 미해결` : ''}이므로 동시접속 상한 설정 또는 서버 증설을 조건으로 권고합니다.`; }
  else { cls = 'go'; head = '출시 권고'; body = '종료 기준을 모두 충족했습니다.'; }
  $('#verdict').className = 'verdict ' + cls;
  $('#verdict').innerHTML = `<b>${head}</b><p>${body}</p><button id="whatIf" aria-pressed="${assumeFixed}">${assumeFixed ? '원래 상태로 보기' : 'BUG-001 재검증 통과로 가정해 보기'}</button>`;
  $('#whatIf').onclick = () => { assumeFixed = !assumeFixed; renderSummary(); };
  $('#sumKpi').innerHTML = [
    ['테스트 케이스', CASES.length + '건', `Pass ${pass} · Fail ${fail} · Block ${block}`, ''],
    ['통과율', rate.toFixed(1) + '%', 'Block 제외 기준, 목표 95%', rate >= 95 ? 'good' : 'bad'],
    ['미해결 치명 버그', crit + '건', `전체 버그 ${BUGS.length}건, 미해결 ${open.length}건`, crit ? 'bad' : 'good'],
    ['자동화 통과', `${tp}/${tp + tf}`, '스위트 6개 야간 실행', ''],
  ].map(([l, v, s, c]) => `<div class="kpi ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`).join('');
  $('#areaBars').innerHTML = areas.map(a => {
    const cs = CASES.filter(c => c[1] === a), t = cs.length, p = cs.filter(c => c[6] === 'Pass').length, f = cs.filter(c => c[6] === 'Fail').length;
    return `<div class="bar"><span>${a}</span><span class="track" aria-label="Pass ${p}, Fail ${f}, Block ${t - p - f}"><i class="p" style="width:${p / t * 100}%"></i><i class="f" style="width:${f / t * 100}%"></i><i class="b" style="width:${(t - p - f) / t * 100}%"></i></span><span>${p}/${t}</span></div>`;
  }).join('') + '<p class="note">초록 Pass · 빨강 Fail · 노랑 Block</p>';
}

show(location.hash.slice(1));
addEventListener('hashchange', () => show(location.hash.slice(1)));
