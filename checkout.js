// checkout.js — generování QR platby (CZ SPD) + rekapitulace s obrázky + EmailJS + uložení do Sheets
(function(){
  const cfg = (window.PAYCFG||{});
  const MEAL_COST_CZK = 23;
  const MIN_MEALS_PER_BRACELET = 3;
  const MIN_PER_BRACELET = MEAL_COST_CZK * MIN_MEALS_PER_BRACELET; // 69 Kč

  // === DOM prvky ===
  const formEl      = document.getElementById('orderForm');
  const qrCanvas    = document.getElementById('qrCanvas');
  const downloadBtn = document.getElementById('downloadQR');
  const mailtoBtn   = document.getElementById('mailtoFallback');
  const orderNoEl   = document.getElementById('orderNo');

  // === Pomocné ===
  const fmtCZ = (n)=> new Intl.NumberFormat('cs-CZ',{style:'currency',currency:cfg.CURRENCY||'CZK', maximumFractionDigits: 0}).format(n);
  function pad(n){ return n < 10 ? '0'+n : ''+n; }
  function safe(v){ return String(v||''); }
  function valByName(name){ return (document.querySelector(`[name="${name}"]`)?.value || '').trim(); }

  // Vyrenderuje HTML seznam položek pro e-maily
  function renderItemsHTML(items){
    if (!items || !items.length) return '<div style="color:#666">Bez položek</div>';
    return `
    <table role="presentation" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse">
      ${items.map(x=>`
        <tr style="border-bottom:1px solid #eee">
          <td style="width:64px;vertical-align:top">
            ${x.image ? `<img src="${x.image}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px">` : ''}
          </td>
          <td style="vertical-align:top">
            <div style="font-weight:700;color:#222">${safe(x.name)}</div>
            <div style="color:#555;font-size:12px">Množství: ${x.qty}</div>
          </td>
          <td style="text-align:right;white-space:nowrap;vertical-align:top">${fmtCZ((Number(x.price)||0)*(Number(x.qty)||0))}</td>
        </tr>
      `).join('')}
    </table>`;
  }

  // Inicializace EmailJS (pokud je k dispozici public key)
  if (window.emailjs && cfg.EMAILJS_PUBLIC_KEY) {
    emailjs.init({ publicKey: cfg.EMAILJS_PUBLIC_KEY });
  }

  // === VS / číslo objednávky ===
  function generateOrderNumber(){
    const d = new Date();
    const date = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate());
    const time = pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    const rand = Math.floor(Math.random()*900+100);
    return `${date}${time}${rand}`;
  }
  function toNumberVS(orderNo){ return orderNo.slice(-10); }

  // === SPD (CZ QR platba) ===
  function buildSPD({iban, amount, vs, msg, name, currency="CZK", bic=""}){
    if(!iban || /0000 0000 0000/.test(iban)) console.warn("Vyplňte správný IBAN v config.js (PAYCFG.IBAN).");
    const parts = ["SPD*1.0", `ACC:${iban.replace(/\s+/g,'')}`, `AM:${Number(amount).toFixed(2)}`, `CC:${currency||"CZK"}`];
    if (bic) parts.push(`BIC:${bic}`);
    if (vs) parts.push(`X-VS:${vs}`);
    if (msg) parts.push(`MSG:${msg}`);
    if (name) parts.push(`RN:${name}`);
    return parts.join("*");
  }

  // === QR ===
  async function drawQR(text){
      const qrContainer = document.getElementById('qrCode');
    if (!qrContainer) return;
      qrContainer.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.id = 'qrCanvas';
    canvas.width = 256; canvas.height = 256;
      canvas.style.border = '1px solid #ddd';
      canvas.style.borderRadius = '8px';
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      qrContainer.appendChild(canvas);
      if (window.QRCode && window.QRCode.toCanvas) {
      try { await QRCode.toCanvas(canvas, text, { width: 256, margin: 1 }); }
      catch (qrError) { console.warn("QRCode fallback:", qrError); drawFallbackQR(canvas, text); }
    } else { drawFallbackQR(canvas, text); }
      const textDiv = document.createElement('div');
      textDiv.style.marginTop = '1rem';
      textDiv.style.fontFamily = 'monospace';
      textDiv.style.fontSize = '0.8rem';
      textDiv.style.wordBreak = 'break-all';
      textDiv.style.textAlign = 'center';
      textDiv.style.color = '#666';
      textDiv.style.maxWidth = '100%';
      textDiv.style.overflowWrap = 'break-word';
      textDiv.textContent = text;
      qrContainer.appendChild(textDiv);
      const instructionsDiv = document.createElement('div');
      instructionsDiv.style.marginTop = '1rem';
      instructionsDiv.style.textAlign = 'center';
      instructionsDiv.style.color = '#999';
      instructionsDiv.style.fontSize = '0.9rem';
      instructionsDiv.innerHTML = `
      <strong>Naskenujte QR kód nebo zkopírujte text výše</strong><br>
        💳 Použijte mobilní aplikaci vaší banky
      `;
      qrContainer.appendChild(instructionsDiv);
  }

  function drawFallbackQR(canvas, text) {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    const blockSize = size / 25;
    ctx.fillRect(0, 0, size, blockSize);
    ctx.fillRect(0, 0, blockSize, size);
    ctx.fillRect(size - blockSize, 0, blockSize, size);
    ctx.fillRect(0, size - blockSize, size, blockSize);
    for (let i = 0; i < 25; i++) for (let j = 0; j < 25; j++) if (Math.random() > 0.7) ctx.fillRect(i * blockSize, j * blockSize, blockSize, blockSize);
  }

  function canvasToDataURL(canvas){ return canvas.toDataURL("image/png"); }

  // Serverless proxy → /api/order (token zůstává na serveru)
  async function sendToSheet(order){
    try{
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      if (!res.ok) console.warn('Order proxy error:', await res.text());
    }catch(e){ console.warn('Order proxy fetch error:', e); }
  }

  function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast'); if (existingToast) existingToast.remove();
    const toast = document.createElement('div'); toast.className = `toast toast-${type}`; toast.textContent = message; document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
  }

  async function submitOrder(orderData) {
    try {
      // lock button UI
      const submitBtn = document.querySelector('#orderForm button[type="submit"]');
      if (submitBtn) { submitBtn.textContent = 'Zpracovávám...'; submitBtn.disabled = true; submitBtn.dataset.lock = 'true'; }

      if (cfg.SHEET_WEBHOOK && cfg.SHEET_TOKEN) await sendToSheet(orderData);

      // Připrav HTML položek a dopad (impact)
      const itemsHTML = renderItemsHTML(orderData.items || []);
      const costPerMealCZK = 23;
      const meals = Math.max(1, Math.floor((Number(orderData.amount)||0) / costPerMealCZK));
      const impactMeals = meals;
      const missionShort = 'Každý nákup náramku pomáhá dětem v Jemenu.';
      const charityNote = 'Děkujeme, díky této objednávce přispíváte na jídlo pro děti v nouzi.';
      const unit = impactMeals === 1 ? 'jídlo' : (impactMeals < 5 ? 'jídla' : 'jídel');
      const impactLine = `Odhadovaný dopad: ${impactMeals} ${unit} (při ${costPerMealCZK} Kč/jídlo).`;
      const subjectCustomer = `Děkujeme za objednávku #${orderData.order_number}`;
      const subjectAdmin = `Nová objednávka #${orderData.order_number}`;

      if (cfg.EMAILJS_PUBLIC_KEY && cfg.EMAILJS_SERVICE_ID && cfg.EMAILJS_TEMPLATE_CUSTOMER) {
        try {
          await emailjs.send(
            cfg.EMAILJS_SERVICE_ID,
            cfg.EMAILJS_TEMPLATE_CUSTOMER,
            {
              to_email: orderData.customer_email,
              reply_to: orderData.customer_email,
              from_email: cfg.ADMIN_EMAIL,
              from_name: (cfg.RECIPIENT||'Děti dětem'),
              subject: subjectCustomer,
              customer_name: orderData.customer_name,
              order_number: orderData.order_number,
              amount: orderData.amount,
              vs: orderData.vs,
              qr_png: orderData.qr_png,
              payment_info: orderData.payment_info,
              items_html: itemsHTML,
              address_line: orderData.address_line,
              address_city: orderData.address_city,
              address_zip: orderData.address_zip,
              customer_phone: orderData.customer_phone,
              recipient: (cfg.RECIPIENT||'Děti dětem'),
              mission_short: missionShort,
              charity_note: charityNote,
              impact_meals: impactMeals,
              impact_line: impactLine
            }
          );
        } catch (emailError) { console.error("Chyba e-mail zákazníkovi:", emailError); }
      }
      if (cfg.EMAILJS_PUBLIC_KEY && cfg.EMAILJS_SERVICE_ID && cfg.EMAILJS_TEMPLATE_ADMIN) {
        try {
          await emailjs.send(
            cfg.EMAILJS_SERVICE_ID,
            cfg.EMAILJS_TEMPLATE_ADMIN,
            {
              to_email: cfg.ADMIN_EMAIL,
              reply_to: orderData.customer_email,
              from_email: cfg.ADMIN_EMAIL,
              from_name: (cfg.RECIPIENT||'Děti dětem'),
              subject: subjectAdmin,
              order_data: JSON.stringify(orderData, null, 2),
              order_number: orderData.order_number,
              customer_name: orderData.customer_name,
              customer_email: orderData.customer_email,
              customer_phone: orderData.customer_phone,
              amount: orderData.amount,
              vs: orderData.vs,
              qr_png: orderData.qr_png,
      items_html: itemsHTML,
              address_line: orderData.address_line,
              address_city: orderData.address_city,
              address_zip: orderData.address_zip,
              recipient: (cfg.RECIPIENT||'Děti dětem'),
              mission_short: missionShort,
              charity_note: charityNote,
              impact_meals: impactMeals,
              impact_line: impactLine
            }
          );
        } catch (emailError) { console.error("Chyba e-mail adminovi:", emailError); }
      }
      showToast('Objednávka odeslána! Zkontrolujte e-mail.', 'success');
      try{ if(window.Cart) Cart.clear(); }catch(_){ }

      // success UI
      if (submitBtn) {
        submitBtn.textContent = 'Objednávka odeslána';
        submitBtn.classList.add('btn-success-done');
        submitBtn.style.background = 'var(--secondary)';
        submitBtn.style.color = '#111';
        submitBtn.disabled = true;
      }
      return true;
    } catch (error) {
      console.error("Chyba při odesílání objednávky:", error);
      showToast('Chyba při odesílání objednávky', 'error');
      const submitBtn = document.querySelector('#orderForm button[type="submit"]');
      if (submitBtn) { submitBtn.textContent = 'Odeslat objednávku & QR'; submitBtn.disabled = false; submitBtn.dataset.lock = 'false'; }
      return false;
    }
  }

  // Uloží stručný záznam objednávky pro lokální fallback statistik
  function saveOrderToLocal(order){
    try{
      const key = 'orders_v1';
      const list = JSON.parse(localStorage.getItem(key)||'[]');
      list.push({ amount: Number(order.amount)||0, items: Array.isArray(order.items)? order.items : [], timestamp: order.timestamp || new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list));
    }catch(_){ /* ignore */ }
  }

  // === Rekapitulace košíku + synchronizace částky ===
  function refreshCartSummary(){
    if (!window.Cart) return;
    const items = Cart.load();
    const box = document.getElementById('cartSummary');
    const lines = document.getElementById('cartLines');
    const totalEl = document.getElementById('cartTotal');
    const amountInput = document.getElementById('amount');
    const helpEl = amountInput ? amountInput.parentElement.querySelector('.help') : null;
    if (!box || !lines || !totalEl || !amountInput) return;

    if (!items.length){
      box.style.display = 'none';
      amountInput.readOnly = false;
      amountInput.min = '1';
      if (helpEl) helpEl.textContent = 'Pokud zboží nemá pevnou cenu, zadejte dohodnutou částku.';
      return;
    }

    box.style.display = '';
    lines.innerHTML = items.map(it=>`
      <div class="line">
        ${it.image ? `<img class="thumb" src="${it.image}" alt="${safe(it.name)}" loading="lazy">` : `<div class="thumb placeholder" aria-hidden="true"></div>`}
        <div class="info">
          <div class="name">${safe(it.name)}</div>
          <div class="meta">Ks: ${it.qty}</div>
        </div>
        <div class="price">${(it.price * it.qty).toLocaleString('cs-CZ')} Kč</div>
      </div>
    `).join('');

    const total = items.reduce((a,b)=>a + (Number(b.price)||0)*(Number(b.qty)||0), 0);
    const qtyTotal = items.reduce((a,b)=>a + (Number(b.qty)||0), 0);
    const minAmount = qtyTotal * MIN_PER_BRACELET;
    totalEl.textContent = total.toLocaleString('cs-CZ') + ' Kč';
    const baseAmount = Math.max(Math.round(total), minAmount);
    amountInput.value = String(baseAmount);
    amountInput.readOnly = false;
    amountInput.min = String(minAmount);
    if (helpEl) helpEl.textContent = `Můžete částku upravit. Minimálně ${minAmount.toLocaleString('cs-CZ')} Kč pro ${qtyTotal} ks (69 Kč/ks).`;

    // Enforce min a updatuj zobrazení Celkem dle zvolené částky
    const updateDisplay = ()=>{ totalEl.textContent = (Number(amountInput.value)||minAmount).toLocaleString('cs-CZ') + ' Kč'; };
    const enforce = ()=>{
      let v = Number(amountInput.value||0);
      if (!isFinite(v) || v < minAmount) {
        amountInput.value = String(minAmount);
      }
      updateDisplay();
    };
    amountInput.removeEventListener('change', amountInput._enf || (()=>{}));
    amountInput.removeEventListener('blur', amountInput._enf || (()=>{}));
    amountInput._enf = enforce;
    amountInput.addEventListener('change', enforce);
    amountInput.addEventListener('blur', enforce);

    // sync range and buttons
    const range = document.getElementById('amountRange');
    if (range){
      range.min = String(minAmount);
      // Dynamický rozsah: minimálně 2× základ, nebo +2000 Kč buffer
      const current = Number(amountInput.value)||minAmount;
      const maxRange = Math.max(baseAmount * 2, minAmount + 2000);
      range.max = String(maxRange);
      range.step = '1';
      range.value = String(current);
      function syncFromRange(){ amountInput.value = range.value; enforce(); }
      function syncFromInput(){ range.value = String(Number(amountInput.value)||minAmount); }
      range.removeEventListener('input', range._rng || (()=>{}));
      range._rng = syncFromRange;
      range.addEventListener('input', syncFromRange);
      amountInput.removeEventListener('input', amountInput._rng2 || (()=>{}));
      amountInput._rng2 = syncFromInput;
      amountInput.addEventListener('input', syncFromInput);
    }

    const dec = document.querySelector('.amount-dec');
    const inc = document.querySelector('.amount-inc');
    if (dec && inc){
      dec.onclick = ()=>{ amountInput.value = String(Math.max(minAmount, (Number(amountInput.value)||minAmount) - 1)); enforce(); const r=document.getElementById('amountRange'); if(r) { r.value = amountInput.value; } };
      inc.onclick = ()=>{ 
        const next = (Number(amountInput.value)||minAmount) + 1; 
        amountInput.value = String(next); 
        enforce(); 
        const r=document.getElementById('amountRange'); 
        if(r){ 
          // když překročíme maximum, posuň maximum nahoru
          if (next > Number(r.max||0)) r.max = String(next * 2);
          r.value = amountInput.value; 
        }
      };
    }
    // Inicializuj zobrazení podle aktuální částky
    updateDisplay();
  }
  window.addEventListener('cart:change', refreshCartSummary);
  document.addEventListener('DOMContentLoaded', refreshCartSummary);

  // === Submit: vygeneruje QR a hned odešle objednávku ===
  if (formEl){
    formEl.addEventListener('submit', async (ev)=>{
      ev.preventDefault();

      // Pokud je košík, částka je editovatelná, ale nesmí klesnout pod min (69 Kč × ks)
      const cartItems = (window.Cart ? window.Cart.load() : []);
      let amount = Number(valByName('amount') || 0);
      if (cartItems && cartItems.length) {
        const qtyTotal = cartItems.reduce((a,b)=> a + (Number(b.qty)||0), 0);
        const minAmount = qtyTotal * MIN_PER_BRACELET;
        if (!isFinite(amount) || amount < minAmount) {
          amount = minAmount;
          const amountInput = document.getElementById('amount');
          if (amountInput) amountInput.value = String(minAmount);
          showToast(`Částka upravena na minimálních ${minAmount.toLocaleString('cs-CZ')} Kč`, 'info');
        }
      }

      const name   = valByName('customer_name');
      const email  = valByName('customer_email');
      const note   = valByName('note');
      const phone  = valByName('customer_phone');
      const addrLn = valByName('address_line');
      const city   = valByName('address_city');
      const zip    = valByName('address_zip');
      if (!name || !email || !amount || amount<=0) { showToast("Vyplňte prosím jméno, e-mail a kladnou částku.", "error"); return; }

      const orderNo = generateOrderNumber();
      const vs = toNumberVS(orderNo);
      const msg = `Objednavka ${orderNo}${note ? " — " + note : ""}`;
      // Haléřový identifikátor (0,01–0,09 Kč) pro jednoznačné párování bez VS
      // Odvozeno z VS, přičteno k částce, zaokrouhleno na 2 desetinná místa
      const idCents = ((parseInt(vs, 10) % 9) + 1) / 100; // 0.01 .. 0.09
      amount = Math.round((amount + idCents) * 100) / 100;
      const spd = buildSPD({ iban: (cfg?.IBAN)||"", amount, vs, msg, name: (cfg?.RECIPIENT)||"Děti dětem", currency: (cfg?.CURRENCY)||"CZK", bic: (cfg?.BIC)||"" });

      await drawQR(spd);
      if (orderNoEl) orderNoEl.textContent = orderNo;
      const canvas = document.getElementById('qrCanvas');
      const qrDataUrl = canvas ? canvasToDataURL(canvas) : '';
      if (downloadBtn && qrDataUrl){ downloadBtn.href = qrDataUrl; downloadBtn.setAttribute('aria-disabled','false'); downloadBtn.download = `qr-platba-${orderNo}.png`; }

      const orderData = {
        order_number: orderNo,
        vs: vs,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          address_line: addrLn,
          address_city: city,
          address_zip: zip,
        note,
        amount,
        amount_identifier_czk: idCents,
        message: `Objednavka ${orderNo} — ${safe(name)}`,
        qr_png: qrDataUrl,
            qr_code: document.getElementById('qrCode')?.innerHTML || '',
        payment_info: { iban: cfg.IBAN || '', cz_account: cfg.CZ_ACCOUNT || '', recipient: cfg.RECIPIENT || 'Děti dětem', vs },
        items: cartItems,
            timestamp: new Date().toISOString()
          };
          
      const ok = await submitOrder(orderData);
      if (ok) {
        saveOrderToLocal(orderData);
        try { window.dispatchEvent(new Event('stats:change')); } catch(_) {}
      }
    });
  }
})();