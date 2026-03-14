import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:hello@dogboy.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Allow cron (GET) or manual trigger (POST with secret)
  if (req.method === 'POST') {
    if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get all push subscriptions
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*, dogs(name, birthday, vaccines:vaccines(*), vet_info:vet_info(*))');

  if (error) return res.status(500).json({ error: error.message });
  if (!subs?.length) return res.status(200).json({ sent: 0 });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  let sent = 0;

  for (const sub of subs) {
    const dog = sub.dogs;
    if (!dog) continue;

    const notifications = [];

    // Check vaccines
    const vaccines = dog.vaccines || [];
    const overdue = vaccines.filter(v => v.next_due && new Date(v.next_due) < today);
    const dueSoon = vaccines.filter(v => {
      if (!v.next_due) return false;
      const days = (new Date(v.next_due) - today) / 86400000;
      return days >= 0 && days <= 7;
    });

    if (overdue.length > 0) {
      notifications.push({
        title: `⚠️ Vaccine Overdue — ${dog.name}`,
        body: `${dog.name}'s ${overdue[0].name} vaccine is overdue. Schedule a vet visit soon.`,
        tag: 'vaccine-overdue',
      });
    } else if (dueSoon.length > 0) {
      const days = Math.round((new Date(dueSoon[0].next_due) - today) / 86400000);
      notifications.push({
        title: `📅 Vaccine Due Soon — ${dog.name}`,
        body: `${dog.name}'s ${dueSoon[0].name} is due in ${days} day${days === 1 ? '' : 's'}.`,
        tag: 'vaccine-due',
      });
    }

    // Check birthday
    if (dog.birthday) {
      const bday = new Date(dog.birthday);
      const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      const daysUntil = Math.round((next - today) / 86400000);
      if (daysUntil === 0) {
        notifications.push({ title: `🎂 Happy Birthday, ${dog.name}!`, body: `It's ${dog.name}'s birthday today! Give them some extra love 🐾`, tag: 'birthday' });
      } else if (daysUntil === 1) {
        notifications.push({ title: `🎁 ${dog.name}'s Birthday Tomorrow!`, body: `Don't forget — ${dog.name}'s birthday is tomorrow!`, tag: 'birthday-soon' });
      }
    }

    // Check vet appointment
    const vetInfo = dog.vet_info?.[0];
    if (vetInfo?.next_appt) {
      const days = Math.round((new Date(vetInfo.next_appt) - today) / 86400000);
      if (days === 1) {
        notifications.push({ title: `🏥 Vet Appointment Tomorrow`, body: `${dog.name} has a vet appointment tomorrow. Don't forget!`, tag: 'vet-appt' });
      }
    }

    // Send notifications
    for (const notif of notifications) {
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify(notif));
        sent++;
      } catch (e) {
        // Subscription expired — remove it
        if (e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }
  }

  return res.status(200).json({ sent, total: subs.length });
}
