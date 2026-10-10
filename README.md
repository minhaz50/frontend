# SwiftLine — Courier & Logistics Frontend

A Next.js 16 (App Router) frontend for the Courier & Logistics Management Platform backend. Every page connects to the real API — there is no mock data anywhere in the core workflows (auth, shipments, payments, courier assignments, admin management).

## 1. Required backend patch (do this first)

The Stripe payment-success page (`/payment/success`) needs to know *which*
payment to check. Stripe's `success_url` only gives back its own
`session_id`, not your internal payment id, so add one query param to the
success URL construction in the backend:

**`src/app/module/payment/providers/stripe.provider.ts`**, inside `initiate()`:

```diff
- success_url: `${config.payment.stripeSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
+ success_url: `${config.payment.stripeSuccessUrl}?session_id={CHECKOUT_SESSION_ID}&payment_id=${reference}`,
```

And update your backend `.env`:
```
STRIPE_SUCCESS_URL=http://localhost:3000/payment/success
STRIPE_CANCEL_URL=http://localhost:3000/payment/cancel
```
(port 3000, since that's where this frontend runs by default — not 5000).

Your Stripe Dashboard webhook endpoint / `stripe listen` command stays
pointed at the backend as before — that part is unchanged.

## 2. Setup

```bash
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at your backend
npm install
npm run dev
```

Open `http://localhost:3000`. Make sure the backend is running and seeded
(`npm run prisma:seed` in the backend repo) so the demo login buttons work.

## 3. Role mapping

The backend has 6 roles; this frontend builds a full UI for 3, per the
project brief's "3 fixed primary roles" requirement:

| Brief's generic role | Backend role | Frontend section |
|---|---|---|
| Admin | `ADMIN` (also accepts `SUPER_ADMIN`/`OPS_MANAGER`/`HUB_MANAGER` for route access) | `/admin/*` |
| User | `CUSTOMER` | `/dashboard/*` |
| Provider | `COURIER` | `/provider/*` |

Demo login buttons on `/login` use the backend's seeded accounts
(`admin@swiftline.example`, `customer@swiftline.example`,
`courier1@swiftline.example`, all password `Password123!`).

## 4. Architecture decisions

**Server vs. Client Components.** Every page defaults to a Server
Component unless it genuinely needs interactivity — forms, live
filtering/pagination synced to the URL, or an authenticated client-side
data fetch (the access token lives in `localStorage`/Zustand, which
Server Components cannot read). The home, about, services, pricing, and
contact-info sections are Server Components; dashboards, forms, and
anything behind auth are Client Components, each with a comment
explaining why.

**Auth strategy: custom JWT + middleware, not NextAuth.** The backend
issues its own access/refresh JWTs rather than exposing an OAuth-style
provider, which is exactly the case NextAuth is a worse fit for. Tokens
live in a Zustand store (persisted to `localStorage` for client fetches)
and are mirrored into plain cookies purely so `middleware.ts` — which
runs on the edge with no access to `localStorage` — can redirect
unauthenticated or wrong-role visitors before a protected page's shell
even renders. **This cookie check is a UX convenience, not the real
security boundary** — a client-set cookie can be forged. The actual
authorization enforcement is the backend's `auth(...roles)` guard on
every endpoint, which re-validates the JWT and the user's *current*
database role on every request. This is stated directly in code comments
in `middleware.ts` and `auth-store.ts` rather than left implicit.

**State management split.** TanStack Query owns all server state
(shipments, assignments, users, analytics) — caching, loading states,
and refetching all come from it, not manually-managed `useState` +
`useEffect`. Zustand owns the one piece of genuine client state that
needs to persist across page loads and be read outside React's render
tree (the auth session).

**URL-synced filtering/pagination.** `useUrlPagination` (in
`hooks/use-pagination.ts`) is the single hook every list page uses for
`page`/`limit`/`status`/`q`, read and written via `useSearchParams` and
`router.push`. Every filterable list in the app (shipments, admin users,
audit logs) is bookmarkable and shareable as a result.

## 5. Honest limitations

A few things that don't fully match the brief's checklist, and why:

- **`next/image` is not used anywhere.** The backend has no image/file
  upload feature implemented (flagged as an extension point in the
  backend's own README) — there is no real photo/avatar/proof-of-delivery
  image content anywhere in the data model. Rather than insert a
  decorative placeholder image just to use the component (which the
  brief explicitly prohibits — "no placeholder images"), this frontend
  has no raster images to optimize. Every visual is either Lucide icons
  (vector, no `<img>` needed) or CSS.
- **Payment history has no bulk backend endpoint.** The backend only
  exposes `GET /payments/:id` (singular), not a "list my payments"
  route. `/dashboard/payments` composes real data honestly: it fetches
  the customer's paginated shipment list, then fetches each shipment's
  payment individually. This is bounded by page size (default 10) so it
  stays cheap, but it's N+1 requests rather than one — a backend
  `GET /payments/mine` endpoint would be the proper fix if this needs to
  scale.
- **Audit logs cover shipment lifecycle only.** The backend's
  `/admin/audit-logs` endpoint surfaces `ShipmentEvent` rows — every
  shipment status change, who triggered it, when. It does not log
  non-shipment admin actions (pricing rule edits, hub changes, the role
  changes made from `/admin/manage` itself), because no general-purpose
  audit table exists on the backend. The reports page states this
  limitation directly to the user rather than implying broader coverage.
- **Admin "Manage Users" is read + role-update only**, not full CRUD —
  there's no backend endpoint to create or delete a user from the admin
  panel (users self-register; staff accounts are provisioned via direct
  DB access in this project's current state). Listed in the UI as what
  it actually is rather than padded with non-functional buttons.

## 6. Page inventory (23 routes total)

| Category | Routes |
|---|---|
| Public (5) | `/`, `/about`, `/services`, `/contact`, `/pricing` |
| Auth (2) | `/login`, `/register` |
| Admin (3) | `/admin`, `/admin/manage`, `/admin/reports` |
| Customer (3 + 2 bonus) | `/dashboard`, `/dashboard/profile`, `/dashboard/payments`, `/dashboard/new`, `/dashboard/[id]` |
| Provider (3) | `/provider`, `/provider/earnings`, `/provider/profile` |
| Payment (2) | `/payment/success`, `/payment/cancel` |
| Shared (2) | `not-found.tsx`, `error.tsx` |
| Bonus (1) | `/track/[trackingId]` — public tracking lookup |

Every list-bearing page (`/dashboard`, `/dashboard/payments`,
`/admin/manage`, `/admin/reports`) has a `loading.tsx` skeleton and a
real empty state. `/dashboard`, `/provider`, `/admin` segments each have
their own `error.tsx` boundary in addition to the global one.

## 7. Testing the full payment flow locally

1. Log in as the customer demo account.
2. `/dashboard/new` → complete the wizard with payment method **Card**.
3. You're redirected to a real Stripe Checkout page. Use test card
   `4242 4242 4242 4242`, any future expiry, any CVC.
4. Stripe redirects back to `/payment/success?session_id=...&payment_id=...`
   — the page polls `GET /payments/:id` until the backend's webhook
   (make sure `stripe listen --forward-to .../payments/webhook/stripe`
   is running) marks it `PAID`.
5. `/dashboard/payments` shows the same payment, now `PAID`.

## 8. Dark mode

Light / Dark / System, switchable from the sun/moon button in the public
navbar, both dashboard sidebars, and the login/register pages. The
choice is stored in `localStorage` (`clx-theme`); "System" follows the OS
setting live. A tiny inline script in `<head>` (`lib/theme.ts`) sets the
class before first paint, so there's no flash of the wrong theme on
reload. Colours come from the `:root` / `.dark` token blocks in
`globals.css`, including the Recharts overrides at the bottom of that file.
