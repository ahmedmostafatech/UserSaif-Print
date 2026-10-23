// layout.js — الهيدر والفوتر المشتركين (تعدّل هنا مرة واحدة فتتحدث كل الصفحات)

let NAV_LINKS = [
  { href: "index.html", label: "الرئيسية" },
  { href: "services.html", label: "الخدمات" },
  { href: "portfolio.html", label: "أعمالنا" },
  { href: "about.html", label: "عن يوزرسيف" },
  { href: "track.html", label: "تتبع طلبك" }
];

// رقم الواتساب المنشور في البريف، ويجب تأكيده قبل الإطلاق
let WHATSAPP_NUMBER = "01116891025";

function currentPage() {
  let page = location.pathname.split("/").pop();
  return page || "index.html";
}

function renderHeader() {
  let page = currentPage();
  let links = NAV_LINKS.map(function (l) {
    let current = l.href === page ? ' aria-current="page"' : "";
    return '<a href="' + l.href + '"' + current + ">" + l.label + "</a>";
  }).join("");

  return (
    '<a class="skip-link" href="#main">تخطي إلى المحتوى</a>' +
    '<header class="site-header"><div class="container site-header__inner">' +
    '<a class="logo" href="index.html" aria-label="يوزرسيف، العودة للرئيسية">يوزرسيف</a>' +
    '<nav class="nav" id="main-nav" aria-label="القائمة الرئيسية">' + links + "</nav>" +
    '<div class="row">' +
    '<a class="btn btn--primary btn--sm" href="services.html#wizard-section">ابدأ طلبك</a>' +
    '<button class="btn btn--secondary btn--sm nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="main-nav">القائمة</button>' +
    "</div></div></header>"
  );
}

function renderFooter() {
  return (
    '<footer class="site-footer"><div class="container">' +
    '<div class="grid grid--3">' +
    '<div><div class="logo" style="color:#fff">يوزرسيف</div>' +
    "<p>استوديو للطباعة وتخصيص المنتجات في أسوان.</p></div>" +
    '<div><h4>روابط</h4><div class="stack">' +
    '<a href="services.html">الخدمات</a><br><a href="portfolio.html">أعمالنا</a><br>' +
    '<a href="about.html">عن يوزرسيف</a><br>' +
    '<a href="track.html">تتبع طلبك</a></div></div>' +
    '<div><h4>تواصل</h4>' +
    '<a href="https://wa.me/2' + WHATSAPP_NUMBER + '" class="num">' + WHATSAPP_NUMBER + "</a>" +
    '<p class="caption" style="color:var(--teal-300)">يجب تأكيده قبل الإطلاق</p></div>' +
    "</div>" +
    '<div class="site-footer__note row" style="justify-content:space-between">' +
    "<span>بيانات تجريبية للعرض فقط</span>" +
    '<span class="row"><a href="policies.html">الخصوصية والشروط</a>' +
    '<button class="motion-toggle" id="motion-toggle" aria-pressed="false">تقليل الحركة</button></span>' +
    "</div></div></footer>"
  );
}

function setupMotionToggle() {
  let btn = document.getElementById("motion-toggle");
  if (!btn) return;
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

function setupMobileNav() {
  let toggle = document.getElementById("nav-toggle");
  let nav = document.getElementById("main-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", function () {
    let open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

function setupReveal() {
  let items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }
  let io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(function (el) { io.observe(el); });
}

// -------------------------------------------------------------
// عداد الأرقام التفاعلي السلس (Count-up Animation)
// -------------------------------------------------------------
function setupNumberCounters() {
  let isReduced = document.documentElement.getAttribute("data-motion") === "reduced" ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  let targets = document.querySelectorAll(
    "[data-counter], .atelier-stat__number, .about-stat-item__num, .metric-val, .counter-animate"
  );
  if (!targets || targets.length === 0) return;

  function parseMeta(raw) {
    let text = raw.trim();
    if (text.includes(" - ") || text.includes(" / ")) return null;

    // استخراج البادئة والأرقام واللاحقة
    let match = text.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);
    if (!match) return null;

    let prefix = match[1] || "";
    let numPart = match[2] || "";
    let suffix = match[3] || "";

    let hasCommas = numPart.includes(",");
    let cleanVal = numPart.replace(/,/g, "");
    let targetNum = parseFloat(cleanVal);
    if (isNaN(targetNum)) return null;

    let decimals = 0;
    if (cleanVal.includes(".")) {
      decimals = cleanVal.split(".")[1].length;
    }

    return {
      prefix: prefix,
      suffix: suffix,
      targetNum: targetNum,
      hasCommas: hasCommas,
      decimals: decimals,
      original: text
    };
  }

  function formatVal(current, meta) {
    let numStr = meta.decimals > 0 ? current.toFixed(meta.decimals) : Math.round(current).toString();
    if (meta.hasCommas) {
      let parts = numStr.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      numStr = parts.join(".");
    }
    return meta.prefix + numStr + meta.suffix;
  }

  if (!("IntersectionObserver" in window) || isReduced) {
    return; // احتفظ بالقيمة الأصلية دون تحريك
  }

  let counterIO = new IntersectionObserver(function (entries, observer) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      let el = entry.target;
      observer.unobserve(el);

      let rawText = el.getAttribute("data-counter-raw") || el.textContent.trim();
      let meta = parseMeta(rawText);
      if (!meta) return;

      // ضبط البداية من الصفر
      el.textContent = formatVal(0, meta);
      el.classList.add("is-counting");

      let duration = 1500; // ms
      let startTime = null;

      function frame(time) {
        if (!startTime) startTime = time;
        let elapsed = time - startTime;
        let progress = Math.min(elapsed / duration, 1);

        // easeOutCubic للتسارع والتباطؤ السلس
        let ease = 1 - Math.pow(1 - progress, 3);
        let current = meta.targetNum * ease;

        el.textContent = formatVal(current, meta);

        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          el.textContent = meta.original;
          el.classList.remove("is-counting");
          el.classList.add("counter-done");
        }
      }

      requestAnimationFrame(frame);
    });
  }, { threshold: 0.15 });

  targets.forEach(function (el) {
    let raw = el.textContent.trim();
    if (parseMeta(raw)) {
      el.setAttribute("data-counter-raw", raw);
      counterIO.observe(el);
    }
  });
}

window.setupNumberCounters = setupNumberCounters;

document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", function () {
  let h = document.getElementById("site-header");
  let f = document.getElementById("site-footer");
  if (h) h.innerHTML = renderHeader();
  if (f) f.innerHTML = renderFooter();
  setupMobileNav();
  setupMotionToggle();
  setupReveal();
  setupNumberCounters();
  console.log("Layout ready:", currentPage());
});