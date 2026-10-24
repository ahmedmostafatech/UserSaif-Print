// page-home.js — منطق الصفحة الرئيسية (المزامنة مع لوحة الأدمن، الكاروسيل، اللايت بوكس، والهيرو سكشن)

let homePortfolioItems = [];
let homeServices = [];
let homeCategories = [];
let homeActiveModalImages = [];
let homeActiveModalIndex = 0;
let homeModalSlideTimer = null;

let HOME_PLACEHOLDER_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23EEF6F6'/><text x='50%25' y='46%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' font-weight='600' fill='%23114850'>استوديو يوزرسيف</text><text x='50%25' y='58%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%232F8F98'>معاينة العمل الحرفي</text></svg>";

function homeEscapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", async function () {
  initImageFallbacks();
  initSmoothScroll();
  initHomeLightboxEvents();

  // جلب البيانات ومزامنة الصفحة الرئيسية لحظياً مع لوحة الأدمن
  await syncHomePageData();
  initPortfolioCarousel();
});

// ---------- مزامنة بيانات الصفحة الرئيسية من Supabase / Settings ----------
async function syncHomePageData() {
  try {
    let [settingsData, servicesData, categoriesData, portfolioData] = await Promise.all([
      getSettings().catch(function () { return {}; }),
      getServices().catch(function () { return []; }),
      getCategories().catch(function () { return []; }),
      getPortfolio().catch(function () { return []; })
    ]);

    homeServices = servicesData || [];
    homeCategories = categoriesData || [];
    homePortfolioItems = portfolioData || [];

    // 1. تحديث صورة الهيرو من لوحة الأدمن
    if (settingsData && settingsData.heroImage) {
      let heroImg = document.querySelector(".atelier-mosaic__plate-hoodie img");
      if (heroImg) {
        heroImg.src = settingsData.heroImage;
      }
    }

    // 2. تحديث شبكة الخدمات في الصفحة الرئيسية بالبيانات والصور الجديدة
    if (homeServices.length > 0) {
      renderHomeServicesGrid(homeServices, homeCategories);
    }

    // 3. تحديث كاروسيل الأعمال في الصفحة الرئيسية بالبيانات والصور الجديدة
    if (homePortfolioItems.length > 0) {
      renderHomePortfolioCarousel(homePortfolioItems, homeCategories);
    }

  } catch (err) {
    console.log("Home page live sync error:", err);
  }
}

// ---------- رسم كروت الخدمات على الصفحة الرئيسية ----------
function renderHomeServicesGrid(services, categories) {
  let grid = document.getElementById("home-catalog-grid");
  if (!grid) return;

  grid.innerHTML = services.map(function (s) {
    let catObj = categories.find(function (c) { return c.id === s.category; });
    let catName = catObj ? catObj.name : s.category;
    let priceText = s.priceFrom ? 'ابتداءً من <span class="num">' + s.priceFrom + '</span> ج.م' : 'حسب المواصفات';
    let imageSrc = s.image || HOME_PLACEHOLDER_SVG;

    return (
      '<article class="catalog-card reveal">' +
        '<div class="catalog-card__media">' +
          '<img src="' + homeEscapeHtml(imageSrc) + '" alt="' + homeEscapeHtml(s.name) + '" loading="lazy" onerror="this.onerror=null; this.src=\'' + HOME_PLACEHOLDER_SVG + '\';">' +
          '<span class="catalog-card__pill">' + homeEscapeHtml(catName || "خدمة معتمدة") + '</span>' +
        '</div>' +
        '<div class="catalog-card__body">' +
          '<div>' +
            '<h3 class="catalog-card__title">' + homeEscapeHtml(s.name) + '</h3>' +
            '<p class="catalog-card__desc">' + homeEscapeHtml(s.description || "") + '</p>' +
          '</div>' +
          '<div class="catalog-card__footer">' +
            '<div class="catalog-card__price-box">' +
              '<span class="catalog-card__price-prefix">التسعير</span>' +
              '<span class="catalog-card__price-val">' + priceText + '</span>' +
            '</div>' +
            '<a class="btn btn--primary btn--sm" href="services.html?service=' + encodeURIComponent(s.id) + '#wizard-section">ابدأ الطلب</a>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }).join("");
}

// ---------- رسم عناصر كاروسيل معرض الأعمال المنفذة ----------
function renderHomePortfolioCarousel(items, categories) {
  let carousel = document.getElementById("portfolio-carousel");
  if (!carousel) return;

  carousel.innerHTML = items.map(function (item) {
    let catObj = categories.find(function (c) { return c.id === item.category; });
    let catName = catObj ? catObj.name : item.category;
    let imageSrc = item.image || (item.images && item.images[0]) || HOME_PLACEHOLDER_SVG;
    let serviceLink = "services.html?service=" + encodeURIComponent(item.serviceId || "tshirt") + "&ref=" + encodeURIComponent(item.id) + "#wizard-section";

    return (
      '<article class="portfolio-carousel-item reveal" data-category="' + homeEscapeHtml(item.category) + '" data-id="' + homeEscapeHtml(item.id) + '">' +
        '<img src="' + homeEscapeHtml(imageSrc) + '" alt="' + homeEscapeHtml(item.title) + '" loading="lazy" onerror="this.onerror=null; this.src=\'' + HOME_PLACEHOLDER_SVG + '\';">' +
        '<div class="portfolio-carousel-overlay">' +
          '<span class="portfolio-carousel-overlay__badge">' + homeEscapeHtml(catName || "عمل منفّذ بأسوان") + '</span>' +
          '<h3 class="portfolio-carousel-overlay__title">' + homeEscapeHtml(item.title) + '</h3>' +
          '<p class="portfolio-carousel-overlay__desc">' + homeEscapeHtml(item.note || item.description || "معاينة النموذج الحرفي المطبوع") + '</p>' +
          '<div class="portfolio-carousel-overlay__footer">' +
            '<span class="portfolio-carousel-overlay__meta">مشغل يوزرسيف • 100% حرفي</span>' +
            '<div style="display:flex; gap:8px; align-items:center">' +
              '<button type="button" class="btn btn--ghost btn--sm btn-home-open-work" style="color:#fff; border-color:rgba(255,255,255,0.4)" data-open-work="' + homeEscapeHtml(item.id) + '">' +
                '<span>معاينة وتفاصيل</span>' +
              '</button>' +
              '<a class="portfolio-carousel-overlay__link" href="' + serviceLink + '">' +
                '<span>اطلب مماثل</span>' +
                '<span class="material-symbols-outlined icon-dir" style="font-size:16px">arrow_forward</span>' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }).join("");

  // ربط النقر على الكرت لفتح اللايت بوكس
  carousel.querySelectorAll(".portfolio-carousel-item").forEach(function (card) {
    card.style.cursor = "pointer";
    card.addEventListener("click", function (e) {
      if (e.target.closest("a")) return; // الروابط تفتح مباشرة
      let id = card.getAttribute("data-id");
      let item = homePortfolioItems.find(function (it) { return it.id === id; });
      if (item) {
        openHomeWorkModal(item);
      }
    });
  });
}

// ---------- منطق نافذة اللايت بوكس على الصفحة الرئيسية ----------
function setHomeModalImage(index) {
  if (!homeActiveModalImages.length) return;
  homeActiveModalIndex = (index + homeActiveModalImages.length) % homeActiveModalImages.length;
  let img = document.getElementById("home-work-img");
  if (img) {
    img.classList.remove("is-loaded");
    img.src = homeActiveModalImages[homeActiveModalIndex] || HOME_PLACEHOLDER_SVG;
    if (img.complete && img.naturalWidth > 0) img.classList.add("is-loaded");
  }

  // تحديث المؤشرات
  let dots = document.querySelectorAll("#home-gallery-dots .modal-gallery-dot");
  dots.forEach(function (d, i) {
    if (i === homeActiveModalIndex) d.classList.add("is-active");
    else d.classList.remove("is-active");
  });
}

function startHomeModalAutoSlide() {
  stopHomeModalAutoSlide();
  if (homeActiveModalImages.length > 1) {
    homeModalSlideTimer = setInterval(function () {
      setHomeModalImage(homeActiveModalIndex + 1);
    }, 3500);
  }
}

function stopHomeModalAutoSlide() {
  if (homeModalSlideTimer) {
    clearInterval(homeModalSlideTimer);
    homeModalSlideTimer = null;
  }
}

function openHomeWorkModal(item) {
  let dialog = document.getElementById("home-work-dialog");
  if (!dialog) return;

  if (typeof dialog.showModal !== "function") {
    window.location.href = "services.html?service=" + encodeURIComponent(item.serviceId || "tshirt") + "&ref=" + encodeURIComponent(item.id) + "#wizard-section";
    return;
  }

  homeActiveModalImages = (item.images && item.images.length > 0) ? item.images.slice() : [item.image || HOME_PLACEHOLDER_SVG];
  homeActiveModalIndex = 0;

  let prevBtn = document.getElementById("home-gallery-prev");
  let nextBtn = document.getElementById("home-gallery-next");
  let dotsWrap = document.getElementById("home-gallery-dots");

  if (homeActiveModalImages.length > 1) {
    if (prevBtn) prevBtn.style.display = "grid";
    if (nextBtn) nextBtn.style.display = "grid";
    if (dotsWrap) {
      dotsWrap.style.display = "flex";
      dotsWrap.innerHTML = homeActiveModalImages.map(function (_, i) {
        return '<button type="button" class="modal-gallery-dot' + (i === 0 ? ' is-active' : '') + '" data-dot-idx="' + i + '" aria-label="صورة ' + (i + 1) + '"></button>';
      }).join("");
    }
    if (item.autoSlide) {
      startHomeModalAutoSlide();
    } else {
      stopHomeModalAutoSlide();
    }
  } else {
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
    if (dotsWrap) dotsWrap.style.display = "none";
    stopHomeModalAutoSlide();
  }

  setHomeModalImage(0);

  let catObj = homeCategories.find(function (c) { return c.id === item.category; });
  let catName = catObj ? catObj.name : item.category;
  let sObj = homeServices.find(function (s) { return s.id === item.serviceId; });
  let sName = sObj ? sObj.name : (item.serviceId || "خدمة طباعية");

  let titleEl = document.getElementById("home-work-title");
  let tagEl = document.getElementById("home-work-tag");
  let catEl = document.getElementById("home-work-category");
  let servEl = document.getElementById("home-work-service");
  let servRow = document.getElementById("home-work-service-row");
  let noteEl = document.getElementById("home-work-note");
  let reqLink = document.getElementById("home-work-request");

  if (titleEl) titleEl.textContent = item.title;
  if (tagEl) tagEl.textContent = catName || "معرض أعمال يوزرسيف";
  if (catEl) catEl.textContent = catName || "—";
  if (servEl) servEl.textContent = sName;
  if (servRow) servRow.hidden = !sName;
  if (noteEl) noteEl.textContent = item.note || item.description || "اضغط «اطلب مماثلًا» لبدء طلب جديد يستخدم هذا العمل كمرجع مباشر بمشغل يوزرسيف بأسوان.";
  if (reqLink) {
    reqLink.href = "services.html?service=" + encodeURIComponent(item.serviceId || "tshirt") + "&ref=" + encodeURIComponent(item.id) + "#wizard-section";
  }

  dialog.showModal();
}

function closeHomeWorkModal() {
  stopHomeModalAutoSlide();
  let dialog = document.getElementById("home-work-dialog");
  if (dialog && dialog.open) dialog.close();
}

function initHomeLightboxEvents() {
  let dialog = document.getElementById("home-work-dialog");
  if (!dialog) return;

  let closeBtn = document.getElementById("home-work-close");
  let dismissBtn = document.getElementById("home-work-dismiss");
  let img = document.getElementById("home-work-img");

  if (img) {
    img.addEventListener("load", function () { img.classList.add("is-loaded"); });
    img.addEventListener("error", function () { img.src = HOME_PLACEHOLDER_SVG; });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeHomeWorkModal);
  if (dismissBtn) dismissBtn.addEventListener("click", closeHomeWorkModal);

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeHomeWorkModal();
  });
  dialog.addEventListener("close", function () {
    stopHomeModalAutoSlide();
  });

  let prevBtn = document.getElementById("home-gallery-prev");
  if (prevBtn) prevBtn.addEventListener("click", function () {
    stopHomeModalAutoSlide();
    setHomeModalImage(homeActiveModalIndex - 1);
  });

  let nextBtn = document.getElementById("home-gallery-next");
  if (nextBtn) nextBtn.addEventListener("click", function () {
    stopHomeModalAutoSlide();
    setHomeModalImage(homeActiveModalIndex + 1);
  });

  let dotsWrap = document.getElementById("home-gallery-dots");
  if (dotsWrap) dotsWrap.addEventListener("click", function (e) {
    let dot = e.target.closest("[data-dot-idx]");
    if (dot) {
      stopHomeModalAutoSlide();
      setHomeModalImage(parseInt(dot.getAttribute("data-dot-idx"), 10));
    }
  });
}

// ---------- كاروسيل معرض الأعمال الحرفية (تصفية وتحريك) ----------
function initPortfolioCarousel() {
  var carousel = document.getElementById("portfolio-carousel");
  var prevBtn = document.getElementById("portfolio-prev");
  var nextBtn = document.getElementById("portfolio-next");
  var currEl = document.getElementById("portfolio-curr");
  var totalEl = document.getElementById("portfolio-total");
  var filterButtons = document.querySelectorAll("#portfolio-filters .portfolio-chip");

  if (!carousel) return;

  function getVisibleItems() {
    return Array.from(carousel.querySelectorAll(".portfolio-carousel-item")).filter(function (item) {
      return item.style.display !== "none";
    });
  }

  function updateStatus() {
    var visibleItems = getVisibleItems();
    var total = visibleItems.length;
    if (totalEl) {
      totalEl.textContent = total < 10 ? "0" + total : String(total);
    }

    if (!total) {
      if (currEl) currEl.textContent = "00";
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    var maxScroll = carousel.scrollWidth - carousel.clientWidth;
    var currentScroll = Math.abs(carousel.scrollLeft);

    var isAtStart = currentScroll <= 6;
    var isAtEnd = maxScroll <= 0 || (maxScroll - currentScroll) <= 10;

    if (prevBtn) prevBtn.disabled = isAtStart;
    if (nextBtn) nextBtn.disabled = isAtEnd;

    var ratio = maxScroll > 0 ? Math.min(1, Math.max(0, currentScroll / maxScroll)) : 0;
    var activeIndex = Math.min(total, Math.max(1, Math.round(ratio * (total - 1)) + 1));
    if (currEl) {
      currEl.textContent = activeIndex < 10 ? "0" + activeIndex : String(activeIndex);
    }
  }

  function scrollByStep(forward) {
    var step = carousel.clientWidth * 0.75;
    var offset = forward ? -step : step;
    carousel.scrollBy({ left: offset, behavior: "smooth" });
  }

  if (nextBtn) {
    nextBtn.onclick = function () { scrollByStep(true); };
  }

  if (prevBtn) {
    prevBtn.onclick = function () { scrollByStep(false); };
  }

  carousel.addEventListener("scroll", updateStatus, { passive: true });

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var filterValue = btn.getAttribute("data-filter");

      filterButtons.forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");

      var allItems = carousel.querySelectorAll(".portfolio-carousel-item");
      allItems.forEach(function (item) {
        var cat = item.getAttribute("data-category");
        if (filterValue === "all" || cat === filterValue) {
          item.style.display = "";
          item.style.opacity = "0";
          requestAnimationFrame(function () {
            item.style.transition = "opacity 0.25s ease";
            item.style.opacity = "1";
          });
        } else {
          item.style.display = "none";
        }
      });

      carousel.scrollTo({ left: 0, behavior: "smooth" });
      setTimeout(updateStatus, 160);
    });
  });

  updateStatus();
  window.addEventListener("resize", updateStatus);
}

// ---------- معالجة الصور الناقصة أو المتعذرة ----------
function initImageFallbacks() {
  var allImages = document.querySelectorAll("img");
  allImages.forEach(function (img) {
    img.addEventListener("error", function () {
      var container = img.parentElement;
      if (container && !container.classList.contains("has-fallback")) {
        container.classList.add("has-fallback");
        img.src = HOME_PLACEHOLDER_SVG;
      }
    });
  });
}

// ---------- تمرير ناعم للروابط الداخلية ----------
function initSmoothScroll() {
  var anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var targetId = link.getAttribute("href").slice(1);
      if (!targetId) return;
      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}
