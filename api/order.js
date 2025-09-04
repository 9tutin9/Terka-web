export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  try {
    const url = process.env.SHEET_WEBHOOK_URL;
    const token = process.env.SHEET_TOKEN;
    if (!url || !token) {
      return res.status(500).json({ ok: false, error: 'Missing server config' });
    }
    const withToken = url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
    const r = await fetch(withToken, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    if (!r.ok) {
      return res.status(500).json({ ok: false, error: text });
    }
    return res.status(200).json({ ok: true, resp: text });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}


