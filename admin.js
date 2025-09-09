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

  // Products expand/collapse
  const toggleProductsBtn = document.getElementById('toggleProductsBtn');
  let productsExpanded = false;

  function requireSB(){
    if (!window.sb){ alert('Supabase není inicializováno. Nejprve nastavte SUPABASE_URL a SUPABASE_ANON_KEY v config.js.'); return false; }
    return true;
  }

  function toggleProducts() {
    productsExpanded = !productsExpanded;
    productsList.style.display = productsExpanded ? 'grid' : 'none';
    toggleProductsBtn.textContent = productsExpanded ? 'Sbalit' : 'Rozbalit';
    toggleProductsBtn.classList.toggle('expanded', productsExpanded);
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
      .select('id,name,price,stock,size,image_url,category:categories(slug,name)')
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
          <div class="muted">${(p.category?.name)||''} · ${(Number(p.price)||0).toLocaleString('cs-CZ')} Kč · <span style="${stockStyle}">Sklad: ${stock} ks</span>${p.size ? ` · ${p.size}` : ''}</div>
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
    if (productForm.size) productForm.size.value = (data.size ?? '');
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
        size: productForm.size?.value || null,
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
            <th style="padding:12px;text-align:center;border-bottom:1px solid #dee2e6">Odesláno</th>
            <th style="padding:12px;text-align:center;border-bottom:1px solid #dee2e6">Štítek</th>
          </tr>
        </thead>
        <tbody>
          ${filteredOrders.map((order, index) => {
            const isPaid = order.paid === true || order.paid === 'true';
            const isShipped = order.shipped === true || order.shipped === 'true';
            const paidStyle = isPaid ? 'color:#10b981;font-weight:600' : 'color:#dc2626;font-weight:600';
            const paidText = isPaid ? 'Zaplaceno' : 'Nezaplaceno';
            const date = new Date(order.timestamp || order.created_at || 0);
            const dateStr = date.toLocaleDateString('cs-CZ') + ' ' + date.toLocaleTimeString('cs-CZ', {hour: '2-digit', minute: '2-digit'});
            
            // Střídavé barvy řádků
            const rowBgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            
            // Render products button
            let productsHtml = '';
            if (order.items && Array.isArray(order.items)) {
              const totalItems = order.items.reduce((sum, item) => sum + (item.qty || 0), 0);
              productsHtml = `
                <div style="margin-top: 8px;">
                  <button class="btn btn-outline" onclick="showOrderProducts('${order.id || order.order_number}')" style="font-size: 12px; padding: 4px 8px;">
                    📦 ${totalItems} položek
                  </button>
                </div>
              `;
            }

            // Render address button
            let addressHtml = '';
            console.log('Order data:', order); // Debug
            if (order.address_line || order.address_city || order.address_zip) {
              addressHtml = `
                <div style="margin-top: 8px;">
                  <button class="btn btn-outline" onclick="showOrderAddress('${order.id || order.order_number}')" style="font-size: 12px; padding: 4px 8px;">
                    📍 Adresa
                  </button>
                </div>
              `;
            } else {
              // Debug - zobraz i když nemá adresu
              addressHtml = `
                <div style="margin-top: 8px;">
                  <button class="btn btn-outline" onclick="showOrderAddress('${order.id || order.order_number}')" style="font-size: 12px; padding: 4px 8px; background: #ffeb3b;">
                    📍 Adresa (debug)
                  </button>
                </div>
              `;
            }
            
            return `
              <tr style="border-bottom:1px solid #dee2e6; background-color: ${rowBgColor};">
                <td style="padding:12px;font-weight:600">#${order.order_number || 'N/A'}</td>
                <td style="padding:12px">
                  <div>${order.customer_name || 'N/A'}</div>
                  ${productsHtml}
                  ${addressHtml}
                </td>
                <td style="padding:12px">${order.customer_email || 'N/A'}</td>
                <td style="padding:12px;text-align:right;font-weight:600">${(order.amount || 0).toLocaleString('cs-CZ')} Kč</td>
                <td style="padding:12px;text-align:center;font-family:monospace">${order.vs || 'N/A'}</td>
                <td style="padding:12px;text-align:center"><span style="${paidStyle}">${paidText}</span></td>
                <td style="padding:12px;color:#666">${dateStr}</td>
                <td style="padding:12px;text-align:center">
                  <div class="shipped-checkbox">
                    <input type="checkbox" id="shipped_${order.id || order.order_number}" ${isShipped ? 'checked' : ''} onchange="updateShippedStatus('${order.id || order.order_number}', this.checked)">
                    <label for="shipped_${order.id || order.order_number}">Odesláno</label>
                  </div>
                  <div style="margin-top: 8px;">
                    <button onclick="deleteOrder('${order.id || order.order_number}')" style="font-size: 11px; padding: 4px 8px; background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; border-radius: 4px; cursor: pointer;">
                      🗑️ Smazat
                    </button>
                  </div>
                </td>
                <td style="padding:12px;text-align:center">
                  <button onclick="printShippingLabel('${order.id || order.order_number}')" style="font-size: 11px; padding: 4px 8px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🏷️ Tisk štítku
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // Update shipped status
  async function updateShippedStatus(orderId, shipped) {
    if (!requireSB()) return;
    
    try {
      // Zkus aktualizovat podle id
      let { error } = await window.sb
        .from('orders')
        .update({ shipped: shipped })
        .eq('id', orderId);
        
      // Pokud selže, zkus podle order_number
      if (error) {
        console.log('Zkouším podle order_number...');
        const result = await window.sb
          .from('orders')
          .update({ shipped: shipped })
          .eq('order_number', orderId);
        error = result.error;
      }
        
      if (error) {
        console.error('Chyba při aktualizaci:', error);
        alert('Chyba při aktualizaci stavu odeslání: ' + error.message);
      } else {
        console.log('Stav odeslání aktualizován');
        // Refresh orders to show updated status
        refreshOrders();
      }
    } catch (err) {
      console.error('Chyba:', err);
      alert('Chyba při aktualizaci stavu odeslání: ' + err.message);
    }
  }

  // Make updateShippedStatus globally available
  window.updateShippedStatus = updateShippedStatus;

  // Show order products modal
  function showOrderProducts(orderId) {
    const order = allOrders.find(o => (o.id || o.order_number) == orderId);
    if (!order || !order.items) return;

    const modal = document.getElementById('orderProductsModal');
    const list = document.getElementById('orderProductsList');
    
    list.innerHTML = order.items.map(item => `
      <div class="glass-card" style="padding: 16px; text-align: center;">
        <img src="${item.image || 'images/detidetem.logo.webp'}" 
             alt="${item.name}" 
             style="width: 120px; height: 120px; object-fit: cover; border-radius: 12px; margin-bottom: 12px;"
             onerror="this.src='images/detidetem.logo.webp'">
        <h4 style="margin: 8px 0; font-size: 16px;">${item.name}</h4>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
          <span style="font-weight: 600; color: #3b82f6;">${item.qty}x</span>
          <span style="font-weight: 600; color: #10b981;">${(item.price || 69).toLocaleString('cs-CZ')} Kč</span>
        </div>
        ${item.size ? `<div style="margin-top: 8px; color: #666; font-size: 14px;">Velikost: ${item.size}</div>` : ''}
      </div>
    `).join('');

    modal.style.display = 'flex';
  }

  // Make showOrderProducts globally available
  window.showOrderProducts = showOrderProducts;

  // Show order address modal
  function showOrderAddress(orderId) {
    const order = allOrders.find(o => (o.id || o.order_number) == orderId);
    if (!order) return;

    const modal = document.getElementById('orderAddressModal');
    const content = document.getElementById('orderAddressContent');
    
    const addressParts = [];
    if (order.address_line) addressParts.push(order.address_line);
    if (order.address_city) addressParts.push(order.address_city);
    if (order.address_zip) addressParts.push(order.address_zip);
    
    const fullAddress = addressParts.join(', ');
    
    content.innerHTML = `
      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 12px 0; color: #374151;">Zákazník</h4>
        <div style="margin-bottom: 8px;"><strong>Jméno:</strong> ${order.customer_name || 'N/A'}</div>
        <div style="margin-bottom: 8px;"><strong>E-mail:</strong> ${order.customer_email || 'N/A'}</div>
        ${order.customer_phone ? `<div style="margin-bottom: 8px;"><strong>Telefon:</strong> ${order.customer_phone}</div>` : ''}
      </div>
      
      <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h4 style="margin: 0 0 12px 0; color: #374151;">Doručovací adresa</h4>
        ${fullAddress ? `<div style="font-size: 16px; line-height: 1.5;">${fullAddress}</div>` : '<div style="color: #6b7280; font-style: italic;">Adresa není k dispozici</div>'}
      </div>
      
      ${order.delivery_note ? `
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 16px; border-left: 4px solid #f59e0b;">
          <h4 style="margin: 0 0 8px 0; color: #374151;">Poznámka k doručení</h4>
          <div style="font-style: italic;">${order.delivery_note}</div>
        </div>
      ` : ''}
    `;

    modal.style.display = 'flex';
  }

  // Make showOrderAddress globally available
  window.showOrderAddress = showOrderAddress;

  // Delete order function
  async function deleteOrder(orderId) {
    if (!requireSB()) return;
    
    if (!confirm('Opravdu chcete smazat tuto objednávku? Tato akce je nevratná!')) {
      return;
    }
    
    try {
      const { error } = await window.sb
        .from('orders')
        .delete()
        .eq('id', orderId);
        
      if (error) {
        console.error('Chyba při mazání objednávky:', error);
        alert('Chyba při mazání objednávky: ' + error.message);
      } else {
        console.log('Objednávka smazána');
        alert('Objednávka byla úspěšně smazána');
        // Refresh orders to show updated list
        refreshOrders();
      }
    } catch (err) {
      console.error('Chyba:', err);
      alert('Chyba při mazání objednávky: ' + err.message);
    }
  }

  // Make deleteOrder globally available
  window.deleteOrder = deleteOrder;

  // Print shipping label
  function printShippingLabel(orderId) {
    console.log('Hledám objednávku s ID:', orderId);
    
    // Hledej podle id nebo order_number (oba jako stringy)
    const order = allOrders.find(o => {
      const oId = String(o.id || o.order_number);
      const searchId = String(orderId);
      return oId === searchId;
    });
    
    if (!order) {
      alert(`Objednávka nenalezena. Hledané ID: ${orderId}`);
      return;
    }
    
    console.log('Nalezená objednávka:', order);

    // Check if order has address
    if (!order.address_line && !order.address_city && !order.address_zip) {
      alert('Objednávka nemá dodací adresu');
      return;
    }

    // Create label HTML
    const labelHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Dodací štítek - ${order.order_number}</title>
        <style>
          @page {
            size: 100mm 50mm;
            margin: 2mm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            margin: 0;
            padding: 0;
            width: 96mm;
            height: 46mm;
            border: 1px solid #000;
            box-sizing: border-box;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          }
          .label-header {
            background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
            color: white;
            padding: 3mm;
            border-bottom: 2px solid #5f3dc4;
            font-weight: bold;
            text-align: center;
            font-size: 12px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            position: relative;
          }
          .logo-section {
            position: absolute;
            top: 2mm;
            right: 2mm;
            width: 15mm;
            height: 15mm;
            background: white;
            border: 2px solid #6c5ce7;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .logo-section img {
            width: 12mm;
            height: 12mm;
            object-fit: contain;
          }
          .logo-text {
            font-size: 5px;
            font-weight: bold;
            color: #6c5ce7;
            margin-top: 0.5mm;
          }
          .address {
            padding: 3mm;
            line-height: 1.3;
            text-align: center;
            margin-top: 2mm;
          }
          .customer-name {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 1mm;
            color: #2d3436;
          }
          .address-line {
            margin-bottom: 0.5mm;
            color: #636e72;
          }
          .city-zip {
            font-weight: bold;
            color: #2d3436;
            font-size: 11px;
          }
          .order-info {
            position: absolute;
            bottom: 2mm;
            left: 50%;
            transform: translateX(-50%);
            font-size: 8px;
            color: #636e72;
            background: rgba(255,255,255,0.8);
            padding: 2mm;
            border-radius: 4px;
            border: 1px solid #ddd;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="label-header">
          DODACÍ ŠTÍTEK - ${order.order_number}
        </div>
        <div class="logo-section">
          <img src="images/detidetem.logo.webp" alt="Děti dětem">
          <div class="logo-text">Děti dětem</div>
        </div>
        <div class="address">
          <div class="customer-name">${order.customer_name || 'N/A'}</div>
          <div class="address-line">${order.address_line || ''}</div>
          <div class="city-zip">${order.address_zip || ''} ${order.address_city || ''}</div>
        </div>
        <div class="order-info">
          VS: ${order.vs || 'N/A'}
        </div>
      </body>
      </html>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(labelHtml);
    printWindow.document.close();
    
    // Auto print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  // Make printShippingLabel globally available
  window.printShippingLabel = printShippingLabel;

  // Migrace objednávek z Google Sheets
  async function migrateOrdersFromSheets() {
    if (!requireSB()) return;
    
    try {
      console.log('🔄 Začínám migraci objednávek...');
      
      // Načti skutečné objednávky z Google Sheets
      const sheetId = '1bdFnnpZ7dVJImOr8qmzK7_wN2dvhmjSB8VB2Kk4U1gE';
      const sheetName = 'Objednávky';
      
      // Pro teď použijeme mock data, ale můžeme to upravit později
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

  if (toggleProductsBtn) {
    toggleProductsBtn.addEventListener('click', toggleProducts);
  }

  // Order products modal
  const orderProductsModal = document.getElementById('orderProductsModal');
  const opClose = document.getElementById('opClose');
  
  if (opClose) {
    opClose.addEventListener('click', () => {
      orderProductsModal.style.display = 'none';
    });
  }
  
  if (orderProductsModal) {
    orderProductsModal.addEventListener('click', (e) => {
      if (e.target === orderProductsModal) {
        orderProductsModal.style.display = 'none';
      }
    });
  }

  // Order address modal
  const orderAddressModal = document.getElementById('orderAddressModal');
  const oaClose = document.getElementById('oaClose');
  
  if (oaClose) {
    oaClose.addEventListener('click', () => {
      orderAddressModal.style.display = 'none';
    });
  }
  
  if (orderAddressModal) {
    orderAddressModal.addEventListener('click', (e) => {
      if (e.target === orderAddressModal) {
        orderAddressModal.style.display = 'none';
      }
    });
  }
  
  if (orderFilter) {
    orderFilter.addEventListener('change', renderOrders);
  }
  
  if (orderSearch) {
    orderSearch.addEventListener('input', renderOrders);
  }
})();


