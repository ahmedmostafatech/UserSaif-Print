// schema.js — الثوابت المشتركة بين كل الصفحات (الحالات والتسميات)
// ملاحظة: الملف بيعرّف متغيرات عامة، حمّله قبل أي سكريبت بيستخدمها

// الحالات الست للطلب
let STATUSES = ["received", "review", "approved", "rejected", "in_progress", "ready"];

// التسميات العربية
let STATUS_LABELS = {
  received: "تم الاستلام",
  review: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  in_progress: "قيد التنفيذ",
  ready: "جاهز للاستلام"
};

// كلاس الشارة المقابل لكل حالة (موجود في components.css)
let STATUS_BADGE = {
  received: "badge--received",
  review: "badge--review",
  approved: "badge--approved",
  rejected: "badge--rejected",
  in_progress: "badge--progress",
  ready: "badge--ready"
};

// الخطوة التالية بلغة بسيطة، تظهر للعميل في صفحة التتبع
let NEXT_STEP = {
  received: "سيبدأ صاحب المشروع مراجعة طلبك.",
  review: "نراجع طلبك الآن، وسيظهر القرار هنا.",
  approved: "تمت الموافقة على طلبك، وسيبدأ التنفيذ قريبًا.",
  rejected: "يمكنك تعديل الطلب وإعادة إرساله.",
  in_progress: "طلبك قيد التنفيذ الآن.",
  ready: "طلبك جاهز، تواصل معنا لترتيب الاستلام."
};

// خطوات التايم لاين (الخطوة الثالثة هي القرار: مقبول أو مرفوض)
let TIMELINE_STEPS = [
  { key: "received", label: "تم الاستلام" },
  { key: "review", label: "قيد المراجعة" },
  { key: "decision", label: "مقبول أو مرفوض" },
  { key: "in_progress", label: "قيد التنفيذ" },
  { key: "ready", label: "جاهز للاستلام" }
];

// مجموع المقاسات (بيستخدمه العداد في الـ wizard ومساعد الجاهزية)
function sumSizes(sizes) {
  let total = 0;
  if (!sizes) return total;
  Object.keys(sizes).forEach(function (key) {
    total += Number(sizes[key]) || 0;
  });
  return total;
}

// حالة كل خطوة في التايم لاين حسب حالة الطلب
// state = done | current | rejected | upcoming
// الكلاس في components.css: "is-" + state
function getTimelineState(status) {
  let order = { received: 0, review: 1, approved: 2, rejected: 2, in_progress: 3, ready: 4 };
  let current = order[status];

  return TIMELINE_STEPS.map(function (step, i) {
    let state = "upcoming";
    if (i < current) state = "done";
    if (i === current) state = (status === "rejected") ? "rejected" : "current";

    let label = step.label;
    if (i === 2 && status === "rejected") label = "مرفوض";
    else if (i === 2 && current >= 2) label = "مقبول";

    return { key: step.key, label: label, state: state };
  });
}