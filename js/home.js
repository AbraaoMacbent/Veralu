/* =========================================================
   VERALU — home: hero, essência, vitrine (filtros) e navegação
   ========================================================= */
(() => {
  'use strict';

  const V = window.VERALU;
  if (!V) return;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Flip = window.Flip;
  const { $, $$, clamp, lerp, rand, smooth, reduce, NS, D, lenis } = V;

  /* ---------------------------------------------------------
     Posições "naturais" das seções (elas são sticky)
     --------------------------------------------------------- */
  const hero = $('.hero');
  const ess = $('.essencia');
  const loja = $('.loja');
  const tops = { manifesto: 0, essencia: 0, loja: 0, heroH: 0 };
  const measureTops = () => {
    tops.heroH = hero.offsetHeight;
    tops.essencia = tops.heroH;
    tops.loja = tops.heroH + ess.offsetHeight;
  };
  measureTops();
  V.scrollToSection = (id, opts = {}) => {
    const y = (tops[id] || 0) + (opts.offset || 0);
    lenis.scrollTo(y, { duration: opts.immediate ? 0 : 1.6, immediate: !!opts.immediate, force: true, lock: false });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const m = a.getAttribute('href').match(/^(?:index\.html)?#(manifesto|essencia|loja)$/);
    if (!m) return;
    e.preventDefault();
    V.scrollToSection(m[1], { offset: m[1] === 'loja' ? 40 : 0 });
  });

  /* =========================================================
     HERO
     ========================================================= */
  const Hero = (() => {
    const ART = window.VERALU_ART;
    const PH = ART.phrase;
    const spWrap = $('.hero__spirals');
    const st = {
      W: 0, H: 0, s: 1, portrait: false, chaos: 0, visible: true,
      caosA: 0, caosHover: 0, caosFrame: 0, caosAcc: 0, caosT: '', entered: false,
    };

    /* ---- espirais: só as 5 que estão inteiras no modelo (as outras eram pedaços
       recortados para esconder sobreposições). Cada lado da frase ganha uma coluna
       em zigue-zague, com espaço entre elas, e cada uma gira devagar em torno do
       próprio centro (CSS, na GPU) — nunca saem do lugar, então nunca se misturam.
       [espiral, lado, fx (0 = borda da tela → 1 = beira da frase), fy (0 = topo → 1 = base),
        raio (fração da altura da faixa), espelhada, segundos por volta] ---- */
    const PLACE = [
      [0, -1, 0.18, 0.10, 0.22, false, 86], [9, -1, 0.70, 0.47, 0.155, true, 58],
      [7, -1, 0.22, 0.86, 0.21, false, 74], [8, -1, 0.02, 0.48, 0.10, true, 50],
      [8, 1, 0.18, 0.12, 0.22, false, 80], [0, 1, 0.70, 0.50, 0.15, true, 62],
      [6, 1, 0.20, 0.87, 0.21, false, 92], [9, 1, 0.02, 0.46, 0.10, false, 54],
    ];
    const radius = (d, cx, cy) => { // maior distância do centro da espiral até o traço
      const n = d.match(/-?\d*\.?\d+/g).map(Number);
      let r = 0;
      for (let k = 0; k < n.length - 1; k += 2) r = Math.max(r, Math.hypot(n[k] - cx, n[k + 1] - cy));
      return r + 5;
    };
    const units = PLACE.map(([src, side, fx, fy, fr, mirror, secs], i) => {
      const art = ART.spirals[src];
      const [cx, cy] = art.c;
      const R = radius(art.d, cx, cy);
      const svg = document.createElementNS(NS, 'svg');
      const p = document.createElementNS(NS, 'path');
      svg.setAttribute('class', 'sp');
      svg.setAttribute('viewBox', `${cx - R} ${cy - R} ${2 * R} ${2 * R}`);
      p.setAttribute('d', art.d);
      if (mirror) p.setAttribute('transform', `translate(${2 * cx} 0) scale(-1 1)`);
      svg.appendChild(p);
      spWrap.appendChild(svg);
      svg.style.setProperty('--r0', ((i * 137) % 360) + 'deg');
      svg.style.setProperty('--spin', secs + 's');
      svg.style.setProperty('--in', (0.05 + (i % 3) * 0.12) + 's');
      if (i % 2) svg.style.animationDirection = 'reverse';
      return { el: svg, side, fx, fy, fr };
    });

    const phraseEl = $('.hero__phrase');
    const logoEl = $('.hero__logo');
    function layout() {
      st.W = hero.clientWidth; st.H = hero.clientHeight;
      const { W, H } = st;
      st.portrait = W / H < 0.9;
      // faixa livre ao lado da frase (medida sem as transformações da rolagem)
      let band, U, pos;
      if (!st.portrait) {
        band = Math.max(W * 0.12, (W - phraseEl.offsetWidth) / 2);
        U = Math.min(H, band * 2.5);
        pos = (u) => [u.side < 0 ? u.fx * band : W - u.fx * band, u.fy * H];
      } else {
        // celular: as colunas viram faixas em cima e embaixo do texto
        const content = logoEl.clientHeight + parseFloat(getComputedStyle(logoEl).marginBottom) + phraseEl.offsetHeight;
        const lift = $('.essencia__wave').offsetHeight * 0.7; // a faixa de baixo sobe para não sumir atrás da onda
        band = Math.max(H * 0.14, (H - content) / 2 - 10);
        const low = band - lift;
        U = Math.min(W, low * 2.5);
        pos = (u) => [u.fy * W, u.side < 0 ? u.fx * band : H - lift - u.fx * low];
      }
      units.forEach((u) => {
        const [X, Y] = pos(u);
        const half = u.fr * U;
        u.el.style.width = u.el.style.height = (half * 2).toFixed(1) + 'px';
        u.el.style.translate = `${(X - half).toFixed(1)}px ${(Y - half).toFixed(1)}px`;
      });
      rectDirty = true;
    }

    // giro: rolar a página ou clicar no CAOS acelera, sempre no mesmo lugar
    const spin = { scroll: 0, chaos: 0 };
    let spinAnims = null;
    const setSpin = () => {
      if (!spinAnims) spinAnims = units.map((u) => u.el.getAnimations().find((a) => a.animationName === 'spin')).filter(Boolean);
      const rate = 1 + spin.scroll + spin.chaos;
      spinAnims.forEach((a) => (a.playbackRate = rate));
    };
    const toScroll = gsap.quickTo(spin, 'scroll', { duration: 0.6, ease: 'power2.out', onUpdate: setSpin });
    let calm = null;
    lenis.on('scroll', ({ velocity }) => {
      if (!st.visible || reduce) return;
      toScroll(Math.min(5, Math.abs(velocity) * 0.35));
      if (calm) calm.kill();
      calm = gsap.delayedCall(0.15, () => toScroll(0)); // parou de rolar: volta ao giro calmo
    });

    /* ---- frase manuscrita ---- */
    const phSvg = $('.hero__phrase svg');
    const phLetters = $('#phLetters');
    const [vx, vy, vw, vh] = PH.viewBox;
    phSvg.setAttribute('viewBox', PH.viewBox.join(' '));
    PH.glyphs.forEach(([line, d]) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('data-line', line);
      phLetters.appendChild(p);
    });
    let letters = [];
    function measureLetters() {
      letters = [...phLetters.children].map((el) => {
        const b = el.getBBox();
        return {
          el, cx: b.x + b.width / 2, cy: b.y + b.height / 2, by: b.y + b.height,
          line: +el.getAttribute('data-line'),
          a: reduce ? 1 : 0, r0: rand(-35, 35), rs: Math.random() < 0.5 ? -1 : 1,
          f: 0, sc: 1, ty: 0, rot: 0, k: 0, kick: 0,
        };
      }).sort((A, B) => A.line - B.line || A.cx - B.cx);
    }

    /* ---- CAOS: 5 desenhos empilhados ---- */
    const caos = $('.ph-caos');
    const C = PH.caos;
    Object.assign(caos.style, {
      left: ((C.x - vx) / vw) * 100 + '%', top: ((C.y - vy) / vh) * 100 + '%',
      width: (C.w / vw) * 100 + '%', height: (C.h / vh) * 100 + '%',
    });
    const caosImgs = $$('img', caos);
    const showFrame = (i) => caosImgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
    caosImgs.forEach((im) => im.decode && im.decode().catch(() => {}));
    caos.addEventListener('pointerenter', () => gsap.to(st, { caosHover: 1, duration: 0.3 }));
    caos.addEventListener('pointerleave', () => gsap.to(st, { caosHover: 0, duration: 0.6 }));
    caos.addEventListener('click', () => {
      gsap.fromTo(st, { chaos: 1 }, { chaos: 0, duration: 2.4, ease: 'power3.out' });
      if (!reduce) gsap.fromTo(spin, { chaos: 10 }, { chaos: 0, duration: 2.6, ease: 'power3.out', onUpdate: setSpin });
      letters.forEach((L) => {
        L.kick = rand(-1, 1);
        gsap.fromTo(L, { k: 1 }, { k: 0, duration: 1.2, ease: 'elastic.out(1, .35)' });
      });
    });

    /* ---- ponteiro ---- */
    let pointer = null, px = 0, py = 0, pIn = false, rectDirty = true, rect = null;
    hero.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; pIn = true; }, { passive: true });
    hero.addEventListener('pointerleave', () => { pIn = false; pointer = null; });
    lenis.on('scroll', () => (rectDirty = true));

    /* ---- loop (só escreve o que mudou) ---- */
    function frame(time, dt) {
      if (!st.visible) return;
      if (pIn && st.entered) {
        if (rectDirty || !rect) { rect = phSvg.getBoundingClientRect(); rectDirty = false; }
        pointer = { x: vx + ((px - rect.left) / rect.width) * vw, y: vy + ((py - rect.top) / rect.height) * vh };
      }
      for (const L of letters) {
        let f = 0;
        if (pointer && st.entered) {
          const d = Math.hypot(pointer.x - L.cx, pointer.y - L.cy);
          f = smooth(clamp(1 - d / 62, 0, 1));
        }
        L.f = lerp(L.f, f, 0.18);
        const k = L.k, a = L.a;
        const sc = Math.max(0, a) * (1 + 0.32 * L.f + 0.25 * k);
        const ty = (1 - Math.min(a, 1)) * 26 - 7 * L.f + k * L.kick * 14;
        const rot = (1 - Math.min(a, 1)) * L.r0 + L.rs * 11 * L.f + k * L.kick * 30;
        if (Math.abs(sc - L.sc) < 0.0005 && Math.abs(ty - L.ty) < 0.01 && Math.abs(rot - L.rot) < 0.01) continue;
        L.sc = sc; L.ty = ty; L.rot = rot;
        L.el.setAttribute('transform', `translate(${L.cx.toFixed(1)} ${(L.by + ty).toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${sc.toFixed(4)}) translate(${(-L.cx).toFixed(1)} ${(-L.by).toFixed(1)})`);
      }

      const fps = 6 + st.caosHover * 10 + st.chaos * 22;
      st.caosAcc += dt * fps;
      if (st.caosAcc >= 1) {
        st.caosAcc = 0;
        st.caosFrame = (st.caosFrame + 1 + (st.caosHover > 0.5 ? Math.floor(rand(0, 3)) : 0)) % 5;
        showFrame(st.caosFrame);
      }
      const j = st.caosHover * 3 + st.chaos * 8;
      const cs = Math.max(0, st.caosA) * (1 + st.caosHover * 0.06 + st.chaos * 0.12);
      const T = j
        ? `translate3d(${rand(-j, j).toFixed(1)}px, ${(rand(-j, j) * 0.6).toFixed(1)}px, 0) rotate(${(rand(-j, j) * 0.6).toFixed(2)}deg) scale(${cs.toFixed(4)})`
        : `scale(${cs.toFixed(4)})`;
      if (T !== st.caosT) { st.caosT = T; caos.style.transform = T; }
    }

    let entering = false;
    function enter(force) {
      if ((st.entered || entering) && !force) return;
      entering = true;
      if (force) {
        st.entered = false;
        gsap.killTweensOf([...letters, st]);
        letters.forEach((L) => { L.a = 0; L.k = 0; });
        st.caosA = 0; st.chaos = 0;
        hero.classList.remove('is-spun');
        void hero.offsetWidth; // recomeça a entrada das espirais
      }
      hero.classList.add('is-spun'); // espirais surgem no próprio lugar (transição CSS)
      if (reduce) {
        st.entered = true; st.caosA = 1; entering = false;
        letters.forEach((L) => (L.a = 1));
        gsap.set('.hero__logo', { autoAlpha: 1 });
        return;
      }
      gsap.fromTo('.hero__logo', { y: -30, scale: 0.7, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 1.1, ease: 'back.out(2.2)', delay: 0.1 });
      letters.forEach((L, i) => gsap.to(L, { a: 1, duration: 0.75, ease: 'back.out(2.4)', delay: 0.25 + i * 0.03 }));
      gsap.to(st, { caosA: 1, duration: 1.4, ease: 'elastic.out(1, .4)', delay: 0.35 + letters.length * 0.03 });
      setTimeout(() => { st.entered = true; entering = false; }, 1500);
    }

    function init() {
      layout();
      measureLetters();
      if (!reduce) gsap.set('.hero__logo', { autoAlpha: 0 });
      gsap.ticker.add((time, dms) => frame(time, Math.min(dms, 50) / 1000));
      addEventListener('resize', layout);

      const tl = { trigger: ess, start: 'top bottom', end: 'top top', scrub: true };
      gsap.to('.hero__inner', { scale: 0.86, yPercent: -7, ease: 'none', scrollTrigger: tl });
      gsap.to('.hero__shade', { opacity: 0.72, ease: 'none', scrollTrigger: { ...tl } });
      ScrollTrigger.create({
        trigger: ess, start: 'top top',
        onEnter: () => { st.visible = false; hero.classList.add('is-off'); },
        onLeaveBack: () => { st.visible = true; hero.classList.remove('is-off'); },
      });
    }
    return { init, enter };
  })();
  V.heroEnter = Hero.enter;

  /* =========================================================
     ESSÊNCIA — onda, texto e o grito
     ========================================================= */
  const Essencia = (() => {
    const spots = $('.essencia__spots');
    const qL = $('.q--l');
    const qR = $('.q--r');
    const grito = $('#grito');
    const img = $('.grito__img');
    const burst = $('.grito__burst');
    const fx = V.fx;
    let visible = false;

    // explosão pontuda (atrás do personagem)
    (() => {
      const n = 26;
      let d = '';
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = i % 2 ? rand(48, 60) : rand(86, 100);
        d += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1);
      }
      $('path', burst).setAttribute('d', d + 'Z');
    })();

    // onda periódica desenhada uma vez; o movimento é só um deslizar na GPU (CSS)
    (() => {
      const pts = [];
      for (let x = 0; x <= 2880; x += 60) {
        const t = (x / 1440) * Math.PI * 2;
        pts.push([x, 46 + Math.sin(t * 2 + 0.6) * 14 + Math.sin(t * 5 + 1.9) * 6 + Math.sin(t * 1 + 4.1) * 10]);
      }
      $('.essencia__wave path').setAttribute('d', `M0 90 L0 ${pts[0][1].toFixed(1)}` + V.curve(pts) + ' L2880 90 Z');
    })();

    /* ---- grito ---- */
    const MOUTH = { x: 0.492, y: 0.585 };
    const S = { I: 0, v: 0, target: 0, emit: 0, ring: 0, seq: 0, downAt: 0, idle: true };
    const SEQ = 'AAAAAAAAAAAAH!!';
    const parts = [];
    const M = { x: 0, y: 0, w: 600 };
    const readMouth = () => {
      const r = img.getBoundingClientRect();
      M.x = r.left + r.width * MOUTH.x; M.y = r.top + r.height * MOUTH.y; M.w = r.width;
    };

    function spawnLetter(power = 1) {
      const el = document.createElement('span');
      el.className = 'fx-letter';
      el.textContent = SEQ[S.seq++ % SEQ.length];
      const size = rand(26, 70) * (0.7 + power * 0.5) * clamp(M.w / 600, 0.6, 1.2);
      el.style.fontSize = size + 'px';
      const pal = Math.random();
      if (pal < 0.45) el.style.color = 'var(--yellow)';
      else if (pal < 0.8) el.style.color = 'var(--cream)';
      else el.classList.add('is-outline');
      const ang = rand(-Math.PI * 0.95, -Math.PI * 0.05) + (Math.random() < 0.25 ? Math.PI * rand(0.15, 0.35) * (Math.random() < 0.5 ? -1 : 1) : 0);
      const sp = rand(420, 980) * (0.7 + power * 0.4);
      const p = {
        el, x: M.x - size * 0.3, y: M.y - size * 0.5, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        r: rand(-30, 30), vr: rand(-260, 260), s: 0.3, life: 0, max: rand(1.1, 1.7),
      };
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${p.r.toFixed(1)}deg) scale(${p.s})`;
      fx.appendChild(el);
      parts.push(p);
    }
    function spawnRing() {
      const el = document.createElement('i');
      el.className = 'fx-ring';
      el.style.setProperty('--x', M.x + 'px');
      el.style.setProperty('--y', M.y + 'px');
      el.addEventListener('animationend', () => el.remove());
      fx.appendChild(el);
    }

    function start() {
      if (!visible) return;
      S.target = 1; S.downAt = performance.now();
      if (S.I < 0.15) { readMouth(); for (let i = 0; i < 4; i++) spawnLetter(1.1); }
    }
    function stop() {
      const held = performance.now() - S.downAt;
      const release = () => { S.target = 0; };
      if (held < 420) setTimeout(release, 420 - held); else release();
    }
    V.scream = (ms = 900) => { start(); setTimeout(stop, ms); };

    grito.addEventListener('pointerdown', (e) => { e.preventDefault(); start(); });
    addEventListener('pointerup', () => { if (S.target) stop(); });
    grito.addEventListener('pointercancel', () => { if (S.target) stop(); });
    grito.addEventListener('contextmenu', (e) => e.preventDefault());
    grito.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
    grito.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });

    function frame(time, dt) {
      if (visible && S.target) readMouth();
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        p.vy += 1100 * dt;
        p.vx *= 0.995;
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        p.s = lerp(p.s, 1.15, 0.12);
        const k = p.life / p.max;
        if (k > 0.65) p.el.style.opacity = (1 - (k - 0.65) / 0.35).toFixed(3);
        p.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${p.r.toFixed(1)}deg) scale(${p.s.toFixed(3)})`;
        if (k >= 1) { p.el.remove(); parts.splice(i, 1); }
      }
      if (!visible) return;

      const k = S.target ? 70 : 26;
      const c = S.target ? 10 : 9;
      S.v += ((S.target - S.I) * k - S.v * c) * dt;
      S.I += S.v * dt;
      const I = clamp(S.I, 0, 1.35);
      if (I < 0.002 && !S.target) {
        if (!S.idle) {
          S.idle = true;
          img.style.transform = ''; burst.style.transform = '';
          qL.style.transform = ''; qR.style.transform = '';
          spots.style.setProperty('--ss', 1);
          ess.classList.remove('is-screaming');
        }
        return;
      }
      S.idle = false;
      const sh = I * 9;
      img.style.transform = `translate3d(${rand(-sh, sh).toFixed(1)}px, ${rand(-sh, sh).toFixed(1)}px, 0) rotate(${rand(-I * 2.2, I * 2.2).toFixed(2)}deg) scale(${(1 + I * 0.065).toFixed(4)})`;
      burst.style.transform = `translate(-50%, -50%) scale(${(I * 1.05).toFixed(3)}) rotate(${((time * 50) % 360).toFixed(1)}deg)`;
      const ts = I * 4;
      qL.style.transform = `translate3d(${rand(-ts, ts).toFixed(1)}px, ${rand(-ts, ts).toFixed(1)}px, 0)`;
      qR.style.transform = `translate3d(${rand(-ts, ts).toFixed(1)}px, ${rand(-ts, ts).toFixed(1)}px, 0)`;
      spots.style.setProperty('--ss', (1 + I * 0.09).toFixed(4));
      ess.classList.toggle('is-screaming', I > 0.25);
      if (S.target && I > 0.3) {
        S.emit += dt * (8 + 18 * I) * (V.lite ? 0.6 : 1);
        while (S.emit >= 1) { S.emit -= 1; spawnLetter(I); }
        S.ring += dt;
        if (S.ring > 0.17) { S.ring = 0; spawnRing(); }
      }
    }

    const setVisible = (v) => { visible = v; ess.classList.toggle('is-off', !v); };
    function init() {
      gsap.ticker.add((time, dms) => frame(time, Math.min(dms, 50) / 1000));
      setVisible(false);
      ScrollTrigger.create({ trigger: ess, start: 'top bottom', end: 'bottom top', onToggle: (s) => setVisible(s.isActive) });
      ScrollTrigger.create({ trigger: loja, start: 'top top', onEnter: () => setVisible(false), onLeaveBack: () => setVisible(true) });
      if (!reduce) {
        const reveal = { trigger: ess, start: 'top 55%' };
        gsap.from('.q--l .line > span', { yPercent: 115, rotate: 5, duration: 1.1, ease: 'power4.out', stagger: 0.09, scrollTrigger: reveal });
        gsap.from('.q--r .line > span', { yPercent: 115, rotate: -5, duration: 1.1, ease: 'power4.out', stagger: 0.09, delay: 0.35, scrollTrigger: reveal });
        gsap.fromTo('.grito', { yPercent: 24 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: ess, start: 'top bottom', end: 'top top', scrub: true } });
        gsap.from('.grito__hint', { scale: 0, duration: 0.8, ease: 'back.out(2.5)', scrollTrigger: { trigger: ess, start: 'top 30%' } });
        ScrollTrigger.create({ trigger: ess, start: 'top 25%', once: true, onEnter: () => setTimeout(() => V.scream(700), 900) });
      }
      const cover = { trigger: loja, start: 'top bottom', end: 'top top', scrub: true };
      gsap.to('.essencia__shade', { opacity: 0.7, ease: 'none', scrollTrigger: cover });
      gsap.to('.essencia__inner', { scale: 0.93, ease: 'none', transformOrigin: '50% 30%', scrollTrigger: { ...cover } });
    }
    return { init };
  })();

  /* =========================================================
     LOJA — fita e título
     ========================================================= */
  const LojaHead = (() => {
    function tape() {
      const tapeEl = $('.tape');
      const track = $('.tape__track');
      const words = ['dar vida aos dias cinzas', 'sketchbooks para quem cria', 'colabs com artistas brasileiros', 'criar é resistir', 'papel que aguenta a sua essência'];
      const item = () => {
        const div = document.createElement('div');
        div.className = 'tape__item';
        div.innerHTML = words.map((w) => `<span>${w}</span><svg><use href="#i-star"/></svg>`).join('');
        return div;
      };
      track.append(item(), item());
      if (reduce) return;
      const tw = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1, paused: true });
      const speed = { v: 1 };
      const setSpeed = gsap.quickTo(speed, 'v', { duration: 0.35, onUpdate: () => tw.timeScale(speed.v) });
      let dir = 1;
      lenis.on('scroll', ({ velocity }) => {
        if (Math.abs(velocity) > 0.5) dir = velocity > 0 ? 1 : -1;
        setSpeed(dir * (1 + Math.min(6, Math.abs(velocity) * 0.35)));
      });
      ScrollTrigger.create({ trigger: tapeEl, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? tw.play() : tw.pause()) });
    }
    function title() {
      const head = $('.loja__head');
      const h2 = $('.loja__title h2');
      const af = $('.aflita', h2);
      [...h2.childNodes].forEach((n) => {
        if (n.nodeType !== 3) return;
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) frag.append(w);
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.append(s); }
        });
        n.replaceWith(frag);
      });
      af.classList.add('w');
      af.innerHTML = [...af.textContent].map((c) => `<span class="ch">${c}</span>`).join('');
      af.addEventListener('pointerenter', () => {
        af.classList.add('is-calm');
        gsap.fromTo($$('.ch', af), { y: 0 }, { y: -8, duration: 0.25, ease: 'power2.out', stagger: 0.04, yoyo: true, repeat: 1 });
      });
      af.addEventListener('pointerleave', () => af.classList.remove('is-calm'));
      ScrollTrigger.create({ trigger: head, start: 'top bottom', end: 'bottom top', onToggle: (s) => head.classList.toggle('is-off', !s.isActive) });
      if (reduce) return;
      const trig = { trigger: head, start: 'top 72%' };
      gsap.from($$('.w', h2), { yPercent: 60, rotate: 8, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.8)', stagger: 0.06, scrollTrigger: trig });
      gsap.from('.loja__title p', { y: 20, autoAlpha: 0, duration: 0.9, ease: 'power3.out', delay: 0.4, scrollTrigger: trig });
    }
    function edge() {
      const path = $('.loja__edge path');
      let d = 'M0 60 L0 34';
      let x = 0, seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      while (x < 1440) {
        x += 8 + rnd() * 26;
        d += ` L${Math.min(1440, x).toFixed(1)} ${(16 + rnd() * 30 + Math.sin(x / 140) * 8).toFixed(1)}`;
      }
      path.setAttribute('d', d + ' L1440 60 Z');
    }
    return { init() { edge(); tape(); title(); } };
  })();

  /* =========================================================
     VITRINE — cards, filtros (menu retrátil) e ordenação
     ========================================================= */
  const Shop = (() => {
    const { PRODUCTS, TEMAS, PRECOS } = D;
    const norm = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const state = { tema: 'todos', preco: 'todos', artista: null, q: '', sort: 'destaques' };
    const favs = V.favs;

    function matches(p, s = state) {
      if (s.tema === 'favoritos' ? !favs.has(p.id) : s.tema !== 'todos' && !p.tema.includes(s.tema)) return false;
      if (s.preco === 'ate65' && !(p.price <= 65)) return false;
      if (s.preco === '65a80' && !(p.price > 65 && p.price <= 80)) return false;
      if (s.preco === '80mais' && !(p.price > 80)) return false;
      if (s.artista && p.artist !== s.artista) return false;
      if (s.q) {
        const hay = norm(`${p.name} ${p.artist} ${p.tema.join(' ')} ${p.desc}`);
        if (!norm(s.q).split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    }
    const activeFilters = () => (state.tema !== 'todos') + (state.preco !== 'todos') + !!state.artista + !!state.q;
    const splitChars = (el, text) => {
      el.innerHTML = [...text].map((c, i) => `<span class="ch" style="--i:${i}">${c}</span>`).join('');
    };

    const grid = $('#grid');
    const emptyEl = $('#empty');
    const cardEl = {};

    PRODUCTS.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'card';
      li.dataset.id = p.id;
      li.innerHTML = V.cardHTML(p);
      grid.appendChild(li);
      cardEl[p.id] = li;
      V.bindCard(li, p);
    });
    favs.onChange(() => { if (state.tema === 'favoritos') applyFilters(); else Filters.sync(); });

    function sorted() {
      const list = [...PRODUCTS];
      if (state.sort === 'menor') list.sort((a, b) => a.price - b.price || a.rank - b.rank);
      else if (state.sort === 'maior') list.sort((a, b) => b.price - a.price || a.rank - b.rank);
      else if (state.sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      else list.sort((a, b) => a.rank - b.rank);
      return list;
    }
    const refreshSoon = (() => {
      let call;
      return () => { if (call) call.kill(); call = gsap.delayedCall(0.9, () => ScrollTrigger.refresh()); };
    })();

    let firstRender = true;
    function applyFilters() {
      const cards = $$('.card', grid);
      const animate = !firstRender && !reduce;
      const flipState = animate ? Flip.getState(cards) : null;
      const h0 = grid.offsetHeight;
      let n = 0;
      sorted().forEach((p) => {
        const li = cardEl[p.id];
        grid.appendChild(li);
        const ok = matches(p);
        li.classList.toggle('is-hidden', !ok);
        if (ok) n++;
      });
      emptyEl.hidden = n > 0;
      $('#resultCount').textContent = n;
      $('#resultWord').textContent = n === 1 ? 'sketchbook' : 'sketchbooks';
      Filters.sync();
      if (animate) {
        const h1 = grid.offsetHeight;
        Flip.from(flipState, {
          duration: 0.75, ease: 'power3.inOut', absolute: true, stagger: 0.02,
          onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.4, rotate: () => rand(-10, 10) }, { opacity: 1, scale: 1, rotate: 0, duration: 0.75, ease: 'back.out(1.7)', delay: 0.2, stagger: 0.05 }),
          onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.4, rotate: () => rand(-12, 12), duration: 0.4, ease: 'power2.in' }),
        });
        gsap.fromTo(grid, { height: h0 }, { height: h1, duration: 0.75, ease: 'power3.inOut', clearProps: 'height' });
        gsap.fromTo('#resultCount', { yPercent: -60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
        refreshSoon();
        const tb = $('.toolbar').getBoundingClientRect().top;
        if (tb < 60 || tb > innerHeight * 0.7) lenis.scrollTo(tb + lenis.scroll - 100, { duration: 1.1, force: true });
      }
      firstRender = false;
    }

    if (!reduce) {
      gsap.set('.card__inner', { y: 70, opacity: 0, rotate: () => rand(-3, 3) });
      ScrollTrigger.batch('.card__inner', {
        start: 'top 92%', once: true,
        onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, rotate: 0, duration: 0.9, ease: 'back.out(1.4)', stagger: 0.08 }),
      });
      gsap.from('.toolbar', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.loja__body', start: 'top 85%' } });
    }

    /* ---------- menu retrátil (física de mola + borda gelatinosa) ---------- */
    const Filters = (() => {
      const body = $('#lojaBody');
      const aside = $('#filters');
      const panel = $('.filters__panel');
      const inner = $('.filters__inner');
      const bg = $('.filters__bg');
      const bgPath = $('.filters__bg path');
      const handle = $('#filtersHandle');
      const handleCount = $('.filters__handle-count');
      const backdrop = $('#filtersBackdrop');
      const clearBtn = $('.filters__clear');
      const mq = matchMedia('(max-width: 900px)');
      let mobile = mq.matches;
      let open = !mobile;
      const sp = { x: open ? 1 : 0, v: 0, target: open ? 1 : 0, running: false };
      let W = 300, H = 600, gap = 0;

      const lists = {
        tema: $('[data-group="tema"] .fgroup__list'),
        preco: $('[data-group="preco"] .fgroup__list'),
        artista: $('[data-group="artista"] .fgroup__list'),
      };
      const pills = {};
      const mkBtn = (group, val, label) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'fbtn';
        b.dataset.group = group; b.dataset.val = val;
        b.innerHTML = '<span class="lbl"></span><span class="count">0</span>';
        splitChars($('.lbl', b), label);
        if (val === 'favoritos') $('.lbl', b).insertAdjacentHTML('afterbegin', '<svg class="heart"><use href="#i-heart"/></svg>');
        li.appendChild(b);
        lists[group].appendChild(li);
        b.addEventListener('click', () => set(group, val));
      };
      TEMAS.forEach(([v, l]) => mkBtn('tema', v, l));
      PRECOS.forEach(([v, l]) => mkBtn('preco', v, l));
      ['tema', 'preco'].forEach((g) => {
        const pill = document.createElement('span');
        pill.className = 'fgroup__pill';
        lists[g].prepend(pill);
        pills[g] = pill;
      });
      [...new Set(PRODUCTS.map((p) => p.artist))].sort().forEach((a) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.dataset.val = a;
        splitChars(b, '@' + a);
        li.appendChild(b);
        lists.artista.appendChild(li);
        b.addEventListener('click', () => set('artista', state.artista === a ? null : a));
      });

      function set(group, val) {
        if (group === 'tema' && val === 'favoritos' && !favs.size()) { V.toast('Você ainda não favoritou nenhum sketchbook.'); return; }
        state[group] = val;
        applyFilters();
      }
      function movePill(group, instant) {
        const pill = pills[group];
        const btn = $(`.fbtn[data-val="${state[group]}"]`, lists[group]);
        if (!btn || !pill) return;
        const vars = { x: btn.offsetLeft, y: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight, opacity: 1 };
        if (instant || reduce) gsap.set(pill, vars);
        else gsap.to(pill, { ...vars, duration: 0.7, ease: 'elastic.out(1, .7)', overwrite: true });
      }
      function sync() {
        $$('.fbtn', aside).forEach((b) => {
          const g = b.dataset.group, v = b.dataset.val;
          const n = PRODUCTS.filter((p) => matches(p, { ...state, [g]: v })).length;
          $('.count', b).textContent = n;
          b.classList.toggle('is-active', state[g] === v);
          b.disabled = n === 0 && state[g] !== v;
        });
        $$('.chip', aside).forEach((b) => b.classList.toggle('is-active', state.artista === b.dataset.val));
        movePill('tema'); movePill('preco');
        const n = activeFilters();
        handleCount.hidden = !n; handleCount.textContent = n;
        fabCount.hidden = !n; fabCount.textContent = n;
        clearBtn.classList.toggle('is-on', n > 0);
      }
      function clear() {
        Object.assign(state, { tema: 'todos', preco: 'todos', artista: null, q: '' });
        $('#search').value = '';
        applyFilters();
      }
      clearBtn.addEventListener('click', clear);
      $$('[data-clear]').forEach((b) => b.addEventListener('click', clear));
      let qT;
      $('#search').addEventListener('input', (e) => {
        clearTimeout(qT);
        qT = setTimeout(() => { state.q = e.target.value.trim(); applyFilters(); }, 160);
      });

      function measure() {
        W = panel.offsetWidth;
        H = panel.offsetHeight;
        gap = mobile ? 0 : Math.max(0, Math.round(body.getBoundingClientRect().left));
        panel.style.setProperty('--gap', gap + 'px');
        const bw = W + 160;
        bg.setAttribute('viewBox', `0 0 ${bw} ${H}`);
        bg.setAttribute('width', bw);
        bg.setAttribute('height', H);
        bg.style.width = bw + 'px';
        render();
      }
      function shape(b) {
        const R = 36, w = W, h = H;
        const top = mobile ? 0 : R;
        return `M0 0 L${w - top} 0 Q${w} 0 ${w} ${top} C${w + b} ${h * 0.3} ${w + b} ${h * 0.7} ${w} ${h - R} Q${w} ${h} ${w - R} ${h} L0 ${h} Z`;
      }
      function render() {
        const off = (sp.x - 1) * (W + gap + (mobile ? 24 : 0));
        panel.style.transform = `translate3d(${off.toFixed(2)}px,0,0)`;
        bgPath.setAttribute('d', shape(clamp(-sp.v * W * 0.075, -70, 95)));
        inner.style.transform = Math.abs(sp.v) > 0.01 ? `skewX(${clamp(sp.v * 2.6, -7, 7).toFixed(2)}deg)` : '';
        aside.style.pointerEvents = mobile ? (sp.x > 0.02 ? 'auto' : 'none') : '';
      }
      function tick(time, dms) {
        const dt = Math.min(dms, 34) / 1000;
        sp.v += ((sp.target - sp.x) * 185 - sp.v * 14.5) * dt;
        sp.x += sp.v * dt;
        render();
        if (Math.abs(sp.target - sp.x) < 0.0006 && Math.abs(sp.v) < 0.003) {
          sp.x = sp.target; sp.v = 0; render();
          gsap.ticker.remove(tick); sp.running = false;
        }
      }
      function kick() { if (!sp.running) { sp.running = true; gsap.ticker.add(tick); } }
      const chars = () => $$('.fbtn .ch, .chip, .fgroup__title, .search, .filters__title, .filters__clear', inner);

      function toggle(force) {
        const next = typeof force === 'boolean' ? force : !open;
        if (next === open) return;
        open = next;
        handle.setAttribute('aria-expanded', open);
        aside.classList.toggle('is-open', open);
        if (!mobile) {
          const cards = $$('.card:not(.is-hidden)', grid);
          const fs = reduce ? null : Flip.getState(cards);
          body.classList.toggle('is-collapsed', !open);
          if (fs) Flip.from(fs, { duration: 0.85, ease: 'power3.inOut', stagger: 0.015 });
          refreshSoon();
        } else {
          backdrop.classList.toggle('is-on', open);
          V.lock(open);
        }
        if (reduce) { sp.x = sp.target = open ? 1 : 0; render(); return; }
        if (open) {
          sp.target = 1; kick();
          gsap.fromTo(chars(), { y: 18, opacity: 0, rotate: 10 }, { y: 0, opacity: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.2)', stagger: 0.006, delay: 0.08, overwrite: true });
          setTimeout(() => { movePill('tema', true); movePill('preco', true); }, 30);
        } else {
          gsap.to(chars(), { y: -14, opacity: 0, rotate: -8, duration: 0.22, ease: 'power2.in', stagger: { each: 0.003, from: 'end' }, overwrite: true });
          setTimeout(() => { sp.target = 0; kick(); }, 90);
        }
        gsap.fromTo(handle, { scaleX: 1 }, { scaleX: 1, keyframes: { scaleX: [1, 1.25, 0.9, 1], scaleY: [1, 0.9, 1.05, 1] }, duration: 0.6, transformOrigin: '0% 50%' });
      }
      handle.addEventListener('click', () => toggle());
      $('.filters__close').addEventListener('click', () => toggle(false));
      backdrop.addEventListener('click', () => toggle(false));
      addEventListener('keydown', (e) => { if (e.key === 'Escape' && open && mobile) toggle(false); });

      const fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'filters__handle filters-fab';
      fab.innerHTML = '<svg class="filters__handle-ico"><use href="#i-filter"/></svg><span class="filters__handle-txt">filtros</span><span class="filters__handle-count" hidden>0</span>';
      fab.setAttribute('aria-label', 'Abrir filtros');
      document.body.appendChild(fab);
      const fabCount = $('.filters__handle-count', fab);
      fab.addEventListener('click', () => toggle(true));
      ScrollTrigger.create({ trigger: '.loja__body', start: 'top 70%', end: 'bottom 60%', onToggle: (s) => fab.classList.toggle('is-visible', s.isActive) });

      function onMQ() {
        mobile = mq.matches;
        aside.classList.toggle('is-mobile', mobile);
        if (mobile && aside.parentElement !== document.body) document.body.append(aside, backdrop);
        if (!mobile && aside.parentElement !== body) { body.prepend(aside); aside.after(backdrop); }
        if (mobile) {
          open = false; sp.x = sp.target = 0; sp.v = 0;
          body.classList.remove('is-collapsed');
          backdrop.classList.remove('is-on');
        } else {
          open = !body.classList.contains('is-collapsed');
          sp.x = sp.target = open ? 1 : 0; sp.v = 0;
          aside.style.pointerEvents = '';
        }
        handle.setAttribute('aria-expanded', open);
        aside.classList.toggle('is-open', open);
        gsap.set(chars(), { clearProps: 'all' });
        measure();
      }
      mq.addEventListener ? mq.addEventListener('change', onMQ) : mq.addListener(onMQ);
      addEventListener('resize', measure);
      return { init() { onMQ(); sync(); movePill('tema', true); movePill('preco', true); }, sync, set };
    })();

    /* ---------- ordenar ---------- */
    (() => {
      const box = $('#sort');
      const btn = $('.sort__btn', box);
      const val = $('.sort__value', box);
      const items = $$('li', box);
      const close = () => { box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const o = box.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', o);
        if (o && !reduce) gsap.fromTo(items, { x: -12, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.04, duration: 0.4, ease: 'back.out(2)' });
      });
      items.forEach((li) => li.addEventListener('click', () => {
        items.forEach((x) => x.setAttribute('aria-selected', x === li));
        val.textContent = li.textContent;
        state.sort = li.dataset.sort;
        close();
        applyFilters();
      }));
      document.addEventListener('click', (e) => { if (!box.contains(e.target)) close(); });
      addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    })();

    // atalhos do header/rodapé
    V.onFavButton = () => {
      if (!favs.size()) { V.toast('Toque no <b>♥</b> de um sketchbook para guardar aqui.'); V.scrollToSection('loja', { offset: 40 }); return; }
      Filters.set('tema', 'favoritos');
      V.scrollToSection('loja', { offset: 40 });
    };
    V.onShopLink = () => V.scrollToSection('loja', { offset: 40 });

    function init() { Filters.init(); applyFilters(); }
    return { init, favoritos: () => favs.size() && Filters.set('tema', 'favoritos') };
  })();

  /* =========================================================
     Sticky + navegação ativa
     ========================================================= */
  const header = V.header;
  const navLinks = $$('.header__nav a');
  function stickyTops() {
    hero.style.top = Math.min(0, innerHeight - hero.offsetHeight) + 'px';
    ess.style.top = Math.min(0, innerHeight - ess.offsetHeight) + 'px';
    measureTops();
  }
  ScrollTrigger.addEventListener('refreshInit', stickyTops);
  stickyTops();
  let navCur = '', solid = null;
  function navState() {
    const y = lenis.scroll + innerHeight * 0.45;
    let cur = 'manifesto';
    if (y >= tops.essencia) cur = 'essencia';
    if (y >= tops.loja) cur = 'loja';
    if (cur !== navCur) {
      navCur = cur;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href').endsWith('#' + cur)));
    }
    const s = lenis.scroll > tops.heroH * 0.55;
    if (s !== solid) { solid = s; header.classList.toggle('is-solid', s); }
  }
  lenis.on('scroll', navState);

  /* ---------------------------------------------------------
     Inicialização
     --------------------------------------------------------- */
  Hero.init();
  Essencia.init();
  LojaHead.init();
  Shop.init();
  navState();

  // chegou com #loja, #favoritos...: vai direto para lá
  V.homeHash = (location.hash || '').slice(1);
  V.applyHash = () => {
    const h = V.homeHash;
    if (!h) return false;
    if (h === 'favoritos') Shop.favoritos();
    const id = h === 'favoritos' ? 'loja' : h;
    if (!['manifesto', 'essencia', 'loja'].includes(id)) return false;
    stickyTops();
    V.scrollToSection(id, { immediate: true, offset: id === 'loja' ? 40 : 0 });
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  };

  // voltar pelo navegador (de uma página de produto, por exemplo) devolve ao mesmo ponto
  V.restoreScroll = () => {
    const y = +V.session.get('homeY') || 0;
    if (!y) return;
    stickyTops();
    ScrollTrigger.refresh();
    lenis.scrollTo(y, { immediate: true, force: true });
  };
  addEventListener('pagehide', () => V.session.set('homeY', String(Math.round(lenis.scroll))));
})();
