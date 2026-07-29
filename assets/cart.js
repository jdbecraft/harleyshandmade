/* ============================================================================
   Harley's Handmade — the cart, everywhere.

   Jeff, 2026-07-29: "the cart needs to be visible on every shop page even the
   individual product pages."

   He was right, and the gap was worse than a missing panel: the product pages
   had an "Add to cart" button and NO cart button and NO count at all. Someone
   could configure a swing, add it, and get no signal that a cart existed or how
   to reach it. product.js guarded its count lookup with `if (n)`, so it failed
   silently instead of erroring — which is why nobody noticed.

   This file is the whole cart, in one place: styles, the button, the panel, the
   logic. Any page that includes it gets a working cart. It injects its own
   button only if the page doesn't already have one, so shop.html keeps its
   existing header button and the product pages get one for free.

   TO SWITCH ON CARD PAYMENT: put Harley's Square checkout link in
   SQUARE_CHECKOUT_URL below. The pending notice is replaced by a real Pay
   button. That is the only edit. (Board order O-030.)
   ========================================================================== */
var SQUARE_CHECKOUT_URL = "";   // <-- Harley's Square checkout link

window.HHCart = (function () {
  var KEY = 'hh_cart_v1', cart = {};
  try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cart = {}; }

  /* ---------------- styles ---------------- */
  var CSS = `
.cartbtn{position:fixed;top:14px;right:clamp(14px,3vw,28px);z-index:60;display:flex;align-items:center;gap:9px;
  border:1px solid rgba(246,236,216,.45);background:rgba(22,14,6,.6);color:#F6ECD8;padding:9px 15px;
  font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.cartbtn .n{background:#b08456;color:#2d1f12;min-width:19px;height:19px;display:grid;place-items:center}
/* Thumb-sized on a phone. shop.html carried this as a media query and it was
   lost when the button moved into this file — measured at 39px against the 44px
   minimum, which is a real miss on the one control that opens the cart. */
@media(max-width:820px){.cartbtn{min-height:46px;padding:12px 15px}}
.cart-scrim{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:80;opacity:0;pointer-events:none;transition:opacity .22s ease}
.cart-scrim[data-open]{opacity:1;pointer-events:auto}
.cart-panel{position:fixed;z-index:81;right:0;top:0;bottom:0;width:min(430px,100%);background:#f1e6cc;color:#2d1f12;
  display:flex;flex-direction:column;transform:translateX(102%);transition:transform .26s cubic-bezier(.22,.61,.36,1);
  box-shadow:-18px 0 48px rgba(0,0,0,.4);font-family:Lora,Georgia,serif}
.cart-panel[data-open]{transform:none}
@media (prefers-reduced-motion:reduce){.cart-panel,.cart-scrim{transition:none}}
.cart-hd{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.1rem 1.25rem;border-bottom:1px solid rgba(45,31,18,.16)}
.cart-hd h2{margin:0;font-size:1.1rem;letter-spacing:.02em}
.cart-x{background:none;border:0;font-size:1.7rem;line-height:1;cursor:pointer;padding:.1rem .5rem;color:inherit;min-height:44px;min-width:44px}
.cart-body{flex:1;overflow-y:auto;padding:1.25rem;-webkit-overflow-scrolling:touch}
.cart-li{padding:.85rem 0;border-bottom:1px solid rgba(45,31,18,.12)}
.cart-li b{display:block;font-size:.98rem}
.cart-li .o{font-size:.82rem;opacity:.75;margin-top:.2rem;line-height:1.5}
.cart-li .r{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;margin-top:.4rem;font-variant-numeric:tabular-nums}
.cart-li .q{font-size:.82rem;opacity:.7}
.cart-rm{background:none;border:0;font-size:.78rem;text-decoration:underline;cursor:pointer;padding:.4rem 0;color:inherit;opacity:.65;min-height:32px}
.cart-q{font-size:.82rem;background:rgba(176,132,86,.16);border-left:3px solid #b08456;padding:.6rem .75rem;margin-top:.55rem;border-radius:3px;line-height:1.5}
.cart-ft{border-top:1px solid rgba(45,31,18,.16);padding:1.15rem 1.25rem;display:grid;gap:.8rem}
.cart-tot{display:flex;justify-content:space-between;font-weight:700;font-size:1.12rem;font-variant-numeric:tabular-nums}
.cart-note{font-size:.8rem;opacity:.75;line-height:1.55}
.cart-cta{display:block;text-align:center;padding:.9rem 1rem;border-radius:4px;background:#2d1f12;color:#f1e6cc;
  text-decoration:none;font-weight:700;letter-spacing:.02em;border:0;cursor:pointer;width:100%;font-size:.95rem;min-height:46px;font-family:inherit}
.cart-cta.alt{background:none;border:1px solid rgba(45,31,18,.4);color:inherit;font-weight:600}
.cart-pending{font-size:.84rem;background:rgba(45,31,18,.07);border:1px dashed rgba(45,31,18,.32);padding:.75rem .85rem;border-radius:4px;line-height:1.55}
.cart-empty{text-align:center;opacity:.7;padding:2.5rem 1rem;font-size:.95rem;line-height:1.6}
`;
  var st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  /* ---------------- button (only if the page hasn't got one) ---------------- */
  var btn = document.getElementById('cartBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'cartbtn';
    btn.id = 'cartBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open your order');
    btn.innerHTML = 'Cart <span class="n" id="cartN">0</span>';
    document.body.appendChild(btn);
  }

  /* ---------------- panel ---------------- */
  var scrim = document.createElement('div');
  scrim.className = 'cart-scrim'; scrim.id = 'cartScrim'; scrim.hidden = true;
  var panel = document.createElement('aside');
  panel.className = 'cart-panel'; panel.id = 'cartPanel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'cartTitle');
  panel.innerHTML =
    '<div class="cart-hd"><h2 id="cartTitle">Your order</h2>'
  + '<button class="cart-x" type="button" id="cartClose" aria-label="Close your order">&times;</button></div>'
  + '<div class="cart-body" id="cartBody"></div><div class="cart-ft" id="cartFoot"></div>';
  document.body.appendChild(scrim);
  document.body.appendChild(panel);

  var body = panel.querySelector('#cartBody'),
      foot = panel.querySelector('#cartFoot'),
      opener = null;

  function count() { var t = 0; for (var k in cart) t += cart[k].q; return t; }
  function total() { var t = 0; for (var k in cart) t += cart[k].p * cart[k].q; return t; }
  function save()  { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  function money(v){ return '$' + v.toFixed(2).replace(/\.00$/, ''); }
  function refresh(){ var n = document.getElementById('cartN'); if (n) n.textContent = count(); }

  /* A product-page key reads  Mini Porch Swing (Stain: Cherry, Engraving: ...)
     Split it so the options get their own line instead of one long title. */
  function split(k) {
    var m = k.match(/^(.*?)\s*\((.*)\)$/);
    return m ? { name: m[1], opts: m[2] } : { name: k, opts: '' };
  }

  function render() {
    var keys = Object.keys(cart);
    if (!keys.length) {
      body.innerHTML = '<p class="cart-empty">Nothing in here yet.<br>Pick something out and it\'ll show up.</p>';
      foot.innerHTML = '<a class="cart-cta alt" href="shop">Go to the shop</a>';
      return;
    }
    var anyQuoted = false;
    body.innerHTML = keys.map(function (k) {
      var it = cart[k], s = split(k);
      /* These were being dropped, which contradicted the rule the product page
         exists to enforce: anything Harley hasn't priced is never a number. */
      var q = (it.quoted && it.quoted.length) ? (anyQuoted = true,
        '<div class="cart-q"><b>' + it.quoted.join(' · ') + '</b> — Harley prices this once he\'s seen it, '
        + 'and tells you the number before you pay. It\'s not in the total below.</div>') : '';
      return '<div class="cart-li"><b>' + s.name + '</b>'
        + (s.opts ? '<div class="o">' + s.opts + '</div>' : '')
        + '<div class="r"><span class="q">Qty ' + it.q + ' · ' + money(it.p) + ' each</span>'
        + '<span>' + money(it.p * it.q) + '</span></div>'
        + q
        + '<div class="r"><button class="cart-rm" type="button" data-rm="' + encodeURIComponent(k) + '">Remove</button><span></span></div>'
        + '</div>';
    }).join('');

    var pay = SQUARE_CHECKOUT_URL
      ? '<a class="cart-cta" href="' + SQUARE_CHECKOUT_URL + '" rel="noopener">Pay with card</a>'
      : '<div class="cart-pending"><b>Card checkout isn\'t switched on yet.</b> I\'m still getting that set up, '
        + 'so for now send me the order and I\'ll reply with the total including shipping, and how to pay. '
        + 'Usually the same day.</div>'
        + '<button class="cart-cta" type="button" id="cartSend">Send this order to Harley</button>';

    foot.innerHTML =
        '<div class="cart-tot"><span>' + (anyQuoted ? 'Total so far' : 'Total') + '</span><span>' + money(total()) + '</span></div>'
      + '<p class="cart-note">Shipping is a flat rate and gets added on top&nbsp;— free if you collect in Owingsville.'
      + (anyQuoted ? ' The quoted items above aren\'t counted in this figure yet.' : '') + '</p>'
      + pay
      + '<a class="cart-cta alt" href="shop">Keep looking</a>';
  }

  /* Hands the order to the contact page as written text. No payment, no card,
     no pretending — but the customer leaves having actually ordered. */
  function sendOrder() {
    var lines = ['Order from the website:', ''];
    for (var k in cart) {
      var s = split(k), it = cart[k];
      lines.push('• ' + it.q + ' x ' + s.name + '  —  ' + money(it.p * it.q));
      if (s.opts) lines.push('    ' + s.opts);
      if (it.quoted && it.quoted.length) lines.push('    (to be quoted: ' + it.quoted.join(', ') + ')');
    }
    lines.push('', 'Total so far: ' + money(total()) + ' plus shipping.');
    try { localStorage.setItem('hh_order_msg', lines.join('\n')); } catch (e) {}
    location.href = 'contact?order=1';
  }

  function open() {
    opener = document.activeElement;
    panel.hidden = scrim.hidden = false;
    render();
    /* Force a reflow, THEN set the attribute. The obvious version used
       requestAnimationFrame and the panel never opened at all — it sat 438px
       off-screen because the attribute was never set. A cart that silently
       stays off-screen is the worst failure available on a shop page. */
    void panel.offsetHeight;
    panel.dataset.open = scrim.dataset.open = '1';
    panel.querySelector('#cartClose').focus();
    document.documentElement.style.overflow = 'hidden';
  }
  function close() {
    delete panel.dataset.open; delete scrim.dataset.open;
    document.documentElement.style.overflow = '';
    setTimeout(function () {
      panel.hidden = scrim.hidden = true;
      if (opener && opener.focus) opener.focus();
    }, 240);
  }

  btn.addEventListener('click', open);
  panel.querySelector('#cartClose').addEventListener('click', close);
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.dataset.open) close();
  });
  foot.addEventListener('click', function (e) { if (e.target.id === 'cartSend') sendOrder(); });
  body.addEventListener('click', function (e) {
    var t = e.target.getAttribute && e.target.getAttribute('data-rm');
    if (!t) return;
    delete cart[decodeURIComponent(t)];
    save(); refresh(); render();
  });

  refresh();

  return {
    /* Both callers go through here so there is one writer, not two.
       shop.html passes a plain product name; product.js passes a key that
       already encodes the chosen options, plus any quoted extras. */
    addKey: function (key, price, quoted) {
      if (!cart[key]) cart[key] = { p: price, q: 0, quoted: quoted || [] };
      else if (quoted && quoted.length) cart[key].quoted = quoted;
      cart[key].q++;
      save(); refresh();
    },
    refresh: refresh,
    open: open,
    count: count
  };
})();
