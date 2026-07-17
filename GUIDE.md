# CartQuest — Submit to Shopify App Store (beginner guide)

This is your **step-by-step path from “testing is done” → click Submit for review**.

You do **not** need to be a Shopify expert. Follow the phases **in order**. Do not skip Phase A (billing) or Phase B (listing + privacy).

Official Shopify docs (bookmark these):

- [Submit your app for review](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review)
- [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements)
- [About app billing](https://shopify.dev/docs/apps/launch/billing)

---

## Where you are right now

| Done (you already tested this) | Still needed before submit |
|--------------------------------|----------------------------|
| Production app at `https://cartquest.ktcloud365.com` | Switch billing to **production** (`isTest: false`) |
| Install + OAuth + billing approval (test charges) | Privacy policy on a **public URL** |
| Save & activate settings | App Store listing (icon, screenshots, video, copy) |
| Checkout tier discounts work | Reviewer testing instructions |
| Theme progress bar / embeds work | One final fresh reinstall test |
| Uninstall / reinstall handled | Click **Submit for review** |
| Discount-inject bugs fixed | |

**Goal:** finish the right column as fast as possible without rushing past Shopify’s requirements.

---

## Big picture — 5 phases from here

```
Phase A  Make the app review-ready in code     (~1–2 hours)
Phase B  Privacy + App Store listing assets    (~1–2 days)
Phase C  Fill Partner Dashboard listing        (~2–4 hours)
Phase D  Final “act like a Shopify reviewer”   (~1–2 hours)
Phase E  Submit for review                     (~30 minutes)
```

**Suggested ASAP timeline**

| When | What |
|------|------|
| **Today** | Phase A (billing + homepage + deploy) |
| **Today / tomorrow** | Phase B (privacy page + screenshots + short video) |
| **Tomorrow** | Phase C (paste everything into Partner Dashboard) |
| **Next morning** | Phase D (fresh reinstall test) |
| **Same day** | Phase E (submit) |

---

# Phase A — Make the app review-ready (code)

Shopify will reject apps that still use **test billing**. This is the #1 blocker for you right now.

## A1. Turn off test billing (REQUIRED)

### What this means (simple)

While developing, CartQuest used **test billing charges**. For App Store review and real merchants, charges must be **production billing** (`isTest: false`).

Dev stores can still complete the billing approval flow for testing. Production merchants must receive real subscription charges.

### Industrial-standard approach (already in code)

Do **not** hardcode `isTest: true` in production. CartQuest reads an environment flag:

| Environment | Setting | Result |
|-------------|---------|--------|
| **Production server** | Do **not** set `SHOPIFY_BILLING_TEST_MODE`, or set it to `false` | Real billing (`isTest: false`) — required for App Store |
| **Local / temporary debugging only** | `SHOPIFY_BILLING_TEST_MODE=true` in `.env` | Test charges (`isTest: true`) |

Code lives in:

- `app/shopify.server.ts` → `isBillingTestMode`
- `app/routes/app.tsx` → uses that flag for `billing.require` / `billing.request`

### Production server `.env` check

On `C:\inetpub\wwwroot\tiered-rewards-app\.env`:

```env
# REQUIRED for App Store / live merchants — omit this line or set false
# SHOPIFY_BILLING_TEST_MODE=true   ← must NOT be enabled on production
```

If that variable exists and equals `true`, **delete it or set `false`**, then restart PM2.

### Deploy app code to the server

Copy the latest code to the server (your usual sync method), then:

```powershell
cd C:\inetpub\wwwroot\tiered-rewards-app
npm run build
pm2 restart cartquest --update-env
```

On your **local machine** (keeps Shopify app version / extensions in sync):

```powershell
cd d:\kodetech\tiered-rewards-app
shopify app deploy --force
```

### Re-test billing once (do not skip)

1. Uninstall CartQuest from the dev store (Apps → CartQuest → Uninstall).
2. Partner Dashboard → CartQuest → **Test on development store** → install again.
3. Approve the billing charge when asked.
4. Confirm Rewards settings loads and **Save & activate** still works.
5. Confirm Admin → Discounts still shows **CartQuest Rewards** after save.

---

## A2. Fix the public homepage (RECOMMENDED — done in code)

Reviewers (or curious merchants) may open:

`https://cartquest.ktcloud365.com/`

The homepage now shows **CartQuest** branding instead of Shopify template placeholders.

### What you still need to do

Deploy the updated code to the server (`npm run build` + PM2 restart), then open the URL in a browser and confirm:

- Title / brand shows **CartQuest**
- No text like `[your app]` remains
- Login form still works if you use shop-domain login

---

## A3. Confirm the live app version looks correct

1. Open [Dev Dashboard](https://dev.shopify.com/dashboard) → **CartQuest** → **Versions**.
2. Open the **active / released** version.
3. Check:
   - App URL is `https://cartquest.ktcloud365.com`
   - Redirect URLs use that same domain
   - Compliance webhooks are present (`customers/data_request`, `customers/redact`, `shop/redact`)
   - Extensions `tier-cart-discount` and `tier-cart-ui` are included

If anything looks wrong, run `shopify app deploy --force` again from your local machine.

---

## A4. Phase A checklist

- [ ] Production server does **not** have `SHOPIFY_BILLING_TEST_MODE=true`
- [ ] Latest code on server (`npm run build` + PM2 restart)
- [ ] `shopify app deploy` completed from local machine
- [ ] Fresh install + billing approval works after the change
- [ ] Homepage at `https://cartquest.ktcloud365.com/` shows CartQuest branding (no `[your app]` placeholders)
- [ ] Dev Dashboard active version URLs/webhooks look correct
- [ ] Save & activate + checkout discount still work after reinstall

---

# Phase B — Privacy policy + listing assets

You cannot submit without a **public privacy policy URL** and a complete listing. Do this even if it feels “non-code”.

## B1. Create a privacy policy page (REQUIRED)

### Why

Shopify requires every App Store app to link to a privacy policy merchants can open without logging in.

### Implemented in this app

CartQuest now serves a public privacy page at:

**https://cartquest.ktcloud365.com/privacy.html**

No Shopify login is required. The homepage also links to it.

(Use `/privacy.html` — that file is copied from `public/privacy.html` on build and is served as a static page. You do not need a React route for App Store review.)

### After you deploy this code to the server

```powershell
cd C:\inetpub\wwwroot\tiered-rewards-app
npm run build
pm2 restart cartquest --update-env
```

Then open the privacy URL in an **incognito** window and confirm it loads.

### Customize contact emails (recommended)

Defaults in the page:

- Company: `Kode Tech`
- Support: `support@ktcloud365.com`
- Privacy: `privacy@ktcloud365.com`

If those are wrong, set real values in production `.env` and restart PM2:

```env
COMPANY_NAME=Kode Tech
SUPPORT_EMAIL=support@your-real-domain.com
PRIVACY_EMAIL=privacy@your-real-domain.com
```

Use inboxes you monitor. Do **not** use emails containing the word “Shopify”.

### Alternative hosts (optional)

You may instead host the same policy on your company website. The App Store listing only needs one public URL.

---

## B2. Capture screenshots (REQUIRED — 3 to 5+)

Use your **development store**. Keep the UI clean (no random test spam).

Recommended set:

1. **Admin — Rewards settings** with Active checkout discounts and 2 clear tiers  
2. **Admin — Discounts** page showing **CartQuest Rewards**  
3. **Storefront — Cart page** with progress bar visible  
4. **Storefront — Cart** after unlocking a tier (discount visible under subtotal)  
5. **Checkout** page showing the tier discount applied  

Tips:

- Use Zoom / browser zoom so text is readable
- Prefer desktop width screenshots for Admin
- Do not include private Partner Dashboard info or API secrets

Shopify listing fields usually ask for specific sizes; follow the upload UI prompts (often large PNGs). If unsure, export high-resolution PNGs and let the dashboard crop/validate.

---

## B3. Record a short demo video (REQUIRED / strongly expected)

**Length:** about 2–3 minutes  
**Upload:** YouTube **Unlisted**, or Shopify’s upload field if available

### Script (read this while recording)

1. “This is CartQuest — tiered cart rewards for Shopify.”
2. Install on a development store → approve billing (Premium Plan, 14-day trial).
3. Open Apps → CartQuest → show Rewards settings.
4. Keep or set two simple tiers → click **Save & activate** (or **Save settings** if already active).
5. Show status **Active** for Checkout discounts.
6. Show Admin → Discounts → **CartQuest Rewards**.
7. Theme editor → add **Cart tier progress** on the Cart page (Option A) → Save.
8. Storefront: add products under the first tier → no reward yet.
9. Increase cart to unlock tier → show progress / unlocked state and discount line.
10. Go to checkout → show discount applied.
11. Optional: turn program off → save → confirm discount stops; turn back on.

Speak slowly. Captions help if you do not want voiceover.

---

## B4. Prepare listing text (REQUIRED)

Write these in a Notes file first, then paste into Partner Dashboard.

### App name

`CartQuest`

### Tagline (short)

`Unlock automatic cart rewards as shoppers spend more`

### App category

Pick the closest fit Shopify offers (often **Discounts**, **Marketing**, or **Conversion** — choose what the form allows).

### Short description / intro (example)

```text
CartQuest helps merchants increase average order value with simple spend tiers.
Shoppers unlock order discounts automatically at checkout when their cart total
reaches each tier you set. Optionally show a progress bar on the cart page so
customers know how close they are to the next reward.
```

### Feature bullets (example)

```text
- Create up to several spend tiers with clear discount amounts
- Automatic checkout discounts via Shopify Functions
- Optional cart progress bar (theme editor block — no code required for most themes)
- Works with your shop currency
- Simple admin: save tiers once to activate
```

### Pricing (must match code)

```text
$20 USD / month
14-day free trial
Plan name in app: Premium Plan
```

### Support details

Prepare:

- Support email (must be real and monitored)
- Support URL (help page, FAQ, or even a simple contact page)
- Emergency developer email + phone (Shopify asks for this separately)

Do **not** use emails containing the word “Shopify”.

---

## B5. Phase B checklist

- [ ] Privacy URL loads in incognito: `https://cartquest.ktcloud365.com/privacy.html`
- [ ] Support / privacy emails on that page are real inboxes you monitor
- [ ] 3–5 clean screenshots ready
- [ ] Demo video recorded + uploaded (or ready to upload)
- [ ] Listing copy written (name, tagline, description, features, pricing)
- [ ] Support + emergency contact details ready

---

# Phase C — Fill the Partner Dashboard listing

This is where beginners usually get stuck. Go slowly. The dashboard saves progress.

## C1. Open the submission flow

1. Go to [Partner Dashboard](https://partners.shopify.com/)
2. Open **Apps** → **CartQuest**
3. Open **Distribution** / **Shopify App Store** / **App Store listing** (wording varies)
4. Open the guided **App Store review** / submission page if shown

Complete every red / incomplete section until nothing blocks submit.

## C2. Configuration checklist inside the dashboard

Fill or confirm:

| Field | What to enter |
|-------|----------------|
| App URL | `https://cartquest.ktcloud365.com` (usually via released version) |
| App icon | 1200×1200 PNG or JPEG |
| Compliance webhooks | Must be registered (already in your TOML / version) |
| API / contact emails | Your company emails (no “Shopify” in the address) |
| Emergency developer contact | Email + phone Shopify can reach urgently |
| Privacy policy URL | The public URL from Phase B |
| Support email / URL | From Phase B |
| Pricing | $20 / month, 14-day trial |
| Screenshots | Upload your set |
| Demo video | Link or upload |
| Testing instructions | Paste the template in C3 |

Run any **automated checks** the dashboard offers. Fix failures, then re-run until green.

## C3. Reviewer testing instructions (copy-paste)

Paste this into **Testing instructions**. Replace the support email.

```text
CartQuest — Tiered cart rewards app

OVERVIEW
CartQuest creates automatic tiered order discounts based on cart subtotal.
Merchants configure tiers in the embedded admin app. Discounts apply at checkout
via a Shopify Discount Function and an automatic discount named "CartQuest Rewards".

TEST STORE SETUP
1. Install CartQuest on the provided development store.
2. Approve the Premium Plan billing charge ($20 USD/month, 14-day trial).

CONFIGURE REWARDS
3. Open Apps → CartQuest.
4. Confirm "Rewards program is on".
5. Set two tiers, for example:
   - Tier 1: Cart total $100 → $10 discount
   - Tier 2: Cart total $200 → $25 discount
6. Click "Save & activate" (first time) or "Save settings" (later saves).
7. Confirm Checkout discounts status shows Active.
8. Confirm Admin → Discounts shows automatic discount "CartQuest Rewards".

STOREFRONT PROGRESS BAR (recommended visual check)
9. Online Store → Themes → Customize → Cart page.
10. Add block → Apps → "Cart tier progress" above the product list → Save.
11. (Optional) Theme settings → App embeds → enable "Cart drawer guard".
12. Do NOT enable "Cart discount line inject" on Dawn — Dawn already shows
    cart-level discounts under the subtotal.
13. Open the storefront cart page and confirm the progress bar appears.

CHECKOUT TEST
14. Add products totaling below $100 → checkout → no CartQuest tier discount.
15. Increase cart to $100+ → checkout → Tier 1 discount applied.
16. Increase cart to $200+ → checkout → Tier 2 discount applied.

DISABLE TEST
17. In CartQuest admin, turn off "Rewards program is on" → Save settings.
18. Confirm checkout no longer applies the tier reward.
19. Turn it back on → Save → confirm discount works again.

UNINSTALL
20. Uninstall the app. Compliance webhooks (including shop/redact) are handled.

Support: support@YOUR-DOMAIN.com
Privacy policy: https://cartquest.ktcloud365.com/privacy.html
```

## C4. Protected customer data

If the dashboard asks about **protected customer data**:

- CartQuest’s core flow does **not** need customer PII access beyond normal Shopify checkout/discount operation.
- If you are not requesting protected customer data scopes, choose the option to **opt out / not required**.
- Do not request protected customer data unless you truly need it (it slows review).

## C5. Phase C checklist

- [ ] Listing sections complete (no red blockers)
- [ ] Privacy + support URLs work
- [ ] Screenshots + video attached
- [ ] Pricing matches code
- [ ] Testing instructions pasted
- [ ] Automated checks passed

---

# Phase D — Final “act like a Shopify reviewer” test

Do this **after** `isTest: false` is live. Prefer a clean uninstall/reinstall.

## D1. Fresh install

- [ ] Uninstall CartQuest completely
- [ ] Install again from Partner Dashboard → Test on development store
- [ ] Billing approval screen appears and succeeds
- [ ] App opens Rewards settings with no Application Error
- [ ] Check `pm2 logs cartquest` — no crash spam

## D2. Activate + configure

- [ ] Click **Save & activate** (or Save settings)
- [ ] Toast success
- [ ] Checkout discounts = Active
- [ ] Admin → Discounts shows **CartQuest Rewards**

## D3. Storefront + checkout

- [ ] Add Cart tier progress via theme editor (Option A)
- [ ] Cart drawer guard ON
- [ ] Cart discount line inject OFF on Dawn
- [ ] Progress bar shows on cart page
- [ ] Below tier → no discount at checkout
- [ ] At tier 1 / tier 2 → correct discount at checkout
- [ ] Program off → discounts stop; program on → work again

## D4. Infra sanity

- [ ] `SHOPIFY_APP_URL=https://cartquest.ktcloud365.com` on server `.env`
- [ ] Homepage branding looks correct
- [ ] Privacy URL opens in incognito
- [ ] Active app version in Dev Dashboard looks correct

If **anything** fails, fix it before Phase E. Do not submit a broken build hoping reviewers will be kind — resubmits slow you down.

---

# Phase E — Submit for review

## E1. Submit

1. Partner Dashboard → CartQuest → App Store review / Distribution
2. Confirm every required section is complete
3. Confirm automated checks passed
4. Click **Submit for review** / **Manage submission** → Submit

## E2. After you click Submit

- Watch the submission contact email closely
- Allow emails from `app-submissions@shopify.com` and `noreply@shopify.com`
- Keep the server running (`pm2` healthy) — reviewers will install and test your live app
- Do **not** deploy breaking changes mid-review unless Shopify asks for a fix

## E3. What responses mean

| Result | What you do |
|--------|-------------|
| **Approved** | Publish / list if needed; test a fresh install from the listing |
| **Changes requested** | Read every note carefully, fix, reply, resubmit |
| **Rejected** | Fix root issues, then resubmit with clearer testing notes if needed |

Typical review time: about **1–10+ business days** (can vary).

---

# Nice-to-haves that help approval (do these if time allows)

These are not always hard blockers, but they reduce “looks unfinished” feedback:

1. **Homepage branding** (Phase A2) — do this
2. **Clear testing instructions** matching the real UI labels — already included above
3. **Clean screenshots** with realistic tier numbers (e.g. $100 / $10, not messy decimals)
4. **Support page** with 5 FAQ bullets:
   - How do I activate?
   - Where is the discount?
   - How do I add the progress bar?
   - Dawn note: leave Cart discount line inject off
   - How do I pause rewards?
5. **App icon** that is simple, high contrast, no tiny unreadable text
6. **Remove stale “dev preview”** on the test store if the header shows it:
   ```powershell
   shopify app dev clean -s YOUR-DEV-STORE.myshopify.com
   ```
7. Keep Partner account **emergency contact** phone accurate

---

# Common rejection / delay causes (avoid these)

| Mistake | Fix |
|---------|-----|
| Billing still `isTest: true` | Phase A1 |
| Privacy URL missing or behind login | Phase B1 |
| Listing incomplete / placeholder copy | Phase B4 + C |
| App crashes on install | Check PM2 logs, fix before submit |
| Reviewer cannot find how to activate | Testing instructions must say **Save & activate** |
| Theme setup confusing | Tell them Option A theme editor; Dawn inject OFF |
| Support email bounces | Use a real monitored inbox |
| Email/domain contains “Shopify” | Rename contacts |

---

# Quick reference — CartQuest facts for forms

| Item | Value |
|------|--------|
| App name | CartQuest |
| Production URL | `https://cartquest.ktcloud365.com` |
| Billing | Premium Plan — $20 USD / month — 14-day trial |
| Checkout discount title | CartQuest Rewards |
| Admin | Rewards settings |
| Theme block | Cart tier progress |
| Helpful embed | Cart drawer guard |
| Avoid on Dawn | Cart discount line inject |
| Scopes | `write_metaobjects`, `write_metaobject_definitions`, `write_discounts` |
| Distribution | App Store |

---

# Your immediate next actions (start here)

1. **Phase B1:** confirm `https://cartquest.ktcloud365.com/privacy.html` loads in incognito (file already in `build/client` after build)  
2. **Phase B2–B3:** capture screenshots + record 2–3 min demo video  
3. **Phase B4:** finalize listing copy + real support emails  
4. **Phase C:** complete Partner Dashboard listing  
5. **Phase D:** final reinstall checklist  
6. **Phase E:** submit  

If you want hands-on help next in Cursor, ask for:

1. A simple public Support / FAQ page  
2. Walkthrough of Partner Dashboard listing fields while you fill them  
3. Help reviewing your screenshots / video script before upload

---

# Appendix — Already completed earlier (reference only)

You already finished the hard product work. Keep this only if you need to re-check production basics.

### Server env (must stay correct)

```env
SHOPIFY_APP_URL=https://cartquest.ktcloud365.com
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SCOPES=write_metaobjects,write_metaobject_definitions,write_discounts
DATABASE_URL=...
NODE_ENV=production
# Do NOT enable on production:
# SHOPIFY_BILLING_TEST_MODE=true
```

Restart after `.env` changes:

```powershell
cd C:\inetpub\wwwroot\tiered-rewards-app
pm2 restart cartquest --update-env
pm2 save
```

### Deploy extensions / app version (local machine)

```powershell
cd d:\kodetech\tiered-rewards-app
shopify app deploy --force
```

### Known storefront note (Dawn)

- Use **Cart tier progress** via theme editor  
- Enable **Cart drawer guard**  
- Leave **Cart discount line inject** OFF on Dawn (theme already shows discounts)

### Metaobject reinstall note

After uninstall/reinstall, Save may create a unique config handle automatically. Merchants only need to click **Save & activate** once. You do not need to explain metaobjects to reviewers unless asked.
