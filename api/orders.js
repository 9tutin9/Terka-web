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

    // Return test data for now
    return res.status(200).json({
      ok: true,
      orders: [
        {
          id: 1,
          order_number: '#TEST001',
          customer_name: 'Test User',
          customer_email: 'test@example.com',
          amount: 100,
          paid: false,
          created_at: new Date().toISOString()
        }
      ]
    });

  } catch (e) {
    console.error('API error:', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
