// page-portfolio.js — منطق معرض الأعمال والأرشيف البصري (استوديو يوزرسيف)
// مربوط بـ Supabase عبر api.js مع دعم السلايدر التفاعلي والفلترة والربط بـ request.html

let allPortfolioItems = [];
let allCategories = [];
let activeCategory = "all";
let currentSlideIndex = 0;
let currentViewMode = "carousel"; // "carousel" أو "grid"

let PLACEHOLDER_PORTFOLIO_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750' viewBox='0 0 600 750'><rect width='600' height='750' fill='%230E3B40'/><text x='50%25' y='46%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' font-weight='600' fill='%238FC6CA'>استوديو يوزرسيف</text><text x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23DDEEEF'>أرشيف مشغل أسوان الحرفي</text></svg>";

// بيانات مواصفات حرفية إثرائية متوافقة مع الصورة لكل نوع خدمة
let ENRICHMENT_PRESETS = {
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
  sweatshirt: {
    tag: "أزياء جامعية ومؤسسية",
    specBadge: "HYBRID EMBROIDERY",
    desc: "تطريز ميكانيكي عالي الكثافة باللون الذهبي المطفي على أقمشة قطنية ثقيلة."
  },
  caps: {
    tag: "إكسسوارات رأس ومونوغرام",
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

function enrichPortfolioItem(item) {
  let preset = ENRICHMENT_PRESETS[item.serviceId] || ENRICHMENT_PRESETS[item.category] || ENRICHMENT_PRESETS.custom;
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    serviceId: item.serviceId || "custom",
    image: item.image || PLACEHOLDER_PORTFOLIO_SVG,
    tag: item.tag || preset.tag,
    specBadge: item.specBadge || preset.specBadge,
    desc: item.desc || preset.desc,
    sample: !!item.sample
  };
}

// -------------------------------------------------------------
// 1. التهيئة وجلب البيانات
// -------------------------------------------------------------

async function initPortfolioPage() {
  console.log("Initializing Portfolio Page...");

  try {
    let [itemsData, categoriesData] = await Promise.all([
      getPortfolio(),
      getCategories()
    ]);

    allCategories = categoriesData || [];
    allPortfolioItems = (itemsData || []).map(enrichPortfolioItem);

    console.log("Loaded portfolio items:", allPortfolioItems.length);

    // فحص الفلتر من الرابط (e.g. ?category=apparel)
    let urlParams = new URLSearchParams(window.location.search);
    let requestedCat = urlParams.get("category");
    if (requestedCat && allCategories.some(function (c) { return c.id === requestedCat; })) {
      activeCategory = requestedCat;
    }

    renderPortfolioFilters();
    renderPortfolioCards();
    setupCarouselEvents();
    setupViewToggle();

  } catch (err) {
    console.error("Failed to load portfolio:", err);
    let track = document.getElementById("portfolio-cards-container");
    if (track) {
      track.innerHTML = '<div class="empty"><p>تعذر تحميل المعرض حالياً، يرجى المحاولة لاحقاً.</p></div>';
    }
  }
}

// -------------------------------------------------------------
// 2. بناء شريط الفلاتر
// -------------------------------------------------------------

function renderPortfolioFilters() {
  let container = document.getElementById("portfolio-filters-container");
  if (!container) return;

  let totalCount = allPortfolioItems.length;
  let countStr = totalCount < 10 ? "0" + totalCount : String(totalCount);

  let html = '<button class="portfolio-filter-btn' + (activeCategory === "all" ? ' is-active' : '') + '" ' +
    'data-category="all" aria-pressed="' + (activeCategory === "all") + '">' +
    'الكل (' + countStr + ')' +
    '</button>';

  allCategories.forEach(function (cat) {
    let catItems = allPortfolioItems.filter(function (it) { return it.category === cat.id; });
    if (catItems.length > 0) {
      let isAct = activeCategory === cat.id;
      let cCount = catItems.length < 10 ? "0" + catItems.length : String(catItems.length);
      html += '<button class="portfolio-filter-btn' + (isAct ? ' is-active' : '') + '" ' +
        'data-category="' + escapeHtml(cat.id) + '" aria-pressed="' + isAct + '">' +
        escapeHtml(cat.name) + ' (' + cCount + ')' +
        '</button>';
    }
  });

  container.innerHTML = html;

  // ربط النقر على الفلاتر
  container.querySelectorAll(".portfolio-filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      let cat = btn.getAttribute("data-category");
      setPortfolioCategory(cat);
    });
  });
}

function setPortfolioCategory(catId) {
  activeCategory = catId;
  currentSlideIndex = 0; // إعادة السلايدر للبداية

  document.querySelectorAll(".portfolio-filter-btn").forEach(function (b) {
    let isAct = b.getAttribute("data-category") === catId;
    b.classList.toggle("is-active", isAct);
    b.setAttribute("aria-pressed", String(isAct));
  });

  renderPortfolioCards();
}

// -------------------------------------------------------------
// 3. عرض كروت الأعمال في السلايدر / الشبكة
// -------------------------------------------------------------

function getFilteredItems() {
  if (activeCategory === "all") return allPortfolioItems;
  return allPortfolioItems.filter(function (it) { return it.category === activeCategory; });
}

function renderPortfolioCards() {
  let container = document.getElementById("portfolio-cards-container");
  let counterElem = document.getElementById("portfolio-counter-display");
  if (!container) return;

  let items = getFilteredItems();

  if (items.length === 0) {
    container.innerHTML = '<div class="empty" style="grid-column:1/-1; width:100%"><p>لا توجد أعمال منشورة في هذا التصنيف حالياً.</p></div>';
    if (counterElem) counterElem.textContent = "00 / 00";
    return;
  }

  // تحديث العداد (مثال: 07 / 01)
  updateCounterDisplay(items.length);

  let html = items.map(function (item, index) {
    let reqUrl = "request.html?ref=" + encodeURIComponent(item.id) + "&service=" + encodeURIComponent(item.serviceId);

    return (
      '<article class="portfolio-card reveal" data-item-id="' + escapeHtml(item.id) + '" data-index="' + index + '">' +
        '<img class="portfolio-card__bg" src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '" onerror="this.onerror=null; this.src=\'' + PLACEHOLDER_PORTFOLIO_SVG + '\';">' +
        '<div class="portfolio-card__overlay"></div>' +
        '<div class="portfolio-card__content">' +
          '<span class="portfolio-card__tag">' + escapeHtml(item.tag) + '</span>' +
          '<h3 class="portfolio-card__title">' + escapeHtml(item.title) + '</h3>' +
          '<p class="portfolio-card__desc">' + escapeHtml(item.desc) + '</p>' +
          '<div class="portfolio-card__footer">' +
            '<a class="portfolio-request-btn" href="' + reqUrl + '">' +
              '<span>اطلب مماثل</span>' +
              '<span class="icon-dir">←</span>' +
            '</a>' +
            '<span class="portfolio-spec-badge">' + escapeHtml(item.specBadge) + '</span>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }).join("");

  container.innerHTML = html;

  // ربط النقر على الكرت لفتح نافذة التفاصيل
  container.querySelectorAll(".portfolio-card").forEach(function (card) {
    card.addEventListener("click", function (e) {
      if (e.target.closest(".portfolio-request-btn")) return; // دع الرابط يعمل مباشرة
      let itemId = card.getAttribute("data-item-id");
      openPortfolioModal(itemId);
    });
  });

  // تحديث تموضع السلايدر
  updateCarouselPosition();

  if (typeof setupReveal === "function") {
    setupReveal();
  }
}

// -------------------------------------------------------------
// 4. التحكم في حركة السلايدر والأزرار
// -------------------------------------------------------------

function setupCarouselEvents() {
  let prevBtn = document.getElementById("portfolio-prev-btn");
  let nextBtn = document.getElementById("portfolio-next-btn");

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      slideCarousel(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      slideCarousel(1);
    });
  }
}

function slideCarousel(direction) {
  let items = getFilteredItems();
  let maxIndex = Math.max(0, items.length - getVisibleCardCount());

  // في اتجاه RTL: النقر على "التالي" يزيد المؤشر ويحرك السلايدر
  currentSlideIndex = Math.max(0, Math.min(maxIndex, currentSlideIndex + direction));
  updateCarouselPosition();
  updateCounterDisplay(items.length);
}

function getVisibleCardCount() {
  if (window.innerWidth <= 640) return 1;
  if (window.innerWidth <= 960) return 2;
  return 3;
}

function updateCarouselPosition() {
  let track = document.getElementById("portfolio-cards-container");
  if (!track || currentViewMode === "grid") return;

  let items = getFilteredItems();
  let visibleCount = getVisibleCardCount();
  let maxIndex = Math.max(0, items.length - visibleCount);

  // حساب المسافة لكل كرت بالبيكسل أو النسبة
  let firstCard = track.querySelector(".portfolio-card");
  if (firstCard) {
    let cardWidth = firstCard.offsetWidth;
    let gap = 24; // var(--s-3)
    let offsetPx = currentSlideIndex * (cardWidth + gap);
    // في RTL: التحريك موجب لليسار (transform: translateX)
    track.style.transform = "translateX(" + offsetPx + "px)";
  } else {
    track.style.transform = "none";
  }

  // تحديث أزرار التنقل
  let prevBtn = document.getElementById("portfolio-prev-btn");
  let nextBtn = document.getElementById("portfolio-next-btn");

  if (prevBtn) prevBtn.disabled = (currentSlideIndex <= 0);
  if (nextBtn) nextBtn.disabled = (currentSlideIndex >= maxIndex);
}

function updateCounterDisplay(total) {
  let counterElem = document.getElementById("portfolio-counter-display");
  if (!counterElem) return;

  let current = Math.min(total, currentSlideIndex + 1);
  let curStr = current < 10 ? "0" + current : String(current);
  let totStr = total < 10 ? "0" + total : String(total);

  // عرض العداد تماماً كما في الصورة: 07 / 01
  counterElem.innerHTML = '<span class="num">' + totStr + '</span> / <span class="num">' + curStr + '</span>';
}

// -------------------------------------------------------------
// 5. تبديل وضع العرض (سلايدر / شبكة)
// -------------------------------------------------------------

function setupViewToggle() {
  let btnCarousel = document.getElementById("toggle-view-carousel");
  let btnGrid = document.getElementById("toggle-view-grid");
  let container = document.getElementById("portfolio-cards-container");
  let navStrip = document.getElementById("portfolio-slider-nav");

  if (!btnCarousel || !btnGrid || !container) return;

  btnCarousel.addEventListener("click", function () {
    currentViewMode = "carousel";
    btnCarousel.classList.add("is-active");
    btnGrid.classList.remove("is-active");
    container.className = "portfolio-carousel-track";
    container.style.transform = "none";
    if (navStrip) navStrip.style.display = "inline-flex";
    updateCarouselPosition();
  });

  btnGrid.addEventListener("click", function () {
    currentViewMode = "grid";
    btnGrid.classList.add("is-active");
    btnCarousel.classList.remove("is-active");
    container.className = "portfolio-grid-layout";
    container.style.transform = "none";
    if (navStrip) navStrip.style.display = "none";
  });
}

// -------------------------------------------------------------
// 6. نافذة التفاصيل السريعة (Quick View Modal)
// -------------------------------------------------------------

function openPortfolioModal(itemId) {
  let item = allPortfolioItems.find(function (it) { return it.id === itemId; });
  if (!item) return;

  let modal = document.getElementById("portfolio-detail-modal");
  if (!modal) return;

  let modalImg = document.getElementById("modal-img");
  let modalTitle = document.getElementById("modal-title");
  let modalTag = document.getElementById("modal-tag");
  let modalDesc = document.getElementById("modal-desc");
  let modalSpec = document.getElementById("modal-spec");
  let modalReqBtn = document.getElementById("modal-req-btn");

  if (modalImg) modalImg.src = item.image || PLACEHOLDER_PORTFOLIO_SVG;
  if (modalTitle) modalTitle.textContent = item.title;
  if (modalTag) modalTag.textContent = item.tag;
  if (modalDesc) modalDesc.textContent = item.desc;
  if (modalSpec) modalSpec.textContent = item.specBadge;

  if (modalReqBtn) {
    modalReqBtn.href = "request.html?ref=" + encodeURIComponent(item.id) + "&service=" + encodeURIComponent(item.serviceId);
  }

  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    modal.style.display = "block";
  }
}

function closePortfolioModal() {
  let modal = document.getElementById("portfolio-detail-modal");
  if (!modal) return;
  if (typeof modal.close === "function") {
    modal.close();
  } else {
    modal.style.display = "none";
  }
}

// تحديث السلايدر عند تغيير حجم الشاشة
window.addEventListener("resize", function () {
  updateCarouselPosition();
});

document.addEventListener("DOMContentLoaded", initPortfolioPage);
