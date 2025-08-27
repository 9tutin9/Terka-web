// ornament-bg.js — živé interaktivní pozadí pro glassmorphism
(() => {
  const canvas = document.getElementById('ornament-bg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });

  // ==== NASTAVENÍ (klidně si pohrát) ====
  const CFG = {
    COUNT: 8,              // počet „blobů“ (základ)
    SPEED: 0.18,           // rychlost pohybu blobů
    PARALLAX: 0.9,         // jak moc reagují na myš (0–1.5…)
    PULSE_STRENGTH: 0.55,  // jak moc se zvětší poblíž myši (0–1)
    PULSE_RADIUS: 280,     // dosah pulzu od kurzoru (px)
    CLICK_SPAWN: 2,        // kolik „kapek“ vytvořit při kliknutí
    CLICK_GROWTH: 1.25,    // rychlost rozpínání kapek
    ALPHA_BASE: 0.30,      // základní viditelnost blobů (0–1)
    ALPHA_NEAR: 0.55,      // viditelnost blobů poblíž myši
    MAX_DPR: 2             // limit pro zařízení s vysokým DPI
  };

  // Ladí se k tvým barvám webu (#0077b6, #e6a639ff, #ffe45f, #ffb703)
  const palette = [
  [217, 148, 95],   // písek
  [242, 177, 121],  // měkká meruňková
  [255, 205, 178],  // pastelová růžová
  [255, 183, 3]     // teplá oranžová
];
  let W=0, H=0, DPR = Math.min(window.devicePixelRatio || 1, CFG.MAX_DPR);
  let blobs = [];
  let drops = []; // klikací kapky
  let RAF = 0;

  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const mouse = { x: 0.5, y: 0.5, ex: 0.5, ey: 0.5, down:false };

  function rgba([r,g,b], a){ return `rgba(${r},${g},${b},${a})`; }
  function rand(a,b){ return a + Math.random()*(b-a); }
  function pick(arr){ return arr[(Math.random()*arr.length)|0]; }
  function len2(x,y){ return Math.sqrt(x*x + y*y); }

  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, CFG.MAX_DPR);
    canvas.width  = Math.floor(window.innerWidth * DPR);
    canvas.height = Math.floor(window.innerHeight * DPR);
    canvas.style.width  = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    W = window.innerWidth; H = window.innerHeight;

    // adaptivní množství blobů dle plochy
    const area = (W*H)/(1280*800);
    const count = Math.max(6, Math.min(14, Math.round(CFG.COUNT*area)));
    blobs = Array.from({length: count}, makeBlob);
  }

  function makeBlob(){
    const R = Math.max(W,H);
    const r = rand(R*0.18, R*0.32);
    const dir = Math.random()*Math.PI*2;
    const spd = prefersReduced ? CFG.SPEED*0.4 : rand(CFG.SPEED*0.6, CFG.SPEED*1.2);
    return {
      x: rand(-r, W+r),
      y: rand(-r, H+r),
      r, baseR: r,
      col: pick(palette),
      vx: Math.cos(dir)*spd,
      vy: Math.sin(dir)*spd
    };
  }

  function spawnDrop(x,y){
    for(let i=0;i<CFG.CLICK_SPAWN;i++){
      drops.push({
        x, y,
        r: rand(40, 80),
        alpha: 0.75,
        grow: rand(CFG.CLICK_GROWTH*0.8, CFG.CLICK_GROWTH*1.2),
        col: pick(palette)
      });
    }
  }

  function drawBlob(b, pulseScale, alpha){
    const R = b.r * pulseScale;
    const g = ctx.createRadialGradient(b.x, b.y, R*0.2, b.x, b.y, R);
    g.addColorStop(0, rgba(b.col, alpha));
    g.addColorStop(1, rgba(b.col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, R, 0, Math.PI*2);
    ctx.fill();
  }

  function drawDrop(d){
    const g = ctx.createRadialGradient(d.x, d.y, d.r*0.3, d.x, d.y, d.r);
    g.addColorStop(0, rgba(d.col, d.alpha));
    g.addColorStop(1, rgba(d.col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
    ctx.fill();
  }

  function step(){
    ctx.clearRect(0,0,W,H);

    // plynulá paralaxa (easing myši)
    mouse.ex += (mouse.x - mouse.ex)*0.08;
    mouse.ey += (mouse.y - mouse.ey)*0.08;

    // „svítivost“ barev
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';

    const mX = mouse.ex*W, mY = mouse.ey*H;

    // BLOBS
    for(const b of blobs){
      if (!prefersReduced){
        // parallax drift směrem k myši
        const dx = (mouse.ex-0.5)*CFG.PARALLAX;
        const dy = (mouse.ey-0.5)*CFG.PARALLAX;
        b.x += b.vx + dx;
        b.y += b.vy + dy;
      }

      // wrap kolem hran
      if (b.x < -b.r) b.x = W + b.r;
      if (b.x > W + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = H + b.r;
      if (b.y > H + b.r) b.y = -b.r;

      // pulz u kurzoru
      const d = len2(b.x - mX, b.y - mY);
      const t = Math.max(0, 1 - (d/CFG.PULSE_RADIUS)); // 1 blízko, 0 daleko
      const scale = 1 + t*CFG.PULSE_STRENGTH;
      const alpha = CFG.ALPHA_BASE + t*(CFG.ALPHA_NEAR - CFG.ALPHA_BASE);

      drawBlob(b, scale, alpha);
    }

    // DROPS (klik efekt)
    for(let i=drops.length-1; i>=0; i--){
      const d = drops[i];
      d.r *= 1.02 + (d.grow*0.015);
      d.alpha *= 0.965;
      drawDrop(d);
      if (d.alpha < 0.03) drops.splice(i,1);
    }

    ctx.globalCompositeOperation = prev;
    RAF = requestAnimationFrame(step);
  }

  // Interakce
  function onPointer(e){
    const touch = e.touches ? e.touches[0] : null;
    const cx = (touch ? touch.clientX : e.clientX) ?? W*0.5;
    const cy = (touch ? touch.clientY : e.clientY) ?? H*0.5;
    mouse.x = cx / W;
    mouse.y = cy / H;
  }

  function onClick(e){
    const cx = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? W*0.5;
    const cy = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? H*0.5;
    spawnDrop(cx, cy);
  }

  // Start
  resize();
  step();

  // Události
  window.addEventListener('resize', () => {
    cancelAnimationFrame(RAF);
    resize();
    step();
  }, { passive:true });

  window.addEventListener('mousemove', onPointer, { passive:true });
  window.addEventListener('touchmove', onPointer, { passive:true });
  window.addEventListener('click', onClick, { passive:true });
  window.addEventListener('touchstart', onClick, { passive:true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(RAF); else step();
  });

  // Mini API (kdybys chtěl hrát si z konzole)
  window.OrnamentBG = {
    setSpeed(v){ for(const b of blobs){ const ang = Math.atan2(b.vy,b.vx); b.vx = Math.cos(ang)*v; b.vy = Math.sin(ang)*v; } },
    setCount(n){
      const diff = n - blobs.length;
      if (diff > 0){ for(let i=0;i<diff;i++) blobs.push(makeBlob()); }
      else if (diff < 0){ blobs.splice(n); }
    },
    setParallax(v){ CFG.PARALLAX = v; },
    setPulse(s){ CFG.PULSE_STRENGTH = s; },
  };
})();