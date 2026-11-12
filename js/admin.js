/* KP Pudding – admin panel.
   Content lives in data/site.json inside the GitHub repository that serves the site.
   The admin signs in with their own GitHub fine-grained token (Contents: read & write);
   saving commits the JSON (and any uploaded images) through the GitHub REST API.
   Nothing secret is stored in this file. */
(function () {
  'use strict';

  var API = 'https://api.github.com';
  var DATA_PATH = 'data/site.json';
  var STORE = 'kp-admin-session';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var cfg = null;          // { token, owner, repo, branch }
  var state = { data: null, sha: null, snapshot: '', uploads: {} };
  var uploadedPreview = {}; // repo path -> local blob URL (the live copy appears after GitHub Pages rebuilds)

  /* ---------------- helpers ---------------- */
  var toastTimer;
  function toast(msg, kind) {
    var t = $('#atoast');
    t.textContent = msg;
    t.className = 'atoast is-show' + (kind ? ' is-' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'atoast'; }, kind === 'err' ? 6000 : 3500);
  }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) n.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function b64ToUtf8(b64) {
    var bin = atob(b64.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function bytesToB64(bytes) {
    var bin = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  function utf8ToB64(str) { return bytesToB64(new TextEncoder().encode(str)); }
  function blobToB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = function () { rej(new Error('Could not read the image')); };
      r.readAsDataURL(blob);
    });
  }
  function serialise(d) { return JSON.stringify(d, null, 2) + '\n'; }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'image'; }
  function previewSrc(path) {
    if (path && path.indexOf('pending:') === 0 && state.uploads[path]) return state.uploads[path].url;
    return uploadedPreview[path] || path;
  }

  /* ---------------- GitHub API ---------------- */
  function gh(path, opts) {
    opts = opts || {};
    var headers = { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + cfg.token, 'X-GitHub-Api-Version': '2022-11-28' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, { method: opts.method || 'GET', headers: headers, body: opts.body, cache: 'no-store' }).then(function (res) {
      if (res.ok) return res.status === 204 ? null : res.json();
      return res.json().catch(function () { return {}; }).then(function (j) {
        var e = new Error(j.message || res.statusText || 'Request failed'); e.status = res.status; throw e;
      });
    });
  }
  function repoPath(p) { return '/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo) + (p || ''); }
  function contentsUrl(path) { return repoPath('/contents/' + path.split('/').map(encodeURIComponent).join('/')); }
  function explain(err) {
    if (!err || !err.status) return 'Network error – check your internet connection and try again.';
    if (err.status === 401) return 'Token එක වැරදියි හෝ expire වෙලා. අලුත් token එකක් හදලා login වෙන්න.';
    if (err.status === 403) return 'Token එකට අවසර මදි. Repository permissions → Contents → “Read and write” දෙන්න. (' + err.message + ')';
    if (err.status === 404) return 'Repository / branch / file හොයාගන්න බැහැ. Owner, repository සහ branch නම් හරිද බලන්න, සහ token එකට මේ repository එක තෝරලා තියෙනවාද බලන්න.';
    if (err.status === 409 || err.status === 422) return 'වෙනත් තැනකින් content එක වෙනස් වෙලා. Page එක reload කරලා ආයෙ try කරන්න. (' + err.message + ')';
    return 'GitHub error ' + err.status + ': ' + err.message;
  }

  /* ---------------- session ---------------- */
  function saveSession(remember) {
    var s = JSON.stringify(cfg);
    try {
      sessionStorage.setItem(STORE, s);
      if (remember) localStorage.setItem(STORE, s); else localStorage.removeItem(STORE);
    } catch (e) { /* storage blocked – session only lives in memory */ }
  }
  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(STORE) || localStorage.getItem(STORE) || 'null'); } catch (e) { return null; }
  }
  function clearSession() { try { sessionStorage.removeItem(STORE); localStorage.removeItem(STORE); } catch (e) { /* ignore */ } }

  /* ---------------- login ---------------- */
  var loginForm = $('#login-form');
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var token = $('#token').value.trim();
    var err = $('#login-err');
    err.hidden = true;
    if (!token) { err.textContent = 'GitHub token එක paste කරන්න.'; err.hidden = false; $('#token').focus(); return; }
    cfg = { token: token, owner: $('#owner').value.trim(), repo: $('#repo').value.trim(), branch: $('#branch').value.trim() || 'gh-pages' };
    var btn = $('#login-btn'); btn.disabled = true; btn.textContent = 'Checking…';
    connect().then(function () {
      saveSession($('#remember').checked);
      $('#token').value = '';
    }).catch(function (e2) {
      cfg = null;
      err.textContent = explain(e2); err.hidden = false;
    }).then(function () { btn.disabled = false; btn.textContent = 'Log in'; });
  });

  function connect() {
    return gh(repoPath()).then(function () {
      return gh(contentsUrl(DATA_PATH) + '?ref=' + encodeURIComponent(cfg.branch));
    }).then(function (file) {
      state.sha = file.sha;
      state.data = JSON.parse(b64ToUtf8(file.content));
      startDashboard();
    }, function (e) {
      if (e.status !== 404) throw e;
      // Branch exists but no data file yet – start from the bundled copy and create it on publish.
      return gh(repoPath('/branches/' + encodeURIComponent(cfg.branch))).then(function () {
        return fetch('data/site.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
      }).then(function (d) { state.sha = null; state.data = d; startDashboard(); });
    });
  }

  $('#logout').addEventListener('click', function () {
    if (isDirty() && !confirm('Publish නොකළ වෙනස්කම් නැති වෙනවා. Log out කරන්නද?')) return;
    clearSession(); location.reload();
  });

  /* ---------------- dashboard ---------------- */
  function normalise(d) {
    d = d && typeof d === 'object' ? d : {};
    d.version = 1;
    d.contact = d.contact || {};
    if (!Array.isArray(d.contact.areas)) d.contact.areas = ['Gampaha', 'Colombo', 'Nearby Areas'];
    d.event = d.event || {};
    if (!Array.isArray(d.products)) d.products = [];
    d.products.forEach(function (p) {
      if (p.available === undefined) p.available = true;
      if (p.visible === undefined) p.visible = true;
      if (p.featured === undefined) p.featured = false;
      if (p.price === undefined || p.price === '') p.price = null;
    });
    return d;
  }
  function startDashboard() {
    state.data = normalise(state.data);
    state.snapshot = serialise(cleanForSave(state.data));
    $('#login').hidden = true;
    $('#dash').hidden = false;
    $('#logout').hidden = false;
    $('#repo-info').textContent = cfg.owner + '/' + cfg.repo + ' · branch ' + cfg.branch;
    $('#live-link').href = 'https://' + cfg.owner.toLowerCase() + '.github.io/' + cfg.repo + '/';
    renderProducts(); fillEvent(); fillContact(); updateDirty();
  }

  /* tabs */
  $$('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      $$('.tab').forEach(function (x) { var on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); $('#' + x.getAttribute('aria-controls')).hidden = !on; });
    });
  });

  /* ----- products ----- */
  function renderProducts() {
    var list = $('#product-list');
    list.innerHTML = '';
    var prods = state.data.products;
    if (!prods.length) { list.appendChild(el('div', { class: 'acard muted', text: 'Products නැහැ. “+ Add product” click කරලා එකක් එකතු කරන්න.' })); return; }
    prods.forEach(function (p, i) { list.appendChild(productCard(p, i, prods.length)); });
  }
  function input(label, value, opts, onChange) {
    opts = opts || {};
    var field = opts.textarea ? el('textarea', { rows: 3, maxlength: opts.max || 400 }) : el('input', { type: opts.type || 'text', maxlength: opts.max || 80, min: opts.min, step: opts.step, placeholder: opts.placeholder || '', inputmode: opts.inputmode });
    field.value = value == null ? '' : value;
    field.addEventListener('input', function () { onChange(field.value, field); updateDirty(); });
    return el('label', { class: 'field' + (opts.full ? ' full' : '') }, [label, field]);
  }
  function productCard(p, i, n) {
    var img = el('img', { src: previewSrc(p.img) || 'assets/img/pudding-hero.webp', alt: '' });
    var file = el('input', { type: 'file', accept: 'image/*', 'aria-label': 'Change image for ' + (p.name || 'product') });
    file.addEventListener('change', function () {
      if (!file.files[0]) return;
      stageImage(file.files[0], p.name || 'product').then(function (key) { p.img = key; img.src = previewSrc(key); updateDirty(); })
        .catch(function (e) { toast(e.message, 'err'); }).then(function () { file.value = ''; });
    });
    var head = el('div', { class: 'pitem__img' }, [img, el('label', { class: 'abtn abtn--ghost file' }, ['Change image', file])]);

    var fields = el('div', { class: 'pitem__fields' }, [
      input('Name (English) *', p.name, { max: 40, placeholder: 'Pudding Cup' }, function (v, f) { p.name = v; f.classList.toggle('is-invalid', !v.trim()); }),
      input('Name (Sinhala)', p.si, { max: 40, placeholder: 'පුඩිං කප්' }, function (v) { p.si = v; }),
      input('Price (Rs.) – empty = ask on WhatsApp', p.price, { type: 'number', min: 0, step: 'any', inputmode: 'decimal', placeholder: 'e.g. 150' }, function (v, f) {
        if (v === '') { p.price = null; f.classList.remove('is-invalid'); return; }
        var num = Number(v); var ok = isFinite(num) && num > 0; f.classList.toggle('is-invalid', !ok); p.price = ok ? num : p.price;
      }),
      input('Unit (e.g. cup, pack)', p.unit, { max: 15, placeholder: 'cup' }, function (v) { p.unit = v; }),
      input('Button label', p.button, { max: 24, placeholder: 'View Products', full: true }, function (v) { p.button = v; }),
      input('Description', p.desc, { textarea: true, max: 400, full: true }, function (v) { p.desc = v; })
    ]);
    function flag(label, key, onToggle) {
      var c = el('input', { type: 'checkbox' }); c.checked = !!p[key];
      c.addEventListener('change', function () { p[key] = c.checked; if (onToggle) onToggle(c.checked); updateDirty(); });
      return el('label', null, [c, label]);
    }
    var card;
    fields.appendChild(el('div', { class: 'pitem__flags' }, [
      flag('In stock (order කරන්න පුළුවන්)', 'available'),
      flag('Show on website', 'visible', function (on) { card.classList.toggle('is-hidden-product', !on); }),
      flag('Featured (hero price sticker)', 'featured', function (on) {
        if (on) { state.data.products.forEach(function (o) { if (o !== p) o.featured = false; }); renderProducts(); }
      })
    ]));
    fields.appendChild(el('div', { class: 'pitem__actions' }, [
      el('span', { class: 'spacer' }, p._new ? [el('span', { class: 'badge badge--new', text: 'New' })] : []),
      el('button', { class: 'abtn abtn--ghost abtn--icon', type: 'button', 'aria-label': 'Move up', disabled: i === 0, onclick: function () { move(i, -1); } }, ['↑']),
      el('button', { class: 'abtn abtn--ghost abtn--icon', type: 'button', 'aria-label': 'Move down', disabled: i === n - 1, onclick: function () { move(i, 1); } }, ['↓']),
      el('button', { class: 'abtn abtn--danger', type: 'button', onclick: function () {
        if (!confirm('“' + (p.name || 'this product') + '” delete කරන්නද?')) return;
        state.data.products.splice(i, 1); renderProducts(); updateDirty();
      } }, ['Delete'])
    ]));
    card = el('article', { class: 'pitem' + (p.visible ? '' : ' is-hidden-product') }, [head, fields]);
    return card;
  }
  function move(i, d) {
    var a = state.data.products, j = i + d;
    if (j < 0 || j >= a.length) return;
    var t = a[i]; a[i] = a[j]; a[j] = t;
    renderProducts(); updateDirty();
  }
  $('#add-product').addEventListener('click', function () {
    var id = 'p-' + Date.now().toString(36);
    state.data.products.push({ id: id, name: '', si: '', price: null, unit: '', img: 'assets/img/pudding-hero.webp', desc: '', button: 'View', available: true, visible: true, featured: false, _new: true });
    renderProducts(); updateDirty();
    var cards = $$('.pitem'); var last = cards[cards.length - 1];
    last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('input', last.querySelector('.pitem__fields')).focus();
  });

  /* ----- images: resize in the browser, upload on publish ----- */
  function stageImage(file, name) {
    if (!/^image\//.test(file.type)) return Promise.reject(new Error('Image file එකක් තෝරන්න (JPG, PNG, WebP).'));
    if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error('Image එක 15MB ට වඩා ලොකුයි.'));
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var max = 1000, sc = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
        var w = Math.round(im.naturalWidth * sc), h = Math.round(im.naturalHeight * sc);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (blob) {
          function done(b, ext) {
            if (!b) return rej(new Error('Image එක process කරන්න බැරි වුණා.'));
            if (b.size > 3 * 1024 * 1024) return rej(new Error('Image එක ගොඩක් ලොකුයි. පොඩි image එකක් තෝරන්න.'));
            var key = 'pending:' + slug(name) + '-' + Date.now().toString(36) + '.' + ext;
            state.uploads[key] = { blob: b, url: URL.createObjectURL(b), name: key.slice(8) };
            res(key);
          }
          if (blob && blob.type === 'image/webp') done(blob, 'webp');
          else c.toBlob(function (png) { done(png, 'png'); }, 'image/png');
        }, 'image/webp', 0.86);
      };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('මේ image එක open කරන්න බැහැ.')); };
      im.src = url;
    });
  }

  /* ----- event ----- */
  var HOURS = [];
  for (var h = 0; h <= 24; h++) HOURS.push(h);
  function hourLabel(x) { x = x % 24; var ap = x < 12 ? 'AM' : 'PM'; var y = x % 12 || 12; return y + ' ' + ap; }
  ['#ev-openHour', '#ev-closeHour'].forEach(function (s) {
    $(s).innerHTML = HOURS.map(function (x) { return '<option value="' + x + '">' + (x === 24 ? '12 AM (midnight)' : hourLabel(x)) + '</option>'; }).join('');
  });
  var EV_TEXT = ['line1', 'line2', 'citySi', 'cityEn', 'month', 'days', 'startDate', 'endDate'];
  function fillEvent() {
    var e = state.data.event;
    $('#ev-enabled').checked = e.enabled !== false;
    EV_TEXT.forEach(function (k) { $('#ev-' + k).value = e[k] || ''; });
    $('#ev-openHour').value = String(e.openHour != null ? e.openHour : 13);
    $('#ev-closeHour').value = String(e.closeHour != null ? e.closeHour : 20);
    $('#ev-poster-img').src = previewSrc(e.poster) || 'assets/img/gampaha-poster.webp';
  }
  EV_TEXT.forEach(function (k) { $('#ev-' + k).addEventListener('input', function () { state.data.event[k] = this.value; this.classList.remove('is-invalid'); updateDirty(); }); });
  $('#ev-enabled').addEventListener('change', function () { state.data.event.enabled = this.checked; updateDirty(); });
  ['openHour', 'closeHour'].forEach(function (k) { $('#ev-' + k).addEventListener('change', function () { state.data.event[k] = Number(this.value); this.classList.remove('is-invalid'); updateDirty(); }); });
  $('#ev-poster-file').addEventListener('change', function () {
    var f = this.files[0], inp = this; if (!f) return;
    stageImage(f, 'poster-' + (state.data.event.cityEn || 'event')).then(function (key) {
      state.data.event.poster = key; $('#ev-poster-img').src = previewSrc(key); updateDirty();
    }).catch(function (e) { toast(e.message, 'err'); }).then(function () { inp.value = ''; });
  });

  /* ----- contact ----- */
  function fillContact() {
    var c = state.data.contact;
    $('#ct-phone').value = c.phoneDisplay || '';
    $('#ct-wa').value = c.whatsapp || '';
    $('#ct-tiktok').value = c.tiktok || '';
    $('#ct-areas').value = (c.areas || []).join(', ');
  }
  $('#ct-phone').addEventListener('input', function () { state.data.contact.phoneDisplay = this.value; this.classList.remove('is-invalid'); updateDirty(); });
  $('#ct-wa').addEventListener('input', function () { state.data.contact.whatsapp = this.value.replace(/\D/g, ''); this.classList.remove('is-invalid'); updateDirty(); });
  $('#ct-tiktok').addEventListener('input', function () { state.data.contact.tiktok = this.value.replace(/^@/, '').trim(); this.classList.remove('is-invalid'); updateDirty(); });
  $('#ct-areas').addEventListener('input', function () {
    state.data.contact.areas = this.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    this.classList.remove('is-invalid'); updateDirty();
  });

  /* ---------------- dirty state + publish ---------------- */
  function cleanForSave(d) {
    var c = JSON.parse(JSON.stringify(d));
    c.products.forEach(function (p) {
      delete p._new;
      ['name', 'si', 'unit', 'button', 'desc'].forEach(function (k) { p[k] = typeof p[k] === 'string' ? p[k].trim() : ''; });
      if (!p.button) p.button = 'View';
      p.price = (p.price === null || p.price === '' || !isFinite(Number(p.price)) || Number(p.price) <= 0) ? null : Number(p.price);
    });
    ['line1', 'line2', 'citySi', 'cityEn', 'month', 'days'].forEach(function (k) { c.event[k] = (c.event[k] || '').trim(); });
    c.contact.phoneDisplay = (c.contact.phoneDisplay || '').trim();
    return c;
  }
  function isDirty() { return !!state.data && serialise(cleanForSave(state.data)) !== state.snapshot; }
  function updateDirty() {
    var d = isDirty();
    $('#pubbar').hidden = !d;
    $('#pub-msg').textContent = d ? 'Publish නොකළ වෙනස්කම් තියෙනවා' : '';
  }
  window.addEventListener('beforeunload', function (e) { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  $('#discard').addEventListener('click', function () {
    if (!confirm('සියලු වෙනස්කම් අත්හරින්නද?')) return;
    state.data = normalise(JSON.parse(state.snapshot)); state.uploads = {};
    renderProducts(); fillEvent(); fillContact(); updateDirty();
    toast('Changes discarded.');
  });

  function validate(d) {
    var errs = [];
    function bad(sel, tab) { var x = $(sel); if (x) x.classList.add('is-invalid'); if (tab) $('#t-' + tab).click(); }
    d.products.forEach(function (p, i) {
      if (!p.name) errs.push('Product #' + (i + 1) + ': name is required.');
      if (!/^[a-z0-9-]{1,40}$/.test(p.id)) errs.push('Product #' + (i + 1) + ': invalid id.');
    });
    if (d.products.length && errs.length) { $$('.pitem__fields .field:first-child input').forEach(function (f) { f.classList.toggle('is-invalid', !f.value.trim()); }); $('#t-products').click(); }
    var e = d.event;
    if (e.enabled !== false) {
      if (!e.line1 || !e.line2) { errs.push('Event headline lines are required.'); bad(!e.line1 ? '#ev-line1' : '#ev-line2', 'event'); }
      if (!e.citySi || !e.cityEn) { errs.push('Event city (Sinhala and English) is required.'); bad(!e.citySi ? '#ev-citySi' : '#ev-cityEn', 'event'); }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(e.endDate || '')) { errs.push('Event start and end dates are required.'); bad('#ev-startDate', 'event'); }
      else if (e.endDate < e.startDate) { errs.push('Event end date must be on or after the start date.'); bad('#ev-endDate', 'event'); }
      if (!(Number(e.closeHour) > Number(e.openHour))) { errs.push('Closing time must be after opening time.'); bad('#ev-closeHour', 'event'); }
    }
    var c = d.contact;
    if (!/^\d{9,15}$/.test(c.whatsapp || '')) { errs.push('WhatsApp number must be 9–15 digits with country code (e.g. 94769090909).'); bad('#ct-wa', 'contact'); }
    if (!c.phoneDisplay) { errs.push('Phone number is required.'); bad('#ct-phone', 'contact'); }
    if (c.tiktok && !/^[A-Za-z0-9._]{1,40}$/.test(c.tiktok)) { errs.push('TikTok username can only contain letters, numbers, dots and underscores.'); bad('#ct-tiktok', 'contact'); }
    if (!c.areas || !c.areas.length) { errs.push('Add at least one delivery area.'); bad('#ct-areas', 'contact'); }
    return errs;
  }

  function uploadPending(d) {
    var keys = [];
    d.products.forEach(function (p) { if (p.img && p.img.indexOf('pending:') === 0) keys.push(p.img); });
    if (d.event.poster && d.event.poster.indexOf('pending:') === 0) keys.push(d.event.poster);
    keys = keys.filter(function (k, i) { return keys.indexOf(k) === i; });
    var chain = Promise.resolve();
    keys.forEach(function (key, idx) {
      chain = chain.then(function () {
        var up = state.uploads[key];
        if (!up) throw new Error('Image upload data is missing – choose the image again.');
        $('#pub-msg').textContent = 'Uploading image ' + (idx + 1) + ' of ' + keys.length + '…';
        return blobToB64(up.blob).then(function (b64) {
          var path = 'assets/uploads/' + up.name;
          return gh(contentsUrl(path), { method: 'PUT', body: JSON.stringify({ message: 'Upload image ' + up.name + ' (admin panel)', content: b64, branch: cfg.branch }) }).then(function () {
            // Point everything that used the pending key at the real file (also in the live editor state)
            [d, state.data].forEach(function (obj) {
              obj.products.forEach(function (p) { if (p.img === key) p.img = path; });
              if (obj.event.poster === key) obj.event.poster = path;
            });
            uploadedPreview[path] = up.url;
            delete state.uploads[key];
          });
        });
      });
    });
    return chain;
  }

  $('#publish').addEventListener('click', function () {
    var btn = this, d = cleanForSave(state.data);
    var errs = validate(d);
    if (errs.length) { toast(errs[0], 'err'); return; }
    btn.disabled = true; $('#discard').disabled = true; btn.textContent = 'Publishing…';
    uploadPending(d).then(function () {
      $('#pub-msg').textContent = 'Saving content…';
      var body = { message: 'Update website content (admin panel)', content: utf8ToB64(serialise(d)), branch: cfg.branch };
      if (state.sha) body.sha = state.sha;
      return gh(contentsUrl(DATA_PATH), { method: 'PUT', body: JSON.stringify(body) });
    }).then(function (res) {
      state.sha = res.content.sha;
      state.data = normalise(d);
      state.snapshot = serialise(cleanForSave(state.data));
      renderProducts(); fillEvent(); fillContact(); updateDirty();
      toast('✓ Published! Live website එක විනාඩි 1–2 කින් update වෙනවා.', 'ok');
    }).catch(function (e) {
      toast(explain(e), 'err');
      $('#pub-msg').textContent = 'Publish failed – try again.';
    }).then(function () { btn.disabled = false; $('#discard').disabled = false; btn.textContent = 'Publish changes'; });
  });

  /* ---------------- auto-login with a saved session ---------------- */
  var saved = loadSession();
  if (saved && saved.token) {
    cfg = saved;
    $('#owner').value = cfg.owner; $('#repo').value = cfg.repo; $('#branch').value = cfg.branch;
    connect().catch(function (e) {
      cfg = null; clearSession();
      var err = $('#login-err'); err.textContent = explain(e); err.hidden = false;
    });
  }
})();
