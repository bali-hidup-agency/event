// Team endpoints (need the team password as "Authorization: Bearer <password>"):
//   GET  /api/guests  -> { guests: [...], totals }
//   POST /api/guests  -> add or update a guest by hand (phone optional)

import { json, authorized, cleanGuest, guestId, upsertGuest, listGuests, totals } from "../../lib/store.js";

export async function GET(request) {
  if (!authorized(request)) return json({ ok: false, error: "login_required" }, 401);
  const guests = await listGuests();
  return json({ guests, totals: totals(guests) });
}

export async function POST(request) {
  if (!authorized(request)) return json({ ok: false, error: "login_required" }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const { guest, error } = cleanGuest(body, { requirePhone: false });
  if (error) return json({ ok: false, error }, 400);
  const row = await upsertGuest(guestId(guest.name, guest.phone), guest, "team");
  return json({ ok: true, guest: row });
}
