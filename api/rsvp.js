// Public endpoint the invitation posts to: POST /api/rsvp
// Body: { name, phone, guests, status: "yes" | "no", lang, website (honeypot, must stay empty) }

import { json, cleanGuest, guestId, upsertGuest, listGuests, totals } from "../lib/store.js";
import { notifyRsvp } from "../lib/notify.js";

export async function POST(request) {
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

  let row;
  try {
    row = await upsertGuest(guestId(guest.name, guest.phone), guest, "invitation");
  } catch (e) {
    console.error("rsvp save failed", e);
    return json({ ok: false, error: "save_failed" }, 500);
  }

  // A failed notification must never lose the reply itself.
  try {
    await notifyRsvp(row, totals(await listGuests()));
  } catch (e) {
    console.error("notify failed", e);
  }
  return json({ ok: true, status: row.status, guests: row.guests });
}
