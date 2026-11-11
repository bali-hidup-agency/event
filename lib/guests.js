// Shared helpers for the RSVP and guest list endpoints.

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

export function digits(s) {
  return String(s || "").replace(/\D/g, "");
}

// Same id rule as the claude.ai guest list: one row per WhatsApp number, else per name.
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

// Insert or update by id; keeps the original created_at.
export async function upsertGuest(db, id, g, source) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO guests (id, name, phone, guests, status, note, lang, source, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, phone = excluded.phone, guests = excluded.guests,
         status = excluded.status, note = CASE WHEN excluded.note <> '' THEN excluded.note ELSE guests.note END,
         lang = CASE WHEN excluded.lang <> '' THEN excluded.lang ELSE guests.lang END,
         updated_at = excluded.updated_at`
    )
    .bind(id, g.name, g.phone, g.guests, g.status, g.note, g.lang, source, now)
    .run();
  return db.prepare("SELECT * FROM guests WHERE id = ?1").bind(id).first();
}
