// page-request.js — منطق صفحة بدء الطلب (Wizard & Catalog)
// مربوط بالكامل بـ Supabase عبر api.js و readiness.js و schema.js

let allServices = [];
let allCategories = [];
let allOptions = {};
let selectedService = null;
let currentStep = 1;

// مسودة الطلب المتوافقة مع schema.js وتوقيع submitOrder
let draft = {
  serviceId: "tshirt",
  quantity: 24,
  description: "",
  customer: {
    name: "",
    phone: "",
    email: ""
  },
  requestedDate: "",
  pickup: "pickup",
  designHelp: false,
  artwork: [],
  specs: {
    color: "black",
    sizes: { S: 4, M: 8, L: 8, XL: 4, XXL: 0 },
    placements: ["chest"]
  }
};

// صورة افتراضية في حالة عدم توفر الصورة
let PLACEHOLDER_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'><rect width='400' height='260' fill='%23EEF6F6'/><text x='50%25' y='46%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' font-weight='600' fill='%23114850'>استوديو يوزرسيف</text><text x='50%25' y='58%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%232F8F98'>صورة تجريبية للعرض</text></svg>";

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// -------------------------------------------------------------
// 1. التهيئة وجلب البيانات من Supabase
// -------------------------------------------------------------

async function initRequestPage() {
  console.log("Initializing Request Page...");
  
  // ضبط التاريخ الافتراضي (بعد 4 أيام من اليوم)
  let defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 4);
  let mm = String(defaultDate.getMonth() + 1).padStart(2, "0");
  let dd = String(defaultDate.getDate()).padStart(2, "0");
  draft.requestedDate = defaultDate.getFullYear() + "-" + mm + "-" + dd;
  let dateInput = document.getElementById("requested-date-input");
  if (dateInput) {
    dateInput.value = draft.requestedDate;
    dateInput.min = todayIso();
  }

  try {
    // جلب البيانات من الـ API
    let [servicesData, categoriesData, optionsData] = await Promise.all([
      getServices(),
      getCategories(),
      getOptions()
    ]);

    allServices = servicesData || [];
    allCategories = categoriesData || [];
    allOptions = optionsData || {};

    console.log("Loaded services:", allServices.length, "categories:", allCategories.length);

    // بناء واجهة الفلاتر والخيارات
    renderCategoryFilters();
    renderCatalogGrid(allServices);
    setupOptionsSelectors();

    // فحص باراميترات الـ URL لاختيار خدمة محددة
    let params = new URLSearchParams(window.location.search);
    let preServiceId = params.get("service");
    let refId = params.get("ref");

    let matchedRefItem = null;
    if (refId) {
      try {
        let portfolioList = await getPortfolio();
        matchedRefItem = portfolioList.find(function (p) { return p.id === refId; });
        if (matchedRefItem && (matchedRefItem.serviceId || matchedRefItem.service_id)) {
          preServiceId = matchedRefItem.serviceId || matchedRefItem.service_id;
        }
      } catch (e) {
        console.log("Portfolio ref check error:", e);
      }
    }

    if (preServiceId) {
      let initialService = allServices.find(function (s) { return s.id === preServiceId; });
      if (initialService) {
        selectService(initialService, true);
        if (matchedRefItem) {
          let specIdElem = document.getElementById("active-service-spec-id");
          if (specIdElem) {
            specIdElem.innerHTML = 'مواصفة مطابقة لعمل: <strong style="color:var(--teal-900)">' + escapeHtml(matchedRefItem.title) + '</strong>';
          }
        }
      } else {
        showServiceSelectionPrompt();
      }
    } else if (window.location.hash === "#wizard-section") {
      let defaultService = allServices[0];
      if (defaultService) {
        selectService(defaultService, true);
      } else {
        showServiceSelectionPrompt();
      }
    } else {
      // لم يتم اختيار خدمة بعد: اعرض الكتالوج بالكامل ورسالة الحث، واخفِ المعالج
      showServiceSelectionPrompt();
    }

    setupEventListeners();
    updateReadinessFeedback();
    updateSummary();

  } catch (err) {
    console.error("Failed to load request page data:", err);
    let grid = document.getElementById("catalog-services-grid");
    if (grid) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><p>تعذر تحميل الخدمات، يرجى إعادة تحميل الصفحة.</p></div>';
    }
  }
}

function showServiceSelectionPrompt() {
  let catalogWrap = document.getElementById("catalog-browser-wrap");
  let compactBar = document.getElementById("selected-service-compact-bar");
  let wizardSection = document.getElementById("wizard-section");
  let promptSection = document.getElementById("choose-service-prompt");
  let stickyCta = document.getElementById("mobile-sticky-cta");

  if (catalogWrap) catalogWrap.style.display = "block";
  if (compactBar) compactBar.style.display = "none";
  if (wizardSection) wizardSection.style.display = "none";
  if (promptSection) promptSection.style.display = "flex";
  if (stickyCta) stickyCta.style.display = "none";
}

// -------------------------------------------------------------
// 2. بناء واجهة التصنيفات والخدمات
// -------------------------------------------------------------

function renderCategoryFilters() {
  let container = document.getElementById("catalog-category-filters");
  if (!container) return;

  let html = '<button class="chip" aria-pressed="true" data-category="all">كافة التصنيفات (' + allServices.length + ')</button>';

  allCategories.forEach(function (cat) {
    let count = allServices.filter(function (s) { return s.category === cat.id; }).length;
    html += '<button class="chip" aria-pressed="false" data-category="' + escapeHtml(cat.id) + '">' +
      escapeHtml(cat.name) + ' (' + count + ')' +
      '</button>';
  });

  container.innerHTML = html;

  // ربط أحداث النقر على الفلاتر
  let chips = container.querySelectorAll(".chip");
  chips.forEach(function (btn) {
    btn.addEventListener("click", function () {
      chips.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");
      let category = btn.getAttribute("data-category");
      filterCatalogByCategory(category);
    });
  });
}

function filterCatalogByCategory(catId) {
  if (catId === "all") {
    renderCatalogGrid(allServices);
  } else {
    let filtered = allServices.filter(function (s) { return s.category === catId; });
    renderCatalogGrid(filtered);
  }
}

function renderCatalogGrid(servicesList) {
  let grid = document.getElementById("catalog-services-grid");
  if (!grid) return;

  if (servicesList.length === 0) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><p>لا توجد خدمات متاحة في هذا التصنيف حالياً.</p></div>';
    return;
  }

  let html = servicesList.map(function (s) {
    let isSelected = selectedService && selectedService.id === s.id;
    let catObj = allCategories.find(function (c) { return c.id === s.category; });
    let catName = catObj ? catObj.name : s.category;
    let priceText = s.priceFrom ? 'ابتداءً من <span class="num">' + s.priceFrom + '</span> ج.م' : 'حسب المواصفات';
    let imageSrc = s.image || PLACEHOLDER_SVG;

    return (
      '<article class="service-card' + (isSelected ? ' is-selected' : '') + '" data-service-id="' + escapeHtml(s.id) + '">' +
        '<div class="service-card__media">' +
          '<img src="' + escapeHtml(imageSrc) + '" alt="' + escapeHtml(s.name) + '" onerror="this.onerror=null; this.src=\'' + PLACEHOLDER_SVG + '\';">' +
          '<span class="service-card__category">' + escapeHtml(catName) + '</span>' +
          '<span class="tag-sample">تجريبي</span>' +
        '</div>' +
        '<div class="service-card__body">' +
          '<div class="service-card__title-row">' +
            '<h3 class="h4" style="margin:0">' + escapeHtml(s.name) + '</h3>' +
            '<span class="service-card__price">' + priceText + '</span>' +
          '</div>' +
          '<p class="service-card__desc">' + escapeHtml(s.description || "") + '</p>' +
          '<div class="service-card__footer">' +
            '<span class="caption" style="color:var(--teal-700)">مواصفات حرفية معتمدة</span>' +
            '<button type="button" class="btn btn--secondary btn--sm">تحديد وبدء الطلب</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }).join("");

  grid.innerHTML = html;

  // تفعيل النقر على الكروت
  grid.querySelectorAll(".service-card").forEach(function (card) {
    card.addEventListener("click", function () {
      let serviceId = card.getAttribute("data-service-id");
      let found = allServices.find(function (s) { return s.id === serviceId; });
      if (found) {
        selectService(found, true);
      }
    });
  });
}

// -------------------------------------------------------------
// 3. اختيار الخدمة وضبط نموذج المواصفات المطابق
// -------------------------------------------------------------

function selectService(service, scrollIntoWizard) {
  selectedService = service;
  draft.serviceId = service.id;

  // إخفاء شبكة الكتالوج وإظهار الشريط المدمج للخدمة المختارة
  let catalogWrap = document.getElementById("catalog-browser-wrap");
  let compactBar = document.getElementById("selected-service-compact-bar");
  let wizardSection = document.getElementById("wizard-section");
  let promptSection = document.getElementById("choose-service-prompt");
  let stickyCta = document.getElementById("mobile-sticky-cta");

  if (catalogWrap) catalogWrap.style.display = "none";
  if (promptSection) promptSection.style.display = "none";
  if (compactBar) compactBar.style.display = "flex";
  if (wizardSection) wizardSection.style.display = "block";
  if (stickyCta) stickyCta.style.display = "block";

  // تعبئة بيانات الشريط المدمج
  let compactImg = document.getElementById("compact-service-img");
  let compactTitle = document.getElementById("compact-service-title");
  let compactPrice = document.getElementById("compact-service-price");
  let compactCat = document.getElementById("compact-service-cat");

  if (compactImg) {
    compactImg.src = service.image || PLACEHOLDER_SVG;
    compactImg.alt = service.name;
    compactImg.onerror = function () { this.onerror = null; this.src = PLACEHOLDER_SVG; };
  }
  if (compactTitle) compactTitle.textContent = service.name;
  if (compactPrice) {
    compactPrice.innerHTML = service.priceFrom ? 'ابتداءً من <span class="num">' + service.priceFrom + '</span> ج.م' : 'حسب المواصفات';
  }
  if (compactCat) {
    let catObj = allCategories.find(function (c) { return c.id === service.category; });
    compactCat.textContent = catObj ? catObj.name : service.category;
  }

  // تحديث تمييز الكرت في الشبكة
  document.querySelectorAll(".service-card").forEach(function (card) {
    if (card.getAttribute("data-service-id") === service.id) {
      card.classList.add("is-selected");
    } else {
      card.classList.remove("is-selected");
    }
  });

  // تحديث شريط المسار واللافتة
  let breadcrumbElem = document.getElementById("breadcrumb-current-service");
  if (breadcrumbElem) breadcrumbElem.textContent = service.name;

  let activeNameElem = document.getElementById("active-service-name");
  if (activeNameElem) activeNameElem.textContent = service.name;

  let activeSpecIdElem = document.getElementById("active-service-spec-id");
  if (activeSpecIdElem) activeSpecIdElem.textContent = "مواصفة: " + service.id.toUpperCase() + "-2024";

  let activePriceElem = document.getElementById("active-service-price");
  if (activePriceElem) {
    activePriceElem.innerHTML = service.priceFrom ? 'ابتداءً من <span class="num">' + service.priceFrom + '</span> ج.م' : 'حسب المواصفات';
  }

  // ضبط نوع النموذج (formType)
  let formType = service.formType || "custom";
  activateVariantForm(formType, service);

  // إعادة تهيئة الـ specs المناسبة للخدمة
  initSpecsForService(service);

  // تحديث مواضع الطباعة بناء على الخدمة الحالية
  updatePlacementsForService(service);

  // تحديث الملخص ومساعد الجاهزية
  updateSummary();
  updateReadinessFeedback();

  // تمرير سلس إلى المعالج عند اختيار المنتج
  if (scrollIntoWizard) {
    if (wizardSection) {
      setTimeout(function () {
        let headerOffset = 90;
        let elementPosition = wizardSection.getBoundingClientRect().top;
        let offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: "smooth"
        });
      }, 80);
    }
  }
}

function expandCatalogBrowser() {
  let catalogWrap = document.getElementById("catalog-browser-wrap");
  if (catalogWrap) {
    catalogWrap.style.display = "block";
    let catalogSection = document.getElementById("services-catalog");
    if (catalogSection) catalogSection.scrollIntoView({ behavior: "smooth" });
  }
}

function activateVariantForm(formType, service) {
  service = service || selectedService;
  let fields = service ? (service.fields || []) : [];

  // إظهار النموذج المناسب فقط
  let blocks = {
    apparel: document.getElementById("form-block-apparel"),
    gift: document.getElementById("form-block-gift"),
    sticker: document.getElementById("form-block-sticker"),
    custom: document.getElementById("form-block-custom")
  };

  Object.keys(blocks).forEach(function (key) {
    if (blocks[key]) {
      blocks[key].style.display = (key === formType) ? "block" : "none";
    }
  });

  // التحكم بإظهار/إخفاء الحقول بدقة حسب حقول الخدمة فقط
  let sizesBox = document.getElementById("apparel-sizes-box");
  if (sizesBox) {
    sizesBox.style.display = (fields.indexOf("sizes") !== -1) ? "grid" : "none";
  }

  let colorField = document.getElementById("field-color");
  if (colorField) {
    colorField.style.display = (fields.indexOf("color") !== -1) ? "grid" : "none";
  }

  let placementsField = document.getElementById("field-placements");
  if (placementsField) {
    placementsField.style.display = (fields.indexOf("placement") !== -1) ? "grid" : "none";
  }

  let phoneModelField = document.getElementById("field-phone-model");
  if (phoneModelField) {
    phoneModelField.style.display = (fields.indexOf("phoneModel") !== -1) ? "grid" : "none";
  }

  let customTextField = document.getElementById("field-custom-text");
  if (customTextField) {
    customTextField.style.display = (fields.indexOf("customText") !== -1) ? "grid" : "none";
  }

  let dimensionsField = document.getElementById("field-dimensions");
  if (dimensionsField) {
    dimensionsField.style.display = (fields.indexOf("dimensions") !== -1) ? "grid" : "none";
  }

  let shapeField = document.getElementById("field-shape");
  if (shapeField) {
    shapeField.style.display = (fields.indexOf("shape") !== -1) ? "grid" : "none";
  }

  let useField = document.getElementById("field-use");
  if (useField) {
    useField.style.display = (fields.indexOf("use") !== -1) ? "grid" : "none";
  }
}

function initSpecsForService(service) {
  let fields = service.fields || [];
  draft.specs = {};

  if (fields.indexOf("color") !== -1) {
    draft.specs.color = "black";
    selectColorSwatch("black");
  }

  if (fields.indexOf("sizes") !== -1) {
    draft.quantity = 24;
    draft.specs.sizes = { S: 4, M: 8, L: 8, XL: 4, XXL: 0 };
    let qtyInput = document.getElementById("apparel-target-qty");
    if (qtyInput) qtyInput.value = 24;
    syncSizeInputs();
    recalculateApparelSizes();
  } else if (service.formType === "apparel") {
    // كاب أو ما شابه
    draft.quantity = 20;
    let qtyInput = document.getElementById("apparel-target-qty");
    if (qtyInput) qtyInput.value = 20;
  }

  if (fields.indexOf("placement") !== -1) {
    let defaultPlacement = (service.placements && service.placements.length > 0) ? [service.placements[0]] : ["chest"];
    draft.specs.placements = defaultPlacement;
  }

  if (fields.indexOf("phoneModel") !== -1) {
    draft.specs.phoneModel = "";
    let select = document.getElementById("phone-model-select");
    if (select) select.value = "";
  }

  if (fields.indexOf("customText") !== -1) {
    draft.specs.customText = "";
    let textInput = document.getElementById("custom-text-input");
    if (textInput) textInput.value = "";
  }

  if (service.formType === "gift") {
    draft.quantity = 2;
    let giftQty = document.getElementById("gift-qty-input");
    if (giftQty) giftQty.value = 2;
  }

  if (fields.indexOf("dimensions") !== -1) {
    draft.specs.width = 6;
    draft.specs.height = 6;
    draft.specs.unit = "cm";
    setStickerUnit("cm");
  }

  if (fields.indexOf("shape") !== -1) {
    draft.specs.shape = "square";
    selectStickerShape("square");
  }

  if (fields.indexOf("use") !== -1) {
    draft.specs.use = "branding";
    let useSelect = document.getElementById("sticker-use-select");
    if (useSelect) useSelect.value = "branding";
  }

  if (service.formType === "sticker") {
    draft.quantity = 150;
    let stickerQty = document.getElementById("sticker-qty-select");
    if (stickerQty) stickerQty.value = "150";
  }

  if (service.formType === "custom") {
    draft.quantity = 10;
  }
}

// -------------------------------------------------------------
// 4. خيارات الحقول الديناميكية (Options)
// -------------------------------------------------------------

function setupOptionsSelectors() {
  // أ) سواتش الألوان
  let colorsContainer = document.getElementById("apparel-colors-swatches");
  if (colorsContainer && allOptions.colors) {
    let html = allOptions.colors.map(function (c) {
      let isChecked = c.id === "black";
      return (
        '<button type="button" class="swatch-btn' + (isChecked ? ' is-active' : '') + '" ' +
          'style="background-color:' + escapeHtml(c.hex) + '" ' +
          'data-color-id="' + escapeHtml(c.id) + '" ' +
          'data-color-name="' + escapeHtml(c.name) + '" ' +
          'title="' + escapeHtml(c.name) + '" ' +
          'aria-checked="' + isChecked + '">' +
          '<span class="sr-only">' + escapeHtml(c.name) + '</span>' +
        '</button>'
      );
    }).join("");
    colorsContainer.innerHTML = html;

    colorsContainer.querySelectorAll(".swatch-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let colorId = btn.getAttribute("data-color-id");
        selectColorSwatch(colorId);
      });
    });
  }

  // ب) موديلات الهواتف
  let phoneSelect = document.getElementById("phone-model-select");
  if (phoneSelect && allOptions.phoneModels) {
    let html = '<option value="">-- اختر طراز الهاتف --</option>';
    allOptions.phoneModels.forEach(function (model) {
      html += '<option value="' + escapeHtml(model) + '">' + escapeHtml(model) + '</option>';
    });
    html += '<option value="other">طراز آخر (يُكتب في الملاحظات)</option>';
    phoneSelect.innerHTML = html;
  }

  // ج) أشكال الستيكرات
  let shapesGrid = document.getElementById("sticker-shapes-grid");
  if (shapesGrid && allOptions.shapes) {
    let html = allOptions.shapes.map(function (s) {
      let isChecked = s.id === "square";
      return (
        '<button type="button" class="shape-btn' + (isChecked ? ' is-active' : '') + '" data-shape-id="' + escapeHtml(s.id) + '">' +
          '<strong>' + escapeHtml(s.name) + '</strong>' +
        '</button>'
      );
    }).join("");
    shapesGrid.innerHTML = html;

    shapesGrid.querySelectorAll(".shape-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        let shapeId = btn.getAttribute("data-shape-id");
        selectStickerShape(shapeId);
      });
    });
  }

  // د) مجالات استخدام الستيكرات
  let useSelect = document.getElementById("sticker-use-select");
  if (useSelect && allOptions.uses) {
    let html = "";
    allOptions.uses.forEach(function (u) {
      html += '<option value="' + escapeHtml(u.id) + '">' + escapeHtml(u.name) + '</option>';
    });
    useSelect.innerHTML = html;
  }
}

function selectColorSwatch(colorId) {
  let buttons = document.querySelectorAll(".swatch-btn");
  buttons.forEach(function (btn) {
    let id = btn.getAttribute("data-color-id");
    if (id === colorId) {
      btn.classList.add("is-active");
      btn.setAttribute("aria-checked", "true");
      let name = btn.getAttribute("data-color-name");
      let label = document.getElementById("selected-color-label");
      if (label) label.textContent = name;
      draft.specs.color = colorId;
    } else {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-checked", "false");
    }
  });
  updateSummary();
  updateReadinessFeedback();
}

function selectStickerShape(shapeId) {
  document.querySelectorAll(".shape-btn").forEach(function (b) {
    if (b.getAttribute("data-shape-id") === shapeId) {
      b.classList.add("is-active");
      draft.specs.shape = shapeId;
    } else {
      b.classList.remove("is-active");
    }
  });
  updateSummary();
  updateReadinessFeedback();
}

function updatePlacementsForService(service) {
  let grid = document.getElementById("apparel-placements-grid");
  if (!grid) return;

  let availableKeys = service.placements || ["chest", "back", "sleeve"];
  let allPlacements = allOptions.placements || [];

  let html = availableKeys.map(function (pKey) {
    let pObj = allPlacements.find(function (x) { return x.id === pKey; });
    let pName = pObj ? pObj.name : pKey;
    let isChecked = (draft.specs.placements || []).indexOf(pKey) !== -1;

    return (
      '<label class="option-card' + (isChecked ? ' is-checked' : '') + '">' +
        '<input type="checkbox" name="placement" value="' + escapeHtml(pKey) + '"' + (isChecked ? ' checked' : '') + '> ' +
        '<div class="option-card__text">' +
          '<span class="option-card__title">' + escapeHtml(pName) + '</span>' +
          '<span class="option-card__subtitle">طباعة معالجة حرارياً</span>' +
        '</div>' +
      '</label>'
    );
  }).join("");

  grid.innerHTML = html;

  grid.querySelectorAll('input[name="placement"]').forEach(function (cb) {
    cb.addEventListener("change", function () {
      let checkedBoxes = grid.querySelectorAll('input[name="placement"]:checked');
      draft.specs.placements = Array.from(checkedBoxes).map(function (b) { return b.value; });
      grid.querySelectorAll(".option-card").forEach(function (card) {
        let input = card.querySelector("input");
        if (input && input.checked) {
          card.classList.add("is-checked");
        } else {
          card.classList.remove("is-checked");
        }
      });
      updateSummary();
      updateReadinessFeedback();
    });
  });
}

// -------------------------------------------------------------
// 5. حاسبة المقاسات والعداد الذكي للملابس
// -------------------------------------------------------------

function syncSizeInputs() {
  let inputs = document.querySelectorAll(".size-cell__input");
  inputs.forEach(function (input) {
    let size = input.getAttribute("data-size");
    if (draft.specs.sizes && draft.specs.sizes[size] !== undefined) {
      input.value = draft.specs.sizes[size];
    }
  });
}

function recalculateApparelSizes() {
  if (!draft.specs.sizes) draft.specs.sizes = {};

  let inputs = document.querySelectorAll(".size-cell__input");
  let currentSum = 0;
  inputs.forEach(function (input) {
    let size = input.getAttribute("data-size");
    let val = parseInt(input.value, 10) || 0;
    draft.specs.sizes[size] = val;
    currentSum += val;
  });

  let targetQty = parseInt(draft.quantity, 10) || 0;
  let banner = document.getElementById("size-balance-banner");
  let text = document.getElementById("size-balance-text");
  let badge = document.getElementById("size-balance-badge");

  if (!banner || !text || !badge) return;

  if (currentSum === targetQty) {
    banner.className = "size-balance-banner is-match";
    text.innerHTML = 'توزيع المقاسات متطابق: <span class="num">' + currentSum + '</span> من إجمالي <span class="num">' + targetQty + '</span> قطعة';
    badge.className = "badge badge--ready";
    badge.textContent = "اكتمال 100%";
  } else if (currentSum < targetQty) {
    let rem = targetQty - currentSum;
    banner.className = "size-balance-banner is-under";
    text.innerHTML = 'المجموع الحالي <span class="num">' + currentSum + '</span> من <span class="num">' + targetQty + '</span> قطعة (يتبقى <span class="num">' + rem + '</span> قطعة)';
    badge.className = "badge badge--review";
    badge.textContent = "غير مكتمل";
  } else {
    let excess = currentSum - targetQty;
    banner.className = "size-balance-banner is-over";
    text.innerHTML = 'المجموع الحالي <span class="num">' + currentSum + '</span> يتجاوز الإجمالي بمقدار <span class="num">' + excess + '</span> قطعة!';
    badge.className = "badge badge--rejected";
    badge.textContent = "فائض عن الكمية";
  }

  updateSummary();
  updateReadinessFeedback();
}

function adjustTotalQty(delta) {
  let input = document.getElementById("apparel-target-qty");
  if (!input) return;
  let val = Math.max(1, (parseInt(input.value, 10) || 0) + delta);
  input.value = val;
  draft.quantity = val;
  recalculateApparelSizes();
}

function adjustGiftQty(delta) {
  let input = document.getElementById("gift-qty-input");
  if (!input) return;
  let val = Math.max(1, (parseInt(input.value, 10) || 0) + delta);
  input.value = val;
  draft.quantity = val;
  updateSummary();
  updateReadinessFeedback();
}

// تبديل وحدات الستيكر
function setStickerUnit(unit) {
  draft.specs.unit = unit;
  let cmBtn = document.getElementById("unit-cm-btn");
  let mmBtn = document.getElementById("unit-mm-btn");
  let wUnit = document.getElementById("sticker-width-unit");
  let hUnit = document.getElementById("sticker-height-unit");
  let wInput = document.getElementById("sticker-width-input");
  let hInput = document.getElementById("sticker-height-input");

  if (unit === "cm") {
    if (cmBtn) cmBtn.classList.add("is-active");
    if (mmBtn) mmBtn.classList.remove("is-active");
    if (wUnit) wUnit.textContent = "سم";
    if (hUnit) hUnit.textContent = "سم";
    if (wInput && parseFloat(wInput.value) > 20) wInput.value = (parseFloat(wInput.value) / 10).toFixed(1);
    if (hInput && parseFloat(hInput.value) > 20) hInput.value = (parseFloat(hInput.value) / 10).toFixed(1);
  } else {
    if (mmBtn) mmBtn.classList.add("is-active");
    if (cmBtn) cmBtn.classList.remove("is-active");
    if (wUnit) wUnit.textContent = "مم";
    if (hUnit) hUnit.textContent = "مم";
    if (wInput && parseFloat(wInput.value) < 20) wInput.value = Math.round(parseFloat(wInput.value) * 10);
    if (hInput && parseFloat(hInput.value) < 20) hInput.value = Math.round(parseFloat(hInput.value) * 10);
  }

  if (wInput) draft.specs.width = parseFloat(wInput.value) || 0;
  if (hInput) draft.specs.height = parseFloat(hInput.value) || 0;

  updateSummary();
  updateReadinessFeedback();
}

// -------------------------------------------------------------
// 6. إدارة رفع ملفات التصميم والأعمال الفنية
// -------------------------------------------------------------

async function handleFileUpload(files) {
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    try {
      showToast("جارٍ رفع الملف: " + file.name + "...");
      let item = await uploadArtwork(file);
      draft.artwork.push(item);
      showToast("تم رفع الملف بنجاح: " + file.name, "success");
    } catch (err) {
      console.error("Upload error:", err);
      let msg = "فشل رفع الملف.";
      if (err.message === "file-type-not-allowed") {
        msg = "نوع الملف غير مدعوم. الصيغ المسموحة: PNG, JPG, WEBP, PDF.";
      } else if (err.message === "file-too-large") {
        msg = "حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت.";
      }
      showToast(msg, "error");
    }
  }

  renderUploadedFiles();
  updateSummary();
  updateReadinessFeedback();
}

function renderUploadedFiles() {
  let list = document.getElementById("uploaded-files-list");
  if (!list) return;

  if (draft.artwork.length === 0) {
    list.innerHTML = "";
    return;
  }

  let html = draft.artwork.map(function (item, index) {
    let isPdf = item.type === "application/pdf";
    let iconOrThumb = isPdf
      ? '<div class="uploaded-thumb" style="display:grid;place-items:center;font-weight:bold;color:var(--error);background:#fee">PDF</div>'
      : '<img src="' + escapeHtml(item.url || "") + '" class="uploaded-thumb" alt="معاينة الملف">';

    return (
      '<div class="uploaded-item">' +
        iconOrThumb +
        '<div class="uploaded-meta">' +
          '<span class="uploaded-name" title="' + escapeHtml(item.name) + '">' + escapeHtml(item.name) + '</span>' +
          '<span class="caption" style="color:var(--success)">جاهز للإرسال</span>' +
        '</div>' +
        '<button type="button" class="uploaded-del-btn" onclick="removeArtwork(' + index + ')" title="حذف الملف">' +
          '✕' +
        '</button>' +
      '</div>'
    );
  }).join("");

  list.innerHTML = html;
}

function removeArtwork(index) {
  draft.artwork.splice(index, 1);
  renderUploadedFiles();
  updateSummary();
  updateReadinessFeedback();
}

// -------------------------------------------------------------
// 7. مساعد جاهزية الطلب والملخص اللحظي (Readiness Assistant)
// -------------------------------------------------------------

function updateReadinessFeedback() {
  if (!selectedService) return;

  let check = checkReadiness(draft, selectedService);
  let panel = document.getElementById("readiness-panel");
  let list = document.getElementById("readiness-issues-list");
  let statusBadge = document.getElementById("readiness-status-badge");

  if (!panel || !list || !statusBadge) return;

  if (check.ready) {
    statusBadge.className = "badge badge--ready";
    statusBadge.textContent = "طلب مكتمل وجاهز ✓";
    list.innerHTML = '<li class="readiness__item is-ok"><span>كل البيانات المطلوبة مستوفاة ومطابقة لمعايير المشغل.</span></li>';
  } else {
    statusBadge.className = "badge badge--review";
    statusBadge.textContent = check.errorCount + " نواقص متبقية";

    let html = check.issues.map(function (issue, idx) {
      let itemClass = issue.severity === "error" ? "is-bad" : "is-bad";
      let fixBtn = "";
      if (issue.fix) {
        fixBtn = '<button type="button" class="readiness__fix-btn" onclick="applyFix(' + idx + ')">' +
          escapeHtml(issue.fix.label) +
          '</button>';
      }

      return (
        '<li class="readiness__item ' + itemClass + '">' +
          '<div>' +
            '<span>' + escapeHtml(issue.message) + '</span>' +
          '</div>' +
          fixBtn +
        '</li>'
      );
    }).join("");

    list.innerHTML = html;
  }
}

function applyFix(issueIndex) {
  let check = checkReadiness(draft, selectedService);
  let issue = check.issues[issueIndex];
  if (!issue || !issue.fix || !issue.fix.patch) return;

  let patch = issue.fix.patch;
  Object.keys(patch).forEach(function (key) {
    if (key === "quantity") {
      draft.quantity = patch[key];
      let qtyInput = document.getElementById("apparel-target-qty");
      if (qtyInput) qtyInput.value = patch[key];
    } else if (key === "designHelp") {
      draft.designHelp = patch[key];
      let cb = document.getElementById("design-help-checkbox");
      if (cb) cb.checked = patch[key];
    } else {
      draft[key] = patch[key];
    }
  });

  recalculateApparelSizes();
  updateSummary();
  updateReadinessFeedback();
  showToast("تم تطبيق التصحيح السريع بنجاح.", "success");
}

function updateSummary() {
  if (!selectedService) return;

  // اسم الخدمة
  let sName = document.getElementById("summary-service-name");
  if (sName) sName.textContent = selectedService.name;

  // إجمالي الكمية
  let sQty = document.getElementById("summary-quantity");
  if (sQty) sQty.innerHTML = '<span class="num">' + draft.quantity + '</span> قطعة';

  // اللون
  let colorRow = document.getElementById("summary-spec-color-row");
  let colorVal = document.getElementById("summary-color-val");
  if (colorRow && colorVal) {
    if (draft.specs && draft.specs.color) {
      colorRow.style.display = "flex";
      let cObj = (allOptions.colors || []).find(function (c) { return c.id === draft.specs.color; });
      colorVal.textContent = cObj ? cObj.name : draft.specs.color;
    } else {
      colorRow.style.display = "none";
    }
  }

  // تفاصيل المواصفة
  let detailRow = document.getElementById("summary-spec-detail-row");
  let detailVal = document.getElementById("summary-spec-detail-val");
  if (detailRow && detailVal) {
    let text = "";
    if (selectedService.formType === "apparel") {
      text = (draft.specs.placements && draft.specs.placements.length > 0)
        ? draft.specs.placements.join(" + ")
        : "بدون مواضع";
    } else if (selectedService.formType === "gift") {
      text = draft.specs.customText ? 'نص: "' + draft.specs.customText + '"' : "بدون نص مخصص";
    } else if (selectedService.formType === "sticker") {
      text = draft.specs.width + " × " + draft.specs.height + " " + (draft.specs.unit || "سم");
    } else {
      text = "طلب مخصص";
    }
    detailVal.textContent = text;
  }

  // عدد المرفقات
  let artworkCount = document.getElementById("summary-artwork-count");
  if (artworkCount) {
    if (draft.designHelp) {
      artworkCount.textContent = "طلب مساعدة في التصميم";
    } else if (draft.artwork.length > 0) {
      artworkCount.innerHTML = '<span class="num">' + draft.artwork.length + '</span> ملفات مرفوعة';
    } else {
      artworkCount.textContent = "لا توجد ملفات";
    }
  }

  // حساب السعر التقديري (سعر العينة * الكمية)
  let unitPrice = selectedService.priceFrom || 100;
  let estimatedTotal = unitPrice * (parseInt(draft.quantity, 10) || 1);
  let totalPriceElem = document.getElementById("summary-total-price");
  if (totalPriceElem) {
    totalPriceElem.innerHTML = '<span class="num">' + estimatedTotal.toLocaleString("en-US") + '</span> ج.م';
  }

  // شريط الموبايل الثابت
  let stickyTitle = document.getElementById("sticky-product-title");
  let stickyPrice = document.getElementById("sticky-product-price");
  if (stickyTitle) stickyTitle.textContent = selectedService.name;
  if (stickyPrice) {
    stickyPrice.innerHTML = 'المجموع التقديري: <span class="num">' + estimatedTotal.toLocaleString("en-US") + '</span> ج.م';
  }
}

// -------------------------------------------------------------
// 8. التنقل بين خطوات المعالج
// -------------------------------------------------------------

function goToStep(stepNumber) {
  if (stepNumber < 1 || stepNumber > 3) return;

  // التحقق قبل التقدم
  if (stepNumber > currentStep) {
    if (currentStep === 1) {
      let descInput = document.getElementById("order-desc-input");
      if (descInput && !descInput.value.trim()) {
        descInput.focus();
        showToast("يرجى كتابة وصف مختصر للطلب قبل المتابعة.", "error");
        return;
      }
    }
  }

  currentStep = stepNumber;

  // تحديث مؤشرات الخطوات
  for (let s = 1; s <= 3; s++) {
    let navItem = document.getElementById("step-nav-1");
    let navElem = document.getElementById("step-nav-" + s);
    let paneElem = document.getElementById("step-pane-" + s);

    if (navElem) {
      navElem.classList.remove("is-current", "is-done");
      if (s < currentStep) {
        navElem.classList.add("is-done");
      } else if (s === currentStep) {
        navElem.classList.add("is-current");
      }
    }

    if (paneElem) {
      if (s === currentStep) {
        paneElem.classList.add("is-active");
      } else {
        paneElem.classList.remove("is-active");
      }
    }
  }

  // التمرير لأعلى المعالج
  let wizard = document.getElementById("wizard-section");
  if (wizard) {
    wizard.scrollIntoView({ behavior: "smooth" });
  }

  updateReadinessFeedback();
}

function handleStickyAction() {
  if (currentStep < 3) {
    goToStep(currentStep + 1);
  } else {
    handleOrderSubmit();
  }
}

// -------------------------------------------------------------
// 9. إرسال الطلب للاعتماد (Submit Order)
// -------------------------------------------------------------

async function handleOrderSubmit() {
  console.log("Submitting order draft:", draft);

  // تحديث بيانات العميل من الحقول
  let nameInput = document.getElementById("customer-name-input");
  let phoneInput = document.getElementById("customer-phone-input");
  let emailInput = document.getElementById("customer-email-input");
  let dateInput = document.getElementById("requested-date-input");
  let descInput = document.getElementById("order-desc-input");
  let notesInput = document.getElementById("order-notes-input");

  draft.customer.name = nameInput ? nameInput.value.trim() : "";
  draft.customer.phone = phoneInput ? phoneInput.value.trim() : "";
  draft.customer.email = emailInput ? emailInput.value.trim() : "";
  draft.requestedDate = dateInput ? dateInput.value.trim() : "";

  let baseDesc = descInput ? descInput.value.trim() : "";
  let extraNotes = notesInput ? notesInput.value.trim() : "";
  draft.description = baseDesc + (extraNotes ? " | ملاحظات: " + extraNotes : "");

  let check = checkReadiness(draft, selectedService);
  if (!check.ready) {
    updateReadinessFeedback();
    showToast("لا يمكن إرسال الطلب: يرجى استكمال النواقص الموضحة في لوحة الجاهزية.", "error");
    goToStep(3);
    return;
  }

  let submitBtn = document.getElementById("submit-order-btn");
  if (submitBtn) submitBtn.classList.add("is-loading");

  try {
    let result = await submitOrder(draft);
    if (result.ok && result.order) {
      console.log("Order submitted successfully:", result.order.id);
      showOrderSuccessScreen(result.order);
    } else if (result.issues) {
      showToast("توجد نواقص في الطلب تمنع الإرسال.", "error");
      updateReadinessFeedback();
    } else {
      showToast("خطأ من السيرفر: " + (result.error || "تعذر إرسال الطلب."), "error");
    }
  } catch (err) {
    console.error("Order submission failed:", err);
    showToast("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.", "error");
  } finally {
    if (submitBtn) submitBtn.classList.remove("is-loading");
  }
}

function showOrderSuccessScreen(order) {
  let formContainer = document.getElementById("wizard-form-container");
  let successScreen = document.getElementById("success-screen");
  let orderIdElem = document.getElementById("success-order-id");
  let trackBtn = document.getElementById("success-track-btn");
  let whatsappBtn = document.getElementById("success-whatsapp-btn");

  if (formContainer) formContainer.style.display = "none";
  if (successScreen) successScreen.style.display = "flex";
  if (orderIdElem) orderIdElem.textContent = order.id;

  if (trackBtn) {
    trackBtn.href = "track.html?order=" + encodeURIComponent(order.id);
  }

  if (whatsappBtn) {
    let msg = "مرحباً استوديو يوزرسيف، قمت بتقديم طلب جديد برقم " + order.id + " لخدمة " + (selectedService ? selectedService.name : "") + ". أرجو مراجعته وتأكيده.";
    whatsappBtn.href = "https://wa.me/201116891025?text=" + encodeURIComponent(msg);
  }

  successScreen.scrollIntoView({ behavior: "smooth" });
}

function resetRequestWizard() {
  window.location.href = "services.html";
}

// -------------------------------------------------------------
// 10. إعداد مستمعي الأحداث (Event Listeners)
// -------------------------------------------------------------

function setupEventListeners() {
  // أزرار تغيير الخدمة لإعادة إظهار الكتالوج
  let changeBtn = document.getElementById("btn-change-service");
  if (changeBtn) changeBtn.addEventListener("click", expandCatalogBrowser);

  let changeBtnInner = document.getElementById("btn-change-service-inner");
  if (changeBtnInner) changeBtnInner.addEventListener("click", expandCatalogBrowser);

  // مؤشرات خطوات المعالج العلوية
  document.querySelectorAll(".wizard-step-item").forEach(function (item) {
    item.addEventListener("click", function () {
      let sNum = parseInt(item.getAttribute("data-step"), 10);
      if (sNum) goToStep(sNum);
    });
  });

  // مدخلات مقاسات الملابس
  document.querySelectorAll(".size-cell__input").forEach(function (inp) {
    inp.addEventListener("input", recalculateApparelSizes);
  });

  let targetQtyInp = document.getElementById("apparel-target-qty");
  if (targetQtyInp) {
    targetQtyInp.addEventListener("input", function () {
      draft.quantity = parseInt(targetQtyInp.value, 10) || 1;
      recalculateApparelSizes();
    });
  }

  // مدخلات الهاتف والاسم والتاريخ
  let nameInp = document.getElementById("customer-name-input");
  if (nameInp) {
    nameInp.addEventListener("input", function () {
      draft.customer.name = nameInp.value.trim();
      updateReadinessFeedback();
    });
  }

  let phoneInp = document.getElementById("customer-phone-input");
  if (phoneInp) {
    phoneInp.addEventListener("input", function () {
      draft.customer.phone = phoneInp.value.trim();
      updateReadinessFeedback();
    });
  }

  let emailInp = document.getElementById("customer-email-input");
  if (emailInp) {
    emailInp.addEventListener("input", function () {
      draft.customer.email = emailInp.value.trim();
      updateReadinessFeedback();
    });
  }

  let dateInp = document.getElementById("requested-date-input");
  if (dateInp) {
    dateInp.addEventListener("change", function () {
      draft.requestedDate = dateInp.value;
      updateReadinessFeedback();
    });
  }

  let descInp = document.getElementById("order-desc-input");
  if (descInp) {
    descInp.addEventListener("input", function () {
      draft.description = descInp.value.trim();
      updateReadinessFeedback();
    });
  }

  // خيارات الاستلام
  document.querySelectorAll('input[name="pickup-mode"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      draft.pickup = radio.value;
      document.querySelectorAll(".pickup-option").forEach(function (opt) {
        let r = opt.querySelector("input");
        if (r && r.checked) {
          opt.classList.add("is-active");
        } else {
          opt.classList.remove("is-active");
        }
      });
      updateReadinessFeedback();
    });
  });

  // موديل الهاتف
  let phoneSelect = document.getElementById("phone-model-select");
  if (phoneSelect) {
    phoneSelect.addEventListener("change", function () {
      draft.specs.phoneModel = phoneSelect.value;
      updateSummary();
      updateReadinessFeedback();
    });
  }

  // نص التخصيص
  let customTextInput = document.getElementById("custom-text-input");
  if (customTextInput) {
    customTextInput.addEventListener("input", function () {
      draft.specs.customText = customTextInput.value.trim();
      updateSummary();
      updateReadinessFeedback();
    });
  }

  // أبعاد الستيكرات
  let wInput = document.getElementById("sticker-width-input");
  let hInput = document.getElementById("sticker-height-input");
  if (wInput) {
    wInput.addEventListener("input", function () {
      draft.specs.width = parseFloat(wInput.value) || 0;
      updateSummary();
      updateReadinessFeedback();
    });
  }
  if (hInput) {
    hInput.addEventListener("input", function () {
      draft.specs.height = parseFloat(hInput.value) || 0;
      updateSummary();
      updateReadinessFeedback();
    });
  }

  // استخدام الستيكر
  let useSelect = document.getElementById("sticker-use-select");
  if (useSelect) {
    useSelect.addEventListener("change", function () {
      draft.specs.use = useSelect.value;
      updateSummary();
      updateReadinessFeedback();
    });
  }

  // كمية الستيكرات
  let stickerQtySelect = document.getElementById("sticker-qty-select");
  if (stickerQtySelect) {
    stickerQtySelect.addEventListener("change", function () {
      draft.quantity = parseInt(stickerQtySelect.value, 10) || 50;
      updateSummary();
      updateReadinessFeedback();
    });
  }

  // كمية الهدايا
  let giftQtyInput = document.getElementById("gift-qty-input");
  if (giftQtyInput) {
    giftQtyInput.addEventListener("input", function () {
      draft.quantity = parseInt(giftQtyInput.value, 10) || 1;
      updateSummary();
      updateReadinessFeedback();
    });
  }

  // مساعدة في التصميم
  let designHelpCb = document.getElementById("design-help-checkbox");
  if (designHelpCb) {
    designHelpCb.addEventListener("change", function () {
      draft.designHelp = designHelpCb.checked;
      updateSummary();
      updateReadinessFeedback();
    });
  }

  // رفع الملفات - السحب والإفلات
  let dropzone = document.getElementById("artwork-dropzone");
  let fileInput = document.getElementById("artwork-file-input");

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", function () {
      fileInput.click();
    });

    fileInput.addEventListener("change", function () {
      handleFileUpload(fileInput.files);
      fileInput.value = "";
    });

    ["dragenter", "dragover"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("is-dragover");
      });
    });

    dropzone.addEventListener("drop", function (e) {
      let dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleFileUpload(dt.files);
      }
    });
  }
}

// تنبيه Toast بسيط
function showToast(msg, type) {
  let toasts = document.querySelector(".toasts");
  if (!toasts) {
    toasts = document.createElement("div");
    toasts.className = "toasts";
    document.body.appendChild(toasts);
  }
  let t = document.createElement("div");
  t.className = "toast" + (type ? " toast--" + type : "");
  t.textContent = msg;
  toasts.appendChild(t);
  setTimeout(function () {
    if (t.parentNode) t.parentNode.removeChild(t);
  }, 4000);
}

// بدء التشغيل
document.addEventListener("DOMContentLoaded", initRequestPage);
