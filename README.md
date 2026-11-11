# HIDUP Community Event · event.bali-hidup-agency.com

Invitation, RSVP and team guest list for the HIDUP Community Event on Saturday, 21 November 2026 (Dalung Tropical, 4–8 pm, replies by Sunday, 15 November).

Hosted on **Cloudflare Pages**, deployed from this GitHub repository: every push to `main` goes live within about a minute, and every other branch gets its own preview link.

## What is in here

| Path | What it does |
|---|---|
| `public/index.html` | The invitation (English/German). "Yes" / "No" saves the reply via `/api/rsvp`; if that fails it falls back to a prefilled WhatsApp message to +62 853-3371-1393. |
| `public/guests/index.html` | Team guest list at `/guests/` (English): totals, filter, add replies by hand or by pasting a WhatsApp message, switch status, delete, copy as CSV. |
| `functions/api/rsvp.js` | Public endpoint: saves an RSVP and sends the notification. |
| `functions/api/guests/` | Team endpoints for the guest list. Refuses every request that did not pass Cloudflare Access. |
| `lib/` | Shared code: validation, database writes, notifications. |
| `schema.sql` | Database table (Cloudflare D1). |
| `wrangler.toml` | Cloudflare project settings, including the database binding. |

A second reply from the same WhatsApp number updates the first one instead of adding a duplicate.

## One-time setup (about 30 minutes)

### 1. GitHub
Create a **private** repository, e.g. `community-event`, and push this folder to `main`.

### 2. Database (Cloudflare D1)
1. Cloudflare dashboard → **Storage & Databases → D1** → **Create** → name it `hidup-community-event`.
2. Open the database → **Console** → paste the contents of `schema.sql` → **Execute**.
3. Copy the **Database ID** into `wrangler.toml` (replace `REPLACE_WITH_DATABASE_ID`), commit and push.

### 3. Cloudflare Pages
1. **Workers & Pages → Create → Pages → Connect to Git** → pick the repository.
2. Framework preset: **None**. Build command: *(empty)*. Build output directory: `public`.
3. Deploy. The site is now live on a `*.pages.dev` address; the database binding `DB` comes from `wrangler.toml`.

### 4. Domain
Pages project → **Custom domains → Set up a domain** → `event.bali-hidup-agency.com`. The DNS record is created automatically because the domain is already in this Cloudflare account.

### 5. Protect the guest list (Cloudflare Access)
1. **Zero Trust → Access → Applications → Add → Self-hosted**.
2. Application domain: `event.bali-hidup-agency.com`, paths `guests` **and** `api/guests` (add both).
3. Policy: **Allow**, include **Emails**: the team's email addresses.
4. Login method: **One-time PIN** (a code by email, no passwords).

Until this is done, the guest list API refuses all requests, so no guest data can leak.

### 6. Notifications
Each RSVP from the invitation can send an email and/or a webhook. Set these under Pages project → **Settings → Variables and Secrets** (then redeploy):

| Variable | Example |
|---|---|
| `RESEND_API_KEY` | from resend.com (free plan is enough); verify `bali-hidup-agency.com` there first, it gives you DNS records to add in Cloudflare |
| `NOTIFY_EMAIL_FROM` | `HIDUP Events <events@bali-hidup-agency.com>` |
| `NOTIFY_EMAIL_TO` | `info@bali-hidup-agency.com` (several addresses separated by commas) |
| `NOTIFY_WEBHOOK_URL` | optional: Slack, Make or Zapier webhook, e.g. to forward to WhatsApp |

### 7. Test
1. Open `https://event.bali-hidup-agency.com`, reply "Yes" with a test name.
2. Check the notification email and `https://event.bali-hidup-agency.com/guests/`.
3. Delete the test entry in the guest list.

## Changing content
Edit `public/index.html` (texts are in the `T` object near the bottom, English and German), commit, push. The reply deadline is `DEADLINE` in the same script.
