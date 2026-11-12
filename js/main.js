/* KP Pudding – site script (data-driven: content comes from data/site.json, editable in admin.html) */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Default content (same as data/site.json; used until/if the JSON loads) ---------- */
  var DEFAULTS = {
    contact: { phoneDisplay: '076 90 90 90 9', whatsapp: '94769090909', tiktok: 'hashankp', areas: ['Gampaha', 'Colombo', 'Nearby Areas'] },
    event: {
      enabled: true, line1: 'අපි එනවා', line2: 'ගම්පහ නගරයට', citySi: 'ගම්පහ', cityEn: 'Gampaha',
      month: 'NOVEMBER', days: '10 - 15', startDate: '2026-11-10', endDate: '2026-11-15', openHour: 13, closeHour: 20,
      poster: 'assets/img/gampaha-poster.webp'
    },
    products: [
      { id: 'cups', name: 'Pudding Cup', si: 'පුඩිං කප්', price: 150, unit: 'cup', img: 'assets/img/pudding-cup.webp',
        desc: 'තනි කෙනෙකුට රස විඳින්න ගැළපෙන, KP cup එකක සකස් කළ creamy caramel pudding. ගෙදරට, office එකට, ගමනට – ඕනෑම වෙලාවක රසවත් පුඩිං එකක්!',
        button: 'View Products', available: true, visible: true, featured: true },
      { id: 'packs', name: 'Pudding Packs', si: 'පුඩිං පැක්', price: null, unit: 'pack', img: 'assets/img/pudding-packs.webp',
        desc: 'පවුලේ හැමෝටම, යාළුවන් එක්ක share කරන්න පුඩිං cups කිහිපයක් එකම පැකට්ටුවක. තෑග්ගක් විදිහටත් හොඳම තේරීමක්!',
        button: 'View Packs', available: true, visible: true, featured: false },
      { id: 'party', name: 'Party Orders', si: 'විශේෂ අවස්ථා ඇණවුම්', price: null, unit: 'order', img: 'assets/img/party-pudding.webp',
        desc: 'උපන්දින, සාද, office events සහ විශේෂ අවස්ථා සඳහා විශාල ඇණවුම්. ඔබේ දිනය සහ ප්‍රමාණය කලින් දැනුම් දෙන්න – අපි සූදානම් කරලා දෙන්නම්.',
        button: 'Order Now', available: true, visible: true, featured: false }
    ]
  };
  var ORIGINAL = { wa: '94769090909', phone: '076 90 90 90 9', tiktok: 'hashankp' };

  var DATA = clone(DEFAULTS);
  var PRODUCTS = {};   // id -> product (visible only)
  var ORDERED = [];    // visible products, in order

  /* ---------- Helpers ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeImg(src, fallback) { return (typeof src === 'string' && /^(assets\/|https:\/\/)[^"'<>\s]+$/.test(src)) ? src : fallback; }
  function money(n) { return 'Rs. ' + Number(n).toLocaleString('en-US'); }
  function hasPrice(p) { return typeof p.price === 'number' && isFinite(p.price) && p.price > 0; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function waNumber() { return DATA.contact.whatsapp; }
  function waLink(text) { return 'https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(text); }
  function clampQty(v, min) { var n = parseInt(v, 10); if (isNaN(n)) n = min; return Math.max(min, Math.min(999, n)); }
  function hourLabel(h) { h = Number(h) % 24; var ap = h < 12 ? 'AM' : 'PM'; var x = h % 12; if (x === 0) x = 12; return x + ap; }
  function titleCase(s) { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function niceRange(s) { return String(s || '').replace(/\s*-\s*/g, ' – '); }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-show'); }, 2600);
  }
  function openDialog(d) { if (!d) return; if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else d.setAttribute('open', ''); }
  function closeDialog(d) { if (!d) return; if (typeof d.close === 'function') { if (d.open) d.close(); } else d.removeAttribute('open'); }

  /* ---------- Data normalisation (never trust the JSON blindly) ---------- */
  function normalise(raw) {
    var d = clone(DEFAULTS);
    if (!raw || typeof raw !== 'object') return d;
    if (raw.contact && typeof raw.contact === 'object') {
      var c = raw.contact;
      if (typeof c.phoneDisplay === 'string' && c.phoneDisplay.trim()) d.contact.phoneDisplay = c.phoneDisplay.trim();
      if (typeof c.whatsapp === 'string' && /^\d{9,15}$/.test(c.whatsapp.trim())) d.contact.whatsapp = c.whatsapp.trim();
      if (typeof c.tiktok === 'string' && /^[A-Za-z0-9._]{1,40}$/.test(c.tiktok.trim())) d.contact.tiktok = c.tiktok.trim();
      if (Array.isArray(c.areas)) {
        var a = c.areas.filter(function (x) { return typeof x === 'string' && x.trim(); }).map(function (x) { return x.trim(); });
        if (a.length) d.contact.areas = a;
      }
    }
    if (raw.event && typeof raw.event === 'object') {
      var e = raw.event, de = d.event;
      ['line1', 'line2', 'citySi', 'cityEn', 'month', 'days'].forEach(function (k) { if (typeof e[k] === 'string') de[k] = e[k].trim(); });
      if (typeof e.enabled === 'boolean') de.enabled = e.enabled;
      ['startDate', 'endDate'].forEach(function (k) { if (typeof e[k] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e[k])) de[k] = e[k]; });
      ['openHour', 'closeHour'].forEach(function (k) { var n = Number(e[k]); if (isFinite(n) && n >= 0 && n <= 24) de[k] = Math.round(n); });
      de.poster = safeImg(e.poster, de.poster);
    }
    if (Array.isArray(raw.products)) {
      var seen = {};
      d.products = raw.products.filter(function (p) {
        return p && typeof p === 'object' && typeof p.id === 'string' && /^[a-z0-9-]{1,40}$/.test(p.id) && !seen[p.id] && (seen[p.id] = true) && typeof p.name === 'string' && p.name.trim();
      }).map(function (p) {
        var price = (p.price === null || p.price === '' || p.price === undefined) ? null : Number(p.price);
        return {
          id: p.id, name: p.name.trim(), si: typeof p.si === 'string' ? p.si.trim() : '',
          price: (price !== null && isFinite(price) && price > 0) ? Math.round(price * 100) / 100 : null,
          unit: typeof p.unit === 'string' ? p.unit.trim() : '',
          img: safeImg(p.img, 'assets/img/pudding-hero.webp'),
          desc: typeof p.desc === 'string' ? p.desc : '',
          button: (typeof p.button === 'string' && p.button.trim()) ? p.button.trim() : 'View',
          available: p.available !== false, visible: p.visible !== false, featured: p.featured === true
        };
      });
    }
    return d;
  }

  /* =========================================================
     RENDERING
     ========================================================= */
  var ICON = function (id) { return '<svg class="ic"><use href="#' + id + '"/></svg>'; };

  function priceHTML(p, cls) {
    if (hasPrice(p)) return '<p class="' + cls + '">' + money(p.price) + (p.unit ? ' <small>/ ' + esc(p.unit) + '</small>' : '') + '</p>';
    return '<p class="' + cls + ' ' + cls + '--ask">මිල WhatsApp එකෙන්</p>';
  }

  function renderProducts() {
    var grid = $('#product-grid');
    if (grid) {
      grid.innerHTML = ORDERED.map(function (p) {
        var sold = !p.available;
        return '<article class="pcard reveal' + (sold ? ' is-soldout' : '') + '" id="p-' + esc(p.id) + '" data-id="' + esc(p.id) + '">' +
          (sold ? '<span class="pcard__sold">Sold out</span>' : '') +
          '<div class="pcard__img"><img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy" /></div>' +
          '<div class="pcard__body"><h3>' + esc(p.name) + '</h3>' +
          (p.si ? '<p class="pcard__si">' + esc(p.si) + '</p>' : '') +
          priceHTML(p, 'pcard__price') +
          '<div class="pcard__actions"><button class="btn btn--maroon" type="button" data-product="' + esc(p.id) + '">' + esc(p.button) + ' ' + ICON('i-arrow') + '</button>' +
          '<button class="pcard__add" type="button" data-add="' + esc(p.id) + '" aria-label="Add ' + esc(p.name) + ' to order"' + (sold ? ' disabled' : '') + '>' + ICON('i-plus') + '</button></div>' +
          '</div></article>';
      }).join('');
    }
    var menu = $('#products-menu');
    if (menu) menu.innerHTML = ORDERED.map(function (p) {
      return '<li><a href="#p-' + esc(p.id) + '"><img src="' + esc(p.img) + '" alt="" /> <span>' + esc(p.name) + '<small>' + esc(p.si) + (hasPrice(p) ? ' · ' + money(p.price) : '') + '</small></span></a></li>';
    }).join('');
    var fp = $('#footer-products');
    if (fp) fp.innerHTML = '<h3>Products</h3>' + ORDERED.map(function (p) { return '<a href="#p-' + esc(p.id) + '">' + esc(p.name) + (hasPrice(p) ? ' – ' + money(p.price) : '') + '</a>'; }).join('');
    var rows = $('#order-rows');
    if (rows) rows.innerHTML = ORDERED.map(function (p) {
      var sold = !p.available;
      return '<div class="qrow' + (sold ? ' is-soldout' : '') + '" data-id="' + esc(p.id) + '">' +
        '<img src="' + esc(p.img) + '" alt="" />' +
        '<span class="qrow__name">' + esc(p.name) + '<small>' + esc(p.si) + '</small><span class="qrow__price">' + (sold ? 'Sold out' : (hasPrice(p) ? money(p.price) + (p.unit ? ' / ' + esc(p.unit) : '') : 'Price on WhatsApp')) + '</span></span>' +
        '<div class="qty" role="group" aria-label="' + esc(p.name) + ' quantity">' +
        '<button type="button" data-step="-1" aria-label="Decrease ' + esc(p.name) + '"' + (sold ? ' disabled' : '') + '>' + ICON('i-minus') + '</button>' +
        '<input type="number" inputmode="numeric" min="0" max="999" value="0" aria-label="' + esc(p.name) + ' quantity"' + (sold ? ' disabled' : '') + ' />' +
        '<button type="button" data-step="1" aria-label="Increase ' + esc(p.name) + '"' + (sold ? ' disabled' : '') + '>' + ICON('i-plus') + '</button></div></div>';
    }).join('');

    // Featured price burst + ticker + order tick
    var feat = ORDERED.filter(function (p) { return p.featured && hasPrice(p) && p.available; })[0];
    var burst = $('#hero-burst');
    if (burst) {
      if (feat) {
        burst.hidden = false;
        burst.setAttribute('data-product', feat.id);
        burst.setAttribute('aria-label', feat.name + ' – ' + money(feat.price));
        $('#burst-name').textContent = feat.name;
        $('#burst-price').innerHTML = '<i>Rs.</i>' + esc(Number(feat.price).toLocaleString('en-US'));
      } else burst.hidden = true;
    }
    var tick = $('#tick-price');
    if (tick) {
      if (feat) { tick.textContent = feat.name + ' එකක් ' + money(feat.price) + ' යි'; tick.parentNode.hidden = false; }
      else tick.parentNode.hidden = true;
    }
    var track = $('#ticker-track');
    if (track) {
      var items = [];
      if (feat) items.push('🍮 ' + esc(feat.name) + ' – <b>' + money(feat.price) + '</b>');
      items.push('Fresh &amp; Hygienic – නැවුම්ව නිෂ්පාදනය');
      items.push('🚚 ' + esc(DATA.contact.areas.join(' | ')) + ' Delivery');
      if (DATA.event.enabled) items.push('📍 ' + esc(DATA.event.line1 + ' ' + DATA.event.line2) + ' – ' + esc(titleCase(DATA.event.month) + ' ' + niceRange(DATA.event.days)));
      items.push('අදම ඇණවුම් කරන්න! 📲 ' + esc(DATA.contact.phoneDisplay));
      items.push('KP පුඩිං – ඔබේ රසවත් තේරීම');
      var once = items.map(function (t) { return '<span>' + t + '</span>'; }).join('');
      track.innerHTML = once + once;
    }
  }

  function renderContact() {
    var c = DATA.contact;
    var areaTxt = c.areas.join(' | ');
    $$('[data-bind="areas"]').forEach(function (el) { el.textContent = areaTxt; });
    $$('[data-bind="areas-delivery"]').forEach(function (el) { el.textContent = areaTxt + ' Delivery'; });
    var sel = $('#area-select');
    if (sel) {
      var cur = sel.value;
      sel.innerHTML = '<option value="">තෝරන්න / Select</option>' + c.areas.map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('');
      if (c.areas.indexOf(cur) !== -1) sel.value = cur;
    }
    // Replace the shipped phone / WhatsApp / TikTok values everywhere if the admin changed them
    var pairs = [];
    if (c.whatsapp !== ORIGINAL.wa) pairs.push([ORIGINAL.wa, c.whatsapp]);
    if (c.phoneDisplay !== ORIGINAL.phone) pairs.push([ORIGINAL.phone, c.phoneDisplay]);
    if (c.tiktok !== ORIGINAL.tiktok) pairs.push(['@' + ORIGINAL.tiktok, '@' + c.tiktok]);
    if (!pairs.length) return;
    function swap(str) { pairs.forEach(function (p) { str = str.split(p[0]).join(p[1]); }); return str; }
    $$('[href], [aria-label]').forEach(function (el) {
      ['href', 'aria-label'].forEach(function (a) { var v = el.getAttribute(a); if (v) { var n = swap(v); if (n !== v) el.setAttribute(a, n); } });
    });
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) { var v = node.nodeValue, n = swap(v); if (n !== v) node.nodeValue = n; }
  }

  function setFx(el, text) {
    if (!el) return;
    el.setAttribute('data-text', text);
    var g = $('.fx__g', el);
    if (g) g.textContent = text; else el.textContent = text;
  }

  function renderEvent() {
    var e = DATA.event;
    var t1 = $('.hero__t1'), t2 = $('.hero__t2');
    var timeRow = $('.hero__time'), dateRow = $('.hero__date'), pill = $('#event-status'), cd = $('#countdown'), now = $('#tour-now');
    if (!e.enabled) {
      setFx(t1, 'KP පුඩිං'); setFx(t2, 'ඔබේ රසවත් තේරීම');
      [timeRow, dateRow, pill, cd, now].forEach(function (el) { if (el) el.hidden = true; });
      return;
    }
    [timeRow, dateRow, pill, now].forEach(function (el) { if (el) el.hidden = false; });
    setFx(t1, e.line1); setFx(t2, e.line2);
    setFx($('.hero__hours'), hourLabel(e.openHour) + ' - ' + hourLabel(e.closeHour));
    var m = $('#hero-month'); if (m) m.textContent = e.month;
    setFx($('.hero__days'), e.days);
    var city = $('#tour-city'); if (city) city.innerHTML = esc(e.citySi) + ' <small>' + esc(e.cityEn) + '</small>';
    var dates = $('#tour-dates'); if (dates) dates.textContent = titleCase(e.month) + ' ' + niceRange(e.days);
    var hours = $('#tour-hours'); if (hours) hours.textContent = hourLabel(e.openHour) + ' – ' + hourLabel(e.closeHour);
    var q = $('#tour-quote'); if (q) q.textContent = '“' + e.line1 + ' ' + e.line2 + '” 🎉';
    var alt = 'KP Pudding ' + e.cityEn + ' poster – ' + titleCase(e.month) + ' ' + niceRange(e.days) + ', ' + hourLabel(e.openHour) + ' to ' + hourLabel(e.closeHour);
    ['#tour-poster', '#lightbox-img'].forEach(function (s) { var im = $(s); if (im) { if (im.getAttribute('src') !== e.poster) im.src = e.poster; im.alt = alt; } });
    var po = $('#poster-open'); if (po) po.setAttribute('aria-label', 'View ' + e.cityEn + ' poster full size');
  }

  /* =========================================================
     EVENT STATUS (Sri Lanka time, UTC+05:30)
     ========================================================= */
  var SL_OFFSET = 5.5 * 3600 * 1000;
  function slTime(y, m, d, h) { return Date.UTC(y, m - 1, d, h) - SL_OFFSET; }
  function ymd(s) { var p = s.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  var lastDigits = {};
  function renderCountdown(ms, label) {
    var cdEl = $('#countdown'); if (!cdEl) return;
    var s = Math.max(0, Math.floor(ms / 1000));
    var parts = { days: Math.floor(s / 86400), hrs: Math.floor(s % 86400 / 3600), min: Math.floor(s % 3600 / 60), sec: s % 60 };
    var html = '<span>' + esc(label) + '</span>';
    ['days', 'hrs', 'min', 'sec'].forEach(function (k) {
      if (k === 'days' && parts.days <= 0) return;
      var v = k === 'days' ? String(parts[k]) : pad(parts[k]);
      var changed = lastDigits[k] !== undefined && lastDigits[k] !== v;
      lastDigits[k] = v;
      html += '<b' + (changed && !reduceMotion ? ' class="tick"' : '') + '>' + v + '<small>' + k + '</small></b>';
    });
    cdEl.innerHTML = html;
    cdEl.hidden = false;
  }
  function setStatus(text, live) {
    var el = $('#event-status'); if (!el) return;
    $('.live-pill__text', el).textContent = text;
    el.classList.toggle('is-live', !!live);
  }
  function setChip(text, cls, live) {
    var chip = $('#tour-chip'); if (!chip) return;
    chip.textContent = text; chip.className = 'chip ' + cls + (live ? ' is-live' : '');
  }
  function updateEvent() {
    var e = DATA.event;
    if (!e.enabled) return;
    var now = Date.now(), s = ymd(e.startDate), en = ymd(e.endDate);
    var first = slTime(s.y, s.m, s.d, e.openHour), last = slTime(en.y, en.m, en.d, e.closeHour);
    var cdEl = $('#countdown');
    if (now < first) {
      setStatus('ළඟදීම! ' + e.line2 + ' – ' + titleCase(e.month) + ' ' + s.d, false);
      renderCountdown(first - now, 'ආරම්භයට:');
      setChip('Coming soon', 'chip--now', false);
      return;
    }
    if (now > last) {
      setStatus('Thank you ' + e.cityEn + '! 💛 ඊළඟ නගරය ගැන WhatsApp කරන්න', false);
      if (cdEl) cdEl.hidden = true;
      setChip('Visited', 'chip--done', false);
      return;
    }
    var sl = new Date(now + SL_OFFSET), Y = sl.getUTCFullYear(), M = sl.getUTCMonth() + 1, D = sl.getUTCDate();
    var openT = slTime(Y, M, D, e.openHour), closeT = slTime(Y, M, D, e.closeHour);
    if (now >= openT && now < closeT) {
      setStatus('🔴 LIVE NOW – අද ' + hourLabel(e.closeHour) + ' දක්වා ' + e.citySi + ' නගරයේ!', true);
      renderCountdown(closeT - now, 'අද වසා දැමීමට:');
      setChip('Live now', 'chip--now', true);
    } else if (now < openT) {
      setStatus('අද ' + hourLabel(e.openHour) + ' සිට ' + e.citySi + ' නගරයේ!', false);
      renderCountdown(openT - now, 'අද විවෘත වීමට:');
      setChip('Today ' + hourLabel(e.openHour), 'chip--now', false);
    } else {
      setStatus('හෙට ' + hourLabel(e.openHour) + ' සිට නැවතත් ' + e.citySi + ' නගරයේ!', false);
      renderCountdown(slTime(Y, M, D + 1, e.openHour) - now, 'හෙට විවෘත වීමට:');
      setChip('Tomorrow ' + hourLabel(e.openHour), 'chip--now', false);
    }
  }

  /* =========================================================
     CART (shared by drawer + order form)
     ========================================================= */
  var STORE_KEY = 'kp-pudding-cart-v2';
  var cart = {};
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object') Object.keys(saved).forEach(function (k) { cart[k] = clampQty(saved[k], 0); });
  } catch (e) { /* storage unavailable */ }
  function saveCart() { try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ } }
  function pruneCart() {
    Object.keys(cart).forEach(function (id) { if (!PRODUCTS[id] || !PRODUCTS[id].available || !cart[id]) delete cart[id]; });
    saveCart();
  }
  function qtyOf(id) { return cart[id] || 0; }
  function cartTotal() { return Object.keys(cart).reduce(function (a, id) { return a + (PRODUCTS[id] ? qtyOf(id) : 0); }, 0); }
  function cartSum() {
    var sum = 0, unpriced = false;
    Object.keys(cart).forEach(function (id) {
      var p = PRODUCTS[id]; if (!p || !qtyOf(id)) return;
      if (hasPrice(p)) sum += p.price * qtyOf(id); else unpriced = true;
    });
    return { sum: sum, unpriced: unpriced };
  }
  function totalHTML() {
    var t = cartSum();
    if (!cartTotal()) return '';
    if (t.sum > 0) return '<span>Total</span><b>' + money(t.sum) + '</b>' + (t.unpriced ? '<small>+ මිල සඳහන් නොකළ අයිතම වල මිල WhatsApp එකෙන්</small>' : '');
    return '<span>Total</span><b>WhatsApp</b><small>මිල WhatsApp එකෙන් තහවුරු කෙරේ</small>';
  }

  var countEl = $('#cart-count'), cartList = $('#cart-list');
  function renderCart(bump) {
    var total = cartTotal();
    if (countEl) {
      countEl.textContent = total;
      if (bump && !reduceMotion) {
        countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump');
        var cb = $('#cart-open'); cb.classList.remove('shake'); void cb.offsetWidth; cb.classList.add('shake');
      }
    }
    $$('.qrow').forEach(function (row) {
      var id = row.getAttribute('data-id'), inp = $('input', row);
      if (document.activeElement !== inp) inp.value = qtyOf(id);
      row.classList.toggle('is-selected', qtyOf(id) > 0);
    });
    if (total > 0) { var err = $('#items-err'); if (err) err.hidden = true; }
    var ot = $('#order-total'), dt = $('#drawer-total'), th = totalHTML();
    [ot, dt].forEach(function (el) { if (!el) return; el.innerHTML = th; el.hidden = !th; });
    if (!cartList) return;
    if (total === 0) {
      cartList.innerHTML = '<div class="cart-empty"><img src="assets/img/pudding-hero.webp" alt="" width="140" height="86" /><p>ඔබේ order එක තවම හිස්. 🍮<br />Add a pudding to start your order.</p></div>';
      return;
    }
    cartList.innerHTML = Object.keys(cart).filter(function (id) { return PRODUCTS[id] && qtyOf(id); }).map(function (id) {
      var p = PRODUCTS[id];
      return '<div class="citem" data-id="' + esc(id) + '"><img src="' + esc(p.img) + '" alt="" />' +
        '<div><b>' + esc(p.name) + '</b><small>' + esc(p.si) + '</small>' +
        '<span class="qrow__price">' + (hasPrice(p) ? money(p.price) + ' × ' + qtyOf(id) + ' = ' + money(p.price * qtyOf(id)) : 'Price on WhatsApp') + '</span></div><span></span>' +
        '<div class="citem__ctrl"><div class="qty" role="group" aria-label="' + esc(p.name) + ' quantity">' +
        '<button type="button" data-cstep="-1" aria-label="Decrease ' + esc(p.name) + '">' + ICON('i-minus') + '</button>' +
        '<input type="number" inputmode="numeric" min="0" max="999" value="' + qtyOf(id) + '" aria-label="' + esc(p.name) + ' quantity" />' +
        '<button type="button" data-cstep="1" aria-label="Increase ' + esc(p.name) + '">' + ICON('i-plus') + '</button></div>' +
        '<button type="button" class="citem__rm" data-remove aria-label="Remove ' + esc(p.name) + '">' + ICON('i-trash') + '</button></div></div>';
    }).join('');
  }
  function setQty(id, qty, bump) {
    var p = PRODUCTS[id];
    if (!p || !p.available) return;
    var q = clampQty(qty, 0);
    if (q) cart[id] = q; else delete cart[id];
    saveCart(); renderCart(bump);
  }

  /* Fly-to-cart animation */
  function flyToCart(img) {
    var cartBtn = $('#cart-open');
    if (reduceMotion || !img || !cartBtn || !img.getBoundingClientRect || typeof img.animate !== 'function') return;
    var a = img.getBoundingClientRect(), b = cartBtn.getBoundingClientRect();
    if (!a.width) return;
    var f = document.createElement('img');
    f.src = img.currentSrc || img.src; f.className = 'flyer'; f.alt = '';
    var size = Math.min(a.width, 120);
    f.style.width = size + 'px'; f.style.height = size + 'px';
    f.style.left = (a.left + a.width / 2 - size / 2) + 'px'; f.style.top = (a.top + a.height / 2 - size / 2) + 'px';
    document.body.appendChild(f);
    var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    var anim = f.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 80) + 'px) scale(.7) rotate(-20deg)', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.15) rotate(-40deg)', opacity: .4 }
    ], { duration: 800, easing: 'cubic-bezier(.45,.05,.55,.95)' });
    anim.onfinish = function () { f.remove(); };
  }

  /* Confetti (order sent) */
  function confetti() {
    if (reduceMotion) return;
    var c = document.createElement('canvas'); c.className = 'confetti';
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
    document.body.appendChild(c);
    var ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    var colors = ['#FFC72C', '#F57C21', '#C4161C', '#25D366', '#FFE36E', '#7A0C12'];
    var parts = [];
    for (var i = 0; i < 140; i++) parts.push({ x: innerWidth / 2, y: innerHeight * 0.6, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 6, r: Math.random() * 6 + 4, c: colors[i % colors.length], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4 });
    var start = performance.now();
    (function frame(t) {
      var el = t - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach(function (p) {
        p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - el / 2200);
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
      });
      if (el < 2200) requestAnimationFrame(frame); else c.remove();
    })(start);
  }

  /* =========================================================
     UI wiring (delegated, so re-rendered markup keeps working)
     ========================================================= */
  var pModal = $('#product-modal'), pmQty = $('#pm-qty'), currentP = null;
  function openProduct(id) {
    var p = PRODUCTS[id]; if (!p) return;
    currentP = id;
    $('#pm-title').textContent = p.name;
    $('#pm-si').textContent = p.si;
    $('#pm-desc').textContent = p.desc;
    var pr = $('#pm-price');
    pr.className = 'pmodal__price' + (hasPrice(p) ? '' : ' pmodal__price--ask');
    pr.innerHTML = p.available ? (hasPrice(p) ? money(p.price) + (p.unit ? ' <small>/ ' + esc(p.unit) + '</small>' : '') : 'මිල WhatsApp එකෙන් / Price on WhatsApp') : 'Sold out – දැනට නැත';
    var img = $('#pm-img'); img.src = p.img; img.alt = p.name;
    pmQty.value = 1;
    $('#pm-add').disabled = !p.available;
    $('#pm-note').textContent = hasPrice(p) ? 'Delivery විස්තර WhatsApp මඟින් තහවුරු කෙරේ.' : 'මිල සහ ලබාගත හැකි බව WhatsApp මඟින් තහවුරු කෙරේ.';
    $('#pm-wa').href = waLink('Hi KP Pudding! 🍮 I would like to know about ' + p.name + (p.si ? ' (' + p.si + ')' : '') + '.');
    openDialog(pModal);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var view = t.closest('[data-product]');
    if (view) { openProduct(view.getAttribute('data-product')); return; }
    var add = t.closest('[data-add]');
    if (add && !add.disabled) {
      var id = add.getAttribute('data-add'), p = PRODUCTS[id];
      if (!p) return;
      var card = add.closest('.pcard');
      flyToCart(card && $('.pcard__img img', card));
      setQty(id, qtyOf(id) + 1, true);
      toast('✓ ' + p.name + ' added – ' + qtyOf(id) + ' in your order');
    }
  });

  if (pmQty) {
    $('#pm-minus').addEventListener('click', function () { pmQty.value = clampQty(+pmQty.value - 1, 1); });
    $('#pm-plus').addEventListener('click', function () { pmQty.value = clampQty(+pmQty.value + 1, 1); });
    pmQty.addEventListener('blur', function () { pmQty.value = clampQty(pmQty.value, 1); });
    $('#pm-add').addEventListener('click', function () {
      if (!currentP) return;
      var q = clampQty(pmQty.value, 1);
      flyToCart($('#pm-img'));
      setQty(currentP, qtyOf(currentP) + q, true);
      closeDialog(pModal);
      toast('✓ ' + PRODUCTS[currentP].name + ' × ' + q + ' added to your order');
    });
  }

  // Order-form steppers (delegated)
  var rowsWrap = $('#order-rows');
  if (rowsWrap) {
    rowsWrap.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-step]'); if (!b) return;
      var id = b.closest('.qrow').getAttribute('data-id');
      setQty(id, qtyOf(id) + parseInt(b.getAttribute('data-step'), 10), true);
    });
    rowsWrap.addEventListener('input', function (e) {
      if (e.target.tagName !== 'INPUT' || e.target.value === '') return;
      setQty(e.target.closest('.qrow').getAttribute('data-id'), e.target.value, false);
    });
    rowsWrap.addEventListener('focusout', function (e) {
      if (e.target.tagName !== 'INPUT') return;
      var id = e.target.closest('.qrow').getAttribute('data-id');
      setQty(id, e.target.value, false); e.target.value = qtyOf(id);
    });
  }

  // Drawer steppers
  if (cartList) {
    cartList.addEventListener('click', function (e) {
      var item = e.target.closest('.citem'); if (!item) return;
      var id = item.getAttribute('data-id');
      var stepBtn = e.target.closest('[data-cstep]');
      if (stepBtn) setQty(id, qtyOf(id) + parseInt(stepBtn.getAttribute('data-cstep'), 10), true);
      else if (e.target.closest('[data-remove]')) setQty(id, 0, true);
    });
    cartList.addEventListener('change', function (e) {
      var item = e.target.closest('.citem'); if (!item || e.target.tagName !== 'INPUT') return;
      setQty(item.getAttribute('data-id'), e.target.value, false);
    });
  }
  var drawer = $('#cart-drawer');
  $('#cart-open').addEventListener('click', function () { renderCart(false); openDialog(drawer); });
  $('#cart-checkout').addEventListener('click', function () { closeDialog(drawer); });

  // Dialog close buttons + backdrop click
  $$('dialog').forEach(function (d) {
    $$('[data-close]', d).forEach(function (b) { b.addEventListener('click', function () { closeDialog(d); }); });
    d.addEventListener('click', function (e) {
      if (e.target !== d) return;
      var r = d.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside || d.classList.contains('lightbox')) closeDialog(d);
    });
  });
  var posterBtn = $('#poster-open');
  if (posterBtn) posterBtn.addEventListener('click', function () { openDialog($('#poster-modal')); });

  /* ---------- Header, nav, account ---------- */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  var header = $('#header'), sb = $('#scrollbar'), totop = $('#totop'), totopBar = $('#totop-bar');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var sc = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(1, sc / max) : 0;
    if (header) header.classList.toggle('is-scrolled', sc > 10);
    if (sb) sb.style.setProperty('--p', p.toFixed(4));
    if (totop) { totop.classList.toggle('is-show', sc > 600); totopBar.style.setProperty('--p', p.toFixed(4)); }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (totop) totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  var nav = $('#nav'), menuBtn = $('#menu-toggle');
  function setNav(open) {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('use', menuBtn).setAttribute('href', open ? '#i-x' : '#i-menu');
  }
  menuBtn.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  document.addEventListener('click', function (e) {
    if (document.body.classList.contains('nav-open') && !nav.contains(e.target) && !menuBtn.contains(e.target)) setNav(false);
  });
  var drop = $('.nav__drop'), dropBtn = $('.nav__droptoggle');
  function setDrop(open) { drop.classList.toggle('is-open', open); dropBtn.setAttribute('aria-expanded', String(open)); }
  dropBtn.addEventListener('click', function (e) { e.stopPropagation(); setDrop(!drop.classList.contains('is-open')); });
  document.addEventListener('click', function (e) { if (!drop.contains(e.target)) setDrop(false); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a[href^="#"]')) { setDrop(false); setNav(false); } });

  var accBtn = $('#account-toggle'), accPop = $('#account-pop');
  function setAcc(open) { accPop.hidden = !open; accBtn.setAttribute('aria-expanded', String(open)); }
  accBtn.addEventListener('click', function (e) { e.stopPropagation(); setAcc(accPop.hidden); });
  document.addEventListener('click', function (e) { if (!accPop.hidden && !accPop.contains(e.target)) setAcc(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setNav(false); setDrop(false); setAcc(false); } });

  /* ---------- Active nav link + reveals ---------- */
  var navMap = { home: 'home', products: 'products', about: 'about', tour: 'about', videos: 'about', order: 'order', contact: 'contact' };
  var navLinks = $$('[data-nav]');
  var revObs = null;
  if ('IntersectionObserver' in window) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var key = navMap[en.target.id]; if (!key) return;
        navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('data-nav') === key); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(navMap).forEach(function (id) { var el = document.getElementById(id); if (el) secObs.observe(el); });
    revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); revObs.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  }
  function observeReveals() {
    // Stagger siblings inside grids
    $$('.pgrid, .tgrid, .vgrid, .steps, .cgrid').forEach(function (g) {
      $$('.reveal', g).forEach(function (el, i) { el.style.setProperty('--rd', (i * 0.09).toFixed(2) + 's'); });
    });
    $$('.reveal:not(.is-in), [data-observe]:not(.is-in)').forEach(function (el) { if (revObs) revObs.observe(el); else el.classList.add('is-in'); });
  }

  /* ---------- 3D tilt + glare on product cards ---------- */
  if (canHover && !reduceMotion) {
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.pcard');
      $$('.pcard.is-tilting').forEach(function (c) { if (c !== card) { c.classList.remove('is-tilting'); c.style.transform = ''; } });
      if (!card) return;
      var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y) * 8).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 10).toFixed(2) + 'deg) translateY(-6px)';
    }, { passive: true });
    document.addEventListener('pointerleave', function () { $$('.pcard.is-tilting').forEach(function (c) { c.classList.remove('is-tilting'); c.style.transform = ''; }); });
  }

  /* ---------- Button ripple ---------- */
  if (!reduceMotion) {
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.btn'); if (!b || b.disabled) return;
      var r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
      var s = document.createElement('span'); s.className = 'ripple';
      s.style.width = s.style.height = size + 'px';
      s.style.left = (e.clientX - r.left - size / 2) + 'px'; s.style.top = (e.clientY - r.top - size / 2) + 'px';
      b.appendChild(s);
      setTimeout(function () { s.remove(); }, 700);
    });
  }

  /* ---------- Search (built from live data) ---------- */
  function searchItems() {
    var list = ORDERED.map(function (p) {
      return { t: p.name + (hasPrice(p) ? ' – ' + money(p.price) : ''), s: p.si || 'Product', h: '#p-' + p.id, img: p.img, k: [p.name, p.si, p.desc, p.unit, 'product order'].join(' ') };
    });
    var e = DATA.event;
    if (e.enabled) list.push({ t: e.cityEn + ' – ' + titleCase(e.month) + ' ' + niceRange(e.days), s: e.line1 + ' ' + e.line2 + ' · ' + hourLabel(e.openHour) + '–' + hourLabel(e.closeHour), h: '#tour', ic: '📍', k: e.cityEn + ' ' + e.citySi + ' event time location tour now ' + e.month });
    return list.concat([
      { t: 'Kurunegala – Nov 08', s: 'අදත් අපි කුරුණෑගල – Thank you!', h: '#tour', ic: '❤️', k: 'kurunegala කුරුණෑගල tour video thank you' },
      { t: 'Anuradhapura – 23, 24, 25', s: 'අපිත් බහිනවා අනුරාධපුරයට', h: '#tour', ic: '🚚', k: 'anuradhapura අනුරාධපුරය tour video' },
      { t: 'Videos', s: 'KP පුඩිං – ඔබේ රසවත් තේරීම', h: '#videos', ic: '🎬', k: 'video videos ad advertisement truck watch' },
      { t: 'About KP Pudding', s: 'අප ගැන', h: '#about', ic: 'ℹ️', k: 'about us kp pudding story අප ගැන' },
      { t: 'Order Now', s: 'අදම ඇණවුම් කරන්න – WhatsApp order', h: '#order', ic: '🛒', k: 'order buy cart whatsapp ඇණවුම් delivery price' },
      { t: 'Contact Us', s: DATA.contact.phoneDisplay + ' · WhatsApp · TikTok', h: '#contact', ic: '📞', k: 'contact phone call number whatsapp tiktok delivery area ' + DATA.contact.areas.join(' ') }
    ]);
  }
  var sModal = $('#search-modal'), sInput = $('#search-input'), sRes = $('#search-results');
  function renderSearch(q) {
    q = (q || '').trim().toLowerCase();
    var list = searchItems().filter(function (it) { return !q || (it.t + ' ' + it.s + ' ' + it.k).toLowerCase().indexOf(q) !== -1; });
    if (!list.length) { sRes.innerHTML = '<li class="smodal__empty">No results. Try “cup”, “party” or “Gampaha”.</li>'; return; }
    sRes.innerHTML = list.map(function (it) {
      var vis = it.img ? '<img src="' + esc(it.img) + '" alt="" />' : '<span class="sr-ic" aria-hidden="true">' + it.ic + '</span>';
      return '<li><a href="' + esc(it.h) + '">' + vis + '<span><b>' + esc(it.t) + '</b><small>' + esc(it.s) + '</small></span></a></li>';
    }).join('');
  }
  $('#search-open').addEventListener('click', function () {
    sInput.value = ''; renderSearch(''); openDialog(sModal);
    setTimeout(function () { sInput.focus(); }, 30);
  });
  sInput.addEventListener('input', function () { renderSearch(sInput.value); });
  sInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var first = $('a', sRes); if (first) { e.preventDefault(); first.click(); } } });
  sRes.addEventListener('click', function (e) { if (e.target.closest('a')) closeDialog(sModal); });

  /* ---------- Order form → WhatsApp ---------- */
  var form = $('#order-form'), dateInp = $('#order-date');
  if (dateInp) { var td = new Date(); dateInp.min = td.getFullYear() + '-' + pad(td.getMonth() + 1) + '-' + pad(td.getDate()); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true, firstBad = null;
    $$('.is-invalid', form).forEach(function (el) { el.classList.remove('is-invalid'); });
    if (cartTotal() === 0) { ok = false; $('#items-err').hidden = false; firstBad = $('#order-rows input:not([disabled])'); }
    ['name', 'area'].forEach(function (n) {
      var el = form.elements[n];
      if (!el.value.trim()) { ok = false; el.classList.add('is-invalid'); firstBad = firstBad || el; }
    });
    var phone = form.elements.phone;
    if (phone.value.trim() && !/^[0-9+ ]{9,15}$/.test(phone.value.trim())) { ok = false; phone.classList.add('is-invalid'); firstBad = firstBad || phone; }
    if (dateInp.value && dateInp.min && dateInp.value < dateInp.min) { ok = false; dateInp.classList.add('is-invalid'); firstBad = firstBad || dateInp; }
    if (!ok) {
      toast('කරුණාකර අවශ්‍ය විස්තර පුරවන්න / Please fill in the required fields');
      if (firstBad) firstBad.focus();
      return;
    }
    var lines = ['🍮 *KP Pudding Order*', '━━━━━━━━━━━━'];
    Object.keys(cart).forEach(function (id) {
      var p = PRODUCTS[id], q = qtyOf(id); if (!p || !q) return;
      lines.push('• ' + p.name + (p.si ? ' (' + p.si + ')' : '') + ' × ' + q + (hasPrice(p) ? ' = ' + money(p.price * q) : ' (price to confirm)'));
    });
    var t = cartSum();
    lines.push('━━━━━━━━━━━━');
    if (t.sum > 0) lines.push('💰 Total: ' + money(t.sum) + (t.unpriced ? ' + items to confirm' : ''));
    lines.push('👤 Name: ' + form.elements.name.value.trim());
    if (phone.value.trim()) lines.push('📞 Phone: ' + phone.value.trim());
    lines.push('📍 Area: ' + form.elements.area.value);
    if (form.elements.address.value.trim()) lines.push('🏠 Address/Location: ' + form.elements.address.value.trim());
    if (dateInp.value) lines.push('📅 Date: ' + dateInp.value);
    if (form.elements.notes.value.trim()) lines.push('📝 Notes: ' + form.elements.notes.value.trim());
    lines.push('', 'Please confirm my order. Thank you! 🙏');
    var a = document.createElement('a');
    a.href = waLink(lines.join('\n')); a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    confetti();
    toast('✓ Opening WhatsApp…');
  });
  $$('input, select, textarea', form).forEach(function (el) { el.addEventListener('input', function () { el.classList.remove('is-invalid'); }); });

  /* ---------- Videos: one at a time ---------- */
  var vids = $$('video');
  vids.forEach(function (v) { v.addEventListener('play', function () { vids.forEach(function (o) { if (o !== v && !o.paused) o.pause(); }); }); });

  /* =========================================================
     BOOT: render defaults now, then the live JSON
     ========================================================= */
  function apply(data) {
    DATA = data;
    PRODUCTS = {}; ORDERED = [];
    DATA.products.forEach(function (p) { if (p.visible) { PRODUCTS[p.id] = p; ORDERED.push(p); } });
    renderProducts();
    renderContact();
    renderEvent();
    renderCart(false);
    updateEvent();
    observeReveals();
  }
  apply(normalise(DEFAULTS));
  setInterval(updateEvent, 1000);

  var loaded = false;
  function reveal() { if (loaded) return; loaded = true; document.documentElement.classList.add('is-loaded'); }
  var minShow = new Promise(function (res) { setTimeout(res, reduceMotion ? 0 : 700); });
  var dataReq = (window.fetch ? fetch('data/site.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (j) { apply(normalise(j)); }).catch(function () { /* keep defaults */ }) : Promise.resolve());
  dataReq.then(function () { pruneCart(); renderCart(false); });
  Promise.all([minShow, dataReq]).then(reveal);
  setTimeout(reveal, 2500);
})();
