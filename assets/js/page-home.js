// page-home.js — منطق الصفحة الرئيسية (يوزرسيف)

let PLACEHOLDER_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%23EEF6F6'/><text x='50%25' y='46%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' font-weight='600' fill='%23114850'>استوديو يوزرسيف</text><text x='50%25' y='58%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%232F8F98'>صورة تجريبية للعرض</text></svg>";

let PLACEHOLDER_PORTFOLIO_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750' viewBox='0 0 600 750'><rect width='600' height='750' fill='%230E3B40'/><text x='50%25' y='46%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' font-weight='600' fill='%238FC6CA'>استوديو يوزرسيف</text><text x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23DDEEEF'>أرشيف مشغل أسوان الحرفي</text></svg>";

let homePortfolioItems = [];
let homeFilteredItems = [];
let homeSlideIndex = 0;

let HOME_ENRICHMENT = {
  apparel: {
    tag: "هوية ملابس ومطبوعات ضيافة",
    specBadge: "SILK SCREEN | 100% COTTON",
    desc: "طباعة سلك سكرين 3 ألوان مع نسيج قطن مصري مقاوم لدرجات الحرارة العالية ومناسب للاستخدام المكثف."
  },
  hoodie: {
    tag: "شتاء معتق | دفعة محدودة",
    specBadge: "DTF PRINT | 380 GSM",
    desc: "طباعة حرارية DTF مباشرة مع معالجة تثبيت 190° مئوية على بلوفرات قطنية مسرّحة."
  },
  caps: {
    tag: "كابات وتطريز ميكانيكي",
    specBadge: "3D RUBBER PATCH",
    desc: "كابات قطنية مع باتش مطاطي ثلاثي الأبعاد وتطريز جانبي لشعارات الهوية."
  },
  "stickers-labels": {
    tag: "فينيل عازل للماء | طباعة مخصصة",
    specBadge: "MATTE DIE-CUT VINYL",
    desc: "قص ليزري دقيق على فينيل ألماني مصنفر، يعزل الأشعة فوق البنفسجية والماء يدوم طويلاً دون تغيّر."
  },
  "mugs-gifts": {
    tag: "دفعة خاصة محدودة | هدايا شركات",
    specBadge: "150 PCS | GOLD FOIL",
    desc: "سيراميك مطفي مع طباعة فويل ذهبي حراري مقاوم لغسالات الأطباق لأحد معارض الفنون."
  },
  "phone-cases": {
    tag: "حماية وحفر أجهزة شخصية",
    specBadge: "SHOCKPROOF TPU",
    desc: "حفر حراري وتسامي مجهري على أغطية هواتف صلبة ممتصة للصدمات مع ألوان ثابتة لا تبهت."
  },
  custom: {
    tag: "تنفيذ وتطويع يدوي خاص",
    specBadge: "CUSTOM ATELIER",
    desc: "تجليد وتطويع يدوي بمواصفات قياسية خاصة حسب متطلبات التصميم الأرشيفي."
  }
};

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function initHomePage() {
  console.log("Initializing Home Page...");
  setupQuickTrack();
  await Promise.all([
    loadFeaturedServices(),
    loadHomePortfolio()
  ]);
}

// -------------------------------------------------------------
// 1. قسم الخدمات المعتمدة
// -------------------------------------------------------------

async function loadFeaturedServices() {
  let grid = document.getElementById("home-services-grid");
  if (!grid) return;

  try {
    let [services, categories] = await Promise.all([
      getServices(),
      getCategories()
    ]);

    if (!services || services.length === 0) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><p>لا توجد خدمات متاحة حالياً.</p></div>';
      return;
    }

    let html = services.map(function (s) {
      let cat = (categories || []).find(function (c) { return c.id === s.category; });
      let catName = cat ? cat.name : s.category;
      let priceText = s.priceFrom ? 'ابتداءً من <span class="num">' + s.priceFrom + '</span> ج.م' : 'حسب المواصفات';
      let imageSrc = s.image || PLACEHOLDER_SVG;

      return (
        '<article class="card card--hover reveal" style="display:flex; flex-direction:column">' +
          '<div class="card__media">' +
            '<img src="' + escapeHtml(imageSrc) + '" alt="' + escapeHtml(s.name) + '" onerror="this.onerror=null; this.src=\'' + PLACEHOLDER_SVG + '\';">' +
            '<span class="tag-sample">تجريبي</span>' +
          '</div>' +
          '<div class="card__body" style="flex-grow:1; display:flex; flex-direction:column">' +
            '<div class="row" style="justify-content:space-between; align-items:baseline">' +
              '<h3 class="h4" style="margin:0">' + escapeHtml(s.name) + '</h3>' +
              '<span class="caption" style="color:var(--teal-700); font-weight:600">' + priceText + '</span>' +
            '</div>' +
            '<p class="caption" style="margin:4px 0 var(--s-2); line-height:1.6; flex-grow:1">' + escapeHtml(s.description || "") + '</p>' +
            '<div class="row" style="justify-content:space-between; align-items:center; margin-top:auto; padding-top:var(--s-1); border-top:1px dashed var(--border)">' +
              '<span class="badge badge--received">' + escapeHtml(catName) + '</span>' +
              '<a class="btn btn--primary btn--sm" href="request.html?service=' + encodeURIComponent(s.id) + '">ابدأ الطلب ←</a>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join("");

    grid.innerHTML = html;

    if (typeof setupReveal === "function") {
      setupReveal();
    }
  } catch (err) {
    console.error("Failed to load home services:", err);
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><p>تعذر تحميل الخدمات، يرجى المحاولة لاحقاً.</p></div>';
  }
}

// -------------------------------------------------------------
// 2. قسم معرض الأعمال في الهوم (مطابق تماماً للصورة)
// -------------------------------------------------------------

async function loadHomePortfolio() {
  let track = document.getElementById("home-portfolio-track");
  let filterBox = document.getElementById("home-portfolio-filters");
  if (!track) return;

  try {
    let [rawItems, categories] = await Promise.all([
      getPortfolio(),
      getCategories()
    ]);

    homePortfolioItems = (rawItems || []).map(function (it) {
      let preset = HOME_ENRICHMENT[it.serviceId] || HOME_ENRICHMENT[it.category] || HOME_ENRICHMENT.custom;
      return {
        id: it.id,
        title: it.title,
        category: it.category,
        serviceId: it.serviceId || "custom",
        image: it.image || PLACEHOLDER_PORTFOLIO_SVG,
        tag: it.tag || preset.tag,
        specBadge: it.specBadge || preset.specBadge,
        desc: it.desc || preset.desc
      };
    });

    homeFilteredItems = homePortfolioItems;

    // بناء فلاتر الهوم
    if (filterBox && categories) {
      let total = homePortfolioItems.length;
      let totStr = total < 10 ? "0" + total : String(total);
      let fHtml = '<button class="portfolio-filter-btn is-active" data-cat="all">الكل (' + totStr + ')</button>';
      categories.forEach(function (c) {
        let count = homePortfolioItems.filter(function (it) { return it.category === c.id; }).length;
        if (count > 0) {
          let cStr = count < 10 ? "0" + count : String(count);
          fHtml += '<button class="portfolio-filter-btn" data-cat="' + escapeHtml(c.id) + '">' +
            escapeHtml(c.name) + ' (' + cStr + ')' +
            '</button>';
        }
      });
      filterBox.innerHTML = fHtml;

      filterBox.querySelectorAll(".portfolio-filter-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          filterBox.querySelectorAll(".portfolio-filter-btn").forEach(function (b) { b.classList.remove("is-active"); });
          btn.classList.add("is-active");
          let cat = btn.getAttribute("data-cat");
          homeFilteredItems = (cat === "all") ? homePortfolioItems : homePortfolioItems.filter(function (it) { return it.category === cat; });
          homeSlideIndex = 0;
          renderHomePortfolioCards();
        });
      });
    }

    renderHomePortfolioCards();
    setupHomeCarouselNav();

  } catch (err) {
    console.error("Failed to load home portfolio:", err);
    track.innerHTML = '<div class="empty"><p>تعذر تحميل المعرض حالياً.</p></div>';
  }
}

function renderHomePortfolioCards() {
  let track = document.getElementById("home-portfolio-track");
  let counter = document.getElementById("home-portfolio-counter");
  if (!track) return;

  if (homeFilteredItems.length === 0) {
    track.innerHTML = '<div class="empty" style="width:100%"><p>لا توجد أعمال في هذا التصنيف.</p></div>';
    if (counter) counter.textContent = "00 / 00";
    return;
  }

  updateHomeCounter();

  let html = homeFilteredItems.map(function (item) {
    let reqUrl = "request.html?ref=" + encodeURIComponent(item.id) + "&service=" + encodeURIComponent(item.serviceId);

    return (
      '<article class="portfolio-card reveal" style="cursor:pointer" onclick="window.location.href=\'' + reqUrl + '\'">' +
        '<img class="portfolio-card__bg" src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '" onerror="this.onerror=null; this.src=\'' + PLACEHOLDER_PORTFOLIO_SVG + '\';">' +
        '<div class="portfolio-card__overlay"></div>' +
        '<div class="portfolio-card__content">' +
          '<span class="portfolio-card__tag">' + escapeHtml(item.tag) + '</span>' +
          '<h3 class="portfolio-card__title">' + escapeHtml(item.title) + '</h3>' +
          '<p class="portfolio-card__desc">' + escapeHtml(item.desc) + '</p>' +
          '<div class="portfolio-card__footer">' +
            '<a class="portfolio-request-btn" href="' + reqUrl + '" onclick="event.stopPropagation()">' +
              '<span>اطلب مماثل</span>' +
              '<span class="icon-dir">←</span>' +
            '</a>' +
            '<span class="portfolio-spec-badge">' + escapeHtml(item.specBadge) + '</span>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }).join("");

  track.innerHTML = html;
  updateHomeSlidePosition();
}

function setupHomeCarouselNav() {
  let nextBtn = document.getElementById("home-portfolio-next");
  let prevBtn = document.getElementById("home-portfolio-prev");

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      let maxIdx = Math.max(0, homeFilteredItems.length - getHomeVisibleCount());
      if (homeSlideIndex < maxIdx) {
        homeSlideIndex++;
        updateHomeSlidePosition();
        updateHomeCounter();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      if (homeSlideIndex > 0) {
        homeSlideIndex--;
        updateHomeSlidePosition();
        updateHomeCounter();
      }
    });
  }
}

function getHomeVisibleCount() {
  if (window.innerWidth <= 640) return 1;
  if (window.innerWidth <= 960) return 2;
  return 3;
}

function updateHomeSlidePosition() {
  let track = document.getElementById("home-portfolio-track");
  if (!track) return;

  let first = track.querySelector(".portfolio-card");
  if (first) {
    let width = first.offsetWidth;
    let gap = 24;
    let offsetPx = homeSlideIndex * (width + gap);
    track.style.transform = "translateX(" + offsetPx + "px)";
  } else {
    track.style.transform = "none";
  }

  let nextBtn = document.getElementById("home-portfolio-next");
  let prevBtn = document.getElementById("home-portfolio-prev");
  let maxIdx = Math.max(0, homeFilteredItems.length - getHomeVisibleCount());

  if (prevBtn) prevBtn.disabled = (homeSlideIndex <= 0);
  if (nextBtn) nextBtn.disabled = (homeSlideIndex >= maxIdx);
}

function updateHomeCounter() {
  let counter = document.getElementById("home-portfolio-counter");
  if (!counter) return;

  let total = homeFilteredItems.length;
  let cur = Math.min(total, homeSlideIndex + 1);
  let curStr = cur < 10 ? "0" + cur : String(cur);
  let totStr = total < 10 ? "0" + total : String(total);

  counter.innerHTML = '<span class="num">' + totStr + '</span> / <span class="num">' + curStr + '</span>';
}

window.addEventListener("resize", updateHomeSlidePosition);

// -------------------------------------------------------------
// 3. التتبع السريع
// -------------------------------------------------------------

function setupQuickTrack() {
  let form = document.getElementById("home-track-form");
  let input = document.getElementById("home-track-input");
  if (!form || !input) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    let val = input.value.trim();
    if (!val) {
      input.focus();
      return;
    }
    window.location.href = "track.html?order=" + encodeURIComponent(val);
  });
}

document.addEventListener("DOMContentLoaded", initHomePage);
