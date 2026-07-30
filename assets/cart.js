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

   CARD PAYMENT (2026-07-30, supersedes the SQUARE_CHECKOUT_URL plan): the
   Pay button POSTs the cart to /api/checkout — a Cloudflare Pages Function
   (functions/api/checkout.js) that asks Square for a hosted checkout with
   the EXACT total and itemised lines, then sends the customer there. No
   typed amounts, no card data on this site, and the function re-validates
   every price server-side. Pickup orders pay by card today; shipping goes
   by "send the order" until Harley confirms the flat rate. If the API call
   fails for any reason the cart says so and falls back to send-the-order —
   checkout degrades, never dies. (Board order O-030's go-live, upgraded.)
   ========================================================================== */
var CHECKOUT_API = '/api/checkout';

/* Harley's Web3Forms access key — the SAME key that's in contact.html's hidden
   input and in custom.html's gallery enquiry form.
   ✅ LIVE 2026-07-30 (Harley's own key, supplied by Jeff). Public by design —
   Web3Forms keys live in client-side code and their own dashboard says so.
   ⚠️ THREE PLACES hold this key: here, contact.html, custom.html.
   The mailto fallback below stays in place for good: if a key is ever removed or
   revoked, every capture hands the message to the customer's own mail client
   rather than pretending to have sent something. That fallback is not a nicety:
   FCR once shipped a form that loaded a thank-you page and sent nothing, and the
   business never learned it was losing customers. */
var WEB3FORMS_KEY = "1d4b19cb-b82d-4b63-9479-25526d9be5f9";
var WEB3FORMS_PLACEHOLDER = "REPLACE-WITH-HARLEYS-WEB3FORMS-KEY";

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
.cart-ful{display:grid;gap:.4rem}
.cart-ful label{display:flex;gap:.55rem;align-items:flex-start;font-size:.86rem;line-height:1.5;cursor:pointer;padding:.15rem 0}
.cart-ful input{margin-top:.18rem;width:18px;height:18px;accent-color:#2d1f12;flex:none}
@media(max-width:820px){.cart-ful label{min-height:44px}}
.cart-payerr{font-size:.84rem;background:rgba(160,40,30,.08);border-left:3px solid #a0281e;padding:.6rem .75rem;margin:0;border-radius:3px;line-height:1.5}
.cart-empty{text-align:center;opacity:.7;padding:2.5rem 1rem;font-size:.95rem;line-height:1.6}
/* "hold my cart" capture — asked at the moment of hesitation, not at the door */
.cart-hold{border-top:1px solid rgba(45,31,18,.16);padding-top:.85rem;margin-top:.2rem}
.cart-hold p{font-size:.84rem;line-height:1.55;margin:0 0 .55rem;opacity:.85}
.cart-hold .row{display:flex;gap:.5rem}
.cart-hold input{flex:1;min-width:0;font-family:inherit;font-size:16px;padding:.7rem .75rem;
  border:1px solid rgba(45,31,18,.35);background:#fff;color:inherit;border-radius:3px;min-height:46px}
.cart-hold input:focus{outline:2px solid #b08456;outline-offset:-1px}
.cart-hold button{flex:none;font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.1em;
  text-transform:uppercase;padding:.7rem .9rem;border:1px solid #2d1f12;background:#2d1f12;color:#f1e6cc;
  cursor:pointer;border-radius:3px;min-height:46px}
.cart-hold button:disabled{opacity:.55;cursor:default}
.cart-hold .msg{font-size:.82rem;margin-top:.5rem;line-height:1.5}
/* the returning-visitor nudge — a line, not a popup */
.cart-nudge{position:fixed;top:64px;right:clamp(14px,3vw,28px);z-index:59;max-width:min(310px,calc(100vw - 28px));
  background:#f1e6cc;color:#2d1f12;border:1px solid rgba(45,31,18,.3);border-left:3px solid #b08456;
  padding:.7rem .8rem;font-family:Lora,Georgia,serif;font-size:14px;line-height:1.5;
  box-shadow:0 10px 26px rgba(0,0,0,.28);display:flex;gap:.6rem;align-items:flex-start;border-radius:3px}
.cart-nudge button.go{background:none;border:0;padding:0;font:inherit;text-decoration:underline;cursor:pointer;color:inherit;text-align:left}
/* 44px, not 32 — the rest of this site holds to 44 and a dismiss control the
   customer has to hit twice is worse than no dismiss control. */
.cart-nudge button.x{background:none;border:0;font-size:1.15rem;line-height:1;cursor:pointer;color:inherit;
  opacity:.6;padding:0;min-width:44px;min-height:44px;display:grid;place-items:center;margin:-6px -6px 0 0}
@media(max-width:820px){.cart-nudge{top:auto;bottom:66px;left:clamp(14px,3vw,28px);right:clamp(14px,3vw,28px);max-width:none}}
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
      opener = null,
      /* pickup pays by card now; ship goes by reply until the flat rate is
         confirmed by Harley — the chooser below routes between the two. */
      ful = 'pickup',
      payMsg = '';

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

    var pay;
    if (anyQuoted) {
      /* The card path never touches a total that says "so far". */
      pay = '<div class="cart-pending"><b>Part of this order needs my eyes before it has a price.</b> '
        + 'Send it over and I\'ll reply with the full number and how to pay. Usually the same day.</div>'
        + '<button class="cart-cta" type="button" id="cartSend">Send this order to Harley</button>';
    } else {
      pay = '<div class="cart-ful" role="radiogroup" aria-label="Pickup or shipping">'
        + '<label><input type="radio" name="hhFul" value="pickup"' + (ful === 'pickup' ? ' checked' : '')
        + '> Free pickup &mdash; Owingsville, Winchester, Mt.&nbsp;Sterling or Morehead</label>'
        + '<label><input type="radio" name="hhFul" value="ship"' + (ful === 'ship' ? ' checked' : '')
        + '> Ship it &mdash; I confirm the shipping cost before you pay anything</label>'
        + '</div>'
        + (payMsg ? '<p class="cart-payerr" role="alert">' + payMsg + '</p>' : '')
        + (ful === 'pickup'
          ? '<button class="cart-cta" type="button" id="cartPay">Pay with card</button>'
            + '<button class="cart-cta alt" type="button" id="cartSend">Or send me the order instead</button>'
          : '<div class="cart-pending">Shipping\'s a flat rate I confirm up front &mdash; send me the order and '
            + 'I\'ll reply with the total including shipping, and how to pay. Usually the same day.</div>'
            + '<button class="cart-cta" type="button" id="cartSend">Send this order to Harley</button>');
    }

    foot.innerHTML =
        '<div class="cart-tot"><span>' + (anyQuoted ? 'Total so far' : 'Total') + '</span><span>' + money(total()) + '</span></div>'
      + (anyQuoted
          ? '<p class="cart-note">Shipping is a flat rate and gets added on top&nbsp;— free if you collect. '
            + 'The quoted items above aren\'t counted in this figure yet.</p>'
          : '')
      + pay
      + '<a class="cart-cta alt" href="shop">Keep looking</a>'
      + holdBlock();
    wireHold();
  }

  /* ---------------- email capture ----------------
     One helper, used by the cart's "hold my cart" and by the shop page's inline
     signup. Posts to Web3Forms so Harley gets an email per signup — and if his
     key doesn't exist yet, it opens a pre-filled mail to him instead of quietly
     losing the address. Same guard the contact form already uses. */
  var wired = WEB3FORMS_KEY && WEB3FORMS_KEY !== WEB3FORMS_PLACEHOLDER;

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }

  function captureEmail(email, subject, extra, done) {
    if (!wired) {
      /* No key: hand it to his mail client, fully written, and say so. A mailto
         is not elegant but it cannot silently drop an address. */
      var b = encodeURIComponent((extra ? extra + '\n\n' : '') + 'My email: ' + email);
      window.location.href = 'mailto:harley@harleyshandmadeky.com?subject='
        + encodeURIComponent(subject) + '&body=' + b;
      done(true, 'unwired');
      return;
    }
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: subject,
        from_name: "Harley's Handmade website",
        Email: email,
        Details: extra || ''
      })
    }).then(function (r) { return r.json(); })
      .then(function (j) { done(!!j.success, j.message || ''); })
      .catch(function () { done(false, 'network'); });
  }

  function holdBlock() {
    return '<div class="cart-hold">'
      + '<p><b>Not ready yet?</b> Leave me your email and I\'ll hold this and answer any questions. '
      + 'No spam, and I won\'t chase you.</p>'
      + '<div class="row"><input type="email" id="cartEmail" placeholder="you@example.com" '
      + 'autocomplete="email" inputmode="email" aria-label="Your email address">'
      + '<button type="button" id="cartHold">Hold it</button></div>'
      + '<p class="msg" id="cartHoldMsg" hidden></p></div>';
  }

  function wireHold() {
    var inp = panel.querySelector('#cartEmail'),
        b   = panel.querySelector('#cartHold'),
        msg = panel.querySelector('#cartHoldMsg');
    if (!b) return;
    b.addEventListener('click', function () {
      var v = (inp.value || '').trim();
      msg.hidden = false;
      if (!validEmail(v)) { msg.textContent = 'That email doesn\'t look right — mind checking it?'; inp.focus(); return; }
      b.disabled = true; msg.textContent = 'Sending…';
      /* Send the cart with it, so Harley knows what to hold. */
      var lines = [];
      for (var k in cart) {
        var s = split(k), it = cart[k];
        lines.push(it.q + ' x ' + s.name + (s.opts ? ' (' + s.opts + ')' : ''));
      }
      captureEmail(v, 'Someone asked me to hold their cart',
        'Hold this cart:\n' + lines.join('\n') + '\n\nTotal so far: ' + money(total()),
        function (ok, why) {
          b.disabled = false;
          msg.textContent = ok
            ? (why === 'unwired'
                ? 'Opening your email app so you can send it to me — hit send and I\'ve got it.'
                : 'Got it. I\'ll hold this and be in touch — thanks.')
            : 'That didn\'t go through. Call or text me on (859) 749-2814 and I\'ll sort it.';
          if (ok && why !== 'unwired') inp.value = '';
        });
    });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); b.click(); } });
  }

  /* ---------------- the returning-visitor nudge ----------------
     The only thing here that reaches the customers email never can: they left
     items and came back, and we already know because the cart persists. A line,
     dismissible, once per session. Not a popup and never on a fresh cart. */
  function nudge() {
    if (!count()) return;
    try { if (sessionStorage.getItem('hh_nudged')) return; } catch (e) {}
    var n = count();
    var el = document.createElement('div');
    el.className = 'cart-nudge';
    el.setAttribute('role', 'status');
    el.innerHTML = '<button class="go" type="button">You\'ve still got '
      + n + (n === 1 ? ' thing' : ' things') + ' in your cart — want to pick up where you left off?</button>'
      + '<button class="x" type="button" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(el);
    function bye() { el.remove(); try { sessionStorage.setItem('hh_nudged', '1'); } catch (e) {} }
    el.querySelector('.go').addEventListener('click', function () { bye(); open(); });
    el.querySelector('.x').addEventListener('click', bye);
  }

  /* The card path. POST the cart to the checkout function; it re-validates
     every price, asks Square for a hosted checkout with the exact itemised
     total, and we send the customer there. Any failure becomes a plain
     sentence and the send-the-order path — the customer is never stranded. */
  function payNow() {
    var b = foot.querySelector('#cartPay');
    if (b) { b.disabled = true; b.textContent = 'Opening secure payment…'; }
    var lines = [];
    for (var k in cart) lines.push({ key: k, p: cart[k].p, q: cart[k].q, quoted: cart[k].quoted || [] });
    fetch(CHECKOUT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: lines, fulfillment: 'pickup' })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (res.ok && res.j && res.j.url) { location.href = res.j.url; return; }
      payMsg = ((res.j && res.j.error) || 'Card payment hiccuped just now.')
        + ' You can send me the order instead and I\'ll reply with how to pay.';
      render();
    }).catch(function () {
      payMsg = 'Card payment couldn\'t reach Square just now. Send me the order instead '
        + 'and I\'ll reply with how to pay — usually the same day.';
      render();
    });
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
  foot.addEventListener('click', function (e) {
    if (e.target.id === 'cartSend') sendOrder();
    if (e.target.id === 'cartPay') payNow();
  });
  foot.addEventListener('change', function (e) {
    if (e.target.name === 'hhFul') { ful = e.target.value; payMsg = ''; render(); }
  });
  body.addEventListener('click', function (e) {
    var t = e.target.getAttribute && e.target.getAttribute('data-rm');
    if (!t) return;
    delete cart[decodeURIComponent(t)];
    save(); refresh(); render();
  });

  refresh();
  nudge();

  return {
    /* Exposed so the shop page's inline signup uses the same submit path and the
       same never-silently-fail guard, instead of a second copy of it. */
    captureEmail: captureEmail,
    validEmail: validEmail,
    wired: wired,
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
