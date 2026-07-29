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
  var btn = document.getElementById('csend');
  var sent = document.getElementById('sent');

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

    if (wired) {
      /* Real key. Push the PNG into the file input FIRST, then let the form go —
         Web3Forms takes it as multipart, so Harley gets it as an attachment and
         the customer does nothing. toBlob is async, hence the re-submit. */
      if (hasDrawing && !form.dataset.sketchReady) {
        e.preventDefault();
        sk.attach(function () {
          form.dataset.sketchReady = '1';
          form.submit();
        });
      }
      return;
    }

    /* No key yet, so this falls back to a pre-filled email — and a mailto cannot
       carry an attachment, no matter how it's dressed up. So: download the
       drawing and say so plainly, in the message and on the page. */
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
    window.location.href = 'mailto:hlritchie26@gmail.com'
      + '?subject=' + encodeURIComponent('Inquiry from your website')
      + '&body=' + body;
    if (sent) {
      sent.style.display = 'block';
      if (hasDrawing) {
        var note = document.createElement('p');
        note.style.cssText = 'margin-top:10px;font-size:15px;line-height:1.6';
        note.innerHTML = '<b>Your drawing downloaded as sketch-for-harley.png</b> — '
                       + 'attach it to the email that just opened and he gets both.';
        sent.appendChild(note);
      }
    }
    if (btn) btn.textContent = 'Opening your email…';
  });

  /* Web3Forms redirects on success by default; if it ever posts back in place,
     show the confirmation rather than leaving the customer wondering. */
  if (wired) {
    form.addEventListener('submit', function () {
      if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
    });
  }
})();
