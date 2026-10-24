// layout.js — الهيدر والفوتر المشتركين (تعدّل هنا مرة واحدة فتتحدث كل الصفحات)

let NAV_LINKS = [
  { href: "index.html", label: "الرئيسية" },
  { href: "services.html", label: "الخدمات" },
  { href: "portfolio.html", label: "أعمالنا" },
  { href: "about.html", label: "عن يوزرسيف" },
  { href: "track.html", label: "تتبع طلبك" }
];

let WHATSAPP_NUMBER = "01116891025";

let SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/USERSIEFASWAN",
  instagram: "https://www.instagram.com/yuzerseif____",
  tiktok: "https://www.tiktok.com/@yuzersef1820?_t=ZS-8xGfWY4cBZI&_r=1",
  whatsapp: "https://wa.me/201116891025"
};

let SVG_ICONS = {
  facebook: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
  tiktok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  whatsapp: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.07 16.3C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/></svg>'
};

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
    '<a class="site-brand" href="index.html" aria-label="يوزرسيف، العودة للرئيسية">' +
      '<img src="assets/img/logo.png" alt="شعار استوديو يوزرسيف" class="site-logo-img" width="44" height="44">' +
      '<span class="brand-text-wrap">' +
        '<span class="brand-title">يوزرسيف</span>' +
        '<span class="brand-slogan">خليك مختلف .. خليك يوزرسيف</span>' +
      '</span>' +
    '</a>' +
    '<nav class="nav" id="main-nav" aria-label="القائمة الرئيسية">' + links + "</nav>" +
    '<div class="row align-center">' +
    '<a class="btn btn--primary btn--sm" href="services.html#wizard-section">ابدأ طلبك</a>' +
    '<button class="btn btn--secondary btn--sm nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="main-nav">القائمة</button>' +
    "</div></div></header>"
  );
}

function renderFooter() {
  return (
    '<footer class="site-footer"><div class="container">' +
    '<div class="grid grid--3">' +
    '<div>' +
      '<a class="site-brand" href="index.html" style="text-decoration:none; margin-bottom:12px; display:inline-flex;" aria-label="يوزرسيف، العودة للرئيسية">' +
        '<img src="assets/img/logo.png" alt="شعار استوديو يوزرسيف" class="site-logo-img" style="border-color:rgba(255,255,255,0.2);" width="44" height="44">' +
        '<span class="brand-text-wrap">' +
          '<span class="brand-title" style="color:#fff;">يوزرسيف</span>' +
          '<span class="brand-slogan" style="color:var(--teal-200);">خليك مختلف .. خليك يوزرسيف</span>' +
        '</span>' +
      '</a>' +
      '<p style="color:var(--teal-100); font-size:0.9375rem; line-height:1.6; margin-bottom:14px;">استوديو للطباعة وتخصيص المنتجات في أسوان. ننفذ تصاميمك بحرفية وجودة خامات معتمدة وضمان حقيقي ضد عيوب الصناعة.</p>' +
      '<div class="footer-social-row" style="display:flex; align-items:center; gap:10px; margin-top:12px;">' +
        '<a href="' + SOCIAL_LINKS.facebook + '" target="_blank" rel="noopener noreferrer" class="social-icon-btn" aria-label="صفحتنا على فيسبوك" title="فيسبوك">' + SVG_ICONS.facebook + '</a>' +
        '<a href="' + SOCIAL_LINKS.instagram + '" target="_blank" rel="noopener noreferrer" class="social-icon-btn" aria-label="حسابنا على انستجرام" title="انستجرام">' + SVG_ICONS.instagram + '</a>' +
        '<a href="' + SOCIAL_LINKS.tiktok + '" target="_blank" rel="noopener noreferrer" class="social-icon-btn" aria-label="حسابنا على تيك توك" title="تيك توك">' + SVG_ICONS.tiktok + '</a>' +
        '<a href="' + SOCIAL_LINKS.whatsapp + '" target="_blank" rel="noopener noreferrer" class="social-icon-btn" aria-label="مراسلتنا عبر واتساب" title="واتساب">' + SVG_ICONS.whatsapp + '</a>' +
      '</div>' +
    '</div>' +
    '<div>' +
      '<h4>روابط سريعة</h4>' +
      '<div class="stack" style="gap:6px">' +
        '<a href="services.html">الخدمات وتفاصيل الأسعار</a>' +
        '<a href="portfolio.html">معرض الأعمال المنفذة</a>' +
        '<a href="about.html">عن الاستوديو وموقعنا</a>' +
        '<a href="track.html">تتبع حالة طلبك</a>' +
        '<a href="policies.html">الشروط والضمان والخصوصية</a>' +
      '</div>' +
    '</div>' +
    '<div>' +
      '<h4>التواصل والمقر</h4>' +
      '<p style="margin:0 0 6px; font-size:0.9375rem; color:var(--teal-100);">📍 أسوان — جمهورية مصر العربية</p>' +
      '<a href="https://wa.me/2' + WHATSAPP_NUMBER + '" class="num" style="display:inline-flex; align-items:center; gap:6px; font-size:1.15rem; font-weight:700; color:#fff; text-decoration:none;">' +
        '<span>' + WHATSAPP_NUMBER + '</span>' +
      '</a>' +
      '<p class="caption" style="color:var(--teal-200); margin-top:6px;">متاح لاستقبال الاستفسارات والطلبات يوميًا</p>' +
    '</div>' +
    '</div>' +
    '<div class="site-footer__note row" style="justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">' +
      '<span>استوديو يوزرسيف للطباعة والتخصيص الحرفي • أسوان • جميع الحقوق محفوظة</span>' +
      '<span class="row align-center gap-s2" style="flex-wrap:wrap">' +
        '<a href="policies.html" style="text-decoration:underline;">الخصوصية والشروط والضمان</a>' +
        '<button class="motion-toggle" id="motion-toggle" type="button" aria-pressed="false"><span class="motion-icon" aria-hidden="true">⚡</span> <span>تقليل الحركة</span></button>' +
      '</span>' +
    '</div></div></footer>'
  );
}

function setupMotionToggle() {
  let btn = document.getElementById("motion-toggle");
  if (!btn) return;
  let saved = null;
  try { saved = localStorage.getItem("ys-motion"); } catch (e) { /* التخزين غير متاح */ }

  function updateButton(reduced) {
    btn.setAttribute("aria-pressed", String(reduced));
    if (reduced) {
      btn.innerHTML = '<span class="motion-icon" aria-hidden="true">↺</span> <span>إرجاع الحركة الطبيعية</span>';
      btn.classList.add("is-reduced");
      btn.title = "الحركة مقللة حاليًا — اضغط لإعادة تشغيل الحركات والانيميشن الطبيعية";
    } else {
      btn.innerHTML = '<span class="motion-icon" aria-hidden="true">⚡</span> <span>تقليل الحركة</span>';
      btn.classList.remove("is-reduced");
      btn.title = "اضغط لتقليل الحركات السريعة والانتقالات";
    }
  }

  let isReduced = saved === "reduced";
  if (isReduced) {
    document.documentElement.setAttribute("data-motion", "reduced");
  }
  updateButton(isReduced);

  btn.addEventListener("click", function () {
    let reduced = document.documentElement.getAttribute("data-motion") === "reduced";
    let nextState = !reduced;
    if (nextState) {
      document.documentElement.setAttribute("data-motion", "reduced");
    } else {
      document.documentElement.removeAttribute("data-motion");
    }
    updateButton(nextState);
    try { localStorage.setItem("ys-motion", nextState ? "reduced" : "full"); } catch (e) {}
    console.log("Motion preference:", nextState ? "reduced" : "full");
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
  function checkVisible() {
    let unrevealed = document.querySelectorAll(".reveal:not(.is-visible)");
    if (!unrevealed.length) return;
    let vh = window.innerHeight || document.documentElement.clientHeight;
    unrevealed.forEach(function (el) {
      let rect = el.getBoundingClientRect();
      if (rect.top <= vh + 80 && rect.bottom >= -80) {
        el.classList.add("is-visible");
      }
    });
  }

  window.revealVisibleElements = checkVisible;
  checkVisible();

  if ("IntersectionObserver" in window) {
    let io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px 80px 0px" });

    document.querySelectorAll(".reveal").forEach(function (el) {
      let rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add("is-visible");
      } else {
        io.observe(el);
      }
    });

    window.observeNewReveals = function () {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        io.observe(el);
      });
      checkVisible();
    };
  }

  window.addEventListener("scroll", checkVisible, { passive: true });
  window.addEventListener("resize", checkVisible, { passive: true });
}


// -------------------------------------------------------------
// عداد الأرقام التفاعلي السلس (Count-up Animation)
// -------------------------------------------------------------
function setupNumberCounters() {
  let isReduced = document.documentElement.getAttribute("data-motion") === "reduced";

  let targets = document.querySelectorAll(
    "[data-counter], .atelier-stat__number, .about-stat-item__num, .metric-val, .counter-animate"
  );
  if (!targets || targets.length === 0) return;

  function parseMeta(raw) {
    let text = raw.trim();
    if (text.includes(" - ") || text.includes(" / ")) return null;

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

  if (isReduced) return;

  function triggerCounter(el, meta) {
    el.textContent = formatVal(0, meta);
    el.classList.add("is-counting");

    let duration = 1500; // ms
    let startTime = null;

    function frame(time) {
      if (!startTime) startTime = time;
      let elapsed = time - startTime;
      let progress = Math.min(elapsed / duration, 1);

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
  }

  let counterIO = null;
  if ("IntersectionObserver" in window) {
    counterIO = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        let el = entry.target;
        observer.unobserve(el);

        let rawText = el.getAttribute("data-counter-raw") || el.textContent.trim();
        let meta = parseMeta(rawText);
        if (meta) triggerCounter(el, meta);
      });
    }, { threshold: 0.05 });
  }

  targets.forEach(function (el) {
    let raw = el.textContent.trim();
    let meta = parseMeta(raw);
    if (meta) {
      el.setAttribute("data-counter-raw", raw);
      let rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        // إذا كان العنصر ظاهراً فور تحميل الصفحة، ابدأ العد فوراً بعد 120ms
        setTimeout(function () { triggerCounter(el, meta); }, 120);
      } else if (counterIO) {
        counterIO.observe(el);
      }
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