import { createClient } from '@supabase/supabase-js';

function requireAuth(req, res) {
  const token = req.headers['authorization'] || '';
  const expected = process.env.ADMIN_TOKEN || '';
  if (!expected || token !== `Bearer ${expected}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  if (req.method === 'GET') {
    const q = (req.query && (req.query.q || req.query.search)) ? String(req.query.q || req.query.search) : '';
    const onlyFree = String(req.query?.only_free || '').toLowerCase() === 'true';
    let builder = client.from('wallet_pool').select('id,address,seed,assigned,assigned_user_id,assigned_at').order('id', { ascending: true });
    if (q) builder = builder.ilike('address', `%${q}%`);
    if (onlyFree) builder = builder.eq('assigned', false);
    const { data, error } = await builder;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(200).json({ wallets: data || [] });
    return;
  }

  if (req.method === 'POST') {
    try {
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      const raw = Buffer.concat(chunks).toString('utf8');
      const body = raw ? JSON.parse(raw) : {};
      const items = Array.isArray(body?.wallets) ? body.wallets : [];
      if (!items.length) { res.status(400).json({ error: 'Empty wallets' }); return; }
      const rows = items.map(w => ({ address: String(w.address), seed: String(w.seed), assigned: false }));
      const { data, error } = await client.from('wallet_pool').insert(rows).select('id');
      if (error) { res.status(500).json({ error: error.message }); return; }
      res.status(200).json({ inserted: data?.length || 0 });
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}


