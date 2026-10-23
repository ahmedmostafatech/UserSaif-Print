// seed.js — رفع الداتا التجريبية من data/data.json إلى Supabase
let fs = require("fs");
let path = require("path");
let { createClient } = require("@supabase/supabase-js");

let url = process.env.SUPABASE_URL;
let secretKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !secretKey) {
  console.log("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

let db = createClient(url, secretKey, { auth: { persistSession: false } });
let data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "data.json"), "utf8"));

async function upsertRows(table, rows, conflictKey) {
  let result = await db.from(table).upsert(rows, { onConflict: conflictKey });
  if (result.error) {
    console.log("FAILED:", table, result.error.message);
    process.exit(1);
  }
  console.log("OK:", table, rows.length, "rows");
}

async function main() {
  await upsertRows("categories", data.categories.map(function (c, i) {
    return { id: c.id, name: c.name, sort_order: i };
  }), "id");

  await upsertRows("options", Object.keys(data.options).map(function (k) {
    return { key: k, value: data.options[k] };
  }), "key");

  await upsertRows("settings", Object.keys(data.settings).map(function (k) {
    return { key: k, value: data.settings[k] };
  }), "key");

  await upsertRows("services", data.services.map(function (s, i) {
    return {
      id: s.id, name: s.name, category: s.category, form_type: s.formType,
      fields: s.fields, placements: s.placements, description: s.description,
      image: s.image, price_mode: s.priceMode, price_from: s.priceFrom,
      sample: s.sample, active: s.active, sort_order: i
    };
  }), "id");

  await upsertRows("portfolio", data.portfolio.map(function (p, i) {
    return {
      id: p.id, title: p.title, category: p.category, service_id: p.serviceId,
      image: p.image, sample: p.sample, sort_order: i
    };
  }), "id");

  let del = await db.from("faq").delete().gte("id", 0);
  if (del.error) { console.log("FAILED: faq delete", del.error.message); process.exit(1); }
  await upsertRows("faq", data.faq.map(function (f, i) {
    return { q: f.q, a: f.a, sort_order: i };
  }), "id");

  await upsertRows("orders", data.orders.map(function (o) {
    return {
      id: o.id, status: o.status, service_id: o.serviceId, quantity: o.quantity,
      description: o.description,
      customer_name: o.customer.name, customer_phone: o.customer.phone, customer_email: o.customer.email,
      requested_date: o.requestedDate, pickup: o.pickup, design_help: o.designHelp,
      artwork: o.artwork, specs: o.specs, estimated_total: o.estimatedTotal,
      owner_note: o.ownerNote, rejection_reason: o.rejectionReason,
      log: o.log, created_at: o.createdAt
    };
  }), "id");

  console.log("Seed finished");
}

main();