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

| Page | File | Owner | Status |
|---|---|---|---|
| Home | `index.html` | Ibrahim | in progress |
| Start a Request (wizard) | `request.html` | Ibrahim | in progress |
| Services + details | `services.html` | Omar | in progress |
| Portfolio | `portfolio.html` | Omar | in progress |
| Contact + FAQ | `contact.html` | Friend B | todo |
| About | `about.html` | Friend B | todo |
| Policies | `policies.html` | Friend B | todo |
| Track a Request | `track.html` | Ahmed | **done** |
| Admin | `admin.html` (+ `admin/` pages) | Ahmed | in progress |
| Database, backend, deploy | Supabase | Ahmed | database done, deploy todo |

---

## 2. Tech stack

- Plain **HTML, CSS, JavaScript** (no frameworks, no build step)
- **IBM Plex Sans Arabic** (Google Fonts) for ALL text
- **Supabase** (live): database, admin login, private file storage, security rules
- Full **RTL** Arabic layout, mobile first
- Supabase provides a serverless backend for authentication, storage, and real‑time data.

---

## 3. Getting started

1. Clone the repo and open it in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right click `test.html` -> **Open with Live Server**. Everything should show a green check.
4. Open `test-supabase.html` the same way. It should show **21 of 21** passing.

> Do NOT open pages by double clicking the file. The browser blocks `fetch()` on `file://`.
> Always use Live Server.

You do NOT need any keys or `.env` file to work on pages.
`assets/js/config.js` already contains the public Supabase key, which is safe to be public.

---

## 4. Project structure

```
UserSaif-Print/
├── assets/
│   ├── css/
│   │   ├── tokens.css        <- colors, fonts, spacing (variables only)
│   │   ├── base.css          <- reset, text styles, RTL, grid, accessibility
│   │   ├── components.css    <- buttons, cards, inputs, timeline, table...
│   │   └── page-*.css        <- one file per page (your own styles go here)
│   └── js/
│       ├── config.js         <- Supabase URL + public key
│       ├── api.js            <- ALL data access (Supabase version)
│       ├── api-local.js      <- offline version (reads data.json), for tests only
│       ├── readiness.js      <- order readiness checker
│       ├── layout.js         <- shared header + footer + menu + reduce-motion toggle
│       └── page-*.js         <- one file per page (your own logic goes here)
├── data/
│   ├── schema.js             <- statuses, labels, timeline helpers
│   └── data.json             <- sample data (used by the seed and offline mode only)
├── tools/
│   └── seed.js               <- uploads data.json to Supabase (Ahmed only)
├── img/                      <- images (services/, portfolio/, samples/)
├── index.html  services.html  portfolio.html  request.html
├── track.html  contact.html   about.html      policies.html
├── admin.html
├── test.html                 <- checks CSS + layout + data
├── test-api.html             <- checks offline api + readiness (uses api-local.js)
├── test-supabase.html        <- checks live Supabase + security (as a visitor)
├── .env                      <- SECRET keys, never committed (Ahmed only)
└── README.md
```

> `data.json` is only the starting data. The live site reads from Supabase.
> Changing `data.json` does NOT change the site.

---

## 5. The golden rules

1. **Never edit the shared files.** These belong to Ahmed:
   `tokens.css`, `base.css`, `components.css`, `layout.js`, `schema.js`, `readiness.js`, `api.js`, `api-local.js`, `config.js`, `data.json`.
   If you need something new, ask Ahmed and he will add it.
2. **Never hardcode a color, font size, or spacing.** Use the CSS variables.
   - Good: `color: var(--teal-800); padding: var(--s-3);`
   - Bad: `color: #114850; padding: 24px;`
3. **Your own page styles go in your own file:** `assets/css/page-NAME.css`
   (example: `page-home.css`, `page-request.css`). Your page logic goes in `assets/js/page-NAME.js`.
4. **Never talk to Supabase directly from a page.** No `db.from("orders")` or `db.rpc(...)`.
   Use only the functions in section 8. They are the safe doors.
5. **Never commit secrets.** `.env` and the Supabase secret key must never reach GitHub.
   Only Ahmed has them. Do not run `tools/seed.js`, it resets the live data.
6. **Test orders:** when you test, write the word **اختبار** in the order description so Ahmed can clean them later.

Other rules:

- Use **logical CSS properties** so RTL works: `margin-inline-start` (not `margin-left`), `padding-inline` (not `padding-left/right`).
- Put every price, phone number, and number inside `<span class="num">`.
- Every price, image, order, and portfolio item must have a small `<span class="tag-sample">تجريبي</span>`.
- Use Western digits (0-9) everywhere. Price format: `350 ج.م`.
- One primary button per screen. Use plain Arabic for labels and error messages.
- Every image needs an `alt` text.
- Escape any text that comes from the database before putting it in `innerHTML` (descriptions, notes, names). Use `textContent` when you can.
- The requested date is a **preferred date, not a delivery promise**. Always show that note.
- Do not invent: prices, delivery times, policies, statistics, testimonials, address, map, email, working hours.

---

## 6. Page template

Copy this for every new page. Change the title and the page CSS/JS names.

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

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/js/config.js"></script>
  <script src="data/schema.js"></script>
  <script src="assets/js/readiness.js"></script>
  <script src="assets/js/api.js"></script>
  <script src="assets/js/layout.js" defer></script>
  <script src="assets/js/page-NAME.js" defer></script>
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

- The script order matters: `supabase-js` -> `config.js` -> `schema.js` -> `readiness.js` -> `api.js`.
- Pages that do not need data (about, policies) can skip `supabase-js`, `config.js`, `readiness.js`, and `api.js`.
- If your page is inside a sub folder, fix the file paths (add `../`).
- Reference page: **`track.html`** (with `page-track.css` and `page-track.js`). Copy its structure and style.

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
| Buttons | `.btn .btn--primary / --secondary / --ghost / --light / --danger`, sizes `.btn--sm / --lg`, `.btn--block`, loading: add `.is-loading` |
| Inputs | `.field` > `.field__label`, `.input / .select / .textarea`, `.field__hint`, `.field__error` (add `.has-error` to `.field`), `.input--ltr` for phone/email |
| Color picker | `.swatches` > `.swatch` (`aria-checked="true"` for selected) |
| Cards | `.card`, `.card--hover`, `.card--dark`, `.card__media`, `.card__body` |
| Badges | `.badge` + `.badge--received / --review / --approved / --rejected / --progress / --ready` (use `STATUS_BADGE[status]`) |
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

Images in `img/` may not exist yet. Show a soft teal box with the label "صورة تجريبية" when an image is missing.

**Motion:** keep it gentle. The footer has a "تقليل الحركة" toggle, and the CSS already respects it. Any new animation must work with it (use the variables `--dur` and `--ease`).

---

## 8. Data layer (use these functions only)

Load order: `supabase-js` -> `config.js` -> `schema.js` -> `readiness.js` -> `api.js`.
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
| Upload an artwork file | `uploadArtwork(file)` |
| Check an order before sending | `checkReadiness(order, service)` |
| Send a new order | `submitOrder(draft)` |
| Track an order | `trackOrder(number, phone)` |
| Resubmit a rejected order | `resubmitOrder(id, changes, phone)` |
| Admin: log in / out / check | `adminLogin(email, password)` / `adminLogout()` / `isAdmin()` |
| Admin: list / search / filter | `getOrders({ status, search })` |
| Admin: one order | `getOrder(id)` |
| Admin: approve / reject / set status | `approveOrder(id, note)` / `rejectOrder(id, reason)` / `updateOrderStatus(id, status, note)` |
| Admin: temporary link to a customer file | `getArtworkUrl(item)` |

`getOrders`, `getOrder`, and the approve/reject functions work for a logged in admin only.

### Uploading artwork

```js
// رفع الملف وحفظ النتيجة كما هي داخل المسودة
async function onFileChosen(file) {
  try {
    let item = await uploadArtwork(file);
    // item = { name, path, type, url }
    draft.artwork.push(item); // لا تعدّل شيئًا داخل item
    console.log("Artwork added:", item.name);
  } catch (err) {
    console.log("Upload failed:", err.message);
  }
}
```

- Allowed types: PNG, JPG, WEBP, PDF. Max size: 10MB per file.
- Errors thrown: `file-type-not-allowed`, `file-too-large`. Show a friendly Arabic message.
- `item.url` is only a local preview (for thumbnails). It disappears after a page reload.
- Do not invent your own `path`. The server only accepts paths created by `uploadArtwork`.

### Sending an order

```js
// شكل الطلب
let draft = {
  serviceId: "tshirt",
  quantity: 24,
  description: "...",
  customer: { name: "...", phone: "01012345678", email: "" },
  requestedDate: "2026-11-10",     // YYYY-MM-DD
  pickup: "pickup",                // pickup | delivery
  designHelp: false,
  artwork: [],                     // items returned by uploadArtwork
  specs: {
    color: "teal",
    sizes: { S: 4, M: 8, L: 8, XL: 4, XXL: 0 },
    placements: ["chest"]
  }
};

let result = await submitOrder(draft);
if (result.ok) {
  console.log("Order number:", result.order.id);
} else if (result.issues) {
  // نواقص من مساعد الجاهزية (اعرضها في لوحة الجاهزية)
} else {
  // خطأ من السيرفر: result.error
}
```

- `specs` contains ONLY the keys that apply to the service (see section 9).
- The server checks everything again. Even if the form is bypassed, a bad order is rejected.
- Server error text contains a code such as `sizes-mismatch`, `missing-sizes`, `missing-color`, `missing-placement`, `missing-phone-model`, `missing-dimensions`, `missing-unit`, `missing-shape`, `missing-use`, `artwork-required`, `invalid-artwork`, `invalid-phone`, `invalid-date`, `invalid-quantity`. Show a clear Arabic message, and a generic one for unknown codes.
- The price is calculated on the server. Never send a price.

### Tracking

- `trackOrder(number, phone)` returns the order, or `null` when the number or phone is wrong.
- After too many wrong tries it **throws** `too-many-attempts` (15 minutes lock). Wrap it in `try/catch`.
- Always show the same message for "not found" and "wrong phone". Do not reveal which one is wrong.
- Reference implementation: `assets/js/page-track.js`.

### Test orders for the tracking page

| Order | Phone | Status |
|---|---|---|
| `YS-1042` | `01000001042` | قيد المراجعة |
| `YS-1039` | `01000001039` | مقبول |
| `YS-1037` | `01000001037` | مرفوض (with a reason) |
| `YS-1036` | `01000001036` | قيد التنفيذ |
| `YS-1034` | `01000001034` | جاهز للاستلام |
| `YS-1045` | `01000001045` | تم الاستلام (design help) |

Please do not test "resubmit" on these without telling Ahmed. It changes live data.

### Offline mode

`api-local.js` has the same function names but reads from `data.json` and saves new orders in the browser (`localStorage`).
Use it only for tests: replace `api.js` with `api-local.js` in your `<script>` tag (`test-api.html` already does).

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
- The link to track a specific order: `track.html?order=YS-1042`

The `specs` object only contains the keys that apply to the service
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
- If an issue has a `fix`, show a one tap button with `fix.label`. When clicked, merge `fix.patch` into the order (example: set the quantity to the size total).
- `submitOrder()` runs this check again and refuses incomplete orders. The server runs its own check too.
- Add this small note near the panel: "فحص اكتمال البيانات لا يضمن ملاءمة التصميم للطباعة".

Sample orders to try it on (these are in the live data):

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

## 12. Security (how the backend protects us)

- Visitors can read services and portfolio, send an order, and track an order (number + phone). Nothing else.
- Visitors cannot read, edit, or delete orders. This is enforced in the database, not in JavaScript.
- Customer files are in a private storage bucket. Only the admin can open them.
- The admin area is protected by a real login. A normal user cannot become an admin.
- `config.js` contains only the public key. The secret key lives in `.env` on Ahmed's machine.
- Hiding a button in the page does not protect anything. Never rely on the frontend for security.

---

## 13. Git workflow

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

## 14. Delivery checklist (before the demo)

- [ ] Full order goes from the wizard to the admin dashboard
- [ ] Missing or inconsistent details are caught before sending
- [ ] Approve and reject show correctly to the customer on the tracking page
- [ ] Customer files and order access stay private
- [ ] A normal (non admin) user cannot open the admin area
- [ ] Works on mobile (test at 390px width)
- [ ] RTL is correct everywhere (arrows and icons mirrored)
- [ ] All sample content is marked "تجريبي"
- [ ] No invented business info (address, email, hours, stats, claims)
- [ ] Reduce-motion toggle works
- [ ] Two social media designs are ready
- [ ] Short demo video recorded
- [ ] Setup and run notes + safe demo admin login written
- [ ] Test orders (description contains "اختبار") cleaned from the database

---

## 15. Known TODOs

- Replace provisional teal colors with the official brand values from the logo.
- Replace the text logo with the real logo file.
- Add real or clearly labeled sample images in `img/`.
- Admin content management: needs a public storage bucket for service and portfolio images.
- Deploy the site (Netlify or Vercel).
- Confirm the WhatsApp number before launch.
- Prices, delivery, and payment details must be confirmed with the client before launch.
- Anti-spam for order submission (for example CAPTCHA) if the site stays public after the event.

---

## 16. Questions?

Ask Ahmed before changing any shared file.

## 17. Authentication & User Flow

- **Authentication**: Uses Supabase Auth with email/password for admin users. The public `config.js` supplies the Supabase URL and anonymous key; the secret service_role key lives only on the server (Ahmed’s machine) in `.env` and is never committed.
- **Admin login flow**:
  1. Visitor navigates to `admin.html`.
  2. The page loads `assets/js/layout.js` which renders a login form.
  3. On submit, `adminLogin(email, password)` from `api.js` calls `supabase.auth.signInWithPassword`.
  4. A JWT is stored in localStorage and used for subsequent admin API calls (`getOrders`, `approveOrder`, etc.).
  5. `isAdmin()` guards all admin‑only UI elements; if the token is missing or expired the user is redirected to the login screen.
- **Customer flow**:
  1. **Browse** services (`services.html`) and portfolio (`portfolio.html`).
  2. **Start a request** via `request.html?service=SERVICE_ID` – the wizard loads the appropriate form fields based on the service type (see section 9).
  3. **Readiness check** runs live as the user fills the form (`checkReadiness`). Issues are shown instantly.
  4. **Submit** – `submitOrder` validates again on the server and stores the order.
  5. **Track** – the customer receives an order number and can view status on `track.html?order=ID` using `trackOrder`.

## 18. Deployment & CI

- **Hosting**: The site is static and can be deployed to any static host (Netlify, Vercel, Firebase Hosting). Deploy the `dist/` folder generated by a simple copy of the repository.
- **Supabase backend**: The Supabase project must have the following policies:
  ```sql
  -- only admins can read/write the `orders` table
  create policy "admin-only" on orders for all using (auth.role() = 'service_role');
  ```
- **CI pipeline (suggested)**:
  1. Run `npm install` (only for linting tools, no build step required).
  2. Execute `npm run lint` (using `eslint` configured for the project).
  3. Run the HTML tests: open `test.html` with Live Server and ensure the green check passes.
  4. Deploy automatically on push to `main` via Netlify/Vercel integrated with the GitHub repo.

## 19. Testing Checklist

- [ ] All pages load without console errors.
- [ ] Admin login works and JWT is stored securely.
- [ ] Readiness panel displays issues in real‑time.
- [ ] Order submission rejects malformed data (size mismatch, missing fields).
- [ ] Tracking page returns the same message for "order not found" and "wrong phone".
- [ ] Supabase RLS policies prevent unauthorized reads/writes.
- [ ] Mobile‑first layout works down to 320 px.
- [ ] Reduce‑motion toggle disables animations.
- [ ] Sample content is always marked with the `تجريبي` tag.

---