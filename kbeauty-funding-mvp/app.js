'use strict';
/* ONDAM K-Beauty reward funding MVP demo.
   All money logic lives in the "core" section and is covered by selftest() (open with ?test=1). */

// ---------- i18n ----------
const I18N = {
ko: {
  'brand.sub': 'K뷰티 리워드 펀딩',
  'util.demo': '시연 모드', 'util.reset': '데모 초기화', 'util.admin': '관리자 보기', 'util.shop': '고객 화면 보기',
  'util.resetConfirm': '모든 데모 데이터를 처음 상태로 되돌릴까요?', 'util.lang': '언어',
  'nav.list': '펀딩', 'nav.cart': '장바구니', 'nav.credit': '크레딧', 'nav.orders': '주문내역',
  'auth.login': '로그인', 'auth.logout': '로그아웃', 'auth.signup': '회원가입', 'auth.email': '이메일', 'auth.password': '비밀번호 (8자 이상)',
  'auth.name': '이름', 'auth.ref': '추천코드 (선택)', 'auth.refPh': '예: KBEAUTY10', 'auth.google': 'Google로 계속', 'auth.or': '또는',
  'auth.pwNote': '데모에서는 비밀번호를 저장하지 않습니다.', 'auth.submitSignup': '가입하기', 'auth.submitLogin': '로그인',
  'auth.toLogin': '이미 계정이 있나요? 로그인', 'auth.toSignup': '처음이신가요? 회원가입', 'auth.close': '닫기',
  'auth.refInfo': '추천코드로 가입하면 나와 추천인 모두 {amt} 크레딧을 받습니다.',
  'hero.title': '한국에서 막 나온 뷰티 신제품, 가장 먼저 만나 보세요',
  'hero.sub': '리워드 펀딩으로 참여하면 한국에서 베트남·태국까지 직접 보내 드립니다.',
  'fx.note': '외화 금액은 고정 환율 기준 참고용이며, 결제는 원화로 진행됩니다.', 'fx.ref': '참고',
  'f.goal': '목표 {amt}', 'f.backers': '{n}명 참여', 'f.dday': 'D-{n}', 'f.dToday': 'D-Day', 'f.closed': '마감', 'f.success': '목표 달성',
  'f.soldout': '품절', 'f.open': '진행중', 'f.rewards': '리워드 선택', 'f.left': '남은 수량 {n}개', 'f.limit': '한정 {n}개',
  'f.add': '담기', 'f.back': '목록으로', 'f.closedMsg': '마감된 펀딩이라 참여할 수 없습니다.', 'f.deadline': '{date} 마감', 'f.inCart': '장바구니 {n}개',
  'cart.empty': '장바구니가 비어 있습니다.', 'cart.browse': '펀딩 둘러보기', 'cart.remove': '삭제', 'cart.items': '담은 리워드',
  'ship.title': '배송 정보', 'ship.name': '받는 분', 'ship.phone': '연락처', 'ship.country': '배송 국가', 'ship.address': '주소', 'ship.zip': '우편번호 (선택)',
  'country.KR': '대한민국', 'country.VN': '베트남', 'country.TH': '태국', 'country.pick': '선택하세요',
  'pay.title': '결제', 'pay.total': '주문 금액', 'pay.credit': '크레딧 사용', 'pay.all': '최대 사용', 'pay.balance': '보유 {amt}',
  'pay.card': '카드 결제 금액', 'pay.submit': '결제하기', 'pay.loginFirst': '결제하려면 로그인하세요.', 'pay.creditOnly': '크레딧으로 전액 결제됩니다.',
  'pg.title': 'PG 결제창 (테스트)', 'pg.merchant': '가맹점', 'pg.merchantName': 'ONDAM 펀딩 (가상)', 'pg.amount': '결제 금액', 'pg.item': '결제 내용',
  'pg.notice': '카드 정보는 PG사 결제창에서만 입력되고 우리 서버에 저장되지 않습니다.', 'pg.approve': '승인 (테스트)', 'pg.fail': '실패 (테스트)',
  'pg.forOrder': '주문 {id}', 'pg.forCharge': '크레딧 충전', 'pg.hint': '실제 서비스에서는 이 자리에 PG사 결제창이 열립니다. 닫으면 결제 취소로 처리됩니다.',
  'credit.title': '내 크레딧', 'credit.balance': '사용 가능 잔액', 'credit.charge': '충전하기', 'credit.chargeNote': '크레딧은 선불 바우처입니다. 충전도 PG 승인을 거칩니다.',
  'credit.ledger': '크레딧 장부', 'credit.ledgerNote': '장부는 추가만 가능하고 수정·삭제할 수 없습니다. 잔액은 장부 합계로 계산합니다.',
  'credit.ok': '장부 검증 통과 · 장부 합계 {a} = 저장 잔액 {b}', 'credit.bad': '장부 불일치 경고 · 장부 합계 {a} ≠ 저장 잔액 {b}',
  'credit.myCode': '내 추천코드', 'credit.refHint': '친구가 이 코드로 가입하면 친구와 나 모두 {amt} 크레딧', 'credit.refApply': '추천코드 등록',
  'credit.refDone': '추천 보상을 받은 계정입니다.', 'credit.refLater': '가입 때 추천코드를 못 넣었다면 한 번 등록할 수 있습니다.', 'credit.apply': '등록',
  'credit.empty': '아직 기록이 없습니다.', 'credit.login': '크레딧과 주문내역은 로그인 후 볼 수 있습니다.',
  'lt.charge': '충전', 'lt.use': '사용', 'lt.use_cancel': '결제 실패 복원', 'lt.refund': '환불 복원', 'lt.referral': '추천 보상',
  'col.balance': '잔액 {amt}', 'col.ref': '관련 {ref}',
  'ord.empty': '주문 내역이 없습니다.', 'ord.paidBy': '크레딧 {c} + 카드 {k}', 'ord.shipTo': '{name} · {country}',
  'st.pending': '결제 대기', 'st.paid': '결제완료', 'st.ready': '배송준비', 'st.refunded': '환불', 'st.failed': '결제 실패',
  'admin.title': '관리자', 'admin.note': '시연용 전환입니다. 실서비스는 관리자 권한 계정과 별도 경로로만 접근합니다.',
  'admin.newFunding': '펀딩 등록', 'admin.fTitle': '펀딩 제목', 'admin.fType': '제품 종류', 'admin.fGoal': '목표 금액 (원)', 'admin.fDeadline': '마감일',
  'admin.reward': '리워드 {n}', 'admin.rName': '리워드명', 'admin.rPrice': '가격 (원)', 'admin.rLimit': '한정 수량', 'admin.optional': '(선택)', 'admin.create': '펀딩 등록',
  'admin.fundings': '펀딩 현황', 'admin.orders': '주문 목록', 'admin.toReady': '배송준비로 변경', 'admin.refund': '환불 처리',
  'admin.refundConfirm': '주문 {id}를 환불할까요? 카드분은 PG 취소 요청, 크레딧분은 장부에 복원됩니다.', 'admin.noOrders': '주문이 없습니다.',
  'admin.pgLog': 'PG 기록', 'admin.noPg': 'PG 기록이 없습니다.', 'admin.ledgerCheck': '장부 검증 (회원별)', 'admin.tamper': '저장 잔액 변조 시연',
  'admin.recalc': '장부 기준으로 잔액 맞추기', 'admin.members': '회원 {n}명', 'admin.allLedger': '전체 장부 {n}건',
  'pgl.approve': 'PG 승인', 'pgl.fail': 'PG 실패', 'pgl.cancel': 'PG 취소 요청',
  'msg.added': '장바구니에 담았습니다.', 'msg.stock': '남은 수량을 초과할 수 없습니다.', 'msg.closed': '마감된 펀딩입니다.',
  'msg.required': '{f} 항목을 확인하세요.', 'msg.paid': '결제가 승인되었습니다. 주문 {id}', 'msg.failed': '결제가 실패했습니다. 재고와 크레딧을 원래대로 되돌렸습니다.',
  'msg.charged': '{amt} 충전되었습니다.', 'msg.chargeFail': '충전 결제가 실패했습니다. 장부에는 기록되지 않습니다.', 'msg.refunded': '주문 {id} 환불 처리 완료',
  'msg.refundOnce': '이미 환불된 주문입니다. 환불은 한 번만 가능합니다.', 'msg.refundState': '환불할 수 없는 상태의 주문입니다.',
  'msg.refInvalid': '유효하지 않은 추천코드입니다.', 'msg.refSelf': '본인 추천코드는 사용할 수 없습니다.', 'msg.refDup': '추천 보상은 계정당 한 번만 받을 수 있습니다.',
  'msg.emailDup': '이미 가입된 이메일입니다.', 'msg.noUser': '가입되지 않은 이메일입니다.', 'msg.pw': '비밀번호는 8자 이상이어야 합니다.',
  'msg.email': '이메일 형식을 확인하세요.', 'msg.name': '이름을 입력하세요.', 'msg.creditOver': '사용할 크레딧이 보유 잔액이나 주문 금액을 넘습니다.',
  'msg.neg': '잔액은 음수가 될 수 없습니다.', 'msg.mismatch': '장부와 저장 잔액이 달라 거래를 막았습니다. 관리자 확인이 필요합니다.',
  'msg.welcome': '{name}님, 환영합니다.', 'msg.refOk': '추천 보상 {amt}이 지급되었습니다.', 'msg.created': '펀딩이 등록되었습니다.',
  'msg.login': '먼저 로그인하세요.', 'msg.reset': '데모 데이터를 초기화했습니다.', 'msg.cartEmpty': '장바구니가 비어 있습니다.',
  'msg.state': '처리할 수 없는 상태입니다.', 'msg.form': '입력값을 확인하세요.', 'msg.ready': '배송준비로 변경했습니다.', 'msg.tampered': '저장 잔액을 임의로 바꿨습니다. 경고를 확인하세요.',
  'msg.recalc': '장부 합계로 저장 잔액을 맞췄습니다.', 'msg.pgCancel': '결제창을 닫아 결제를 취소했습니다.',
  'arch.title': '실제 개발 구조',
  'arch.1': '서버: Node.js(Express) API + MongoDB, 앞단 nginx(HTTPS·정적 파일·리버스 프록시)',
  'arch.2': '크레딧 장부: 주문과 장부를 MongoDB 트랜잭션 하나로 동시 기록, 장부 컬렉션은 추가만 허용',
  'arch.3': '결제: 카드 입력은 PG 결제창에서만, PG 웹훅(서명 검증)을 받은 뒤에 승인 확정',
  'arch.4': '환불: 카드분은 PG 취소 API, 크레딧분은 장부 복원 기록, 재고·달성액은 같은 트랜잭션에서 되돌림',
  'arch.5': '관리자: 별도 역할 권한과 관리자 전용 API 경로로 분리, 처리 이력 기록',
  'arch.6': '다국어: ko/en/vi/th 리소스 파일 분리, 상품명·리워드명도 언어별 필드로 저장',
  'badge': '제로투원 시연용 데모 · 모든 데이터는 가상입니다',
  'test.result': 'selftest: {p}개 통과 / {f}개 실패',
  'p.f1.t': '온다루랩 발효 앰플 세럼', 'p.f1.d': '갈락토미세스 발효 원액 92%, 첫 생산 3,000병 한정', 'p.f1.r1': '얼리버드 1병', 'p.f1.r2': '2병 세트', 'p.f1.r3': '3병 + 파우치',
  'p.f2.t': '서하 세라마이드 장벽 크림', 'p.f2.d': '5중 세라마이드, 민감 피부 임상 완료', 'p.f2.r1': '50ml 1개', 'p.f2.r2': '50ml + 리필',
  'p.f3.t': '단비 무기자차 선스틱', 'p.f3.d': 'SPF50+ PA++++, 백탁 없는 더운 기후용', 'p.f3.r1': '선스틱 1개', 'p.f3.r2': '2개 + 미니', 'p.f3.r3': '가족 세트 4개',
  'p.f4.t': '가온 쌀 시트마스크 10매', 'p.f4.d': '여주 쌀 추출물, 1차 물량 완판', 'p.f4.r1': '1박스 (10매)', 'p.f4.r2': '3박스',
  'p.f5.t': '혜슬 어성초 진정 토너', 'p.f5.d': '어성초 77%, 펀딩 종료 후 배송 준비 중', 'p.f5.r1': '300ml 1개', 'p.f5.r2': '300ml 2개',
  'p.f6.t': '별빛 글로우 쿠션', 'p.f6.d': '21·23호, 촉촉한 광채 마무리', 'p.f6.r1': '본품 + 리필', 'p.f6.r2': '본품 2개 세트',
},
en: {
  'brand.sub': 'K-Beauty Reward Funding',
  'util.demo': 'Demo mode', 'util.reset': 'Reset demo', 'util.admin': 'Admin view', 'util.shop': 'Customer view',
  'util.resetConfirm': 'Reset all demo data to the initial state?', 'util.lang': 'Language',
  'nav.list': 'Funding', 'nav.cart': 'Cart', 'nav.credit': 'Credit', 'nav.orders': 'Orders',
  'auth.login': 'Log in', 'auth.logout': 'Log out', 'auth.signup': 'Sign up', 'auth.email': 'Email', 'auth.password': 'Password (8+ characters)',
  'auth.name': 'Name', 'auth.ref': 'Referral code (optional)', 'auth.refPh': 'e.g. KBEAUTY10', 'auth.google': 'Continue with Google', 'auth.or': 'or',
  'auth.pwNote': 'This demo does not store passwords.', 'auth.submitSignup': 'Create account', 'auth.submitLogin': 'Log in',
  'auth.toLogin': 'Already have an account? Log in', 'auth.toSignup': 'New here? Sign up', 'auth.close': 'Close',
  'auth.refInfo': 'Sign up with a referral code and both you and your referrer get {amt} in credit.',
  'hero.title': 'Be the first to try new beauty launches from Korea',
  'hero.sub': 'Back a reward and we ship it from Korea straight to Vietnam and Thailand.',
  'fx.note': 'Foreign currency amounts use a fixed rate for reference only. Payment is made in KRW.', 'fx.ref': 'ref.',
  'f.goal': 'Goal {amt}', 'f.backers': '{n} backers', 'f.dday': '{n} days left', 'f.dToday': 'Ends today', 'f.closed': 'Closed', 'f.success': 'Goal reached',
  'f.soldout': 'Sold out', 'f.open': 'Live', 'f.rewards': 'Choose a reward', 'f.left': '{n} left', 'f.limit': 'Limited {n}',
  'f.add': 'Add', 'f.back': 'Back to list', 'f.closedMsg': 'This funding has ended and is closed to new backers.', 'f.deadline': 'Ends {date}', 'f.inCart': '{n} in cart',
  'cart.empty': 'Your cart is empty.', 'cart.browse': 'Browse funding', 'cart.remove': 'Remove', 'cart.items': 'Rewards in cart',
  'ship.title': 'Shipping', 'ship.name': 'Recipient', 'ship.phone': 'Phone', 'ship.country': 'Country', 'ship.address': 'Address', 'ship.zip': 'Postal code (optional)',
  'country.KR': 'South Korea', 'country.VN': 'Vietnam', 'country.TH': 'Thailand', 'country.pick': 'Select',
  'pay.title': 'Payment', 'pay.total': 'Order total', 'pay.credit': 'Use credit', 'pay.all': 'Use max', 'pay.balance': 'Balance {amt}',
  'pay.card': 'Card amount', 'pay.submit': 'Pay now', 'pay.loginFirst': 'Log in to check out.', 'pay.creditOnly': 'Paid in full with credit.',
  'pg.title': 'PG checkout (test)', 'pg.merchant': 'Merchant', 'pg.merchantName': 'ONDAM Funding (fictional)', 'pg.amount': 'Amount', 'pg.item': 'For',
  'pg.notice': 'Card details are entered only in the payment gateway window and are never stored on our servers.', 'pg.approve': 'Approve (test)', 'pg.fail': 'Decline (test)',
  'pg.forOrder': 'Order {id}', 'pg.forCharge': 'Credit top-up', 'pg.hint': 'In production the gateway checkout opens here. Closing it cancels the payment.',
  'credit.title': 'My credit', 'credit.balance': 'Available balance', 'credit.charge': 'Top up', 'credit.chargeNote': 'Credit is a prepaid voucher. Top-ups also go through PG approval.',
  'credit.ledger': 'Credit ledger', 'credit.ledgerNote': 'The ledger is append-only: entries can never be edited or deleted. The balance is the sum of the ledger.',
  'credit.ok': 'Ledger verified · ledger sum {a} = stored balance {b}', 'credit.bad': 'Ledger mismatch · ledger sum {a} ≠ stored balance {b}',
  'credit.myCode': 'My referral code', 'credit.refHint': 'When a friend signs up with it, you both get {amt} in credit', 'credit.refApply': 'Enter a referral code',
  'credit.refDone': 'This account has already received a referral reward.', 'credit.refLater': 'Missed it at sign-up? You can enter one code once.', 'credit.apply': 'Apply',
  'credit.empty': 'No entries yet.', 'credit.login': 'Log in to see your credit and orders.',
  'lt.charge': 'Top-up', 'lt.use': 'Payment', 'lt.use_cancel': 'Failed payment restored', 'lt.refund': 'Refund restored', 'lt.referral': 'Referral reward',
  'col.balance': 'Balance {amt}', 'col.ref': 'Ref {ref}',
  'ord.empty': 'No orders yet.', 'ord.paidBy': 'Credit {c} + Card {k}', 'ord.shipTo': '{name} · {country}',
  'st.pending': 'Awaiting payment', 'st.paid': 'Paid', 'st.ready': 'Preparing shipment', 'st.refunded': 'Refunded', 'st.failed': 'Payment failed',
  'admin.title': 'Admin', 'admin.note': 'Demo toggle only. In production, admin pages require an admin-role account and a separate route.',
  'admin.newFunding': 'New funding', 'admin.fTitle': 'Title', 'admin.fType': 'Product type', 'admin.fGoal': 'Goal (KRW)', 'admin.fDeadline': 'Deadline',
  'admin.reward': 'Reward {n}', 'admin.rName': 'Reward name', 'admin.rPrice': 'Price (KRW)', 'admin.rLimit': 'Quantity limit', 'admin.optional': '(optional)', 'admin.create': 'Create funding',
  'admin.fundings': 'Funding status', 'admin.orders': 'Orders', 'admin.toReady': 'Mark as preparing', 'admin.refund': 'Refund',
  'admin.refundConfirm': 'Refund order {id}? The card portion is sent to the PG as a cancel request and the credit portion is restored in the ledger.', 'admin.noOrders': 'No orders.',
  'admin.pgLog': 'PG log', 'admin.noPg': 'No PG records.', 'admin.ledgerCheck': 'Ledger check (per member)', 'admin.tamper': 'Simulate balance tampering',
  'admin.recalc': 'Reset balance to ledger sum', 'admin.members': '{n} members', 'admin.allLedger': '{n} ledger entries',
  'pgl.approve': 'PG approved', 'pgl.fail': 'PG declined', 'pgl.cancel': 'PG cancel request',
  'msg.added': 'Added to cart.', 'msg.stock': 'You cannot exceed the remaining quantity.', 'msg.closed': 'This funding is closed.',
  'msg.required': 'Please check: {f}', 'msg.paid': 'Payment approved. Order {id}', 'msg.failed': 'Payment failed. Stock and credit were restored.',
  'msg.charged': '{amt} added.', 'msg.chargeFail': 'Top-up payment failed. Nothing was written to the ledger.', 'msg.refunded': 'Order {id} refunded',
  'msg.refundOnce': 'This order is already refunded. Refunds can only happen once.', 'msg.refundState': 'This order cannot be refunded in its current state.',
  'msg.refInvalid': 'Invalid referral code.', 'msg.refSelf': 'You cannot use your own referral code.', 'msg.refDup': 'Each account can receive a referral reward only once.',
  'msg.emailDup': 'This email is already registered.', 'msg.noUser': 'No account with this email.', 'msg.pw': 'Password must be at least 8 characters.',
  'msg.email': 'Please check the email format.', 'msg.name': 'Please enter your name.', 'msg.creditOver': 'Credit used exceeds your balance or the order total.',
  'msg.neg': 'The balance cannot go negative.', 'msg.mismatch': 'Ledger and stored balance differ, so the transaction was blocked. Admin review needed.',
  'msg.welcome': 'Welcome, {name}.', 'msg.refOk': 'Referral reward of {amt} granted.', 'msg.created': 'Funding created.',
  'msg.login': 'Please log in first.', 'msg.reset': 'Demo data has been reset.', 'msg.cartEmpty': 'Your cart is empty.',
  'msg.state': 'Not allowed in the current state.', 'msg.form': 'Please check the form.', 'msg.ready': 'Marked as preparing shipment.', 'msg.tampered': 'Stored balance was altered. See the warning.',
  'msg.recalc': 'Stored balance reset to the ledger sum.', 'msg.pgCancel': 'Checkout window closed. Payment cancelled.',
  'arch.title': 'Production architecture',
  'arch.1': 'Server: Node.js (Express) API + MongoDB, with nginx in front (HTTPS, static files, reverse proxy)',
  'arch.2': 'Credit ledger: the order and its ledger entries are written in one MongoDB transaction; the ledger collection is insert-only',
  'arch.3': 'Payments: card entry happens only in the PG window; approval is confirmed by a signed PG webhook',
  'arch.4': 'Refunds: PG cancel API for the card portion, ledger restore entry for credit, stock and totals reverted in the same transaction',
  'arch.5': 'Admin: separate role permissions and admin-only API routes, with an action history',
  'arch.6': 'i18n: separate ko/en/vi/th resource files; product and reward names stored per language',
  'badge': 'ZeroToOne demo · All data is fictional',
  'test.result': 'selftest: {p} passed / {f} failed',
  'p.f1.t': 'Ondaru Lab Fermented Ampoule Serum', 'p.f1.d': '92% galactomyces ferment, first batch limited to 3,000 bottles', 'p.f1.r1': 'Early bird ×1', 'p.f1.r2': 'Set of 2', 'p.f1.r3': '3 bottles + pouch',
  'p.f2.t': 'Seoha Ceramide Barrier Cream', 'p.f2.d': '5-ceramide complex, clinically tested on sensitive skin', 'p.f2.r1': '50ml ×1', 'p.f2.r2': '50ml + refill',
  'p.f3.t': 'Danbi Mineral Sun Stick', 'p.f3.d': 'SPF50+ PA++++, no white cast, made for hot climates', 'p.f3.r1': '1 sun stick', 'p.f3.r2': '2 sticks + mini', 'p.f3.r3': 'Family set of 4',
  'p.f4.t': 'Gaon Rice Sheet Mask ×10', 'p.f4.d': 'Yeoju rice extract, first batch sold out', 'p.f4.r1': '1 box (10 sheets)', 'p.f4.r2': '3 boxes',
  'p.f5.t': 'Hyeseul Heartleaf Calming Toner', 'p.f5.d': '77% heartleaf, funding ended and shipment in preparation', 'p.f5.r1': '300ml ×1', 'p.f5.r2': '300ml ×2',
  'p.f6.t': 'Byeolbit Glow Cushion', 'p.f6.d': 'Shades 21 and 23, dewy glow finish', 'p.f6.r1': 'Compact + refill', 'p.f6.r2': 'Set of 2 compacts',
},
vi: {
  'brand.sub': 'Gây quỹ K-Beauty nhận quà',
  'util.demo': 'Chế độ demo', 'util.reset': 'Đặt lại demo', 'util.admin': 'Trang quản trị', 'util.shop': 'Trang khách hàng',
  'util.resetConfirm': 'Đưa toàn bộ dữ liệu demo về trạng thái ban đầu?', 'util.lang': 'Ngôn ngữ',
  'nav.list': 'Dự án', 'nav.cart': 'Giỏ hàng', 'nav.credit': 'Tín dụng', 'nav.orders': 'Đơn hàng',
  'auth.login': 'Đăng nhập', 'auth.logout': 'Đăng xuất', 'auth.signup': 'Đăng ký', 'auth.email': 'Email', 'auth.password': 'Mật khẩu (từ 8 ký tự)',
  'auth.name': 'Họ tên', 'auth.ref': 'Mã giới thiệu (không bắt buộc)', 'auth.refPh': 'VD: KBEAUTY10', 'auth.google': 'Tiếp tục với Google', 'auth.or': 'hoặc',
  'auth.pwNote': 'Bản demo không lưu mật khẩu.', 'auth.submitSignup': 'Tạo tài khoản', 'auth.submitLogin': 'Đăng nhập',
  'auth.toLogin': 'Đã có tài khoản? Đăng nhập', 'auth.toSignup': 'Lần đầu ghé thăm? Đăng ký', 'auth.close': 'Đóng',
  'auth.refInfo': 'Đăng ký bằng mã giới thiệu, bạn và người giới thiệu đều nhận {amt} tín dụng.',
  'hero.title': 'Dùng thử sớm nhất mỹ phẩm mới ra mắt tại Hàn Quốc',
  'hero.sub': 'Ủng hộ một gói quà, chúng tôi gửi thẳng từ Hàn Quốc đến Việt Nam và Thái Lan.',
  'fx.note': 'Số tiền ngoại tệ tính theo tỷ giá cố định, chỉ để tham khảo. Thanh toán bằng KRW.', 'fx.ref': 'tham khảo',
  'f.goal': 'Mục tiêu {amt}', 'f.backers': '{n} người ủng hộ', 'f.dday': 'Còn {n} ngày', 'f.dToday': 'Kết thúc hôm nay', 'f.closed': 'Đã kết thúc', 'f.success': 'Đạt mục tiêu',
  'f.soldout': 'Hết hàng', 'f.open': 'Đang mở', 'f.rewards': 'Chọn gói quà', 'f.left': 'Còn {n}', 'f.limit': 'Giới hạn {n}',
  'f.add': 'Thêm', 'f.back': 'Về danh sách', 'f.closedMsg': 'Dự án đã kết thúc, không thể tham gia.', 'f.deadline': 'Kết thúc {date}', 'f.inCart': '{n} trong giỏ',
  'cart.empty': 'Giỏ hàng trống.', 'cart.browse': 'Xem các dự án', 'cart.remove': 'Xóa', 'cart.items': 'Gói quà đã chọn',
  'ship.title': 'Thông tin giao hàng', 'ship.name': 'Người nhận', 'ship.phone': 'Số điện thoại', 'ship.country': 'Quốc gia', 'ship.address': 'Địa chỉ', 'ship.zip': 'Mã bưu chính (không bắt buộc)',
  'country.KR': 'Hàn Quốc', 'country.VN': 'Việt Nam', 'country.TH': 'Thái Lan', 'country.pick': 'Chọn',
  'pay.title': 'Thanh toán', 'pay.total': 'Tổng đơn', 'pay.credit': 'Dùng tín dụng', 'pay.all': 'Dùng tối đa', 'pay.balance': 'Số dư {amt}',
  'pay.card': 'Thanh toán thẻ', 'pay.submit': 'Thanh toán', 'pay.loginFirst': 'Vui lòng đăng nhập để thanh toán.', 'pay.creditOnly': 'Thanh toán toàn bộ bằng tín dụng.',
  'pg.title': 'Cổng thanh toán PG (thử nghiệm)', 'pg.merchant': 'Đơn vị bán', 'pg.merchantName': 'ONDAM Funding (giả lập)', 'pg.amount': 'Số tiền', 'pg.item': 'Nội dung',
  'pg.notice': 'Thông tin thẻ chỉ được nhập trong cửa sổ của cổng thanh toán và không được lưu trên máy chủ của chúng tôi.', 'pg.approve': 'Chấp thuận (thử)', 'pg.fail': 'Thất bại (thử)',
  'pg.forOrder': 'Đơn {id}', 'pg.forCharge': 'Nạp tín dụng', 'pg.hint': 'Khi vận hành thật, cửa sổ của cổng thanh toán sẽ mở tại đây. Đóng cửa sổ là hủy thanh toán.',
  'credit.title': 'Tín dụng của tôi', 'credit.balance': 'Số dư khả dụng', 'credit.charge': 'Nạp tiền', 'credit.chargeNote': 'Tín dụng là phiếu trả trước. Nạp tiền cũng phải qua phê duyệt PG.',
  'credit.ledger': 'Sổ cái tín dụng', 'credit.ledgerNote': 'Sổ cái chỉ được ghi thêm, không thể sửa hay xóa. Số dư bằng tổng sổ cái.',
  'credit.ok': 'Sổ cái hợp lệ · tổng sổ cái {a} = số dư lưu {b}', 'credit.bad': 'Cảnh báo lệch sổ · tổng sổ cái {a} ≠ số dư lưu {b}',
  'credit.myCode': 'Mã giới thiệu của tôi', 'credit.refHint': 'Bạn bè đăng ký bằng mã này, cả hai nhận {amt} tín dụng', 'credit.refApply': 'Nhập mã giới thiệu',
  'credit.refDone': 'Tài khoản này đã nhận thưởng giới thiệu.', 'credit.refLater': 'Chưa nhập khi đăng ký? Bạn có thể nhập một lần.', 'credit.apply': 'Áp dụng',
  'credit.empty': 'Chưa có giao dịch.', 'credit.login': 'Đăng nhập để xem tín dụng và đơn hàng.',
  'lt.charge': 'Nạp tiền', 'lt.use': 'Thanh toán', 'lt.use_cancel': 'Hoàn do thanh toán lỗi', 'lt.refund': 'Hoàn tiền', 'lt.referral': 'Thưởng giới thiệu',
  'col.balance': 'Số dư {amt}', 'col.ref': 'Liên quan {ref}',
  'ord.empty': 'Chưa có đơn hàng.', 'ord.paidBy': 'Tín dụng {c} + Thẻ {k}', 'ord.shipTo': '{name} · {country}',
  'st.pending': 'Chờ thanh toán', 'st.paid': 'Đã thanh toán', 'st.ready': 'Đang chuẩn bị giao', 'st.refunded': 'Đã hoàn tiền', 'st.failed': 'Thanh toán lỗi',
  'admin.title': 'Quản trị', 'admin.note': 'Chỉ là nút chuyển cho demo. Khi vận hành thật, cần tài khoản quyền quản trị và đường dẫn riêng.',
  'admin.newFunding': 'Tạo dự án', 'admin.fTitle': 'Tiêu đề', 'admin.fType': 'Loại sản phẩm', 'admin.fGoal': 'Mục tiêu (KRW)', 'admin.fDeadline': 'Hạn chót',
  'admin.reward': 'Gói quà {n}', 'admin.rName': 'Tên gói', 'admin.rPrice': 'Giá (KRW)', 'admin.rLimit': 'Số lượng giới hạn', 'admin.optional': '(không bắt buộc)', 'admin.create': 'Tạo dự án',
  'admin.fundings': 'Tình hình dự án', 'admin.orders': 'Danh sách đơn', 'admin.toReady': 'Chuyển sang chuẩn bị giao', 'admin.refund': 'Hoàn tiền',
  'admin.refundConfirm': 'Hoàn tiền đơn {id}? Phần thẻ sẽ gửi yêu cầu hủy tới PG, phần tín dụng được hoàn vào sổ cái.', 'admin.noOrders': 'Chưa có đơn.',
  'admin.pgLog': 'Nhật ký PG', 'admin.noPg': 'Chưa có nhật ký PG.', 'admin.ledgerCheck': 'Kiểm tra sổ cái (theo thành viên)', 'admin.tamper': 'Mô phỏng sửa số dư',
  'admin.recalc': 'Đặt lại số dư theo sổ cái', 'admin.members': '{n} thành viên', 'admin.allLedger': '{n} dòng sổ cái',
  'pgl.approve': 'PG chấp thuận', 'pgl.fail': 'PG thất bại', 'pgl.cancel': 'Yêu cầu hủy PG',
  'msg.added': 'Đã thêm vào giỏ.', 'msg.stock': 'Không thể vượt quá số lượng còn lại.', 'msg.closed': 'Dự án đã kết thúc.',
  'msg.required': 'Vui lòng kiểm tra: {f}', 'msg.paid': 'Thanh toán thành công. Đơn {id}', 'msg.failed': 'Thanh toán thất bại. Đã hoàn lại tồn kho và tín dụng.',
  'msg.charged': 'Đã nạp {amt}.', 'msg.chargeFail': 'Nạp tiền thất bại. Không có gì được ghi vào sổ cái.', 'msg.refunded': 'Đã hoàn tiền đơn {id}',
  'msg.refundOnce': 'Đơn này đã được hoàn tiền. Mỗi đơn chỉ hoàn một lần.', 'msg.refundState': 'Không thể hoàn tiền ở trạng thái hiện tại.',
  'msg.refInvalid': 'Mã giới thiệu không hợp lệ.', 'msg.refSelf': 'Không thể dùng mã của chính bạn.', 'msg.refDup': 'Mỗi tài khoản chỉ nhận thưởng giới thiệu một lần.',
  'msg.emailDup': 'Email đã được đăng ký.', 'msg.noUser': 'Không có tài khoản với email này.', 'msg.pw': 'Mật khẩu phải có ít nhất 8 ký tự.',
  'msg.email': 'Vui lòng kiểm tra định dạng email.', 'msg.name': 'Vui lòng nhập họ tên.', 'msg.creditOver': 'Tín dụng sử dụng vượt quá số dư hoặc tổng đơn.',
  'msg.neg': 'Số dư không thể âm.', 'msg.mismatch': 'Sổ cái và số dư lưu không khớp nên giao dịch bị chặn. Cần quản trị viên kiểm tra.',
  'msg.welcome': 'Chào mừng {name}.', 'msg.refOk': 'Đã nhận thưởng giới thiệu {amt}.', 'msg.created': 'Đã tạo dự án.',
  'msg.login': 'Vui lòng đăng nhập trước.', 'msg.reset': 'Đã đặt lại dữ liệu demo.', 'msg.cartEmpty': 'Giỏ hàng trống.',
  'msg.state': 'Không thể thực hiện ở trạng thái này.', 'msg.form': 'Vui lòng kiểm tra thông tin.', 'msg.ready': 'Đã chuyển sang chuẩn bị giao.', 'msg.tampered': 'Số dư lưu đã bị sửa. Hãy xem cảnh báo.',
  'msg.recalc': 'Đã đặt số dư lưu bằng tổng sổ cái.', 'msg.pgCancel': 'Đã đóng cửa sổ, thanh toán bị hủy.',
  'arch.title': 'Kiến trúc khi phát triển thật',
  'arch.1': 'Máy chủ: API Node.js (Express) + MongoDB, phía trước là nginx (HTTPS, tệp tĩnh, reverse proxy)',
  'arch.2': 'Sổ cái tín dụng: đơn hàng và sổ cái ghi cùng lúc trong một giao dịch MongoDB; bộ sưu tập sổ cái chỉ cho phép thêm',
  'arch.3': 'Thanh toán: chỉ nhập thẻ trong cửa sổ PG; xác nhận phê duyệt qua webhook PG có kiểm tra chữ ký',
  'arch.4': 'Hoàn tiền: API hủy PG cho phần thẻ, ghi hoàn vào sổ cái cho phần tín dụng, tồn kho và tổng tiền hoàn trong cùng giao dịch',
  'arch.5': 'Quản trị: phân quyền vai trò riêng và API riêng cho quản trị, có lưu lịch sử thao tác',
  'arch.6': 'Đa ngôn ngữ: tách tệp tài nguyên ko/en/vi/th; tên sản phẩm và gói quà lưu theo từng ngôn ngữ',
  'badge': 'Bản demo của ZeroToOne · Mọi dữ liệu đều là giả lập',
  'test.result': 'selftest: {p} đạt / {f} lỗi',
  'p.f1.t': 'Tinh chất lên men Ondaru Lab', 'p.f1.d': '92% dịch lên men galactomyces, lô đầu giới hạn 3.000 chai', 'p.f1.r1': 'Ưu đãi sớm ×1', 'p.f1.r2': 'Bộ 2 chai', 'p.f1.r3': '3 chai + túi',
  'p.f2.t': 'Kem phục hồi Ceramide Seoha', 'p.f2.d': 'Phức hợp 5 ceramide, đã thử nghiệm trên da nhạy cảm', 'p.f2.r1': '50ml ×1', 'p.f2.r2': '50ml + lõi thay',
  'p.f3.t': 'Thỏi chống nắng khoáng Danbi', 'p.f3.d': 'SPF50+ PA++++, không vệt trắng, hợp khí hậu nóng', 'p.f3.r1': '1 thỏi', 'p.f3.r2': '2 thỏi + mini', 'p.f3.r3': 'Bộ gia đình 4 thỏi',
  'p.f4.t': 'Mặt nạ gạo Gaon ×10', 'p.f4.d': 'Chiết xuất gạo Yeoju, lô đầu đã bán hết', 'p.f4.r1': '1 hộp (10 miếng)', 'p.f4.r2': '3 hộp',
  'p.f5.t': 'Toner làm dịu diếp cá Hyeseul', 'p.f5.d': '77% diếp cá, đã kết thúc và đang chuẩn bị giao', 'p.f5.r1': '300ml ×1', 'p.f5.r2': '300ml ×2',
  'p.f6.t': 'Phấn nước Byeolbit Glow', 'p.f6.d': 'Tông 21 và 23, lớp nền căng bóng', 'p.f6.r1': 'Hộp chính + lõi thay', 'p.f6.r2': 'Bộ 2 hộp',
},
th: {
  'brand.sub': 'ระดมทุนเคบิวตี้แลกของรางวัล',
  'util.demo': 'โหมดเดโม', 'util.reset': 'รีเซ็ตเดโม', 'util.admin': 'มุมมองแอดมิน', 'util.shop': 'มุมมองลูกค้า',
  'util.resetConfirm': 'รีเซ็ตข้อมูลเดโมทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่', 'util.lang': 'ภาษา',
  'nav.list': 'โปรเจกต์', 'nav.cart': 'ตะกร้า', 'nav.credit': 'เครดิต', 'nav.orders': 'คำสั่งซื้อ',
  'auth.login': 'เข้าสู่ระบบ', 'auth.logout': 'ออกจากระบบ', 'auth.signup': 'สมัครสมาชิก', 'auth.email': 'อีเมล', 'auth.password': 'รหัสผ่าน (8 ตัวขึ้นไป)',
  'auth.name': 'ชื่อ', 'auth.ref': 'รหัสแนะนำ (ไม่บังคับ)', 'auth.refPh': 'เช่น KBEAUTY10', 'auth.google': 'ดำเนินการต่อด้วย Google', 'auth.or': 'หรือ',
  'auth.pwNote': 'เดโมนี้ไม่เก็บรหัสผ่าน', 'auth.submitSignup': 'สร้างบัญชี', 'auth.submitLogin': 'เข้าสู่ระบบ',
  'auth.toLogin': 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ', 'auth.toSignup': 'ผู้ใช้ใหม่? สมัครสมาชิก', 'auth.close': 'ปิด',
  'auth.refInfo': 'สมัครด้วยรหัสแนะนำ คุณและผู้แนะนำจะได้รับเครดิตคนละ {amt}',
  'hero.title': 'ลองก่อนใคร บิวตี้ตัวใหม่ล่าสุดจากเกาหลี',
  'hero.sub': 'ร่วมสนับสนุนรับของรางวัล เราส่งตรงจากเกาหลีถึงเวียดนามและไทย',
  'fx.note': 'ยอดเงินสกุลต่างประเทศคิดจากอัตราแลกเปลี่ยนคงที่เพื่ออ้างอิงเท่านั้น ชำระเงินเป็นวอน (KRW)', 'fx.ref': 'อ้างอิง',
  'f.goal': 'เป้าหมาย {amt}', 'f.backers': 'ผู้สนับสนุน {n} คน', 'f.dday': 'เหลือ {n} วัน', 'f.dToday': 'สิ้นสุดวันนี้', 'f.closed': 'ปิดแล้ว', 'f.success': 'ถึงเป้าหมาย',
  'f.soldout': 'หมด', 'f.open': 'กำลังเปิด', 'f.rewards': 'เลือกของรางวัล', 'f.left': 'เหลือ {n}', 'f.limit': 'จำกัด {n}',
  'f.add': 'เพิ่ม', 'f.back': 'กลับไปหน้ารายการ', 'f.closedMsg': 'โปรเจกต์นี้ปิดแล้ว ไม่สามารถร่วมสนับสนุนได้', 'f.deadline': 'สิ้นสุด {date}', 'f.inCart': 'ในตะกร้า {n}',
  'cart.empty': 'ตะกร้าว่างเปล่า', 'cart.browse': 'ดูโปรเจกต์', 'cart.remove': 'ลบ', 'cart.items': 'ของรางวัลในตะกร้า',
  'ship.title': 'ข้อมูลการจัดส่ง', 'ship.name': 'ผู้รับ', 'ship.phone': 'เบอร์โทร', 'ship.country': 'ประเทศ', 'ship.address': 'ที่อยู่', 'ship.zip': 'รหัสไปรษณีย์ (ไม่บังคับ)',
  'country.KR': 'เกาหลีใต้', 'country.VN': 'เวียดนาม', 'country.TH': 'ไทย', 'country.pick': 'เลือก',
  'pay.title': 'ชำระเงิน', 'pay.total': 'ยอดคำสั่งซื้อ', 'pay.credit': 'ใช้เครดิต', 'pay.all': 'ใช้สูงสุด', 'pay.balance': 'คงเหลือ {amt}',
  'pay.card': 'ยอดชำระด้วยบัตร', 'pay.submit': 'ชำระเงิน', 'pay.loginFirst': 'กรุณาเข้าสู่ระบบเพื่อชำระเงิน', 'pay.creditOnly': 'ชำระเต็มจำนวนด้วยเครดิต',
  'pg.title': 'หน้าชำระเงิน PG (ทดสอบ)', 'pg.merchant': 'ร้านค้า', 'pg.merchantName': 'ONDAM Funding (สมมติ)', 'pg.amount': 'ยอดชำระ', 'pg.item': 'รายการ',
  'pg.notice': 'ข้อมูลบัตรกรอกเฉพาะในหน้าต่างของผู้ให้บริการชำระเงิน (PG) และไม่ถูกเก็บไว้ในเซิร์ฟเวอร์ของเรา', 'pg.approve': 'อนุมัติ (ทดสอบ)', 'pg.fail': 'ล้มเหลว (ทดสอบ)',
  'pg.forOrder': 'คำสั่งซื้อ {id}', 'pg.forCharge': 'เติมเครดิต', 'pg.hint': 'ในระบบจริง หน้าต่างชำระเงินของ PG จะเปิดตรงนี้ การปิดหน้าต่างถือเป็นการยกเลิก',
  'credit.title': 'เครดิตของฉัน', 'credit.balance': 'ยอดคงเหลือที่ใช้ได้', 'credit.charge': 'เติมเงิน', 'credit.chargeNote': 'เครดิตคือบัตรกำนัลแบบเติมเงินล่วงหน้า การเติมเงินต้องผ่านการอนุมัติจาก PG',
  'credit.ledger': 'สมุดบัญชีเครดิต', 'credit.ledgerNote': 'สมุดบัญชีเพิ่มรายการได้อย่างเดียว แก้ไขหรือลบไม่ได้ ยอดคงเหลือคำนวณจากผลรวมสมุดบัญชี',
  'credit.ok': 'ตรวจสอบผ่าน · ผลรวมสมุดบัญชี {a} = ยอดที่บันทึก {b}', 'credit.bad': 'คำเตือนยอดไม่ตรง · ผลรวมสมุดบัญชี {a} ≠ ยอดที่บันทึก {b}',
  'credit.myCode': 'รหัสแนะนำของฉัน', 'credit.refHint': 'เพื่อนสมัครด้วยรหัสนี้ รับเครดิตทั้งคู่คนละ {amt}', 'credit.refApply': 'กรอกรหัสแนะนำ',
  'credit.refDone': 'บัญชีนี้ได้รับรางวัลแนะนำแล้ว', 'credit.refLater': 'ลืมกรอกตอนสมัคร? กรอกได้หนึ่งครั้ง', 'credit.apply': 'ใช้รหัส',
  'credit.empty': 'ยังไม่มีรายการ', 'credit.login': 'เข้าสู่ระบบเพื่อดูเครดิตและคำสั่งซื้อ',
  'lt.charge': 'เติมเงิน', 'lt.use': 'ชำระเงิน', 'lt.use_cancel': 'คืนจากการชำระล้มเหลว', 'lt.refund': 'คืนเงิน', 'lt.referral': 'รางวัลแนะนำ',
  'col.balance': 'คงเหลือ {amt}', 'col.ref': 'อ้างอิง {ref}',
  'ord.empty': 'ยังไม่มีคำสั่งซื้อ', 'ord.paidBy': 'เครดิต {c} + บัตร {k}', 'ord.shipTo': '{name} · {country}',
  'st.pending': 'รอชำระเงิน', 'st.paid': 'ชำระเงินแล้ว', 'st.ready': 'เตรียมจัดส่ง', 'st.refunded': 'คืนเงินแล้ว', 'st.failed': 'ชำระเงินล้มเหลว',
  'admin.title': 'แอดมิน', 'admin.note': 'เป็นปุ่มสลับสำหรับเดโมเท่านั้น ระบบจริงต้องใช้บัญชีสิทธิ์แอดมินและเส้นทางแยก',
  'admin.newFunding': 'สร้างโปรเจกต์', 'admin.fTitle': 'ชื่อโปรเจกต์', 'admin.fType': 'ประเภทสินค้า', 'admin.fGoal': 'เป้าหมาย (KRW)', 'admin.fDeadline': 'วันสิ้นสุด',
  'admin.reward': 'ของรางวัล {n}', 'admin.rName': 'ชื่อของรางวัล', 'admin.rPrice': 'ราคา (KRW)', 'admin.rLimit': 'จำนวนจำกัด', 'admin.optional': '(ไม่บังคับ)', 'admin.create': 'สร้างโปรเจกต์',
  'admin.fundings': 'สถานะโปรเจกต์', 'admin.orders': 'รายการคำสั่งซื้อ', 'admin.toReady': 'เปลี่ยนเป็นเตรียมจัดส่ง', 'admin.refund': 'คืนเงิน',
  'admin.refundConfirm': 'คืนเงินคำสั่งซื้อ {id} หรือไม่ ส่วนที่จ่ายด้วยบัตรจะส่งคำขอยกเลิกไปที่ PG ส่วนเครดิตจะคืนเข้าสมุดบัญชี', 'admin.noOrders': 'ไม่มีคำสั่งซื้อ',
  'admin.pgLog': 'บันทึก PG', 'admin.noPg': 'ไม่มีบันทึก PG', 'admin.ledgerCheck': 'ตรวจสมุดบัญชี (รายสมาชิก)', 'admin.tamper': 'จำลองการแก้ยอดคงเหลือ',
  'admin.recalc': 'ตั้งยอดตามสมุดบัญชี', 'admin.members': 'สมาชิก {n} คน', 'admin.allLedger': 'สมุดบัญชี {n} รายการ',
  'pgl.approve': 'PG อนุมัติ', 'pgl.fail': 'PG ล้มเหลว', 'pgl.cancel': 'คำขอยกเลิก PG',
  'msg.added': 'เพิ่มลงตะกร้าแล้ว', 'msg.stock': 'ไม่สามารถเกินจำนวนที่เหลือได้', 'msg.closed': 'โปรเจกต์นี้ปิดแล้ว',
  'msg.required': 'กรุณาตรวจสอบ: {f}', 'msg.paid': 'ชำระเงินสำเร็จ คำสั่งซื้อ {id}', 'msg.failed': 'ชำระเงินล้มเหลว คืนสต็อกและเครดิตเรียบร้อยแล้ว',
  'msg.charged': 'เติม {amt} แล้ว', 'msg.chargeFail': 'เติมเงินล้มเหลว ไม่มีการบันทึกลงสมุดบัญชี', 'msg.refunded': 'คืนเงินคำสั่งซื้อ {id} แล้ว',
  'msg.refundOnce': 'คำสั่งซื้อนี้คืนเงินแล้ว คืนเงินได้เพียงครั้งเดียว', 'msg.refundState': 'คำสั่งซื้อนี้ไม่อยู่ในสถานะที่คืนเงินได้',
  'msg.refInvalid': 'รหัสแนะนำไม่ถูกต้อง', 'msg.refSelf': 'ไม่สามารถใช้รหัสแนะนำของตัวเองได้', 'msg.refDup': 'แต่ละบัญชีรับรางวัลแนะนำได้ครั้งเดียว',
  'msg.emailDup': 'อีเมลนี้สมัครแล้ว', 'msg.noUser': 'ไม่พบบัญชีที่ใช้อีเมลนี้', 'msg.pw': 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว',
  'msg.email': 'กรุณาตรวจสอบรูปแบบอีเมล', 'msg.name': 'กรุณากรอกชื่อ', 'msg.creditOver': 'เครดิตที่ใช้เกินยอดคงเหลือหรือยอดคำสั่งซื้อ',
  'msg.neg': 'ยอดคงเหลือติดลบไม่ได้', 'msg.mismatch': 'สมุดบัญชีกับยอดที่บันทึกไม่ตรงกัน จึงระงับธุรกรรม ต้องให้แอดมินตรวจสอบ',
  'msg.welcome': 'ยินดีต้อนรับ {name}', 'msg.refOk': 'ได้รับรางวัลแนะนำ {amt}', 'msg.created': 'สร้างโปรเจกต์แล้ว',
  'msg.login': 'กรุณาเข้าสู่ระบบก่อน', 'msg.reset': 'รีเซ็ตข้อมูลเดโมแล้ว', 'msg.cartEmpty': 'ตะกร้าว่างเปล่า',
  'msg.state': 'ทำรายการในสถานะนี้ไม่ได้', 'msg.form': 'กรุณาตรวจสอบข้อมูล', 'msg.ready': 'เปลี่ยนเป็นเตรียมจัดส่งแล้ว', 'msg.tampered': 'ยอดที่บันทึกถูกแก้ไข ดูคำเตือน',
  'msg.recalc': 'ตั้งยอดที่บันทึกให้เท่ากับผลรวมสมุดบัญชีแล้ว', 'msg.pgCancel': 'ปิดหน้าต่างชำระเงิน ยกเลิกการชำระแล้ว',
  'arch.title': 'โครงสร้างเมื่อพัฒนาจริง',
  'arch.1': 'เซิร์ฟเวอร์: API Node.js (Express) + MongoDB โดยมี nginx ด้านหน้า (HTTPS, ไฟล์สแตติก, reverse proxy)',
  'arch.2': 'สมุดบัญชีเครดิต: บันทึกคำสั่งซื้อและสมุดบัญชีพร้อมกันในทรานแซกชัน MongoDB เดียว คอลเลกชันสมุดบัญชีเพิ่มได้อย่างเดียว',
  'arch.3': 'การชำระเงิน: กรอกบัตรเฉพาะในหน้าต่าง PG และยืนยันการอนุมัติผ่าน webhook ของ PG ที่ตรวจลายเซ็นแล้ว',
  'arch.4': 'การคืนเงิน: เรียก API ยกเลิกของ PG สำหรับส่วนบัตร บันทึกคืนเครดิตในสมุดบัญชี และคืนสต็อกกับยอดสะสมในทรานแซกชันเดียวกัน',
  'arch.5': 'แอดมิน: แยกสิทธิ์ตามบทบาทและ API เฉพาะแอดมิน พร้อมบันทึกประวัติการทำงาน',
  'arch.6': 'หลายภาษา: แยกไฟล์ภาษา ko/en/vi/th และเก็บชื่อสินค้าและของรางวัลแยกตามภาษา',
  'badge': 'เดโมของ ZeroToOne · ข้อมูลทั้งหมดเป็นข้อมูลสมมติ',
  'test.result': 'selftest: ผ่าน {p} / ล้มเหลว {f}',
  'p.f1.t': 'เซรั่มแอมพูลหมัก Ondaru Lab', 'p.f1.d': 'สารหมักกาแลคโตไมซีส 92% ล็อตแรกจำกัด 3,000 ขวด', 'p.f1.r1': 'เอิร์ลเบิร์ด ×1', 'p.f1.r2': 'เซ็ต 2 ขวด', 'p.f1.r3': '3 ขวด + กระเป๋า',
  'p.f2.t': 'ครีมเซราไมด์ฟื้นฟูผิว Seoha', 'p.f2.d': 'เซราไมด์ 5 ชนิด ผ่านการทดสอบกับผิวแพ้ง่าย', 'p.f2.r1': '50ml ×1', 'p.f2.r2': '50ml + รีฟิล',
  'p.f3.t': 'ซันสติ๊กมิเนอรัล Danbi', 'p.f3.d': 'SPF50+ PA++++ ไม่ทิ้งคราบขาว เหมาะกับอากาศร้อน', 'p.f3.r1': 'ซันสติ๊ก 1 แท่ง', 'p.f3.r2': '2 แท่ง + มินิ', 'p.f3.r3': 'เซ็ตครอบครัว 4 แท่ง',
  'p.f4.t': 'แผ่นมาสก์ข้าว Gaon ×10', 'p.f4.d': 'สารสกัดข้าวยออจู ล็อตแรกขายหมดแล้ว', 'p.f4.r1': '1 กล่อง (10 แผ่น)', 'p.f4.r2': '3 กล่อง',
  'p.f5.t': 'โทนเนอร์พลูคาวปลอบผิว Hyeseul', 'p.f5.d': 'พลูคาว 77% ปิดระดมทุนแล้ว กำลังเตรียมจัดส่ง', 'p.f5.r1': '300ml ×1', 'p.f5.r2': '300ml ×2',
  'p.f6.t': 'คุชชั่น Byeolbit Glow', 'p.f6.d': 'เบอร์ 21 และ 23 ผิวโกลว์ฉ่ำ', 'p.f6.r1': 'ตลับจริง + รีฟิล', 'p.f6.r2': 'เซ็ต 2 ตลับ',
},
};
const LANGS = ['ko', 'en', 'vi', 'th'];
const LOCALE = { ko: 'ko-KR', en: 'en-US', vi: 'vi-VN', th: 'th-TH' };
const missing = new Set();
let lang = (() => { try { const l = localStorage.getItem('kbf_lang'); return LANGS.includes(l) ? l : 'ko'; } catch (e) { return 'ko'; } })();

function t(key, vars) {
  let s = I18N[lang][key];
  if (s == null) { missing.add(lang + ':' + key); s = '⟦' + key + '⟧'; }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return s;
}

// ---------- money / currency ----------
const REF_BONUS = 10000;           // credit units are KRW 1:1
const FX = { USD: 1 / 1400, VND: 18.5, THB: 0.026 }; // fixed reference rates (per 1 KRW)
const FX_BY_LANG = { en: 'USD', vi: 'VND', th: 'THB' }; // ko shows KRW only
const krw = n => '₩' + Math.round(n).toLocaleString('en-US');
function fxRef(n) {
  const c = FX_BY_LANG[lang];
  if (!c) return '';
  const v = n * FX[c];
  if (c === 'USD') return '≈ $' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (c === 'VND') return '≈ ' + (Math.round(v / 1000) * 1000).toLocaleString('vi-VN') + '₫';
  return '≈ ฿' + Math.round(v).toLocaleString('th-TH');
}
const price = n => krw(n) + (FX_BY_LANG[lang] ? ' <span class="fx">' + fxRef(n) + '</span>' : '');

// ---------- state ----------
const KEY = 'kbf_demo_v1';
const DAY = 86400000;
const endOfDay = ts => { const d = new Date(ts); d.setHours(23, 59, 59, 0); return d.getTime(); };
const TYPES = ['SERUM', 'CREAM', 'SUN', 'MASK', 'TONER', 'CUSHION'];

function seed() {
  const now = Date.now();
  const dl = d => endOfDay(now + d * DAY);
  const rw = (fid, n, priceKrw, limit, sold) => ({ id: 'r' + n, key: 'p.' + fid + '.r' + n, price: priceKrw, limit, sold });
  return {
    users: [{ id: 'u0', email: 'crew@ondam.example', name: 'ONDAM Crew', refCode: 'KBEAUTY10', credit: 0, referredBy: null }],
    session: null,
    fundings: [
      { id: 'f1', type: 'SERUM', key: 'p.f1', goal: 5000000, raised: 3812000, backers: 118, deadline: dl(12), rewards: [rw('f1', 1, 29000, 100, 88), rw('f1', 2, 52000, 50, 21), rw('f1', 3, 75000, 30, 6)] },
      { id: 'f2', type: 'CREAM', key: 'p.f2', goal: 3000000, raised: 3486000, backers: 102, deadline: dl(5), rewards: [rw('f2', 1, 32000, 120, 74), rw('f2', 2, 45000, 60, 25)] },
      { id: 'f3', type: 'SUN', key: 'p.f3', goal: 4000000, raised: 1215000, backers: 47, deadline: dl(20), rewards: [rw('f3', 1, 18000, 200, 31), rw('f3', 2, 33000, 80, 12), rw('f3', 3, 62000, 20, 4)] },
      { id: 'f4', type: 'MASK', key: 'p.f4', goal: 3000000, raised: 4230000, backers: 161, deadline: dl(8), rewards: [rw('f4', 1, 15000, 150, 150), rw('f4', 2, 39000, 40, 40)] },
      { id: 'f5', type: 'TONER', key: 'p.f5', goal: 2000000, raised: 2104000, backers: 83, deadline: dl(-2), rewards: [rw('f5', 1, 22000, 100, 61), rw('f5', 2, 40000, 40, 19)] },
      { id: 'f6', type: 'CUSHION', key: 'p.f6', goal: 6000000, raised: 912000, backers: 26, deadline: dl(0), rewards: [rw('f6', 1, 38000, 80, 18), rw('f6', 2, 68000, 30, 3)] },
    ],
    cart: [], orders: [], ledger: [], pgLog: [],
    seq: { u: 1, o: 1001, l: 1, f: 7, pg: 1 },
  };
}

let S = load();
let persist = true;
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.users && s.ledger) { s.ledger = s.ledger.map(e => Object.freeze(e)); return s; }
  } catch (e) { /* fall through */ }
  return seed();
}
function save() { if (!persist) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } }

// ---------- core (money logic) ----------
function fail(code, vars) { const e = new Error(code); e.vars = vars; throw e; }
const userById = id => S.users.find(u => u.id === id);
const me = () => userById(S.session);
const fundById = id => S.fundings.find(f => f.id === id);
const rewardOf = (f, rid) => f.rewards.find(r => r.id === rid);
const remaining = r => r.limit - r.sold;
const isClosed = f => Date.now() > f.deadline;

const ledgerOf = uid => S.ledger.filter(e => e.userId === uid);
const ledgerSum = uid => ledgerOf(uid).reduce((a, e) => a + e.amount, 0);
function verifyLedger(uid) {
  const u = userById(uid), sum = ledgerSum(uid), list = ledgerOf(uid);
  const last = list.length ? list[list.length - 1].balance : 0;
  return { ok: sum === u.credit && last === sum && sum >= 0, sum, stored: u.credit };
}
// Append-only: the only way to touch credit. No update/delete exists anywhere.
function appendLedger(uid, type, amount, ref) {
  const u = userById(uid);
  if (!u) fail('login');
  if (!verifyLedger(uid).ok) fail('mismatch');
  const bal = ledgerSum(uid) + amount;
  if (bal < 0) fail('neg');
  const e = Object.freeze({ id: 'L' + S.seq.l++, userId: uid, at: Date.now(), type, amount, balance: bal, ref: ref || '' });
  S.ledger.push(e);
  u.credit = bal;
  return e;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function signup({ email, name, password, ref, google }) {
  email = String(email || '').trim().toLowerCase();
  name = String(name || '').trim();
  if (!EMAIL_RE.test(email)) fail('email');
  if (!name) fail('name');
  if (!google && String(password || '').length < 8) fail('pw');
  if (S.users.some(u => u.email === email)) fail('emailDup');
  const code = String(ref || '').trim().toUpperCase();
  if (code && !S.users.some(u => u.refCode === code)) fail('refInvalid');
  const id = 'u' + S.seq.u++;
  const u = { id, email, name, refCode: 'KB' + (1000 + S.seq.u), credit: 0, referredBy: null };
  S.users.push(u);
  S.session = id;
  if (code) applyReferral(id, code);
  save();
  return u;
}
function login(email) {
  const u = S.users.find(x => x.email === String(email || '').trim().toLowerCase());
  if (!u || u.id === 'u0') fail('noUser');
  S.session = u.id; save(); return u;
}
function googleLogin() {
  const email = 'google.demo@example.com';
  const u = S.users.find(x => x.email === email);
  if (u) { S.session = u.id; save(); return u; }
  return signup({ email, name: 'Google Demo', google: true });
}
function applyReferral(uid, code) {
  const u = userById(uid);
  code = String(code || '').trim().toUpperCase();
  const tag = 'REF-' + u.refCode;
  if (u.referredBy || S.ledger.some(e => e.type === 'referral' && e.ref === tag && e.userId === uid)) fail('refDup');
  const owner = S.users.find(x => x.refCode === code);
  if (!owner) fail('refInvalid');
  if (owner.id === uid) fail('refSelf');
  appendLedger(uid, 'referral', REF_BONUS, tag);
  appendLedger(owner.id, 'referral', REF_BONUS, tag);
  u.referredBy = owner.id;
  save();
}

function cartQty(fid, rid) { return S.cart.filter(c => c.fid === fid && c.rid === rid).reduce((a, c) => a + c.qty, 0); }
function addToCart(fid, rid, qty = 1) {
  const f = fundById(fid), r = rewardOf(f, rid);
  if (isClosed(f)) fail('closed');
  if (qty < 1 || cartQty(fid, rid) + qty > remaining(r)) fail('stock');
  const line = S.cart.find(c => c.fid === fid && c.rid === rid);
  if (line) line.qty += qty; else S.cart.push({ fid, rid, qty });
  save();
}
function setCartQty(i, qty) {
  const c = S.cart[i];
  if (!c) return;
  if (qty < 1) { S.cart.splice(i, 1); save(); return; }
  if (qty > remaining(rewardOf(fundById(c.fid), c.rid))) fail('stock');
  c.qty = qty; save();
}
const cartTotal = () => S.cart.reduce((a, c) => a + rewardOf(fundById(c.fid), c.rid).price * c.qty, 0);

function validateShip(s) {
  const bad = [];
  if (!String(s.name || '').trim()) bad.push('ship.name');
  if (!/^\+?[0-9][0-9\s-]{6,19}$/.test(String(s.phone || '').trim())) bad.push('ship.phone');
  if (!['KR', 'VN', 'TH'].includes(s.country)) bad.push('ship.country');
  if (String(s.address || '').trim().length < 5) bad.push('ship.address');
  return bad;
}
// Step 1: create pending order, reserve stock, hold credit. Step 2: pgApprove or pgFail.
function placeOrder(ship, creditUse) {
  const u = me();
  if (!u) fail('login');
  if (!S.cart.length) fail('cartEmpty');
  const bad = validateShip(ship);
  if (bad.length) fail('required', { f: bad.map(k => t(k)).join(', '), keys: bad });
  for (const c of S.cart) {
    const f = fundById(c.fid);
    if (isClosed(f)) fail('closed');
    if (c.qty > remaining(rewardOf(f, c.rid))) fail('stock');
  }
  const total = cartTotal();
  creditUse = Math.floor(Number(creditUse) || 0);
  if (creditUse < 0 || creditUse > total || creditUse > u.credit) fail('creditOver');
  const o = {
    id: 'ORD-' + S.seq.o++, userId: u.id, at: Date.now(), status: 'pending',
    items: S.cart.map(c => ({ fid: c.fid, rid: c.rid, qty: c.qty, price: rewardOf(fundById(c.fid), c.rid).price })),
    total, creditUsed: creditUse, cardAmount: total - creditUse,
    ship: { name: ship.name.trim(), phone: ship.phone.trim(), country: ship.country, address: ship.address.trim(), zip: String(ship.zip || '').trim() },
  };
  if (creditUse > 0) appendLedger(u.id, 'use', -creditUse, o.id); // throws before any stock change
  o.items.forEach(it => { rewardOf(fundById(it.fid), it.rid).sold += it.qty; });
  S.orders.push(o);
  save();
  return o;
}
function pgLogAdd(type, ref, amount) { const p = { id: 'PG-' + String(S.seq.pg++).padStart(4, '0'), type, ref, amount, at: Date.now() }; S.pgLog.push(p); return p; }
function pgApprove(orderId) {
  const o = S.orders.find(x => x.id === orderId);
  if (!o || o.status !== 'pending') fail('state');
  if (o.cardAmount > 0) pgLogAdd('approve', o.id, o.cardAmount);
  o.status = 'paid';
  o.items.forEach(it => { fundById(it.fid).raised += it.price * it.qty; });
  [...new Set(o.items.map(it => it.fid))].forEach(fid => { fundById(fid).backers += 1; });
  S.cart = [];
  save();
  return o;
}
function pgFail(orderId) {
  const o = S.orders.find(x => x.id === orderId);
  if (!o || o.status !== 'pending') fail('state');
  o.items.forEach(it => { rewardOf(fundById(it.fid), it.rid).sold -= it.qty; });
  if (o.creditUsed > 0) appendLedger(o.userId, 'use_cancel', o.creditUsed, o.id);
  o.status = 'failed';
  pgLogAdd('fail', o.id, o.cardAmount);
  save();
  return o;
}
function chargeApprove(amount) {
  const u = me();
  if (!u) fail('login');
  const p = pgLogAdd('approve', 'CHARGE', amount);
  appendLedger(u.id, 'charge', amount, p.id);
  save();
}
function chargeFail(amount) { pgLogAdd('fail', 'CHARGE', amount); save(); }

function setReady(orderId) {
  const o = S.orders.find(x => x.id === orderId);
  if (!o || o.status !== 'paid') fail('state');
  o.status = 'ready'; save();
}
function refund(orderId) {
  const o = S.orders.find(x => x.id === orderId);
  if (!o) fail('state');
  if (o.status === 'refunded') fail('refundOnce');
  if (o.status !== 'paid' && o.status !== 'ready') fail('refundState');
  if (o.creditUsed > 0) appendLedger(o.userId, 'refund', o.creditUsed, o.id); // first: may throw on mismatch, nothing changed yet
  if (o.cardAmount > 0) pgLogAdd('cancel', o.id, o.cardAmount);
  o.items.forEach(it => {
    const f = fundById(it.fid);
    rewardOf(f, it.rid).sold -= it.qty;
    f.raised -= it.price * it.qty;
  });
  [...new Set(o.items.map(it => it.fid))].forEach(fid => { fundById(fid).backers -= 1; });
  o.status = 'refunded';
  o.refundedAt = Date.now();
  save();
  return o;
}

function createFunding(d) {
  const title = String(d.title || '').trim();
  const goal = Math.floor(Number(d.goal));
  const deadline = d.deadline ? endOfDay(new Date(d.deadline + 'T12:00:00').getTime()) : NaN;
  const rewards = (d.rewards || []).filter(r => String(r.name || '').trim()).map((r, i) => ({
    id: 'r' + (i + 1), name: String(r.name).trim(), price: Math.floor(Number(r.price)), limit: Math.floor(Number(r.limit)), sold: 0,
  }));
  if (!title || !(goal > 0) || !(deadline > Date.now()) || !TYPES.includes(d.type) || !rewards.length || rewards.some(r => !(r.price > 0) || !(r.limit > 0))) fail('form');
  const f = { id: 'f' + S.seq.f++, type: d.type, title, goal, raised: 0, backers: 0, deadline, rewards };
  S.fundings.unshift(f);
  save();
  return f;
}

// ---------- view helpers ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ftitle = f => (f.key ? t(f.key + '.t') : esc(f.title));
const fdesc = f => (f.key ? t(f.key + '.d') : '');
const rname = r => (r.key ? t(r.key) : esc(r.name));
const fmtDate = ts => new Date(ts).toLocaleDateString(LOCALE[lang], { month: 'short', day: 'numeric' });
const fmtTime = ts => new Date(ts).toLocaleString(LOCALE[lang], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const pct = f => Math.round((f.raised / f.goal) * 100);
const isSoldout = f => f.rewards.every(r => remaining(r) <= 0);
function ddayLabel(f) {
  if (isClosed(f)) return t('f.closed');
  const d = Math.floor((f.deadline - Date.now()) / DAY);
  return d <= 0 ? t('f.dToday') : t('f.dday', { n: d });
}
function badges(f) {
  const b = [];
  if (isClosed(f)) b.push(['closed', t('f.closed')]);
  else if (isSoldout(f)) b.push(['soldout', t('f.soldout')]);
  if (f.raised >= f.goal) b.push(['success', t('f.success')]);
  return b.map(([c, l]) => `<span class="tag tag-${c}">${l}</span>`).join('');
}
const GRAD = {
  SERUM: 'linear-gradient(150deg,#f6e3dc,#e9c9c4 55%,#d8b0b3)', CREAM: 'linear-gradient(150deg,#f5efe6,#e8dccb 60%,#d9c8b0)',
  SUN: 'linear-gradient(150deg,#fbf0d9,#f3dcb0 60%,#e8c58c)', MASK: 'linear-gradient(150deg,#eef0ea,#d9e0d3 60%,#c3cfbd)',
  TONER: 'linear-gradient(150deg,#e8f0ee,#cfe0dc 60%,#b7cec9)', CUSHION: 'linear-gradient(150deg,#f3e6ee,#e3cbd9 60%,#cfb0c3)',
};
const thumb = (f, big) => `<div class="thumb${big ? ' big' : ''}" style="background:${GRAD[f.type]}"><span>${f.type}</span></div>`;
const bar = f => `<div class="bar"><i style="width:${Math.min(100, pct(f))}%"></i></div>`;

// ---------- UI state ----------
const ui = { view: 'list', fid: null, admin: false, auth: null, pg: null, ship: { name: '', phone: '', country: '', address: '', zip: '' }, creditUse: 0, badShip: [] };
const app = document.getElementById('app');
const modal = document.getElementById('modal');

function toast(msg, bad) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => { el.className = ''; }, 2800);
}
// keepForm: on error, don't re-render so typed form values survive
function run(fn, keepForm) {
  try { const r = fn(); render(); return r; }
  catch (e) {
    if (!(e instanceof Error) || !e.message) throw e;
    const key = 'msg.' + e.message;
    if (I18N.ko[key] == null) throw e;
    toast(t(key, e.vars), true);
    if (!keepForm) render();
  }
}

// ---------- render ----------
function render() {
  document.documentElement.lang = lang;
  document.getElementById('badge').textContent = t('badge');
  const u = me();
  const cartN = S.cart.reduce((a, c) => a + c.qty, 0);
  const warn = S.users.filter(x => !verifyLedger(x.id).ok);
  app.innerHTML = `
  <div class="util"><div class="wrap util-in">
    <span class="util-label">${t('util.demo')}</span>
    <div class="util-actions">
      <button class="link" data-act="reset">${t('util.reset')}</button>
      <button class="link${ui.admin ? ' on' : ''}" data-act="admin">${ui.admin ? t('util.shop') : t('util.admin')}</button>
      <select data-act="lang" aria-label="${t('util.lang')}">${LANGS.map(l => `<option value="${l}"${l === lang ? ' selected' : ''}>${{ ko: '한국어', en: 'English', vi: 'Tiếng Việt', th: 'ไทย' }[l]}</option>`).join('')}</select>
    </div>
  </div></div>
  <header class="head"><div class="wrap head-in">
    <button class="brand" data-act="nav" data-v="list"><b>ONDAM</b><span>${t('brand.sub')}</span></button>
    <div class="acct">${u ? `<span class="who">${esc(u.name)}</span><button class="btn-s" data-act="logout">${t('auth.logout')}</button>`
      : `<button class="btn-s" data-act="auth" data-m="login">${t('auth.login')}</button><button class="btn-s solid" data-act="auth" data-m="signup">${t('auth.signup')}</button>`}</div>
  </div>
  ${ui.admin ? '' : `<nav class="wrap tabs">${[['list', t('nav.list')], ['cart', t('nav.cart') + (cartN ? ` <em>${cartN}</em>` : '')], ['credit', t('nav.credit')], ['orders', t('nav.orders')]]
    .map(([v, l]) => `<button class="${ui.view === v || (v === 'list' && ui.view === 'detail') ? 'on' : ''}" data-act="nav" data-v="${v}">${l}</button>`).join('')}</nav>`}
  </header>
  ${warn.length ? `<div class="wrap"><div class="alert">${warn.map(x => { const v = verifyLedger(x.id); return esc(x.email) + ' · ' + t('credit.bad', { a: krw(v.sum), b: krw(v.stored) }); }).join('<br>')}</div></div>` : ''}
  <main class="wrap">${ui.admin ? vAdmin() : ({ list: vList, detail: vDetail, cart: vCart, credit: vCredit, orders: vOrders }[ui.view])()}</main>
  <div class="wrap"><details class="arch"><summary>${t('arch.title')}</summary><ul>${[1, 2, 3, 4, 5, 6].map(i => `<li>${t('arch.' + i)}</li>`).join('')}</ul></details></div>`;
  renderModal();
}

function vList() {
  return `<section class="hero"><h1>${t('hero.title')}</h1><p>${t('hero.sub')}</p></section>
  <div class="grid">${S.fundings.map(f => `
    <article class="card" data-act="open" data-f="${f.id}" tabindex="0">
      ${thumb(f)}
      <div class="card-b">
        <div class="tags">${badges(f)}</div>
        <h3>${ftitle(f)}</h3>
        <div class="stat"><b>${pct(f)}%</b><span>${ddayLabel(f)}</span></div>
        ${bar(f)}
        <div class="meta"><span>${krw(f.raised)}</span><span>${t('f.backers', { n: f.backers })}</span></div>
      </div>
    </article>`).join('')}</div>
  ${FX_BY_LANG[lang] ? `<p class="note">${t('fx.note')}</p>` : ''}`;
}

function vDetail() {
  const f = fundById(ui.fid);
  if (!f) { ui.view = 'list'; return vList(); }
  const closed = isClosed(f);
  return `<button class="back" data-act="nav" data-v="list">← ${t('f.back')}</button>
  <div class="detail">
    ${thumb(f, true)}
    <div class="detail-b">
      <div class="tags">${badges(f)}</div>
      <h2>${ftitle(f)}</h2>
      ${fdesc(f) ? `<p class="desc">${fdesc(f)}</p>` : ''}
      <div class="big-stat"><b>${pct(f)}%</b><span>${price(f.raised)}</span></div>
      ${bar(f)}
      <div class="meta"><span>${t('f.goal', { amt: krw(f.goal) })}</span><span>${t('f.backers', { n: f.backers })}</span><span>${ddayLabel(f)} · ${t('f.deadline', { date: fmtDate(f.deadline) })}</span></div>
      ${closed ? `<p class="muted-box">${t('f.closedMsg')}</p>` : ''}
      <h4>${t('f.rewards')}</h4>
      <div class="rewards">${f.rewards.map(r => {
        const left = remaining(r), inCart = cartQty(f.id, r.id), off = closed || left - inCart <= 0;
        return `<div class="reward${off ? ' off' : ''}">
          <div><b>${rname(r)}</b><div class="rp">${price(r.price)}</div>
          <small>${left <= 0 ? `<span class="tag tag-soldout">${t('f.soldout')}</span>` : t('f.left', { n: left })} · ${t('f.limit', { n: r.limit })}${inCart ? ' · ' + t('f.inCart', { n: inCart }) : ''}</small></div>
          <button class="btn" data-act="add" data-f="${f.id}" data-r="${r.id}"${off ? ' disabled' : ''}>${t('f.add')}</button>
        </div>`;
      }).join('')}</div>
      ${FX_BY_LANG[lang] ? `<p class="note">${t('fx.note')}</p>` : ''}
    </div>
  </div>`;
}

function vCart() {
  if (!S.cart.length) return `<div class="empty"><p>${t('cart.empty')}</p><button class="btn" data-act="nav" data-v="list">${t('cart.browse')}</button></div>`;
  const u = me(), total = cartTotal();
  const maxCredit = u ? Math.min(u.credit, total) : 0;
  const use = Math.min(Math.max(0, ui.creditUse | 0), maxCredit); // display clamp only; keep the user's choice
  const fld = (k, type = 'text', extra = '') => `<label class="${ui.badShip.includes('ship.' + k) ? 'bad' : ''}">${t('ship.' + k)}<input type="${type}" data-ship="${k}" value="${esc(ui.ship[k])}" ${extra}></label>`;
  return `<div class="cols">
  <section class="panel"><h3>${t('cart.items')}</h3>
    ${S.cart.map((c, i) => { const f = fundById(c.fid), r = rewardOf(f, c.rid); return `
      <div class="line">${thumb(f)}<div class="line-b"><b>${ftitle(f)}</b><span>${rname(r)} · ${krw(r.price)}</span>
        <div class="qty"><button data-act="qty" data-i="${i}" data-d="-1" aria-label="-">−</button><span>${c.qty}</span><button data-act="qty" data-i="${i}" data-d="1" aria-label="+"${c.qty >= remaining(r) ? ' disabled' : ''}>+</button>
        <small>${t('f.left', { n: remaining(r) })}</small><button class="link" data-act="qty" data-i="${i}" data-d="rm">${t('cart.remove')}</button></div></div>
        <b class="line-p">${krw(r.price * c.qty)}</b></div>`; }).join('')}
  </section>
  <section class="panel"><h3>${t('ship.title')}</h3>
    <div class="form">${fld('name', 'text', 'autocomplete="name"')}${fld('phone', 'tel', 'autocomplete="tel" placeholder="+84 90 123 4567"')}
      <label class="${ui.badShip.includes('ship.country') ? 'bad' : ''}">${t('ship.country')}<select data-ship="country"><option value="">${t('country.pick')}</option>${['KR', 'VN', 'TH'].map(c => `<option value="${c}"${ui.ship.country === c ? ' selected' : ''}>${t('country.' + c)}</option>`).join('')}</select></label>
      ${fld('address', 'text', 'autocomplete="street-address"')}${fld('zip', 'text', 'autocomplete="postal-code"')}</div>
  </section>
  <section class="panel pay"><h3>${t('pay.title')}</h3>
    <div class="row"><span>${t('pay.total')}</span><b>${price(total)}</b></div>
    ${u ? `<div class="row credit-row"><span>${t('pay.credit')} <small>${t('pay.balance', { amt: krw(u.credit) })}</small></span>
      <span class="credit-in"><input type="number" inputmode="numeric" min="0" max="${maxCredit}" step="1000" value="${use}" data-act="credituse"><button class="btn-s" data-act="creditmax">${t('pay.all')}</button></span></div>
      <div class="row total"><span>${t('pay.card')}</span><b id="cardAmt">${price(total - use)}</b></div>
      <button class="btn wide" data-act="checkout">${t('pay.submit')}</button>`
    : `<p class="muted-box">${t('pay.loginFirst')}</p><button class="btn wide" data-act="auth" data-m="login">${t('auth.login')}</button>`}
  </section></div>`;
}

const typeLabel = ty => t('lt.' + ty);
function ledgerList(uid) {
  const list = ledgerOf(uid).slice().reverse();
  if (!list.length) return `<p class="muted">${t('credit.empty')}</p>`;
  return `<ul class="ledger">${list.map(e => `<li><div><b>${typeLabel(e.type)}</b><span class="amt ${e.amount < 0 ? 'neg' : 'pos'}">${e.amount > 0 ? '+' : '−'}${krw(Math.abs(e.amount))}</span></div>
    <small>${fmtTime(e.at)} · ${t('col.balance', { amt: krw(e.balance) })}${e.ref ? ' · ' + t('col.ref', { ref: esc(e.ref) }) : ''}</small></li>`).join('')}</ul>`;
}
function needLogin() { return `<div class="empty"><p>${t('credit.login')}</p><button class="btn" data-act="auth" data-m="login">${t('auth.login')}</button></div>`; }

function vCredit() {
  const u = me();
  if (!u) return needLogin();
  const v = verifyLedger(u.id);
  return `<div class="cols">
  <section class="panel"><h3>${t('credit.title')}</h3>
    <div class="balance"><small>${t('credit.balance')}</small><b>${krw(u.credit)}</b>${FX_BY_LANG[lang] ? `<span class="fx">${fxRef(u.credit)}</span>` : ''}</div>
    <p class="verify ${v.ok ? 'ok' : 'bad'}">${t(v.ok ? 'credit.ok' : 'credit.bad', { a: krw(v.sum), b: krw(v.stored) })}</p>
    <h4>${t('credit.charge')}</h4>
    <div class="chips">${[10000, 30000, 50000].map(a => `<button class="chip" data-act="charge" data-a="${a}">+${krw(a)}</button>`).join('')}</div>
    <p class="note">${t('credit.chargeNote')}</p>
    <h4>${t('credit.myCode')}</h4>
    <div class="code"><b>${esc(u.refCode)}</b><small>${t('credit.refHint', { amt: krw(REF_BONUS) })}</small></div>
    <h4>${t('credit.refApply')}</h4>
    ${u.referredBy ? `<p class="muted">${t('credit.refDone')}</p>` : `<form class="inline" data-form="ref"><input name="code" placeholder="${t('auth.refPh')}" required><button class="btn">${t('credit.apply')}</button></form><p class="note">${t('credit.refLater')}</p>`}
  </section>
  <section class="panel"><h3>${t('credit.ledger')}</h3><p class="note">${t('credit.ledgerNote')}</p>${ledgerList(u.id)}</section></div>`;
}

function orderCard(o, admin) {
  const items = o.items.map(it => { const f = fundById(it.fid); return `${ftitle(f)} · ${rname(rewardOf(f, it.rid))} ×${it.qty}`; }).join('<br>');
  const owner = userById(o.userId);
  return `<li class="order"><div class="order-h"><b>${o.id}</b><span class="st st-${o.status}">${t('st.' + o.status)}</span></div>
    <p>${items}</p>
    <small>${fmtTime(o.at)}${admin ? ' · ' + esc(owner.email) : ''} · ${t('ord.shipTo', { name: esc(o.ship.name), country: t('country.' + o.ship.country) })}</small>
    <div class="order-f"><span>${t('ord.paidBy', { c: krw(o.creditUsed), k: krw(o.cardAmount) })}</span><b>${krw(o.total)}</b></div>
    ${admin && (o.status === 'paid' || o.status === 'ready') ? `<div class="order-a">${o.status === 'paid' ? `<button class="btn-s" data-act="ready" data-o="${o.id}">${t('admin.toReady')}</button>` : ''}<button class="btn-s danger" data-act="refund" data-o="${o.id}">${t('admin.refund')}</button></div>` : ''}
  </li>`;
}
function vOrders() {
  const u = me();
  if (!u) return needLogin();
  const list = S.orders.filter(o => o.userId === u.id).reverse();
  return `<section class="panel"><h3>${t('nav.orders')}</h3>${list.length ? `<ul class="orders">${list.map(o => orderCard(o)).join('')}</ul>` : `<p class="muted">${t('ord.empty')}</p>`}</section>`;
}

function vAdmin() {
  const tomorrow = new Date(Date.now() + DAY * 14).toISOString().slice(0, 10);
  const rw = n => `<fieldset><legend>${t('admin.reward', { n })}${n > 1 ? ' ' + t('admin.optional') : ''}</legend>
    <label>${t('admin.rName')}<input name="r${n}name"${n === 1 ? ' required' : ''}></label>
    <div class="two"><label>${t('admin.rPrice')}<input name="r${n}price" type="number" min="1000" step="1000"></label><label>${t('admin.rLimit')}<input name="r${n}limit" type="number" min="1"></label></div></fieldset>`;
  return `<p class="note admin-note">${t('admin.note')}</p>
  <div class="cols">
  <section class="panel"><h3>${t('admin.newFunding')}</h3>
    <form class="form" data-form="funding">
      <label>${t('admin.fTitle')}<input name="title" required maxlength="60"></label>
      <div class="two"><label>${t('admin.fType')}<select name="type">${TYPES.map(x => `<option>${x}</option>`).join('')}</select></label>
      <label>${t('admin.fGoal')}<input name="goal" type="number" min="100000" step="100000" required></label></div>
      <label>${t('admin.fDeadline')}<input name="deadline" type="date" min="${new Date(Date.now() + DAY).toISOString().slice(0, 10)}" value="${tomorrow}" required></label>
      ${rw(1)}${rw(2)}${rw(3)}
      <button class="btn wide">${t('admin.create')}</button>
    </form>
  </section>
  <section class="panel"><h3>${t('admin.fundings')}</h3>
    <ul class="flist">${S.fundings.map(f => `<li><div><b>${ftitle(f)}</b><div class="tags">${badges(f)}</div></div>${bar(f)}
      <small>${pct(f)}% · ${krw(f.raised)} / ${krw(f.goal)} · ${t('f.backers', { n: f.backers })} · ${ddayLabel(f)}</small>
      <small class="stock">${f.rewards.map(r => `${rname(r)} ${r.sold}/${r.limit}`).join(' · ')}</small></li>`).join('')}</ul>
  </section>
  <section class="panel"><h3>${t('admin.orders')}</h3>${S.orders.length ? `<ul class="orders">${S.orders.slice().reverse().map(o => orderCard(o, true)).join('')}</ul>` : `<p class="muted">${t('admin.noOrders')}</p>`}</section>
  <section class="panel"><h3>${t('admin.pgLog')}</h3>${S.pgLog.length ? `<ul class="ledger">${S.pgLog.slice().reverse().map(p => `<li><div><b>${t('pgl.' + p.type)}</b><span class="amt ${p.type === 'approve' ? 'pos' : 'neg'}">${krw(p.amount)}</span></div><small>${p.id} · ${fmtTime(p.at)} · ${p.ref === 'CHARGE' ? t('pg.forCharge') : p.ref}</small></li>`).join('')}</ul>` : `<p class="muted">${t('admin.noPg')}</p>`}</section>
  <section class="panel"><h3>${t('admin.ledgerCheck')}</h3><p class="note">${t('admin.members', { n: S.users.length })} · ${t('admin.allLedger', { n: S.ledger.length })}</p>
    <ul class="ledger">${S.users.map(x => { const v = verifyLedger(x.id); return `<li><div><b>${esc(x.email)}</b><span class="amt">${krw(x.credit)}</span></div>
      <small class="${v.ok ? 'ok-t' : 'bad-t'}">${t(v.ok ? 'credit.ok' : 'credit.bad', { a: krw(v.sum), b: krw(v.stored) })}</small>
      <div class="order-a"><button class="btn-s" data-act="tamper" data-u="${x.id}">${t('admin.tamper')}</button>${v.ok ? '' : `<button class="btn-s" data-act="recalc" data-u="${x.id}">${t('admin.recalc')}</button>`}</div></li>`; }).join('')}</ul>
  </section></div>`;
}

function renderModal() {
  if (ui.pg) {
    const p = ui.pg;
    const amount = p.kind === 'charge' ? p.amount : S.orders.find(o => o.id === p.orderId).cardAmount;
    modal.innerHTML = `<div class="ov"><div class="sheet pg" role="dialog" aria-modal="true" aria-label="${t('pg.title')}">
      <div class="pg-h"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><b>${t('pg.title')}</b><button class="x" data-act="pgclose" aria-label="${t('auth.close')}">×</button></div>
      <dl><dt>${t('pg.merchant')}</dt><dd>${t('pg.merchantName')}</dd><dt>${t('pg.item')}</dt><dd>${p.kind === 'charge' ? t('pg.forCharge') : t('pg.forOrder', { id: p.orderId })}</dd>
      <dt>${t('pg.amount')}</dt><dd class="pg-amt">${price(amount)}</dd></dl>
      <p class="pg-notice">${t('pg.notice')}</p>
      <div class="pg-btns"><button class="btn ghost" data-act="pgfail">${t('pg.fail')}</button><button class="btn" data-act="pgok">${t('pg.approve')}</button></div>
      <p class="note">${t('pg.hint')}</p>
    </div></div>`;
    return;
  }
  if (ui.auth) {
    const su = ui.auth === 'signup';
    modal.innerHTML = `<div class="ov" data-act="authclose"><div class="sheet" role="dialog" aria-modal="true" aria-label="${t(su ? 'auth.signup' : 'auth.login')}">
      <div class="pg-h"><b>${t(su ? 'auth.signup' : 'auth.login')}</b><button class="x" data-act="authclose" aria-label="${t('auth.close')}">×</button></div>
      <button class="btn google wide" data-act="google"><span class="g">G</span>${t('auth.google')}</button>
      <div class="or"><span>${t('auth.or')}</span></div>
      <form class="form" data-form="${ui.auth}">
        <label>${t('auth.email')}<input name="email" type="email" autocomplete="email" required></label>
        ${su ? `<label>${t('auth.name')}<input name="name" autocomplete="name" required></label>` : ''}
        <label>${t('auth.password')}<input name="password" type="password" autocomplete="${su ? 'new-password' : 'current-password'}" minlength="8" required></label>
        ${su ? `<label>${t('auth.ref')}<input name="ref" placeholder="${t('auth.refPh')}" autocapitalize="characters"></label><p class="note">${t('auth.refInfo', { amt: krw(REF_BONUS) })}</p>` : ''}
        <button class="btn wide">${t(su ? 'auth.submitSignup' : 'auth.submitLogin')}</button>
        <p class="note">${t('auth.pwNote')}</p>
      </form>
      <button class="link center" data-act="auth" data-m="${su ? 'login' : 'signup'}">${t(su ? 'auth.toLogin' : 'auth.toSignup')}</button>
    </div></div>`;
    return;
  }
  modal.innerHTML = '';
}

// ---------- events ----------
function closePg(approved) {
  const p = ui.pg; ui.pg = null;
  if (p.kind === 'charge') {
    if (approved) run(() => { chargeApprove(p.amount); toast(t('msg.charged', { amt: krw(p.amount) })); });
    else run(() => { chargeFail(p.amount); toast(t('msg.chargeFail'), true); });
  } else if (approved) run(() => { const o = pgApprove(p.orderId); ui.view = 'orders'; ui.creditUse = 0; toast(t('msg.paid', { id: o.id })); });
  else run(() => { pgFail(p.orderId); toast(t('msg.failed'), true); });
}

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, d = el.dataset;
  if (a === 'authclose' && el.classList.contains('ov') && ev.target !== el) return;
  switch (a) {
    case 'nav': ui.view = d.v; ui.admin = false; render(); window.scrollTo(0, 0); break;
    case 'open': ui.view = 'detail'; ui.fid = d.f; render(); window.scrollTo(0, 0); break;
    case 'add': run(() => { addToCart(d.f, d.r, 1); toast(t('msg.added')); }); break;
    case 'qty': run(() => { const i = +d.i; setCartQty(i, d.d === 'rm' ? 0 : S.cart[i].qty + Number(d.d)); }); break;
    case 'creditmax': { const u = me(); ui.creditUse = Math.min(u.credit, cartTotal()); render(); break; }
    case 'checkout': run(() => {
      ui.badShip = validateShip(ui.ship);
      const o = placeOrder(ui.ship, Math.min(ui.creditUse, me() ? me().credit : 0, cartTotal()));
      ui.badShip = [];
      if (o.cardAmount === 0) { pgApprove(o.id); ui.view = 'orders'; ui.creditUse = 0; toast(t('pay.creditOnly') + ' ' + t('msg.paid', { id: o.id })); }
      else ui.pg = { kind: 'order', orderId: o.id };
    }); break;
    case 'pgok': closePg(true); break;
    case 'pgfail': closePg(false); break;
    case 'pgclose': toast(t('msg.pgCancel'), true); closePg(false); break;
    case 'charge': if (!me()) { toast(t('msg.login'), true); break; } ui.pg = { kind: 'charge', amount: +d.a }; render(); break;
    case 'auth': ui.auth = d.m; render(); break;
    case 'authclose': ui.auth = null; render(); break;
    case 'google': run(() => { const u = googleLogin(); ui.auth = null; toast(t('msg.welcome', { name: u.name })); }); break;
    case 'logout': S.session = null; save(); render(); break;
    case 'admin': ui.admin = !ui.admin; render(); window.scrollTo(0, 0); break;
    case 'reset':
      if (!confirm(t('util.resetConfirm'))) break;
      S = seed(); Object.assign(ui, { view: 'list', fid: null, admin: false, auth: null, pg: null, creditUse: 0, badShip: [], ship: { name: '', phone: '', country: '', address: '', zip: '' } });
      save(); render(); toast(t('msg.reset')); break;
    case 'ready': run(() => { setReady(d.o); toast(t('msg.ready')); }); break;
    case 'refund':
      if (!confirm(t('admin.refundConfirm', { id: d.o }))) break;
      run(() => { refund(d.o); toast(t('msg.refunded', { id: d.o })); }); break;
    case 'tamper': userById(d.u).credit += 5000; save(); render(); toast(t('msg.tampered'), true); break;
    case 'recalc': userById(d.u).credit = ledgerSum(d.u); save(); render(); toast(t('msg.recalc')); break;
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.matches('.card')) ev.target.click();
  if (ev.key === 'Escape' && ui.auth) { ui.auth = null; render(); }
});
document.addEventListener('change', ev => {
  if (ev.target.dataset.act === 'lang') {
    lang = ev.target.value;
    try { localStorage.setItem('kbf_lang', lang); } catch (e) { /* ignore */ }
    render();
  }
});
document.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.ship) {
    ui.ship[el.dataset.ship] = el.value;
    if (!validateShip(ui.ship).includes('ship.' + el.dataset.ship)) { ui.badShip = ui.badShip.filter(k => k !== 'ship.' + el.dataset.ship); el.closest('label').classList.remove('bad'); }
  }
  if (el.dataset.act === 'credituse') {
    const u = me(), total = cartTotal(), max = Math.min(u.credit, total);
    ui.creditUse = Math.max(0, Math.min(max, Math.floor(Number(el.value) || 0)));
    if (Number(el.value) > max) el.value = max;
    const c = document.getElementById('cardAmt');
    if (c) c.innerHTML = price(total - ui.creditUse);
  }
});
document.addEventListener('submit', ev => {
  const form = ev.target, kind = form.dataset.form;
  if (!kind) return;
  ev.preventDefault();
  const v = Object.fromEntries(new FormData(form));
  if (kind === 'signup') run(() => {
    const u = signup(v); ui.auth = null;
    toast(t('msg.welcome', { name: u.name }) + (u.referredBy ? ' ' + t('msg.refOk', { amt: krw(REF_BONUS) }) : ''));
  }, true);
  if (kind === 'login') run(() => {
    if (!EMAIL_RE.test(String(v.email).trim())) fail('email');
    if (String(v.password).length < 8) fail('pw');
    const u = login(v.email); ui.auth = null; toast(t('msg.welcome', { name: u.name }));
  }, true);
  if (kind === 'ref') run(() => { applyReferral(S.session, v.code); toast(t('msg.refOk', { amt: krw(REF_BONUS) })); }, true);
  if (kind === 'funding') run(() => {
    createFunding({ title: v.title, type: v.type, goal: v.goal, deadline: v.deadline,
      rewards: [1, 2, 3].map(n => ({ name: v['r' + n + 'name'], price: v['r' + n + 'price'], limit: v['r' + n + 'limit'] })) });
    form.reset(); toast(t('msg.created'));
  }, true);
});

// ---------- selftest (?test=1) ----------
function selftest() {
  const saved = S, savedLang = lang;
  const results = [];
  const ok = (name, cond) => results.push([name, !!cond]);
  const throws = (name, fn, code) => { try { fn(); ok(name, false); } catch (e) { ok(name + ' [' + e.message + ']', e.message === code); } };
  persist = false;
  try {
    S = seed();
    // referral
    const owner = userById('u0');
    const a = signup({ email: 'a@test.vn', name: 'A', password: '12345678', ref: 'kbeauty10' });
    ok('referral: new user gets bonus', a.credit === REF_BONUS);
    ok('referral: referrer gets bonus', owner.credit === REF_BONUS);
    ok('ledger sum = balance (new user)', verifyLedger(a.id).ok && ledgerSum(a.id) === a.credit);
    ok('ledger sum = balance (referrer)', verifyLedger('u0').ok);
    const lenRef = S.ledger.length;
    throws('referral: second reward blocked', () => applyReferral(a.id, 'KBEAUTY10'), 'refDup');
    ok('referral: no extra entries after dup', S.ledger.length === lenRef && a.credit === REF_BONUS && owner.credit === REF_BONUS);
    throws('referral: invalid code rejected at signup', () => signup({ email: 'x@test.th', name: 'X', password: '12345678', ref: 'NOPE99' }), 'refInvalid');
    ok('referral: invalid code creates no user', !S.users.some(u => u.email === 'x@test.th'));
    throws('signup: duplicate email', () => signup({ email: 'A@test.vn', name: 'A2', password: '12345678' }), 'emailDup');
    const b = signup({ email: 'b@test.th', name: 'B', password: '12345678' });
    throws('referral: own code rejected', () => applyReferral(b.id, b.refCode), 'refSelf');
    applyReferral(b.id, a.refCode);
    ok('referral: user code works later', b.credit === REF_BONUS && a.credit === 2 * REF_BONUS);
    throws('referral: later second apply blocked', () => applyReferral(b.id, 'KBEAUTY10'), 'refDup');
    // charge
    S.session = a.id;
    chargeApprove(30000);
    ok('charge: +30000 after PG approve', a.credit === 50000 && verifyLedger(a.id).ok);
    const lenC = S.ledger.length;
    chargeFail(30000);
    ok('charge fail: ledger untouched', S.ledger.length === lenC && a.credit === 50000);
    // negative
    throws('negative balance blocked', () => appendLedger(a.id, 'use', -50001, 'X'), 'neg');
    ok('negative: no entry written', S.ledger.length === lenC);
    // stock
    const f1 = fundById('f1'), r3 = rewardOf(f1, 'r3'), left = remaining(r3);
    throws('stock: add more than remaining', () => addToCart('f1', 'r3', left + 1), 'stock');
    addToCart('f1', 'r3', left);
    throws('stock: one more than remaining', () => addToCart('f1', 'r3', 1), 'stock');
    throws('stock: setQty above remaining', () => setCartQty(0, left + 1), 'stock');
    setCartQty(0, 2);
    throws('closed funding cannot be added', () => addToCart('f5', 'r1', 1), 'closed');
    throws('soldout reward cannot be added', () => addToCart('f4', 'r1', 1), 'stock');
    // payment failure restores
    const ship = { name: 'Nguyen Van A', phone: '+84 90 123 4567', country: 'VN', address: '12 Le Loi, Quan 1, HCMC' };
    throws('shipping validation', () => placeOrder({ ...ship, address: '' }, 0), 'required');
    throws('credit over balance', () => placeOrder(ship, 999999), 'creditOver');
    const sold0 = r3.sold, raised0 = f1.raised, backers0 = f1.backers;
    const o1 = placeOrder(ship, 20000);
    ok('order: stock reserved + credit held', r3.sold === sold0 + 2 && a.credit === 30000 && o1.cardAmount === 2 * 75000 - 20000);
    pgFail(o1.id);
    ok('pg fail: stock restored', r3.sold === sold0);
    ok('pg fail: credit restored', a.credit === 50000 && verifyLedger(a.id).ok);
    ok('pg fail: status failed, raised unchanged', o1.status === 'failed' && f1.raised === raised0);
    ok('pg fail: cart kept for retry', S.cart.length === 1);
    throws('pg fail: cannot approve failed order', () => pgApprove(o1.id), 'state');
    // approve
    const o2 = placeOrder(ship, 20000);
    pgApprove(o2.id);
    ok('pg approve: paid, raised/backers updated', o2.status === 'paid' && f1.raised === raised0 + 150000 && f1.backers === backers0 + 1);
    ok('pg approve: stock kept, cart cleared', r3.sold === sold0 + 2 && S.cart.length === 0);
    // stock race: someone else bought it out before checkout
    addToCart('f1', 'r1', 1);
    rewardOf(f1, 'r1').sold = rewardOf(f1, 'r1').limit;
    throws('stock re-checked at checkout', () => placeOrder(ship, 0), 'stock');
    rewardOf(f1, 'r1').sold -= 1; S.cart = [];
    // refund
    const lenBeforeRefund = S.ledger.length, pgBefore = S.pgLog.length;
    refund(o2.id);
    ok('refund: credit restored via ledger', a.credit === 50000 && S.ledger.length === lenBeforeRefund + 1 && S.ledger[S.ledger.length - 1].type === 'refund');
    ok('refund: PG cancel request logged', S.pgLog.length === pgBefore + 1 && S.pgLog[S.pgLog.length - 1].type === 'cancel' && S.pgLog[S.pgLog.length - 1].amount === 130000);
    ok('refund: stock/raised/backers reverted', r3.sold === sold0 && f1.raised === raised0 && f1.backers === backers0);
    throws('refund: second refund blocked', () => refund(o2.id), 'refundOnce');
    ok('refund: nothing changed on second try', a.credit === 50000 && S.ledger.length === lenBeforeRefund + 1 && S.pgLog.length === pgBefore + 1);
    throws('refund: failed order cannot be refunded', () => refund(o1.id), 'refundState');
    // credit-only order
    addToCart('f3', 'r1', 2);
    const o3 = placeOrder(ship, 36000);
    ok('credit-only order: card amount 0', o3.cardAmount === 0);
    pgApprove(o3.id);
    ok('credit-only order: balance', a.credit === 14000 && verifyLedger(a.id).ok);
    // tamper detection + append-only
    a.credit += 1;
    ok('tamper: verify detects mismatch', !verifyLedger(a.id).ok);
    throws('tamper: transactions blocked while mismatched', () => appendLedger(a.id, 'charge', 1000, 'X'), 'mismatch');
    a.credit -= 1;
    ok('tamper: verify ok after fix', verifyLedger(a.id).ok);
    let frozen = false;
    try { S.ledger[0].amount = 999999; } catch (e) { frozen = e instanceof TypeError; }
    ok('ledger entries are immutable', frozen && S.ledger[0].amount === REF_BONUS);
    ok('all users: ledger sum = balance', S.users.every(u => verifyLedger(u.id).ok));
    ok('all balances non-negative', S.users.every(u => u.credit >= 0) && S.ledger.every(e => e.balance >= 0));
    // i18n parity
    const keys = Object.keys(I18N.ko);
    LANGS.forEach(l => ok('i18n keys complete: ' + l, keys.every(k => I18N[l][k] != null) && Object.keys(I18N[l]).length === keys.length));
  } catch (e) {
    ok('unexpected error: ' + e.message, false);
  } finally {
    S = saved; lang = savedLang; persist = true;
  }
  const p = results.filter(r => r[1]).length, f = results.length - p;
  results.forEach(r => console[r[1] ? 'log' : 'error']((r[1] ? 'PASS ' : 'FAIL ') + r[0]));
  console.log(`selftest: ${p} passed / ${f} failed`);
  const bar = document.getElementById('testbar');
  bar.hidden = false;
  bar.className = f ? 'fail' : 'pass';
  bar.textContent = t('test.result', { p, f }) + (f ? ' — ' + results.filter(r => !r[1]).map(r => r[0]).join(', ') : '');
  window.__selftest = { pass: p, fail: f, results };
  return { pass: p, fail: f };
}

render();
if (new URLSearchParams(location.search).get('test') === '1') selftest();
