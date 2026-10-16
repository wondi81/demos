var toastEl = document.querySelector('.toast'), toastT;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
}
document.querySelectorAll('[data-demo]').forEach(function (a) {
  a.addEventListener('click', function (e) { e.preventDefault(); toast('데모에서는 메인·회사소개만 옮겼습니다'); });
});
document.querySelectorAll('form').forEach(function (f) {
  f.addEventListener('submit', function (e) { e.preventDefault(); toast('데모라 전송되지 않습니다'); });
});
var slides = document.querySelectorAll('.slide'), dots = document.querySelectorAll('.dots button'), cur = 0, timer;
function go(n) {
  if (!slides.length) return;
  slides[cur].classList.remove('on'); dots[cur].classList.remove('on');
  cur = (n + slides.length) % slides.length;
  slides[cur].classList.add('on'); dots[cur].classList.add('on');
  clearInterval(timer); timer = setInterval(function () { go(cur + 1); }, 5000);
}
if (slides.length) {
  document.querySelector('.prev').onclick = function () { go(cur - 1); };
  document.querySelector('.next').onclick = function () { go(cur + 1); };
  dots.forEach(function (d, i) { d.onclick = function () { go(i); }; });
  go(0);
}
