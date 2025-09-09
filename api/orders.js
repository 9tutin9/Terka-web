module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  
  try {
    const url = process.env.SHEET_WEBHOOK_URL;
    const token = process.env.SHEET_TOKEN;
    
    if (!url || !token) {
      return res.status(500).json({ ok: false, error: 'Missing server config' });
    }
    
    // Získat data z Google Sheets
    const withToken = url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
    const response = await fetch(withToken, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      return res.status(500).json({ ok: false, error: 'Failed to fetch orders' });
    }
    
    const data = await response.json();
    
    // Vrátit objednávky (předpokládáme, že Google Sheets vrací pole objednávek)
    return res.status(200).json({ 
      ok: true, 
      orders: data.orders || data || [] 
    });
    
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
