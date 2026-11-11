// Sends a notification for each RSVP from the invitation. Every channel is optional:
// it only runs when its variables are set in Vercel (Settings → Environment Variables).

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export async function notifyRsvp(row, totals) {
  const env = process.env;
  const yes = row.status === "yes";
  const subject = yes
    ? `New RSVP: ${row.name} is coming (${row.guests} ${row.guests === 1 ? "guest" : "guests"})`
    : `RSVP: ${row.name} can't make it`;
  const lines = [
    `Name: ${row.name}`,
    `WhatsApp: ${row.phone || "-"}`,
    `Status: ${yes ? "Attending" : "Declined"}`,
    yes ? `Guests: ${row.guests}` : null,
    row.note ? `Note: ${row.note}` : null,
    "",
    `Total so far: ${totals.people} guests from ${totals.yes} replies, ${totals.no} declined.`,
  ].filter((l) => l !== null);

  const jobs = [];

  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL_TO && env.NOTIFY_EMAIL_FROM) {
    jobs.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: env.NOTIFY_EMAIL_FROM,
          to: env.NOTIFY_EMAIL_TO.split(",").map((s) => s.trim()).filter(Boolean),
          subject,
          text: lines.join("\n"),
          html: `<p>${lines.map(esc).join("<br>")}</p><p><a href="https://event.bali-hidup-agency.com/guests/">Open the guest list</a></p>`,
        }),
      })
    );
  }

  if (env.NOTIFY_WEBHOOK_URL) {
    jobs.push(
      fetch(env.NOTIFY_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `${subject}\n${lines.join("\n")}`, guest: row, totals }),
      })
    );
  }

  const results = await Promise.allSettled(jobs);
  results.forEach((r) => {
    if (r.status === "rejected") console.error("notify failed", r.reason);
    else if (!r.value.ok) console.error("notify failed", r.value.status);
  });
}
