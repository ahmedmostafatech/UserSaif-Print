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
    categories: [],
    portfolio: [],
    filter: "all",
    query: "",
    sort: "newest",
    order: null,     // الطلب المفتوح حاليًا
    openId: null,    // رقم الطلب المطلوب فتحه (لتجاهل الردود المتأخرة)
    artwork: [],     // ملفات الطلب المفتوح مع روابطها
    zoom: 1,
    contentTab: "services", // التاب النشط في إدارة المحتوى: services, categories, options, portfolio
    serviceCategoryFilter: "all",
    portfolioCategoryFilter: "all",
    editingService: null,
    editingCategory: null,
    editingPortfolio: null,
    confirmAction: null
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

  function updateContentCounts() {
    let sCount = $("services-count");
    let cCount = $("categories-count");
    let pCount = $("portfolio-count");
    if (sCount) sCount.textContent = String(state.services.length);
    if (cCount) cCount.textContent = String(state.categories.length);
    if (pCount) pCount.textContent = String(state.portfolio.length);
  }

  async function loadAll() {
    let loaded = await Promise.all([
      getOrders(),
      getServices({ includeInactive: true }),
      getOptions(),
      getCategories(),
      getPortfolio()
    ]);
    state.orders = loaded[0];
    state.services = loaded[1];
    state.options = loaded[2];
    state.categories = loaded[3] || [];
    state.portfolio = loaded[4] || [];
    updateNavCount();
    updateContentCounts();
    console.log("Admin data loaded:", state.orders.length, "orders,", state.services.length, "services,", state.categories.length, "categories,", state.portfolio.length, "portfolio items");
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
    let hash = location.hash || "";
    let matchDetail = hash.match(/^#\/orders\/(.+)$/);
    if (matchDetail) return { view: "detail", id: decodeURIComponent(matchDetail[1]) };
    let matchContent = hash.match(/^#\/content(?:\/([a-z]+))?$/);
    if (matchContent) return { view: "content", tab: matchContent[1] || "services" };
    return { view: "list" };
  }

  function updateActiveNav(view) {
    let isOrders = view === "list" || view === "detail";
    let linkOrders = $("nav-link-orders");
    let linkContent = $("nav-link-content");
    if (linkOrders) {
      if (isOrders) linkOrders.setAttribute("aria-current", "page");
      else linkOrders.removeAttribute("aria-current");
    }
    if (linkContent) {
      if (!isOrders) linkContent.setAttribute("aria-current", "page");
      else linkContent.removeAttribute("aria-current");
    }
  }

  async function renderRoute() {
    let route = parseRoute();
    updateActiveNav(route.view);
    if (route.view === "detail") {
      await showDetail(route.id);
    } else if (route.view === "content") {
      showContent(route.tab);
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
    $("content-view").hidden = true;
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
    $("content-view").hidden = true;
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

  // ============================================================
  // إدارة المحتوى (4 تابات: الخدمات، التصنيفات، الخيارات، المعرض)
  // ============================================================

  let FORM_TYPES = {
    apparel: "ملابس (apparel)",
    gift: "هدايا ومجات (gift)",
    sticker: "ستيكرات وليبلز (sticker)",
    custom: "تصميم مخصص (custom)"
  };

  function getCatName(id) {
    let c = state.categories.find(function (cat) { return cat.id === id; });
    return c ? c.name : id;
  }

  function getServiceName(id) {
    let s = state.services.find(function (svc) { return svc.id === id; });
    return s ? s.name : id;
  }

  function showContent(tab) {
    state.order = null;
    state.openId = null;
    $("orders-view").hidden = true;
    $("detail-view").hidden = true;
    $("content-view").hidden = false;
    document.title = "إدارة المحتوى | لوحة الإدارة";
    switchContentTab(tab || state.contentTab || "services");
  }

  function switchContentTab(tab) {
    let tabs = ["services", "categories", "options", "portfolio"];
    if (tabs.indexOf(tab) === -1) tab = "services";
    state.contentTab = tab;

    tabs.forEach(function (t) {
      let btn = $("tab-btn-" + t);
      let panel = $("panel-" + t);
      let active = (t === tab);
      if (btn) btn.setAttribute("aria-selected", String(active));
      if (panel) panel.hidden = !active;
    });

    updateContentCounts();

    if (tab === "services") renderServicesTab();
    else if (tab === "categories") renderCategoriesTab();
    else if (tab === "options") renderOptionsTab();
    else if (tab === "portfolio") renderPortfolioTab();

    if (location.hash !== "#/content/" + tab && location.hash !== "#/content") {
      history.replaceState(null, "", "#/content/" + tab);
    }
  }

  // ---------- 1. تاب الخدمات ----------

  function renderServicesTab() {
    renderServiceCatChips();
    let body = $("services-body");
    let filter = state.serviceCategoryFilter;
    let list = state.services.filter(function (s) {
      return filter === "all" || s.category === filter;
    });

    if (list.length === 0) {
      body.innerHTML = emptyHtml(
        "لا توجد خدمات في هذا التصنيف",
        "أضف خدمة جديدة أو اختر تصنيفًا آخر من الفلاتر بالأعلى.",
        '<button class="btn btn--primary" type="button" data-act="open-add-service">+ إضافة خدمة جديدة</button>'
      );
      return;
    }

    let rowsHtml = list.map(function (s) {
      let imgHtml = s.image
        ? '<img class="admin-thumb" src="' + esc(s.image) + '" alt="' + esc(s.name) + '" loading="lazy">'
        : '<div class="admin-thumb admin-thumb--missing">صورة تجريبية</div>';

      let priceText = s.priceMode === "from"
        ? 'ابتداءً من ' + numHtml(formatMoney(s.priceFrom || 0)) + ' ج.م'
        : 'حسب المعاينة والطلب';

      let formTypeLabel = FORM_TYPES[s.formType] || s.formType;

      let statusBadge = s.active
        ? '<button class="badge badge--active" type="button" data-act="toggle-svc-active" data-id="' + esc(s.id) + '" data-active="true" title="اضغط للتعطيل">مفعلة ✓</button>'
        : '<button class="badge badge--inactive" type="button" data-act="toggle-svc-active" data-id="' + esc(s.id) + '" data-active="false" title="اضغط للتفعيل">معطلة ✗</button>';

      return '<tr>' +
        '<td data-label="الصورة">' + imgHtml + '</td>' +
        '<td data-label="الخدمة">' +
          '<div class="cell">' +
            '<strong>' + esc(s.name) + '</strong> <span class="tag-sample">تجريبي</span>' +
            '<span class="cell-sub"><span class="num">' + esc(s.id) + '</span></span>' +
          '</div>' +
        '</td>' +
        '<td data-label="التصنيف">' + esc(getCatName(s.category)) + '</td>' +
        '<td data-label="نوع النموذج"><span class="badge">' + esc(formTypeLabel) + '</span></td>' +
        '<td data-label="السعر">' + priceText + '</td>' +
        '<td data-label="الحالة">' + statusBadge + '</td>' +
        '<td data-label="إجراءات">' +
          '<div class="table-actions">' +
            '<button class="btn btn--secondary btn--sm" type="button" data-act="edit-svc" data-id="' + esc(s.id) + '">تعديل</button>' +
            '<button class="btn btn--ghost btn--sm" type="button" data-act="delete-svc" data-id="' + esc(s.id) + '" style="color:var(--error);">حذف</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join("");

    body.innerHTML = '<div class="table-wrap"><table class="table admin-table">' +
      '<thead><tr>' +
        '<th>الصورة</th><th>الخدمة</th><th>التصنيف</th><th>نوع النموذج</th><th>السعر</th><th>الحالة</th><th><span class="sr-only">إجراءات</span></th>' +
      '</tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
      '</table></div>';
  }

  function renderServiceCatChips() {
    let container = $("service-cat-chips");
    if (!container) return;
    let chips = [{ id: "all", name: "الكل (" + state.services.length + ")" }];
    state.categories.forEach(function (c) {
      let count = state.services.filter(function (s) { return s.category === c.id; }).length;
      chips.push({ id: c.id, name: c.name + " (" + count + ")" });
    });

    container.innerHTML = chips.map(function (chip) {
      let selected = state.serviceCategoryFilter === chip.id;
      return '<button class="chip" type="button" data-cat="' + esc(chip.id) + '" aria-pressed="' + String(selected) + '">' +
        esc(chip.name) + '</button>';
    }).join("");
  }

  // ---------- 2. تاب التصنيفات ----------

  function renderCategoriesTab() {
    let body = $("categories-body");
    if (state.categories.length === 0) {
      body.innerHTML = emptyHtml(
        "لا توجد تصنيفات بعد",
        "التصنيفات تساعد على تنظيم الخدمات والمعرض.",
        '<button class="btn btn--primary" type="button" data-act="open-add-category">+ إضافة تصنيف جديد</button>'
      );
      return;
    }

    let rowsHtml = state.categories.map(function (c) {
      let svcCount = state.services.filter(function (s) { return s.category === c.id; }).length;
      let portCount = state.portfolio.filter(function (p) { return p.category === c.id; }).length;

      return '<tr>' +
        '<td data-label="المعرّف"><span class="num font-bold">' + esc(c.id) + '</span></td>' +
        '<td data-label="الاسم بالعربي"><strong>' + esc(c.name) + '</strong></td>' +
        '<td data-label="الخدمات التابعة"><span class="num">' + svcCount + '</span> خدمات</td>' +
        '<td data-label="أعمال المعرض"><span class="num">' + portCount + '</span> أعمال</td>' +
        '<td data-label="الترتيب"><span class="num">' + (c.sort_order || 0) + '</span></td>' +
        '<td data-label="إجراءات">' +
          '<div class="table-actions">' +
            '<button class="btn btn--secondary btn--sm" type="button" data-act="edit-cat" data-id="' + esc(c.id) + '">تعديل</button>' +
            '<button class="btn btn--ghost btn--sm" type="button" data-act="delete-cat" data-id="' + esc(c.id) + '" style="color:var(--error);">حذف</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join("");

    body.innerHTML = '<div class="table-wrap"><table class="table admin-table">' +
      '<thead><tr>' +
        '<th>المعرّف (slug)</th><th>اسم التصنيف</th><th>الخدمات التابعة</th><th>أعمال المعرض</th><th>الترتيب</th><th><span class="sr-only">إجراءات</span></th>' +
      '</tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
      '</table></div>';
  }

  // ---------- 3. تاب الخيارات ----------

  function renderOptionsTab() {
    let body = $("options-body");
    let opt = state.options || {};

    let colors = opt.colors || [];
    let sizes = opt.sizes || [];
    let placements = opt.placements || [];
    let phoneModels = opt.phoneModels || [];
    let shapes = opt.shapes || [];
    let units = opt.units || [];
    let uses = opt.uses || [];

    let colorsHtml = colors.map(function (c, idx) {
      return '<div class="options-swatch-item">' +
        '<div class="row align-center gap-s1">' +
          '<span class="swatch-color-box" style="background:' + esc(c.hex) + '"></span>' +
          '<strong>' + esc(c.name) + '</strong>' +
          '<span class="num text-muted" dir="ltr">' + esc(c.hex) + '</span>' +
        '</div>' +
        '<button class="option-tag-remove" type="button" data-act="del-opt-item" data-group="colors" data-idx="' + idx + '" title="حذف">×</button>' +
      '</div>';
    }).join("");

    function renderTagList(group, list, idProp, nameProp) {
      return list.map(function (item, idx) {
        let label = (typeof item === "string") ? item : (item[nameProp || "name"] + " (" + item[idProp || "id"] + ")");
        return '<span class="option-tag">' +
          esc(label) +
          '<button class="option-tag-remove" type="button" data-act="del-opt-item" data-group="' + group + '" data-idx="' + idx + '" title="حذف">×</button>' +
        '</span>';
      }).join("");
    }

    body.innerHTML = '<div class="options-grid">' +

      // كارت الألوان
      '<div class="options-card">' +
        '<h3>الألوان المتاحة (' + colors.length + ')</h3>' +
        '<p class="caption muted">تظهر للعميل في خدمات الملابس والمنتجات التي تدعم الألوان.</p>' +
        '<div class="options-swatch-list">' + (colorsHtml || '<p class="caption muted">لا توجد ألوان.</p>') + '</div>' +
        '<div class="option-add-inline">' +
          '<input type="color" id="opt-color-pick" value="#114850" class="swatch-color-box" style="cursor:pointer; padding:0; border:0;">' +
          '<input class="input" id="opt-color-name" placeholder="اسم اللون بالعربي">' +
          '<input class="input input--ltr num" id="opt-color-hex" value="#114850" placeholder="#HEX">' +
          '<button class="btn btn--secondary btn--sm" type="button" id="opt-add-color-btn">+ إضافة</button>' +
        '</div>' +
      '</div>' +

      // كارت المقاسات
      '<div class="options-card">' +
        '<h3>المقاسات (' + sizes.length + ')</h3>' +
        '<p class="caption muted">مقاسات التيشيرتات والهوديز والسويت شيرت.</p>' +
        '<div class="options-tags-list">' + (renderTagList("sizes", sizes) || '<p class="caption muted">لا توجد مقاسات.</p>') + '</div>' +
        '<div class="option-add-inline">' +
          '<input class="input num input--ltr" id="opt-size-val" placeholder="المقاس (مثال: 3XL)">' +
          '<button class="btn btn--secondary btn--sm" type="button" id="opt-add-size-btn">+ إضافة</button>' +
        '</div>' +
      '</div>' +

      // كارت أماكن الطباعة
      '<div class="options-card">' +
        '<h3>أماكن الطباعة (' + placements.length + ')</h3>' +
        '<p class="caption muted">أماكن الطباعة على الملابس والكابات (الصدر، الظهر، الكم...).</p>' +
        '<div class="options-tags-list">' + (renderTagList("placements", placements, "id", "name") || '<p class="caption muted">لا توجد أماكن.</p>') + '</div>' +
        '<div class="option-add-inline">' +
          '<input class="input input--ltr" id="opt-place-id" placeholder="slug (pocket)">' +
          '<input class="input" id="opt-place-name" placeholder="الاسم (الجيب)">' +
          '<button class="btn btn--secondary btn--sm" type="button" id="opt-add-place-btn">+ إضافة</button>' +
        '</div>' +
      '</div>' +

      // كارت موديلات الهواتف
      '<div class="options-card">' +
        '<h3>طرازات الهواتف (' + phoneModels.length + ')</h3>' +
        '<p class="caption muted">الطرازات المتاحة في خدمة أغطية الموبايل.</p>' +
        '<div class="options-tags-list">' + (renderTagList("phoneModels", phoneModels) || '<p class="caption muted">لا توجد طرازات.</p>') + '</div>' +
        '<div class="option-add-inline">' +
          '<input class="input input--ltr" id="opt-phone-val" placeholder="الطراز (مثال: iPhone 16)">' +
          '<button class="btn btn--secondary btn--sm" type="button" id="opt-add-phone-btn">+ إضافة</button>' +
        '</div>' +
      '</div>' +

      // كارت أشكال الستيكرات
      '<div class="options-card">' +
        '<h3>أشكال الستيكرات (' + shapes.length + ')</h3>' +
        '<p class="caption muted">الأشكال المتوفرة لقص الستيكرات والليبلز.</p>' +
        '<div class="options-tags-list">' + (renderTagList("shapes", shapes, "id", "name") || '<p class="caption muted">لا توجد أشكال.</p>') + '</div>' +
        '<div class="option-add-inline">' +
          '<input class="input input--ltr" id="opt-shape-id" placeholder="slug (oval)">' +
          '<input class="input" id="opt-shape-name" placeholder="الاسم (بيضاوي)">' +
          '<button class="btn btn--secondary btn--sm" type="button" id="opt-add-shape-btn">+ إضافة</button>' +
        '</div>' +
      '</div>' +

      // كارت وحدات القياس
      '<div class="options-card">' +
        '<h3>وحدات القياس (' + units.length + ')</h3>' +
        '<p class="caption muted">وحدات تحديد أبعاد الستيكرات.</p>' +
        '<div class="options-tags-list">' + (renderTagList("units", units, "id", "name") || '<p class="caption muted">لا توجد وحدات.</p>') + '</div>' +
        '<div class="option-add-inline">' +
          '<input class="input input--ltr" id="opt-unit-id" placeholder="slug (m)">' +
          '<input class="input" id="opt-unit-name" placeholder="الاسم (متر)">' +
          '<button class="btn btn--secondary btn--sm" type="button" id="opt-add-unit-btn">+ إضافة</button>' +
        '</div>' +
      '</div>' +

      // كارت استخدامات الستيكر
      '<div class="options-card">' +
        '<h3>طبيعة الاستخدام (' + uses.length + ')</h3>' +
        '<p class="caption muted">أسباب طلب الستيكرات (تغليف، علامة تجارية...).</p>' +
        '<div class="options-tags-list">' + (renderTagList("uses", uses, "id", "name") || '<p class="caption muted">لا توجد خيارات.</p>') + '</div>' +
        '<div class="option-add-inline">' +
          '<input class="input input--ltr" id="opt-use-id" placeholder="slug">' +
          '<input class="input" id="opt-use-name" placeholder="الاسم">' +
          '<button class="btn btn--secondary btn--sm" type="button" id="opt-add-use-btn">+ إضافة</button>' +
        '</div>' +
      '</div>' +

    '</div>';

    let hexPick = $("opt-color-pick");
    let hexInp = $("opt-color-hex");
    if (hexPick && hexInp) {
      hexPick.addEventListener("input", function () { hexInp.value = hexPick.value.toUpperCase(); });
      hexInp.addEventListener("input", function () {
        if (/^#[0-9A-Fa-f]{6}$/.test(hexInp.value)) hexPick.value = hexInp.value;
      });
    }
  }

  // ---------- 4. تاب المعرض ----------

  function renderPortfolioTab() {
    renderPortfolioCatChips();
    let body = $("portfolio-body");
    let filter = state.portfolioCategoryFilter;
    let list = state.portfolio.filter(function (p) {
      return filter === "all" || p.category === filter;
    });

    if (list.length === 0) {
      body.innerHTML = emptyHtml(
        "لا توجد أعمال في هذا التصنيف",
        "أضف عملاً جديداً للمعرض ليظهر للزوار في صفحة أعمالنا.",
        '<button class="btn btn--primary" type="button" data-act="open-add-portfolio">+ إضافة عمل للمعرض</button>'
      );
      return;
    }

    let cardsHtml = list.map(function (p) {
      let imgHtml = p.image
        ? '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy">'
        : '<div class="art__missing">صورة تجريبية</div>';

      return '<article class="portfolio-admin-card">' +
        '<div class="portfolio-admin-card__media">' +
          imgHtml +
          '<span class="tag-sample" style="position:absolute; inset-block-start:var(--s-1); inset-inline-start:var(--s-1);">تجريبي</span>' +
        '</div>' +
        '<div class="portfolio-admin-card__body">' +
          '<h3 class="h4">' + esc(p.title) + '</h3>' +
          '<div class="portfolio-admin-card__meta">' +
            '<span>الخدمة: <strong>' + esc(getServiceName(p.serviceId)) + '</strong></span>' +
            '<span class="badge">' + esc(getCatName(p.category)) + '</span>' +
          '</div>' +
          '<span class="caption cell-sub"><span class="num">' + esc(p.id) + '</span></span>' +
        '</div>' +
        '<div class="portfolio-admin-card__foot">' +
          '<button class="btn btn--secondary btn--sm" type="button" data-act="edit-port" data-id="' + esc(p.id) + '">تعديل</button>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-act="delete-port" data-id="' + esc(p.id) + '" style="color:var(--error);">حذف</button>' +
        '</div>' +
      '</article>';
    }).join("");

    body.innerHTML = '<div class="portfolio-admin-grid">' + cardsHtml + '</div>';
  }

  function renderPortfolioCatChips() {
    let container = $("portfolio-cat-chips");
    if (!container) return;
    let chips = [{ id: "all", name: "الكل (" + state.portfolio.length + ")" }];
    state.categories.forEach(function (c) {
      let count = state.portfolio.filter(function (p) { return p.category === c.id; }).length;
      chips.push({ id: c.id, name: c.name + " (" + count + ")" });
    });

    container.innerHTML = chips.map(function (chip) {
      let selected = state.portfolioCategoryFilter === chip.id;
      return '<button class="chip" type="button" data-cat="' + esc(chip.id) + '" aria-pressed="' + String(selected) + '">' +
        esc(chip.name) + '</button>';
    }).join("");
  }

  // ---------- نوافذ إضافة وتعديل المحتوى ----------

  function openServiceModal(service) {
    state.editingService = service;
    $("svc-alert").hidden = true;
    $("svc-alert").textContent = "";

    // تعبئة قائمة التصنيفات
    $("svc-category").innerHTML = state.categories.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>';
    }).join("");

    if (service) {
      $("service-dlg-title").textContent = "تعديل خدمة: " + service.name;
      $("svc-id").value = service.id;
      $("svc-id").readOnly = true;
      $("svc-name").value = service.name;
      $("svc-category").value = service.category;
      $("svc-formtype").value = service.formType || "apparel";
      $("svc-desc").value = service.description || "";
      $("svc-pricemode").value = service.priceMode || "from";
      $("svc-pricefrom").value = service.priceFrom != null ? service.priceFrom : "";
      $("svc-image").value = service.image || "";
      $("svc-active").checked = service.active !== false;

      let fields = service.fields || [];
      document.querySelectorAll("#svc-fields-checks input").forEach(function (chk) {
        chk.checked = fields.indexOf(chk.value) !== -1;
      });

      let placements = service.placements || [];
      document.querySelectorAll("#svc-placements-checks input").forEach(function (chk) {
        chk.checked = placements.indexOf(chk.value) !== -1;
      });

      updateSvcPreview();
      updateSvcPriceMode();
    } else {
      $("service-dlg-title").textContent = "إضافة خدمة جديدة";
      $("svc-id").value = "";
      $("svc-id").readOnly = false;
      $("svc-name").value = "";
      if (state.categories.length > 0) $("svc-category").value = state.categories[0].id;
      $("svc-formtype").value = "apparel";
      $("svc-desc").value = "";
      $("svc-pricemode").value = "from";
      $("svc-pricefrom").value = "200";
      $("svc-image").value = "";
      $("svc-active").checked = true;

      document.querySelectorAll("#svc-fields-checks input").forEach(function (chk) {
        chk.checked = (["color", "sizes", "placement"].indexOf(chk.value) !== -1);
      });
      document.querySelectorAll("#svc-placements-checks input").forEach(function (chk) {
        chk.checked = (["chest", "back", "sleeve"].indexOf(chk.value) !== -1);
      });

      updateSvcPreview();
      updateSvcPriceMode();
    }

    $("service-dialog").showModal();
  }

  function updateSvcPriceMode() {
    let mode = $("svc-pricemode").value;
    $("svc-pricefrom-wrap").style.display = (mode === "from") ? "" : "none";
  }

  function updateSvcPreview() {
    let url = $("svc-image").value.trim();
    let box = $("svc-preview-box");
    let img = $("svc-image-preview");
    if (url) {
      img.src = url;
      box.hidden = false;
      $("svc-image-status").textContent = "";
    } else {
      box.hidden = true;
    }
  }

  async function handleServiceSubmit(event) {
    event.preventDefault();
    $("svc-alert").hidden = true;

    let id = $("svc-id").value.trim().toLowerCase();
    let name = $("svc-name").value.trim();
    if (!id || !name) {
      $("svc-alert").textContent = "المعرّف واسم الخدمة مطلوبان.";
      $("svc-alert").hidden = false;
      return;
    }

    let fields = [];
    document.querySelectorAll("#svc-fields-checks input:checked").forEach(function (chk) {
      fields.push(chk.value);
    });

    let placements = [];
    document.querySelectorAll("#svc-placements-checks input:checked").forEach(function (chk) {
      placements.push(chk.value);
    });

    let priceMode = $("svc-pricemode").value;
    let priceFromVal = $("svc-pricefrom").value;
    let priceFrom = priceMode === "from" && priceFromVal ? Number(priceFromVal) : null;

    let payload = {
      id: id,
      name: name,
      category: $("svc-category").value,
      formType: $("svc-formtype").value,
      description: $("svc-desc").value.trim(),
      priceMode: priceMode,
      priceFrom: priceFrom,
      image: $("svc-image").value.trim(),
      active: $("svc-active").checked,
      fields: fields,
      placements: placements,
      sample: true
    };

    let btn = $("svc-submit");
    setLoading(btn, true);
    try {
      let saved = await adminSaveService(payload);
      let idx = state.services.findIndex(function (s) { return s.id === saved.id; });
      if (idx !== -1) state.services[idx] = saved;
      else state.services.push(saved);

      updateContentCounts();
      renderServicesTab();
      $("service-dialog").close();
      showToast("تم حفظ الخدمة «" + saved.name + "» بنجاح");
    } catch (err) {
      console.log("Save service error:", err);
      $("svc-alert").textContent = "تعذر الحفظ: " + friendlyError(err.message);
      $("svc-alert").hidden = false;
    } finally {
      setLoading(btn, false);
    }
  }

  function openCategoryModal(cat) {
    state.editingCategory = cat;
    $("cat-alert").hidden = true;
    if (cat) {
      $("cat-dlg-title").textContent = "تعديل تصنيف: " + cat.name;
      $("cat-id").value = cat.id;
      $("cat-id").readOnly = true;
      $("cat-name").value = cat.name;
      $("cat-sort").value = cat.sort_order || 0;
    } else {
      $("cat-dlg-title").textContent = "إضافة تصنيف جديد";
      $("cat-id").value = "";
      $("cat-id").readOnly = false;
      $("cat-name").value = "";
      $("cat-sort").value = String(state.categories.length);
    }
    $("category-dialog").showModal();
  }

  async function handleCategorySubmit(event) {
    event.preventDefault();
    $("cat-alert").hidden = true;
    let id = $("cat-id").value.trim().toLowerCase();
    let name = $("cat-name").value.trim();
    let sort = Number($("cat-sort").value) || 0;

    if (!id || !name) {
      $("cat-alert").textContent = "المعرّف واسم التصنيف مطلوبان.";
      $("cat-alert").hidden = false;
      return;
    }

    let btn = $("cat-submit");
    setLoading(btn, true);
    try {
      let saved = await adminSaveCategory({ id: id, name: name, sortOrder: sort });
      let idx = state.categories.findIndex(function (c) { return c.id === saved.id; });
      if (idx !== -1) state.categories[idx] = saved;
      else state.categories.push(saved);

      state.categories.sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
      updateContentCounts();
      renderCategoriesTab();
      $("category-dialog").close();
      showToast("تم حفظ التصنيف «" + saved.name + "»");
    } catch (err) {
      console.log("Save category error:", err);
      $("cat-alert").textContent = "تعذر الحفظ: " + friendlyError(err.message);
      $("cat-alert").hidden = false;
    } finally {
      setLoading(btn, false);
    }
  }

  function openPortfolioModal(port) {
    state.editingPortfolio = port;
    $("port-alert").hidden = true;

    $("port-category").innerHTML = state.categories.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>';
    }).join("");

    $("port-service").innerHTML = state.services.map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>';
    }).join("");

    if (port) {
      $("port-dlg-title").textContent = "تعديل عمل بالمعرض: " + port.title;
      $("port-id").value = port.id;
      $("port-id").readOnly = true;
      $("port-title").value = port.title;
      $("port-category").value = port.category;
      $("port-service").value = port.serviceId;
      $("port-image").value = port.image || "";
      updatePortPreview();
    } else {
      $("port-dlg-title").textContent = "إضافة عمل للمعرض";
      $("port-id").value = "p" + String(state.portfolio.length + 1).padStart(2, "0");
      $("port-id").readOnly = false;
      $("port-title").value = "";
      if (state.categories.length > 0) $("port-category").value = state.categories[0].id;
      if (state.services.length > 0) $("port-service").value = state.services[0].id;
      $("port-image").value = "";
      updatePortPreview();
    }

    $("portfolio-dialog").showModal();
  }

  function updatePortPreview() {
    let url = $("port-image").value.trim();
    let box = $("port-preview-box");
    let img = $("port-image-preview");
    if (url) {
      img.src = url;
      box.hidden = false;
      $("port-image-status").textContent = "";
    } else {
      box.hidden = true;
    }
  }

  async function handlePortfolioSubmit(event) {
    event.preventDefault();
    $("port-alert").hidden = true;

    let id = $("port-id").value.trim();
    let title = $("port-title").value.trim();
    let img = $("port-image").value.trim();

    if (!id || !title || !img) {
      $("port-alert").textContent = "المعرف والعنوان والصورة مطلوبة.";
      $("port-alert").hidden = false;
      return;
    }

    let payload = {
      id: id,
      title: title,
      category: $("port-category").value,
      serviceId: $("port-service").value,
      image: img,
      sample: true
    };

    let btn = $("port-submit");
    setLoading(btn, true);
    try {
      let saved = await adminSavePortfolio(payload);
      let idx = state.portfolio.findIndex(function (p) { return p.id === saved.id; });
      if (idx !== -1) state.portfolio[idx] = saved;
      else state.portfolio.push(saved);

      updateContentCounts();
      renderPortfolioTab();
      $("portfolio-dialog").close();
      showToast("تم حفظ عمل المعرض بنجاح");
    } catch (err) {
      console.log("Save portfolio error:", err);
      $("port-alert").textContent = "تعذر الحفظ: " + friendlyError(err.message);
      $("port-alert").hidden = false;
    } finally {
      setLoading(btn, false);
    }
  }

  function openConfirm(title, message, onOk) {
    $("confirm-title").textContent = title;
    $("confirm-message").textContent = message;
    state.confirmAction = onOk;
    $("confirm-dialog").showModal();
  }

  async function handleImageUpload(event, folder) {
    let file = event.target.files && event.target.files[0];
    if (!file) return;

    let isSvc = folder === "services";
    let statusEl = isSvc ? $("svc-image-status") : $("port-image-status");
    let inputEl = isSvc ? $("svc-image") : $("port-image");
    let boxEl = isSvc ? $("svc-preview-box") : $("port-preview-box");
    let previewEl = isSvc ? $("svc-image-preview") : $("port-image-preview");

    boxEl.hidden = false;
    statusEl.textContent = "جارٍ رفع الصورة إلى السحابة...";
    try {
      let res = await uploadContentImage(file, folder);
      inputEl.value = res.url;
      previewEl.src = res.url;
      statusEl.textContent = "تم الرفع بنجاح ✓";
      showToast("تم رفع الصورة: " + file.name);
    } catch (err) {
      console.log("Upload image failed:", err);
      statusEl.textContent = "فشل الرفع: " + friendlyError(err.message);
      showToast("فشل رفع الصورة: " + friendlyError(err.message), "error");
    } finally {
      event.target.value = "";
    }
  }

  async function saveAllOptions(btn) {
    if (btn && btn.target) btn = btn.target;
    if (btn) setLoading(btn, true);
    try {
      let opt = state.options || {};
      let keys = Object.keys(opt);
      for (let i = 0; i < keys.length; i++) {
        let k = keys[i];
        await adminSaveOption(k, opt[k]);
      }
      showToast("تم حفظ خيارات النماذج بنجاح");
    } catch (err) {
      handleError(err);
    } finally {
      if (btn) setLoading(btn, false);
    }
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

    // تابات إدارة المحتوى
    $("content-tabs").addEventListener("click", function (event) {
      let btn = event.target.closest("button.tab");
      if (btn && btn.dataset.tab) {
        switchContentTab(btn.dataset.tab);
      }
    });

    // أحداث الخدمات
    $("add-service-btn").addEventListener("click", function () { openServiceModal(null); });
    $("service-cat-chips").addEventListener("click", function (event) {
      let chip = event.target.closest("button.chip");
      if (chip && chip.dataset.cat) {
        state.serviceCategoryFilter = chip.dataset.cat;
        renderServicesTab();
      }
    });
    $("services-body").addEventListener("click", async function (event) {
      let btn = event.target.closest("button");
      if (!btn) return;
      let act = btn.dataset.act;
      let id = btn.dataset.id;
      if (act === "open-add-service") {
        openServiceModal(null);
      } else if (act === "edit-svc") {
        let svc = state.services.find(function (s) { return s.id === id; });
        if (svc) openServiceModal(svc);
      } else if (act === "toggle-svc-active") {
        let currentActive = btn.dataset.active === "true";
        setLoading(btn, true);
        try {
          let updated = await adminToggleServiceActive(id, !currentActive);
          let idx = state.services.findIndex(function (s) { return s.id === id; });
          if (idx !== -1) state.services[idx] = updated;
          renderServicesTab();
          showToast("الخدمة الآن " + (updated.active ? "مفعلة ✓" : "معطلة ✗"));
        } catch (err) {
          handleError(err);
        } finally {
          setLoading(btn, false);
        }
      } else if (act === "delete-svc") {
        let svc = state.services.find(function (s) { return s.id === id; });
        let title = svc ? svc.name : id;
        openConfirm("حذف الخدمة", "هل أنت متأكد من حذف خدمة «" + title + "»؟ لن يتمكن العملاء من طلبها بعد الآن.", async function () {
          try {
            await adminDeleteService(id);
            state.services = state.services.filter(function (s) { return s.id !== id; });
            updateContentCounts();
            renderServicesTab();
            showToast("تم حذف الخدمة بنجاح");
          } catch (err) {
            handleError(err);
          }
        });
      }
    });

    // أحداث التصنيفات
    $("add-category-btn").addEventListener("click", function () { openCategoryModal(null); });
    $("categories-body").addEventListener("click", async function (event) {
      let btn = event.target.closest("button");
      if (!btn) return;
      let act = btn.dataset.act;
      let id = btn.dataset.id;
      if (act === "open-add-category") {
        openCategoryModal(null);
      } else if (act === "edit-cat") {
        let cat = state.categories.find(function (c) { return c.id === id; });
        if (cat) openCategoryModal(cat);
      } else if (act === "delete-cat") {
        let svcCount = state.services.filter(function (s) { return s.category === id; }).length;
        if (svcCount > 0) {
          showToast("لا يمكن حذف التصنيف لوجود " + svcCount + " خدمات مرتبطة به.", "error");
          return;
        }
        let cat = state.categories.find(function (c) { return c.id === id; });
        let title = cat ? cat.name : id;
        openConfirm("حذف التصنيف", "هل أنت متأكد من حذف تصنيف «" + title + "»؟", async function () {
          try {
            await adminDeleteCategory(id);
            state.categories = state.categories.filter(function (c) { return c.id !== id; });
            updateContentCounts();
            renderCategoriesTab();
            showToast("تم حذف التصنيف بنجاح");
          } catch (err) {
            handleError(err);
          }
        });
      }
    });

    // أحداث الخيارات
    $("save-options-btn").addEventListener("click", function () { saveAllOptions($("save-options-btn")); });
    $("options-body").addEventListener("click", function (event) {
      let btn = event.target.closest("button");
      if (!btn) return;
      let id = btn.id;
      let act = btn.dataset.act;

      if (act === "del-opt-item") {
        let group = btn.dataset.group;
        let idx = Number(btn.dataset.idx);
        if (state.options && state.options[group] && state.options[group][idx] !== undefined) {
          state.options[group].splice(idx, 1);
          renderOptionsTab();
          showToast("تم حذف العنصر (اضغط «حفظ جميع الخيارات» لتأكيد التغيير)");
        }
        return;
      }

      if (id === "opt-add-color-btn") {
        let name = $("opt-color-name").value.trim();
        let hex = $("opt-color-hex").value.trim();
        if (!name || !hex) { showToast("اكتب اسم اللون وكود الـ HEX", "error"); return; }
        state.options.colors = state.options.colors || [];
        state.options.colors.push({ id: crypto.randomUUID().slice(0, 8), name: name, hex: hex });
        renderOptionsTab();
        showToast("تمت إضافة اللون للقائمة");
      } else if (id === "opt-add-size-btn") {
        let val = $("opt-size-val").value.trim().toUpperCase();
        if (!val) { showToast("اكتب المقاس", "error"); return; }
        state.options.sizes = state.options.sizes || [];
        if (state.options.sizes.indexOf(val) !== -1) { showToast("المقاس موجود بالفعل", "error"); return; }
        state.options.sizes.push(val);
        renderOptionsTab();
        showToast("تمت إضافة المقاس للقائمة");
      } else if (id === "opt-add-place-btn") {
        let pId = $("opt-place-id").value.trim();
        let pName = $("opt-place-name").value.trim();
        if (!pId || !pName) { showToast("المعرف والاسم مطلوبان", "error"); return; }
        state.options.placements = state.options.placements || [];
        state.options.placements.push({ id: pId, name: pName });
        renderOptionsTab();
        showToast("تمت إضافة مكان الطباعة للقائمة");
      } else if (id === "opt-add-phone-btn") {
        let val = $("opt-phone-val").value.trim();
        if (!val) { showToast("اكتب طراز الهاتف", "error"); return; }
        state.options.phoneModels = state.options.phoneModels || [];
        state.options.phoneModels.push(val);
        renderOptionsTab();
        showToast("تمت إضافة الهاتف للقائمة");
      } else if (id === "opt-add-shape-btn") {
        let sId = $("opt-shape-id").value.trim();
        let sName = $("opt-shape-name").value.trim();
        if (!sId || !sName) { showToast("المعرف والاسم مطلوبان", "error"); return; }
        state.options.shapes = state.options.shapes || [];
        state.options.shapes.push({ id: sId, name: sName });
        renderOptionsTab();
        showToast("تمت إضافة الشكل للقائمة");
      } else if (id === "opt-add-unit-btn") {
        let uId = $("opt-unit-id").value.trim();
        let uName = $("opt-unit-name").value.trim();
        if (!uId || !uName) { showToast("المعرف والاسم مطلوبان", "error"); return; }
        state.options.units = state.options.units || [];
        state.options.units.push({ id: uId, name: uName });
        renderOptionsTab();
        showToast("تمت إضافة الوحدة للقائمة");
      } else if (id === "opt-add-use-btn") {
        let uId = $("opt-use-id").value.trim();
        let uName = $("opt-use-name").value.trim();
        if (!uId || !uName) { showToast("المعرف والاسم مطلوبان", "error"); return; }
        state.options.uses = state.options.uses || [];
        state.options.uses.push({ id: uId, name: uName });
        renderOptionsTab();
        showToast("تمت إضافة الاستخدام للقائمة");
      }
    });

    // أحداث المعرض
    $("add-portfolio-btn").addEventListener("click", function () { openPortfolioModal(null); });
    $("portfolio-cat-chips").addEventListener("click", function (event) {
      let chip = event.target.closest("button.chip");
      if (chip && chip.dataset.cat) {
        state.portfolioCategoryFilter = chip.dataset.cat;
        renderPortfolioTab();
      }
    });
    $("portfolio-body").addEventListener("click", async function (event) {
      let btn = event.target.closest("button");
      if (!btn) return;
      let act = btn.dataset.act;
      let id = btn.dataset.id;
      if (act === "open-add-portfolio") {
        openPortfolioModal(null);
      } else if (act === "edit-port") {
        let item = state.portfolio.find(function (p) { return p.id === id; });
        if (item) openPortfolioModal(item);
      } else if (act === "delete-port") {
        let item = state.portfolio.find(function (p) { return p.id === id; });
        let title = item ? item.title : id;
        openConfirm("حذف عمل المعرض", "هل أنت متأكد من حذف العمل «" + title + "»؟", async function () {
          try {
            await adminDeletePortfolio(id);
            state.portfolio = state.portfolio.filter(function (p) { return p.id !== id; });
            updateContentCounts();
            renderPortfolioTab();
            showToast("تم حذف العمل من المعرض بنجاح");
          } catch (err) {
            handleError(err);
          }
        });
      }
    });

    // نماذج النوافذ
    $("service-form").addEventListener("submit", handleServiceSubmit);
    $("svc-cancel").addEventListener("click", function () { $("service-dialog").close(); });
    $("svc-pricemode").addEventListener("change", updateSvcPriceMode);
    $("svc-image").addEventListener("input", updateSvcPreview);
    $("svc-image-file").addEventListener("change", function (e) { handleImageUpload(e, "services"); });

    $("category-form").addEventListener("submit", handleCategorySubmit);
    $("cat-cancel").addEventListener("click", function () { $("category-dialog").close(); });

    $("portfolio-form").addEventListener("submit", handlePortfolioSubmit);
    $("port-cancel").addEventListener("click", function () { $("portfolio-dialog").close(); });
    $("port-image").addEventListener("input", updatePortPreview);
    $("port-image-file").addEventListener("change", function (e) { handleImageUpload(e, "portfolio"); });

    $("confirm-ok-btn").addEventListener("click", async function () {
      if (typeof state.confirmAction === "function") {
        let action = state.confirmAction;
        state.confirmAction = null;
        $("confirm-dialog").close();
        await action();
      } else {
        $("confirm-dialog").close();
      }
    });
    $("confirm-cancel-btn").addEventListener("click", function () {
      state.confirmAction = null;
      $("confirm-dialog").close();
    });

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