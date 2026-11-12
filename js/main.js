/* KP Pudding – site script */
(function () {
  'use strict';

  var WA_NUMBER = '94769090909';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var PRODUCTS = {
    cups: {
      name: 'Pudding Cups', si: 'පුඩිං කප්', img: 'assets/img/pudding-cup.webp',
      desc: 'තනි කෙනෙකුට රස විඳින්න ගැළපෙන, KP cup එකක සකස් කළ creamy caramel pudding. ගෙදරට, office එකට, ගමනට – ඕනෑම වෙලාවක රසවත් පුඩිං එකක්!'
    },
    packs: {
      name: 'Pudding Packs', si: 'පුඩිං පැක්', img: 'assets/img/pudding-packs.webp',
      desc: 'පවුලේ හැමෝටම, යාළුවන් එක්ක share කරන්න පුඩිං cups කිහිපයක් එකම පැකට්ටුවක. තෑග්ගක් විදිහටත් හොඳම තේරීමක්!'
    },
    party: {
      name: 'Party Orders', si: 'විශේෂ අවස්ථා ඇණවුම්', img: 'assets/img/party-pudding.webp',
      desc: 'උපන්දින, සාද, office events සහ විශේෂ අවස්ථා සඳහා විශාල ඇණවුම්. ඔබේ දිනය සහ ප්‍රමාණය කලින් දැනුම් දෙන්න – අපි සූදානම් කරලා දෙන්නම්.'
    }
  };

  /* ---------- Helpers ---------- */
  function waLink(text) { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text); }
  function clampQty(v, min) {
    var n = parseInt(v, 10);
    if (isNaN(n)) n = min;
    return Math.max(min, Math.min(999, n));
  }
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-show'); }, 2600);
  }
  function openDialog(d) {
    if (!d) return;
    if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); }
    else d.setAttribute('open', '');
  }
  function closeDialog(d) {
    if (!d) return;
    if (typeof d.close === 'function') { if (d.open) d.close(); }
    else d.removeAttribute('open');
  }

  /* ---------- Year ---------- */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Header: scroll state ---------- */
  var header = $('#header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Mobile nav ---------- */
  var nav = $('#nav'), menuBtn = $('#menu-toggle');
  function setNav(open) {
    if (!nav || !menuBtn) return;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  document.addEventListener('click', function (e) {
    if (document.body.classList.contains('nav-open') && !nav.contains(e.target) && !menuBtn.contains(e.target)) setNav(false);
  });

  /* Products dropdown */
  var drop = $('.nav__drop'), dropBtn = $('.nav__droptoggle');
  function setDrop(open) { if (!drop) return; drop.classList.toggle('is-open', open); dropBtn.setAttribute('aria-expanded', String(open)); }
  if (dropBtn) dropBtn.addEventListener('click', function (e) { e.stopPropagation(); setDrop(!drop.classList.contains('is-open')); });
  document.addEventListener('click', function (e) { if (drop && !drop.contains(e.target)) setDrop(false); });

  /* Close menus after clicking an in-page link */
  $$('.nav a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function () { setDrop(false); setNav(false); });
  });

  /* Account popover */
  var accBtn = $('#account-toggle'), accPop = $('#account-pop');
  function setAcc(open) { if (!accPop) return; accPop.hidden = !open; accBtn.setAttribute('aria-expanded', String(open)); }
  if (accBtn) accBtn.addEventListener('click', function (e) { e.stopPropagation(); setAcc(accPop.hidden); });
  document.addEventListener('click', function (e) { if (accPop && !accPop.hidden && !accPop.contains(e.target)) setAcc(false); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setNav(false); setDrop(false); setAcc(false); }
  });

  /* ---------- Active nav link on scroll ---------- */
  var navMap = { home: 'home', products: 'products', about: 'about', tour: 'about', videos: 'about', order: 'order', contact: 'contact' };
  var navLinks = $$('[data-nav]');
  if ('IntersectionObserver' in window) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var key = navMap[en.target.id];
        if (!key) return;
        navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('data-nav') === key); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(navMap).forEach(function (id) { var el = document.getElementById(id); if (el) secObs.observe(el); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); revObs.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { revObs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Event status (Gampaha, Nov 10–15 2026, 1PM–8PM Sri Lanka time) ---------- */
  var SL_OFFSET = 5.5 * 3600 * 1000; // UTC+05:30
  function slTime(y, m, d, h) { return Date.UTC(y, m - 1, d, h) - SL_OFFSET; } // returns UTC ms for a Sri Lanka wall-clock time
  var EV = { y: 2026, m: 11, d1: 10, d2: 15, open: 13, close: 20 };
  var statusEl = $('#event-status'), cdEl = $('#countdown'), chip = $('#tour-chip');

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function renderCountdown(ms, label) {
    if (!cdEl) return;
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), mi = Math.floor(s % 3600 / 60), se = s % 60;
    cdEl.innerHTML = '<span>' + label + '</span>' +
      (d > 0 ? '<b>' + d + '<small>days</small></b>' : '') +
      '<b>' + pad(h) + '<small>hrs</small></b><b>' + pad(mi) + '<small>min</small></b><b>' + pad(se) + '<small>sec</small></b>';
    cdEl.hidden = false;
  }
  function setStatus(text, live) {
    if (!statusEl) return;
    $('.live-pill__text', statusEl).textContent = text;
    statusEl.classList.toggle('is-live', !!live);
  }
  function updateEvent() {
    var now = Date.now();
    var first = slTime(EV.y, EV.m, EV.d1, EV.open);
    var last = slTime(EV.y, EV.m, EV.d2, EV.close);
    if (now < first) {
      setStatus('ළඟදීම! ගම්පහ නගරයට – නොවැම්බර් 10', false);
      renderCountdown(first - now, 'ආරම්භයට:');
      if (chip) { chip.textContent = 'Coming soon'; chip.classList.remove('is-live'); }
      return;
    }
    if (now > last) {
      setStatus('Thank you Gampaha! 💛 ඊළඟ නගරය ගැන WhatsApp කරන්න', false);
      if (cdEl) cdEl.hidden = true;
      if (chip) { chip.textContent = 'Visited'; chip.className = 'chip chip--done'; }
      return;
    }
    // Within the event days – work out today's window in Sri Lanka time
    var sl = new Date(now + SL_OFFSET);
    var day = sl.getUTCDate();
    var openT = slTime(EV.y, EV.m, day, EV.open), closeT = slTime(EV.y, EV.m, day, EV.close);
    if (now >= openT && now < closeT) {
      setStatus('🔴 LIVE NOW – අද රාත්‍රී 8 දක්වා ගම්පහ නගරයේ!', true);
      renderCountdown(closeT - now, 'අද වසා දැමීමට:');
      if (chip) { chip.textContent = 'Live now'; chip.classList.add('is-live'); }
    } else if (now < openT) {
      setStatus('අද දහවල් 1 සිට ගම්පහ නගරයේ!', false);
      renderCountdown(openT - now, 'අද විවෘත වීමට:');
      if (chip) { chip.textContent = 'Today 1PM'; chip.classList.remove('is-live'); }
    } else {
      var nextOpen = slTime(EV.y, EV.m, day + 1, EV.open);
      setStatus('හෙට දහවල් 1 සිට නැවතත් ගම්පහ නගරයේ!', false);
      renderCountdown(nextOpen - now, 'හෙට විවෘත වීමට:');
      if (chip) { chip.textContent = 'Tomorrow 1PM'; chip.classList.remove('is-live'); }
    }
  }
  updateEvent();
  setInterval(updateEvent, 1000);

  /* ---------- Cart (shared with the order form) ---------- */
  var STORE_KEY = 'kp-pudding-cart';
  var cart = { cups: 0, packs: 0, party: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved) Object.keys(cart).forEach(function (k) { cart[k] = clampQty(saved[k], 0); });
  } catch (e) { /* storage unavailable */ }

  function saveCart() { try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ } }
  function cartTotal() { return cart.cups + cart.packs + cart.party; }

  var countEl = $('#cart-count'), cartList = $('#cart-list');
  function renderCart(bump) {
    var total = cartTotal();
    if (countEl) {
      countEl.textContent = total;
      if (bump) { countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); }
    }
    // order form rows
    $$('.qrow').forEach(function (row) {
      var id = row.getAttribute('data-id'), inp = $('input', row);
      if (document.activeElement !== inp) inp.value = cart[id];
      row.classList.toggle('is-selected', cart[id] > 0);
    });
    if (total > 0) { var err = $('#items-err'); if (err) err.hidden = true; }
    // drawer list
    if (!cartList) return;
    if (total === 0) {
      cartList.innerHTML = '<div class="cart-empty"><img src="assets/img/pudding-hero.webp" alt="" width="140" height="86" /><p>ඔබේ order එක තවම හිස්. 🍮<br />Your order is empty.</p></div>';
      return;
    }
    var html = '';
    Object.keys(cart).forEach(function (id) {
      if (!cart[id]) return;
      var p = PRODUCTS[id];
      html += '<div class="citem" data-id="' + id + '"><img src="' + p.img + '" alt="" />' +
        '<div><b>' + p.name + '</b><small>' + p.si + '</small></div><span></span>' +
        '<div class="citem__ctrl"><div class="qty" role="group" aria-label="' + p.name + ' quantity">' +
        '<button type="button" data-cstep="-1" aria-label="Decrease ' + p.name + '"><svg class="ic"><use href="#i-minus"/></svg></button>' +
        '<input type="number" inputmode="numeric" min="0" max="999" value="' + cart[id] + '" aria-label="' + p.name + ' quantity" />' +
        '<button type="button" data-cstep="1" aria-label="Increase ' + p.name + '"><svg class="ic"><use href="#i-plus"/></svg></button></div>' +
        '<button type="button" class="citem__rm" data-remove aria-label="Remove ' + p.name + '"><svg class="ic"><use href="#i-trash"/></svg></button></div></div>';
    });
    cartList.innerHTML = html;
  }
  function setQty(id, qty, bump) {
    if (!(id in cart)) return;
    cart[id] = clampQty(qty, 0);
    saveCart(); renderCart(bump);
  }

  // Order-form steppers
  $$('.qrow').forEach(function (row) {
    var id = row.getAttribute('data-id'), inp = $('input', row);
    $$('button[data-step]', row).forEach(function (b) {
      b.addEventListener('click', function () { setQty(id, cart[id] + parseInt(b.getAttribute('data-step'), 10), true); });
    });
    inp.addEventListener('input', function () { if (inp.value !== '') setQty(id, inp.value, false); });
    inp.addEventListener('blur', function () { setQty(id, inp.value, false); inp.value = cart[id]; });
  });

  // Drawer steppers
  if (cartList) {
    cartList.addEventListener('click', function (e) {
      var item = e.target.closest('.citem'); if (!item) return;
      var id = item.getAttribute('data-id');
      var stepBtn = e.target.closest('[data-cstep]');
      if (stepBtn) setQty(id, cart[id] + parseInt(stepBtn.getAttribute('data-cstep'), 10), true);
      else if (e.target.closest('[data-remove]')) setQty(id, 0, true);
    });
    cartList.addEventListener('change', function (e) {
      var item = e.target.closest('.citem'); if (!item || e.target.tagName !== 'INPUT') return;
      setQty(item.getAttribute('data-id'), e.target.value, false);
    });
  }

  var drawer = $('#cart-drawer');
  var cartOpen = $('#cart-open');
  if (cartOpen) cartOpen.addEventListener('click', function () { renderCart(false); openDialog(drawer); });
  var checkout = $('#cart-checkout');
  if (checkout) checkout.addEventListener('click', function () { closeDialog(drawer); });

  renderCart(false);

  /* ---------- Product modal ---------- */
  var pModal = $('#product-modal'), pmQty = $('#pm-qty'), currentP = 'cups';
  function openProduct(id) {
    var p = PRODUCTS[id]; if (!p) return;
    currentP = id;
    $('#pm-title').textContent = p.name;
    $('#pm-si').textContent = p.si;
    $('#pm-desc').textContent = p.desc;
    var img = $('#pm-img'); img.src = p.img; img.alt = p.name;
    pmQty.value = 1;
    $('#pm-wa').href = waLink('Hi KP Pudding! 🍮 I would like to know about ' + p.name + ' (' + p.si + ').');
    openDialog(pModal);
  }
  $$('[data-product]').forEach(function (b) {
    b.addEventListener('click', function () { openProduct(b.getAttribute('data-product')); });
  });
  if (pmQty) {
    $('#pm-minus').addEventListener('click', function () { pmQty.value = clampQty(+pmQty.value - 1, 1); });
    $('#pm-plus').addEventListener('click', function () { pmQty.value = clampQty(+pmQty.value + 1, 1); });
    pmQty.addEventListener('blur', function () { pmQty.value = clampQty(pmQty.value, 1); });
    $('#pm-add').addEventListener('click', function () {
      var q = clampQty(pmQty.value, 1);
      setQty(currentP, cart[currentP] + q, true);
      closeDialog(pModal);
      toast('✓ ' + PRODUCTS[currentP].name + ' × ' + q + ' added to your order');
    });
  }

  /* ---------- Generic dialog close: buttons + backdrop click ---------- */
  $$('dialog').forEach(function (d) {
    $$('[data-close]', d).forEach(function (b) { b.addEventListener('click', function () { closeDialog(d); }); });
    d.addEventListener('click', function (e) {
      if (e.target !== d) return;
      var r = d.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside || d.classList.contains('lightbox')) closeDialog(d);
    });
  });

  /* ---------- Poster lightbox ---------- */
  var posterBtn = $('#poster-open');
  if (posterBtn) posterBtn.addEventListener('click', function () { openDialog($('#poster-modal')); });

  /* ---------- Search ---------- */
  var SEARCH = [
    { t: 'Pudding Cups', s: 'පුඩිං කප් – single cups', h: '#p-cups', img: 'assets/img/pudding-cup.webp', k: 'cup cups pudding පුඩිං කප් single' },
    { t: 'Pudding Packs', s: 'පුඩිං පැක් – share with family', h: '#p-packs', img: 'assets/img/pudding-packs.webp', k: 'pack packs box family share පැක්' },
    { t: 'Party Orders', s: 'විශේෂ අවස්ථා ඇණවුම්', h: '#p-party', img: 'assets/img/party-pudding.webp', k: 'party event birthday bulk order විශේෂ අවස්ථා ඇණවුම්' },
    { t: 'Gampaha – Nov 10–15', s: 'අපි එනවා ගම්පහ නගරයට · 1PM–8PM', h: '#tour', ic: '📍', k: 'gampaha ගම්පහ event november time location tour now' },
    { t: 'Kurunegala – Nov 08', s: 'අදත් අපි කුරුණෑගල – Thank you!', h: '#tour', ic: '❤️', k: 'kurunegala කුරුණෑගල tour video thank you' },
    { t: 'Anuradhapura – 23 · 24 · 25', s: 'අපිත් බහිනවා අනුරාධපුරයට', h: '#tour', ic: '🚚', k: 'anuradhapura අනුරාධපුරය tour video' },
    { t: 'Videos', s: 'KP පුඩිං – ඔබේ රසවත් තේරීම', h: '#videos', ic: '🎬', k: 'video videos ad advertisement truck watch' },
    { t: 'About KP Pudding', s: 'අප ගැන', h: '#about', ic: 'ℹ️', k: 'about us kp pudding story අප ගැන' },
    { t: 'Order Now', s: 'අදම ඇණවුම් කරන්න – WhatsApp order', h: '#order', ic: '🛒', k: 'order buy cart whatsapp ඇණවුම් delivery' },
    { t: 'Contact Us', s: '076 90 90 90 9 · WhatsApp · TikTok', h: '#contact', ic: '📞', k: 'contact phone call number whatsapp tiktok delivery area colombo gampaha' }
  ];
  var sModal = $('#search-modal'), sInput = $('#search-input'), sRes = $('#search-results');
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function renderSearch(q) {
    q = (q || '').trim().toLowerCase();
    var list = SEARCH.filter(function (it) {
      if (!q) return true;
      return (it.t + ' ' + it.s + ' ' + it.k).toLowerCase().indexOf(q) !== -1;
    });
    if (!list.length) { sRes.innerHTML = '<li class="smodal__empty">No results – try “cups”, “party” or “Gampaha”.</li>'; return; }
    sRes.innerHTML = list.map(function (it) {
      var vis = it.img ? '<img src="' + it.img + '" alt="" />' : '<span class="sr-ic" aria-hidden="true">' + it.ic + '</span>';
      return '<li><a href="' + it.h + '">' + vis + '<span><b>' + esc(it.t) + '</b><small>' + esc(it.s) + '</small></span></a></li>';
    }).join('');
  }
  var searchOpen = $('#search-open');
  if (searchOpen) searchOpen.addEventListener('click', function () {
    sInput.value = ''; renderSearch(''); openDialog(sModal);
    setTimeout(function () { sInput.focus(); }, 30);
  });
  if (sInput) {
    sInput.addEventListener('input', function () { renderSearch(sInput.value); });
    sInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var first = $('a', sRes); if (first) { e.preventDefault(); first.click(); } }
    });
  }
  if (sRes) sRes.addEventListener('click', function (e) { if (e.target.closest('a')) closeDialog(sModal); });

  /* ---------- Order form → WhatsApp ---------- */
  var form = $('#order-form');
  var dateInp = $('#order-date');
  if (dateInp) {
    var t = new Date();
    dateInp.min = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  }
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, firstBad = null;
      $$('.is-invalid', form).forEach(function (el) { el.classList.remove('is-invalid'); });

      if (cartTotal() === 0) {
        ok = false; $('#items-err').hidden = false; firstBad = firstBad || $('.qrow input', form);
      }
      ['name', 'area'].forEach(function (n) {
        var el = form.elements[n];
        if (!el.value.trim()) { ok = false; el.classList.add('is-invalid'); firstBad = firstBad || el; }
      });
      var phone = form.elements.phone;
      if (phone.value.trim() && !/^[0-9+ ]{9,15}$/.test(phone.value.trim())) { ok = false; phone.classList.add('is-invalid'); firstBad = firstBad || phone; }
      if (dateInp && dateInp.value && dateInp.min && dateInp.value < dateInp.min) { ok = false; dateInp.classList.add('is-invalid'); firstBad = firstBad || dateInp; }

      if (!ok) {
        toast('කරුණාකර අවශ්‍ය විස්තර පුරවන්න / Please complete the required fields');
        if (firstBad) firstBad.focus({ preventScroll: false });
        return;
      }

      var lines = ['🍮 *KP Pudding Order*', '━━━━━━━━━━━━'];
      Object.keys(cart).forEach(function (id) { if (cart[id]) lines.push('• ' + PRODUCTS[id].name + ' (' + PRODUCTS[id].si + ') × ' + cart[id]); });
      lines.push('━━━━━━━━━━━━');
      lines.push('👤 Name: ' + form.elements.name.value.trim());
      if (phone.value.trim()) lines.push('📞 Phone: ' + phone.value.trim());
      lines.push('📍 Area: ' + form.elements.area.value);
      if (form.elements.address.value.trim()) lines.push('🏠 Address/Location: ' + form.elements.address.value.trim());
      if (dateInp && dateInp.value) lines.push('📅 Date: ' + dateInp.value);
      if (form.elements.notes.value.trim()) lines.push('📝 Notes: ' + form.elements.notes.value.trim());
      lines.push('', 'Please confirm the price & availability. Thank you! 🙏');

      var a = document.createElement('a');
      a.href = waLink(lines.join('\n'));
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('✓ Opening WhatsApp…');
    });
    $$('input, select, textarea', form).forEach(function (el) {
      el.addEventListener('input', function () { el.classList.remove('is-invalid'); });
    });
  }

  /* ---------- Videos: play one at a time ---------- */
  var vids = $$('video');
  vids.forEach(function (v) {
    v.addEventListener('play', function () { vids.forEach(function (o) { if (o !== v && !o.paused) o.pause(); }); });
  });
})();
