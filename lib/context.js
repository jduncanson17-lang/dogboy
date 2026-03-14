/**
 * lib/context.js
 * Builds the runtime context object injected into the AI system prompt.
 * All failures are isolated — a bad table query degrades gracefully rather than throwing.
 */

function calcAgeYears(dob) {
  if (!dob) return null;
  const ms = Date.now() - new Date(dob).getTime();
  if (isNaN(ms) || ms < 0) return null;
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

function vaccineStatus(nextDue) {
  if (!nextDue) return 'up_to_date';
  const diff = new Date(nextDue).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 30 * 24 * 60 * 60 * 1000) return 'due_soon';
  return 'up_to_date';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string} userId
 * @param {string} dogId
 * @returns {Promise<object|null>}
 */
export async function buildRuntimeContext(sb, userId, dogId) {
  if (!dogId || !userId) return null;

  // ── Active dog ────────────────────────────────────────────────────────────
  let activeDog = null;
  try {
    const { data, error } = await sb
      .from('dogs')
      .select('id, name, breed, birthday, age, weight, sex, traits, photo_url')
      .eq('id', dogId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null; // dog not found or not owned by user

    activeDog = data;
  } catch {
    return null;
  }

  // ── Latest weight from weight_logs (fallback to dogs.weight) ─────────────
  let latestWeightLbs = activeDog.weight ?? null;
  try {
    const { data } = await sb
      .from('weight_logs')
      .select('weight')
      .eq('dog_id', dogId)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    if (data?.weight != null) latestWeightLbs = data.weight;
  } catch { /* keep fallback */ }

  // ── Auth / plan ───────────────────────────────────────────────────────────
  let plan = 'free';
  try {
    const { data } = await sb
      .from('profiles')
      .select('plan')
      .eq('user_id', userId)
      .single();
    if (data?.plan) plan = data.plan;
  } catch { /* default free */ }

  // ── Dog roster ────────────────────────────────────────────────────────────
  let dogRoster = [];
  try {
    const { data } = await sb
      .from('dogs')
      .select('id, name, breed')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (data) dogRoster = data;
  } catch { /* leave empty */ }

  // ── Vet info ──────────────────────────────────────────────────────────────
  let vetInfo = { name: null, phone: null, address: null, next_appointment_date: null, reason: null };
  try {
    const { data } = await sb
      .from('vet_info')
      .select('name, phone, address, next_appt, reason')
      .eq('dog_id', dogId)
      .single();
    if (data) {
      vetInfo = {
        name:                  data.name    ?? null,
        phone:                 data.phone   ?? null,
        address:               data.address ?? null,
        next_appointment_date: data.next_appt ?? null,  // normalise to spec name
        reason:                data.reason  ?? null,
      };
    }
  } catch { /* leave nulls */ }

  // ── Vaccines ──────────────────────────────────────────────────────────────
  let vaccines = [];
  try {
    const { data } = await sb
      .from('vaccines')
      .select('name, last_given, next_due')
      .eq('dog_id', dogId);
    if (data) {
      vaccines = data.map(v => ({
        name: v.name,
        last_given: v.last_given ?? null,
        next_due: v.next_due ?? null,
        status: vaccineStatus(v.next_due),
      }));
    }
  } catch { /* leave empty */ }

  // ── Medications ───────────────────────────────────────────────────────────
  let medications = [];
  try {
    const { data } = await sb
      .from('medications')
      .select('name, dose, frequency, next_due')
      .eq('dog_id', dogId);
    if (data) {
      medications = data.map(m => ({
        name: m.name,
        dose_label_only: m.dose ?? null,
        frequency_label_only: m.frequency ?? null,
        next_due: m.next_due ?? null,
      }));
    }
  } catch { /* leave empty */ }

  // ── Recent health logs ────────────────────────────────────────────────────
  // Note: health_logs uses 'mood' as the category column name
  let recentLogs = [];
  try {
    const { data } = await sb
      .from('health_logs')
      .select('mood, date, note')
      .eq('dog_id', dogId)
      .order('date', { ascending: false })
      .limit(10);
    if (data) recentLogs = data.map(l => ({ category: l.mood, date: l.date, note: l.note }));
  } catch { /* leave empty */ }

  // ── Weight logs ───────────────────────────────────────────────────────────
  let weightLogs = [];
  try {
    const { data } = await sb
      .from('weight_logs')
      .select('date, weight, notes')
      .eq('dog_id', dogId)
      .order('date', { ascending: false })
      .limit(10);
    if (data) weightLogs = data.map(w => ({ date: w.date, weight_lbs: w.weight, notes: w.notes ?? null }));
  } catch { /* leave empty */ }

  // ── Check-ins ─────────────────────────────────────────────────────────────
  // Note: checkins table only has 'mood'; energy/appetite not in schema yet
  let checkins = [];
  try {
    const { data } = await sb
      .from('checkins')
      .select('date, mood')
      .eq('dog_id', dogId)
      .order('date', { ascending: false })
      .limit(7);
    if (data) checkins = data.map(c => ({ date: c.date, mood: c.mood, energy: null, appetite: null }));
  } catch { /* leave empty */ }

  // ── Assemble ──────────────────────────────────────────────────────────────
  return {
    auth_state: {
      is_authenticated: true,
      plan,
    },
    active_dog: {
      id: activeDog.id,
      name: activeDog.name ?? 'Unknown',
      breed: activeDog.breed ?? 'Mixed breed',
      // Prefer calculated age from birthday; fall back to stored age field
      age_years: activeDog.birthday ? calcAgeYears(activeDog.birthday) : (activeDog.age ?? null),
      weight_lbs: latestWeightLbs,
      sex: activeDog.sex ?? null,
      spayed_neutered: null,      // column not in schema yet
      traits: Array.isArray(activeDog.traits) ? activeDog.traits : [],
      sensitivities: [],          // column not in schema yet
      known_conditions: [],       // column not in schema yet
      photo_url: activeDog.photo_url ?? null,
    },
    dog_roster: dogRoster,
    health_hub: {
      vet_info: vetInfo,
      vaccines,
      medications,
    },
    recent_logs: recentLogs,
    weight_logs: weightLogs,
    checkins,
    conversation_state: {
      image_attached: false,         // set to true in api/chat.js if imageBase64 present
      guest_has_seen_save_nudge: false,
      first_ai_reply_completed: false,
    },
    product_catalog: [],             // injected in api/chat.js
  };
}
