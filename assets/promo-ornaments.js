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
    + '@media (min-width:700px){.hh-bar.hh-promo{font-size:12px;padding:11px 14px}}'
    + '@media (max-width:699px){.hh-orn .w{display:none}.hh-orn .p{display:flex}}'
    + '@media (prefers-reduced-motion:reduce){.hh-orn span{animation:none}}';
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.className = 'hh-orn';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = row(WIDE, 'w') + row(PHONE, 'p');
  bar.appendChild(box);
})();
