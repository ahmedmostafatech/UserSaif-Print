// layout.js — الهيدر والفوتر المشتركين (تعدّل هنا مرة واحدة فتتحدث كل الصفحات)

let NAV_LINKS = [
  { href: "index.html", label: "الرئيسية" },
  { href: "services.html", label: "الخدمات" },
  { href: "portfolio.html", label: "أعمالنا" },
  { href: "track.html", label: "تتبع طلبك" },
  { href: "contact.html", label: "تواصل معنا" }
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
    '<a class="btn btn--primary btn--sm" href="request.html">ابدأ طلبك</a>' +
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

document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", function () {
  let h = document.getElementById("site-header");
  let f = document.getElementById("site-footer");
  if (h) h.innerHTML = renderHeader();
  if (f) f.innerHTML = renderFooter();
  setupMobileNav();
  setupMotionToggle();
  setupReveal();
  console.log("Layout ready:", currentPage());
});