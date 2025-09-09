module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    // Test environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('SUPABASE_URL exists:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseKey);
    console.log('SUPABASE_URL length:', supabaseUrl ? supabaseUrl.length : 0);
    console.log('SUPABASE_SERVICE_ROLE_KEY length:', supabaseKey ? supabaseKey.length : 0);

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        ok: false, 
        error: 'Missing Supabase config',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      });
    }

    // Try to read from Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      orders: orders || []
    });

  } catch (e) {
    console.error('API error:', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
