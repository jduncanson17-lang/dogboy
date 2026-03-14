import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { subscription, userId, dogId } = req.body || {};
  if (!subscription || !userId) return res.status(400).json({ error: 'Missing data' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, dog_id: dogId, subscription }, { onConflict: 'user_id' });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
