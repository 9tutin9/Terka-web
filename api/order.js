const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  
  try {
    // 1. Odeslat do Google Sheets (stávající funkcionalita)
    const url = process.env.SHEET_WEBHOOK_URL;
    const token = process.env.SHEET_TOKEN;
    if (!url || !token) {
      return res.status(500).json({ ok: false, error: 'Missing server config' });
    }
    
    const withToken = url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
    const sheetResponse = await fetch(withToken, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(req.body),
    });
    
    if (!sheetResponse.ok) {
      const errorText = await sheetResponse.text();
      console.error('Google Sheets error:', sheetResponse.status, errorText);
      return res.status(500).json({ 
        ok: false, 
        error: 'Google Sheets error: ' + sheetResponse.status + ' - ' + errorText 
      });
    }
    
    // 2. Zapsat do Supabase (nová funkcionalita)
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const orderData = req.body;
        const { error } = await supabase
          .from('orders')
          .insert({
            order_number: orderData.order_number,
            customer_name: orderData.customer_name,
            customer_email: orderData.customer_email,
            customer_phone: orderData.customer_phone,
            address_line: orderData.address_line,
            address_city: orderData.address_city,
            address_zip: orderData.address_zip,
            amount: orderData.amount,
            vs: orderData.vs,
            ss: orderData.ss,
            payment_message: orderData.payment_message,
            delivery_note: orderData.delivery_note,
            qr_png: orderData.qr_png,
            qr_code: orderData.qr_code,
            payment_info: orderData.payment_info,
            items: orderData.items,
            paid: false, // Nové objednávky jsou nezaplacené
            created_at: orderData.timestamp
          });
        
        if (error) {
          console.error('Supabase insert error:', error);
          // Necháme to projít, i když Supabase selže
        }
      }
    } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
      // Necháme to projít, i když Supabase selže
    }
    
    const text = await sheetResponse.text();
    return res.status(200).json({ ok: true, resp: text });
    
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};


