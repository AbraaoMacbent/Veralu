/* =========================================================
   VERALU — página de cada sketchbook (produto.html?id=...)
   ========================================================= */
(() => {
  'use strict';

  const D = window.VERALU_DATA;
  if (!D) return;
  const V = window.VERALU; // sem internet o núcleo não sobe, mas a página ainda mostra o produto
  const gsap = window.gsap;
  const anim = !!(V && gsap && !V.reduce);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const p = D.byId[new URLSearchParams(location.search).get('id')];
  const moreGrid = $('#moreGrid');

  /* ---------- vitrine "você também pode gostar" ---------- */
  function renderMore(list) {
    list.forEach((q) => {
      const li = document.createElement('li');
      li.className = 'card';
      if (V) { li.innerHTML = V.cardHTML(q); V.bindCard(li, q); }
      else li.innerHTML = `<a class="card__title" href="${D.productUrl(q.id)}">${q.name}</a>`;
      moreGrid.appendChild(li);
    });
    if (!anim) return;
    gsap.set('.more .card__inner', { y: 70, opacity: 0, rotate: () => V.rand(-3, 3) });
    window.ScrollTrigger.batch('.more .card__inner', {
      start: 'top 92%', once: true,
      onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, rotate: 0, duration: 0.9, ease: 'back.out(1.4)', stagger: 0.08 }),
    });
  }

  function start(enter) {
    if (!V) return;
    V.showHeader();
    if (V.inkIn) V.revealPage(enter);
    else if (enter) requestAnimationFrame(enter);
  }

  /* ---------- link antigo / id que não existe ---------- */
  if (!p) {
    document.title = 'Sketchbook não encontrado — Veralu';
    $('#crumbName').textContent = 'não encontrado';
    $('#pdp').outerHTML = `<div class="pdp__missing">
      <svg><use href="#mascot"/></svg>
      <h1>Esse sketchbook fugiu da estante.</h1>
      <p>O link pode estar antigo. Que tal conhecer os outros?</p>
      <a class="btn btn--primary" href="index.html#loja">ver sketchbooks</a>
    </div>`;
    $('#moreTitle').textContent = 'Todos os sketchbooks';
    renderMore(D.PRODUCTS);
    start();
    return;
  }

  /* ---------- conteúdo ---------- */
  const short = p.name.replace(/^Sketchbook /, '');
  document.title = `${p.name} — Veralu`;
  $('#crumbName').textContent = short;
  $('#pArtist').textContent = '@' + p.artist;
  $('#pTitle').textContent = p.name;
  $('#pDesc').textContent = p.desc;
  $('#gallery').style.setProperty('--accent', p.accent);
  const coverImg = $('.shot--cover .book__cover img');
  coverImg.src = p.img;
  coverImg.alt = `Capa do ${p.name}`;
  [$('.shot--detail img'), $('.b3--front img'), $('.spread__sketch')].forEach((im) => (im.src = p.img));
  $('.shot--detail img').alt = `Detalhe da arte do ${p.name}`;
  $('#accPaper').innerHTML = `<ul>${D.PAPERS.map((x) => `<li><b>${x.label}</b>: ${x.about}</li>`).join('')}</ul>`;
  $('#accArtist').innerHTML = `<p>Este sketchbook nasceu de uma colab com <b>@${p.artist}</b>. ${p.desc}</p><p>Parte do valor de cada unidade vai direto para quem criou a arte.</p>`;

  /* ---------- escolhas: tamanho, papel, quantidade ---------- */
  const st = { size: D.SIZES[0].id, paper: D.PAPERS[0].id, qty: 1 };
  $('#sizes').innerHTML = D.SIZES.map((s) => `
    <label class="size size--${s.id}">
      <input type="radio" name="size" value="${s.id}">
      <span class="size__ico"></span>
      <span class="size__txt"><b>${s.label}</b><small>${s.dims}</small></span>
      ${s.extra ? `<span class="size__extra">+ ${D.money(s.extra)}</span>` : ''}
    </label>`).join('');
  $('#papers').innerHTML = D.PAPERS.map((x) => `
    <label class="swatch" style="--tone:${x.tone}">
      <input type="radio" name="paper" value="${x.id}">
      <i></i>${x.label}${x.extra ? ` <small>+ ${D.money(x.extra)}</small>` : ''}
    </label>`).join('');

  const priceEl = $('#pPrice');
  const pages = $$('.spread__page');
  const turn = $('.spread__turn');
  const paperOf = (id) => D.PAPERS.find((x) => x.id === id) || D.PAPERS[0];
  const sizeOf = (id) => D.SIZES.find((x) => x.id === id) || D.SIZES[0];

  function sync(changed) {
    $$('#sizes .size').forEach((l) => {
      const on = $('input', l).value === st.size;
      l.classList.toggle('is-on', on);
      $('input', l).checked = on;
    });
    $$('#papers .swatch').forEach((l) => {
      const on = $('input', l).value === st.paper;
      l.classList.toggle('is-on', on);
      $('input', l).checked = on;
    });
    const paper = paperOf(st.paper);
    const size = sizeOf(st.size);
    $('#sizeVal').textContent = `${size.label} · ${size.dims}`;
    $('#paperVal').textContent = paper.label;
    $('#paperAbout').textContent = paper.about;
    $('#paperCaption').textContent = `miolo em ${paper.label}`;
    const unit = D.priceOf(p, st.size, st.paper);
    $('#pInstall').textContent = `${size.label} · ${paper.label}` + (st.qty > 1 ? ` · ${st.qty} × ${D.money(unit)}` : '');
    const txt = D.money(unit * st.qty);
    if (priceEl.textContent !== txt) {
      priceEl.textContent = txt;
      if (anim && changed) gsap.fromTo(priceEl, { yPercent: -45, rotate: -4, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 0.55, ease: 'back.out(2.4)' });
    }
    $('#qtyN').textContent = st.qty;
  }

  // trocar o papel vira a página do miolo aberto, revelando a nova cor
  let tone = paperOf(st.paper).tone;
  pages.forEach((pg) => (pg.style.backgroundColor = tone));
  function setTone(next) {
    if (next === tone) return;
    const from = tone;
    tone = next;
    if (!anim) { pages.forEach((pg) => (pg.style.backgroundColor = next)); return; }
    turn.style.setProperty('--from', from);
    turn.style.setProperty('--to', next);
    pages[1].style.backgroundColor = next;
    gsap.killTweensOf(turn);
    gsap.fromTo(turn, { rotationY: 0, autoAlpha: 1 }, {
      rotationY: -180, duration: 0.95, ease: 'power2.inOut',
      onComplete: () => { pages[0].style.backgroundColor = next; gsap.set(turn, { autoAlpha: 0 }); },
    });
  }

  $('#sizes').addEventListener('change', (e) => {
    st.size = e.target.value;
    sync(true);
    if (anim) gsap.fromTo('.shot--cover .shot__stage', { scale: st.size === 'A4' ? 0.9 : 1.08 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, .5)', clearProps: 'transform' });
  });
  $('#papers').addEventListener('change', (e) => {
    st.paper = e.target.value;
    sync(true);
    setTone(paperOf(st.paper).tone);
  });
  $$('.buy [data-qty]').forEach((b) => b.addEventListener('click', () => {
    st.qty = Math.max(1, Math.min(20, st.qty + +b.dataset.qty));
    sync(true);
    if (anim) gsap.fromTo('#qtyN', { scale: 1.5 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
  }));
  sync(false);

  /* ---------- comprar / sacola / favorito ---------- */
  const addBtn = $('#addBag');
  const favBtn = $('#pFav');
  if (V) {
    addBtn.addEventListener('click', () => {
      V.cart.add(p.id, st.size, st.paper, st.qty, coverImg);
      addBtn.textContent = 'foi pra sacola!';
      clearTimeout(addBtn._t);
      addBtn._t = setTimeout(() => (addBtn.textContent = 'Adicionar à sacola'), 1600);
    });
    $('#buyNow').addEventListener('click', () => {
      V.cart.add(p.id, st.size, st.paper, st.qty, coverImg, { quiet: true });
      V.cart.open();
    });
    const syncFav = () => {
      const on = V.favs.has(p.id);
      favBtn.classList.toggle('is-on', on);
      favBtn.setAttribute('aria-pressed', on);
      favBtn.setAttribute('aria-label', on ? 'Tirar dos favoritos' : 'Favoritar');
    };
    favBtn.addEventListener('click', (e) => V.favs.toggle(p.id, e.currentTarget));
    V.favs.onChange((id) => { if (id === p.id) syncFav(); });
    syncFav();
  } else {
    $$('.buy__row, #buyNow').forEach((el) => (el.hidden = true));
  }

  /* ---------- galeria: folhear, lupa e giro ---------- */
  if (V && !V.finePointer) {
    // no toque não existe "passar o mouse": um toque abre a capa, outro fecha
    const cover = $('.shot--cover');
    $('figcaption', cover).textContent = 'toque para folhear';
    cover.addEventListener('click', () => cover.classList.toggle('is-peek'));
  }
  if (V && V.finePointer) {
    const cover = $('.shot--cover');
    const book = $('.book', cover);
    let r = null;
    cover.addEventListener('pointerenter', () => (r = cover.getBoundingClientRect()));
    cover.addEventListener('pointermove', (e) => {
      if (!r) r = cover.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      book.style.setProperty('--ry', (px * 30).toFixed(2) + 'deg');
      book.style.setProperty('--rx', (-py * 20).toFixed(2) + 'deg');
      book.style.setProperty('--shine', (px * 80).toFixed(1) + '%');
    });
    cover.addEventListener('pointerleave', () => {
      r = null;
      book.style.setProperty('--ry', '0deg');
      book.style.setProperty('--rx', '0deg');
    });

    const detail = $('.shot--detail');
    const dImg = $('img', detail);
    let dr = null;
    detail.addEventListener('pointerenter', () => (dr = detail.getBoundingClientRect()));
    detail.addEventListener('pointermove', (e) => {
      if (!dr) dr = detail.getBoundingClientRect();
      dImg.style.setProperty('--zx', (((e.clientX - dr.left) / dr.width) * 100).toFixed(1) + '%');
      dImg.style.setProperty('--zy', (((e.clientY - dr.top) / dr.height) * 100).toFixed(1) + '%');
    });
    detail.addEventListener('pointerleave', () => (dr = null));

    const side = $('.shot--side');
    const block = $('.block3d', side);
    let sr = null;
    side.addEventListener('pointerenter', () => (sr = side.getBoundingClientRect()));
    side.addEventListener('pointermove', (e) => {
      if (!sr) sr = side.getBoundingClientRect();
      const px = (e.clientX - sr.left) / sr.width - 0.5;
      const py = (e.clientY - sr.top) / sr.height - 0.5;
      block.style.setProperty('--hy', (px * 70).toFixed(1) + 'deg');
      block.style.setProperty('--hx', (-py * 24).toFixed(1) + 'deg');
    });
    side.addEventListener('pointerleave', () => {
      sr = null;
      block.style.setProperty('--hy', '0deg');
      block.style.setProperty('--hx', '0deg');
    });
    // rolou com o mouse parado em cima: mede de novo no próximo movimento
    addEventListener('scroll', () => { r = dr = sr = null; }, { passive: true });
  }

  // celular: bolinhas acompanham a galeria deslizável
  const gallery = $('#gallery');
  const dots = $$('.gallery__dots i');
  let dotCur = 0;
  gallery.addEventListener('scroll', () => {
    const shot = gallery.firstElementChild;
    const step = shot.offsetWidth + 10;
    const i = Math.max(0, Math.min(dots.length - 1, Math.round(gallery.scrollLeft / step)));
    if (i === dotCur) return;
    dots[dotCur].classList.remove('is-on');
    dots[(dotCur = i)].classList.add('is-on');
  }, { passive: true });

  /* ---------- acordeões com altura animada ---------- */
  $$('.acc details').forEach((d) => {
    const body = $('.acc__body', d);
    $('summary', d).addEventListener('click', (e) => {
      if (!anim) return; // comportamento nativo
      e.preventDefault();
      gsap.killTweensOf(body);
      const done = () => { gsap.set(body, { clearProps: 'height' }); window.ScrollTrigger.refresh(); };
      if (d.open) {
        gsap.to(body, { height: 0, duration: 0.42, ease: 'power2.inOut', onComplete: () => { d.open = false; done(); } });
      } else {
        d.open = true;
        gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: 0.6, ease: 'power3.out', onComplete: done });
        gsap.from($('div', body).children, { y: 12, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.04, clearProps: 'all' });
      }
    });
  });

  /* ---------- sugestões: mesmo tema primeiro ---------- */
  const others = D.PRODUCTS.filter((q) => q.id !== p.id);
  const score = (q) => q.tema.filter((t) => p.tema.includes(t)).length;
  renderMore([...others].sort((a, b) => score(b) - score(a) || a.rank - b.rank).slice(0, 4));

  /* ---------- entrada ---------- */
  function enter() {
    if (!anim) return;
    gsap.from('.crumbs', { y: 16, autoAlpha: 0, duration: 0.7, ease: 'power3.out', clearProps: 'all' });
    gsap.from('.shot', { y: 60, autoAlpha: 0, rotate: (i) => (i % 2 ? 2 : -2), duration: 1, ease: 'power3.out', stagger: 0.08, clearProps: 'all' });
    gsap.from('.shot--cover .shot__stage', { yPercent: 16, rotate: -7, scale: 0.86, duration: 1.3, ease: 'back.out(1.5)', delay: 0.12, clearProps: 'transform' });
    gsap.from('.buy > *', { y: 26, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.045, delay: 0.1, clearProps: 'all' });
  }
  start(enter);
})();
