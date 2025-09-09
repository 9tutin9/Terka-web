module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  
  // Vrať prázdný seznam objednávek - Supabase integrace bude později
  return res.status(200).json({ 
    ok: true, 
    orders: []
  });
};
