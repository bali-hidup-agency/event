// Public endpoint the invitation posts to: POST /api/rsvp
// Body: { name, phone, guests, status: "yes" | "no", lang, website (honeypot, must stay empty) }

import { json, cleanGuest, guestId, upsertGuest } from "../../lib/guests.js";
import { notifyRsvp, totals } from "../../lib/notify.js";

export async function onRequestPost({ request, env, waitUntil }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  // Bots fill every field; people never see this one.
  if (body.website) return json({ ok: true });

  const { guest, error } = cleanGuest(body, { requirePhone: true });
  if (error) return json({ ok: false, error }, 400);

  const row = await upsertGuest(env.DB, guestId(guest.name, guest.phone), guest, "invitation");
  waitUntil(totals(env.DB).then((t) => notifyRsvp(env, row, t)));
  return json({ ok: true, status: row.status, guests: row.guests });
}

export function onRequest() {
  return json({ ok: false, error: "method_not_allowed" }, 405);
}
