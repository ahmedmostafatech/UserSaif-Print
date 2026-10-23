// page-track.js — منطق صفحة تتبع الطلب
// الترتيب المطلوب في الصفحة: supabase-js ← config.js ← schema.js ← readiness.js ← api.js ← page-track.js
// الدوال المستخدمة من الملفات المشتركة: trackOrder و resubmitOrder و uploadArtwork و getService و getOptions و getSettings

(function () {
  // حالة الصفحة
  let state = { order: null, phone: "", service: null, options: null, settings: null };

  let DATE_LOCALE = "ar-EG-u-nu-latn"; // تواريخ عربية بأرقام إنجليزية

  // رسائل الأخطاء بالعربي (الترتيب مهم: أول تطابق يكسب)
  let ERROR_MESSAGES = [
    ["too-many-attempts", "حاولت عدة مرات بدون نجاح. جرّب مرة أخرى بعد 15 دقيقة."],
    ["not-rejected", "لا يمكن إعادة إرسال هذا الطلب لأنه ليس مرفوضًا."],
    ["not-found", "تعذر العثور على الطلب."],
    ["artwork-required", "ارفع تصميمك أو اختر «أحتاج مساعدة في التصميم»."],
    ["invalid-artwork", "تعذر قبول الملفات المرفوعة. جرّب ملفًا آخر."],
    ["file-type-not-allowed", "نوع الملف غير مسموح. استخدم PNG أو JPG أو WEBP أو PDF."],
    ["file-too-large", "حجم الملف أكبر من 10 ميجابايت."],
    ["invalid-date", "التاريخ المطلوب غير صحيح."],
    ["invalid-description", "وصف الطلب غير صالح. اكتب وصفًا مختصرًا."],
    ["sizes-mismatch", "مجموع المقاسات لا يطابق الكمية. تواصل معنا عبر واتساب لتعديلها."],
    ["missing-sizes", "المقاسات غير مكتملة. تواصل معنا عبر واتساب لتعديلها."],
    ["phone-required", "رقم الهاتف مطلوب لإعادة الإرسال."]
  ];

  // ---------- أدوات صغيرة ----------

  function $(id) {
    return document.getElementById(id);
  }

  // تأمين النصوص قبل وضعها في HTML (الوصف وملاحظات الطلب من مستخدمين)
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

  // رابط واتساب (الرقم المنشور في البريف، ويجب تأكيده قبل الإطلاق)
  function waLink(message) {
    let number = state.settings && state.settings.whatsapp ? state.settings.whatsapp : "";
    if (!number) return "";
    let url = "https://wa.me/2" + number;
    if (message) url += "?text=" + encodeURIComponent(message);
    return url;
  }

  function showToast(text) {
    let box = $("toasts");
    let el = document.createElement("div");
    el.className = "toast toast--success";
    el.textContent = text;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 3500);
  }

  // ---------- أخطاء النموذج ----------

  function setFieldError(fieldId, errorId, message) {
    let field = $(fieldId);
    field.classList.add("has-error");
    $(errorId).textContent = message;
    let input = field.querySelector("input");
    if (input) input.setAttribute("aria-invalid", "true");
  }

  function clearErrors() {
    ["field-order", "field-phone"].forEach(function (id) {
      let field = $(id);
      field.classList.remove("has-error");
      let input = field.querySelector("input");
      if (input) input.removeAttribute("aria-invalid");
    });
    $("order-error").textContent = "";
    $("phone-error").textContent = "";
    $("lookup-alert").hidden = true;
  }

  function showLookupAlert(title, text, withWhatsapp) {
    let box = $("lookup-alert");
    let html = "<strong>" + esc(title) + "</strong><span>" + esc(text) + "</span>";
    let link = waLink("مرحبًا يوزرسيف، أحتاج مساعدة في تتبع طلبي");
    if (withWhatsapp && link) {
      html += '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">تواصل معنا عبر واتساب ←</a>';
    }
    box.innerHTML = html;
    box.hidden = false;
  }

  function setLookupLoading(loading) {
    let btn = $("lookup-btn");
    btn.classList.toggle("is-loading", loading);
    btn.disabled = loading;
    btn.setAttribute("aria-busy", String(loading));
  }

  // ---------- عرض النتيجة ----------

  function buildDetailRows(order) {
    let specs = order.specs || {};
    let opts = state.options || {};
    let rows = [];

    rows.push(["الخدمة", esc(state.service ? state.service.name : order.serviceId)]);
    rows.push(["الكمية", numHtml(order.quantity)]);

    if (specs.color) rows.push(["اللون", esc(nameOf(opts.colors, specs.color))]);

    if (specs.sizes) {
      let parts = Object.keys(specs.sizes)
        .filter(function (key) { return Number(specs.sizes[key]) > 0; })
        .map(function (key) { return numHtml(key + ": " + specs.sizes[key]); });
      if (parts.length > 0) rows.push(["المقاسات", parts.join(" · ")]);
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
    if (order.requestedDate) rows.push(["التاريخ المطلوب", esc(formatDate(order.requestedDate))]);
    if (order.designHelp) rows.push(["التصميم", "طلبت مساعدة في التصميم"]);

    if (order.artwork && order.artwork.length > 0) {
      let names = order.artwork.map(function (item) { return esc(item.name); });
      rows.push(["الملفات المرفقة", names.join("<br>")]);
    }

    if (order.estimatedTotal !== null && order.estimatedTotal !== undefined) {
      rows.push([
        "الإجمالي التقديري",
        numHtml(formatMoney(order.estimatedTotal)) + " ج.م"
      ]);
    } else {
      rows.push(["السعر", "حسب الطلب"]);
    }

    return rows;
  }

  function renderResult(order) {
    let status = order.status;
    let steps = getTimelineState(status);
    if (status === "ready") steps[steps.length - 1].state = "done";
    if (status === "rejected") steps = steps.slice(0, 3);

    // نص المرحلة الحالية
    let stageText = "";
    if (status === "rejected") {
      stageText = "تم رفض الطلب";
    } else if (status === "ready") {
      stageText = "اكتملت كل المراحل";
    } else {
      let index = 0;
      steps.forEach(function (step, i) {
        if (step.state === "current") index = i;
      });
      stageText = "المرحلة " + (index + 1) + " من " + steps.length;
    }

    let stateWords = { done: "مكتملة", current: "الحالية", rejected: "مرفوض", upcoming: "قادمة" };
    let timelineHtml = steps.map(function (step, i) {
      let mark = String(i + 1);
      if (step.state === "done") mark = "✓";
      if (step.state === "rejected") mark = "✕";
      let current = (step.state === "current" || step.state === "rejected") ? ' aria-current="step"' : "";
      return '<li class="is-' + step.state + '"' + current + ">" +
        '<span class="timeline__dot" aria-hidden="true">' + mark + "</span>" +
        "<span>" + esc(step.label) + "</span>" +
        '<span class="sr-only">(' + stateWords[step.state] + ")</span></li>";
    }).join("");

    // الخطوة التالية وملاحظة صاحب المشروع، أو سبب الرفض
    let guidanceHtml = "";
    let waText = "مرحبًا يوزرسيف، أستفسر عن الطلب " + order.id;
    if (status === "rejected") {
      let reason = order.rejectionReason || order.ownerNote || "";
      let link = waLink(waText);
      guidanceHtml =
        '<div class="track-rejection">' +
        "<h3>سبب الرفض</h3>" +
        "<p>" + esc(reason) + "</p>" +
        "</div>" +
        '<div class="track-next" style="margin-block-start:var(--s-2)">' +
        '<span class="track-eyebrow">الخطوة التالية</span>' +
        "<p>" + esc(NEXT_STEP.rejected) + "</p>" +
        "</div>" +
        '<div class="track-actions">' +
        '<button class="btn btn--primary" type="button" data-action="resubmit">عدّل الطلب وأعد الإرسال</button>' +
        (link ? '<a class="btn btn--secondary" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">تواصل عبر واتساب</a>' : "") +
        "</div>";
    } else {
      guidanceHtml =
        '<div class="track-next">' +
        '<span class="track-eyebrow">الخطوة التالية</span>' +
        "<p>" + esc(NEXT_STEP[status]) + "</p>" +
        "</div>";
      if (order.ownerNote) {
        guidanceHtml +=
          '<div class="track-note">' +
          '<span class="track-eyebrow">ملاحظة صاحب المشروع</span>' +
          "<p>" + esc(order.ownerNote) + "</p>" +
          "</div>";
      }
    }

    // سجل الطلب (الأحدث أولًا)
    let logHtml = (order.log || []).slice().reverse().map(function (entry) {
      return '<li><time datetime="' + esc(entry.at) + '">' + esc(formatDateTime(entry.at)) + "</time>" +
        '<span class="track-log__text">' + esc(entry.text) + "</span></li>";
    }).join("");

    // تفاصيل الطلب
    let detailsHtml = buildDetailRows(order).map(function (row) {
      return "<div><dt>" + esc(row[0]) + "</dt><dd>" + row[1] + "</dd></div>";
    }).join("");

    // بطاقة واتساب
    let waUrl = waLink(waText);
    let waNumber = state.settings && state.settings.whatsapp ? state.settings.whatsapp : "";
    let waVerified = state.settings && state.settings.whatsappVerified;
    let waHtml = "";
    if (waUrl) {
      waHtml =
        '<div class="card card--dark grain track-wa track-rise track-rise--3">' +
        "<h3>عندك سؤال عن طلبك؟</h3>" +
        "<p>راسلنا على واتساب وسنرد عليك.</p>" +
        '<a class="btn btn--light btn--block" href="' + esc(waUrl) + '" target="_blank" rel="noopener noreferrer">راسلنا على واتساب</a>' +
        '<span class="track-wa__note">' + numHtml(waNumber) + (waVerified ? "" : " · يجب تأكيده قبل الإطلاق") + "</span>" +
        "</div>";
    }

    let serviceName = state.service ? state.service.name : order.serviceId;

    $("result-body").innerHTML =
      '<section class="card card--dark grain track-banner track-rise">' +
      "<div>" +
      '<p class="track-banner__label">رقم الطلب</p>' +
      '<p class="track-banner__id">' + numHtml(order.id) + "</p>" +
      '<div class="row">' +
      '<span class="badge ' + STATUS_BADGE[status] + '">' + esc(STATUS_LABELS[status]) + "</span>" +
      '<span class="track-banner__stage">' + esc(stageText) + "</span>" +
      "</div></div>" +
      '<div class="track-banner__meta">' +
      '<p class="track-banner__service">' + esc(serviceName) + " · " + numHtml(order.quantity) + "</p>" +
      '<p class="caption" style="color:inherit">تاريخ الإرسال: ' + esc(formatDate(order.createdAt)) + "</p>" +
      "</div></section>" +

      '<div class="track-grid">' +
      '<div class="track-col">' +

      '<section class="card track-card track-rise track-rise--2" aria-label="مسار الطلب">' +
      '<div class="track-card__head"><h2 class="h4">مسار طلبك</h2></div>' +
      '<ol class="timeline" aria-label="مراحل الطلب">' + timelineHtml + "</ol>" +
      '<div style="margin-block-start:var(--s-4)">' + guidanceHtml + "</div>" +
      "</section>" +

      '<section class="card track-card track-rise track-rise--3" aria-label="سجل الطلب">' +
      '<div class="track-card__head"><h3 class="h4">سجل الطلب</h3></div>' +
      '<ol class="log">' + logHtml + "</ol>" +
      "</section>" +

      "</div>" +

      '<aside class="track-aside">' +
      '<section class="card track-card track-rise track-rise--2" aria-label="تفاصيل الطلب">' +
      '<div class="track-card__head"><h3 class="h4">تفاصيل الطلب</h3></div>' +
      '<dl class="track-details">' + detailsHtml + "</dl>" +
      '<p class="caption track-details__note">التاريخ المطلوب تاريخ مفضّل وليس وعدًا بالتسليم. السعر النهائي يؤكده صاحب المشروع.</p>' +
      "</section>" +
      waHtml +
      "</aside>" +
      "</div>";
  }

  async function showOrder(order, phone) {
    state.order = order;
    state.phone = phone;

    let loaded = await Promise.all([getService(order.serviceId), getOptions(), getSettings()]);
    state.service = loaded[0];
    state.options = loaded[1];
    state.settings = loaded[2];

    renderResult(order);
    $("lookup-view").hidden = true;
    $("result-view").hidden = false;
    window.scrollTo(0, 0);
    $("result-view").focus();
    console.log("Order displayed:", order.id, order.status);
  }

  function resetToLookup() {
    state.order = null;
    state.phone = "";
    $("result-view").hidden = true;
    $("result-body").innerHTML = "";
    $("lookup-view").hidden = false;
    $("phone").value = "";
    clearErrors();
    $("order-id").focus();
  }

  // ---------- البحث ----------

  async function handleLookup(event) {
    event.preventDefault();
    clearErrors();

    let orderValue = $("order-id").value.trim();
    let phoneValue = $("phone").value.trim();
    let hasError = false;

    if (!orderValue) {
      setFieldError("field-order", "order-error", "اكتب رقم الطلب.");
      hasError = true;
    }
    if (!phoneValue) {
      setFieldError("field-phone", "phone-error", "اكتب رقم الهاتف.");
      hasError = true;
    } else if (!isValidEgyptPhone(phoneValue)) {
      setFieldError("field-phone", "phone-error", "رقم الهاتف غير صحيح. مثال: 01012345678");
      hasError = true;
    }
    if (hasError) {
      let firstBad = document.querySelector(".field.has-error input");
      if (firstBad) firstBad.focus();
      return;
    }

    setLookupLoading(true);
    try {
      let order = await trackOrder(orderValue, phoneValue);
      if (!order) {
        // رسالة موحدة، لا نكشف هل الرقم أو الهاتف هو الغلط
        showLookupAlert(
          "تعذر العثور على طلب مطابق",
          "تأكد من رقم الطلب ورقم الهاتف المسجل به وحاول مرة أخرى.",
          true
        );
        return;
      }
      await showOrder(order, phoneValue);
    } catch (err) {
      console.log("Track failed:", err.message);
      showLookupAlert("تعذر تنفيذ البحث", friendlyError(err.message), false);
    } finally {
      setLookupLoading(false);
    }
  }

  // ---------- تعديل وإعادة إرسال الطلب المرفوض ----------

  function showResubmitAlert(message) {
    let box = $("rs-alert");
    box.textContent = message;
    box.hidden = false;
  }

  function openResubmit() {
    let order = state.order;
    if (!order) return;
    $("rs-description").value = order.description || "";
    $("rs-date").value = order.requestedDate ? String(order.requestedDate).slice(0, 10) : "";
    $("rs-date").min = todayIso();
    $("rs-help").checked = !!order.designHelp;
    $("rs-files").value = "";
    $("rs-alert").hidden = true;
    $("resubmit-dialog").showModal();
  }

  function setResubmitLoading(loading) {
    let btn = $("rs-submit");
    btn.classList.toggle("is-loading", loading);
    btn.disabled = loading;
    btn.setAttribute("aria-busy", String(loading));
  }

  async function handleResubmit(event) {
    event.preventDefault();
    let order = state.order;
    if (!order) return;

    $("rs-alert").hidden = true;
    let description = $("rs-description").value.trim();
    let date = $("rs-date").value;
    let files = Array.prototype.slice.call($("rs-files").files);

    if (!description) {
      showResubmitAlert("اكتب وصفًا لطلبك.");
      return;
    }
    if (!date) {
      showResubmitAlert("اختر التاريخ المطلوب.");
      return;
    }
    if (files.length > 5) {
      showResubmitAlert("الحد الأقصى 5 ملفات.");
      return;
    }

    setResubmitLoading(true);
    try {
      let changes = { description: description, requestedDate: date, designHelp: $("rs-help").checked };

      if (files.length > 0) {
        let uploaded = [];
        for (let i = 0; i < files.length; i++) {
          uploaded.push(await uploadArtwork(files[i]));
        }
        changes.artwork = uploaded;
      }

      let result = await resubmitOrder(order.id, changes, state.phone);
      if (!result.ok) {
        showResubmitAlert(friendlyError(result.error));
        return;
      }

      // نعيد قراءة الطلب عبر التتبع (نسخة العميل بدون مسارات الملفات)
      let fresh = await trackOrder(order.id, state.phone);
      $("resubmit-dialog").close();
      if (fresh) {
        state.order = fresh;
        renderResult(fresh);
        window.scrollTo(0, 0);
      }
      showToast("تم إرسال طلبك مرة أخرى");
      console.log("Order resubmitted:", order.id);
    } catch (err) {
      console.log("Resubmit failed:", err.message);
      showResubmitAlert(friendlyError(err.message));
    } finally {
      setResubmitLoading(false);
    }
  }

  // ---------- التشغيل ----------

  function renderStepsPreview() {
    $("steps-preview").innerHTML = TIMELINE_STEPS.map(function (step) {
      return "<li>" + esc(step.label) + "</li>";
    }).join("");
  }

  async function init() {
    renderStepsPreview();

    $("lookup-form").addEventListener("submit", handleLookup);
    $("again-btn").addEventListener("click", resetToLookup);
    $("resubmit-form").addEventListener("submit", handleResubmit);
    $("rs-cancel").addEventListener("click", function () { $("resubmit-dialog").close(); });
    $("result-view").addEventListener("click", function (event) {
      let button = event.target.closest("[data-action]");
      if (button && button.getAttribute("data-action") === "resubmit") openResubmit();
    });

    // ملء رقم الطلب من الرابط: track.html?order=YS-1042
    let fromUrl = new URLSearchParams(location.search).get("order");
    if (fromUrl) {
      $("order-id").value = fromUrl;
      $("phone").focus();
    }

    // الإعدادات (رقم الواتساب) لتظهر روابط المساعدة
    try {
      state.settings = await getSettings();
      let link = waLink("مرحبًا يوزرسيف، لا أجد رقم طلبي");
      if (link) {
        let help = $("help-whatsapp");
        help.innerHTML = 'لو لم تجد رقم طلبك، <a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">راسلنا على واتساب</a>.';
        help.hidden = false;
      }
    } catch (err) {
      console.log("Settings load failed:", err.message);
    }
    console.log("Track page ready");
  }

  init();
})();