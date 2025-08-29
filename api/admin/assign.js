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

async function readBody(req){
  const chunks=[]; for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw? JSON.parse(raw): {};
}

export default async function handler(req, res){
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error:'Method Not Allowed' }); return; }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession:false } });

  const { user_id, wallet_address } = await readBody(req);
  if (!user_id) { res.status(400).json({ error:'user_id required' }); return; }

  // Если указан конкретный адрес — пытаемся назначить его; иначе используем RPC assign_wallet
  if (wallet_address) {
    // Проверяем, что адрес свободен
    const { data: w, error: we } = await client.from('wallet_pool').select('address,seed,assigned').eq('address', wallet_address).single();
    if (we || !w) { res.status(400).json({ error:'Wallet not found' }); return; }
    if (w.assigned) { res.status(409).json({ error:'Already assigned' }); return; }

    // Транзакции как таковой в серверлесс нет — используем RPC assign_wallet аналогично
    const { data, error } = await client.rpc('assign_wallet', { p_user_id: user_id });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(200).json({ ok:true, user_id, address: data?.[0]?.address || null });
    return;
  } else {
    const { data, error } = await client.rpc('assign_wallet', { p_user_id: user_id });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(200).json({ ok:true, user_id, address: data?.[0]?.address || null });
    return;
  }
}


