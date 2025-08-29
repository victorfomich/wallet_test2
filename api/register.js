import { createClient } from '@supabase/supabase-js';

function parseInitData(initData) {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    let parsed;
    try { parsed = JSON.parse(userStr); }
    catch { parsed = JSON.parse(decodeURIComponent(userStr)); }
    const user = parsed;
    return String(user.id);
  } catch (_) {
    return null;
  }
}

async function readJsonBody(req) {
  try {
    if (req.body && typeof req.body === 'object') return req.body;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase env is not configured' });
    return;
  }

  const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const initData = req.headers['x-telegram-init-data'];
  const body = await readJsonBody(req);
  const bodyUserId = body && body.user_id ? String(body.user_id) : null;
  const tgUserId = bodyUserId || parseInitData(typeof initData === 'string' ? initData : '');

  if (!tgUserId) {
    res.status(400).json({ error: 'No user id' });
    return;
  }

  const { data, error } = await client.rpc('assign_wallet', { p_user_id: tgUserId });

  if (error) {
    const msg = error.message || String(error);
    const status = msg.includes('NO_WALLET_AVAILABLE') ? 409 : 500;
    res.status(status).json({ error: msg });
    return;
  }

  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!row || !row.address) {
    res.status(500).json({ error: 'No address returned' });
    return;
  }

  res.status(200).json({ user_id: tgUserId, address: row.address });
}


