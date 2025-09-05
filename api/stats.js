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
    const statsUrl = url + (url.includes('?') ? '&' : '?') + 'action=stats&token=' + encodeURIComponent(token);
    const r = await fetch(statsUrl, { method: 'GET' });
    const text = await r.text();
    if (!r.ok) return res.status(500).json({ ok: false, error: text });
    // Return Apps Script JSON as-is
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    try { return res.status(200).json(JSON.parse(text)); } catch (_) { return res.status(200).send(text); }
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
};


