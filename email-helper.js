// email-helper.js - Helper funkce pro generování e-mailových šablon
window.EmailHelper = {
  
  // Generuje HTML pro položky v košíku
  generateItemsHTML(items) {
    if (!items || !Array.isArray(items)) return '<p>Žádné položky</p>';
    
    return items.map(item => `
      <div style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
        <div style="margin-right: 15px;">
          <img src="${item.image || 'https://www.detidetem.eu/images/detidetem.logo.webp'}" 
               alt="${item.name || 'Náramek'}" 
               style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;">
        </div>
        <div style="flex: 1;">
          <strong>${item.name || 'Náramek'}</strong>
          ${item.size ? `<br><small>Velikost: ${item.size}</small>` : ''}
        </div>
        <div style="text-align: right;">
          <div>${item.qty}x</div>
          <div><strong>${(item.price || 69).toLocaleString('cs-CZ')} Kč</strong></div>
        </div>
      </div>
    `).join('');
  },

  // Generuje HTML pro zákaznický e-mail
  generateCustomerEmail(data) {
    const itemsHTML = this.generateItemsHTML(data.items);
    const currentDate = new Date().toLocaleDateString('cs-CZ');
    
    // Výpočet dopadu na děti v Jemenu
    const costPerMealCZK = 23;
    const meals = Math.max(1, Math.floor((Number(data.amount) || 0) / costPerMealCZK));
    const impactMeals = meals;
    const unit = impactMeals === 1 ? 'jídlo' : (impactMeals < 5 ? 'jídla' : 'jídel');
    const impactLine = `Odhadovaný dopad: ${impactMeals} ${unit} (při ${costPerMealCZK} Kč/jídlo).`;
    
    return `
      <!DOCTYPE html>
      <html lang="cs">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Potvrzení objednávky - Děti dětem</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .logo { max-width: 200px; height: auto; }
              .order-info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .items { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .qr-section { text-align: center; margin: 20px 0; }
              .qr-code { max-width: 200px; height: auto; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
              .highlight { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 15px 0; }
          </style>
      </head>
      <body>
          <div class="header">
              <img src="https://www.detidetem.eu/images/detidetem.logo.webp" alt="Děti dětem" class="logo">
              <h1>Děkujeme za vaši objednávku!</h1>
          </div>

          <div class="order-info">
              <h2>📋 Detaily objednávky</h2>
              <p><strong>Číslo objednávky:</strong> ${data.order_number}</p>
              <p><strong>Částka:</strong> ${data.amount} Kč</p>
              <p><strong>Variabilní symbol:</strong> ${data.vs}</p>
              <p><strong>Datum:</strong> ${currentDate}</p>
          </div>

          <div class="items">
              <h3>🛍️ Objednané položky</h3>
              ${itemsHTML}
          </div>

          <div class="qr-section">
              <h3>💳 QR platba</h3>
              <p>Naskenujte QR kód mobilní aplikací vaší banky:</p>
              <img src="${data.qr_png}" alt="QR kód pro platbu" class="qr-code">
              <p><strong>Variabilní symbol:</strong> ${data.vs}</p>
              <p><strong>Částka:</strong> ${data.amount} Kč</p>
          </div>

          <div class="highlight">
              <h3>🌍 Váš dopad</h3>
              <p><strong>${impactLine}</strong></p>
              <p>Každý nákup náramku pomáhá dětem v Jemenu. Děkujeme, díky této objednávce přispíváte na jídlo pro děti v nouzi.</p>
          </div>

          <div class="highlight">
              <h3>📚 Důležité upozornění</h3>
              <p>Jelikož jsme školou povinní, doručení vašeho náramku se může trochu zpozdit. Děkujeme za trpělivost!</p>
          </div>

          <div class="footer">
              <p>Děti dětem - Každý náramek pomáhá dětem v nouzi</p>
              <p>Web: <a href="https://www.detidetem.eu">www.detidetem.eu</a></p>
          </div>
      </body>
      </html>
    `;
  },

  // Generuje HTML pro admin e-mail
  generateAdminEmail(data) {
    const itemsHTML = this.generateItemsHTML(data.items);
    const currentDate = new Date().toLocaleDateString('cs-CZ');
    
    return `
      <!DOCTYPE html>
      <html lang="cs">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nová objednávka - Děti dětem</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .logo { max-width: 200px; height: auto; }
              .order-info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .customer-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .items { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
          </style>
      </head>
      <body>
          <div class="header">
              <img src="https://www.detidetem.eu/images/detidetem.logo.webp" alt="Děti dětem" class="logo">
              <h1>🚨 Nová objednávka #${data.order_number}</h1>
          </div>

          <div class="order-info">
              <h2>📋 Detaily objednávky</h2>
              <p><strong>Číslo objednávky:</strong> ${data.order_number}</p>
              <p><strong>Částka:</strong> ${data.amount} Kč</p>
              <p><strong>Variabilní symbol:</strong> ${data.vs}</p>
              <p><strong>Datum:</strong> ${currentDate}</p>
          </div>

          <div class="customer-info">
              <h3>👤 Zákazník</h3>
              <p><strong>Jméno:</strong> ${data.customer_name}</p>
              <p><strong>E-mail:</strong> ${data.customer_email}</p>
              <p><strong>Telefon:</strong> ${data.customer_phone}</p>
              <p><strong>Adresa:</strong> ${data.address_line}, ${data.address_city} ${data.address_zip}</p>
              ${data.payment_message ? `<p><strong>Zpráva pro příjemce:</strong> ${data.payment_message}</p>` : ''}
              ${data.delivery_note ? `<p><strong>Poznámka k dodání:</strong> ${data.delivery_note}</p>` : ''}
          </div>

          <div class="items">
              <h3>🛍️ Objednané položky</h3>
              ${itemsHTML}
          </div>

          ${data.qr_png ? `
          <div class="qr-section" style="text-align: center; margin: 20px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <h3>💳 QR platba</h3>
              <p>QR kód pro platbu:</p>
              <img src="${data.qr_png}" alt="QR kód pro platbu" style="max-width: 200px; height: auto;">
              <p><strong>Variabilní symbol:</strong> ${data.vs}</p>
              <p><strong>Částka:</strong> ${data.amount} Kč</p>
          </div>
          ` : ''}

          <div class="footer">
              <p>Děti dětem - Admin panel</p>
              <p>Web: <a href="https://www.detidetem.eu/admin.html">www.detidetem.eu/admin.html</a></p>
          </div>
      </body>
      </html>
    `;
  },

  // Odešle e-mail přes Vercel Serverless Function
  async sendEmail(to, subject, html) {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          from: 'Děti dětem <noreply@detidetem.eu>'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
};
