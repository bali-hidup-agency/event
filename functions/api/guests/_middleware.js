// The guest list API is for the team only. Cloudflare Access sits in front of
// /guests* and /api/guests* and adds this header after a successful login;
// without it (e.g. Access not set up yet) every request is refused.

import { json } from "../../../lib/guests.js";

export async function onRequest({ request, next }) {
  const email = request.headers.get("cf-access-authenticated-user-email");
  if (!email) return json({ ok: false, error: "login_required" }, 401);
  return next();
}
