// api.js — كل الصفحات بتتعامل مع البيانات من هنا فقط
// الوضع الحالي: بيانات تجريبية من data.json + طلبات جديدة في localStorage
// لاحقًا: api-supabase.js بنفس أسماء الدوال، وبنبدّل السكريبت في الصفحات
// ترتيب التحميل: schema.js ← readiness.js ← api.js

let DATA_URL = "data/data.json";   // لو الصفحة داخل مجلد فرعي عدّل المسار
let LOCAL_KEY = "ys-orders-local";
let dataCache = null;

// ---------- أدوات داخلية ----------

async function loadData() {
  if (dataCache) return dataCache;
  let res = await fetch(DATA_URL);
  if (!res.ok) {
    throw new Error("Failed to load " + DATA_URL + " (" + res.status + ")");
  }
  dataCache = await res.json();
  console.log("Data loaded:", dataCache.services.length, "services");
  return dataCache;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function nowIso() {
  return new Date().toISOString();
}

function readLocalOrders() {
  try {
    let raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.log("Local read failed:", e);
    return [];
  }
}

function writeLocalOrders(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.log("Local write failed:", e);
    return false;
  }
}

// حفظ طلب (جديد أو معدّل) في التخزين المحلي
function saveLocalOrder(order) {
  let list = readLocalOrders();
  let found = false;
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === order.id) {
      list[i] = order;
      found = true;
    }
  }
  if (!found) list.push(order);
  return writeLocalOrders(list);
}

function resetLocalData() {
  try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* تجاهل */ }
  console.log("Local orders cleared");
}

async function nextOrderId() {
  let all = await getOrders();
  let max = 1000;
  all.forEach(function (o) {
    let n = Number(String(o.id).replace(/\D/g, ""));
    if (n > max) max = n;
  });
  return "YS-" + (max + 1);
}

// ---------- المحتوى (قراءة) ----------

async function getSettings() {
  let data = await loadData();
  return clone(data.settings);
}

async function getCategories() {
  let data = await loadData();
  return clone(data.categories);
}

async function getOptions() {
  let data = await loadData();
  return clone(data.options);
}

async function getFaq() {
  let data = await loadData();
  return clone(data.faq);
}

// filters: { category, includeInactive }
async function getServices(filters) {
  let data = await loadData();
  filters = filters || {};
  let list = data.services.filter(function (s) {
    if (!filters.includeInactive && !s.active) return false;
    if (filters.category && s.category !== filters.category) return false;
    return true;
  });
  return clone(list);
}

async function getService(id) {
  let data = await loadData();
  let found = data.services.filter(function (s) { return s.id === id; })[0];
  return found ? clone(found) : null;
}

async function getPortfolio(category) {
  let data = await loadData();
  let list = data.portfolio.filter(function (p) {
    return !category || p.category === category;
  });
  return clone(list);
}

// ---------- الطلبات ----------

// filters: { status, search }
async function getOrders(filters) {
  let data = await loadData();
  filters = filters || {};
  let map = {};
  data.orders.forEach(function (o) { map[o.id] = o; });
  readLocalOrders().forEach(function (o) { map[o.id] = o; }); // المحلي يغلب الأصلي

  let list = Object.keys(map).map(function (k) { return map[k]; });

  if (filters.status) {
    list = list.filter(function (o) { return o.status === filters.status; });
  }
  if (filters.search) {
    let q = toWesternDigits(filters.search).toLowerCase().trim();
    list = list.filter(function (o) {
      let hay = (o.id + " " + o.customer.name + " " + o.customer.phone).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  list.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  return clone(list);
}

async function getOrder(id) {
  let list = await getOrders();
  let found = list.filter(function (o) { return o.id === id; })[0];
  return found || null;
}

// رفع ملف التصميم (محليًا: data URL للملفات الصغيرة، وإلا رابط مؤقت)
function readAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    let reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function () { reject(reader.error); };
    reader.readAsDataURL(file);
  });
}

async function uploadArtwork(file) {
  let url;
  if (file.size <= 1024 * 1024) {
    url = await readAsDataUrl(file);
  } else {
    url = URL.createObjectURL(file); // يختفي بعد إعادة تحميل الصفحة
  }
  console.log("Artwork prepared:", file.name);
  return { name: file.name, url: url, type: file.type || "" };
}

// إرسال طلب جديد. الناتج: { ok:true, order } أو { ok:false, issues }
async function submitOrder(draft) {
  let service = await getService(draft.serviceId);
  let result = checkReadiness(draft, service);
  if (!result.ready) {
    console.log("Submit blocked:", result.errorCount, "errors");
    return { ok: false, issues: result.issues };
  }

  let id = await nextOrderId();
  let qty = Number(draft.quantity);
  let now = nowIso();

  let order = {
    id: id,
    status: "received",
    serviceId: draft.serviceId,
    quantity: qty,
    description: draft.description,
    customer: {
      name: draft.customer.name,
      phone: normalizePhone(draft.customer.phone),
      email: draft.customer.email || null
    },
    requestedDate: draft.requestedDate,
    pickup: draft.pickup,
    designHelp: !!draft.designHelp,
    artwork: draft.artwork || [],
    specs: draft.specs || {},
    estimatedTotal: service.priceMode === "from" ? service.priceFrom * qty : null,
    ownerNote: null,
    rejectionReason: null,
    createdAt: now,
    log: [{ at: now, status: "received", text: "تم استلام طلبك" }]
  };

  saveLocalOrder(order);
  console.log("Order submitted:", id);
  return { ok: true, order: clone(order) };
}

// تتبع الطلب برقم الطلب + الهاتف. بيرجع الطلب أو null (من غير ما نكشف أي الاتنين غلط)
async function trackOrder(number, phone) {
  let id = toWesternDigits(number).toUpperCase().trim();
  if (/^\d+$/.test(id)) id = "YS-" + id;

  let order = await getOrder(id);
  if (!order) return null;
  if (normalizePhone(order.customer.phone) !== normalizePhone(phone)) return null;
  return order;
}

// إعادة إرسال طلب مرفوض بعد التعديل. changes: حقول معدّلة (specs و customer بيندمجوا)
async function resubmitOrder(id, changes) {
  let order = await getOrder(id);
  if (!order) return { ok: false, error: "not-found" };
  if (order.status !== "rejected") return { ok: false, error: "not-rejected" };

  changes = changes || {};
  Object.keys(changes).forEach(function (key) {
    if (key === "specs" || key === "customer") {
      order[key] = Object.assign({}, order[key], changes[key]);
    } else {
      order[key] = changes[key];
    }
  });

  let service = await getService(order.serviceId);
  let result = checkReadiness(order, service);
  if (!result.ready) return { ok: false, issues: result.issues };

  order.status = "received";
  order.rejectionReason = null;
  order.ownerNote = null;
  order.log.push({ at: nowIso(), status: "received", text: "أُعيد إرسال الطلب بعد التعديل" });
  saveLocalOrder(order);
  console.log("Order resubmitted:", id);
  return { ok: true, order: clone(order) };
}

// ---------- الأدمن ----------

async function applyStatus(id, status, text, extra) {
  let order = await getOrder(id);
  if (!order) return { ok: false, error: "not-found" };
  order.status = status;
  Object.assign(order, extra || {});
  order.log.push({ at: nowIso(), status: status, text: text });
  saveLocalOrder(order);
  console.log("Status updated:", id, "->", status);
  return { ok: true, order: clone(order) };
}

async function updateOrderStatus(id, status, note) {
  if (STATUSES.indexOf(status) === -1) return { ok: false, error: "invalid-status" };
  let extra = hasValue(note) ? { ownerNote: note } : {};
  return applyStatus(id, status, "تم تحديث الحالة: " + STATUS_LABELS[status], extra);
}

async function approveOrder(id, note) {
  return applyStatus(id, "approved", "تمت الموافقة على الطلب", {
    ownerNote: hasValue(note) ? note : "تمت الموافقة على الطلب.",
    rejectionReason: null
  });
}

async function rejectOrder(id, reason) {
  if (!hasValue(reason)) return { ok: false, error: "reason-required" };
  return applyStatus(id, "rejected", "تم رفض الطلب", {
    rejectionReason: reason,
    ownerNote: reason
  });
}

// ---------- إدارة المحتوى (الأوفلاين) ----------

async function uploadContentImage(file, folder) {
  return { path: "local/" + file.name, url: URL.createObjectURL(file), name: file.name };
}

async function adminSaveService(service) {
  let data = await loadData();
  let idx = data.services.findIndex(function (s) { return s.id === service.id; });
  if (idx !== -1) {
    data.services[idx] = Object.assign({}, data.services[idx], service);
  } else {
    data.services.push(service);
  }
  return service;
}

async function adminDeleteService(id) {
  let data = await loadData();
  data.services = data.services.filter(function (s) { return s.id !== id; });
  return true;
}

async function adminToggleServiceActive(id, active) {
  let data = await loadData();
  let found = data.services.find(function (s) { return s.id === id; });
  if (found) found.active = !!active;
  return found;
}

async function adminSaveCategory(category) {
  let data = await loadData();
  let idx = data.categories.findIndex(function (c) { return c.id === category.id; });
  if (idx !== -1) {
    data.categories[idx] = Object.assign({}, data.categories[idx], category);
  } else {
    data.categories.push(category);
  }
  return category;
}

async function adminDeleteCategory(id) {
  let data = await loadData();
  data.categories = data.categories.filter(function (c) { return c.id !== id; });
  return true;
}

async function adminSaveOption(key, value) {
  let data = await loadData();
  data.options[key] = value;
  return true;
}

async function adminSavePortfolio(item) {
  let data = await loadData();
  let idx = data.portfolio.findIndex(function (p) { return p.id === item.id; });
  if (idx !== -1) {
    data.portfolio[idx] = Object.assign({}, data.portfolio[idx], item);
  } else {
    data.portfolio.push(item);
  }
  return item;
}

async function adminDeletePortfolio(id) {
  let data = await loadData();
  data.portfolio = data.portfolio.filter(function (p) { return p.id !== id; });
  return true;
}