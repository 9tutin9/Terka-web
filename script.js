// script.js — navigace, animace, mikrointerakce a UX vylepšení
(function() {
  'use strict';

  // === NAVIGACE ===
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
      document.body.classList.toggle('menu-open', navLinks.classList.contains('open'));
    });

    // Zavření menu při kliknutí na odkaz
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
      });
    });
  }

  // === SCROLL ANIMACE ===
  const faders = document.querySelectorAll('.glass-card, .hero-content, .product-card');
  const appearOptions = { 
    threshold: 0.1, 
    rootMargin: "0px 0px -50px 0px" 
  };

  if (faders.length && 'IntersectionObserver' in window) {
    const appearOnScroll = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.style.animation = 'fadeInUp 1s forwards';
        obs.unobserve(entry.target);
      });
    }, appearOptions);
    
    faders.forEach(f => appearOnScroll.observe(f));
  }

  // === PRODUKTY ANIMACE ===
  const productCards = document.querySelectorAll('.products-section .product-card');
  if (productCards.length && 'IntersectionObserver' in window) {
    const productObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    productCards.forEach(card => productObserver.observe(card));
  }

  // === PARALLAX EFEKT ===
  let ticking = false;
  function updateParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.5;
    hero.style.transform = `translateY(${rate}px)`;
    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true });

  // === SCROLL PROGRESS ===
  function initScrollProgress() {
    let bar = document.getElementById('scroll-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'scroll-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }

    function updateProgress() {
      const h = document.documentElement;
      const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = Math.max(0, Math.min(100, scrolled)) + '%';
    }

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  // === BACK TO TOP ===
  function initBackToTop() {
    let btn = document.getElementById('toTop');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'toTop';
      btn.setAttribute('aria-label', 'Zpět nahoru');
      btn.innerHTML = '↑';
      document.body.appendChild(btn);
    }

    const toggle = () => {
      const shouldShow = window.scrollY > 400;
      btn.classList.toggle('show', shouldShow);
      btn.setAttribute('aria-hidden', !shouldShow);
    };

    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
    
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      btn.blur(); // Odstranění focusu pro lepší UX
    });
  }

  // === RIPPLE EFEKT ===
  function initRippleEffect() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
    
    buttons.forEach(btn => {
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      
      btn.addEventListener('click', function(e) {
        const circle = document.createElement('span');
        const d = Math.max(this.clientWidth, this.clientHeight);
        const rect = this.getBoundingClientRect();
        
        circle.style.width = circle.style.height = d + 'px';
        circle.style.position = 'absolute';
        circle.style.left = (e.clientX - rect.left - d / 2) + 'px';
        circle.style.top = (e.clientY - rect.top - d / 2) + 'px';
        circle.style.borderRadius = '50%';
        circle.style.background = 'rgba(255,255,255,0.4)';
        circle.style.transform = 'scale(0)';
        circle.style.animation = 'ripple 600ms ease-out';
        
        this.appendChild(circle);
        setTimeout(() => circle.remove(), 650);
      });
    });
  }

  // === 3D TILT EFEKT ===
  function initTiltEffect() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return; // na mobilech vypnout tilt, předejdeme překryvům
    const tiltElements = document.querySelectorAll('.product-card, .glass-card');
    
    tiltElements.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rx = (y - 0.5) * 6;
        const ry = (x - 0.5) * -6;
        
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  // === NAVIGACE SCROLL ===
  function initNavScroll() {
    const nav = document.querySelector('nav.navbar');
    if (!nav) return;
    
    const onScroll = () => {
      if (window.scrollY > 10) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    };
    
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // === LOADING STAVY ===
  function initLoadingStates() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
          const originalText = submitBtn.textContent;
          submitBtn.textContent = 'Zpracovávám...';
          submitBtn.disabled = true;
          
          // Obnovení tlačítka po 5 sekundách (fallback)
          setTimeout(() => {
            if (submitBtn.dataset.lock === 'true') return;
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
          }, 5000);
        }
      });
    });
  }

  // === LAZY LOADING ===
  function initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src || img.src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  // === SMOOTH SCROLL ===
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // === PERFORMANCE OPTIMIZACE ===
  function initPerformanceOptimizations() {
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    const debouncedScroll = debounce(() => {}, 16);
    window.addEventListener('scroll', debouncedScroll, { passive: true });
  }

  // === ACCESSIBILITY ===
  function initAccessibility() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (navLinks && navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
        }
      }
      if (e.key === 'Enter' && document.activeElement === menuToggle) {
        navLinks.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
      }
    });
  }

  // === LIGHTBOX (ZOOM OBRÁZKŮ) ===
  function initLightbox(){
    // vytvoř backdrop jen jednou
    let backdrop = document.querySelector('.lightbox-backdrop');
    if (!backdrop){
      backdrop = document.createElement('div');
      backdrop.className = 'lightbox-backdrop';
      backdrop.innerHTML = '<div class="lightbox-content"><img alt=""/><button class="lightbox-close" aria-label="Zavřít">×</button></div>';
      document.body.appendChild(backdrop);
    }

    const imgEl = backdrop.querySelector('img');
    const closeBtn = backdrop.querySelector('.lightbox-close');

    const isLogo = (img)=> img.classList.contains('logo-mark') || img.closest('.logo');

    function open(src, alt){
      imgEl.src = src; imgEl.alt = alt||'';
      backdrop.classList.add('show');
      document.body.classList.add('lb-locked');
    }
    function close(){
      backdrop.classList.remove('show');
      document.body.classList.remove('lb-locked');
      imgEl.src = '';
    }

    backdrop.addEventListener('click', (e)=>{ if (e.target === backdrop) close(); });
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });

    // Delegace na všechny obrázky kromě loga
    document.addEventListener('click', (e)=>{
      const img = e.target.closest('img');
      if (!img || isLogo(img)) return;
      // ignorovat obrázky s rolí dekorace
      if (img.getAttribute('aria-hidden') === 'true') return;
      // Na hlavní stránce e-shopu neblokovat klik na odkaz (vede na podstránku)
      const path = (location.pathname||'').toLowerCase();
      if (path.endsWith('/eshop.html') || path.endsWith('eshop.html')){
        if (img.closest('a')) return;
      }
      e.preventDefault();
      open(img.currentSrc || img.src, img.alt);
    });
  }

  // === STATS ===
  async function initStatsPanel(){
    const panel = document.getElementById('statsBar');
    if (!panel) return;
    const mealsEl = document.getElementById('statMeals');
    const braceletsEl = document.getElementById('statBracelets');
    const ordersEl = document.getElementById('statOrders');

    function animateTo(el, target){
      const startVal = Number(el.textContent.replace(/\D/g,'')) || 0;
      const endVal = Number(target)||0;
      const duration = 700;
      const start = performance.now();
      function step(now){
        const t = Math.min(1, (now - start)/duration);
        const val = Math.floor(startVal + (endVal - startVal)*t);
        el.textContent = val.toLocaleString('cs-CZ');
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function show(vals, animate=false){
      if (animate){
        animateTo(mealsEl, vals.meals);
        animateTo(braceletsEl, vals.bracelets);
        animateTo(ordersEl, vals.orders);
      } else {
        mealsEl.textContent = (Number(vals.meals)||0).toLocaleString('cs-CZ');
        braceletsEl.textContent = (Number(vals.bracelets)||0).toLocaleString('cs-CZ');
        ordersEl.textContent = (Number(vals.orders)||0).toLocaleString('cs-CZ');
      }
    }

    function getLocalFallback(){
      try{
        const list = JSON.parse(localStorage.getItem('orders_v1')||'[]');
        const orders = list.length;
        const amount = list.reduce((a,b)=> a + (Number(b.amount)||0), 0);
        const bracelets = list.reduce((a,b)=> a + (Array.isArray(b.items)? b.items.reduce((x,y)=> x + (Number(y.qty)||0),0) : 0), 0);
        const meals = Math.floor(amount/23);
        return { meals, bracelets, orders };
      }catch(_){
        return { meals: 0, bracelets: 0, orders: 0 };
      }
    }

    // Defer the first animation until the stats bar enters the viewport
    let latest = null;
    let animatedOnce = false;

    function animateWhenVisible(){
      const run = () => {
        if (animatedOnce) return;
        animatedOnce = true;
        mealsEl.textContent = '0';
        braceletsEl.textContent = '0';
        ordersEl.textContent = '0';
        show(latest || getLocalFallback(), true);
      };

      // Spusť animaci při prvním skutečném scrollu uživatele
      const onFirstScroll = () => {
        run();
        window.removeEventListener('scroll', onFirstScroll);
      };
      window.addEventListener('scroll', onFirstScroll, { passive: true });

      // Bezpečnostní fallback: pokud by uživatel vůbec nescrolloval, spustí se po 6s
      setTimeout(run, 6000);
    }

    // Show something immediately: prefer cached server values, else local fallback
    function loadCached(){
      try{
        const v = JSON.parse(localStorage.getItem('stats_cache_v1')||'');
        if (v && typeof v === 'object') return v;
      }catch(_){}
      return null;
    }

    const cached = loadCached();
    if (cached){
      latest = cached;
      show(cached, false);
    } else {
      const fb = getLocalFallback();
      latest = fb;
      show(fb, false);
    }

    // Listen for local changes (after successful order submit)
    window.addEventListener('stats:change', ()=>{
      const vals = getLocalFallback();
      latest = vals;
      if (animatedOnce) show(vals, true);
    });

    // Start observing for visibility ASAP (do not wait for network)
    animateWhenVisible();

    try{
      // Volání přes serverless proxy → vrátí vždy serverové statistiky
      const res = await fetch('/api/stats', { method:'GET' });
      if (!res.ok) return;
      const data = await res.json();
      const vals = {
        meals: Number(data.meals)||0,
        bracelets: Number(data.bracelets)||0,
        orders: Number(data.orders)||0
      };
      if (!vals.meals && (Number(data.total_amount)||0)>0){ vals.meals = Math.floor(Number(data.total_amount)/23); }
      latest = vals;
      try{ localStorage.setItem('stats_cache_v1', JSON.stringify(vals)); }catch(_){ }
      if (animatedOnce) show(vals, true);
    }catch(e){
      // keep local values shown
    }

    // (Observer already active) — when network returns, we may re-animate to fresh values
  }

  // === INITIALIZACE ===
  function init() {
    initScrollProgress();
    initBackToTop();
    initRippleEffect();
    initTiltEffect();
    initNavScroll();
    initLoadingStates();
    initLazyLoading();
    initSmoothScroll();
    initPerformanceOptimizations();
    initAccessibility();
    initLightbox();
    initStatsPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.AppScripts = {
    init
  };

})();