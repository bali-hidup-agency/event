// Team endpoints (behind Cloudflare Access):
//   GET  /api/guests  -> { guests: [...], totals }
//   POST /api/guests  -> add or update a guest by hand (phone optional)

import { json, cleanGuest, guestId, upsertGuest } from "../../../lib/guests.js";
import { totals } from "../../../lib/notify.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM guests ORDER BY created_at DESC").all();
  return json({ guests: results, totals: await totals(env.DB) });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const { guest, error } = cleanGuest(body, { requirePhone: false });
  if (error) return json({ ok: false, error }, 400);
  const row = await upsertGuest(env.DB, guestId(guest.name, guest.phone), guest, "team");
  return json({ ok: true, guest: row });
}
