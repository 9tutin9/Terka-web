(function(){
  'use strict';

  function ensureSB(){ return !!window.sb; }

  function detectCategorySlug(){
    const path = (location.pathname||'').toLowerCase();
    if (path.includes('naramek-lasky')) return 'love';
    if (path.includes('naramek-nadeje')) return 'hope';
    if (path.includes('naramek-radosti')) return 'joy';
    if (path.includes('naramek-pratelstvi')) return 'friendship';
    if (path.includes('naramek-pomoci')) return 'help';
    if (path.includes('naramek-stesti')) return 'luck';
    return null;
  }

  function renderCards(container, products){
    container.innerHTML = (products||[]).map((p, idx)=>{
      const id = (p.id || `${p.category_slug||'prod'}-${idx+1}`);
      const img = p.image_url ? `<img src="${p.image_url}" alt="" loading="lazy" style="width:100%;height:220px;object-fit:cover;border-radius:16px;margin-bottom:16px">` : '';
      const qtyId = `qty-${id}`;
      const stock = Number(p.stock||0);
      const soldOut = stock <= 0;
      return `
        <div class="product-card glass-card">
          ${img}
          <div class="muted" style="margin:4px 0 -4px 0;font-size:0.9rem">Sklad: ${Math.max(0, stock)} ks${(typeof p.diameter_mm === 'number' && isFinite(p.diameter_mm)) ? ` · ⌀ ${p.diameter_mm} mm` : ''}</div>
          <div style="display:flex;gap:12px;align-items:center;margin-top:16px">
            <input id="${qtyId}" type="number" min="1" ${soldOut ? 'disabled' : `max="${Math.max(0, stock)}"`} value="1" style="width:80px;padding:8px;border:1px solid rgba(0,0,0,0.1);border-radius:8px">
            <button class="btn-primary" ${soldOut ? 'disabled aria-disabled="true"' : ''} data-add-to-cart data-id="${id}" data-name="${(p.name||'').replace(/"/g,'&quot;')}" data-price="${Number(p.price)||69}" data-image="${p.image_url||''}" data-stock="${Math.max(0, stock)}" data-qty-selector="#${qtyId}">${soldOut ? 'Vyprodáno' : `3 jídla = ${Number(p.price||69).toLocaleString('cs-CZ')} Kč`}</button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function loadCategoryPage(){
    if (!ensureSB()) return;
    const slug = detectCategorySlug();
    if (!slug) return;
    const grid = document.querySelector('.products-section .products-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="muted">Načítám...</div>';
    const { data, error } = await sb.from('products').select('id,name,price,stock,diameter_mm,image_url,description,category_slug,active,created_at').eq('category_slug', slug).eq('active', true).order('created_at', { ascending: true });
    if (error){ grid.innerHTML = `<div class="muted">Chyba načítání: ${error.message}</div>`; return; }
    renderCards(grid, data);
  }

  async function loadEshopOverview(){
    if (!ensureSB()) return;
    const path = (location.pathname||'').toLowerCase();
    if (!path.endsWith('/eshop.html') && !path.includes('eshop.html')) return;
    const grid = document.querySelector('.products-section .products-grid');
    if (!grid) return;
    // Render category tiles from categories table
    const { data, error } = await sb.from('categories').select('slug,name').eq('active', true).order('name');
    if (error){ return; }
    const imageBySlug = {
      love: 'images/BCFQE9447.webp',
      hope: 'images/CJAJE7328.webp',
      joy: 'images/DMUC7072.webp',
      friendship: 'images/DZSNE2447.webp',
      help: 'images/31462ea0-8cdc-45ea-b4a3-0e812c852bf7.webp',
      luck: 'images/a3ee6ce8-d9b9-45a5-b4df-bf1ae1ae4253.webp'
    };
    const hrefBySlug = {
      love: 'naramek-lasky.html',
      hope: 'naramek-nadeje.html',
      joy: 'naramek-radosti.html',
      friendship: 'naramek-pratelstvi.html',
      help: 'naramek-pomoci.html',
      luck: 'naramek-stesti.html'
    };
    grid.innerHTML = (data||[]).map(c=>`
      <div class="product-card glass-card reveal">
        <a href="${hrefBySlug[c.slug]||'#'}" style="text-decoration:none;color:inherit">
          ${imageBySlug[c.slug] ? `<img src="${imageBySlug[c.slug]}" alt="${c.name}" loading="lazy" style="width:100%;height:220px;object-fit:cover;border-radius:16px;margin-bottom:16px">` : ''}
          <h3>${c.name}</h3>
        </a>
        <p><a href="${hrefBySlug[c.slug]||'#'}" class="btn-primary" style="display:inline-block;text-decoration:none;color:white">Chci pomoci</a></p>
      </div>
    `).join('');
  }

  function init(){
    loadCategoryPage();
    loadEshopOverview();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


