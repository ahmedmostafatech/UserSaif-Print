// page-admin.js — لوحة الإدارة: دخول، قائمة الطلبات، تفاصيل الطلب، موافقة/رفض/تحديث الحالة
// ترتيب التحميل: supabase-js ← config.js ← schema.js ← readiness.js ← api.js ← page-admin.js
// الحماية الحقيقية في الداتا بيز (RLS ودوال RPC)، وهذه الصفحة مجرد واجهة

(function () {
  let DATE_LOCALE = "ar-EG-u-nu-latn";
  let ZOOM_MIN = 0.5;
  let ZOOM_MAX = 4;
  let ZOOM_STEP = 0.25;

  // ترتيب الأولوية: الأحوج لقرار أولًا
  let PRIORITY = { received: 0, review: 1, approved: 2, in_progress: 3, ready: 4, rejected: 5 };

  // رسائل الأخطاء بالعربي (أول تطابق يكسب)
  let ERROR_MESSAGES = [
    ["not-authorized", "انتهت الجلسة أو لا توجد صلاحية. سجّل الدخول مرة أخرى."],
    ["not-admin", "هذا الحساب لا يملك صلاحية الإدارة."],
    ["Invalid login credentials", "البريد الإلكتروني أو كلمة المرور غير صحيحة."],
    ["Email not confirmed", "البريد الإلكتروني لم يتم تأكيده بعد."],
    ["reason-required", "اكتب سبب الرفض."],
    ["not-found", "الطلب غير موجود."],
    ["invalid-status", "الحالة غير صحيحة."]
  ];

  // حالة الصفحة
  let state = {
    orders: [],
    services: [],
    options: null,
    filter: "all",
    query: "",
    sort: "newest",
    order: null,     // الطلب المفتوح حاليًا
    openId: null,    // رقم الطلب المطلوب فتحه (لتجاهل الردود المتأخرة)
    artwork: [],     // ملفات الطلب المفتوح مع روابطها
    zoom: 1
  };

  // ---------- أدوات صغيرة ----------

  function $(id) {
    return document.getElementById(id);
  }

  // تأمين أي نص قبل وضعه في HTML (الأسماء والأوصاف وأسماء الملفات من مستخدمين)
  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function numHtml(value) {
    return '<span class="num">' + esc(value) + "</span>";
  }

  function formatDate(value) {
    if (!value) return "";
    let text = String(value);
    let date = new Date(text.length === 10 ? text + "T00:00:00" : text);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString(DATE_LOCALE, { day: "numeric", month: "long", year: "numeric" });
  }

  function formatDateTime(value) {
    if (!value) return "";
    let date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString(DATE_LOCALE, {
      day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit"
    });
  }

  function formatMoney(value) {
    return Number(value).toLocaleString("en-US");
  }

  function nameOf(list, id) {
    if (!list) return id;
    let found = list.filter(function (item) { return item.id === id; })[0];
    return found ? found.name : id;
  }

  function friendlyError(raw) {
    let text = String(raw || "");
    for (let i = 0; i < ERROR_MESSAGES.length; i++) {
      if (text.indexOf(ERROR_MESSAGES[i][0]) !== -1) return ERROR_MESSAGES[i][1];
    }
    if (/fetch|network|failed to/i.test(text)) {
      return "تعذر الاتصال بالخدمة. تأكد من الإنترنت وحاول مرة أخرى.";
    }
    return "حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.";
  }

  function isAuthError(raw) {
    return /not-authorized|jwt|expired/i.test(String(raw || ""));
  }

  function showToast(text, type) {
    let box = $("toasts");
    let el = document.createElement("div");
    let isError = type === "error";
    el.className = "toast " + (isError ? "toast--error" : "toast--success");
    el.textContent = (isError ? "✕ " : "✓ ") + text;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 4000);
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.classList.toggle("is-loading", loading);
    btn.disabled = loading;
    btn.setAttribute("aria-busy", String(loading));
  }

  // ---------- أدوات البيانات ----------

  function serviceById(id) {
    return state.services.filter(function (s) { return s.id === id; })[0] || null;
  }

  function serviceName(id) {
    let service = serviceById(id);
    return service ? service.name : id;
  }

  // فحص جاهزية الطلب بنفس مساعد العميل (يكشف النواقص والتعارضات)
  function readinessOf(order) {
    let service = serviceById(order.serviceId);
    if (!service) return { ready: true, errorCount: 0, issues: [] };
    return checkReadiness(order, service);
  }

  function countStatus(status) {
    return state.orders.filter(function (o) { return o.status === status; }).length;
  }

  function needDecisionCount() {
    return countStatus("received") + countStatus("review");
  }

  function updateNavCount() {
    $("nav-count").textContent = String(needDecisionCount());
  }

  async function loadAll() {
    let loaded = await Promise.all([
      getOrders(),
      getServices({ includeInactive: true }),
      getOptions()
    ]);
    state.orders = loaded[0];
    state.services = loaded[1];
    state.options = loaded[2];
    updateNavCount();
    console.log("Admin data loaded:", state.orders.length, "orders");
  }

  // ---------- الدخول والخروج ----------

  function showLogin(message) {
    $("app-view").hidden = true;
    $("login-view").hidden = false;
    let box = $("login-alert");
    if (message) {
      box.textContent = message;
      box.hidden = false;
    } else {
      box.hidden = true;
    }
    $("login-email").focus();
  }

  async function handleLogin(event) {
    event.preventDefault();
    $("login-alert").hidden = true;

    let email = $("login-email").value.trim();
    let password = $("login-password").value;
    if (!email || !password) {
      showLogin("اكتب البريد الإلكتروني وكلمة المرور.");
      return;
    }

    let btn = $("login-btn");
    setLoading(btn, true);
    try {
      let res = await adminLogin(email, password);
      if (!res.ok) {
        showLogin(friendlyError(res.error));
        return;
      }
      $("login-password").value = "";
      await enterApp();
    } catch (err) {
      console.log("Login failed:", err.message);
      showLogin(friendlyError(err.message));
    } finally {
      setLoading(btn, false);
    }
  }

  async function handleLogout() {
    try {
      await adminLogout();
    } catch (err) {
      console.log("Logout failed:", err.message);
    }
    state.orders = [];
    state.order = null;
    state.openId = null;
    location.hash = "";
    showLogin("");
    console.log("Admin logged out");
  }

  async function enterApp() {
    $("login-view").hidden = true;
    $("app-view").hidden = false;
    $("orders-body").innerHTML = skeletonHtml();
    try {
      await loadAll();
    } catch (err) {
      console.log("Load failed:", err.message);
      if (isAuthError(err.message)) {
        showLogin("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        return;
      }
      $("orders-body").innerHTML = emptyHtml(
        "تعذر تحميل الطلبات",
        friendlyError(err.message),
        '<button class="btn btn--primary" type="button" data-act="retry">إعادة المحاولة</button>'
      );
      return;
    }
    await renderRoute();
  }

  // أي خطأ غير متوقع: لو الجلسة انتهت نرجع للدخول، وإلا نعرض رسالة
  function handleError(err) {
    console.log("Admin error:", err.message);
    if (isAuthError(err.message)) {
      showLogin("انتهت الجلسة. سجّل الدخول مرة أخرى.");
      return;
    }
    showToast(friendlyError(err.message), "error");
  }

  // ---------- التنقل (hash routing) ----------

  function parseRoute() {
    let match = (location.hash || "").match(/^#\/orders\/(.+)$/);
    if (match) return { view: "detail", id: decodeURIComponent(match[1]) };
    return { view: "list" };
  }

  async function renderRoute() {
    let route = parseRoute();
    if (route.view === "detail") {
      await showDetail(route.id);
    } else {
      showList();
    }
  }

  // ---------- قائمة الطلبات ----------

  function skeletonHtml() {
    let rows = "";
    for (let i = 0; i < 6; i++) rows += '<div class="skeleton admin-skel"></div>';
    return rows;
  }

  function emptyHtml(title, text, actionHtml) {
    return '<div class="empty card"><h3 class="h4">' + esc(title) + "</h3><p>" + esc(text) + "</p>" + (actionHtml || "") + "</div>";
  }

  function visibleOrders() {
    let q = toWesternDigits(state.query).toLowerCase().trim();
    let list = state.orders.filter(function (o) {
      if (state.filter !== "all" && o.status !== state.filter) return false;
      if (!q) return true;
      let hay = (o.id + " " + o.customer.name + " " + o.customer.phone).toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    list.sort(function (a, b) {
      let timeA = new Date(a.createdAt).getTime();
      let timeB = new Date(b.createdAt).getTime();
      if (state.sort === "oldest") return timeA - timeB;
      if (state.sort === "quantity") return b.quantity - a.quantity;
      if (state.sort === "priority") {
        let diff = PRIORITY[a.status] - PRIORITY[b.status];
        return diff !== 0 ? diff : timeB - timeA;
      }
      return timeB - timeA;
    });
    return list;
  }

  function renderStats() {
    let cards = [
      { label: "إجمالي الطلبات", value: state.orders.length, cls: "" },
      { label: "تحتاج قرارًا", value: needDecisionCount(), cls: " stat--alert" },
      { label: "قيد التنفيذ", value: countStatus("in_progress"), cls: "" },
      { label: "جاهزة للاستلام", value: countStatus("ready"), cls: " stat--ok" },
      { label: "مرفوضة", value: countStatus("rejected"), cls: " stat--bad" }
    ];
    $("stats").innerHTML = cards.map(function (c) {
      return '<div class="card stat' + c.cls + '"><span class="stat__label">' + esc(c.label) +
        '</span><span class="stat__value num">' + c.value + "</span></div>";
    }).join("");
  }

  function renderChips() {
    let items = [{ key: "all", label: "الكل", count: state.orders.length }];
    STATUSES.forEach(function (st) {
      items.push({ key: st, label: STATUS_LABELS[st], count: countStatus(st) });
    });
    $("chips").innerHTML = items.map(function (item) {
      return '<button class="chip" type="button" data-filter="' + item.key + '" aria-pressed="' + (state.filter === item.key) + '">' +
        esc(item.label) + ' <span class="num">' + item.count + "</span></button>";
    }).join("");
  }

  function orderRowHtml(order) {
    let flags = readinessOf(order);
    let flagBadge = flags.errorCount > 0 ? ' <span class="badge badge--review">⚠ بيانات ناقصة</span>' : "";
    let hasTotal = order.estimatedTotal !== null && order.estimatedTotal !== undefined;
    let total = hasTotal ? numHtml(formatMoney(order.estimatedTotal)) + " ج.م" : "حسب الطلب";
    let link = "#/orders/" + encodeURIComponent(order.id);

    return "<tr>" +
      '<td data-label="رقم الطلب"><div class="cell"><a class="admin-id" href="' + link + '">' + numHtml(order.id) + "</a>" +
      '<span class="cell-sub">' + esc(formatDate(order.createdAt)) + "</span></div></td>" +
      '<td data-label="العميل"><div class="cell"><strong>' + esc(order.customer.name) + "</strong>" +
      '<span class="cell-sub">' + numHtml(order.customer.phone) + "</span></div></td>" +
      '<td data-label="الخدمة">' + esc(serviceName(order.serviceId)) + "</td>" +
      '<td data-label="الكمية">' + numHtml(order.quantity) + "</td>" +
      '<td data-label="الإجمالي التقديري">' + total + "</td>" +
      '<td data-label="الحالة"><div class="cell"><span class="badge ' + STATUS_BADGE[order.status] + '">' +
      esc(STATUS_LABELS[order.status]) + "</span>" + flagBadge + "</div></td>" +
      '<td data-label=""><a class="btn btn--secondary btn--sm" href="' + link + '">فتح الطلب</a></td>' +
      "</tr>";
  }

  function renderOrders() {
    renderStats();
    renderChips();
    let list = visibleOrders();
    $("count-text").textContent = "عرض " + list.length + " من " + state.orders.length + " طلب";

    let body = $("orders-body");
    if (list.length === 0) {
      if (state.orders.length === 0) {
        body.innerHTML = emptyHtml("لا توجد طلبات بعد", "ستظهر هنا الطلبات الجديدة فور وصولها.", "");
      } else {
        body.innerHTML = emptyHtml(
          "لا توجد طلبات مطابقة",
          "جرّب تغيير كلمات البحث أو الحالة المختارة.",
          '<button class="btn btn--secondary" type="button" data-act="reset-filters">إعادة ضبط البحث والتصفية</button>'
        );
      }
      return;
    }

    body.innerHTML =
      '<div class="table-wrap"><table class="table admin-table"><thead><tr>' +
      "<th>رقم الطلب</th><th>العميل</th><th>الخدمة</th><th>الكمية</th>" +
      "<th>الإجمالي التقديري (تجريبي)</th><th>الحالة</th><th><span class=\"sr-only\">إجراء</span></th>" +
      "</tr></thead><tbody>" + list.map(orderRowHtml).join("") + "</tbody></table></div>";
  }

  function showList() {
    state.order = null;
    state.openId = null;
    $("detail-view").hidden = true;
    $("orders-view").hidden = false;
    document.title = "لوحة الإدارة | يوزرسيف";
    renderOrders();
  }

  async function refreshOrders(btn) {
    setLoading(btn, true);
    try {
      await loadAll();
      renderOrders();
      showToast("تم تحديث القائمة");
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(btn, false);
    }
  }

  function onSearch(event) {
    state.query = event.target.value;
    if (parseRoute().view !== "list") {
      location.hash = "#/orders";
      return;
    }
    renderOrders();
  }

  function onChipClick(event) {
    let btn = event.target.closest("[data-filter]");
    if (!btn) return;
    state.filter = btn.getAttribute("data-filter");
    renderOrders();
  }

  async function onOrdersBodyClick(event) {
    let btn = event.target.closest("[data-act]");
    if (!btn) return;
    let act = btn.getAttribute("data-act");
    if (act === "reset-filters") {
      state.filter = "all";
      state.query = "";
      $("admin-search").value = "";
      renderOrders();
    } else if (act === "retry") {
      await enterApp();
    }
  }

  // ---------- تفاصيل الطلب ----------

  async function resolveArtwork(order) {
    let list = order.artwork || [];
    let out = [];
    for (let i = 0; i < list.length; i++) {
      let url = "";
      try {
        url = await getArtworkUrl(list[i]);
      } catch (err) {
        console.log("Artwork url failed:", err.message);
      }
      out.push({ name: list[i].name || "ملف", type: list[i].type || "", url: url });
    }
    return out;
  }

  function buildDetailRows(order) {
    let specs = order.specs || {};
    let opts = state.options || {};
    let rows = [];

    rows.push(["الخدمة", esc(serviceName(order.serviceId))]);
    rows.push(["الكمية", numHtml(order.quantity)]);

    if (specs.color) rows.push(["اللون", esc(nameOf(opts.colors, specs.color))]);

    if (specs.sizes) {
      let parts = Object.keys(specs.sizes)
        .filter(function (key) { return Number(specs.sizes[key]) > 0; })
        .map(function (key) { return numHtml(key + ": " + specs.sizes[key]); });
      if (parts.length > 0) rows.push(["المقاسات", parts.join(" · ")]);
      rows.push(["مجموع المقاسات", numHtml(sumSizes(specs.sizes)) + " من " + numHtml(order.quantity)]);
    }

    if (specs.placements && specs.placements.length > 0) {
      let names = specs.placements.map(function (id) { return nameOf(opts.placements, id); });
      rows.push(["مكان الطباعة", esc(names.join("، "))]);
    }

    if (specs.customText) rows.push(["نص التخصيص", esc(specs.customText)]);
    if (specs.phoneModel) rows.push(["طراز الموبايل", numHtml(specs.phoneModel)]);
    if (specs.width && specs.height) {
      rows.push(["الأبعاد", numHtml(specs.width + " × " + specs.height) + " " + esc(nameOf(opts.units, specs.unit))]);
    }
    if (specs.shape) rows.push(["الشكل", esc(nameOf(opts.shapes, specs.shape))]);
    if (specs.use) rows.push(["الاستخدام", esc(nameOf(opts.uses, specs.use))]);

    if (order.pickup) rows.push(["الاستلام", esc(nameOf(opts.pickup, order.pickup))]);
    if (order.requestedDate) rows.push(["التاريخ المطلوب (مفضّل)", esc(formatDate(order.requestedDate))]);
    if (order.designHelp) rows.push(["التصميم", "طلب مساعدة في التصميم"]);

    if (order.estimatedTotal !== null && order.estimatedTotal !== undefined) {
      rows.push(["الإجمالي التقديري", numHtml(formatMoney(order.estimatedTotal)) + " ج.م " + '<span class="tag-sample">تجريبي</span>']);
    } else {
      rows.push(["السعر", "حسب الطلب"]);
    }
    return rows;
  }

  function artworkHtml(order) {
    let items = state.artwork;
    let help = order.designHelp ? '<div><span class="badge badge--review">طلب مساعدة في التصميم</span></div>' : "";

    if (items.length === 0) {
      return '<p class="muted">لم يرفع العميل ملفات تصميم.</p>' + help;
    }

    let cards = items.map(function (item, i) {
      let isPdf = item.type === "application/pdf" || /\.pdf$/i.test(item.name);
      let media;
      if (!item.url) {
        media = '<span class="art__missing">تعذر الحصول على رابط الملف</span>';
      } else if (isPdf) {
        media = '<span class="art__pdf">PDF</span>';
      } else {
        media = '<img data-art src="' + esc(item.url) + '" alt="' + esc("ملف التصميم: " + item.name) + '" loading="lazy">';
      }

      let actions = "";
      if (item.url) {
        if (!isPdf) {
          actions += '<button class="btn btn--secondary btn--sm" type="button" data-act="zoom" data-index="' + i + '">تكبير</button>';
        }
        actions += '<a class="btn btn--ghost btn--sm" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">فتح / تنزيل</a>';
      }

      return '<figure class="art"><div class="art__media">' + media + "</div>" +
        '<figcaption><span class="art__name">' + esc(item.name) + '</span><div class="row">' + actions + "</div></figcaption></figure>";
    }).join("");

    return '<div class="art-grid">' + cards + "</div>" + help;
  }

  async function renderDetail(order) {
    state.artwork = await resolveArtwork(order);
    if (state.openId !== order.id) return; // المستخدم انتقل لصفحة أخرى أثناء التحميل

    let status = order.status;
    let canDecide = status === "received" || status === "review";
    let disabledAttr = canDecide ? "" : " disabled";
    let flags = readinessOf(order);
    let errors = flags.issues.filter(function (i) { return i.severity === "error"; });
    let flagBadge = errors.length > 0 ? ' <span class="badge badge--review">⚠ بيانات ناقصة</span>' : "";

    // الملاحظة أو سبب الرفض الظاهر للعميل حاليًا
    let currentNote = "";
    if (status === "rejected" && order.rejectionReason) {
      currentNote = '<div class="preview-rejection"><strong>سبب الرفض الظاهر للعميل</strong><p>' + esc(order.rejectionReason) + "</p></div>";
    } else if (order.ownerNote) {
      currentNote = '<div class="current-note"><span class="eyebrow">الملاحظة الحالية للعميل</span><p>' + esc(order.ownerNote) + "</p></div>";
    }

    let statusOptions = STATUSES.map(function (s) {
      return '<option value="' + s + '"' + (s === status ? " selected" : "") + ">" + esc(STATUS_LABELS[s]) + "</option>";
    }).join("");

    let logItems = (order.log || []).slice().reverse().map(function (entry) {
      return '<li><time datetime="' + esc(entry.at) + '">' + esc(formatDateTime(entry.at)) + "</time><span>" + esc(entry.text) + "</span></li>";
    }).join("");

    let detailRows = buildDetailRows(order).map(function (row) {
      return "<div><dt>" + esc(row[0]) + "</dt><dd>" + row[1] + "</dd></div>";
    }).join("");

    let flagsHtml;
    if (errors.length === 0) {
      flagsHtml = '<ul class="readiness__list"><li class="readiness__item is-ok">بيانات الطلب مكتملة ✓</li></ul>';
    } else {
      flagsHtml = '<ul class="readiness__list">' + errors.map(function (issue) {
        return '<li class="readiness__item is-bad">⚠ ' + esc(issue.message) + "</li>";
      }).join("") + "</ul>";
    }

    let phoneDigits = String(order.customer.phone || "").replace(/\D/g, "");
    let waText = "مرحبًا " + order.customer.name + "، بخصوص طلبك " + order.id + " في يوزرسيف";
    let waUrl = "https://wa.me/2" + phoneDigits + "?text=" + encodeURIComponent(waText);

    let html =
      '<div class="detail-top"><a class="btn btn--ghost btn--sm" href="#/orders">→ العودة للطلبات</a></div>' +

      '<section class="card card--dark grain detail-banner">' +
      "<div>" +
      '<p class="detail-banner__label">رقم الطلب</p>' +
      '<p class="detail-banner__id">' + numHtml(order.id) + "</p>" +
      '<div class="row"><span class="badge ' + STATUS_BADGE[status] + '">' + esc(STATUS_LABELS[status]) + "</span>" + flagBadge + "</div>" +
      "</div>" +
      '<div class="detail-banner__meta">' +
      '<p class="detail-banner__service">' + esc(serviceName(order.serviceId)) + " · " + numHtml(order.quantity) + "</p>" +
      '<p class="caption" style="color:inherit">تاريخ الإرسال: ' + esc(formatDateTime(order.createdAt)) + "</p>" +
      "</div></section>" +

      '<div class="detail-grid">' +

      '<div class="detail-col">' +

      '<section class="card detail-card" aria-label="القرار والحالة">' +
      '<h2 class="h4">القرار والحالة</h2>' +
      '<div class="decision">' +
      '<button class="btn btn--primary btn--lg" type="button" data-act="approve"' + disabledAttr + ">موافقة</button>" +
      '<button class="btn btn--danger btn--lg" type="button" data-act="reject"' + disabledAttr + ">رفض</button>" +
      "</div>" +
      (canDecide ? "" : '<p class="caption">تم اتخاذ القرار في هذا الطلب. استخدم «حفظ الحالة» للخطوات التالية.</p>') +
      currentNote +
      '<div class="field"><label class="field__label" for="note-input">ملاحظة تظهر للعميل (اختياري)</label>' +
      '<textarea class="textarea" id="note-input" maxlength="500"></textarea>' +
      '<span class="field__hint">تظهر في صفحة تتبع الطلب. عند الرفض يُستخدم سبب الرفض بدلًا منها.</span></div>' +
      '<div class="status-row"><div class="field"><label class="field__label" for="status-select">تحديث الحالة</label>' +
      '<select class="select" id="status-select">' + statusOptions + "</select></div>" +
      '<button class="btn btn--secondary" type="button" data-act="status">حفظ الحالة</button></div>' +
      "</section>" +

      '<section class="card detail-card" aria-label="الملفات المرفقة">' +
      '<h3 class="h4">الملفات المرفقة</h3>' + artworkHtml(order) + "</section>" +

      '<section class="card detail-card" aria-label="سجل الطلب">' +
      '<h3 class="h4">سجل الطلب</h3><ol class="log">' + logItems + "</ol></section>" +

      "</div>" +

      '<aside class="detail-col">' +

      '<section class="card detail-card" aria-label="العميل">' +
      '<h3 class="h4">العميل</h3><dl class="detail-list">' +
      "<div><dt>الاسم</dt><dd>" + esc(order.customer.name) + "</dd></div>" +
      "<div><dt>الهاتف</dt><dd>" + numHtml(order.customer.phone) + "</dd></div>" +
      "<div><dt>البريد</dt><dd>" + (order.customer.email ? '<span class="num">' + esc(order.customer.email) + "</span>" : "—") + "</dd></div>" +
      "</dl>" +
      '<a class="btn btn--secondary btn--block" href="' + esc(waUrl) + '" target="_blank" rel="noopener noreferrer">راسل العميل على واتساب</a>' +
      "</section>" +

      '<section class="card detail-card" aria-label="تفاصيل الطلب">' +
      '<h3 class="h4">تفاصيل الطلب</h3>' +
      '<div class="desc-box">' + esc(order.description) + "</div>" +
      '<dl class="detail-list">' + detailRows + "</dl>" +
      '<p class="caption">التاريخ المطلوب تاريخ مفضّل وليس وعدًا بالتسليم. السعر النهائي يؤكده صاحب المشروع.</p>' +
      "</section>" +

      '<section class="card detail-card" aria-label="جاهزية الطلب">' +
      '<h3 class="h4">جاهزية الطلب</h3>' + flagsHtml +
      '<p class="caption">فحص اكتمال البيانات لا يضمن ملاءمة التصميم للطباعة.</p>' +
      "</section>" +

      "</aside></div>";

    $("detail-body").innerHTML = html;
    document.title = order.id + " | لوحة الإدارة";
  }

  async function showDetail(id) {
    state.openId = id;
    state.order = null;
    $("orders-view").hidden = true;
    $("detail-view").hidden = false;
    $("detail-body").innerHTML = '<div class="skeleton admin-skel admin-skel--tall"></div><div class="skeleton admin-skel admin-skel--tall"></div>';
    window.scrollTo(0, 0);

    let backLink = '<a class="btn btn--primary" href="#/orders">العودة للطلبات</a>';
    try {
      let order = await getOrder(id);
      if (state.openId !== id) return;
      if (!order) {
        $("detail-body").innerHTML = emptyHtml("الطلب غير موجود", "تأكد من رقم الطلب أو ارجع لقائمة الطلبات.", backLink);
        return;
      }
      state.order = order;
      await renderDetail(order);
      console.log("Order opened:", order.id, order.status);
    } catch (err) {
      handleError(err);
      $("detail-body").innerHTML = emptyHtml("تعذر تحميل الطلب", friendlyError(err.message), backLink);
    }
  }

  // بعد أي تحديث ناجح: نحدّث الطلب في الذاكرة ونعيد رسم الصفحة
  async function afterUpdate(order, message) {
    state.order = order;
    for (let i = 0; i < state.orders.length; i++) {
      if (state.orders[i].id === order.id) state.orders[i] = order;
    }
    updateNavCount();
    showToast(message);
    await renderDetail(order);
  }

  // ---------- إجراءات الطلب ----------

  async function doApprove(btn) {
    let order = state.order;
    let note = $("note-input").value.trim();
    setLoading(btn, true);
    try {
      let res = await approveOrder(order.id, note);
      if (!res.ok) {
        showToast(friendlyError(res.error), "error");
        return;
      }
      await afterUpdate(res.order, "تمت الموافقة على الطلب " + res.order.id);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(btn, false);
    }
  }

  async function doStatus(btn) {
    let order = state.order;
    let status = $("status-select").value;
    let note = $("note-input").value.trim();

    if (status === order.status) {
      showToast("هذه هي الحالة الحالية للطلب.", "error");
      return;
    }
    if (status === "rejected") {
      openReject(); // الرفض يحتاج سببًا يظهر للعميل
      return;
    }

    setLoading(btn, true);
    try {
      let res = status === "approved"
        ? await approveOrder(order.id, note)
        : await updateOrderStatus(order.id, status, note);
      if (!res.ok) {
        showToast(friendlyError(res.error), "error");
        return;
      }
      await afterUpdate(res.order, "تم تحديث الحالة إلى: " + STATUS_LABELS[status]);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(btn, false);
    }
  }

  async function onDetailClick(event) {
    let btn = event.target.closest("[data-act]");
    if (!btn || !state.order) return;
    let act = btn.getAttribute("data-act");
    if (act === "approve") {
      await doApprove(btn);
    } else if (act === "reject") {
      openReject();
    } else if (act === "status") {
      await doStatus(btn);
    } else if (act === "zoom") {
      openZoom(Number(btn.getAttribute("data-index")));
    }
  }

  // لو الصورة ما اتحملتش (مثلًا ملفات العينات التجريبية) نعرض رسالة بدل الأيقونة المكسورة
  function onImageError(event) {
    let img = event.target;
    if (img && img.tagName === "IMG" && img.hasAttribute("data-art")) {
      let holder = document.createElement("span");
      holder.className = "art__missing";
      holder.textContent = "تعذر عرض الملف (قد يكون ملفًا تجريبيًا)";
      img.replaceWith(holder);
    }
  }

  // ---------- نافذة الرفض ----------

  function updateRejectPreview() {
    let text = $("reject-reason").value.trim();
    $("reject-preview-text").textContent = text || "سيظهر هنا السبب الذي تكتبه.";
  }

  function openReject() {
    $("reject-reason").value = "";
    $("reject-alert").hidden = true;
    updateRejectPreview();
    $("reject-dialog").showModal();
    $("reject-reason").focus();
  }

  async function handleRejectSubmit(event) {
    event.preventDefault();
    if (!state.order) return;

    let alertBox = $("reject-alert");
    alertBox.hidden = true;
    let reason = $("reject-reason").value.trim();
    if (reason.length < 5) {
      alertBox.textContent = "اكتب سببًا واضحًا للرفض (5 أحرف على الأقل).";
      alertBox.hidden = false;
      return;
    }

    let btn = $("reject-submit");
    setLoading(btn, true);
    try {
      let res = await rejectOrder(state.order.id, reason);
      if (!res.ok) {
        alertBox.textContent = friendlyError(res.error);
        alertBox.hidden = false;
        return;
      }
      $("reject-dialog").close();
      await afterUpdate(res.order, "تم رفض الطلب " + res.order.id);
    } catch (err) {
      alertBox.textContent = friendlyError(err.message);
      alertBox.hidden = false;
    } finally {
      setLoading(btn, false);
    }
  }

  // ---------- عارض الملفات ----------

  function applyZoom() {
    $("zoom-img").style.width = (state.zoom * 100) + "%";
    $("zoom-level").textContent = Math.round(state.zoom * 100) + "%";
  }

  function openZoom(index) {
    let item = state.artwork[index];
    if (!item || !item.url) return;
    state.zoom = 1;
    $("zoom-title").textContent = item.name;
    $("zoom-img").src = item.url;
    $("zoom-img").alt = "ملف التصميم: " + item.name;
    $("zoom-open").href = item.url;
    applyZoom();
    $("zoom-dialog").showModal();
  }

  function changeZoom(delta) {
    state.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, state.zoom + delta));
    applyZoom();
  }

  // ---------- القائمة الجانبية والحركة ----------

  function setMenu(open) {
    $("admin-side").classList.toggle("is-open", open);
    $("admin-scrim").hidden = !open;
    $("menu-btn").setAttribute("aria-expanded", String(open));
  }

  function setupMotionToggle() {
    let btn = $("motion-toggle");
    let saved = null;
    try { saved = localStorage.getItem("ys-motion"); } catch (e) { /* التخزين غير متاح */ }
    if (saved === "reduced") {
      document.documentElement.setAttribute("data-motion", "reduced");
      btn.setAttribute("aria-pressed", "true");
    }
    btn.addEventListener("click", function () {
      let reduced = document.documentElement.getAttribute("data-motion") === "reduced";
      if (reduced) {
        document.documentElement.removeAttribute("data-motion");
      } else {
        document.documentElement.setAttribute("data-motion", "reduced");
      }
      btn.setAttribute("aria-pressed", String(!reduced));
      try { localStorage.setItem("ys-motion", reduced ? "full" : "reduced"); } catch (e) { /* تجاهل */ }
      console.log("Motion preference:", reduced ? "full" : "reduced");
    });
  }

  // ---------- التشغيل ----------

  function setupStaticListeners() {
    $("login-form").addEventListener("submit", handleLogin);
    $("logout-btn").addEventListener("click", handleLogout);
    $("admin-search").addEventListener("input", onSearch);
    $("sort-select").addEventListener("change", function (event) {
      state.sort = event.target.value;
      renderOrders();
    });
    $("chips").addEventListener("click", onChipClick);
    $("refresh-btn").addEventListener("click", function () { refreshOrders($("refresh-btn")); });
    $("orders-body").addEventListener("click", onOrdersBodyClick);
    $("detail-body").addEventListener("click", onDetailClick);
    $("detail-body").addEventListener("error", onImageError, true); // أحداث error لا تصعد، فنستخدم capture

    $("reject-form").addEventListener("submit", handleRejectSubmit);
    $("reject-reason").addEventListener("input", updateRejectPreview);
    $("reject-cancel").addEventListener("click", function () { $("reject-dialog").close(); });

    $("zoom-in").addEventListener("click", function () { changeZoom(ZOOM_STEP); });
    $("zoom-out").addEventListener("click", function () { changeZoom(-ZOOM_STEP); });
    $("zoom-close").addEventListener("click", function () { $("zoom-dialog").close(); });

    $("menu-btn").addEventListener("click", function () {
      setMenu(!$("admin-side").classList.contains("is-open"));
    });
    $("admin-scrim").addEventListener("click", function () { setMenu(false); });
    $("admin-side").addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });

    window.addEventListener("hashchange", function () {
      if (!$("app-view").hidden) renderRoute();
    });

    setupMotionToggle();
  }

  async function bootstrap() {
    setupStaticListeners();
    let admin = false;
    try {
      admin = await isAdmin();
    } catch (err) {
      console.log("Admin check failed:", err.message);
    }
    if (admin) {
      await enterApp();
    } else {
      showLogin("");
    }
  }

  bootstrap();
})();