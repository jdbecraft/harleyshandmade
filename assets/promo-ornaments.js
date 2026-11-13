/* Harley's Handmade, 2026-11-13 (Jeff): make the Black Friday bar easier to notice.
   Glass ornaments hang from the bottom edge of the promo bar. This file is only
   requested by the top-bar script while the dated promo is on, so it costs nothing
   the rest of the year. Decoration only: aria-hidden, no pointer events, kept clear
   of the Cart button, and still when the visitor asks for reduced motion. */
(function () {
  var bar = document.querySelector('.hh-bar.hh-promo');
  if (!bar || bar.querySelector('.hh-orn')) return;

  var TONES = {
    red:   ['#F0907A', '#A8321F', '#4A0F08'],
    gold:  ['#FBE9B4', '#C9963F', '#5E3E12'],
    cream: ['#FFFFFF', '#EADCB8', '#8F7A52']
  };
  /* [left %, string px, ball px, tone] */
  var WIDE = [[3, 38, 40, 'red'], [9, 70, 32, 'gold'], [15, 24, 36, 'cream'], [24, 56, 30, 'red'],
              [34, 30, 34, 'gold'], [46, 64, 38, 'red'], [58, 26, 30, 'cream'], [67, 52, 36, 'gold'],
              [76, 34, 40, 'red'], [84, 66, 30, 'cream']];
  /* phone: the home page logo starts about 50px under the bar between 35% and 65%,
     and the Cart button sits right of 70%, so the middle strings stay short */
  var PHONE = [[5, 22, 28, 'red'], [17, 40, 22, 'gold'], [30, 10, 26, 'cream'], [44, 16, 22, 'red'],
               [57, 8, 24, 'gold']];
  var n = 0;

  function ball(size, tone) {
    var c = TONES[tone], id = 'hhorn' + (n++);
    return '<svg width="' + size + '" height="' + Math.round(size * 1.3) + '" viewBox="0 0 40 52" focusable="false">'
      + '<defs><radialGradient id="' + id + '" cx="36%" cy="30%" r="75%">'
      + '<stop offset="0" stop-color="' + c[0] + '"/><stop offset=".45" stop-color="' + c[1] + '"/>'
      + '<stop offset="1" stop-color="' + c[2] + '"/></radialGradient>'
      + '<linearGradient id="' + id + 'c" x1="0" x2="1"><stop offset="0" stop-color="#8A6524"/>'
      + '<stop offset=".45" stop-color="#F6DC9A"/><stop offset="1" stop-color="#6E4E18"/></linearGradient></defs>'
      + '<circle cx="20" cy="4.5" r="3.2" fill="none" stroke="#D9B566" stroke-width="1.3"/>'
      + '<rect x="14.5" y="6.5" width="11" height="7" rx="1.6" fill="url(#' + id + 'c)"/>'
      + '<circle cx="20" cy="32" r="18.5" fill="url(#' + id + ')"/>'
      + '<path d="M4.5 42a18.5 18.5 0 0 0 31 0a22 22 0 0 1-31 0z" fill="#000" opacity=".22"/>'
      + '<ellipse cx="13" cy="24" rx="3.6" ry="6.4" transform="rotate(32 13 24)" fill="#fff" opacity=".6"/>'
      + '<circle cx="27.5" cy="40.5" r="2.2" fill="#fff" opacity=".16"/>'
      + '</svg>';
  }
  function row(list, cls) {
    var h = '';
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      h += '<span class="' + cls + '" style="left:' + o[0] + '%;animation-duration:' + (3.4 + (i % 4) * 0.55)
        + 's;animation-delay:-' + (i * 0.7) + 's"><i style="height:' + o[1] + 'px"></i>' + ball(o[2], o[3]) + '</span>';
    }
    return h;
  }

  var css = document.createElement('style');
  css.textContent =
    '.hh-orn{position:absolute;left:0;right:0;top:100%;height:0;pointer-events:none}'
    + '.hh-orn span{position:absolute;top:0;display:flex;flex-direction:column;align-items:center;'
    + 'transform-origin:50% 0;animation:hhsway 4s ease-in-out infinite alternate;'
    + 'filter:drop-shadow(0 5px 5px rgba(0,0,0,.5))}'
    + '.hh-orn i{display:block;width:1px;background:linear-gradient(#B08456,#E9CF8E)}'
    + '.hh-orn svg{display:block;margin-top:-1px}'
    + '.hh-orn .p{display:none}'
    + '@keyframes hhsway{from{transform:rotate(-2.6deg)}to{transform:rotate(2.6deg)}}'
    + '.hh-bar.hh-promo{padding-bottom:22px}'
    + '@media (min-width:700px){.hh-bar.hh-promo{font-size:12px;padding:11px 14px 24px}}'
    + '.hh-lights{position:absolute;left:0;right:0;bottom:0;height:18px;pointer-events:none;'
    + 'clip-path:inset(-12px 0 -12px 0);background:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 '
    + 'width=%2732%27 height=%2718%27%3E%3Cpath d=%27M0 2Q16 9 32 2%27 fill=%27none%27 stroke=%27%237A5C36%27 stroke-width=%271%27/%3E%3C/svg%3E") repeat-x}'
    + '.hh-lights b{position:absolute;top:8px;width:6px;height:8px;border-radius:50% 50% 50% 50%/40% 40% 60% 60%;'
    + 'animation:hhtw 3s ease-in-out infinite}'
    + '.hh-lights b:before{content:"";position:absolute;left:1px;top:-3px;width:4px;height:3px;background:#1a120a;border-radius:1px}'
    + '@keyframes hhtw{0%,100%{opacity:1}50%{opacity:.4}}'
    + '@media (prefers-reduced-motion:reduce){.hh-lights b{animation:none}}'
    + '@media (max-width:699px){.hh-orn .w{display:none}.hh-orn .p{display:flex}}'
    + '@media (prefers-reduced-motion:reduce){.hh-orn span{animation:none}}';
  document.head.appendChild(css);

  /* 2026-11-13 (Jeff): a string of Christmas lights along the bottom of the bar.
     They sit INSIDE the bar (it gets 13px taller) so nothing reaches the Cart button. */
  var LIGHTS = ['#ff5a3c', '#ffc04d', '#fff3d1', '#58c96b'];
  var count = Math.min(120, Math.ceil(Math.max(screen.width || 0, window.innerWidth || 0, 1200) / 32) + 1);
  var lh = '';
  for (var k = 0; k < count; k++) {
    var col = LIGHTS[k % LIGHTS.length];
    lh += '<b style="left:' + (k * 32 + 13) + 'px;background:radial-gradient(circle at 40% 30%,#fff,' + col
      + ' 55%);box-shadow:0 0 7px 2px ' + col + ';animation-duration:' + (2.2 + (k % 5) * 0.35)
      + 's;animation-delay:-' + ((k * 0.53) % 3).toFixed(2) + 's"></b>';
  }
  var lights = document.createElement('div');
  lights.className = 'hh-lights';
  lights.setAttribute('aria-hidden', 'true');
  lights.innerHTML = lh;
  bar.appendChild(lights);

  var box = document.createElement('div');
  box.className = 'hh-orn';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = row(WIDE, 'w') + row(PHONE, 'p');
  bar.appendChild(box);
})();
