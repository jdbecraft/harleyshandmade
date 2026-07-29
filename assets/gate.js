/* ------------------------------------------------------------------
   THE PULL-BACK — the transition between pages, and the walk's memory.

   Leaving: the camera pulls BACK off the board. The scene recedes and
   dims, as if you straightened up and stepped away from the bench.
   Arriving: the next page comes forward to meet you.

   Coming back to the board returns you to the exact point you left —
   the same card, the same stretch of wood — not the beginning.

   No framework, no build step. Reduced-motion and older browsers just
   navigate.
------------------------------------------------------------------ */
(function () {
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ON_BOARD = /(^|\/)(index\.html)?($|[?#])/.test(location.pathname.split('/').pop() || '/');

  /* where each station sits along the walk, as a percentage of total scroll */
  var MARKS = { story:21, material:38, process:55, shop:72, custom:89 };

  var css = '\
  .pullstage{transform-origin:50% 42%;will-change:transform,opacity,filter}\
  .pullstage.away{animation:pullAway .56s cubic-bezier(.55,0,.85,.35) forwards}\
  @keyframes pullAway{0%{transform:scale(1);opacity:1;filter:brightness(1)}\
    100%{transform:scale(.78);opacity:0;filter:brightness(.35)}}\
  .pullveil{position:fixed;inset:0;z-index:9998;pointer-events:none;opacity:0;background:#100a04}\
  .pullveil.on{animation:veilOn .56s ease-in forwards}\
  .pullveil.off{animation:veilOff .62s ease-out forwards}\
  @keyframes veilOn{from{opacity:0}to{opacity:1}}\
  @keyframes veilOff{from{opacity:1}to{opacity:0}}\
  .comeforward{animation:comeFwd .82s cubic-bezier(.16,.84,.28,1) both}\
  @keyframes comeFwd{0%{opacity:0;transform:scale(.9) translateY(20px);filter:brightness(.5)}\
    100%{opacity:1;transform:none;filter:none}}';

  var s = document.createElement('style'); s.textContent = css;
  document.head.appendChild(s);

  /* the board must not be scroll-restored by the browser — we place it ourselves */
  if (ON_BOARD && 'scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------- RETURNING TO THE BOARD: land where you left ---------- */
  if (ON_BOARD) {
    var target = null;

    /* 1. exact position, if you walked away from here in this session */
    try {
      var saved = sessionStorage.getItem('hh_at');
      if (saved !== null) { target = parseFloat(saved); sessionStorage.removeItem('hh_at'); }
    } catch (e) {}

    /* 2. otherwise a named mark, so a shared link lands in the right place too */
    if (target === null) {
      var key = (location.hash || '').replace('#', '');
      if (MARKS[key] != null) target = MARKS[key] / 100;
    }

    if (target !== null && isFinite(target)) {
      var place = function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        if (h > 0) window.scrollTo(0, Math.max(0, Math.min(1, target)) * h);
      };
      place();
      /* the board is tall and image-backed; re-place once layout settles */
      window.addEventListener('load', place);
      setTimeout(place, 60);
      setTimeout(place, 260);
    }
  }

  var veil = document.createElement('div');
  veil.className = 'pullveil';
  veil.setAttribute('aria-hidden', 'true');

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    document.body.appendChild(veil);

    /* ---------- ARRIVING: come forward into the page ---------- */
    var came = false;
    try {
      came = sessionStorage.getItem('hh_pull') === '1';
      sessionStorage.removeItem('hh_pull');
    } catch (e) {}

    if (came && !REDUCED) {
      veil.style.opacity = '1';
      requestAnimationFrame(function () {
        veil.classList.add('off');
        var risers = document.querySelectorAll('[data-rise]');
        for (var i = 0; i < risers.length; i++) risers[i].classList.add('comeforward');
      });
    }

    /* ---------- LEAVING: pull back off the board ---------- */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;

      var href = a.getAttribute('href') || '';
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (!/\.html($|[?#])/.test(href)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

      e.preventDefault();

      try {
        sessionStorage.setItem('hh_pull', '1');
        /* remember exactly where on the board we were standing */
        if (ON_BOARD) {
          var h = document.documentElement.scrollHeight - window.innerHeight;
          sessionStorage.setItem('hh_at', h > 0 ? (window.scrollY / h) : 0);
        }
      } catch (err) {}

      if (REDUCED) { location.href = href; return; }

      var kids = document.body.children;
      for (var i = 0; i < kids.length; i++) {
        if (kids[i] !== veil && kids[i].tagName !== 'SCRIPT') {
          kids[i].classList.add('pullstage', 'away');
        }
      }
      veil.classList.add('on');

      var went = false;
      var go = function () { if (!went) { went = true; location.href = href; } };
      veil.addEventListener('animationend', go, { once: true });
      setTimeout(go, 660);
    });
  });
})();
