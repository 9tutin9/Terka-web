module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  
  try {
    // Prozatím vrátíme prázdný seznam - Google Sheets API potřebuje jiný přístup
    // TODO: Implementovat správné čtení z Google Sheets
    return res.status(200).json({ 
      ok: true, 
      orders: [
        {
          order_number: '20250101001',
          customer_name: 'Test Zákazník',
          customer_email: 'test@example.com',
          amount: 138,
          vs: '1234567890',
          paid: false,
          timestamp: new Date().toISOString()
        }
      ]
    });
    
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
