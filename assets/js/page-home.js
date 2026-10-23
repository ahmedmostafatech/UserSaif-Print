// page-home.js — منطق الصفحة الرئيسية (الكاروسيل، التفاعل، التصفية والوسائط)

document.addEventListener("DOMContentLoaded", function () {
  initPortfolioCarousel();
  initImageFallbacks();
  initSmoothScroll();
});

// ---------- كاروسيل معرض الأعمال الحرفية ----------
function initPortfolioCarousel() {
  var carousel = document.getElementById("portfolio-carousel");
  var prevBtn = document.getElementById("portfolio-prev");
  var nextBtn = document.getElementById("portfolio-next");
  var currEl = document.getElementById("portfolio-curr");
  var totalEl = document.getElementById("portfolio-total");
  var progressBar = document.getElementById("portfolio-progress-bar");
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
      if (progressBar) progressBar.style.width = "0%";
      return;
    }

    var maxScroll = carousel.scrollWidth - carousel.clientWidth;
    var currentScroll = Math.abs(carousel.scrollLeft);

    // فحص البداية والنهاية في بيئة RTL
    var isAtStart = currentScroll <= 6;
    var isAtEnd = maxScroll <= 0 || (maxScroll - currentScroll) <= 10;

    if (prevBtn) prevBtn.disabled = isAtStart;
    if (nextBtn) nextBtn.disabled = isAtEnd;

    // شريط التقدم الأرشيفي
    var ratio = maxScroll > 0 ? Math.min(1, Math.max(0, currentScroll / maxScroll)) : 0;
    if (progressBar) {
      var minWidthPercent = Math.max(15, 100 / total);
      var widthPercent = minWidthPercent + (ratio * (100 - minWidthPercent));
      progressBar.style.width = widthPercent + "%";
    }

    // حساب العنصر المعروض حالياً
    var activeIndex = Math.min(total, Math.max(1, Math.round(ratio * (total - 1)) + 1));
    if (currEl) {
      currEl.textContent = activeIndex < 10 ? "0" + activeIndex : String(activeIndex);
    }
  }

  // أزرار التحريك مع دعم RTL
  function scrollByStep(forward) {
    var step = carousel.clientWidth * 0.75;
    // في الـ RTL الاتجاه للأمام يكون بالإزاحة السالبة جهة اليسار
    var offset = forward ? -step : step;
    carousel.scrollBy({ left: offset, behavior: "smooth" });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      scrollByStep(true);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      scrollByStep(false);
    });
  }

  carousel.addEventListener("scroll", updateStatus, { passive: true });

  // ربط الفلاتر بالكاروسيل بسلاسة
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

      // إعادة الكاروسيل للبداية وتحديث العداد
      carousel.scrollTo({ left: 0, behavior: "smooth" });
      setTimeout(updateStatus, 160);
    });
  });

  // تحديث أولي ومتابعة تغيير حجم الشاشة
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
        img.style.display = "none";
        var placeholder = document.createElement("div");
        placeholder.className = "card__media-fallback";
        placeholder.style.cssText = "width:100%;height:100%;min-height:160px;background:var(--teal-50);display:grid;place-items:center;color:var(--teal-800);font-size:12px;font-weight:600;padding:12px;text-align:center;";
        placeholder.innerHTML = '<span>استوديو يوزرسيف • عمل منفّذ</span>';
        container.appendChild(placeholder);
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
