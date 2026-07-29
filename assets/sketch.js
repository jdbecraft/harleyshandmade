/* Harley's Handmade — the Sketch Pad, rebuilt for v5.

   Jeff, 2026-07-29: "for a previous version we had a sketch pad kind of built
   into the website i would like that next to the contact form and if there is
   anything in that sketch pad it gets sent along with the contact form to
   harleys email."

   HOW THE DRAWING ACTUALLY REACHES HIM — the part that matters:

   1. The canvas is exported to a PNG and pushed into a real <input type="file">
      using DataTransfer, so the form posts it as multipart/form-data. Web3Forms
      takes file uploads that way, so once Harley's key is in, the sketch rides
      along with the message as an attachment. Nothing for the customer to do.

   2. Until the key exists the form falls back to a pre-filled email, and a
      mailto: cannot carry an attachment — no amount of cleverness changes that.
      So in that case the PNG is DOWNLOADED to their machine and the email body
      says, in plain words, to attach the file that just landed in Downloads.
      Not elegant. It is honest, and the drawing gets there.

   3. Either way the words always get through on their own. If the picture fails
      for any reason, Harley still receives the message.

   The pad only does anything if it has ink on it — an untouched canvas is never
   attached, never mentioned, and never downloaded. */
(function () {
  var pad = document.getElementById('padCanvas');
  if (!pad) return;

  var ctx = pad.getContext('2d', { willReadFrequently: true });
  var TOOLS = {
    pencil: { c: '#2D1F12', w: 4,  mode: 'source-over' },
    marker: { c: '#8B6342', w: 11, mode: 'source-over' },
    eraser: { c: '#000',    w: 34, mode: 'destination-out' }
  };
  var tool = 'pencil', drawing = false, last = null, undo = [];

  /* ---------- the paper ---------- */
  function paper() {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#FBF6EA';
    ctx.fillRect(0, 0, pad.width, pad.height);
    /* faint grid so a sketch with dimensions on it reads as a working drawing
       rather than a doodle — same instinct as the blueprint plates */
    ctx.strokeStyle = 'rgba(74,46,29,.09)';
    ctx.lineWidth = 1;
    for (var x = 40; x < pad.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, pad.height); ctx.stroke();
    }
    for (var y = 40; y < pad.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(pad.width, y); ctx.stroke();
    }
    ctx.restore();
  }

  /* the grid is background, so "has the customer drawn anything" is tracked
     as a fact rather than guessed from pixels */
  var inked = false;

  paper();

  function setTool(t) {
    tool = t;
    ['pencil', 'marker', 'eraser'].forEach(function (k) {
      var b = document.getElementById('tool-' + k);
      if (b) b.setAttribute('aria-pressed', String(k === t));
    });
  }
  document.querySelectorAll('[data-tool]').forEach(function (b) {
    b.addEventListener('click', function () { setTool(b.dataset.tool); });
  });

  function pos(e) {
    var r = pad.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (pad.width / r.width),
             y: (e.clientY - r.top) * (pad.height / r.height) };
  }
  function apply() {
    var t = TOOLS[tool];
    ctx.globalCompositeOperation = t.mode;
    ctx.strokeStyle = t.c; ctx.fillStyle = t.c;
    ctx.lineWidth = t.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }
  function push() {
    try { undo.push(pad.toDataURL()); if (undo.length > 20) undo.shift(); } catch (e) {}
  }

  pad.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    try { pad.setPointerCapture(e.pointerId); } catch (err) {}
    push(); drawing = true; last = pos(e);
    apply(); ctx.beginPath();
    ctx.arc(last.x, last.y, TOOLS[tool].w / 2, 0, Math.PI * 2); ctx.fill();
    if (tool !== 'eraser') inked = true;
    mark();
  });
  pad.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = pos(e);
    apply(); ctx.beginPath();
    ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    pad.addEventListener(ev, function () { drawing = false; last = null; });
  });
  /* a finger dragging on the pad should draw, not scroll the page */
  pad.style.touchAction = 'none';

  document.getElementById('padUndo').addEventListener('click', function () {
    var s = undo.pop(); if (!s) return;
    var img = new Image();
    img.onload = function () {
      ctx.save(); ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, pad.width, pad.height); ctx.drawImage(img, 0, 0); ctx.restore();
      mark();
    };
    img.src = s;
  });
  document.getElementById('padClear').addEventListener('click', function () {
    push(); paper(); inked = false; mark();
  });

  /* ---------- state shown to the customer ---------- */
  var badge = document.getElementById('padState');
  function mark() {
    if (!badge) return;
    badge.textContent = inked ? 'This drawing will be sent with your message'
                              : 'Nothing drawn yet — the pad is optional';
    badge.className = 'padstate' + (inked ? ' on' : '');
  }
  mark();

  /* ---------- attach it to the form ---------- */
  var file = document.getElementById('padFile');

  function blob(cb) {
    if (pad.toBlob) pad.toBlob(cb, 'image/png');
    else cb(null);
  }

  function attach(done) {
    if (!inked || !file) { done(false); return; }
    blob(function (b) {
      if (!b) { done(false); return; }
      try {
        var dt = new DataTransfer();
        dt.items.add(new File([b], 'sketch-for-harley.png', { type: 'image/png' }));
        file.files = dt.files;
        done(true);
      } catch (e) { done(false); }
    });
  }

  function download() {
    var a = document.createElement('a');
    a.download = 'sketch-for-harley.png';
    a.href = pad.toDataURL('image/png');
    document.body.appendChild(a); a.click(); a.remove();
  }

  var dl = document.getElementById('padDownload');
  if (dl) dl.addEventListener('click', function () {
    if (!inked) { alert("There's nothing on the pad yet — draw something first."); return; }
    download();
  });

  /* contact.js asks us for these */
  window.hhSketch = {
    hasInk: function () { return inked; },
    attach: attach,
    download: download
  };
})();
