// Guest storage in Upstash Redis (Vercel Marketplace → Storage → Upstash for Redis).
// All guests live in one Redis hash "guests": field = guest id, value = JSON.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "guests";

async function redis(...command) {
  if (!URL_ || !TOKEN) throw new Error("storage_not_configured");
  const r = await fetch(URL_, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data.error || `redis_${r.status}`);
  return data.result;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

export function digits(s) {
  return String(s || "").replace(/\D/g, "");
}

// One entry per WhatsApp number, else per name, so a second reply updates the first.
export function guestId(name, phone) {
  const p = digits(phone);
  if (p.length >= 8) return "p" + p;
  return "n" + name.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

// Validates and normalises a guest payload. Returns { guest } or { error }.
export function cleanGuest(body, { requirePhone }) {
  const name = clip(body.name, 120);
  const phone = clip(body.phone, 40);
  const status = body.status === "no" ? "no" : body.status === "yes" ? "yes" : null;
  if (!name) return { error: "name_required" };
  if (!status) return { error: "status_required" };
  if (requirePhone && digits(phone).length < 8) return { error: "phone_required" };
  const n = parseInt(body.guests, 10);
  return {
    guest: {
      name,
      phone,
      status,
      guests: status === "yes" ? Math.min(10, Math.max(1, Number.isFinite(n) ? n : 1)) : 0,
      note: clip(body.note, 500),
      lang: body.lang === "de" ? "de" : body.lang === "en" ? "en" : "",
    },
  };
}

export async function getGuest(id) {
  const raw = await redis("HGET", KEY, id);
  return raw ? JSON.parse(raw) : null;
}

export async function listGuests() {
  const flat = (await redis("HGETALL", KEY)) || [];
  const rows = [];
  for (let i = 1; i < flat.length; i += 2) rows.push(JSON.parse(flat[i]));
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// Insert or update; keeps the first created_at, and keeps note/lang unless new ones are given.
export async function upsertGuest(id, g, source) {
  const now = new Date().toISOString();
  const old = await getGuest(id);
  const row = {
    id,
    ...g,
    note: g.note || old?.note || "",
    lang: g.lang || old?.lang || "",
    source: old?.source || source,
    created_at: old?.created_at || now,
    updated_at: now,
  };
  await redis("HSET", KEY, id, JSON.stringify(row));
  return row;
}

export async function saveGuest(row) {
  await redis("HSET", KEY, row.id, JSON.stringify(row));
}

export async function deleteGuest(id) {
  await redis("HDEL", KEY, id);
}

export function totals(rows) {
  const yes = rows.filter((r) => r.status === "yes");
  return {
    yes: yes.length,
    no: rows.filter((r) => r.status === "no").length,
    people: yes.reduce((s, r) => s + (r.guests || 1), 0),
  };
}

// The guest list is protected by one team password (GUESTLIST_PASSWORD in Vercel).
export function authorized(request) {
  const pw = process.env.GUESTLIST_PASSWORD;
  if (!pw) return false;
  const h = request.headers.get("authorization") || "";
  return h === `Bearer ${pw}`;
}
