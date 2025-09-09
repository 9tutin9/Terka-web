module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  
  try {
    // Prozatím vrátíme testovací data - Supabase integrace bude později
    return res.status(200).json({ 
      ok: true, 
      orders: [
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
          items: [
            { name: 'Náramek lásky', qty: 2, price: 69 }
          ]
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
          items: [
            { name: 'Náramek naděje', qty: 3, price: 69 }
          ]
        }
      ]
    });
    
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
