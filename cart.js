
(function(){
  const CART_KEY = "cart_v1";
  const fmt = (n)=> new Intl.NumberFormat('cs-CZ', { style:'currency', currency:'CZK', maximumFractionDigits: 0 }).format(n);

  function load(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)||"[]"); }catch(e){ return []; } }
  function save(items){ localStorage.setItem(CART_KEY, JSON.stringify(items)); window.dispatchEvent(new CustomEvent('cart:change')); }

  function add(item, qty=1){
    const items = load();
    const i = items.findIndex(x=>x.id===item.id);
    const maxStock = Number(item.stock||Infinity);
    if (i>=0){
      const nextQty = items[i].qty + qty;
      items[i].qty = Math.min(nextQty, maxStock);
    } else {
      items.push({ ...item, qty: Math.min(qty, maxStock) });
    }
    save(items);
    toast(`Přidáno do košíku: ${item.name}`);
  }
  function setQty(id, qty){
    const items = load().map(x=>{
      if (x.id!==id) return x;
      const maxStock = Number(x.stock||Infinity);
      const wanted = Math.max(1, qty|0);
      return { ...x, qty: Math.min(wanted, maxStock) };
    });
    save(items);
  }
  function inc(id){ const items = load(); const it = items.find(x=>x.id===id); if(it){ const maxStock=Number(it.stock||Infinity); it.qty=Math.min(it.qty+1, maxStock); save(items);} }
  function dec(id){ const items = load(); const it = items.find(x=>x.id===id); if(it){ it.qty=Math.max(1,it.qty-1); save(items);} }
  function remove(id){ const items = load().filter(x=>x.id!==id); save(items); }
  function clear(){ save([]); }
  function count(){ return load().reduce((a,b)=>a+b.qty,0); }
  function total(){ return load().reduce((a,b)=>a + b.price*b.qty, 0); }

  // UI
  function ensureUI(){
    if (document.getElementById('cart-drawer')) return;
    const drawer = document.createElement('div');
    drawer.id = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-toggle" aria-label="Otevřít košík" role="button">
        🛒 <span class="count">0</span>
      </div>
      <div class="cart-panel" aria-hidden="true">
        <div class="cart-head">
          <strong>Váš košík</strong>
          <button class="close" aria-label="Zavřít">×</button>
        </div>
        <div class="cart-body"><div class="empty muted">Košík je prázdný.</div></div>
        <div class="cart-foot">
          <div class="sum">Celkem: <strong class="total">0&nbsp;Kč</strong></div>
          <div class="actions">
            <a href="checkout.html" class="btn-primary">Pokračovat k objednávce</a>
            <button class="btn-secondary clear">Vyprázdnit</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(drawer);

    drawer.querySelector('.cart-toggle').addEventListener('click', ()=> open());
    drawer.querySelector('.close').addEventListener('click', ()=> close());
    drawer.querySelector('.clear').addEventListener('click', ()=> clear());
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });

    updateUI();
  }

  function open(){
    const wrap = document.getElementById('cart-drawer');
    const panel = wrap.querySelector('.cart-panel');
    panel.setAttribute('aria-hidden','false');
    wrap.classList.add('open');
    document.body.classList.add('cart-open');
    updateUI();
  }

  function close(){
    const wrap = document.getElementById('cart-drawer');
    const panel = wrap.querySelector('.cart-panel');
    panel.setAttribute('aria-hidden','true');
    wrap.classList.remove('open');
    document.body.classList.remove('cart-open');
  }

  function updateUI(){
    const wrap = document.getElementById('cart-drawer');
    if (!wrap) return;
    const list = wrap.querySelector('.cart-body');
    const totalEl = wrap.querySelector('.total');
    const countEl = wrap.querySelector('.count');
    const items = load();
    countEl.textContent = count();
    totalEl.textContent = fmt(total());

    if (!items.length){
      list.innerHTML = `<div class="empty muted">Košík je prázdný.</div>`;
      return;
    }
    list.innerHTML = items.map(it=>`
      <div class="cart-row" data-id="${it.id}" data-stock="${Number(it.stock||'')}">
        <div class="meta">
          ${it.image ? `<img src="${it.image}" alt="" loading="lazy">` : ``}
          <div>
            <div class="name">${it.name}</div>
            <div class="price">${fmt(it.price)}</div>
          </div>
        </div>
        <div class="qty">
          <button class="dec" aria-label="Méně">−</button>
          <input class="val" value="${it.qty}" inputmode="numeric" pattern="[0-9]*">
          <button class="inc" aria-label="Více">+</button>
        </div>
        <button class="remove" aria-label="Odebrat">×</button>
      </div>
    `).join('');

    // Bindy
    // Enforce stock: disable inc at max, clamp input changes, and block inc beyond stock
    list.querySelectorAll('.cart-row').forEach(row=>{
      const stock = Number(row.dataset.stock||Infinity);
      const incBtn = row.querySelector('.inc');
      const input = row.querySelector('.val');
      if (isFinite(stock)){
        input.setAttribute('max', String(stock));
        if (Number(input.value||'1') >= stock){ if (incBtn) incBtn.disabled = true; }
      }
    });

    list.querySelectorAll('.inc').forEach(btn=> btn.addEventListener('click', (e)=>{
      const row = e.target.closest('.cart-row');
      const id = row.dataset.id;
      const stock = Number(row.dataset.stock||Infinity);
      const current = Number(row.querySelector('.val')?.value||'1');
      if (isFinite(stock) && current >= stock){ toast('Není skladem více kusů.'); return; }
      inc(id); updateUI();
    }));
    list.querySelectorAll('.dec').forEach(btn=> btn.addEventListener('click', (e)=>{
      const id = e.target.closest('.cart-row').dataset.id; dec(id); updateUI();
    }));
    list.querySelectorAll('.remove').forEach(btn=> btn.addEventListener('click', (e)=>{
      const id = e.target.closest('.cart-row').dataset.id; remove(id); updateUI();
    }));
    function clampAndUpdate(inpEl){
      const row = inpEl.closest('.cart-row');
      const stock = Number(row.dataset.stock||Infinity);
      let want = parseInt(inpEl.value||'1',10);
      if (!isFinite(want) || want < 1) want = 1;
      if (isFinite(stock) && want > stock){ want = stock; }
      const id = row.dataset.id; setQty(id, want); updateUI();
    }
    list.querySelectorAll('.val').forEach(inp=> inp.addEventListener('change', (e)=> clampAndUpdate(inp)));
    list.querySelectorAll('.val').forEach(inp=> inp.addEventListener('input', (e)=> {
      const row = inp.closest('.cart-row');
      const stock = Number(row.dataset.stock||Infinity);
      let v = parseInt(inp.value||'1',10);
      if (!isFinite(v) || v < 1) v = 1;
      if (isFinite(stock) && v > stock) v = stock;
      inp.value = String(v);
    }));
  }

  // Toast
  function toast(text){
    let el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(()=> el.classList.add('show'), 10);
    setTimeout(()=> { el.classList.remove('show'); el.addEventListener('transitionend', ()=>el.remove(), {once:true}); }, 2500);
  }

  // Delegace pro tlačítka [data-add-to-cart]
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    const id = btn.getAttribute('data-id') || btn.dataset.id || btn.value || btn.name || 'prod-'+Math.random().toString(36).slice(2,9);
    let name = (btn.getAttribute('data-name') || btn.dataset.name || '').trim();
    if (!name){
      const pageTitle = (document.querySelector('main h1') || document.querySelector('h1'))?.textContent?.trim() || '';
      const card = btn.closest('.product-card');
      let variant = '';
      if (card && card.parentElement){
        const siblings = Array.from(card.parentElement.children).filter(el=>el.classList && el.classList.contains('product-card'));
        const idx = siblings.indexOf(card);
        if (idx >= 0) variant = ` — varianta ${idx+1}`;
      }
      name = (pageTitle || 'Produkt') + variant;
    }
    const price = parseFloat(btn.getAttribute('data-price') || btn.dataset.price);
    const stock = parseInt(btn.getAttribute('data-stock') || btn.dataset.stock || '', 10);
    // Preferuj reálný obrázek z karty; data-image použij jen jako fallback
    let image = btn.getAttribute('data-image') || btn.dataset.image || '';
    const cardImg = btn.closest('.product-card')?.querySelector('img');
    if (cardImg) image = cardImg.currentSrc || cardImg.src || image;
    let qty = 1;
    const qtyInputSel = btn.getAttribute('data-qty-selector');
    if (qtyInputSel){
      const q = document.querySelector(qtyInputSel);
      if (q) qty = parseInt(q.value||'1',10);
    }
    if (!price || price<0){ alert('Chybí cena produktu (data-price).'); return; }
    add({id, name, price, image, stock: isFinite(stock) ? stock : undefined}, qty);
    ensureUI(); open();
  }, false);

  // Klik mimo panel zavře košík
  document.addEventListener('click', (e)=>{
    const wrap = document.getElementById('cart-drawer');
    if (!wrap) return;
    const panel = wrap.querySelector('.cart-panel');
    const toggle = wrap.querySelector('.cart-toggle');
    const isOpen = (wrap.classList.contains('open') || panel.getAttribute('aria-hidden') === 'false');
    if (!isOpen) return;
    const clickedInsidePanel = panel.contains(e.target);
    const clickedToggle = toggle.contains(e.target);
    if (!clickedInsidePanel && !clickedToggle) close();
  }, true);

  // Veřejné API
  window.Cart = { load, save, add, setQty, inc, dec, remove, clear, count, total, open, close, ensureUI, updateUI };

  // Auto init
  document.addEventListener('DOMContentLoaded', ensureUI);
  window.addEventListener('cart:change', ()=> { const el=document.getElementById('cart-drawer'); if(el) updateUI(); });

})();