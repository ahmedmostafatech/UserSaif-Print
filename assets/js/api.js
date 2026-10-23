// api-supabase.js — نسخة Supabase من api.js بنفس أسماء الدوال
let db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let MAX_FILE_BYTES = 10 * 1024 * 1024;
let ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

function unwrap(result, label) {
  if (result.error) {
    console.log("Supabase error [" + label + "]:", result.error.message);
    throw new Error(result.error.message);
  }
  return result.data;
}

function mapService(r) {
  return {
    id: r.id, name: r.name, category: r.category, formType: r.form_type,
    fields: r.fields || [], placements: r.placements || [],
    description: r.description, image: r.image,
    priceMode: r.price_mode, priceFrom: r.price_from,
    sample: r.sample, active: r.active
  };
}

function mapPortfolio(r) {
  return {
    id: r.id, title: r.title, category: r.category,
    serviceId: r.service_id, image: r.image, sample: r.sample
  };
}

function keyValueToObject(rows) {
  let out = {};
  rows.forEach(function (r) { out[r.key] = r.value; });
  return out;
}

// ---------- المحتوى ----------

async function getSettings() {
  let rows = unwrap(await db.from("settings").select("key, value"), "settings");
  return keyValueToObject(rows);
}

async function getOptions() {
  let rows = unwrap(await db.from("options").select("key, value"), "options");
  return keyValueToObject(rows);
}

async function getCategories() {
  let rows = unwrap(await db.from("categories").select("id, name").order("sort_order"), "categories");
  return rows;
}

async function getFaq() {
  let rows = unwrap(await db.from("faq").select("q, a").order("sort_order").order("id"), "faq");
  return rows;
}

async function getServices(filters) {
  filters = filters || {};
  let query = db.from("services").select("*").order("sort_order");
  if (filters.category) query = query.eq("category", filters.category);
  if (!filters.includeInactive) query = query.eq("active", true);
  let rows = unwrap(await query, "services");
  return rows.map(mapService);
}

async function getService(id) {
  let row = unwrap(await db.from("services").select("*").eq("id", id).maybeSingle(), "service");
  return row ? mapService(row) : null;
}

async function getPortfolio(category) {
  let query = db.from("portfolio").select("*").order("sort_order");
  if (category) query = query.eq("category", category);
  let rows = unwrap(await query, "portfolio");
  return rows.map(mapPortfolio);
}

// ---------- رفع الملفات ----------

async function uploadArtwork(file) {
  if (ALLOWED_TYPES.indexOf(file.type) === -1) {
    throw new Error("file-type-not-allowed");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("file-too-large");
  }
  let ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  let path = "uploads/" + crypto.randomUUID() + "/" + Date.now() + "." + ext;

  let result = await db.storage.from("artwork").upload(path, file, { contentType: file.type, upsert: false });
  if (result.error) {
    console.log("Upload failed:", result.error.message);
    throw new Error(result.error.message);
  }
  console.log("Artwork uploaded:", file.name);
  return { name: file.name, path: path, type: file.type, url: URL.createObjectURL(file) };
}

async function getArtworkUrl(item) {
  if (item.path) {
    let result = await db.storage.from("artwork").createSignedUrl(item.path, 3600);
    if (result.error) {
      console.log("Signed url failed:", result.error.message);
      return "";
    }
    return result.data.signedUrl;
  }
  return item.url || "";
}

// ---------- الطلبات (الزوار) ----------

async function submitOrder(draft) {
  let service = await getService(draft.serviceId);
  let check = checkReadiness(draft, service);
  if (!check.ready) {
    console.log("Submit blocked:", check.errorCount, "errors");
    return { ok: false, issues: check.issues };
  }

  let payload = {
    serviceId: draft.serviceId,
    quantity: Number(draft.quantity),
    description: draft.description,
    customer: draft.customer,
    requestedDate: draft.requestedDate,
    pickup: draft.pickup,
    designHelp: !!draft.designHelp,
    artwork: (draft.artwork || []).map(function (a) { return { name: a.name, path: a.path, type: a.type }; }),
    specs: draft.specs || {}
  };

  let res = await db.rpc("submit_order", { p: payload });
  if (res.error) {
    console.log("submit_order failed:", res.error.message);
    return { ok: false, error: res.error.message };
  }
  console.log("Order submitted:", res.data.id);
  return { ok: true, order: res.data };
}

async function trackOrder(number, phone) {
  let res = await db.rpc("track_order", { p_id: number, p_phone: phone });
  if (res.error) {
    console.log("track_order failed:", res.error.message);
    throw new Error(res.error.message.indexOf("too-many-attempts") !== -1 ? "too-many-attempts" : res.error.message);
  }
  return res.data || null;
}

async function resubmitOrder(id, changes, phone) {
  if (!phone) return { ok: false, error: "phone-required" };
  changes = changes || {};
  if (changes.artwork) {
    changes.artwork = changes.artwork.map(function (a) { return { name: a.name, path: a.path, type: a.type }; });
  }
  let res = await db.rpc("resubmit_order", { p_id: id, p_phone: phone, p_changes: changes });
  if (res.error) {
    console.log("resubmit_order failed:", res.error.message);
    return { ok: false, error: res.error.message };
  }
  return { ok: true, order: res.data };
}

// ---------- الأدمن ----------

async function adminLogin(email, password) {
  let res = await db.auth.signInWithPassword({ email: email, password: password });
  if (res.error) return { ok: false, error: res.error.message };
  let admin = await isAdmin();
  if (!admin) {
    await db.auth.signOut();
    return { ok: false, error: "not-admin" };
  }
  console.log("Admin logged in");
  return { ok: true };
}

async function adminLogout() {
  await db.auth.signOut();
}

async function isAdmin() {
  let session = await db.auth.getSession();
  if (!session.data.session) return false;
  let res = await db.rpc("is_admin");
  return res.data === true;
}

async function getOrders(filters) {
  filters = filters || {};
  let res = await db.rpc("admin_get_orders", {
    p_status: filters.status || null,
    p_search: filters.search || null
  });
  return unwrap(res, "admin_get_orders") || [];
}

async function getOrder(id) {
  let res = await db.rpc("admin_get_order", { p_id: id });
  return unwrap(res, "admin_get_order");
}

async function adminSetStatus(id, status, note, reason) {
  let res = await db.rpc("admin_set_status", {
    p_id: id, p_status: status, p_text: null, p_note: note || null, p_reason: reason || null
  });
  if (res.error) {
    console.log("admin_set_status failed:", res.error.message);
    return { ok: false, error: res.error.message };
  }
  console.log("Status updated:", id, "->", status);
  return { ok: true, order: res.data };
}

async function updateOrderStatus(id, status, note) {
  if (STATUSES.indexOf(status) === -1) return { ok: false, error: "invalid-status" };
  return adminSetStatus(id, status, note, null);
}

async function approveOrder(id, note) {
  return adminSetStatus(id, "approved", hasValue(note) ? note : "تمت الموافقة على الطلب.", null);
}

async function rejectOrder(id, reason) {
  if (!hasValue(reason)) return { ok: false, error: "reason-required" };
  return adminSetStatus(id, "rejected", null, reason);
}

// ---------- إدارة المحتوى (الأدمن) ----------

async function uploadContentImage(file, folder) {
  if (ALLOWED_TYPES.indexOf(file.type) === -1) {
    throw new Error("file-type-not-allowed");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("file-too-large");
  }
  folder = folder || "general";
  let ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "jpg";
  let path = folder + "/" + crypto.randomUUID() + "." + ext;

  let result = await db.storage.from("content").upload(path, file, { contentType: file.type, upsert: true });
  if (result.error) {
    console.log("Content image upload failed:", result.error.message);
    throw new Error(result.error.message);
  }
  let pub = db.storage.from("content").getPublicUrl(path);
  return { path: path, url: pub.data.publicUrl, name: file.name };
}

async function adminSaveService(service) {
  let row = {
    id: service.id,
    name: service.name,
    category: service.category,
    form_type: service.formType,
    fields: service.fields || [],
    placements: service.placements || [],
    description: service.description || "",
    image: service.image || "",
    price_mode: service.priceMode || "from",
    price_from: (service.priceFrom !== null && service.priceFrom !== undefined && service.priceFrom !== "") ? Number(service.priceFrom) : null,
    sample: service.sample !== false,
    active: service.active !== false
  };
  if (service.sortOrder !== undefined && service.sortOrder !== null) {
    row.sort_order = Number(service.sortOrder);
  }
  let res = await db.from("services").upsert(row, { onConflict: "id" }).select().single();
  let data = unwrap(res, "adminSaveService");
  return mapService(data);
}

async function adminDeleteService(id) {
  let res = await db.from("services").delete().eq("id", id);
  unwrap(res, "adminDeleteService");
  return true;
}

async function adminToggleServiceActive(id, active) {
  let res = await db.from("services").update({ active: !!active }).eq("id", id).select().single();
  let data = unwrap(res, "adminToggleServiceActive");
  return mapService(data);
}

async function adminSaveCategory(category) {
  let row = {
    id: category.id,
    name: category.name
  };
  if (category.sortOrder !== undefined && category.sortOrder !== null) {
    row.sort_order = Number(category.sortOrder);
  }
  let res = await db.from("categories").upsert(row, { onConflict: "id" }).select().single();
  return unwrap(res, "adminSaveCategory");
}

async function adminDeleteCategory(id) {
  let res = await db.from("categories").delete().eq("id", id);
  unwrap(res, "adminDeleteCategory");
  return true;
}

async function adminSaveOption(key, value) {
  let res = await db.from("options").upsert({ key: key, value: value }, { onConflict: "key" });
  unwrap(res, "adminSaveOption");
  return true;
}

async function adminSavePortfolio(item) {
  let row = {
    id: item.id,
    title: item.title,
    category: item.category,
    service_id: item.serviceId,
    image: item.image || "",
    sample: item.sample !== false
  };
  if (item.sortOrder !== undefined && item.sortOrder !== null) {
    row.sort_order = Number(item.sortOrder);
  }
  let res = await db.from("portfolio").upsert(row, { onConflict: "id" }).select().single();
  let data = unwrap(res, "adminSavePortfolio");
  return mapPortfolio(data);
}

async function adminDeletePortfolio(id) {
  let res = await db.from("portfolio").delete().eq("id", id);
  unwrap(res, "adminDeletePortfolio");
  return true;
}

// ---------- 6. الاستفسارات ورسائل العملاء ----------

let DEFAULT_INQUIRIES = [
  {
    id: "INQ-1001",
    name: "أحمد عثمان",
    phone: "01123456780",
    topic: "استفسار عن خامات وتفاصيل الطباعة",
    message: "السلام عليكم، هل متاح طباعة سلك سكرين 4 ألوان على 50 تيشيرت أسود أوفر سايز؟ ومحتاج أعرف مدة التجهيز التقريبية للاستلام بأسوان.",
    status: "new",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: "INQ-1002",
    name: "سارة كمال",
    phone: "01098765432",
    topic: "طلب كميات خاصة لشركة أو فعالية",
    message: "محتاجين عرض أسعار لـ 100 مج سيراميك مطفي مع طباعة الشعار وبوكس التغليف لمؤتمر استثمار بأسوان الأسبوع القادم.",
    status: "replied",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

function getLocalInquiries() {
  try {
    let raw = localStorage.getItem("ys_inquiries");
    if (!raw) {
      localStorage.setItem("ys_inquiries", JSON.stringify(DEFAULT_INQUIRIES));
      return DEFAULT_INQUIRIES;
    }
    return JSON.parse(raw) || [];
  } catch (e) {
    return DEFAULT_INQUIRIES;
  }
}

function setLocalInquiries(list) {
  try {
    localStorage.setItem("ys_inquiries", JSON.stringify(list));
  } catch (e) {}
}

async function submitInquiry(inquiry) {
  inquiry.id = inquiry.id || ("INQ-" + Date.now().toString().slice(-4));
  inquiry.status = inquiry.status || "new";
  inquiry.createdAt = inquiry.createdAt || new Date().toISOString();

  let list = getLocalInquiries();
  list.unshift(inquiry);
  setLocalInquiries(list);

  try {
    await db.from("inquiries").insert([{
      id: inquiry.id,
      name: inquiry.name,
      phone: inquiry.phone,
      topic: inquiry.topic,
      message: inquiry.message,
      status: inquiry.status,
      created_at: inquiry.createdAt
    }]);
  } catch (e) {
    console.log("Supabase inquiries notice (saved locally):", e);
  }

  return { ok: true, inquiry: inquiry };
}

async function getInquiries() {
  let localList = getLocalInquiries();
  try {
    let res = await db.from("inquiries").select("*").order("created_at", { ascending: false });
    if (res.data && res.data.length > 0) {
      let supaIds = new Set(res.data.map(function (r) { return r.id; }));
      let mappedSupa = res.data.map(function (r) {
        return {
          id: r.id,
          name: r.name,
          phone: r.phone,
          topic: r.topic,
          message: r.message,
          status: r.status,
          createdAt: r.created_at
        };
      });
      let combined = mappedSupa.concat(localList.filter(function (l) { return !supaIds.has(l.id); }));
      return combined;
    }
  } catch (e) {
    console.log("Supabase getInquiries notice (using local):", e);
  }
  return localList;
}

async function updateInquiryStatus(id, status) {
  let list = getLocalInquiries();
  let item = list.find(function (it) { return it.id === id; });
  if (item) {
    item.status = status;
    setLocalInquiries(list);
  }
  try {
    await db.from("inquiries").update({ status: status }).eq("id", id);
  } catch (e) {}
  return true;
}

async function deleteInquiry(id) {
  let list = getLocalInquiries().filter(function (it) { return it.id !== id; });
  setLocalInquiries(list);
  try {
    await db.from("inquiries").delete().eq("id", id);
  } catch (e) {}
  return true;
}