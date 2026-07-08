# CartQuest — full guide from here to Shopify App Store review

You are at the right milestone: **OAuth works**, the install screen loads, and “needs Shopify review” on a normal store is **expected**. This guide walks you through everything until you click **Submit for review**.

---

## Where you are now

| Done | Not done yet |
|------|----------------|
| App hosted at `https://shopify.ktcloud365.com` | Full test on a **development store** |
| OAuth redirect fixed (IIS) | Production URL sync in Shopify config files |
| Install page reachable | App Store listing + privacy policy |
| Compliance webhooks in code | Billing switched out of test mode |
| | Screenshots, demo video, reviewer instructions |

---

## Overview — 6 phases

```
Phase 1  Finish production setup          (1–2 days)
Phase 2  Test on development store        (2–3 days)
Phase 3  Fix app before review            (1–2 days)
Phase 4  Prepare App Store listing         (2–4 days)
Phase 5  Final pre-submission testing     (1 day)
Phase 6  Submit for review                (1 click, then wait)
```

Do them **in order**. Do not submit before Phase 5 is complete.

---

# Phase 1 — Finish production setup

## 1.1 Sync app URLs to Shopify (CLI deploy)

Shopify no longer has a Partner Dashboard **Configuration** page for App URL and redirect URLs. Those values are managed through **app versions** in the [Dev Dashboard](https://dev.shopify.com/dashboard) (CartQuest → **Versions**).

The recommended way to set them is to update your local TOML and deploy:

**Files to update** (both should use the production domain):

- `shopify.app.toml`
- `shopify.app.cart-tier-rewards-public.toml`

```toml
application_url = "https://shopify.ktcloud365.com"

[auth]
redirect_urls = [
  "https://shopify.ktcloud365.com/auth/callback",
  "https://shopify.ktcloud365.com/auth/shopify/callback",
  "https://shopify.ktcloud365.com/api/auth/callback"
]
```

On your **local machine** (where Shopify CLI is logged in):

```bash
cd d:\kodetech\tiered-rewards-app
shopify app config use cart-tier-rewards-public
shopify app deploy
```

This creates/releases an app version with the URLs above and deploys your **discount function** and **theme extension**.

**Verify:** Dev Dashboard → **CartQuest** → **Versions** → active version shows the App URL and three redirect URLs.

**Alternative (UI only):** Dev Dashboard → **Versions** → **Create version** → enter the same URLs → **Release**. Prefer CLI deploy so extensions and config stay in sync.

---

## 1.2 Server environment variables

On the server (`C:\inetpub\wwwroot\tiered-rewards-app\.env`):

```env
SHOPIFY_APP_URL=https://shopify.ktcloud365.com
SHOPIFY_API_KEY=<from Dev Dashboard → CartQuest → Settings, or Versions → active version>
SHOPIFY_API_SECRET=<same location as API key>
SCOPES=write_metaobjects,write_metaobject_definitions,write_discounts
DATABASE_URL=<postgresql connection string>
NODE_ENV=production
```

**Do not set** `SHOP_CUSTOM_DOMAIN` unless you have a real custom shop domain.

**Server vs local:** `shopify app deploy` runs on your **local machine** and updates Shopify’s app version (URLs, extensions, webhooks). The running app on IIS reads **`SHOPIFY_APP_URL` from `.env`**, not from the TOML files. You do **not** need to copy the TOML files to the server for OAuth to work, but you **must** set `SHOPIFY_APP_URL=https://shopify.ktcloud365.com` in the server `.env` if it still points at the old domain. After any `.env` change, restart PM2 (below).

Restart:

```powershell
cd C:\inetpub\wwwroot\tiered-rewards-app
pm2 restart cartquest --update-env
pm2 save
```

---

## 1.3 Database migrations

If not done yet:

```powershell
cd C:\inetpub\wwwroot\tiered-rewards-app
npm run setup
pm2 restart cartquest --update-env
```

---

## 1.4 Phase 1 verification checklist

- [ ] Dev Dashboard → **Versions** shows App URL + redirect URLs on the active version
- [ ] `shopify app deploy` completed without errors
- [ ] Server `.env` has `SHOPIFY_APP_URL=https://shopify.ktcloud365.com` (see 1.2)
- [ ] `pm2 logs cartquest` shows no crash on startup
- [ ] PowerShell redirect test returns `admin.shopify.com`:

```powershell
try {
  Invoke-WebRequest `
    -Uri "https://shopify.ktcloud365.com/auth/login" `
    -Method POST `
    -Body "shop=example.myshopify.com" `
    -ContentType "application/x-www-form-urlencoded" `
    -MaximumRedirection 0 `
    -UseBasicParsing
} catch {
  $_.Exception.Response.Headers["Location"]
}
```

Expected: `https://admin.shopify.com/store/example/oauth/install?...`

---

# Phase 2 — Test on a development store

**Important:** The direct login URL on a **live/production store** will show “needs Shopify review” with install disabled. That is normal. Testing must happen on a **development store**.

## 2.1 Create or pick a dev store

1. [dev.shopify.com/dashboard](https://dev.shopify.com/dashboard) → **Stores** (left sidebar)
2. Click **Create store** (or use an existing dev store)
3. Note the store URL: `your-dev-store.myshopify.com`

*(Alternative: Partner Dashboard → **Stores** → create a development store.)*

---

## 2.2 Install CartQuest (correct method)

**Important:** Do **not** run `shopify app dev` while testing the production-hosted app. With `automatically_update_urls_on_dev = true`, CLI replaces Shopify’s App URL with a temporary Cloudflare tunnel (e.g. `*.trycloudflare.com`). That breaks install/OAuth when the tunnel stops. Phase 2 testing uses your live server at `https://shopify.ktcloud365.com` only.

**Use the Dev Dashboard** (Partner Dashboard no longer has a separate app Configuration / install screen for URLs):

1. [dev.shopify.com/dashboard](https://dev.shopify.com/dashboard) → **Apps** → **CartQuest**
2. On the app **Home** page, find **Installs** → click **Install app**
3. Choose your dev store
4. Approve permissions if prompted

*(Alternative: Partner Dashboard → **Apps** → **CartQuest** → **Test on development store** — if that button is still visible.)*

**Expected:** App opens **inside Shopify Admin** (embedded), not the placeholder homepage.

If install fails, check `pm2 logs cartquest` immediately on the server.

### Troubleshooting: `*.trycloudflare.com` DNS error on install

If install redirects to a dead `*.trycloudflare.com` URL, a **dev preview** from an old `shopify app dev` session is still active on that dev store. The released app version (`cartquest-9`) is fine — the store is still using the stale preview URL.

**Fix (CLI):**

```bash
cd d:\kodetech\tiered-rewards-app
shopify app config use cart-tier-rewards-public
shopify app dev clean -s YOUR-DEV-STORE.myshopify.com
```

Replace `YOUR-DEV-STORE` with the exact dev store you are installing on (not necessarily the store linked in CLI).

**Fix (Admin UI):** In the dev store’s Shopify Admin, open the **Dev Console** (appears when a dev preview exists) → **Clean dev preview**.

Then install again from Dev Dashboard → **Install app**.

### Troubleshooting: HTTP ERROR 431 on install

**431 = request headers too large.** This usually happens on the OAuth callback to `https://shopify.ktcloud365.com/auth/...` after you click **Install app**. Common causes:

1. **Too many OAuth cookies** from repeated failed install attempts (very common while debugging)
2. **IIS default header limit** (~16 KB) is too small for Shopify embedded-app OAuth

**Fix A — try first (browser, no server change):**

1. Close all tabs for `shopify.ktcloud365.com`, `admin.shopify.com`, and your dev store
2. Clear cookies for those sites **or** use a fresh **Incognito / InPrivate** window
3. Dev Dashboard → **Install app** → pick dev store → click **Install** once (don’t retry rapidly if it fails)

**Fix B — if 431 still happens in Incognito (server / IIS):**

On the Windows server, run **PowerShell as Administrator**:

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\HTTP\Parameters" -Name "MaxFieldLength" -Value 65536 -PropertyType DWord -Force
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\HTTP\Parameters" -Name "MaxRequestBytes" -Value 65536 -PropertyType DWord -Force
net stop http /y
net start http
iisreset
```

This raises IIS/http.sys header limits for Shopify OAuth callbacks. Ask your server admin if you don’t have admin access.

**Verify after fix:** Install should complete and CartQuest opens embedded in Shopify Admin.

### Troubleshooting: Application Error / `Error: Bad Request` on Save settings

If logs show `Error: Bad Request` at `singleFetchAction`, React Router blocked the form POST because the request came from `admin.shopify.com` (embedded iframe) but your app only trusted its own host. Ensure `react-router.config.ts` includes:

```ts
allowedActionOrigins: ["admin.shopify.com", "shopify.ktcloud365.com"],
```

Then **`npm run build`** and restart PM2. Editing `.tsx` files alone is not enough — the server runs compiled code in `build/`.

---

## 2.3 Billing test (required — app charges $20/month)

CartQuest uses plan **“Premium Plan”**: $20 USD/month, 14-day trial.

On first open, you should see a **billing approval** screen.

- [ ] Billing screen appears
- [ ] You can approve the test charge on the dev store
- [ ] After approval, **Rewards settings** page loads

If billing blocks you, the app will not load settings until approved.

### Troubleshooting: Application Error when clicking Save settings

The save button runs a server action (metaobject save + checkout discount sync). A blank **Application Error** means the server threw an uncaught exception.

**Step 1 — check server logs (most important):**

```powershell
cd C:\inetpub\wwwroot\tiered-rewards-app
pm2 logs cartquest --lines 80
```

Look for `[app] save settings action failed`, `[tier-rewards] metaobjectUpsert`, or `[app] discount sync failed`.

**Step 2 — common fixes:**

| Log message | Fix |
|-------------|-----|
| `431` / header too large | Clear cookies or use Incognito; apply IIS header limit fix from section 2.2 |
| `discount sync failed` / function not found | Run `shopify app deploy` locally, then save again |
| `metaobjectUpsert` / type not found | Usually an **orphaned metaobject** from a previous app uninstall (handle `default`). Deploy latest app code (uses handle `active`), run `shopify app deploy`, rebuild + restart PM2, then save again. If it persists, contact Shopify Support to remove orphaned metaobjects. |
| Database / Prisma error | Check `DATABASE_URL` in `.env`, run `npm run setup` |

**Step 3 — deploy latest app code to server** (includes better error messages instead of Application Error):

```powershell
cd C:\inetpub\wwwroot\tiered-rewards-app
npm run build
pm2 restart cartquest --update-env
```

### Troubleshooting: `No metaobject definition exists for type "app--…--tier_rewards_config"`

This is **not** a missing deploy. The metaobject definition exists, but Shopify has a known bug when the app was previously uninstalled: an invisible orphaned entry with handle **`default`** blocks `metaobjectUpsert` on that handle.

**Fix (included in latest code):** the app now saves config under handle **`active`** instead of `default`. After you deploy:

1. **Locally:** `shopify app deploy` (updates checkout discount + theme extension to read `active`)
2. **On server:** `npm run build` and `pm2 restart cartquest --update-env`
3. Hard refresh CartQuest in Admin and click **Save settings** again

Until you save once, the admin may still load an older config entry if one exists on the store. After save, storefront and checkout use the new `active` entry.

**Also remove dev preview** if you still see “dev previews (1)” in the app header — run `shopify app dev clean -s YOUR-DEV-STORE.myshopify.com` locally.

---

## 2.4 Admin app testing — Rewards settings

Open: **Shopify Admin → Apps → CartQuest**

You should see **“Rewards tiers”** / **“Rewards settings”**.

### Configure test tiers (use simple numbers for testing)

Example test setup:

| Tier | Min spend | Discount |
|------|-----------|----------|
| 1 | $100 | $10 |
| 2 | $200 | $25 |

Steps:

1. [ ] Toggle **Program enabled** ON
2. [ ] Set program title (e.g. `Instant Rewards`)
3. [ ] Add/edit tier rows
4. [ ] Click **Save settings**
5. [ ] Toast says **“Settings saved — checkout discount is active”**
6. [ ] Status card shows **Checkout discounts: Active**
7. [ ] In Admin → **Discounts**, find **“CartQuest Rewards”** automatic discount

If status stays **“Setup needed”** after save:

- Check `pm2 logs cartquest` for `[app] discount sync failed`
- Re-run `shopify app deploy`
- Save settings again

---

## 2.5 Storefront testing — progress bar (theme extension)

Use **one** cart page setup (not both):

### Option A — Theme editor block (no code)

1. Customize → **Cart** → cart items section → **Add block** → **Cart tier progress**
2. Place it above the product list → **Save**
3. App embeds → enable **Cart drawer guard**

### Option B — Paste one line in theme code

1. App embeds → enable **Cart progress paste** and **Cart drawer guard**
2. Edit code → cart section file → paste above the product list (not inside a `<table>`):

```html
<div data-cartquest-cart-progress style="display:block;margin-bottom:24px;"></div>
```

3. Save the theme file

Checklist:

- [ ] Progress bar on cart page only (not in cart drawer)
- [ ] Cart drawer shows discount line under subtotal
- [ ] Widget reflects tier thresholds

---

## 2.6 Checkout testing — discount function

This is the **most important** test. Shopify reviewers will check checkout behavior.

### Setup

1. On dev store, add products so you can hit tier thresholds
2. Enable a **test payment method** (Shopify Payments test mode or Bogus Gateway)

### Test case A — below first tier

- [ ] Cart subtotal **below** tier 1 minimum
- [ ] Go to checkout
- [ ] **No** CartQuest tier discount applied

### Test case B — at tier 1

- [ ] Cart subtotal **at or above** tier 1 minimum
- [ ] Go to checkout
- [ ] **CartQuest tier discount** appears
- [ ] Discount amount matches tier 1

### Test case C — at tier 2

- [ ] Increase cart to tier 2 threshold
- [ ] Checkout shows **higher** discount (tier 2)

### Test case D — change settings in admin

1. [ ] Change tier amounts in admin → **Save settings**
2. [ ] New cart → checkout reflects **updated** values

### Test case E — disable program

1. [ ] Turn **Program enabled** OFF → Save
2. [ ] Checkout → discount should **not** apply

---

## 2.7 Webhook testing

### Uninstall test

1. [ ] Admin → **Apps** → CartQuest → **Uninstall**
2. [ ] `pm2 logs cartquest` — no repeated crash errors
3. [ ] Reinstall via Partner Dashboard → **Test on development store**

Compliance webhooks (`customers/data_request`, `customers/redact`, `shop/redact`) are configured in your app. Shopify may test these during review; your handler already exists in `webhooks.compliance.tsx`.

---

## 2.8 Phase 2 sign-off

Do not continue until **all** of these pass on a dev store:

- [ ] Install works
- [ ] Billing approved
- [ ] Settings save without error
- [ ] “CartQuest Rewards” discount exists in Admin
- [ ] Checkout discount applies correctly
- [ ] Theme widget visible (at least one embed/block method)
- [ ] Uninstall/reinstall works

---

# Phase 3 — Fix app issues before review

## 3.1 Switch billing out of test mode (critical)

In `app/routes/app.tsx`, billing currently has:

```javascript
isTest: true, // Remove or set to false in production
```

Before App Store submission, change both occurrences to:

```javascript
isTest: false,
```

Deploy updated code to server, rebuild, restart PM2:

```powershell
npm run build
pm2 restart cartquest --update-env
```

Re-test billing on dev store after this change.

---

## 3.2 Customize public homepage (recommended)

The page at `https://shopify.ktcloud365.com/` still shows template placeholder text. For review, update `app/routes/_index/route.tsx` with:

- App name: **CartQuest**
- Real tagline and feature descriptions
- Link to support or docs

Not strictly blocking if merchants install from App Store, but looks unprofessional to reviewers.

---

## 3.3 Confirm extensions are deployed

CartQuest uses:

| Extension | Purpose |
|-----------|---------|
| `tier-cart-discount` | Applies tier discounts at checkout |
| `tier-cart-ui` | Storefront progress bar / widget |

Verify in Partner Dashboard → **CartQuest** → **Extensions** — both should show as deployed/active.

---

## 3.4 Phase 3 checklist

- [ ] `isTest: false` in billing
- [ ] Code rebuilt and deployed to server
- [ ] Extensions deployed via `shopify app deploy`
- [ ] Homepage branding updated (recommended)
- [ ] Re-tested install + checkout after billing change

---

# Phase 4 — Prepare App Store listing

Go to Partner Dashboard → **CartQuest** → **App Store listing** / **Distribution**.

## 4.1 Required listing content

| Item | What to write / prepare |
|------|-------------------------|
| **App name** | CartQuest |
| **App icon** | 1200×1200 px PNG, no text-heavy icon |
| **Tagline** | Short one-liner (e.g. “Tiered cart rewards that grow with spend”) |
| **App description** | What it does, who it’s for, key benefits |
| **Feature list** | Tiered discounts, checkout auto-apply, storefront progress bar |
| **Pricing** | $20/month with 14-day free trial (matches your billing config) |
| **App category** | Discounts / Marketing (pick best fit) |
| **Screenshots** | At least 3–5 (see below) |
| **Demo screencast** | 2–3 min video (see below) |
| **Support email** | e.g. `support@yourcompany.com` |
| **Support URL** | Help/docs page |
| **Privacy policy URL** | **Required** — public page |
| **Emergency developer email** | Required by Shopify |
| **Testing instructions** | For reviewers (template below) |

---

## 4.2 Screenshots to capture

Take these from your **dev store**:

1. **Rewards settings** page in Admin (tiers configured)
2. **Checkout discounts: Active** status card
3. **Discounts** page showing “CartQuest Rewards”
4. **Storefront cart** with progress bar/widget
5. **Checkout** showing applied tier discount

Use clean test data. No lorem ipsum.

---

## 4.3 Demo screencast outline (2–3 minutes)

Record screen + voice (or captions):

1. Install CartQuest on dev store
2. Approve billing
3. Configure 2 tiers → Save
4. Show “CartQuest Rewards” in Discounts
5. Enable theme embed → show cart progress bar
6. Add products → checkout → discount applied
7. (Optional) Change tier → show updated discount

Upload to YouTube (unlisted) or Shopify’s upload field.

---

## 4.4 Privacy policy (required)

Host a public page. Minimum content for CartQuest:

- **What data you collect:** shop domain, app session tokens, tier configuration (stored in Shopify metaobjects)
- **What you do NOT collect:** customer PII (your compliance webhook handler states you don’t store customer-specific data)
- **How data is stored:** PostgreSQL for app sessions; Shopify metaobjects for tier config
- **Data retention:** sessions deleted on uninstall (`shop/redact` webhook)
- **Contact email** for privacy questions
- **GDPR:** you respond to Shopify compliance webhooks

Example URL: `https://yourcompany.com/cartquest/privacy` or a simple page on your site.

---

## 4.5 Reviewer testing instructions (copy-paste template)

Customize and paste into Partner Dashboard → **Testing instructions**:

```
CartQuest — Tiered cart rewards app

TEST STORE SETUP:
1. Install CartQuest on the provided development store.
2. Approve the Premium Plan billing charge ($20/month, 14-day trial).

CONFIGURE REWARDS:
3. Open Apps → CartQuest.
4. Enable "Program enabled".
5. Set two tiers, for example:
   - Tier 1: Min spend $100 → $10 discount
   - Tier 2: Min spend $200 → $25 discount
6. Click "Save settings".
7. Confirm status shows "Checkout discounts: Active".
8. Confirm Admin → Discounts shows automatic discount "CartQuest Rewards".

STOREFRONT (optional visual):
9. Online Store → Themes → Customize.
10. Enable "Cart rewards embed" under App embeds (or add "Tier rewards progress" block to Cart template).
11. View cart page — progress bar should appear.

CHECKOUT TEST:
12. Add products totaling below $100 → checkout → no tier discount.
13. Add products totaling $100+ → checkout → tier 1 discount applied.
14. Increase cart to $200+ → checkout → tier 2 discount applied.

UNINSTALL:
15. Uninstall app — app handles shop/redact compliance webhook.

Support contact: support@YOUR-DOMAIN.com
```

---

## 4.6 Phase 4 checklist

- [ ] App icon ready
- [ ] 3–5 screenshots captured
- [ ] Demo video recorded and uploaded
- [ ] Privacy policy live at public URL
- [ ] Support email + URL set
- [ ] Pricing matches code ($20/month, 14-day trial)
- [ ] Reviewer testing instructions pasted

---

# Phase 5 — Final pre-submission testing

Run this **exactly like a Shopify reviewer** on a **fresh dev store** (or after uninstall/reinstall).

## 5.1 Fresh install flow

- [ ] Uninstall CartQuest completely
- [ ] Install again from Partner Dashboard
- [ ] Billing approval works
- [ ] App loads without Application Error
- [ ] No errors in `pm2 logs cartquest` during install

## 5.2 Core functionality

- [ ] Save tier settings → success toast
- [ ] Checkout discount active
- [ ] Checkout discount applies at correct thresholds
- [ ] Disable program → discount stops
- [ ] Re-enable → discount works again

## 5.3 Extensions

- [ ] `tier-cart-discount` function active (checkout works)
- [ ] `tier-cart-ui` theme extension can be enabled

## 5.4 Billing (production mode)

- [ ] `isTest: false` deployed
- [ ] Billing charge flow works on dev store

## 5.5 Legal / compliance

- [ ] Privacy policy URL loads publicly
- [ ] Compliance webhooks registered (check Dev Dashboard → **Versions** → active version)
- [ ] App uninstall cleans up (no crash in logs)

## 5.6 Production infra

- [ ] `SHOPIFY_APP_URL` correct on server `.env`
- [ ] Dev Dashboard app version URLs match production domain
- [ ] OAuth redirect goes to `admin.shopify.com` (not your domain)
- [ ] Database stable (no session errors in logs)

## 5.7 Official Shopify checklist

Review Shopify’s requirements:  
[App Store review requirements](https://shopify.dev/docs/apps/launch/app-store-review/app-store-ai-self-review-requirements)

---

# Phase 6 — Submit for review

When Phase 5 is 100% complete:

1. Partner Dashboard → **CartQuest**
2. Open **App Store listing** — fix any red/incomplete sections
3. Dev Dashboard → **Versions** — active version URLs and webhooks look correct
4. Partner Dashboard → **Distribution** — listing complete, no blockers
5. Click **Submit for review** (or **Manage submission**)

## What to expect

| Timeline | What happens |
|----------|----------------|
| 1–10+ business days | Shopify reviews your app |
| Approved | App can be listed; public installs allowed |
| Changes requested | Fix issues → resubmit |
| Rejected | Read feedback → fix → resubmit |

Keep `pm2 logs` and email notifications monitored during review — Shopify may email you.

---

# After approval

- [ ] Set app to **Published** on App Store (if not automatic)
- [ ] Test install from App Store listing on a new dev store
- [ ] Monitor logs for first real merchant installs
- [ ] Fix homepage login form (optional, lower priority)

---

# Quick reference — CartQuest specifics

| Item | Value |
|------|--------|
| App name | CartQuest |
| Production URL | `https://shopify.ktcloud365.com` |
| Billing plan | Premium Plan — $20/month, 14-day trial |
| Checkout discount name | CartQuest Rewards |
| Admin page | Rewards settings / Rewards tiers |
| Theme embed | Cart rewards embed |
| Theme block | Tier rewards progress |
| Scopes | write_metaobjects, write_metaobject_definitions, write_discounts |
| Distribution | App Store (requires review for public installs) |

---

# Your action plan this week

| Day | Task |
|-----|------|
| **Today** | Phase 1 — URLs, deploy, server env |
| **Tomorrow** | Phase 2 — Install on dev store, test checkout |
| **Day 3** | Phase 2 — Theme widget + uninstall/reinstall |
| **Day 4** | Phase 3 — Fix billing `isTest`, redeploy |
| **Day 5–6** | Phase 4 — Screenshots, video, privacy policy |
| **Day 7** | Phase 5 — Fresh install test as reviewer |
| **Day 8** | Phase 6 — Submit |

---

If you want hands-on help next, I can:

1. **Update `shopify.app.toml` URLs** and billing `isTest` in the codebase  
2. **Rewrite the homepage** with real CartQuest branding  
3. **Draft a privacy policy** page you can host  

Tell me which of those you want to tackle first.