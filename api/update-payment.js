const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ ok: false, error: 'Missing Supabase config' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_number, paid } = req.body;

    if (!order_number || typeof paid !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'Missing order_number or paid status' });
    }

    // Aktualizuj stav platby
    const { data, error } = await supabase
      .from('orders')
      .update({ paid: paid })
      .eq('order_number', order_number)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    return res.status(200).json({ 
      ok: true, 
      message: `Order ${order_number} updated to ${paid ? 'paid' : 'unpaid'}`,
      order: data[0]
    });

  } catch (e) {
    console.error('API error:', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
