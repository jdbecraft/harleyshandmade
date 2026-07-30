/* Harley's Handmade — the contact form.

   One job beyond posting the form: MAKE SURE IT NEVER SILENTLY VANISHES.

   The Web3Forms access key belongs to Harley and doesn't exist yet. FCR shipped
   with a form whose action just loaded a thank-you page and sent nothing, and
   the QA gate caught it — a form that pretends to send is the most expensive
   defect a lead-gen page can carry, because the business never learns it lost
   the customer.

   So: if the key is still the placeholder, the button stops being a form submit
   and becomes a pre-filled email to Harley with everything the customer typed.
   Swapping the real key in upgrades it silently — no other change needed. */
(function () {
  var form = document.getElementById('cform');
  if (!form) return;

  var PLACEHOLDER = 'REPLACE-WITH-HARLEYS-WEB3FORMS-KEY';
  var key = (form.querySelector('input[name=access_key]') || {}).value;
  var wired = key && key !== PLACEHOLDER;

  /* ------------------------------------------------------------------------
     HAVING A KEY IS NOT THE SAME AS BEING ABLE TO SEND A FILE.

     Web3Forms puts file uploads behind its PRO plan — $13/mo billed yearly,
     $158/yr, verified against their own pricing table 2026-07-30. Harley's
     account is the free tier: 250 submissions a month, no attachments. That
     ceiling is far above his real volume (5-10 orders/month), so free is the
     right plan; the attachment is the one thing it costs us.

     Jeff's call, 2026-07-30: not worth $158/yr against a $50/mo retainer for a
     sketch pad. So the drawing goes by the download-and-attach route instead.

     Why this is its own flag rather than folded into `wired`: the two facts are
     genuinely independent, and conflating them is what broke this earlier today
     — the moment the key went in, the form started trying to POST the PNG to a
     plan that will not take it, while the pad told the customer their drawing
     was on its way. Whether that ends in an error or a silently dropped file, it
     is the exact defect this file exists to prevent.

     TO TURN IT ON: upgrade the Web3Forms account, set this to true, done.
     ------------------------------------------------------------------------ */
  var FILE_UPLOADS_ENABLED = false;

  var btn = document.getElementById('csend');
  var sent = document.getElementById('sent');

  /* Tell the pad which promise it is allowed to make. */
  if (window.hhSketch && window.hhSketch.setDelivery) {
    window.hhSketch.setDelivery(wired && FILE_UPLOADS_ENABLED ? 'attach' : 'download');
  }

  function fields() {
    var out = [];
    ['Name', 'Phone', 'Email', 'What they want', 'Details', 'Deadline'].forEach(function (n) {
      var el = form.querySelector('[name="' + n + '"]');
      if (el && el.value.trim()) out.push(n + ': ' + el.value.trim());
    });
    return out.join('\n\n');
  }

  form.addEventListener('submit', function (e) {
    var sk = window.hhSketch;
    var hasDrawing = !!(sk && sk.hasInk());

    /* Post through Web3Forms ONLY when it can carry everything the customer
       gave us. Words alone: fine on any plan. Words plus a drawing on the free
       plan: the words would arrive and the picture would not, which is a worse
       outcome than the extra step below, because nobody would ever know. */
    var useForm = wired && !(hasDrawing && !FILE_UPLOADS_ENABLED);

    if (useForm) {
      /* Push the PNG into the file input FIRST, then let the form go — Web3Forms
         takes it as multipart, so Harley gets it as an attachment and the
         customer does nothing. toBlob is async, hence the re-submit.
         Dormant until FILE_UPLOADS_ENABLED; kept whole so the upgrade is a flag. */
      if (hasDrawing && !form.dataset.sketchReady) {
        e.preventDefault();
        sk.attach(function () {
          form.dataset.sketchReady = '1';
          form.submit();
        });
        return;
      }
      if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
      return;
    }

    /* Either no key, or a drawing the plan cannot carry. Fall back to a
       pre-filled email — and a mailto cannot carry an attachment, no matter how
       it's dressed up. So: download the drawing and say so plainly, in the
       message and on the page. */
    e.preventDefault();
    if (!form.reportValidity()) return;
    var extra = '';
    if (hasDrawing) {
      sk.download();
      extra = '\n\n[ I drew a sketch on your website. The file "sketch-for-harley.png" '
            + 'just downloaded to my computer and I am attaching it to this email. ]';
    }
    var body = encodeURIComponent(
      fields() + extra + '\n\n—\nSent from the contact form on harleyshandmade.com');
    window.location.href = 'mailto:harley@harleyshandmadeky.com'
      + '?subject=' + encodeURIComponent('Inquiry from your website')
      + '&body=' + body;
    if (sent) {
      sent.style.display = 'block';
      if (hasDrawing) {
        var note = document.createElement('p');
        note.style.cssText = 'margin-top:10px;font-size:15px;line-height:1.6';
        note.innerHTML = '<b>Your drawing downloaded as sketch-for-harley.png</b> — '
                       + 'attach it to the email that just opened and I get both.';
        sent.appendChild(note);
      }
    }
    if (btn) btn.textContent = 'Opening your email…';
  });

  /* The "Sending…" state used to live here as a SECOND submit listener that ran
     whenever a key existed. That is now wrong and would have been a real bug: on
     a free plan with a drawing we take the mailto route, and this listener would
     have fired anyway — disabling the button and overwriting "Opening your
     email…" with "Sending…", telling the customer the opposite of what happened.
     It moved into the useForm branch above, where it can only run on the path it
     actually describes. */

  /* ------------------------------------------------------------------------
     THE ORDER HANDOFF — the receiving end of the cart's "Send this order".

     The cart writes the itemised order to hh_order_msg and navigates here with
     ?order=1. Without this block that order is silently discarded and the
     customer lands on an empty form — the exact defect the top of this file is
     about, reintroduced by the cart. Caught before it shipped, by checking
     whether the destination actually read what the sender wrote.
     ------------------------------------------------------------------------ */
  var params = new URLSearchParams(location.search);
  if (params.get('order')) {
    var msg = null;
    try { msg = localStorage.getItem('hh_order_msg'); } catch (e) {}
    var details = document.getElementById('cdetails');
    if (msg && details) {
      /* Never clobber something the customer has already typed. */
      details.value = details.value.trim() ? msg + '\n\n' + details.value : msg;

      /* Point the select at the shop-order option. Matched on VALUE, not on the
         wording — the first attempt used a regex against the option text and it
         matched "Engraving on something" because of the word "something", i.e.
         it silently mislabelled every order as an engraving enquiry. A value is
         a contract; option text is copy and will get rewritten. */
      var sel = document.getElementById('cwhat');
      if (sel) {
        var opt = sel.querySelector('option[value="shop-order"]');
        if (opt) sel.value = 'shop-order';
      }

      /* Say plainly that the order came through, so it isn't a mystery why the
         box is full of text. Styled inline: this appears on one page, once. */
      var note = document.createElement('p');
      note.setAttribute('role', 'status');
      note.style.cssText = 'margin:0 0 16px;padding:13px 16px;border:1px solid rgba(74,46,29,.3);' +
        'background:rgba(176,132,86,.16);font-size:15.5px;line-height:1.6;border-radius:3px';
      note.innerHTML = "<b>Your order came through.</b> It's written out below — add anything else you want me " +
        "to know, put your name and number in, and send it. I'll come back with the total including shipping.";
      form.parentNode.insertBefore(note, form);

      /* Deliberately NOT cleared: if they navigate away and come back, losing
         the order would be worse than prefilling it twice. The next order
         overwrites it. */
      details.focus();
      details.setSelectionRange(details.value.length, details.value.length);
    }
  }
})();
