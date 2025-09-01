
(function(){
  const CART_KEY = "cart_v1";
  const fmt = (n)=> new Intl.NumberFormat('cs-CZ', { style:'currency', currency:'CZK', maximumFractionDigits: 0 }).format(n);

  function load(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)||"[]"); }catch(e){ return []; } }
  function save(items){ localStorage.setItem(CART_KEY, JSON.stringify(items)); window.dispatchEvent(new CustomEvent('cart:change')); }

  function add(item, qty=1){
    const items = load();
    const i = items.findIndex(x=>x.id===item.id);
    if (i>=0){ items[i].qty += qty; } else { items.push({ ...item, qty }); }
    save(items);
    toast(`Přidáno do košíku: ${item.name}`);
  }
  function setQty(id, qty){
    const items = load().map(x=> x.id===id ? { ...x, qty: Math.max(1, qty|0) } : x);
    save(items);
  }
  function inc(id){ const items = load(); const it = items.find(x=>x.id===id); if(it){ it.qty+=1; save(items);} }
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
      <div class="cart-row" data-id="${it.id}">
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
    list.querySelectorAll('.inc').forEach(btn=> btn.addEventListener('click', (e)=>{
      const id = e.target.closest('.cart-row').dataset.id; inc(id); updateUI();
    }));
    list.querySelectorAll('.dec').forEach(btn=> btn.addEventListener('click', (e)=>{
      const id = e.target.closest('.cart-row').dataset.id; dec(id); updateUI();
    }));
    list.querySelectorAll('.remove').forEach(btn=> btn.addEventListener('click', (e)=>{
      const id = e.target.closest('.cart-row').dataset.id; remove(id); updateUI();
    }));
    list.querySelectorAll('.val').forEach(inp=> inp.addEventListener('change', (e)=>{
      const id = e.target.closest('.cart-row').dataset.id; setQty(id, parseInt(inp.value||'1',10)); updateUI();
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
    const name = btn.getAttribute('data-name') || btn.dataset.name || btn.textContent.trim() || 'Produkt';
    const price = parseFloat(btn.getAttribute('data-price') || btn.dataset.price);
    const image = btn.getAttribute('data-image') || btn.dataset.image || '';
    let qty = 1;
    const qtyInputSel = btn.getAttribute('data-qty-selector');
    if (qtyInputSel){
      const q = document.querySelector(qtyInputSel);
      if (q) qty = parseInt(q.value||'1',10);
    }
    if (!price || price<0){ alert('Chybí cena produktu (data-price).'); return; }
    add({id, name, price, image}, qty);
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