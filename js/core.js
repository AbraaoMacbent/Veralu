/* =========================================================
   VERALU — núcleo compartilhado pelas páginas
   rolagem, cursor, sacola, favoritos, transição de tinta, rodapé
   ========================================================= */
(() => {
  'use strict';

  if (!window.gsap || !window.ScrollTrigger || !window.Lenis || !window.VERALU_DATA) return; // sem internet: site estático
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(window.Flip);
  const D = window.VERALU_DATA;

  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const smooth = (t) => t * t * (3 - 2 * t);
  const curve = (pts) => {
    let d = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem('veralu:' + k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('veralu:' + k, JSON.stringify(v)); } catch (e) { /* sem storage */ } },
  };
  const session = {
    get(k) { try { return sessionStorage.getItem('veralu:' + k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem('veralu:' + k, v); } catch (e) { /* sem storage */ } },
  };

  const V = (window.VERALU = { reduce, finePointer, NS, $, $$, clamp, lerp, rand, smooth, curve, store, session, D });

  /* ---------------------------------------------------------
     Modo leve: em computadores que não seguram 60 quadros,
     desliga só os efeitos caros (rolagem suave, grão animado...)
     --------------------------------------------------------- */
  V.lite = session.get('lite') === '1';
  if (V.lite) root.classList.add('lite');
  function goLite() {
    if (V.lite) return;
    V.lite = true;
    root.classList.add('lite');
    session.set('lite', '1');
    if (V.lenis) V.lenis.options.smoothWheel = false;
    dispatchEvent(new Event('veralu:lite'));
  }
  (() => {
    if (V.lite) return;
    const gaps = [];
    let last = 0;
    const step = (t) => {
      if (last) gaps.push(t - last);
      last = t;
      if (gaps.length < 90) requestAnimationFrame(step);
      else {
        gaps.sort((a, b) => a - b);
        const median = gaps[45];
        const slow = gaps.filter((g) => g > 34).length;
        if (median > 22 || slow > 18) goLite();
      }
    };
    addEventListener('load', () => setTimeout(() => requestAnimationFrame(step), 300));
  })();

  /* ---------------------------------------------------------
     Rolagem suave (Lenis) + ScrollTrigger
     --------------------------------------------------------- */
  const lenis = new window.Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: !reduce && !V.lite,
    touchMultiplier: 1.3,
  });
  V.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  let lockCount = 0;
  V.lock = (on) => {
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    if (lockCount) { lenis.stop(); document.body.classList.add('is-locked'); }
    else { lenis.start(); document.body.classList.remove('is-locked'); }
  };

  /* ---------------------------------------------------------
     Toast + camada de efeitos
     --------------------------------------------------------- */
  const toastEl = $('#toast');
  let toastT;
  V.toast = (html) => {
    toastEl.innerHTML = `<svg><use href="#mascot"/></svg><span>${html}</span>`;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2800);
  };
  V.fx = $('.fx-layer');

  V.sparks = (el, colors = ['#FFD740', '#E0233F', '#0B1F3A']) => {
    if (reduce || V.lite) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('i');
      s.className = 'fx-spark';
      s.style.background = colors[i % colors.length];
      V.fx.appendChild(s);
      const a = (i / 10) * Math.PI * 2 + rand(-0.2, 0.2);
      const d = rand(26, 52);
      gsap.fromTo(s, { x: cx - 4, y: cy - 4, scale: 1 }, {
        x: cx - 4 + Math.cos(a) * d, y: cy - 4 + Math.sin(a) * d, scale: 0, duration: rand(0.5, 0.8), ease: 'power3.out',
        onComplete: () => s.remove(),
      });
    }
  };

  /* ---------------------------------------------------------
     Cursor: o do sistema (sem atraso) + etiqueta em alguns elementos
     --------------------------------------------------------- */
  (() => {
    if (!finePointer || reduce) return;
    const el = $('.cursor');
    const label = $('.cursor__label');
    if (!el) return;
    root.classList.add('has-cursor');
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor]');
      const txt = t && t.dataset.cursor;
      if (txt) { label.textContent = txt; el.classList.add('is-label'); }
      else el.classList.remove('is-label');
    });
    document.addEventListener('mouseleave', () => el.classList.remove('is-label'));
  })();

  /* ---------------------------------------------------------
     Header
     --------------------------------------------------------- */
  const header = $('#header');
  V.header = header;
  V.showHeader = () => header.classList.add('is-in');

  /* =========================================================
     FAVORITOS
     ========================================================= */
  const Favs = (() => {
    const set = new Set(store.get('favs', []).filter((id) => D.byId[id]));
    const badge = $('#favBtn .badge');
    const listeners = [];
    function sync(pop) {
      badge.textContent = set.size;
      badge.classList.toggle('is-on', set.size > 0);
      if (pop) { badge.classList.remove('is-pop'); void badge.offsetWidth; badge.classList.add('is-pop'); }
    }
    function toggle(id, btn) {
      const on = !set.has(id);
      if (on) set.add(id); else set.delete(id);
      store.set('favs', [...set]);
      sync(true);
      if (on && btn) V.sparks(btn);
      listeners.forEach((fn) => fn(id, on));
    }
    sync(false);
    return { has: (id) => set.has(id), size: () => set.size, toggle, onChange: (fn) => listeners.push(fn) };
  })();
  V.favs = Favs;

  $('#favBtn').addEventListener('click', () => {
    if (V.onFavButton) return V.onFavButton();
    V.go('index.html#favoritos');
  });
  $$('[data-fav-link]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    $('#favBtn').click();
  }));

  /* =========================================================
     SACOLA
     ========================================================= */
  const Cart = (() => {
    let cart = store.get('cart', []).filter((it) => D.byId[it.id]);
    const bag = $('#bag');
    const items = $('.bag__items');
    const total = $('.bag__total');
    const shipTxt = $('.bag__ship-txt');
    const ship = $('.bag__ship');
    const shipBar = $('.bag__ship-bar i');
    const shipDot = $('.bag__ship-dot');
    const bagBtn = $('#bagBtn');
    const badge = $('.badge', bagBtn);
    const FREE = 150;
    let lastFocus = null;

    const key = (id, size, paper) => `${id}|${size}|${paper}`;
    const count = () => cart.reduce((n, it) => n + it.qty, 0);
    const sum = () => cart.reduce((n, it) => n + D.priceOf(D.byId[it.id], it.size, it.paper) * it.qty, 0);
    const save = () => store.set('cart', cart);

    function syncBadge(pop) {
      const n = count();
      badge.textContent = n;
      badge.classList.toggle('is-on', n > 0);
      if (pop) {
        badge.classList.remove('is-pop'); void badge.offsetWidth; badge.classList.add('is-pop');
        bagBtn.classList.remove('is-bump'); void bagBtn.offsetWidth; bagBtn.classList.add('is-bump');
      }
    }

    function render() {
      bag.classList.toggle('is-empty', cart.length === 0);
      items.innerHTML = cart.map((it) => {
        const p = D.byId[it.id];
        const paper = (D.PAPERS.find((x) => x.id === it.paper) || D.PAPERS[0]).label;
        return `<li class="bag-item" data-key="${key(it.id, it.size, it.paper)}">
          <a class="bag-item__img" href="${D.productUrl(p.id)}"><img src="${p.img}" alt=""></a>
          <div>
            <a class="bag-item__name" href="${D.productUrl(p.id)}">${p.name}</a>
            <p class="bag-item__meta">${it.size} · ${paper} · @${p.artist}</p>
            <div class="qty"><button type="button" data-d="-1" aria-label="Diminuir"><svg><use href="#i-minus"/></svg></button><span class="qty__n">${it.qty}</span><button type="button" data-d="1" aria-label="Aumentar"><svg><use href="#i-plus"/></svg></button></div>
          </div>
          <div class="bag-item__right">
            <span class="bag-item__price">${D.money(D.priceOf(p, it.size, it.paper) * it.qty)}</span>
            <button class="bag-item__rm" type="button">remover</button>
          </div>
        </li>`;
      }).join('');
      const s = sum();
      total.textContent = D.money(s);
      const pct = clamp(s / FREE, 0, 1);
      shipBar.style.width = pct * 100 + '%';
      shipDot.style.left = pct * 100 + '%';
      ship.classList.toggle('is-free', s >= FREE);
      shipTxt.innerHTML = s >= FREE ? '<b>Frete grátis</b> garantido. Seu pedido viaja de graça ✦' : `Faltam <b>${D.money(FREE - s)}</b> para o frete grátis`;
    }

    items.addEventListener('click', (e) => {
      const li = e.target.closest('.bag-item');
      if (!li) return;
      const it = cart.find((x) => key(x.id, x.size, x.paper) === li.dataset.key);
      if (!it) return;
      const d = e.target.closest('[data-d]');
      if (d) {
        it.qty += +d.dataset.d;
        if (it.qty <= 0) return remove(li, it);
        save(); render(); syncBadge(true);
        return;
      }
      if (e.target.closest('.bag-item__rm')) remove(li, it);
    });
    function remove(li, it) {
      gsap.to(li, {
        x: 80, opacity: 0, rotate: 4, height: 0, paddingTop: 0, paddingBottom: 0, duration: 0.45, ease: 'power2.in',
        onComplete: () => { cart = cart.filter((x) => x !== it); save(); render(); syncBadge(true); },
      });
    }

    function fly(img) {
      if (!img || reduce) return Promise.resolve();
      const from = img.getBoundingClientRect();
      const to = bagBtn.getBoundingClientRect();
      const el = document.createElement('img');
      el.src = img.src; el.className = 'fx-fly'; el.alt = '';
      el.style.width = from.width + 'px'; el.style.height = from.height + 'px';
      V.fx.appendChild(el);
      const tx = to.left + to.width / 2 - from.width / 2;
      const ty = to.top + to.height / 2 - from.height / 2;
      return new Promise((res) => {
        gsap.fromTo(el, { x: from.left, y: from.top, scale: 1, rotation: 0 }, {
          keyframes: { x: [from.left, (from.left + tx) / 2, tx], y: [from.top, Math.min(from.top, ty) - 140, ty], scale: [1, 0.7, 0.1], rotation: [0, -18, -40], easeEach: 'sine.inOut' },
          duration: 0.95, ease: 'power1.in',
          onComplete: () => { el.remove(); res(); },
        });
      });
    }

    function add(id, size = 'A5', paper = 'polen', qty = 1, img, opts = {}) {
      const k = key(id, size, paper);
      const it = cart.find((x) => key(x.id, x.size, x.paper) === k);
      if (it) it.qty += qty; else cart.push({ id, size, paper, qty });
      save(); render();
      if (opts.quiet) { syncBadge(true); return; } // "Comprar" já abre a sacola
      fly(img).then(() => {
        syncBadge(true);
        V.sparks(bagBtn, ['#FFD740', '#FFFCEF']);
      });
      V.toast(`<b>${D.byId[id].name.replace('Sketchbook ', '')}</b> foi para a sacola.`);
    }

    function open() {
      lastFocus = document.activeElement;
      render();
      bag.classList.add('is-open');
      bag.setAttribute('aria-hidden', 'false');
      V.lock(true);
      if (!reduce) gsap.fromTo('.bag-item, .bag__ship, .bag__empty > *', { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.06, delay: 0.2 });
      setTimeout(() => $('.bag__close').focus({ preventScroll: true }), 50);
    }
    function close() {
      if (!bag.classList.contains('is-open')) return;
      bag.classList.remove('is-open');
      bag.setAttribute('aria-hidden', 'true');
      V.lock(false);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    bagBtn.addEventListener('click', open);
    $$('[data-open-bag]').forEach((b) => b.addEventListener('click', open));
    $$('[data-close]', bag).forEach((b) => b.addEventListener('click', (e) => {
      if (b.tagName === 'A') { e.preventDefault(); close(); setTimeout(() => (V.onShopLink ? V.onShopLink() : V.go('index.html#loja')), 350); return; }
      close();
    }));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    $('.bag__checkout').addEventListener('click', () => V.toast('O checkout com Pix e cartão chega na próxima fase ✦'));

    render(); syncBadge(false);
    return { add, open, close };
  })();
  V.cart = Cart;

  /* =========================================================
     CARD DE PRODUTO (vitrine da home e sugestões na página do produto)
     ========================================================= */
  V.cardHTML = (p) => `
    <article class="card__inner">
      <a class="card__stage" href="${D.productUrl(p.id)}" style="--accent:${p.accent}" data-cursor="ver" aria-label="Ver ${p.name}">
        ${p.badge ? `<span class="card__badge">${p.badge}</span>` : ''}
        <span class="book">
          <span class="book__pages"></span>
          <span class="book__cover"><img src="${p.img}" alt="Capa do ${p.name}" loading="lazy" decoding="async" draggable="false"></span>
        </span>
        <span class="book__shadow"></span>
      </a>
      <button class="fav-btn" type="button" aria-pressed="false" aria-label="Favoritar ${p.name}"><svg><use href="#i-heart"/></svg></button>
      <div class="card__info">
        <h3 class="card__title"><a href="${D.productUrl(p.id)}">${p.name}</a></h3>
        <p class="card__artist">por @${p.artist}</p>
        <div class="card__row">
          <span class="card__price">${D.money(p.price)}</span>
          <button class="card__add" type="button" data-cursor="+1"><svg><use href="#i-plus"/></svg><span>sacola</span></button>
        </div>
      </div>
    </article>`;
  V.bindCard = (li, p) => {
    const stage = $('.card__stage', li);
    const book = $('.book', li);
    let r = null; // medido ao entrar, não a cada movimento
    stage.addEventListener('pointerenter', () => { r = stage.getBoundingClientRect(); });
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!r) r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      book.style.setProperty('--ry', (px * 26).toFixed(2) + 'deg');
      book.style.setProperty('--rx', (-py * 18).toFixed(2) + 'deg');
      book.style.setProperty('--shine', (px * 80).toFixed(1) + '%');
    });
    stage.addEventListener('pointerleave', () => {
      r = null;
      book.style.setProperty('--ry', '0deg');
      book.style.setProperty('--rx', '0deg');
    });
    const fav = $('.fav-btn', li);
    const syncFav = () => { fav.classList.toggle('is-on', Favs.has(p.id)); fav.setAttribute('aria-pressed', Favs.has(p.id)); };
    syncFav();
    fav.addEventListener('click', (e) => Favs.toggle(p.id, e.currentTarget));
    Favs.onChange((id) => { if (id === p.id) syncFav(); });
    $('.card__add', li).addEventListener('click', (e) => {
      const btn = e.currentTarget;
      Cart.add(p.id, 'A5', 'polen', 1, $('.book__cover img', li));
      btn.classList.add('is-added');
      $('span', btn).textContent = 'foi!';
      setTimeout(() => { btn.classList.remove('is-added'); $('span', btn).textContent = 'sacola'; }, 1400);
    });
  };

  /* =========================================================
     TRANSIÇÃO DE TINTA — mesma do site de referência (LXL):
     um traço que se desenha fino, engrossa até cobrir a tela
     e depois se apaga do começo para o fim.
     ========================================================= */
  const Ink = (() => {
    const el = $('.ink');
    const path = $('.ink__svg path');
    const st = { a: 0, b: 0, w: 5 };
    let L = 0;
    const len = () => (L || (L = path.getTotalLength()));
    function render() {
      const seg = (st.b - st.a) * len();
      if (seg < 0.5) { path.style.visibility = 'hidden'; return; }
      path.style.visibility = 'visible';
      path.style.strokeDasharray = `${seg.toFixed(1)} ${(L * 2).toFixed(0)}`;
      path.style.strokeDashoffset = (-st.a * L).toFixed(1);
      path.style.strokeWidth = st.w.toFixed(2) + '%';
    }
    function show() { el.classList.add('is-on'); root.classList.remove('ink-in'); }
    function hide() { el.classList.remove('is-on'); path.style.visibility = 'hidden'; }
    // cobrir: 0%→85% do traço em 1s, engrossando de 5% para 30%; troca de tela só com tudo coberto
    function cover(onCovered) {
      const tl = gsap.timeline({ onStart: () => { show(); Object.assign(st, { a: 0, b: 0, w: 5 }); render(); }, onUpdate: render });
      tl.to(st, { b: 0.85, duration: 1, ease: 'power1.inOut' }, 0)
        .to(st, { w: 30, duration: 0.75, ease: 'power1.inOut' }, 0.25);
      if (onCovered) tl.call(onCovered, null, 1);
      return tl;
    }
    // revelar: o traço inteiro se apaga do início para o fim em 1,25s, afinando
    function reveal(onDone) {
      return gsap.timeline({
        onStart: () => { show(); Object.assign(st, { a: 0, b: 1, w: 30 }); render(); },
        onUpdate: render,
        onComplete: () => { hide(); if (onDone) onDone(); },
      }).to(st, { a: 1, w: 5, duration: 1.25, ease: 'power1.inOut' });
    }
    function covered() { show(); Object.assign(st, { a: 0, b: 1, w: 30 }); render(); }
    return { cover, reveal, covered, hide, isOn: () => el.classList.contains('is-on') };
  })();
  V.ink = Ink;

  // navegação entre páginas com a tinta
  V.go = (url) => {
    if (reduce) { location.href = url; return; }
    session.set('ink', '1');
    Ink.cover(() => { location.href = url; });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto|tel|https?):/i.test(href)) return;
    if (!/\.html(\?|#|$)/.test(href)) return;
    // mesma página só com âncora diferente: deixa a página tratar
    const target = new URL(href, location.href);
    if (target.pathname === location.pathname && target.search === location.search && target.hash) return;
    e.preventDefault();
    V.go(href);
  });

  // a página chegou por uma transição: começa coberta e revela quando estiver pronta
  V.inkIn = root.classList.contains('ink-in');
  if (V.inkIn) Ink.covered();
  V.revealPage = (onStart) => {
    if (!Ink.isOn()) { if (onStart) onStart(); return; }
    const tl = Ink.reveal();
    if (onStart) tl.call(onStart, null, 0.35);
  };
  // voltar pelo navegador (página guardada em cache) não pode ficar coberta
  addEventListener('pageshow', (e) => { if (e.persisted && Ink.isOn()) V.revealPage(); });

  /* =========================================================
     RODAPÉ
     ========================================================= */
  (() => {
    const fls = $$('.fl');
    fls.forEach((el, i) => {
      el.addEventListener('pointerenter', () => {
        if (gsap.isTweening(el)) return;
        gsap.timeline()
          .to(el, { y: -26, rotation: i % 2 ? 7 : -7, scaleY: 1.08, duration: 0.22, ease: 'power2.out', transformOrigin: '50% 100%' })
          .to(el, { y: 0, rotation: 0, scaleY: 0.86, scaleX: 1.08, duration: 0.2, ease: 'power2.in' })
          .to(el, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, .4)' });
      });
    });
    if (!reduce && fls.length) {
      const dot = $('.fl-dot');
      const bounce = gsap.timeline({ repeat: -1, repeatDelay: 0.5, paused: true })
        .to(dot, { y: -34, duration: 0.38, ease: 'power2.out', transformOrigin: '50% 100%' })
        .to(dot, { y: 0, duration: 0.32, ease: 'power2.in' })
        .to(dot, { scaleY: 0.78, scaleX: 1.18, duration: 0.09, ease: 'power1.out' })
        .to(dot, { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'elastic.out(1, .35)' });
      ScrollTrigger.create({ trigger: '.footer', start: 'top bottom', onToggle: (s) => (s.isActive ? bounce.play() : bounce.pause()) });
      gsap.from(fls, { yPercent: 60, autoAlpha: 0, stagger: 0.06, duration: 1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.footer__brand', start: 'top 95%' } });
    }

    const form = $('#news');
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = form.email;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim())) {
        form.classList.remove('is-error'); void form.offsetWidth; form.classList.add('is-error');
        inp.focus();
        return;
      }
      inp.value = '';
      V.toast('Anotado! Sua primeira carta colorida já está a caminho.');
    });

    const replay = $('#replayIntro');
    if (replay) replay.addEventListener('click', () => (V.playIntro ? V.playIntro(true) : V.go('index.html?abertura')));
  })();

  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
