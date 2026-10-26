# 🖨️ يوزرسيف | Custom Printing Platform

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Site-usersaif--print.vercel.app-teal?style=for-the-badge)](https://usersaif-print.vercel.app/index.html)
[![Built With](https://img.shields.io/badge/Built%20With-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Supabase-blue?style=for-the-badge)]()
[![Challenge](https://img.shields.io/badge/IEEE%20Aswan-Brand%20%26%20Build-orange?style=for-the-badge)]()

---

> **يوزرسيف** هو موقع طلبات طباعة مخصصة لمشروع بأسوان، مصر.
> بُني للتحدي البرمجي **Brand & Build** التابع لـ IEEE Aswan Student Branch.
> الموقع يجمع بين واجهة عربية RTL سلسة وباك-إند حقيقي على Supabase.

> [!IMPORTANT]
> جميع الأسعار والطلبات والعملاء والصور في هذا المشروع هي **بيانات تجريبية** (مُعلَّمة "تجريبي").
> لا تخترع معلومات تجارية (عنوان، إيميل، ساعات عمل، إحصائيات، سياسات).
> تفاصيل التواصل الحقيقية الوحيدة هي رقم واتساب المنشور، ويجب تأكيده قبل الإطلاق.

---

## 🚀 الرابط المباشر

**👉 [https://usersaif-print.vercel.app/index.html](https://usersaif-print.vercel.app/index.html)**

---

## 🗺️ نظرة عامة على النظام (End‑to‑End)

### رحلة العميل (Customer Flow)

```
🏠 Home
  ↓  يتصفح الخدمات والأعمال
📦 Services / Portfolio
  ↓  يختار الخدمة ويضغط "ابدأ الطلب"
🧙 Request Wizard  (request.html?service=ID)
  ↓  يملأ: النوع، الكمية، المقاسات، الألوان، الملفات
✅ Readiness Panel  (checkReadiness — live validation)
  ↓  يتأكد من اكتمال البيانات قبل الإرسال
📤 Submit Order  (submitOrder → Supabase)
  ↓  السيرفر يتحقق ويحفظ الطلب ويرجع رقم الطلب
🔍 Track Order  (track.html?order=YS-XXXX)
  ↓  العميل يتابع الحالة في أي وقت
```

### رحلة الأدمن (Admin Flow)

```
🔐 Admin Login  (admin.html → Supabase Auth JWT)
  ↓
📋 Dashboard – قائمة بكل الطلبات مع فلترة وبحث
  ↓
👁️ Order Detail – يشوف كل تفاصيل الطلب + ملفات التصميم
  ↓
✅ Approve / ❌ Reject / 🔄 Update Status
  ↓
📊 Customer sees updated status on Track Page
```

### البروسيس التقني (Technical Process)

```
Browser                     Supabase
  │                            │
  │──── getServices() ────────▶│  (RLS: public read)
  │◀─── services list ─────────│
  │                            │
  │──── uploadArtwork() ──────▶│  (private storage bucket)
  │◀─── { path, url } ─────────│
  │                            │
  │──── submitOrder() ────────▶│  (server validates + saves)
  │◀─── { ok, order.id } ──────│
  │                            │
  │──── trackOrder() ─────────▶│  (RLS: public, rate-limited)
  │◀─── order status ──────────│
  │                            │
  │──── adminLogin() ─────────▶│  (Supabase Auth)
  │◀─── JWT token ─────────────│
  │                            │
  │──── getOrders() ──────────▶│  (RLS: admin only via JWT)
  │◀─── orders list ───────────│
```

---

## 📄 الصفحات

| الصفحة | الملف | المسؤول | الحالة |
|---|---|---|---|
| الرئيسية | `index.html` | Ibrahim | ✅ مكتمل |
| بدء الطلب (Wizard) | `request.html` | Ibrahim | ✅ مكتمل |
| الخدمات + التفاصيل | `services.html` | Omar | ✅ مكتمل |
| الأعمال (Portfolio) | `portfolio.html` | Omar | ✅ مكتمل |
| التواصل + FAQ | `contact.html` | Ahmed | ✅ مكتمل |
| من نحن | `about.html` | Ahmed | ✅ مكتمل |
| السياسات | `policies.html` | Ahmed | ✅ مكتمل |
| تتبع الطلب | `track.html` | Ahmed | ✅ مكتمل |
| لوحة الأدمن | `admin.html` | Ahmed | ✅ مكتمل |
| قاعدة البيانات + Deploy | Supabase + Vercel | Ahmed | ✅ مكتمل |

---

## 🛠️ Tech Stack

| الطبقة | التقنية |
|---|---|
| Frontend | Plain HTML + CSS + JavaScript (no frameworks) |
| Typography | IBM Plex Sans Arabic (Google Fonts) |
| Backend | Supabase (Auth, Database, Storage, RLS) |
| Deployment | Vercel (static hosting) |
| Layout | RTL Arabic, Mobile-first, 8px grid |
| Security | Supabase Row Level Security (RLS) policies |

---

## ⚡ البدء السريع (Getting Started)

```bash
# 1. انسخ الريبو
git clone <repo-url>
cd UserSaif-Print

# 2. افتح المشروع في VS Code
code .
```

3. ثبّت إضافة **Live Server** (by Ritwick Dey)
4. كليك يمين على `index.html` → **Open with Live Server**
5. افتح `test-supabase.html` بنفس الطريقة — المفروض تظهر **21 من 21** ✅

> [!WARNING]
> لا تفتح الصفحات بضغطة مزدوجة على الملف — المتصفح يبلوك `fetch()` على `file://`.
> استخدم Live Server دايمًا.

لا تحتاج أي مفاتيح أو ملف `.env` للعمل على الصفحات.
`assets/js/config.js` يحتوي على المفتاح العام لـ Supabase وهو آمن بالكامل.

---

## 📁 هيكل المشروع

```
UserSaif-Print/
├── assets/
│   ├── css/
│   │   ├── tokens.css        ← الألوان، الخطوط، المسافات (متغيرات فقط)
│   │   ├── base.css          ← reset، أنماط النص، RTL، الجريد، إمكانية الوصول
│   │   ├── components.css    ← الأزرار، الكروت، الحقول، التايم‑لاين، الجداول...
│   │   └── page-*.css        ← ملف لكل صفحة (أسلوبك الخاص هنا)
│   └── js/
│       ├── config.js         ← Supabase URL + المفتاح العام
│       ├── api.js            ← كل الوصول للبيانات (Supabase)
│       ├── api-local.js      ← النسخة الأوفلاين (تقرأ data.json) للاختبار فقط
│       ├── readiness.js      ← مساعد جاهزية الطلب
│       ├── layout.js         ← الهيدر + الفوتر + القائمة + زر تقليل الحركة
│       └── page-*.js         ← ملف لكل صفحة (منطقك الخاص هنا)
├── data/
│   ├── schema.js             ← الحالات، التسميات، مساعدات التايم‑لاين
│   └── data.json             ← بيانات تجريبية (للـ seed والأوفلاين فقط)
├── tools/
│   └── seed.js               ← يرفع data.json لـ Supabase (أحمد فقط)
├── img/                      ← الصور (services/, portfolio/, samples/)
├── index.html  services.html  portfolio.html  request.html
├── track.html  contact.html   about.html      policies.html
├── admin.html
├── test.html                 ← يتحقق من CSS + layout + data
├── test-api.html             ← يتحقق من api-local + readiness
├── test-supabase.html        ← يتحقق من Supabase المباشر + الأمان
├── .env                      ← المفاتيح السرية، لا تُرفع أبدًا (أحمد فقط)
└── README.md
```

> `data.json` هي البيانات الابتدائية فقط. الموقع الحي يقرأ من Supabase.
> تغيير `data.json` لا يغير الموقع.

---

## 📐 القواعد الذهبية

1. **لا تعدّل الملفات المشتركة أبدًا.**
   `tokens.css`, `base.css`, `components.css`, `layout.js`, `schema.js`, `readiness.js`, `api.js`, `api-local.js`, `config.js`, `data.json` — اسأل أحمد إذا احتجت إضافة شيء.

2. **لا تكتب لون أو حجم خط أو مسافة بشكل ثابت.** استخدم CSS variables.
   - ✅ صح: `color: var(--teal-800); padding: var(--s-3);`
   - ❌ غلط: `color: #114850; padding: 24px;`

3. **أسلوب صفحتك في ملفك:** `assets/css/page-NAME.css` + `assets/js/page-NAME.js`

4. **لا تتحدث مع Supabase مباشرة من الصفحة.** استخدم الدوال في قسم Data Layer فقط.

5. **لا ترفع أسرارًا.** `.env` والمفتاح السري يبقوا على جهاز أحمد فقط.

6. **طلبات الاختبار:** اكتب **اختبار** في وصف الطلب حتى يمسحها أحمد لاحقًا.

**قواعد أخرى:**
- استخدم **Logical CSS properties** لدعم RTL: `margin-inline-start` بدل `margin-left`.
- ضع كل سعر أو رقم داخل `<span class="num">`.
- كل سعر وصورة وطلب وعمل portfolio يحمل `<span class="tag-sample">تجريبي</span>`.
- استخدم الأرقام الغربية (0-9) في كل مكان. صيغة السعر: `350 ج.م`.
- زر رئيسي واحد فقط في كل شاشة.
- كل صورة تحتاج نص `alt`.
- اهرب أي نص من قاعدة البيانات قبل وضعه في `innerHTML` — استخدم `textContent` عند الإمكان.

---

## 🎨 Design System — Cheat Sheet

**الألوان (مؤقتة، ستُستبدل بألوان الشعار الرسمية)**

`--ink` `--teal-900` `--teal-800` (primary) `--teal-700` `--teal-500` `--teal-300` `--teal-100` `--teal-50` `--paper` (خلفية الصفحة) `--white`

**المسافات (شبكة 8px):** `--s-1`(8) `--s-2`(16) `--s-3`(24) `--s-4`(32) `--s-6`(48) `--s-8`(64) `--s-12`(96)

**Radius:** `--r-sm` `--r-md` `--r-lg` `--r-pill` | **Shadows:** `--shadow-1` `--shadow-2` `--shadow-3`

**Classes النصية:** `.display` `h1` `h2` `h3` `h4` `.caption` `.label` `.muted`

**Classes التخطيط:** `.container` `.section` `.grid .grid--2/3/4` `.row` `.stack` `.stack-lg` `.reveal` `.grain`

| المكوّن | الكلاسات |
|---|---|
| Buttons | `.btn .btn--primary / --secondary / --ghost / --light / --danger` + sizes `.btn--sm / --lg` |
| Inputs | `.field > .field__label`, `.input / .select / .textarea`, `.field__hint`, `.field__error` |
| Cards | `.card`, `.card--hover`, `.card--dark`, `.card__media`, `.card__body` |
| Badges | `.badge .badge--received / --review / --approved / --rejected / --progress / --ready` |
| Timeline | `.timeline > li.is-done / .is-current / .is-rejected + .timeline__dot` |
| Wizard | `.steps > li.is-done / li.is-current`, `.progress` |
| File Upload | `.upload`, `.thumbs > .thumb` |
| Readiness | `.readiness`, `.readiness__item.is-ok / .is-bad` |
| Dialog | `<dialog class="dialog">` |
| Toast | `.toasts > .toast .toast--success / --error` |
| Table | `.table-wrap > .table` |
| Tabs | `.tabs > .tab` (`aria-selected="true"`) |

---

## 💾 Data Layer — الدوال المتاحة

**ترتيب تحميل السكريبتات:** `supabase-js` → `config.js` → `schema.js` → `readiness.js` → `api.js`
كل الدوال `async` — استخدم `await`.

| أحتاج... | استخدم |
|---|---|
| كل الخدمات | `getServices({ category })` |
| خدمة واحدة | `getService(id)` |
| الفئات | `getCategories()` |
| الأعمال (portfolio) | `getPortfolio(category)` |
| خيارات النموذج | `getOptions()` |
| FAQ | `getFaq()` |
| الإعدادات (واتساب) | `getSettings()` |
| رفع ملف التصميم | `uploadArtwork(file)` |
| التحقق من الطلب | `checkReadiness(order, service)` |
| إرسال طلب جديد | `submitOrder(draft)` |
| تتبع طلب | `trackOrder(number, phone)` |
| إعادة إرسال مرفوض | `resubmitOrder(id, changes, phone)` |
| تسجيل دخول الأدمن | `adminLogin(email, password)` / `adminLogout()` / `isAdmin()` |
| قائمة / بحث الطلبات | `getOrders({ status, search })` |
| طلب واحد | `getOrder(id)` |
| قبول / رفض / تحديث | `approveOrder(id, note)` / `rejectOrder(id, reason)` / `updateOrderStatus(id, status, note)` |
| رابط مؤقت لملف العميل | `getArtworkUrl(item)` |

### رفع ملف التصميم

```js
async function onFileChosen(file) {
  try {
    let item = await uploadArtwork(file);
    // item = { name, path, type, url }
    draft.artwork.push(item); // لا تعدّل شيئًا داخل item
  } catch (err) {
    // file-type-not-allowed | file-too-large
    showArabicError(err.message);
  }
}
```

### إرسال طلب

```js
let draft = {
  serviceId: "tshirt",
  quantity: 24,
  description: "...",
  customer: { name: "...", phone: "01012345678", email: "" },
  requestedDate: "2026-11-10",  // YYYY-MM-DD
  pickup: "pickup",             // pickup | delivery
  designHelp: false,
  artwork: [],
  specs: {
    color: "teal",
    sizes: { S: 4, M: 8, L: 8, XL: 4, XXL: 0 },
    placements: ["chest"]
  }
};

let result = await submitOrder(draft);
if (result.ok) {
  console.log("رقم الطلب:", result.order.id);
} else if (result.issues) {
  // نواقص من مساعد الجاهزية — اعرضها في لوحة الجاهزية
} else {
  // خطأ من السيرفر: result.error
}
```

---

## 🧩 أنواع الخدمات وحقول النموذج

| formType | الخدمات | الحقول |
|---|---|---|
| `apparel` | تيشيرت، هودي، سويتشيرت | color, sizes, placement |
| `apparel` | كاب | color, placement (بدون sizes) |
| `gift` | ماج، هدايا | customText |
| `gift` | كفر موبايل | customText, phoneModel |
| `sticker` | ستيكرات، لصائق | dimensions (مع unit)، shape، use |
| `custom` | تصميم مخصص | لا حقول إضافية (وصف فقط) |

---

## 🔍 مساعد الجاهزية (Readiness Assistant)

**الميزة المميزة في المشروع** — `checkReadiness(order, service)` ترجع:

```js
{
  ready: true | false,
  errorCount: 2,
  issues: [
    { code, field, severity: "error" | "warning", message, fix: { label, patch } | null }
  ]
}
```

- اعرض `issues` في `.readiness` panel بينما يملأ المستخدم النموذج.
- إذا كان للـ issue زرّ `fix`، اعرضه — عند الضغط ادمج `fix.patch` في الطلب.
- `submitOrder()` يشغّل التحقق مجددًا — السيرفر يشغّله كذلك.
- أضف ملاحظة: **"فحص اكتمال البيانات لا يضمن ملاءمة التصميم للطباعة"**.

---

## 📊 حالات الطلب

| المفتاح | التسمية العربية |
|---|---|
| `received` | تم الاستلام |
| `review` | قيد المراجعة |
| `approved` | مقبول |
| `rejected` | مرفوض |
| `in_progress` | قيد التنفيذ |
| `ready` | جاهز للاستلام |

**Helpers:** `STATUS_LABELS`, `STATUS_BADGE`, `NEXT_STEP`, `getTimelineState(status)`, `sumSizes(sizes)`

---

## 🔒 الأمان

- الزوار يمكنهم قراءة الخدمات والأعمال، إرسال طلب، وتتبع طلب (رقم + هاتف). لا غير.
- الزوار لا يستطيعون قراءة أو تعديل أو حذف الطلبات — مُطبَّق على قاعدة البيانات لا JavaScript.
- ملفات العملاء في storage bucket خاص — الأدمن فقط يفتحها.
- منطقة الأدمن محمية بتسجيل دخول حقيقي (Supabase Auth JWT).
- `config.js` يحتوي المفتاح العام فقط — المفتاح السري على جهاز أحمد في `.env`.
- إخفاء زر في الصفحة لا يحمي أي شيء — لا تعتمد على الـ frontend للأمان أبدًا.

---

## 🌿 Git Workflow

```bash
# أول مرة: نسخ المشروع
git clone <repo-url>
cd UserSaif-Print

# إنشاء فرعك
git checkout -b your-name

# بعد كل شغل
git add .
git commit -m "وصف قصير لما عملته"
git push -u origin your-name

# تحديث فرعك بآخر تعديلات main
git pull origin main
```

- فرع واحد لكل شخص: `ahmed`, `ibrahim`, `omar`.
- **العب في ملفاتك فقط** — هذا يتجنب الـ conflicts.
- أحمد يدمج كل شيء في `main`.

---

## ✅ Delivery Checklist — تم كل شيء 🎉

- [x] الطلب كاملاً من Wizard لـ Admin Dashboard
- [x] النواقص والتناقضات تُكتشف قبل الإرسال
- [x] القبول والرفض يظهران صح للعميل على صفحة التتبع
- [x] ملفات العملاء والطلبات تبقى خاصة
- [x] المستخدم العادي لا يفتح منطقة الأدمن
- [x] يعمل على الموبايل (تم الاختبار على 390px)
- [x] RTL صح في كل مكان (الأسهم والأيقونات معكوسة)
- [x] كل المحتوى التجريبي عليه علامة "تجريبي"
- [x] لا معلومات تجارية مخترعة
- [x] زر تقليل الحركة يعمل
- [x] تصميمان للسوشيال ميديا جاهزان
- [x] فيديو الـ demo مسجّل
- [x] ملاحظات الإعداد + تسجيل دخول الأدمن للعرض مكتوبان
- [x] طلبات الاختبار (فيها "اختبار") محذوفة من قاعدة البيانات

---

## 🧪 Testing Checklist — تم كل شيء ✅

- [x] جميع الصفحات تُحمَّل بدون أخطاء في الـ console
- [x] تسجيل دخول الأدمن يعمل والـ JWT يُحفظ بأمان
- [x] لوحة الجاهزية تعرض المشكلات في الوقت الفعلي
- [x] إرسال الطلب يرفض البيانات الخاطئة (تعارض مقاسات، حقول ناقصة)
- [x] صفحة التتبع ترجع نفس الرسالة لـ "طلب غير موجود" و"هاتف خاطئ"
- [x] سياسات Supabase RLS تمنع القراءة/الكتابة غير المصرح بها
- [x] التخطيط يعمل حتى 320px
- [x] زر تقليل الحركة يوقف الأنيميشن
- [x] المحتوى التجريبي دايمًا عليه علامة "تجريبي"

---

## 🚢 Deployment & CI

- **Hosting**: Vercel — موصول بـ GitHub repo، يُنشر تلقائيًا عند الـ push لـ `main`.
- **Supabase Backend**: RLS policies تحمي الجداول والـ storage.

```sql
-- مثال على السياسة: الأدمن فقط يقرأ/يكتب جدول orders
create policy "admin-only" on orders
  for all using (auth.role() = 'service_role');
```

---

## 📋 Known TODOs (للـ Sprints القادمة)

- [ ] استبدل ألوان الـ teal المؤقتة بألوان الشعار الرسمية.
- [ ] استبدل الشعار النصي بملف الشعار الحقيقي.
- [ ] أضف صور حقيقية أو تجريبية واضحة في `img/`.
- [ ] إدارة المحتوى للأدمن: يحتاج storage bucket عام لصور الخدمات والأعمال.
- [ ] تأكيد رقم واتساب قبل الإطلاق.
- [ ] تأكيد الأسعار والتوصيل وطرق الدفع مع العميل.
- [ ] Anti-spam (CAPTCHA) إذا ظل الموقع عامًا بعد الفعالية.

---

## ❓ أسئلة؟

اسأل أحمد قبل تعديل أي ملف مشترك. 🙌

---

*تم تحديث هذا الـ README ليكون مرجعًا شاملًا وكاملًا للمشروع.*