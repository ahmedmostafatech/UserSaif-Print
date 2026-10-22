// readiness.js — مساعد جاهزية الطلب
// دالة بسيطة بقواعد واضحة: بتاخد الطلب والخدمة وترجع النواقص والتعارضات
// ملاحظة: حمّله بعد schema.js (بيستخدم sumSizes)

// تحويل الأرقام العربية والفارسية إلى أرقام إنجليزية
function toWesternDigits(text) {
  let s = String(text == null ? "" : text);
  s = s.replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
  s = s.replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
  return s;
}

// توحيد شكل رقم الهاتف: 01012345678
function normalizePhone(phone) {
  let digits = toWesternDigits(phone).replace(/\D/g, "");
  if (digits.indexOf("20") === 0 && digits.length === 12) {
    digits = "0" + digits.slice(2);
  }
  return digits;
}

function isValidEgyptPhone(phone) {
  return /^01[0125]\d{8}$/.test(normalizePhone(phone));
}

function hasValue(v) {
  return v !== null && v !== undefined && String(v).trim() !== "";
}

function todayIso() {
  let d = new Date();
  let m = String(d.getMonth() + 1).padStart(2, "0");
  let day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

// order: بيانات الطلب (نفس شكل الطلب في data.json)
// service: الخدمة المختارة (من getService)
// الناتج: { ready, errorCount, issues: [ { code, field, severity, message, fix } ] }
// severity: error يمنع الإرسال، warning مجرد تنبيه
// fix (اختياري): { label, patch } لإصلاح بضغطة واحدة: ادمج patch في الطلب
function checkReadiness(order, service) {
  let issues = [];

  function add(code, field, message, severity, fix) {
    issues.push({
      code: code,
      field: field,
      severity: severity || "error",
      message: message,
      fix: fix || null
    });
  }

  function finish() {
    let errorCount = issues.filter(function (i) { return i.severity === "error"; }).length;
    return { ready: errorCount === 0, errorCount: errorCount, issues: issues };
  }

  order = order || {};

  if (!service) {
    add("no-service", "serviceId", "اختر الخدمة أولًا.");
    return finish();
  }

  let fields = service.fields || [];
  let specs = order.specs || {};
  let customer = order.customer || {};
  let artwork = order.artwork || [];
  let qty = Number(order.quantity);
  let qtyValid = Number.isInteger(qty) && qty >= 1;

  // الكمية
  if (!qtyValid) {
    add("quantity", "quantity", "حدد الكمية (رقم صحيح أكبر من صفر).");
  }

  // الوصف
  if (!hasValue(order.description)) {
    add("description", "description", "اكتب وصفًا مختصرًا لطلبك.");
  }

  // اللون
  if (fields.indexOf("color") !== -1 && !hasValue(specs.color)) {
    add("color", "color", "اختر لون المنتج.");
  }

  // مكان الطباعة
  if (fields.indexOf("placement") !== -1) {
    if (!specs.placements || specs.placements.length === 0) {
      add("placement", "placements", "اختر مكان الطباعة.");
    }
  }

  // المقاسات: لازم المجموع يساوي الكمية
  if (fields.indexOf("sizes") !== -1) {
    let sum = sumSizes(specs.sizes);
    if (sum === 0) {
      add("sizes-empty", "sizes", "وزّع الكمية على المقاسات.");
    } else if (qtyValid && sum !== qty) {
      add(
        "sizes-mismatch", "sizes",
        "مجموع المقاسات (" + sum + ") لا يساوي الكمية (" + qty + ").",
        "error",
        { label: "اجعل الكمية " + sum, patch: { quantity: sum } }
      );
    }
  }

  // طراز الموبايل
  if (fields.indexOf("phoneModel") !== -1 && !hasValue(specs.phoneModel)) {
    add("phone-model", "phoneModel", "اختر طراز الموبايل.");
  }

  // أبعاد الاستيكرات والليبلز
  if (fields.indexOf("dimensions") !== -1) {
    if (!(Number(specs.width) > 0) || !(Number(specs.height) > 0)) {
      add("dimensions", "width", "حدد العرض والارتفاع.");
    }
    if (!hasValue(specs.unit)) {
      add("unit", "unit", "اختر وحدة القياس (سم أو مم).");
    }
  }
  if (fields.indexOf("shape") !== -1 && !hasValue(specs.shape)) {
    add("shape", "shape", "اختر الشكل.");
  }
  if (fields.indexOf("use") !== -1 && !hasValue(specs.use)) {
    add("use", "use", "اختر الاستخدام المقصود.");
  }

  // التصميم: ملف أو مساعدة في التصميم أو نص تخصيص (للهدايا)
  let textIsEnough = fields.indexOf("customText") !== -1 && hasValue(specs.customText);
  if (artwork.length === 0 && !order.designHelp && !textIsEnough) {
    add(
      "artwork", "artwork",
      "ارفع تصميمك أو اختر «أحتاج مساعدة في التصميم».",
      "error",
      { label: "أحتاج مساعدة في التصميم", patch: { designHelp: true } }
    );
  }

  // بيانات العميل
  if (!hasValue(customer.name)) {
    add("name", "name", "اكتب اسمك.");
  }
  if (!hasValue(customer.phone)) {
    add("phone", "phone", "اكتب رقم الهاتف.");
  } else if (!isValidEgyptPhone(customer.phone)) {
    add("phone-invalid", "phone", "رقم الهاتف غير صحيح. مثال: 01012345678");
  }
  if (hasValue(customer.email) && !/^\S+@\S+\.\S+$/.test(customer.email)) {
    add("email-invalid", "email", "البريد الإلكتروني غير صحيح.", "warning");
  }

  // التاريخ والاستلام
  if (!hasValue(order.requestedDate)) {
    add("date", "requestedDate", "اختر التاريخ المطلوب.");
  } else if (order.requestedDate < todayIso()) {
    add("date-past", "requestedDate", "التاريخ المطلوب في الماضي، راجعه.", "warning");
  }
  if (!hasValue(order.pickup)) {
    add("pickup", "pickup", "اختر الاستلام أو التوصيل.");
  }

  return finish();
}