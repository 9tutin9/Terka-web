const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ ok: false, error: 'Missing Supabase config' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
    
    return res.status(200).json({ 
      ok: true, 
      orders: orders || []
    });
    
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
