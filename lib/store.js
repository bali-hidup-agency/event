// Guest storage in Neon Postgres (Vercel → Storage → Neon). Vercel adds DATABASE_URL
// when the database is connected; the table is created on first use.

import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = DB_URL ? neon(DB_URL) : null;

let ready = null;
function db() {
  if (!sql) throw new Error("storage_not_configured");
  ready ||= sql`
    CREATE TABLE IF NOT EXISTS guests (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      phone       TEXT NOT NULL DEFAULT '',
      guests      INTEGER NOT NULL DEFAULT 1,
      status      TEXT NOT NULL CHECK (status IN ('yes', 'no')),
      note        TEXT NOT NULL DEFAULT '',
      lang        TEXT NOT NULL DEFAULT '',
      source      TEXT NOT NULL DEFAULT 'invitation',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )`.catch((e) => {
    ready = null;
    throw e;
  });
  return ready.then(() => sql);
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
  const q = await db();
  const rows = await q`SELECT * FROM guests WHERE id = ${id}`;
  return rows[0] || null;
}

export async function listGuests() {
  const q = await db();
  return q`SELECT * FROM guests ORDER BY created_at DESC`;
}

// Insert or update; keeps the first created_at, and keeps note/lang unless new ones are given.
export async function upsertGuest(id, g, source) {
  const q = await db();
  const now = new Date().toISOString();
  const rows = await q`
    INSERT INTO guests (id, name, phone, guests, status, note, lang, source, created_at, updated_at)
    VALUES (${id}, ${g.name}, ${g.phone}, ${g.guests}, ${g.status}, ${g.note}, ${g.lang}, ${source}, ${now}, ${now})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, phone = EXCLUDED.phone, guests = EXCLUDED.guests, status = EXCLUDED.status,
      note = CASE WHEN EXCLUDED.note <> '' THEN EXCLUDED.note ELSE guests.note END,
      lang = CASE WHEN EXCLUDED.lang <> '' THEN EXCLUDED.lang ELSE guests.lang END,
      updated_at = EXCLUDED.updated_at
    RETURNING *`;
  return rows[0];
}

export async function saveGuest(row) {
  const q = await db();
  await q`UPDATE guests SET status = ${row.status}, guests = ${row.guests}, updated_at = ${row.updated_at} WHERE id = ${row.id}`;
}

export async function deleteGuest(id) {
  const q = await db();
  await q`DELETE FROM guests WHERE id = ${id}`;
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
