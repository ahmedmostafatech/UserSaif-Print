// page-portfolio.js — منطق صفحة معرض الأعمال
// الدوال المستخدمة من الملفات المشتركة: getPortfolio و getCategories و getServices
// ترتيب التحميل: supabase-js ← config.js ← schema.js ← readiness.js ← api.js ← layout.js ← page-portfolio.js

(function () {
  // صفحة معالج الطلب (غيّرها هنا فقط لو اتغير مكانه)
  let REQUEST_PAGE = "request.html";
  let GAP_FALLBACK = 24;

  // سهم "للأمام" في RTL (يشاور لليسار)
  let ARROW_FORWARD = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/></svg>';

  // صورة بديلة مصنفة "صورة تجريبية" (مشفّرة بشكل آمن لتجنب مشاكل علامات الاقتباس)
  let PLACEHOLDER_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750' viewBox='0 0 600 750'>" +
    "<rect width='600' height='750' fill='#0E3B40'/>" +
    "<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='#8FC6CA'>صورة تجريبية</text></svg>";
  let PLACEHOLDER_SRC = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(PLACEHOLDER_SVG);

  // حالة الصفحة
  let state = {
    items: [],
    categories: [],
    services: [],
    category: "all",
    view: "carousel"
  };
  let ticking = false;

  // ---------- أدوات صغيرة ----------

  function $(id) {
    return document.getElementById(id);
  }

  // تأمين أي نص قادم من الداتا قبل وضعه في HTML
  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function reducedMotion() {
    return document.documentElement.getAttribute("data-motion") === "reduced" ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function categoryName(id) {
    let found = state.categories.filter(function (c) { return c.id === id; })[0];
    return found ? found.name : "";
  }

  function serviceById(id) {
    return state.services.filter(function (s) { return s.id === id; })[0] || null;
  }

  function serviceName(id) {
    let service = serviceById(id);
    return service ? service.name : "";
  }

  // رابط معالج الطلب: الخدمة (لو موجودة وظاهرة) + العمل كمرجع
  function requestUrl(item) {
    let params = new URLSearchParams();
    if (item.serviceId && serviceById(item.serviceId)) params.set("service", item.serviceId);
    params.set("ref", item.id);
    return REQUEST_PAGE + "?" + params.toString();
  }

  function emptyHtml(title, text, actionHtml) {
    return '<div class="empty"><h3 class="h4">' + esc(title) + "</h3><p>" + esc(text) + "</p>" + (actionHtml || "") + "</div>";
  }

  function skeletonHtml() {
    return '<div class="skeleton portfolio-skel"></div><div class="skeleton portfolio-skel"></div><div class="skeleton portfolio-skel"></div>';
  }

  function useFallback(img) {
    if (img.getAttribute("data-fallback") === "1") return;
    img.setAttribute("data-fallback", "1");
    img.src = PLACEHOLDER_SRC;
  }

  // ---------- تحميل البيانات ----------

  async function safeServices() {
    try {
      return await getServices();
    } catch (err) {
      console.log("Services load failed:", err.message);
      return [];
    }
  }

  async function loadData() {
    let loaded = await Promise.all([getPortfolio(), getCategories(), safeServices()]);
    state.items = loaded[0] || [];
    state.categories = loaded[1] || [];
    state.services = loaded[2] || [];
    console.log("Portfolio data loaded:", state.items.length, "items");
  }

  // ---------- الفلاتر ----------

  function chipHtml(id, label, count) {
    let pressed = state.category === id;
    return '<button class="chip" type="button" data-category="' + esc(id) + '" aria-pressed="' + pressed + '">' +
      esc(label) + ' <span class="num">' + count + "</span></button>";
  }

  function renderFilters() {
    let html = chipHtml("all", "الكل", state.items.length);
    state.categories.forEach(function (cat) {
      let count = state.items.filter(function (it) { return it.category === cat.id; }).length;
      if (count > 0) html += chipHtml(cat.id, cat.name, count);
    });
    $("filters").innerHTML = html;
  }

  function setCategory(id) {
    state.category = id;
    // نحدّث الحالة بدون إعادة رسم الأزرار حتى لا يضيع تركيز الكيبورد
    let buttons = $("filters").querySelectorAll("[data-category]");
    buttons.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-category") === id));
    });
    renderCards();
  }

  function visibleItems() {
    if (state.category === "all") return state.items;
    return state.items.filter(function (it) { return it.category === state.category; });
  }

  // ---------- الكروت ----------

  function cardHtml(item, index) {
    let service = serviceName(item.serviceId);
    let image = item.image || PLACEHOLDER_SRC;
    let sampleTag = item.sample ? '<span class="tag-sample">تجريبي</span>' : "";
    let delay = Math.min(index, 6);

    return '<article class="portfolio-card is-entering" style="--i:' + delay + '">' +
      '<img class="portfolio-card__bg" src="' + esc(image) + '" alt="' + esc(item.title) + '" loading="lazy" decoding="async">' +
      '<div class="portfolio-card__overlay"></div>' +
      sampleTag +
      '<button class="portfolio-card__open" type="button" data-open="' + esc(item.id) + '" aria-label="' + esc("عرض تفاصيل: " + item.title) + '"></button>' +
      '<div class="portfolio-card__content">' +
      '<span class="portfolio-card__tag">' + esc(categoryName(item.category)) + "</span>" +
      '<h3 class="portfolio-card__title">' + esc(item.title) + "</h3>" +
      (service ? '<p class="portfolio-card__service">' + esc(service) + "</p>" : "") +
      '<div class="portfolio-card__footer">' +
      '<a class="portfolio-request" href="' + esc(requestUrl(item)) + '"><span>اطلب مماثلًا</span>' + ARROW_FORWARD + "</a>" +
      "</div></div></article>";
  }

  function renderCards() {
    let track = $("track");
    let items = visibleItems();
    track.setAttribute("aria-busy", "false");

    if (items.length === 0) {
      track.innerHTML = emptyHtml("لا توجد أعمال حاليًا", "لم تُنشر أعمال في هذا القسم بعد.", "");
      updateNav();
      return;
    }

    track.innerHTML = items.map(cardHtml).join("");
    track.scrollLeft = 0;
    updateNav();
  }

  // ---------- الكاروسيل ----------

  function getStep() {
    let track = $("track");
    let card = track.querySelector(".portfolio-card");
    if (!card) return 0;
    let style = getComputedStyle(track);
    let gap = parseFloat(style.columnGap) || GAP_FALLBACK;
    return card.offsetWidth + gap;
  }

  // direction: 1 للأمام، -1 للخلف (الاتجاه الفعلي يتحدد حسب RTL تلقائيًا)
  function slide(direction) {
    let track = $("track");
    let step = getStep();
    if (!step) return;
    let sign = getComputedStyle(track).direction === "rtl" ? -1 : 1;
    track.scrollBy({ left: sign * direction * step, behavior: reducedMotion() ? "auto" : "smooth" });
  }

  function updateNav() {
    let track = $("track");
    let nav = $("slider-nav");
    let total = visibleItems().length;
    let step = getStep();

    if (state.view !== "carousel" || total === 0 || !step) {
      nav.hidden = true;
      return;
    }

    let maxScroll = track.scrollWidth - track.clientWidth;
    // كل الأعمال ظاهرة ولا يوجد ما يُسحب
    if (maxScroll <= 2) {
      nav.hidden = true;
      return;
    }
    nav.hidden = false;

    let pos = Math.abs(track.scrollLeft);
    let atStart = pos <= 2;
    let atEnd = pos >= maxScroll - 2;
    let visible = Math.max(1, Math.round(track.clientWidth / step));
    let first = Math.round(pos / step) + 1;
    let last = atEnd ? total : Math.min(total, first + visible - 1);

    $("counter").textContent = pad2(last) + " / " + pad2(total);
    $("prev-btn").disabled = atStart;
    $("next-btn").disabled = atEnd;
  }

  // نحدّث العداد مرة واحدة كل إطار بدل كل حدث scroll
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      updateNav();
    });
  }

  function setView(view) {
    state.view = view;
    let track = $("track");
    $("portfolio-view").setAttribute("data-view", view);
    $("view-carousel").setAttribute("aria-pressed", String(view === "carousel"));
    $("view-grid").setAttribute("aria-pressed", String(view === "grid"));
    track.tabIndex = view === "carousel" ? 0 : -1;
    track.scrollLeft = 0;
    updateNav();
  }

  // ---------- نافذة التفاصيل ----------

  function lockScroll(locked) {
    document.documentElement.classList.toggle("modal-open", locked);
  }

  function openWork(id) {
    let item = state.items.filter(function (it) { return it.id === id; })[0];
    if (!item) return;

    let dialog = $("work-dialog");
    if (typeof dialog.showModal !== "function") {
      // متصفح قديم: ننقل العميل مباشرة لصفحة الطلب
      window.location.href = requestUrl(item);
      return;
    }

    let img = $("work-img");
    img.classList.remove("is-loaded");
    img.removeAttribute("data-fallback");
    img.removeAttribute("src");
    img.alt = item.title;
    img.src = item.image || PLACEHOLDER_SRC;
    if (img.complete && img.naturalWidth > 0) img.classList.add("is-loaded");

    let service = serviceName(item.serviceId);
    $("work-sample").hidden = !item.sample;
    $("work-tag").textContent = categoryName(item.category);
    $("work-title").textContent = item.title;
    $("work-category").textContent = categoryName(item.category) || "—";
    $("work-service").textContent = service || "—";
    $("work-service-row").hidden = !service;
    $("work-note").textContent = "اضغط «اطلب مماثلًا» لبدء طلب جديد يستخدم هذا العمل كمرجع." +
      (item.sample ? " هذا عمل تجريبي للعرض فقط." : "");
    $("work-request").href = requestUrl(item);

    $("work-dialog").querySelector(".portfolio-modal__body").scrollTop = 0;
    lockScroll(true);
    dialog.showModal();
    console.log("Work opened:", item.id);
  }

  function closeWork() {
    let dialog = $("work-dialog");
    if (dialog.open) dialog.close();
  }

  // ---------- الأحداث ----------

  function onTrackClick(event) {
    let openBtn = event.target.closest("[data-open]");
    if (openBtn) {
      openWork(openBtn.getAttribute("data-open"));
      return;
    }
    if (event.target.closest("[data-retry]")) start();
  }

  function onImageError(event) {
    if (event.target && event.target.tagName === "IMG") useFallback(event.target);
  }

  function wire() {
    $("filters").addEventListener("click", function (event) {
      let btn = event.target.closest("[data-category]");
      if (btn) setCategory(btn.getAttribute("data-category"));
    });
    $("view-carousel").addEventListener("click", function () { setView("carousel"); });
    $("view-grid").addEventListener("click", function () { setView("grid"); });
    $("prev-btn").addEventListener("click", function () { slide(-1); });
    $("next-btn").addEventListener("click", function () { slide(1); });

    let track = $("track");
    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("click", onTrackClick);
    track.addEventListener("error", onImageError, true); // أحداث error لا تصعد، فنستخدم capture
    window.addEventListener("resize", onScroll);

    let dialog = $("work-dialog");
    let img = $("work-img");
    img.addEventListener("load", function () { img.classList.add("is-loaded"); });
    img.addEventListener("error", function () { useFallback(img); });
    $("work-close").addEventListener("click", closeWork);
    $("work-dismiss").addEventListener("click", closeWork);
    // الضغط على الخلفية يقفل النافذة
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeWork();
    });
    // يشتغل مع زر الإغلاق ومفتاح Esc وأي إغلاق تاني
    dialog.addEventListener("close", function () { lockScroll(false); });
  }

  // ---------- التشغيل ----------

  async function start() {
    let track = $("track");
    track.setAttribute("aria-busy", "true");
    track.innerHTML = skeletonHtml();

    try {
      await loadData();
    } catch (err) {
      console.log("Portfolio load failed:", err.message);
      track.setAttribute("aria-busy", "false");
      track.innerHTML = emptyHtml(
        "تعذر تحميل المعرض",
        "تأكد من الاتصال بالإنترنت وحاول مرة أخرى.",
        '<button class="btn btn--primary" type="button" data-retry="1">إعادة المحاولة</button>'
      );
      $("slider-nav").hidden = true;
      return;
    }

    // فلتر من الرابط: portfolio.html?category=apparel
    let wanted = new URLSearchParams(window.location.search).get("category");
    if (wanted && state.items.some(function (it) { return it.category === wanted; })) {
      state.category = wanted;
    }

    renderFilters();
    renderCards();
    console.log("Portfolio ready");
  }

  wire();
  start();
})();