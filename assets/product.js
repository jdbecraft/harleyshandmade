/* Harley's Handmade — product page behaviour.
   Three jobs: swap the gallery, keep a running total honest, and put the
   customer's choices in the cart alongside the item so Harley reads exactly
   what they asked for.

   The honesty rule this file exists to enforce: anything Harley has not put a
   number on is NEVER auto-priced. Engraving, a stain he doesn't stock, a size
   outside the range — those add a line that says "quoted", not a number the
   customer would be charged. He confirms before anybody pays. */
(function () {
  var CART = 'hh_cart_v1';

  /* ---------------- gallery ---------------- */
  var main = document.getElementById('galMain');
  var shotno = document.getElementById('shotno');
  var imgNote = document.getElementById('imgNote');
  var thumbs = [].slice.call(document.querySelectorAll('.strip button'));
  thumbs.forEach(function (b, i) {
    b.addEventListener('click', function () {
      main.src = b.dataset.full;
      main.alt = b.dataset.alt || main.alt;
      /* stand shots carry data-note — the "Stand not included" badge shows
         only while one of them is up (Jeff, 2026-08-29) */
      if (imgNote) imgNote.hidden = !b.dataset.note;
      thumbs.forEach(function (o) { o.setAttribute('aria-current', String(o === b)); });
      if (shotno) shotno.textContent = 'Shot ' + String(i + 1).padStart(2, '0') + ' of ' +
        String(thumbs.length).padStart(2, '0');
    });
  });

  /* ---------------- price ---------------- */
  var form = document.getElementById('sheet');
  if (!form) return;
  var BASE = parseFloat(form.dataset.base);
  var NAME = form.dataset.name;

  var elBase = document.getElementById('sumBase');
  var elAdds = document.getElementById('sumAdds');
  var elAddRow = document.getElementById('sumAddRow');
  var elTotal = document.getElementById('sumTotal');
  var elHead  = document.getElementById('sumHead');
  var elQuote = document.getElementById('sumQuote');

  function money(n) { return '$' + n.toFixed(2).replace(/\.00$/, ''); }

  /* The frame is the one item Harley priced as a range: $145 at 11x14 up to
     $205 at 35x23. Everything between is interpolated on AREA, which is what
     actually drives his material and his hours - a linear read on the long
     edge alone would undercharge the wide ones. */
  var FRAME = { minA: 11 * 14, maxA: 35 * 23, minP: 145, maxP: 205 };
  function framePrice(w, h) {
    var a = w * h;
    var t = (a - FRAME.minA) / (FRAME.maxA - FRAME.minA);
    t = Math.max(0, Math.min(1, t));
    return Math.round((FRAME.minP + t * (FRAME.maxP - FRAME.minP)) / 5) * 5;
  }

  function state() {
    var adds = 0, quoted = [], chosen = {};
    // priced choices carry data-add
    form.querySelectorAll('input[type=radio]:checked, input[type=checkbox]:checked').forEach(function (i) {
      if (i.dataset.add) adds += parseFloat(i.dataset.add);
      if (i.dataset.quote) quoted.push(i.dataset.quote);
      if (i.dataset.label) chosen[i.name] = i.dataset.label;
    });
    // free-text fields that Harley has to price by eye
    form.querySelectorAll('[data-quote-if-filled]').forEach(function (f) {
      if (f.value.trim()) {
        quoted.push(f.dataset.quoteIfFilled);
        chosen[f.name] = f.value.trim();
      }
    });
    // free-text fields that DO carry a set price once filled (engraving, once
    // Harley gives a number — see ENGRAVING_ADD in build-products.py)
    form.querySelectorAll('[data-add-if-filled]').forEach(function (f) {
      if (f.value.trim()) {
        adds += parseFloat(f.dataset.addIfFilled);
        chosen[f.name] = f.value.trim();
      }
    });
    form.querySelectorAll('select[data-size]').forEach(function (s) {
      chosen[s.name] = s.options[s.selectedIndex].text;
    });
    return { adds: adds, quoted: quoted, chosen: chosen };
  }

  function base() {
    var sizeSel = form.querySelector('select[data-size]');
    if (!sizeSel) return BASE;
    var d = sizeSel.value.split('x');
    return framePrice(parseFloat(d[0]), parseFloat(d[1]));
  }

  function paint() {
    var s = state(), b = base();
    elBase.textContent = money(b);
    /* Clear the text as well as hiding the row. Hiding alone left the last
       figure sitting in the DOM, so going back to the free finish showed
       "+ $25" against a total that no longer included it (Jeff, 2026-07-31).
       The total was always right — the line lied about it, which on this site
       is the worse half: every product page exists to promise that the number
       you see is the number you pay. */
    if (s.adds > 0) { elAddRow.hidden = false; elAdds.textContent = '+ ' + money(s.adds); }
    else { elAddRow.hidden = true; elAdds.textContent = ''; }
    elTotal.textContent = money(b + s.adds);
    if (elHead) elHead.textContent = money(b + s.adds);
    if (s.quoted.length) {
      elQuote.hidden = false;
      elQuote.textContent = s.quoted.join(' · ') + ' — I price this when I see it, and I tell you before you pay.';
    } else { elQuote.hidden = true; }
  }

  form.addEventListener('change', paint);
  form.addEventListener('input', paint);
  paint();

  /* ---------------- how many ----------------
     The sheet prices ONE piece; the quantity multiplies in the cart, where
     the line shows "$X each" and the running math. Different options make
     different cart lines, so two swings in two stains sit side by side. */
  var qEl = document.getElementById('pqty'),
      qMinus = document.getElementById('pqm'),
      qPlus = document.getElementById('pqp'),
      addBtn = document.getElementById('padd');
  function qty() {
    if (!qEl) return 1;
    var n = parseInt(qEl.value, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > 25) n = 25;
    return n;
  }
  function qtyPaint() {
    if (!qEl) return;
    var n = qty();
    qEl.value = n;
    if (qMinus) qMinus.disabled = n <= 1;
    if (qPlus) qPlus.disabled = n >= 25;
    if (addBtn && !addBtn.dataset.busy)
      addBtn.textContent = n > 1 ? 'Add ' + n + ' to cart' : 'Add to cart';
  }
  if (qMinus) qMinus.addEventListener('click', function () { qEl.value = qty() - 1; qtyPaint(); });
  if (qPlus)  qPlus.addEventListener('click', function () { qEl.value = qty() + 1; qtyPaint(); });
  if (qEl) {
    qEl.addEventListener('input', qtyPaint);
    qEl.addEventListener('blur', qtyPaint);
  }
  qtyPaint();

  /* ---------------- add to cart ---------------- */
  document.getElementById('padd').addEventListener('click', function () {
    var s = state(), b = base();
    var bits = [];
    for (var k in s.chosen) bits.push(k + ': ' + s.chosen[k]);
    var key = NAME + (bits.length ? ' (' + bits.join(', ') + ')' : '');

    /* One writer, not two. assets/cart.js owns the cart — the button, the panel,
       the total, the quoted extras and the checkout state — so the product pages
       and the shop page behave identically. This used to write localStorage
       directly and then hunt for a #cartN that did not exist on these pages,
       which is why adding to the cart here gave the customer no feedback at all
       (Jeff caught it, 2026-07-29). */
    var n = qty();
    HHCart.addKey(key, b + s.adds, s.quoted, n);

    var btn = this;
    btn.dataset.busy = '1';
    btn.textContent = n > 1 ? 'Added ' + n + ' to your cart' : 'Added to your cart';
    btn.disabled = true;
    setTimeout(function () {
      delete btn.dataset.busy;
      btn.disabled = false;
      qtyPaint();
    }, 1400);
  });
})();
