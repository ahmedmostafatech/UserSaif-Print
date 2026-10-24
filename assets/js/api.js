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
  let custom = {};
  try {
    custom = (JSON.parse(localStorage.getItem("ys_custom_portfolio") || "{}"))[r.id] || {};
  } catch (e) {}

  let rawImages = custom.images || (Array.isArray(r.images) && r.images.length > 0 ? r.images : (r.image ? [r.image] : []));
  let images = Array.isArray(rawImages) ? rawImages : [rawImages];
  let primary = custom.image || r.image || (images.length > 0 ? images[0] : "");
  let autoSlide = custom.autoSlide !== undefined ? custom.autoSlide : (r.auto_slide !== undefined ? r.auto_slide : (r.autoSlide !== undefined ? r.autoSlide : true));

  return {
    id: r.id,
    title: custom.title || r.title,
    category: custom.category || r.category,
    serviceId: custom.serviceId || r.service_id || r.serviceId,
    image: primary,
    images: images.length > 0 ? images : (primary ? [primary] : []),
    autoSlide: !!autoSlide,
    sample: r.sample
  };
}

function keyValueToObject(rows) {
  let out = {};
  rows.forEach(function (r) { out[r.key] = r.value; });
  return out;
}

// ---------- المحتوى ----------

async function getSettings() {
  let obj = {};
  try {
    let rows = unwrap(await db.from("settings").select("key, value"), "settings");
    obj = keyValueToObject(rows);
  } catch (err) {
    try {
      let d = await fetch("data/data.json").then(function (r) { return r.json(); });
      obj = d.settings || {};
    } catch (e) {}
  }
  // دمج أي إعدادات محفوظة محلياً (مثل صورة الهيرو)
  try {
    let localHero = localStorage.getItem("ys_hero_image");
    if (localHero) obj.heroImage = localHero;
  } catch (e) {}
  return obj;
}

async function getOptions() {
  try {
    let rows = unwrap(await db.from("options").select("key, value"), "options");
    return keyValueToObject(rows);
  } catch (err) {
    try {
      let d = await fetch("data/data.json").then(function (r) { return r.json(); });
      return d.options || {};
    } catch (e) {
      return {};
    }
  }
}

async function getCategories() {
  try {
    let rows = unwrap(await db.from("categories").select("id, name").order("sort_order"), "categories");
    return rows;
  } catch (err) {
    try {
      let d = await fetch("data/data.json").then(function (r) { return r.json(); });
      return d.categories || [];
    } catch (e) {
      return [];
    }
  }
}

async function getFaq() {
  try {
    let rows = unwrap(await db.from("faq").select("q, a").order("sort_order").order("id"), "faq");
    return rows;
  } catch (err) {
    try {
      let d = await fetch("data/data.json").then(function (r) { return r.json(); });
      return d.faq || [];
    } catch (e) {
      return [];
    }
  }
}

async function getServices(filters) {
  filters = filters || {};
  let rows = [];
  try {
    let query = db.from("services").select("*").order("sort_order");
    if (filters.category) query = query.eq("category", filters.category);
    if (!filters.includeInactive) query = query.eq("active", true);
    rows = unwrap(await query, "services");
  } catch (err) {
    try {
      let d = await fetch("data/data.json").then(function (r) { return r.json(); });
      rows = d.services || [];
      if (filters.category) rows = rows.filter(function (s) { return s.category === filters.category; });
      if (!filters.includeInactive) rows = rows.filter(function (s) { return s.active !== false; });
    } catch (e) {}
  }

  let mapped = rows.map(mapService);
  // دمج أي خدمات معدلة محلياً
  try {
    let custom = JSON.parse(localStorage.getItem("ys_custom_services") || "{}");
    Object.keys(custom).forEach(function (id) {
      let it = custom[id];
      let exists = mapped.find(function (m) { return m.id === id; });
      if (exists) {
        Object.assign(exists, it);
      } else {
        mapped.push(it);
      }
    });
  } catch (e) {}

  if (filters.category) {
    mapped = mapped.filter(function (s) { return s.category === filters.category; });
  }
  if (!filters.includeInactive) {
    mapped = mapped.filter(function (s) { return s.active !== false; });
  }
  return mapped;
}

async function getService(id) {
  let list = await getServices({ includeInactive: true });
  return list.find(function (s) { return s.id === id; }) || null;
}

async function getPortfolio(category) {
  let rows = [];
  try {
    let query = db.from("portfolio").select("*").order("sort_order");
    if (category) query = query.eq("category", category);
    rows = unwrap(await query, "portfolio");
  } catch (err) {
    try {
      let d = await fetch("data/data.json").then(function (r) { return r.json(); });
      rows = d.portfolio || [];
      if (category) rows = rows.filter(function (p) { return p.category === category; });
    } catch (e) {}
  }

  let mapped = rows.map(mapPortfolio);
  // دمج أي أعمال جديدة أضيفت محلياً ولم تكن في السيرفر بعد
  try {
    let custom = JSON.parse(localStorage.getItem("ys_custom_portfolio") || "{}");
    Object.keys(custom).forEach(function (id) {
      let it = custom[id];
      let exists = mapped.find(function (m) { return m.id === id; });
      if (exists) {
        if (it.images) exists.images = it.images;
        if (it.image) exists.image = it.image;
        if (it.autoSlide !== undefined) exists.autoSlide = it.autoSlide;
        if (it.title) exists.title = it.title;
        if (it.category) exists.category = it.category;
      } else {
        mapped.push({
          id: id,
          title: it.title || "عمل جديد",
          category: it.category || "apparel",
          serviceId: it.serviceId || "tshirt",
          image: it.image || (it.images && it.images[0]) || "",
          images: it.images || [],
          autoSlide: it.autoSlide !== false,
          sample: false
        });
      }
    });
  } catch (e) {}

  if (category) {
    mapped = mapped.filter(function (p) { return p.category === category; });
  }
  return mapped;
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
  let isMulti = Array.isArray(draft.items) && draft.items.length > 0;
  let service = await getService(draft.serviceId);

  if (!isMulti) {
    let check = checkReadiness(draft, service);
    if (!check.ready) {
      console.log("Submit blocked:", check.errorCount, "errors");
      return { ok: false, issues: check.issues };
    }
  }

  let totalQty = 0;
  if (isMulti) {
    draft.items.forEach(function (it) {
      totalQty += Number(it.quantity) || 1;
    });
  } else {
    totalQty = Number(draft.quantity) || 1;
  }

  let desc = draft.description || "";
  if (isMulti) {
    let itemsSummary = draft.items.map(function (it, idx) {
      let specStr = "";
      if (it.specs) {
        if (it.specs.color) specStr += " لون: " + it.specs.color;
        if (it.specs.placement) specStr += " مكان: " + (Array.isArray(it.specs.placement) ? it.specs.placement.join(", ") : it.specs.placement);
        if (it.specs.sizes) {
          let sParts = Object.keys(it.specs.sizes).filter(function (k) { return it.specs.sizes[k] > 0; }).map(function (k) { return k + ":" + it.specs.sizes[k]; });
          if (sParts.length) specStr += " مقاسات: [" + sParts.join(" ") + "]";
        }
        if (it.specs.phoneModel) specStr += " طراز: " + it.specs.phoneModel;
        if (it.specs.customText) specStr += " نص: " + it.specs.customText;
        if (it.specs.width && it.specs.height) specStr += " أبعاد: " + it.specs.width + "x" + it.specs.height;
      }
      return (idx + 1) + ") " + it.serviceName + " (عدد: " + it.quantity + (specStr ? " |" + specStr : "") + (it.estimatedTotal ? " | تكلفة: " + it.estimatedTotal + " ج.م" : "") + ")";
    }).join("\n");

    desc = "【منتجات الطلب المجمعة】:\n" + itemsSummary + (desc ? "\n\n【ملاحظات عامة للتصميم والتنفيذ】:\n" + desc : "");
  }

  let payload = {
    serviceId: draft.serviceId || (isMulti && draft.items[0] ? draft.items[0].serviceId : "tshirt"),
    quantity: totalQty,
    description: desc,
    customer: draft.customer,
    requestedDate: draft.requestedDate,
    pickup: draft.pickup,
    designHelp: !!draft.designHelp,
    artwork: (draft.artwork || []).map(function (a) { return { name: a.name, path: a.path, type: a.type }; }),
    specs: Object.assign({}, draft.specs || {}, {
      items: isMulti ? draft.items : undefined,
      multiItemOrder: isMulti
    })
  };

  try {
    let res = await db.rpc("submit_order", { p: payload });
    if (res.error) throw res.error;
    console.log("Order submitted:", res.data.id);
    return { ok: true, order: res.data };
  } catch (err) {
    console.log("Supabase submit_order fallback to local save:", err.message);
    let fallbackId = "YS-" + Math.floor(1000 + Math.random() * 9000);
    let orderObj = {
      id: fallbackId,
      serviceId: payload.serviceId,
      quantity: payload.quantity,
      description: payload.description,
      customer: payload.customer,
      requestedDate: payload.requestedDate,
      pickup: payload.pickup,
      designHelp: payload.designHelp,
      artwork: payload.artwork,
      specs: payload.specs,
      status: "received",
      createdAt: new Date().toISOString()
    };
    try {
      let localOrders = JSON.parse(localStorage.getItem("ys_local_orders") || "[]");
      localOrders.unshift(orderObj);
      localStorage.setItem("ys_local_orders", JSON.stringify(localOrders));
    } catch (e) {}
    return { ok: true, order: orderObj };
  }
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
  let rawImages = Array.isArray(item.images) && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
  let images = rawImages.filter(function (img) { return typeof img === "string" && img.trim() !== ""; });
  let primaryImage = item.image || (images.length > 0 ? images[0] : "");
  if (primaryImage && images.indexOf(primaryImage) === -1) {
    images.unshift(primaryImage);
  }
  let autoSlide = item.autoSlide !== false;

  let row = {
    id: item.id,
    title: item.title,
    category: item.category,
    service_id: item.serviceId,
    image: primaryImage,
    sample: item.sample !== false
  };
  if (item.sortOrder !== undefined && item.sortOrder !== null) {
    row.sort_order = Number(item.sortOrder);
  }

  // تخزين محلي لضمان تزامن فوري في كل الصفحات
  try {
    let custom = JSON.parse(localStorage.getItem("ys_custom_portfolio") || "{}");
    custom[item.id] = {
      id: item.id,
      title: item.title,
      category: item.category,
      serviceId: item.serviceId,
      image: primaryImage,
      images: images,
      autoSlide: autoSlide
    };
    localStorage.setItem("ys_custom_portfolio", JSON.stringify(custom));
  } catch (e) {}

  let data;
  try {
    let fullRow = Object.assign({}, row, { images: images, auto_slide: autoSlide });
    let res = await db.from("portfolio").upsert(fullRow, { onConflict: "id" }).select().single();
    if (res.error) throw res.error;
    data = res.data;
  } catch (err) {
    let res2 = await db.from("portfolio").upsert(row, { onConflict: "id" }).select().single();
    data = unwrap(res2, "adminSavePortfolio");
  }

  let mapped = mapPortfolio(data);
  mapped.images = images;
  mapped.autoSlide = autoSlide;
  mapped.image = primaryImage;
  return mapped;
}

async function adminDeletePortfolio(id) {
  try {
    let custom = JSON.parse(localStorage.getItem("ys_custom_portfolio") || "{}");
    delete custom[id];
    localStorage.setItem("ys_custom_portfolio", JSON.stringify(custom));
  } catch (e) {}

  let res = await db.from("portfolio").delete().eq("id", id);
  unwrap(res, "adminDeletePortfolio");
  return true;
}

async function adminSaveSetting(key, value) {
  try {
    localStorage.setItem("ys_setting_" + key, String(value));
    if (key === "heroImage") {
      localStorage.setItem("ys_hero_image", String(value));
    }
  } catch (e) {}

  try {
    let res = await db.from("settings").upsert({ key: key, value: value }, { onConflict: "key" });
    unwrap(res, "adminSaveSetting");
  } catch (err) {
    console.log("adminSaveSetting supabase info:", err.message);
  }
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