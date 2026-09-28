/* =========================================================
   VERALU — abertura
   1) o nome "Veralu" cai letra por letra com física de verdade
      (gravidade, quique, achatamento no impacto e balanço até assentar)
   2) a tinta do site de referência (LXL) cobre a tela e revela o hero
   ========================================================= */
(() => {
  'use strict';

  const V = window.VERALU;
  if (!V || !V.heroEnter) return;
  const gsap = window.gsap;
  const { $, $$ } = V;

  const intro = $('#intro');
  const els = $$('.il', intro);
  const skipBtn = $('.intro__skip', intro);

  /* ---------- simulação física (pré-calculada, 120 quadros/s) ---------- */
  const HZ = 120;
  const T = 2.6;
  const N = Math.ceil(T * HZ);
  let tracks = null;
  let SETTLE = 2;

  /* ---------- posição: o nome ocupa o mesmo lugar do slide do modelo (quadro 1024×576) ---------- */
  const LOGO = { x: 47, y: 75, s: 2.457 };
  const PAD = 6;
  let boxes = null;
  let S = 1; // px na tela por unidade do desenho do logo
  function layout() {
    if (!boxes) boxes = els.map((el) => el.firstElementChild.getBBox());
    const W = innerWidth, H = innerHeight;
    const k = Math.min(W / 1024, H / 576);
    const ox = (W - 1024 * k) / 2, oy = (H - 576 * k) / 2;
    S = LOGO.s * k;
    els.forEach((el, i) => {
      const b = boxes[i];
      const w = b.width + PAD * 2, h = b.height + PAD * 2;
      el.setAttribute('viewBox', `${b.x - PAD} ${b.y - PAD} ${w} ${h}`);
      el.style.left = (ox + (LOGO.x + (b.x - PAD) * LOGO.s) * k).toFixed(1) + 'px';
      el.style.top = (oy + (LOGO.y + (b.y - PAD) * LOGO.s) * k).toFixed(1) + 'px';
      el.style.width = (w * S).toFixed(1) + 'px';
      el.style.height = (h * S).toFixed(1) + 'px';
      el.style.transformOrigin = `50% ${(((PAD + b.height) / h) * 100).toFixed(2)}%`; // base da letra
    });
  }
  addEventListener('resize', () => { if (running) { layout(); if (clockRef) applyFrame(clockRef.t); } });

  function simulate() {
    let last = 0;
    tracks = els.map((el, i) => {
      const dot = i === els.length - 1;
      const cfg = dot
        ? { delay: 0.6, drop: 430, e: 0.56, r0: 0, vr: 0 }
        : { delay: i * 0.075, drop: 560 + i * 22, e: 0.36, r0: (i % 2 ? 1 : -1) * (8 + ((i * 7) % 11)), vr: ((i * 37) % 70) - 35 };
      const arr = new Float32Array(N * 4);
      let y = -cfg.drop, vy = 0, rot = cfg.r0, vr = cfg.vr, sq = 0, vsq = 0, landed = false, rest = false;
      const g = 4200, sub = 4, h = 1 / (HZ * sub);
      for (let n = 0; n < N; n++) {
        for (let s = 0; s < sub; s++) {
          if ((n * sub + s) * h < cfg.delay) continue;
          if (!rest) {
            vy += g * h;
            y += vy * h;
            if (y >= 0 && vy > 0) {            // bateu no chão
              const v = vy;
              y = 0;
              vy = -v * cfg.e;                 // quica perdendo energia
              vsq += Math.min(v, 2600) * 0.0036; // achata com a força do impacto
              if (!landed) { landed = true; vr += (rot > 0 ? -1 : 1) * 40; }
              if (-vy < 110) { vy = 0; rest = true; }
            }
            if (!landed) rot += vr * h;        // gira solta no ar
          }
          if (landed) { vr += (-170 * rot - 9 * vr) * h; rot += vr * h; } // balança até assentar
          vsq += (-900 * sq - 17 * vsq) * h;
          sq += vsq * h;
        }
        const air = !rest && y < 0 ? Math.min(0.12, Math.abs(vy) * 0.00005) : 0; // estica caindo rápido
        const d = sq - air;
        arr[n * 4] = y;
        arr[n * 4 + 1] = rot;
        arr[n * 4 + 2] = 1 + d * 0.75;
        arr[n * 4 + 3] = 1 - d;
        if (y !== 0 || Math.abs(rot) > 0.25 || Math.abs(d) > 0.004) last = Math.max(last, n);
      }
      return arr;
    });
    SETTLE = Math.min(T, (last + 1) / HZ);
  }

  function applyFrame(t) {
    const n = Math.min(N - 1, Math.max(0, Math.floor(t * HZ)));
    const k = n * 4;
    tracks.forEach((a, i) => {
      els[i].style.transform =
        `translate3d(0, ${(a[k] * S).toFixed(1)}px, 0) rotate(${a[k + 1].toFixed(2)}deg) scale(${a[k + 2].toFixed(4)}, ${a[k + 3].toFixed(4)})`;
    });
  }

  /* ---------- fluxo ---------- */
  let clockRef = null;
  let tl = null;
  let running = false;
  let skipArmed = false;

  function finish() {
    running = false;
    tl = null;
    intro.style.display = 'none';
    intro.classList.remove('is-playing');
    V.lock(false);
    V.showHeader();
    window.ScrollTrigger.refresh();
  }

  function skip() {
    if (!running || !tl) return;
    tl.kill();
    V.ink.hide();
    V.heroEnter(true);
    gsap.to(intro, { autoAlpha: 0, duration: 0.5, ease: 'power2.out', onComplete: finish });
  }
  skipBtn.addEventListener('click', skip);
  // rolar ou apertar espaço acelera; Esc pula
  const hurry = () => { if (running && skipArmed && tl) gsap.to(tl, { timeScale: 3, duration: 0.25, overwrite: true }); };
  addEventListener('wheel', hurry, { passive: true });
  addEventListener('touchmove', hurry, { passive: true });
  addEventListener('keydown', (e) => {
    if (!running || !skipArmed) return;
    if (e.key === 'Escape') skip();
    else if ([' ', 'ArrowDown', 'PageDown', 'Enter'].includes(e.key)) hurry();
  });

  function play() {
    if (running) return;
    running = true;
    skipArmed = false;
    setTimeout(() => (skipArmed = true), 600);
    V.lenis.scrollTo(0, { immediate: true, force: true });
    scrollTo(0, 0);
    V.lock(true);
    intro.style.display = '';
    gsap.set(intro, { autoAlpha: 1 });
    gsap.set(skipBtn, { autoAlpha: 0 });
    layout();
    if (!tracks) simulate();
    const clock = (clockRef = { t: 0 });
    const apply = () => applyFrame(clock.t);
    apply();
    intro.classList.add('is-playing');

    // "rever abertura" vindo de outra página: a tinta que cobre a tela se abre sobre o amarelo
    const lead = V.ink.isOn() ? 0.55 : 0;
    tl = gsap.timeline();
    if (lead) tl.add(V.ink.reveal(), 0);
    tl.to(clock, { t: SETTLE, duration: SETTLE, ease: 'none', onUpdate: apply }, lead)
      .to(skipBtn, { autoAlpha: 1, duration: 0.5 }, lead + 0.6)
      .addLabel('ink', lead + SETTLE + 0.2)
      .to(skipBtn, { autoAlpha: 0, duration: 0.25 }, 'ink')
      .add(V.ink.cover(() => { intro.style.display = 'none'; }), 'ink')
      .add(V.ink.reveal(), 'ink+=1')
      .call(() => V.heroEnter(true), null, 'ink+=1.3')
      .call(finish, null, 'ink+=2.3');
  }
  V.playIntro = () => play();
  V.introTimeline = () => tl;

  /* ---------- começo ---------- */
  const q = location.search;
  const forced = /[?&]abertura\b/.test(q);
  const nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  const back = !!nav && nav.type === 'back_forward';
  if (V.reduce || /[?&]nointro\b/.test(q)) {
    intro.style.display = 'none';
    if (back) V.restoreScroll(); else V.applyHash();
    V.heroEnter();
    V.showHeader();
  } else if ((V.inkIn || back) && !forced) {
    // veio de outra página do site (ou voltou pelo navegador): nada de abertura,
    // a tinta já cobre a tela e só se abre — no mesmo ponto da página, se voltou
    intro.style.display = 'none';
    V.showHeader();
    const go = () => {
      if (back) V.restoreScroll(); else V.applyHash();
      V.revealPage(() => V.heroEnter());
    };
    (document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]) : Promise.resolve()).then(go);
  } else if (V.homeHash && !forced) {
    intro.style.display = 'none';
    V.applyHash();
    V.heroEnter();
    V.showHeader();
  } else {
    const go = () => requestAnimationFrame(play);
    (document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve()).then(go);
  }
})();
