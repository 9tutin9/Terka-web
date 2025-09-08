(function(){
  'use strict';

  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const authState = document.getElementById('authState');
  const authBox = document.getElementById('authBox');
  const adminUI = document.getElementById('adminUI');
  const productForm = document.getElementById('productForm');
  const productsList = document.getElementById('productsList');
  const imageFile = document.getElementById('imageFile');
  const uploadBtn = document.getElementById('uploadBtn');
  const imagePreview = document.getElementById('imagePreview');
  const pickFromStorageBtn = document.getElementById('pickFromStorage');
  const spModal = document.getElementById('storagePicker');
  const spClose = document.getElementById('spClose');
  const spGrid = document.getElementById('spGrid');
  const spSearch = document.getElementById('spSearch');
  const spReload = document.getElementById('spReload');
  const spPrev = document.getElementById('spPrev');
  const spNext = document.getElementById('spNext');
  let spPage = 0;
  const spPageSize = 24;

  function requireSB(){
    if (!window.sb){ alert('Supabase není inicializováno. Nejprve nastavte SUPABASE_URL a SUPABASE_ANON_KEY v config.js.'); return false; }
    return true;
  }

  function setAuthUI(user){
    if (user){
      authState.textContent = `Přihlášen: ${user.email || 'admin'}`;
      logoutBtn.style.display = '';
      if (loginForm) loginForm.style.display = 'none';
      adminUI.style.display = '';
    } else {
      authState.textContent = 'Přihlašte se';
      logoutBtn.style.display = 'none';
      if (loginForm) loginForm.style.display = '';
      adminUI.style.display = 'none';
    }
  }

  async function checkSession(){
    if (!requireSB()) return;
    const { data } = await sb.auth.getSession();
    setAuthUI(data?.session?.user || null);
    if (data?.session?.user){ await refreshProducts(); }
  }

  if (loginForm){
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if (!requireSB()) return;
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value.trim();
      try{
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthUI(data.user);
        await refreshProducts();
      }catch(err){ alert('Login error: ' + (err.message||err)); }
    });
  }

  if (logoutBtn){
    logoutBtn.addEventListener('click', async ()=>{
      if (!requireSB()) return;
      await sb.auth.signOut();
      setAuthUI(null);
    });
  }

  async function refreshProducts(){
    if (!requireSB()) return;
    productsList.innerHTML = '<div class="muted">Načítám...</div>';
    const { data, error } = await sb
      .from('products')
      .select('id,name,price,stock,diameter_mm,image_url,category:categories(slug,name)')
      .order('created_at', { ascending: false });
    if (error){ productsList.innerHTML = `<div class="muted">Chyba: ${error.message}</div>`; return; }
    productsList.innerHTML = (data||[]).map(p=>`
      <div class="product-card glass-card" data-id="${p.id}">
        ${p.image_url ? `<img src="${p.image_url}" alt="" loading="lazy" style="width:100%;height:140px;object-fit:cover;border-radius:12px">` : ''}
        <div style="padding:8px 0">
          <div style="font-weight:600">${p.name||''}</div>
          <div class="muted">${(p.category?.name)||''} · ${(Number(p.price)||0).toLocaleString('cs-CZ')} Kč · Sklad: ${Number(p.stock||0)}${typeof p.diameter_mm==='number' ? ` · ⌀ ${p.diameter_mm} mm` : ''}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-secondary" data-edit="${p.id}">Upravit</button>
          <button class="btn-secondary" data-delete="${p.id}">Smazat</button>
        </div>
      </div>
    `).join('');

    productsList.querySelectorAll('[data-edit]').forEach(btn=> btn.addEventListener('click',()=> editProduct(btn.dataset.edit)));
    productsList.querySelectorAll('[data-delete]').forEach(btn=> btn.addEventListener('click',()=> deleteProduct(btn.dataset.delete)));
  }

  async function editProduct(id){
    if (!requireSB()) return;
    const { data, error } = await sb.from('products').select('*').eq('id', id).single();
    if (error){ alert(error.message); return; }
    productForm.id.value = data.id || '';
    productForm.name.value = data.name || '';
    productForm.price.value = 69;
    productForm.category_slug.value = data.category_slug || 'love';
    productForm.image_url.value = data.image_url || '';
    productForm.description.value = data.description || '';
    if (productForm.stock) productForm.stock.value = Number(data.stock||0);
    if (productForm.diameter_mm) productForm.diameter_mm.value = (data.diameter_mm ?? '');
    window.scrollTo({ top: productForm.getBoundingClientRect().top + window.scrollY - 120, behavior:'smooth' });
  }

  async function deleteProduct(id){
    if (!requireSB()) return;
    if (!confirm('Opravdu smazat produkt?')) return;
    const { error } = await sb.from('products').delete().eq('id', id);
    if (error){ alert(error.message); return; }
    await refreshProducts();
  }

  if (document.getElementById('resetForm')){
    document.getElementById('resetForm').addEventListener('click', ()=>{
      productForm.reset();
      productForm.id.value = '';
    });
  }

  if (productForm){
    productForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if (!requireSB()) return;
      const payload = {
        name: productForm.name.value.trim(),
        price: 69,
        category_slug: productForm.category_slug.value,
        image_url: productForm.image_url.value.trim() || null,
        description: productForm.description.value.trim() || null,
        stock: Number(productForm.stock?.value||0) || 0,
        diameter_mm: productForm.diameter_mm?.value ? Number(productForm.diameter_mm.value) : null,
      };
      try{
        if (productForm.id.value){
          const { error } = await sb.from('products').update(payload).eq('id', productForm.id.value);
          if (error) throw error;
        } else {
          const { error } = await sb.from('products').insert(payload);
          if (error) throw error;
        }
        productForm.reset(); productForm.id.value='';
        if (imagePreview){ imagePreview.src=''; imagePreview.style.display='none'; }
        await refreshProducts();
      }catch(err){ alert('Uložení selhalo: ' + (err.message||err)); }
    });
  }

  // === Upload do Supabase Storage ===
  function toSlugName(name){
    return (name||'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/(^-|-$)/g,'')
      .slice(0,60);
  }

  async function ensureBucket(){
    // Buckety se vytvářejí přes Studio; jen informativně varujeme pokud upload selže kvůli bucketu
    return true;
  }

  if (imageFile){
    imageFile.addEventListener('change', ()=>{
      const f = imageFile.files && imageFile.files[0];
      if (f && imagePreview){
        const url = URL.createObjectURL(f);
        imagePreview.src = url;
        imagePreview.style.display = '';
      }
    });
  }

  if (uploadBtn){
    uploadBtn.addEventListener('click', async ()=>{
      if (!requireSB()) return;
      const f = imageFile && imageFile.files && imageFile.files[0];
      if (!f){ alert('Vyberte obrázek.'); return; }
      await ensureBucket();
      try{
        const ext = (f.name.split('.').pop()||'jpg').toLowerCase();
        const base = toSlugName(productForm.name.value || f.name.replace(/\.[^.]+$/,''));
        const now = new Date().toISOString().replace(/[:.]/g,'-');
        const path = `${base}-${now}.${ext}`;
        const { data, error } = await sb.storage.from('images').upload(path, f, { upsert: false, cacheControl: '3600', contentType: f.type });
        if (error) throw error;
        const { data: pub } = sb.storage.from('images').getPublicUrl(data.path);
        const url = pub?.publicUrl || '';
        if (!url) throw new Error('Nepodařilo se získat public URL');
        productForm.image_url.value = url;
        alert('Nahráno. URL doplněno do pole obrázku.');
      }catch(err){ alert('Upload selhal: ' + (err.message||err)); }
    });
  }

  document.addEventListener('DOMContentLoaded', checkSession);

  // === Storage Picker ===
  function openPicker(){ if (spModal){ spModal.style.display='flex'; loadPicker(); } }
  function closePicker(){ if (spModal){ spModal.style.display='none'; } }
  async function loadPicker(){
    if (!requireSB()) return;
    spGrid.innerHTML = '<div class="muted">Načítám...</div>';
    try{
      const from = spPage * spPageSize;
      const to = from + spPageSize - 1;
      const { data, error } = await sb.storage.from('images').list('', { limit: spPageSize, offset: from, search: (spSearch?.value||'') });
      if (error) throw error;
      
      // Získat seznam používaných obrázků z produktů
      const { data: products } = await sb.from('products').select('image_url');
      const usedImages = new Set((products || []).map(p => p.image_url).filter(Boolean));
      
      const items = (data||[]).filter(x=> x && !x.id?.endsWith('/') );
      spGrid.innerHTML = items.map(it=>{
        const path = it.name;
        const { data: pub } = sb.storage.from('images').getPublicUrl(path);
        const url = pub?.publicUrl || '';
        const isUsed = usedImages.has(url);
        const usedStyle = isUsed ? 'border: 2px solid #10b981; background: rgba(16, 185, 129, 0.1);' : '';
        const usedLabel = isUsed ? '<div style="position:absolute;top:4px;right:4px;background:#10b981;color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600">POUŽITO</div>' : '';
        return `<div class="glass-card" data-url="${url}" style="padding:6px;cursor:pointer;position:relative;${usedStyle}">
          <img src="${url}" alt="" loading="lazy" style="width:100%;height:110px;object-fit:cover;border-radius:8px">
          <div class="muted" style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.name}</div>
          ${usedLabel}
        </div>`;
      }).join('');
      spGrid.querySelectorAll('.glass-card').forEach(card=> card.addEventListener('click', ()=>{
        const url = card.getAttribute('data-url')||'';
        if (url){ productForm.image_url.value = url; imagePreview.src = url; imagePreview.style.display=''; closePicker(); }
      }));
    }catch(err){ spGrid.innerHTML = `<div class="muted">Chyba: ${err.message||err}</div>`; }
  }
  if (pickFromStorageBtn){ pickFromStorageBtn.addEventListener('click', openPicker); }
  if (spClose){ spClose.addEventListener('click', closePicker); }
  if (spReload){ spReload.addEventListener('click', ()=>{ spPage=0; loadPicker(); }); }
  if (spPrev){ spPrev.addEventListener('click', ()=>{ spPage=Math.max(0, spPage-1); loadPicker(); }); }
  if (spNext){ spNext.addEventListener('click', ()=>{ spPage=spPage+1; loadPicker(); }); }
  if (spSearch){ spSearch.addEventListener('input', ()=>{ spPage=0; loadPicker(); }); }
})();


