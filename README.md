# يوزرسيف | Custom Printing Website

A website for **يوزرسيف**, a custom printing and personalized products business in Aswan, Egypt.
Built for the IEEE Aswan Student Branch **Brand & Build** challenge.

> **Important:** All prices, orders, customers, and images in this project are **sample data** (marked "تجريبي").
> Do not invent business information (address, email, working hours, history, statistics, policies).
> The only real contact detail is the published WhatsApp number, and it must be confirmed before launch.

---

## 1. What we are building

A customer can: browse services and portfolio, send a full order request, and track it.
The owner can: review requests, approve or reject them, and update their status.

**Customer journey:** Discover -> Explore work -> Send a request -> Track the request

**Pages**

| Page | File | Owner |
|---|---|---|
| Home | `index.html` | Friend A |
| Start a Request (wizard) | `request.html` | Friend A |
| Services + details | `services.html` | Friend B |
| Portfolio | `portfolio.html` | Friend B |
| Contact + FAQ | `contact.html` | Friend B |
| About | `about.html` | Friend B |
| Policies | `policies.html` | Friend B |
| Track a Request | `track.html` | Ahmed |
| Admin | `admin.html` (+ `admin/` pages) | Ahmed |
| Database, backend, deploy | Supabase | Ahmed |

---

## 2. Tech stack

- Plain **HTML, CSS, JavaScript** (no frameworks, no build step)
- **IBM Plex Sans Arabic** (Google Fonts) for ALL text
- **Supabase** for database, admin login, and file storage (connected later)
- Full **RTL** Arabic layout, mobile first

---

## 3. Getting started

1. Clone the repo and open it in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right click `test.html` -> **Open with Live Server**.
4. You should see all checks passing. If yes, everything works on your machine.

> Do NOT open pages by double clicking the file. The browser blocks `fetch()` on `file://`,
> so the data will not load. Always use Live Server.

Also open `test-api.html` to check the data functions (it should show 25 of 25 passing).

---

## 4. Project structure

```
UserSaif-Print/
├── assets/
│   ├── css/
│   │   ├── tokens.css       <- colors, fonts, spacing (variables only)
│   │   ├── base.css         <- reset, text styles, RTL, grid, accessibility
│   │   └── components.css   <- buttons, cards, inputs, timeline, table...
│   └── js/
│       ├── layout.js        <- shared header + footer + menu + reduce-motion toggle
│       ├── readiness.js     <- order readiness checker
│       └── api.js           <- ALL data access goes through here
├── data/
│   ├── schema.js            <- statuses, labels, timeline helpers
│   └── data.json            <- sample data (services, portfolio, orders...)
├── img/                     <- images (services/, portfolio/, samples/)
├── index.html  services.html  portfolio.html  request.html
├── track.html  contact.html   about.html      policies.html
├── admin.html
├── test.html                <- checks CSS + layout + data
├── test-api.html            <- checks api.js + readiness
└── README.md
```

---

## 5. The 3 golden rules

1. **Never edit the shared files.** These belong to Ahmed:
   `tokens.css`, `base.css`, `components.css`, `layout.js`, `schema.js`, `readiness.js`, `api.js`, `data.json`.
   If you need something new, ask Ahmed and he will add it.
2. **Never hardcode a color, font size, or spacing.** Use the CSS variables.
   - Good: `color: var(--teal-800); padding: var(--s-3);`
   - Bad: `color: #114850; padding: 24px;`
3. **Your own page styles go in your own file:** `assets/css/page-NAME.css`
   (example: `page-home.css`, `page-request.css`).

Other rules:

- Use **logical CSS properties** so RTL works: `margin-inline-start` (not `margin-left`), `padding-inline` (not `padding-left/right`).
- Put every price, phone number, and number inside `<span class="num">`.
- Every price, image, order, and portfolio item must have a small `<span class="tag-sample">تجريبي</span>`.
- Use Western digits (0-9) everywhere. Price format: `350 ج.م`.
- One primary button per screen. Use plain Arabic for labels and error messages.
- Every image needs an `alt` text.
- The requested date is a **preferred date, not a delivery promise**. Always show that note.
- Do not invent: prices, delivery times, policies, statistics, testimonials, address, map, email, working hours.

---

## 6. Page template

Copy this for every new page. Change the title and the page CSS file name.

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page title | يوزرسيف</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="assets/css/tokens.css">
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/components.css">
  <link rel="stylesheet" href="assets/css/page-NAME.css">

  <script src="data/schema.js"></script>
  <script src="assets/js/readiness.js"></script>
  <script src="assets/js/api.js"></script>
  <script src="assets/js/layout.js" defer></script>
</head>
<body>
  <div id="site-header"></div>

  <main id="main" class="container section">
    <!-- page content here -->
  </main>

  <div id="site-footer"></div>
</body>
</html>
```

Only include `schema.js`, `readiness.js`, and `api.js` if your page needs data.
If your page is inside a sub folder, fix the file paths (add `../`).
Also set `DATA_URL` in `api.js` usage accordingly (ask Ahmed).

---

## 7. Design system cheat sheet

**Colors (provisional, will be replaced by the official logo colors)**

`--ink` `--teal-900` `--teal-800` (primary) `--teal-700` `--teal-500` `--teal-300` `--teal-100` `--teal-50` `--paper` (page background) `--white`

Do NOT add orange, blue, gold, or any other brand color. Status colors (`--success`, `--warning`, `--error`) are only for status messages and always come with an icon and text.

**Spacing (8px grid):** `--s-1` (8) `--s-2` (16) `--s-3` (24) `--s-4` (32) `--s-6` (48) `--s-8` (64) `--s-12` (96)

**Radius:** `--r-sm` `--r-md` `--r-lg` `--r-pill`  **Shadows:** `--shadow-1` `--shadow-2` `--shadow-3`

**Type classes:** `.display` `h1` `h2` `h3` `h4` `.caption` `.label` `.muted`

**Layout classes:** `.container` `.section` `.grid .grid--2/3/4` `.row` `.stack` `.stack-lg` `.reveal` (fade in on scroll) `.grain` (paper texture on teal sections)

**Components**

| Component | Classes |
|---|---|
| Buttons | `.btn .btn--primary / --secondary / --ghost / --light / --danger`, sizes `.btn--sm / --lg`, `.btn--block` |
| Inputs | `.field` > `.field__label`, `.input / .select / .textarea`, `.field__hint`, `.field__error` (add `.has-error` to `.field`) |
| Color picker | `.swatches` > `.swatch` (`aria-checked="true"` for selected) |
| Cards | `.card`, `.card--hover`, `.card--dark`, `.card__media`, `.card__body` |
| Badges | `.badge` + `.badge--received / --review / --approved / --rejected / --progress / --ready` |
| Sample tag | `.tag-sample` |
| Filter chips | `.chip` (`aria-pressed="true"` for selected) |
| Breadcrumb | `.breadcrumb` |
| Wizard progress | `.steps` > `li.is-done / li.is-current`, `.progress` |
| Size counter | `.counter` (add `.is-bad` when the total is wrong), `.stepper` |
| File upload | `.upload` (add `.is-dragover`), `.thumbs` > `.thumb` |
| Readiness panel | `.readiness`, `.readiness__item.is-ok / .is-bad` |
| Timeline | `.timeline` > `li.is-done / .is-current / .is-rejected` + `.timeline__dot` |
| Activity log | `.log` |
| Table | `.table-wrap` > `.table` (use `data-label` on `td` for mobile cards) |
| Tabs | `.tabs` > `.tab` (`aria-selected="true"`) |
| Dialog | `<dialog class="dialog">` |
| Toast | `.toasts` > `.toast .toast--success / --error` |
| Loading / empty | `.skeleton`, `.empty` |
| Sticky mobile button | `.sticky-cta` |

**Service card example**

```html
<article class="card card--hover reveal">
  <div class="card__media">
    <img src="img/services/tshirt.jpg" alt="تيشيرت مطبوع">
    <span class="tag-sample">تجريبي</span>
  </div>
  <div class="card__body">
    <h3 class="h4">تيشيرت مطبوع</h3>
    <p class="caption">ابتداءً من <span class="num">220</span> ج.م</p>
    <a class="btn btn--secondary btn--sm" href="request.html?service=tshirt">ابدأ الطلب</a>
  </div>
</article>
```

**Motion:** keep it gentle. The footer has a "تقليل الحركة" toggle, and the CSS already respects it. Any new animation must work with it (use the existing variables `--dur`, `--ease`).

---

## 8. Data layer (use these functions, never read `data.json` directly)

Load order in the page: `schema.js` -> `readiness.js` -> `api.js`.
All functions are `async`, use `await`.

| I need... | Use |
|---|---|
| All services (optionally by category) | `getServices({ category })` |
| One service | `getService(id)` |
| Categories | `getCategories()` |
| Portfolio works (optionally by category) | `getPortfolio(category)` |
| Form options (colors, sizes, shapes, phone models...) | `getOptions()` |
| FAQ | `getFaq()` |
| Settings (WhatsApp number) | `getSettings()` |
| Upload artwork file | `uploadArtwork(file)` |
| Check an order before sending | `checkReadiness(order, service)` |
| Send a new order | `submitOrder(draft)` |
| Track an order | `trackOrder(number, phone)` |
| Resubmit a rejected order | `resubmitOrder(id, changes)` |
| Admin: list / search / filter | `getOrders({ status, search })` |
| Admin: one order | `getOrder(id)` |
| Admin: approve / reject / set status | `approveOrder(id, note)` / `rejectOrder(id, reason)` / `updateOrderStatus(id, status, note)` |

Example:

```js
// تحميل الخدمات وعرضها
async function showServices() {
  let services = await getServices();
  console.log("Services loaded:", services.length);
}
```

**Current mode:** data comes from `data/data.json`. New orders are saved in the browser (`localStorage`) of the device that sent them.
This means the admin and tracking pages see new orders only on the same browser until Supabase is connected.
When Supabase is ready, Ahmed will switch `api.js` to `api-supabase.js` with the same function names. **Your pages will not change.**

---

## 9. Service types and form fields

Every service has a `formType` and a `fields` list. **Only show the fields listed for that service.**

| formType | Services | Fields to show |
|---|---|---|
| `apparel` | T-shirt, hoodie, sweatshirt | color, sizes, placement |
| `apparel` | Cap | color, placement (no sizes) |
| `gift` | Mug, gifts | customText |
| `gift` | Phone case | customText, phoneModel |
| `sticker` | Stickers, labels | dimensions (with unit), shape, use |
| `custom` | Custom design | no extra fields (description only) |

Rules:

- **Apparel sizes:** the sum of sizes must equal the total quantity. Show a live counter ("المجموع 20 من 24 قطعة") and a warning when it does not match.
- **Gifts and phone cases:** NO clothing size fields.
- **Stickers and labels:** dimensions must have a unit (cm / mm).
- The link from a service card to the wizard: `request.html?service=SERVICE_ID`
- The link from a portfolio item to the wizard: `request.html?ref=PORTFOLIO_ID`

Every order specs object only contains the keys that apply to its service
(`color`, `sizes`, `placements`, `customText`, `phoneModel`, `width`, `height`, `unit`, `shape`, `use`).

---

## 10. Order readiness assistant (our featured feature)

`checkReadiness(order, service)` checks an order and returns:

```js
{
  ready: true | false,
  errorCount: 2,
  issues: [
    { code, field, severity: "error" | "warning", message, fix: { label, patch } | null }
  ]
}
```

- Show `issues` in the `.readiness` panel as the user fills the form. Show a "ready" state when `ready` is true.
- If an issue has a `fix`, show a one tap button with `fix.label`. When clicked, merge `fix.patch` into the order (example: set quantity to the size total).
- `submitOrder()` runs this check again and refuses incomplete orders.
- Add this small note near the panel: "فحص اكتمال البيانات لا يضمن ملاءمة التصميم للطباعة".

Test orders in the sample data:

- `YS-1041`: sizes total 20, quantity 24 (mismatch)
- `YS-1044`: phone case with no phone model

---

## 11. Order statuses

Defined once in `data/schema.js`. Never write your own labels.

| Key | Arabic label |
|---|---|
| `received` | تم الاستلام |
| `review` | قيد المراجعة |
| `approved` | مقبول |
| `rejected` | مرفوض |
| `in_progress` | قيد التنفيذ |
| `ready` | جاهز للاستلام |

Helpers: `STATUS_LABELS`, `STATUS_BADGE` (badge class), `NEXT_STEP` (plain Arabic next step),
`getTimelineState(status)` (returns the 5 timeline steps with `done / current / rejected / upcoming`), `sumSizes(sizes)`.

---

## 12. Git workflow

- One repo, one branch per person: `ahmed`, `friend-a`, `friend-b` (use real names).
- **Only touch your own files** (see the page table above). This avoids conflicts.
- Pull before you start, push often.
- Ahmed merges everything into `main`.

```bash
# أول مرة: نسخ المشروع
git clone <repo-url>
cd UserSaif-Print

# إنشاء فرعك
git checkout -b your-name

# بعد كل شغل
git add .
git commit -m "Short message about what you did"
git push -u origin your-name

# تحديث فرعك بآخر تعديلات main
git pull origin main
```

---

## 13. Delivery checklist (before the demo)

- [ ] Full order goes from the wizard to the admin dashboard
- [ ] Missing or inconsistent details are caught before sending
- [ ] Approve and reject show correctly to the customer on the tracking page
- [ ] Customer files and order access stay private
- [ ] Works on mobile (test at 390px width)
- [ ] RTL is correct everywhere (arrows and icons mirrored)
- [ ] All sample content is marked "تجريبي"
- [ ] No invented business info (address, email, hours, stats, claims)
- [ ] Reduce-motion toggle works
- [ ] Two social media designs are ready
- [ ] Short demo video recorded
- [ ] Setup and run notes + safe demo admin login written

---

## 14. Known TODOs

- Replace provisional teal colors with the official brand values from the logo.
- Replace the text logo with the real logo file.
- Add real or clearly labeled sample images in `img/`.
- Connect Supabase (tables, privacy rules, file storage) and switch `api.js`.
- Confirm the WhatsApp number before launch.
- Prices, delivery, and payment details must be confirmed with the client before launch.

---

## 15. Questions?

Ask Ahmed before changing any shared file.