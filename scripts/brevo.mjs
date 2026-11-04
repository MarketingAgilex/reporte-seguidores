import { writeFileSync } from "node:fs";
const KEY = process.env.BREVO_API_KEY;
if (!KEY) { console.error("Falta el secreto BREVO_API_KEY"); process.exit(1); }
const API = "https://api.brevo.com/v3";
const headers = { "api-key": KEY, accept: "application/json" };
async function get(path) {
  const res = await fetch(API + path, { headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
const end = new Date();
const start = new Date(end.getTime() - 180 * 864e5);
const iso = d => d.toISOString().replace(/\.\d+Z$/, ".000Z");
const campaigns = [];
for (let offset = 0; ; offset += 100) {
  const page = await get(`/emailCampaigns?status=sent&statistics=globalStats&excludeHtmlContent=true&limit=100&offset=${offset}&startDate=${encodeURIComponent(iso(start))}&endDate=${encodeURIComponent(iso(end))}`);
  const items = page.campaigns || [];
  for (const c of items) {
    const g = c.statistics?.globalStats || {};
    campaigns.push({ id: c.id, name: c.name, subject: (c.subject || "").replace(/\s+/g, " ").trim(),
      sentDate: c.sentDate, lists: c.recipients?.lists || [], sent: g.sent || 0, delivered: g.delivered || 0,
      uniqueViews: g.uniqueViews || 0, trackableViews: g.trackableViews || 0, appleMpp: g.appleMppOpens || 0,
      uniqueClicks: g.uniqueClicks || 0, hardBounces: g.hardBounces || 0, softBounces: g.softBounces || 0,
      unsubscriptions: g.unsubscriptions || 0, complaints: g.complaints || 0 });
  }
  if (items.length < 100) break;
}
const lists = {};
for (let offset = 0; ; offset += 50) {
  const page = await get(`/contacts/lists?limit=50&offset=${offset}`);
  const items = page.lists || [];
  for (const l of items) lists[l.id] = l.name;
  if (items.length < 50) break;
}
campaigns.sort((a, b) => (a.sentDate || "").localeCompare(b.sentDate || ""));
writeFileSync("brevo.json", JSON.stringify({ updatedAt: new Date().toISOString(), lists, campaigns }));
console.log(`brevo.json actualizado: ${campaigns.length} campañas`);
