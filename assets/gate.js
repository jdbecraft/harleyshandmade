/* ------------------------------------------------------------------
   THE PULL-BACK — the transition between pages.

   Leaving: the camera pulls BACK off the board. The whole scene recedes
   and dims, as if you straightened up and stepped away from the bench.
   Arriving: the new page comes forward to meet you, rising up out of
   the dark into place.

   The two halves are one continuous camera move: away from one thing,
   toward the next. No framework, no build step. Reduced-motion and
   older browsers just navigate.
------------------------------------------------------------------ */
(function () {
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = '\
  .pullstage{transform-origin:50% 42%;will-change:transform,opacity,filter}\
  .pullstage.away{animation:pullAway .56s cubic-bezier(.55,0,.85,.35) forwards}\
  @keyframes pullAway{\
    0%{transform:scale(1);opacity:1;filter:brightness(1)}\
    100%{transform:scale(.78);opacity:0;filter:brightness(.35)}}\
  .pullveil{position:fixed;inset:0;z-index:9998;pointer-events:none;opacity:0;background:#100a04}\
  .pullveil.on{animation:veilOn .56s ease-in forwards}\
  .pullveil.off{animation:veilOff .62s ease-out forwards}\
  @keyframes veilOn{from{opacity:0}to{opacity:1}}\
  @keyframes veilOff{from{opacity:1}to{opacity:0}}\
  .comeforward{animation:comeFwd .82s cubic-bezier(.16,.84,.28,1) both}\
  @keyframes comeFwd{\
    0%{opacity:0;transform:scale(.9) translateY(20px);filter:brightness(.5)}\
    100%{opacity:1;transform:none;filter:none}}';

  var s = document.createElement('style'); s.textContent = css;
  document.head.appendChild(s);

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
      if (!/\.html($|[?#])/.test(href)) return;                 // internal pages only
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

      e.preventDefault();
      try { sessionStorage.setItem('hh_pull', '1'); } catch (err) {}

      if (REDUCED) { location.href = href; return; }

      /* everything except the veil recedes together */
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
      setTimeout(go, 660);   // never strand anyone if an animation stalls
    });
  });
})();
