'use strict';

const { createClient } = require('@supabase/supabase-js');

function parseInitData(initData) {
  if (!initData) return null;
  try {
    const dict = Object.fromEntries(initData.split('&').map(p => p.split('=').map(decodeURIComponent)));
    if (!dict.user) return null;
    const user = JSON.parse(dict.user);
    return String(user.id);
  } catch (_) {
    return null;
  }
}

module.exports = async (req, res) => {
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
  const body = typeof req.body === 'object' ? req.body : {};
  const bodyUserId = body && body.user_id ? String(body.user_id) : null;
  const tgUserId = bodyUserId || parseInitData(typeof initData === 'string' ? initData : '');

  if (!tgUserId) {
    res.status(400).json({ error: 'No user id' });
    return;
  }

  const { data, error } = await client
    .rpc('assign_wallet', { p_user_id: tgUserId });

  if (error) {
    const msg = error.message || String(error);
    const status = msg.includes('NO_WALLET_AVAILABLE') ? 409 : 500;
    res.status(status).json({ error: msg });
    return;
  }

  // data is an array of rows due to returns table
  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!row || !row.address) {
    res.status(500).json({ error: 'No address returned' });
    return;
  }

  res.status(200).json({ user_id: tgUserId, address: row.address });
};


