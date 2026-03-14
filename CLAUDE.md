# Dog Boy — Project Brain

This file is the single source of truth for the Dog Boy project. Read it at the start of every session in Claude Code, Cowork, or Claude chat. Keep it updated as features ship.

---

## What Is Dog Boy?

An AI-powered all-in-one companion app for dog parents. Think "BabyCenter meets AI for dogs." The founder (James) was called "Dog Boy" as a kid and relates more to dogs than people — that authentic identity IS the brand's moat.

**Live URL:** project-zp6d3.vercel.app
**GitHub:** https://github.com/jduncanson17-lang/dogboy
**Local folder:** ~/Desktop/dogboy

---

## Business Model

| Tier | Price | What's included |
|------|-------|-----------------|
| Free | $0 | 5 AI messages/day, basic health tracking, product recommendations |
| Premium | $9.99/month | Unlimited AI, full health hub, up to 3 dog profiles, vaccine reminders |

**Revenue target:** 1,700 paying subscribers = $200K/year
**Secondary revenue:** Chewy affiliate (4–7%), Ollie ($60/sale), premium supplement brands (15%)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 (via CDN + Babel standalone), single `index.html` |
| Hosting | Vercel (free tier) |
| Backend/Auth/DB | Supabase |
| AI | Anthropic Claude API (`claude-haiku-4-5-20251001`) via `api/chat.js` |
| Push notifications | Web Push + VAPID keys, daily cron via `vercel.json` |
| Payments | Stripe (NOT YET BUILT — next priority) |

### Key Files

```
index.html          — entire React frontend (single file)
api/
  chat.js           — AI chat endpoint, supports text + image (vision)
  config.js         — serves Supabase URL/key to frontend
  symptoms.js       — AI symptom triage endpoint
  push-subscribe.js — saves push subscriptions to Supabase
  push-notify.js    — daily cron: sends push notifications
public/
  sw.js             — service worker for push notifications
vercel.json         — cron config (9am daily push-notify)
manifest.json       — PWA manifest
```

### Environment Variables (Vercel)

```
ANTHROPIC_API_KEY    — Claude API key
SUPABASE_URL         — Supabase project URL
SUPABASE_ANON_KEY    — Supabase anon/public key
SUPABASE_SERVICE_KEY — Supabase service role key (for push-notify cron)
VAPID_PUBLIC_KEY     — BIbMGMOgEh1EqgwdsiEwzhyKLbyGUSpTTE7S5TNto2EaGDBO1H3OYok17VzHXqRkDbRmZFxYAmmH6UA1ZbhE-Mw
VAPID_PRIVATE_KEY    — Clt50_R6uBssmZNgk_gio5r8oOrx9RONQUGd3CR2f0M
VAPID_EMAIL          — mailto:jduncanson17@gmail.com
```

---

## Supabase Database Schema

```sql
-- Core
dogs (id, user_id, name, breed, age, weight, sex, traits[], photo_url, birthday, created_at)
vaccines (id, dog_id, name, required, frequency, last_given, next_due, notes)
vet_info (id, dog_id, name, phone, address, next_appt, reason, website)
medications (id, dog_id, name, dose, frequency, next_due)

-- Logging
health_logs (id, dog_id, note, mood, date, created_at)
weight_logs (id, dog_id, weight, date, notes, created_at)
checkins (id, dog_id, date, mood, created_at)
milestones (id, dog_id, title, date, emoji, created_at)

-- Push
push_subscriptions (id, user_id, dog_id, subscription jsonb, created_at)
```

All tables have RLS enabled. Users can only access their own dog's data.

---

## Features — What's Built ✅

### Authentication
- Supabase email/password auth
- Account setup screen after onboarding (email + password, or "skip for now")
- Auto-login on return visits
- Logout

### Onboarding
- 4-step wizard: name → breed → age/weight/sex → personality traits
- After onboarding: account setup or straight to dashboard
- Logged-in users adding a second dog skip account setup

### Home Tab (default dashboard)
- Health score ring (SVG, calculated from vaccines/vet/logs)
- Streak counter (daily check-in streak)
- Daily check-in — 5 mood options (🤩😊😐😟🤒)
- Food calculator — enter cal/cup, get morning/evening portions
- Birthday banner — countdown within 7 days, celebration card on the day
- Vaccine alert cards (overdue = red, due soon = yellow)
- Quick action grid
- Daily tip (breed-aware)
- Breed spotlight card
- Emergency vet finder button

### Chat Tab
- Real AI via Anthropic API (Claude Haiku)
- Personalized to the dog's profile (breed, age, weight, traits)
- Image/photo support — camera icon, preview before send, Claude analyzes the image
- Typing indicator, suggestion chips
- Save-progress banner nudge after first AI reply (for guest users)

### Health Tab
- Vaccine tracker (6 vaccines, color-coded: overdue/due soon/up to date/not recorded)
- Medication tracker
- Vet info card (name, phone as tap-to-call, address, next appt, website)
- "Book →" button (links to vet website or Google search)
- Weight tracker — log weights, bar chart, trend arrow (↑↓→)
- Symptom checker — describe symptoms → AI triage: 🟢 watch / 🟡 vet soon / 🔴 vet today / 🚨 emergency
- Monthly breed + season-aware care checklist (checkable items)
- "Vet Portal Sync Coming Soon" teaser

### Shop Tab
- AI-curated product recommendations based on dog profile
- Category filter
- Chewy affiliate links with UTM tracking (`utm_source=dogboy&utm_medium=app&utm_campaign=ai-picks`)
- "AI Pick" badge on top recommendations
- "Why for [dog name]" personalized explanations

### Log Tab
- Category selector (Health, Behavior, Food, Training, Other)
- Free-text log entries
- Chronological history, persists to Supabase

### Profile Tab
- Dog avatar (tap to upload photo — saves to Supabase Storage `dog-photos` bucket)
- Dog stats (breed, age, weight, sex, traits)
- Birthday field (date picker, saves to Supabase)
- Milestones tracker (emoji + title + date, add/save)
- "Add Another Dog" → onboarding
- Logout

### Multi-Dog Support
- Dot switcher in header when user has multiple dogs
- Onboarding flow handles adding dogs for existing users

### Push Notifications
- Service worker registered at `/sw.js`
- VAPID keys set up, subscriptions stored in `push_subscriptions`
- Daily 9am cron via Vercel cron → `api/push-notify.js`
- Triggers on: overdue vaccines, birthday today, vet appointment within 3 days

---

## Features — NOT YET BUILT ❌

### Stripe Paywall (HIGHEST PRIORITY)
- Free tier: 5 AI messages/day (count in Supabase or localStorage)
- Premium: $9.99/month via Stripe Checkout
- Needs: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` env vars
- Webhook to set `premium: true` on user in Supabase after payment
- Paywall gate on: AI after 5 messages, some Health features, 3rd dog profile

### Landing Page Redesign
- Current landing is functional but not optimized for conversion
- Needs: video/animated demo, social proof, clear value prop above fold
- Consider: waitlist email capture before full signup

### App Store (React Native / Expo)
- Full React Native project already built in separate folder (`dogboy-react-native/`)
- Needs: real icons, EAS Build run, Apple Developer account ($99/yr), Google Play ($25)
- PWA manifest already in place for "Add to Home Screen" installs

### Vet API Integration
- Covetrus Connect, IDEXX, ezyVet — requires clinic partnerships
- Phase 2 / later

### Stripe Affiliate Payouts (Chewy)
- Currently uses UTM links — need to apply for actual Chewy affiliate account
- Apply at: chewy.com/affiliate

---

## Pending SQL (Run in Supabase if not done)

```sql
-- Dog photo + birthday columns
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS birthday text;

-- Weight tracking
CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid default gen_random_uuid() primary key,
  dog_id uuid references dogs(id) on delete cascade,
  weight numeric not null, date text not null, notes text,
  created_at timestamptz default now()
);
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own weight logs" ON weight_logs FOR ALL USING (dog_id IN (SELECT id FROM dogs WHERE user_id = auth.uid()));

-- Daily check-ins
CREATE TABLE IF NOT EXISTS checkins (
  id uuid default gen_random_uuid() primary key,
  dog_id uuid references dogs(id) on delete cascade,
  date text not null, mood text,
  created_at timestamptz default now()
);
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own checkins" ON checkins FOR ALL USING (dog_id IN (SELECT id FROM dogs WHERE user_id = auth.uid()));

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id uuid default gen_random_uuid() primary key,
  dog_id uuid references dogs(id) on delete cascade,
  title text not null, date text not null, emoji text default '🎉',
  created_at timestamptz default now()
);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own milestones" ON milestones FOR ALL USING (dog_id IN (SELECT id FROM dogs WHERE user_id = auth.uid()));

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  dog_id uuid references dogs(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz default now(),
  UNIQUE(user_id)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON push_subscriptions USING (true) WITH CHECK (true);

-- Supabase Storage bucket (do this in the dashboard, not SQL)
-- Storage → New bucket → Name: dog-photos → Public: ON
```

---

## What To Work On Next (In Order)

1. **Stripe paywall** — the app is good enough to charge for, every day without it is lost revenue
2. **Landing page redesign** — animated demo, social proof, email capture
3. **App Store submission** — React Native project is built, needs icons + EAS build
4. **Chewy affiliate account** — apply at chewy.com/affiliate to get real commission links
5. **Vet website field** — already in UI, make sure it saves to Supabase (`vet_info.website`)

---

## Brand & Voice

- **Tone:** Warm, fun, dog-obsessed. Never clinical. Talk like a dog parent, not a vet.
- **Brand color:** Amber `#f59e0b`
- **Font weight:** Heavy (800–900) for headings, confident brand presence
- **James's identity:** "Dog Boy" — finds the dog at every party, relates more to dogs than people, two dogs (Chihuahua Rat Terrier mix + Morkie)
- **Competitive moat:** Authentic founder story + the only app combining AI + health records + curated shop + personality-driven brand

---

## How To Run Locally

```bash
cd ~/Desktop/dogboy
# Install Vercel CLI if needed: npm install -g vercel
vercel dev
# App runs at localhost:3000
# Uses .env.local for secrets (create from env vars listed above)
```

---

*Last updated: March 2026 — keep this file current as features ship.*
