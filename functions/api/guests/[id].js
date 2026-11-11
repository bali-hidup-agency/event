// Team endpoints (behind Cloudflare Access):
//   PATCH  /api/guests/:id  { status }  -> switch attending / declined
//   DELETE /api/guests/:id              -> remove a guest

import { json } from "../../../lib/guests.js";

export async function onRequestPatch({ request, env, params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const status = body.status === "yes" ? "yes" : body.status === "no" ? "no" : null;
  if (!status) return json({ ok: false, error: "status_required" }, 400);
  const res = await env.DB.prepare(
    `UPDATE guests SET status = ?2,
       guests = CASE WHEN ?2 = 'yes' THEN MAX(guests, 1) ELSE 0 END,
       updated_at = ?3
     WHERE id = ?1`
  )
    .bind(params.id, status, new Date().toISOString())
    .run();
  if (!res.meta.changes) return json({ ok: false, error: "not_found" }, 404);
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM guests WHERE id = ?1").bind(params.id).run();
  return json({ ok: true });
}
