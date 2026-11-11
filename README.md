# HIDUP Community Event · event.bali-hidup-agency.com

Invitation, RSVP and team guest list for the HIDUP Community Event on Saturday, 21 November 2026 (Dalung Tropical, 4–8 pm, replies by Sunday, 15 November).

Hosted on **Vercel**, deployed from GitHub (`bali-hidup-agency/event`): every push to `main` goes live within about a minute, and every other branch gets its own preview link.

## What is in here

| Path | What it does |
|---|---|
| `public/index.html` | The invitation (English/German). "Yes" / "No" saves the reply via `/api/rsvp`; if that fails it falls back to a prefilled WhatsApp message to +62 853-3371-1393. |
| `public/guests/index.html` | Team guest list at `/guests/` (English, team password): totals, filter, add replies by hand or by pasting a WhatsApp message, switch status, delete, copy as CSV. |
| `api/rsvp.js` | Public endpoint: saves an RSVP and sends the notification. |
| `api/guests/` | Team endpoints for the guest list; refuse every request without the team password. |
| `lib/store.js` | Validation and storage (Neon Postgres, table `guests`, created on first use). |
| `lib/notify.js` | Email / webhook notification per RSVP. |

A second reply from the same WhatsApp number updates the first one instead of adding a duplicate.

## One-time setup in Vercel (about 15 minutes)

### 1. Storage
Vercel project → **Storage → Create Database → Neon** (free plan) → connect it to this project. This adds `DATABASE_URL` automatically. The `guests` table is created on the first reply; you can view and export it in the Neon dashboard.

### 2. Team password
Project → **Settings → Environment Variables** → add `GUESTLIST_PASSWORD` with a strong password. Share it only with the team. Without it the guest list stays locked for everyone.

### 3. Notifications
Add these in the same place (all optional, skip any channel you don't want):

| Variable | Example |
|---|---|
| `RESEND_API_KEY` | from resend.com (free plan); verify `bali-hidup-agency.com` there first, it gives you DNS records to add in Cloudflare |
| `NOTIFY_EMAIL_FROM` | `HIDUP Events <events@bali-hidup-agency.com>` |
| `NOTIFY_EMAIL_TO` | `info@bali-hidup-agency.com` (several addresses separated by commas) |
| `NOTIFY_WEBHOOK_URL` | optional: Slack, Make or Zapier webhook, e.g. to forward to WhatsApp |

After changing variables: **Deployments → … → Redeploy** so they take effect.

### 4. Domain
1. Project → **Settings → Domains** → add `event.bali-hidup-agency.com`.
2. The DNS for `bali-hidup-agency.com` is in **Cloudflare**: there, add a record **CNAME** `event` → `cname.vercel-dns.com`, and set the proxy status to **DNS only** (grey cloud).
3. Back in Vercel the domain turns green within a few minutes; the SSL certificate is created automatically.

### 5. Test
1. Open `https://event.bali-hidup-agency.com`, reply "Yes" with a test name.
2. Check the notification email and `https://event.bali-hidup-agency.com/guests/`.
3. Delete the test entry in the guest list.

## Plan note
Vercel's free Hobby plan is for non-commercial use only. For a company site, Vercel's terms require the Pro plan.

## Changing content
Edit `public/index.html` (texts are in the `T` object near the bottom, English and German), commit, push. The reply deadline is `DEADLINE` in the same script.
