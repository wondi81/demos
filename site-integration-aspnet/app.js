(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const el = (tag, attrs, text) => {
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    return n;
  };

  /* ---------- 탭 (키보드: 좌우 화살표, Home/End) ---------- */
  function tabs(list, onSelect) {
    const btns = $$('[role=tab]', list);
    function select(b, focus) {
      btns.forEach(x => { const on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
      if (focus) b.focus();
      onSelect(b);
    }
    btns.forEach((b, i) => {
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', e => {
        const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: btns.length - 1 }[e.key];
        if (k == null) return;
        e.preventDefault();
        select(btns[(k + btns.length) % btns.length], true);
      });
    });
  }
  const panels = $$('.panel');
  tabs($('.top .tabs'), b => panels.forEach(p => { p.hidden = p.id !== b.getAttribute('aria-controls'); if (!p.hidden) fit(); }));

  /* ---------- 1. 홈페이지 시안 ---------- */
  // WordPress REST /wp-json/wp/v2/posts?_embed 응답 모양 (가상 데이터, 이미지 없음 -> CSS 그라디언트)
  const POSTS = [
    { id: 1842, date: '2025-03-18T09:30:00', link: 'https://blog.example.com/2025/03/erp-data-cleanup/',
      title: { rendered: '업무 데이터 정리, 시스템 옮기기 전에 먼저 할 일' },
      excerpt: { rendered: '<p>옮기기 전에 중복·빈 값부터 정리하면 이전 비용이 줄어듭니다. 현장에서 쓰는 점검표를 공유합니다.</p>\n' },
      _embedded: { author: [{ name: '운영팀' }], 'wp:term': [[{ name: '운영 노하우' }]] } },
    { id: 1827, date: '2025-03-04T14:00:00', link: 'https://blog.example.com/2025/03/mobile-first-admin/',
      title: { rendered: '모바일에서도 불편 없는 관리 화면 만들기' },
      excerpt: { rendered: '<p>표가 많은 관리 화면을 휴대폰에서 읽기 쉽게 바꾸는 세 가지 방법을 정리했습니다.</p>\n' },
      _embedded: { author: [{ name: '디자인팀' }], 'wp:term': [[{ name: '디자인' }]] } },
    { id: 1809, date: '2025-02-20T10:10:00', link: 'https://blog.example.com/2025/02/release-note-2-5/',
      title: { rendered: '서비스 2.5 업데이트 안내 &#8211; 보고서 내려받기 개선' },
      excerpt: { rendered: '<p>월별 보고서를 엑셀로 내려받는 속도가 빨라지고, 검색 조건이 저장됩니다.</p>\n' },
      _embedded: { author: [{ name: '개발팀' }], 'wp:term': [[{ name: '공지' }]] } }
  ];
  const GRAD = ['linear-gradient(135deg,#12306b,#2f5fc4)', 'linear-gradient(135deg,#1fa89a,#7fd8cd)', 'linear-gradient(135deg,#7a55d6,#b9a2f1)'];
  // WP 응답의 rendered 필드는 HTML이므로 textContent로만 꺼낸다 (태그·엔티티 제거)
  const plain = h => new DOMParser().parseFromString(h, 'text/html').body.textContent.trim();

  const posts = $('#posts');
  POSTS.forEach((p, i) => {
    const a = el('a', { class: 's-post', href: p.link });
    const th = el('div', { class: 's-thumb' });
    th.style.background = GRAD[i % GRAD.length];
    th.appendChild(el('span', null, p._embedded['wp:term'][0][0].name));
    const b = el('div', { class: 's-post-b' });
    b.append(el('time', { datetime: p.date }, p.date.slice(0, 10).replace(/-/g, '.')),
      el('h4', null, plain(p.title.rendered)),
      el('p', null, plain(p.excerpt.rendered)));
    a.append(th, b);
    posts.appendChild(a);
  });
  $('#jsonOut').textContent = JSON.stringify(Object.assign({}, POSTS[0], { excerpt: POSTS[0].excerpt }), null, 2);

  const stage = $('#stage'), frame = $('#frame'), vpNow = $('#vpNow');
  function fit() {
    const w = +frame.dataset.w, s = Math.min(1, stage.clientWidth / w);
    frame.style.width = w + 'px';
    frame.style.marginLeft = (-w / 2) + 'px';
    frame.style.transform = 'scale(' + s + ')';
    stage.style.height = Math.ceil(frame.offsetHeight * s) + 'px';
  }
  $$('.vp button').forEach(b => b.addEventListener('click', () => {
    $$('.vp button').forEach(x => x.setAttribute('aria-pressed', x === b));
    frame.dataset.w = b.dataset.w;
    vpNow.textContent = '현재 틀 너비 ' + b.dataset.w + 'px';
    $('#gnb').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false');
    fit();
  }));
  const burger = $('#burger');
  burger.addEventListener('click', () => {
    const open = $('#gnb').classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  frame.addEventListener('click', e => { if (e.target.closest('a')) e.preventDefault(); }); // 시연용: 이동 안 함
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(frame);
  const iw = window.innerWidth;
  const first = $('.vp button[data-w="' + (iw <= 600 ? 390 : iw <= 1000 ? 768 : 1280) + '"]');
  if (first.dataset.w !== '1280') first.click(); else fit();

  /* ---------- 2. 리디렉션 표 ---------- */
  // host 가 있으면 다른 도메인(블로그) 규칙. query 가 있으면 QUERY_STRING 조건 규칙.
  const NEW_HOST = 'https://www.example.com';
  const ROWS = [
    { path: '/index.html', to: '/', note: '대표 주소 정리' },
    { path: '/about.html', to: '/company', note: '회사소개' },
    { path: '/product/list.html', query: 'cate_no=24', to: '/services/automation', note: '카테고리 번호별로 이동 대상이 다름' },
    { path: '/product/list.html', query: 'cate_no=25', to: '/services/data-integration', note: '같은 파일, 다른 쿼리' },
    { path: '/board/free/list.html', query: 'board_no=1', to: '/support/notice', note: '공지 게시판' },
    { path: '/board/gallery/list.html', query: 'board_no=3', to: '/cases', note: '고객사례 게시판' },
    { path: '/member/login.html', to: '/Service/Login.aspx', note: '기존 서비스 로그인으로 연결' },
    { path: '/member/join.html', to: '/Service/Register.aspx', note: '회원가입 화면' },
    { host: 'blog.example.com', path: '/2025/03/erp-data-cleanup/', to: '/blog/2025/03/erp-data-cleanup/', note: '블로그 글 주소(날짜+슬러그)' },
    { host: 'blog.example.com', path: '/category/news/', to: '/blog/category/news/', note: '블로그 분류 목록' },
    { host: 'blog.example.com', path: '/feed/', to: '/blog/feed/', note: 'RSS 구독 주소 유지' }
  ];
  const oldText = r => (r.host || 'www.example.com') + r.path + (r.query ? '?' + r.query : '');
  const newText = r => NEW_HOST + r.to;

  const tb = $('#rtbl tbody');
  ROWS.forEach((r, i) => {
    const tr = el('tr');
    tr.dataset.s = (oldText(r) + ' ' + newText(r) + ' ' + r.note).toLowerCase();
    [[String(i + 1), '#'], [oldText(r), '기존 주소'], [newText(r), '새 주소'], ['301', '상태'], [r.note, '메모']].forEach((c, j) => {
      const td = el('td'); td.dataset.l = c[1];
      if (j === 1 || j === 2) td.appendChild(el('code', null, c[0]));
      else if (j === 3) td.appendChild(el('span', { class: 'st' }, '301 영구'));
      else td.textContent = c[0];
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  const emptyRow = el('tr', { class: 'empty', hidden: '' });
  const ed = el('td', { colspan: '5' }, '일치하는 주소가 없습니다.');
  emptyRow.appendChild(ed); tb.appendChild(emptyRow);
  const q = $('#q'), cnt = $('#cnt');
  function filter() {
    const k = q.value.trim().toLowerCase();
    let n = 0;
    $$('tr[data-s]', tb).forEach(tr => { const hit = !k || tr.dataset.s.indexOf(k) >= 0; tr.hidden = !hit; if (hit) n++; });
    emptyRow.hidden = n > 0;
    cnt.textContent = n + ' / ' + ROWS.length + '건';
  }
  q.addEventListener('input', filter); filter();

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function buildXml() {
    // 쿼리 조건 규칙 -> 도메인 조건 규칙 -> 단순 규칙 순서
    const rank = r => (r.query ? 0 : r.host ? 1 : 2);
    const sorted = ROWS.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i);
    const out = ['<rewrite>', '  <rules>'];
    sorted.forEach(({ r, i }) => {
      const slug = r.path.replace(/^\/|\/$/g, '').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() || 'home';
      const tail = r.path.slice(-1) === '/' ? '/?' : '';
      const pat = '^' + rx(r.path.replace(/^\/|\/$/g, '')) + tail + '$';
      const conds = [];
      if (r.host) conds.push('<add input="{HTTP_HOST}" pattern="^' + esc(rx(r.host)) + '$" />');
      if (r.query) conds.push('<add input="{QUERY_STRING}" pattern="' + esc('(^|&)' + rx(r.query) + '(&|$)') + '" />');
      out.push('    <rule name="' + esc('redir-' + String(i + 1).padStart(2, '0') + '-' + slug) + '" stopProcessing="true">');
      out.push('      <match url="' + esc(r.path === '/index.html' ? '^index\\.html$' : pat) + '" />');
      if (conds.length) out.push('      <conditions logicalGrouping="MatchAll">', ...conds.map(c => '        ' + c), '      </conditions>');
      out.push('      <action type="Redirect" url="' + esc(NEW_HOST + r.to) + '" redirectType="Permanent" appendQueryString="false" />');
      out.push('    </rule>');
    });
    out.push('  </rules>', '</rewrite>');
    return out.join('\n');
  }
  const xmlBox = $('#xmlBox'), xmlOut = $('#xmlOut'), showXml = $('#showXml');
  showXml.addEventListener('click', () => {
    const open = xmlBox.hidden;
    if (open) xmlOut.textContent = buildXml();
    xmlBox.hidden = !open;
    showXml.setAttribute('aria-expanded', open);
    showXml.textContent = open ? 'web.config 규칙 닫기' : 'web.config 규칙 보기';
  });
  $('#copyXml').addEventListener('click', async () => {
    const msg = $('#copyMsg');
    try {
      await navigator.clipboard.writeText(xmlOut.textContent);
      msg.textContent = '복사했습니다.';
    } catch (e) {
      const sel = getSelection(), rg = document.createRange();
      rg.selectNodeContents(xmlOut); sel.removeAllRanges(); sel.addRange(rg);
      msg.textContent = '자동 복사가 막혀 선택해 두었습니다. Ctrl+C로 복사하세요.';
    }
  });

  /* ---------- 3. 코드 예시 ---------- */
  const CODE = {
    'c-master': `<%@ Master Language="C#" AutoEventWireup="true"
    CodeBehind="Site.master.cs" Inherits="Onnuri.SiteMaster" %>
<!DOCTYPE html>
<html lang="ko">
<head runat="server">
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><asp:ContentPlaceHolder ID="TitleContent" runat="server" /> | 온누리솔루션</title>
  <link href="~/Content/site.css" rel="stylesheet" runat="server" />
  <asp:ContentPlaceHolder ID="HeadContent" runat="server" />
</head>
<body>
  <form id="form1" runat="server">
    <header class="site-header">
      <a class="brand" href="<%= ResolveUrl("~/") %>">온누리솔루션</a>
      <button type="button" class="nav-toggle" aria-expanded="false"
              aria-controls="gnb">메뉴</button>
      <nav id="gnb" aria-label="주 메뉴">
        <a runat="server" href="~/Company.aspx">회사소개</a>
        <a runat="server" href="~/Services.aspx">서비스</a>
        <a runat="server" href="~/Cases.aspx">고객사례</a>
        <a runat="server" href="~/blog/">블로그</a>
        <a runat="server" href="~/Support.aspx">고객센터</a>
        <a runat="server" class="cta" href="~/Service/Login.aspx">서비스 바로가기</a>
      </nav>
    </header>
    <main>
      <asp:ContentPlaceHolder ID="MainContent" runat="server" />
    </main>
    <footer>가상기업 온누리솔루션</footer>
  </form>
  <script src="<%= ResolveUrl("~/Scripts/site.js") %>"></script>
</body>
</html>`,
    'c-cs': `using System; using System.Collections.Generic; using System.Configuration;
using System.Data; using System.Data.SqlClient; using System.Net.Http;
using System.Threading.Tasks; using System.Web; using System.Web.Caching;
using System.Web.Script.Serialization; using System.Web.UI;

public partial class _Default : Page   // @Page Async="true"
{
    static readonly HttpClient Http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
    protected void Page_Load(object sender, EventArgs e)
    {
        if (IsPostBack) return;
        BindNotices();
        RegisterAsyncTask(new PageAsyncTask(BindPostsAsync));
    }
    async Task BindPostsAsync()   // WordPress 최신글: 10분 캐시
    {
        var posts = HttpRuntime.Cache["posts"] as List<Dictionary<string, object>>;
        if (posts == null)
        {
            try {
                var url = ConfigurationManager.AppSettings["WpApi"] + "posts?per_page=3&_embed";
                posts = new JavaScriptSerializer().Deserialize<List<Dictionary<string, object>>>(
                    await Http.GetStringAsync(url));
                HttpRuntime.Cache.Insert("posts", posts, null,
                    DateTime.UtcNow.AddMinutes(10), Cache.NoSlidingExpiration);
            } catch (Exception) { posts = new List<Dictionary<string, object>>(); }  // 실패해도 홈은 정상
        }
        rptPosts.DataSource = posts; rptPosts.DataBind();
    }
    void BindNotices()   // 읽기 전용 뷰 + 매개변수
    {
        var cs = ConfigurationManager.ConnectionStrings["ServiceDb"].ConnectionString;
        using (var cn = new SqlConnection(cs))
        using (var cmd = new SqlCommand("SELECT TOP (@n) Title, PostedAt FROM dbo.vw_HomeNotice " +
                                        "WHERE IsPublic = @pub ORDER BY PostedAt DESC", cn))
        {
            cmd.Parameters.Add("@n", SqlDbType.Int).Value = 5;
            cmd.Parameters.Add("@pub", SqlDbType.Bit).Value = true;
            cn.Open();
            using (var rd = cmd.ExecuteReader()) { rptNotices.DataSource = rd; rptNotices.DataBind(); }
        }
    }
}`,
    'c-cfg': `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <appSettings>
    <add key="WpApi" value="https://blog.example.com/wp-json/wp/v2/" />
  </appSettings>
  <connectionStrings>
    <!-- 홈페이지용 계정: vw_Home* 뷰에 SELECT 권한만 부여 -->
    <add name="ServiceDb" providerName="System.Data.SqlClient"
         connectionString="Data Source=DB-SERVER;Initial Catalog=ServiceDb;User ID=home_reader;Password=(서버에서 별도 관리)" />
  </connectionStrings>
  <system.web>
    <compilation debug="false" targetFramework="4.8" />
    <httpRuntime targetFramework="4.8" enableVersionHeader="false" />
    <customErrors mode="RemoteOnly" defaultRedirect="~/Error.aspx" />
  </system.web>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="https-only" stopProcessing="true">
          <match url="(.*)" />
          <conditions><add input="{HTTPS}" pattern="off" /></conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
        <!-- 기존 URL 301 규칙은 리디렉션 표 탭에서 생성한 내용을 여기에 이어 붙임 -->
      </rules>
    </rewrite>
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="7.00:00:00" />
    </staticContent>
  </system.webServer>
</configuration>`
  };
  const codeOut = $('#codeOut');
  codeOut.textContent = CODE['c-master'];
  tabs($('.tabs.sm'), b => { codeOut.textContent = CODE[b.id]; });

  /* ---------- 4. 검수 기준표 ---------- */
  const QA = [
    ['PC·태블릿·모바일에서 모든 페이지가 깨지지 않고 보인다', '실기기·에뮬레이터 3종(PC, 태블릿, 스마트폰)으로 주요 페이지를 열어 가로 스크롤·잘림 확인', '기기별 화면 캡처 묶음'],
    ['기존 서비스 흐름이 이전과 똑같이 동작한다', '로그인·조회·등록·수정·파일 올리기·내려받기 등 시나리오 20개 안팎을 이전 서버와 새 서버에서 나란히 실행해 결과 비교', '시나리오별 전후 비교표'],
    ['새 사이트에서 블로그에 들어갈 수 있다', '상단 메뉴·홈 최신글 카드에서 글 상세까지 이동, 구 블로그 주소가 새 주소로 넘어오는지 확인', '이동 경로 캡처, 리디렉션 전수 검사 스크립트 결과'],
    ['Chrome·Edge·Safari에서 확인했다', '브라우저별 같은 체크리스트(레이아웃·로그인·양식 제출·글꼴)를 돌려 차이점 기록', '브라우저별 체크리스트와 캡처'],
    ['운영 서버에 배포되어 정상 서비스 중이다', '배포 후 주요 주소 응답 코드 점검, 구 홈페이지 주소 301 확인, 백업본과 되돌리는 절차 문서 확인', '배포 기록, 응답 코드 점검 결과']
  ];
  const qb = $('#qtbl tbody');
  QA.forEach((r, i) => {
    const tr = el('tr');
    const cells = [[String(i + 1), '#'], [r[0], '검수 기준'], [r[1], '확인 방법'], [r[2], '남기는 증빙']];
    cells.forEach((c, j) => { const td = el('td'); td.dataset.l = c[1]; if (j === 1) td.appendChild(el('b', null, c[0])); else td.textContent = c[0]; tr.appendChild(td); });
    const td = el('td'); td.dataset.l = '확인';
    const lb = el('label', { class: 'sr', for: 'qa' + i }, '검수 기준 ' + (i + 1) + ' 확인');
    const cb = el('input', { type: 'checkbox', class: 'chk', id: 'qa' + i });
    td.append(lb, cb); tr.appendChild(td);
    qb.appendChild(tr);
  });
  qb.addEventListener('change', () => {
    const n = $$('.chk', qb).filter(c => c.checked).length;
    $('#progTx').textContent = n + ' / ' + QA.length + ' 확인';
    $('#progBar').style.width = (n / QA.length * 100) + '%';
  });
})();
