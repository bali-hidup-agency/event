// Team endpoints (need the team password as "Authorization: Bearer <password>"):
//   PATCH  /api/guests/:id  { status }  -> switch attending / declined
//   DELETE /api/guests/:id              -> remove a guest

import { json, authorized, getGuest, saveGuest, deleteGuest } from "../../lib/store.js";

function idFrom(request) {
  return decodeURIComponent(new URL(request.url).pathname.split("/").pop() || "");
}

export async function PATCH(request) {
  if (!authorized(request)) return json({ ok: false, error: "login_required" }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const status = body.status === "yes" ? "yes" : body.status === "no" ? "no" : null;
  if (!status) return json({ ok: false, error: "status_required" }, 400);
  const row = await getGuest(idFrom(request));
  if (!row) return json({ ok: false, error: "not_found" }, 404);
  row.status = status;
  row.guests = status === "yes" ? Math.max(1, row.guests || 1) : 0;
  row.updated_at = new Date().toISOString();
  await saveGuest(row);
  return json({ ok: true });
}

export async function DELETE(request) {
  if (!authorized(request)) return json({ ok: false, error: "login_required" }, 401);
  await deleteGuest(idFrom(request));
  return json({ ok: true });
}
