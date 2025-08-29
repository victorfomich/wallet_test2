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
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data, error } = await client.from('users').select('user_id,address').order('user_id', { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(200).json({ users: data || [] });
}


