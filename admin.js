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

  // Orders elements
  const ordersList = document.getElementById('ordersList');
  const refreshOrdersBtn = document.getElementById('refreshOrders');
  const migrateOrdersBtn = document.getElementById('migrateOrders');
  const orderFilter = document.getElementById('orderFilter');
  const orderSearch = document.getElementById('orderSearch');
  let allOrders = [];

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
    if (data?.session?.user){ 
      await refreshProducts(); 
      await refreshOrders();
    }
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
    
    // Kontrola nízkého skladu
    checkLowStock(data || []);
    
    productsList.innerHTML = (data||[]).map(p=>{
      const stock = Number(p.stock||0);
      const isLowStock = stock <= 0;
      const stockStyle = isLowStock ? 'color:#dc2626;font-weight:600;background:#fee2e2;padding:2px 6px;border-radius:4px' : '';
      return `
      <div class="product-card glass-card" data-id="${p.id}" style="${isLowStock ? 'border:2px solid #dc2626;background:#fef2f2' : ''}">
        ${p.image_url ? `<img src="${p.image_url}" alt="" loading="lazy" style="width:100%;height:140px;object-fit:cover;border-radius:12px">` : ''}
        <div style="padding:8px 0">
          <div style="font-weight:600">${p.name||''}</div>
          <div class="muted">${(p.category?.name)||''} · ${(Number(p.price)||0).toLocaleString('cs-CZ')} Kč · <span style="${stockStyle}">Sklad: ${stock} ks</span>${typeof p.diameter_mm==='number' ? ` · ⌀ ${p.diameter_mm} mm` : ''}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-secondary" data-edit="${p.id}">Upravit</button>
          <button class="btn-secondary" data-delete="${p.id}">Smazat</button>
        </div>
      </div>
    `;
    }).join('');

    productsList.querySelectorAll('[data-edit]').forEach(btn=> btn.addEventListener('click',()=> editProduct(btn.dataset.edit)));
    productsList.querySelectorAll('[data-delete]').forEach(btn=> btn.addEventListener('click',()=> deleteProduct(btn.dataset.delete)));
  }

  function checkLowStock(products) {
    const lowStockProducts = products.filter(p => Number(p.stock || 0) <= 0);
    const alertEl = document.getElementById('lowStockAlert');
    const messageEl = document.getElementById('lowStockMessage');
    
    if (lowStockProducts.length > 0) {
      alertEl.style.display = '';
      const productNames = lowStockProducts.map(p => p.name).join(', ');
      messageEl.textContent = `Vyprodáno: ${productNames}`;
    } else {
      alertEl.style.display = 'none';
    }
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

  // === Orders Management ===
  async function refreshOrders(){
    if (!ordersList) return;
    ordersList.innerHTML = '<div class="muted">Načítám objednávky...</div>';
    
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      
      if (!data.ok) {
        ordersList.innerHTML = `<div class="muted">Chyba: ${data.error}</div>`;
        return;
      }
      
      allOrders = data.orders || [];
      renderOrders();
    } catch (error) {
      ordersList.innerHTML = `<div class="muted">Chyba načítání: ${error.message}</div>`;
    }
  }

  function renderOrders(){
    if (!ordersList) return;
    
    const filter = orderFilter?.value || 'all';
    const search = orderSearch?.value?.toLowerCase() || '';
    
    let filteredOrders = allOrders;
    
    // Filter by status
    if (filter === 'paid') {
      filteredOrders = allOrders.filter(o => o.paid === true || o.paid === 'true');
    } else if (filter === 'unpaid') {
      filteredOrders = allOrders.filter(o => !o.paid || o.paid === false || o.paid === 'false');
    }
    
    // Search filter
    if (search) {
      filteredOrders = filteredOrders.filter(o => 
        (o.order_number && o.order_number.toLowerCase().includes(search)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(search)) ||
        (o.customer_email && o.customer_email.toLowerCase().includes(search)) ||
        (o.vs && o.vs.toString().includes(search))
      );
    }
    
    if (!filteredOrders.length) {
      ordersList.innerHTML = '<div class="muted">Žádné objednávky nenalezeny</div>';
      return;
    }
    
    // Sort by date (newest first)
    filteredOrders.sort((a, b) => new Date(b.timestamp || b.created_at || 0) - new Date(a.timestamp || a.created_at || 0));
    
    ordersList.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f8f9fa;border-bottom:2px solid #dee2e6">
            <th style="padding:12px;text-align:left;border-bottom:1px solid #dee2e6">Číslo</th>
            <th style="padding:12px;text-align:left;border-bottom:1px solid #dee2e6">Zákazník</th>
            <th style="padding:12px;text-align:left;border-bottom:1px solid #dee2e6">E-mail</th>
            <th style="padding:12px;text-align:right;border-bottom:1px solid #dee2e6">Částka</th>
            <th style="padding:12px;text-align:center;border-bottom:1px solid #dee2e6">VS</th>
            <th style="padding:12px;text-align:center;border-bottom:1px solid #dee2e6">Stav</th>
            <th style="padding:12px;text-align:left;border-bottom:1px solid #dee2e6">Datum</th>
          </tr>
        </thead>
        <tbody>
          ${filteredOrders.map(order => {
            const isPaid = order.paid === true || order.paid === 'true';
            const paidStyle = isPaid ? 'color:#10b981;font-weight:600' : 'color:#dc2626;font-weight:600';
            const paidText = isPaid ? 'Zaplaceno' : 'Nezaplaceno';
            const date = new Date(order.timestamp || order.created_at || 0);
            const dateStr = date.toLocaleDateString('cs-CZ') + ' ' + date.toLocaleTimeString('cs-CZ', {hour: '2-digit', minute: '2-digit'});
            
            return `
              <tr style="border-bottom:1px solid #dee2e6">
                <td style="padding:12px;font-weight:600">#${order.order_number || 'N/A'}</td>
                <td style="padding:12px">${order.customer_name || 'N/A'}</td>
                <td style="padding:12px">${order.customer_email || 'N/A'}</td>
                <td style="padding:12px;text-align:right;font-weight:600">${(order.amount || 0).toLocaleString('cs-CZ')} Kč</td>
                <td style="padding:12px;text-align:center;font-family:monospace">${order.vs || 'N/A'}</td>
                <td style="padding:12px;text-align:center"><span style="${paidStyle}">${paidText}</span></td>
                <td style="padding:12px;color:#666">${dateStr}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // Migrace objednávek z Google Sheets
  async function migrateOrdersFromSheets() {
    if (!requireSB()) return;
    
    try {
      console.log('🔄 Začínám migraci objednávek...');
      
      // Simulace dat z Google Sheets - nahraď skutečnými daty
      const mockOrders = [
        {
          order_number: '20250101001',
          customer_name: 'Jan Novák',
          customer_email: 'jan.novak@email.cz',
          customer_phone: '+420 777 123 456',
          address_line: 'Hlavní 123',
          address_city: 'Praha',
          address_zip: '11000',
          amount: 138,
          vs: '1234567890',
          ss: '9876543210',
          payment_message: 'Děkuji za pomoc',
          delivery_note: 'Zvonit 2x',
          paid: false,
          timestamp: '2025-01-01T10:30:00Z',
          items: [{ name: 'Náramek lásky', qty: 2, price: 69 }]
        },
        {
          order_number: '20250101002',
          customer_name: 'Marie Svobodová',
          customer_email: 'marie.svobodova@email.cz',
          customer_phone: '+420 777 987 654',
          address_line: 'Náměstí 45',
          address_city: 'Brno',
          address_zip: '60200',
          amount: 207,
          vs: '1234567891',
          ss: '9876543211',
          payment_message: 'Pro děti v nouzi',
          delivery_note: 'Doručit do 17:00',
          paid: true,
          timestamp: '2025-01-01T14:15:00Z',
          items: [{ name: 'Náramek naděje', qty: 3, price: 69 }]
        }
      ];
      
      console.log(`📦 Načteno ${mockOrders.length} objednávek z Google Sheets`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const order of mockOrders) {
        try {
          const { error } = await window.sb
            .from('orders')
            .insert({
              order_number: order.order_number,
              customer_name: order.customer_name,
              customer_email: order.customer_email,
              customer_phone: order.customer_phone,
              address_line: order.address_line,
              address_city: order.address_city,
              address_zip: order.address_zip,
              amount: order.amount,
              vs: order.vs,
              ss: order.ss,
              payment_message: order.payment_message,
              delivery_note: order.delivery_note,
              items: order.items,
              paid: order.paid,
              created_at: order.timestamp
            });
          
          if (error) {
            console.error(`❌ Chyba při migraci objednávky ${order.order_number}:`, error);
            errorCount++;
          } else {
            console.log(`✅ Migrována objednávka ${order.order_number}`);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Chyba při migraci objednávky ${order.order_number}:`, err);
          errorCount++;
        }
      }
      
      console.log(`🎉 Migrace dokončena! Úspěšně: ${successCount}, Chyby: ${errorCount}`);
      
      if (successCount > 0) {
        alert(`Migrace dokončena! Úspěšně: ${successCount}, Chyby: ${errorCount}`);
        await refreshOrders();
      }
      
    } catch (error) {
      console.error('❌ Chyba při migraci:', error);
      alert('Chyba při migraci: ' + error.message);
    }
  }

  // Event listeners for orders
  if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener('click', refreshOrders);
  }
  
  if (migrateOrdersBtn) {
    migrateOrdersBtn.addEventListener('click', migrateOrdersFromSheets);
  }
  
  if (orderFilter) {
    orderFilter.addEventListener('change', renderOrders);
  }
  
  if (orderSearch) {
    orderSearch.addEventListener('input', renderOrders);
  }
})();


