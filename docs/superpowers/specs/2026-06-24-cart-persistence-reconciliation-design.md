# Cart Persistence and Reconciliation Design

Date: 2026-06-24

## Goal

Keep the customer miniapp cart available after the user leaves and reopens the miniapp, without turning the cart into a cloud-synced server feature.

The current cart service stores rows in module memory. That is enough while the miniapp runtime stays alive, but the cart is lost when WeChat unloads the app process. The new design persists the user's cart intent locally, then reconciles it against current product data before checkout and order creation.

## Locked Decisions

- Use local miniapp storage for cart persistence in this phase.
- Do not add a cloud cart that syncs across devices or accounts.
- Persist user intent, not authoritative product facts.
- Do not depend on the paginated catalog list for cart reconciliation.
- Add a non-paginated product-line resolve capability for cart recovery and pre-checkout validation.
- Treat `specId` as part of the cart row identity.
- Support the current customer-facing combined spec id form, such as `specId__formulaId`.
- Do not automatically replace a removed or changed spec with another available spec.
- The order backend must be the final authority for price, stock, product status, spec validity, and fulfillment compatibility.

## Recommended Approach

Persist a compact local cart draft and reconcile it with current catalog data through a dedicated resolve endpoint.

Local storage gives the desired same-device recovery with little user-facing friction. It also avoids introducing account-level cart merging, stale server cart cleanup, or cross-device sync behavior before the product needs those features. The tradeoff is that local cart data cannot be trusted, so every meaningful purchase transition must refresh and validate the cart lines.

The cart service should restore local rows immediately for fast display, then resolve those rows against the backend. The resolve endpoint accepts the exact cart lines rather than a pagination cursor, so it works even when a product is on a later catalog page or no longer appears in ordinary browsing results.

## Local Storage Contract

Storage key:

```ts
const CUSTOMER_CART_STORAGE_KEY = 'xiaipet:customer:cart:v1';
```

Stored shape:

```ts
interface PersistedCartStateV1 {
  schemaVersion: 1;
  updatedAt: string;
  items: PersistedCartItemV1[];
}

interface PersistedCartItemV1 {
  productId: string;
  specId: string;
  quantity: number;
  selected: boolean;
  snapshot: {
    name: string;
    summary: string;
    thumbnail: string;
    specLabel: string;
    unitPrice: number;
    stock: number;
    deliveryModes: Array<'delivery' | 'pickup' | 'express'>;
  };
  updatedAt: string;
}
```

The storage record keeps only the selected product/spec identity, quantity, selection state, and a display snapshot. The snapshot is for immediate rendering after app restore. It is not a trusted source for pricing, stock, product status, fulfillment modes, or order creation.

The cart service should write storage after every cart mutation: add, quantity change, spec change, selection change, remove, clear, and successful checkout cleanup.

## Expiration and Migration

The first version should keep local carts for 30 days from `updatedAt`. Expired carts are cleared silently on restore.

If `schemaVersion` is missing or unsupported, the cart service should clear the stored cart rather than trying to infer a shape. This avoids carrying malformed or old rows into checkout.

## Spec Identity

Current product data already has stable spec identifiers in the customer miniapp. The customer-facing catalog type exposes `ProductSpecOption.id`, and the cart already stores `specId` and `specLabel`.

For single-axis products, `specId` is the original option id, such as `4-inch`.

For products with both specs and formulas, the current customer catalog service derives a combined option id:

```ts
`${spec.id}__${formula.id}`
```

The resolve logic must explicitly understand this combined id format. Merchant-side spec and formula ids should reject or escape `__`, or the resolver should use a structured mapping before any future change allows that delimiter inside an id.

`specLabel` is display text only. If a label changes while the same spec identity still resolves, the cart updates the label. If the identity no longer resolves, the cart row becomes invalid and requires user re-selection.

## Resolve API Design

Endpoint:

```http
POST /api/v1/customer/catalog/cart/resolve
```

Request:

```ts
interface ResolveCartRequest {
  lines: Array<{
    productId: string;
    specId: string;
    quantity: number;
  }>;
}
```

Response:

```ts
interface ResolveCartResponse {
  ok: true;
  lines: ResolvedCartLine[];
}

type ResolvedCartLineStatus =
  | 'available'
  | 'quantity_adjusted'
  | 'product_unavailable'
  | 'spec_unavailable'
  | 'sold_out';

interface ResolvedCartLine {
  productId: string;
  requestedSpecId: string;
  resolvedSpecId: string;
  status: ResolvedCartLineStatus;
  product?: {
    id: string;
    name: string;
    summary: string;
    thumbnail: string;
    stock: number;
    soldOut: boolean;
    deliveryModes: Array<'delivery' | 'pickup' | 'express'>;
    updatedAt: string;
  };
  spec?: {
    id: string;
    label: string;
    price: number;
  };
  requestedQuantity: number;
  resolvedQuantity: number;
  changes: Array<'price' | 'stock' | 'label' | 'deliveryModes' | 'availability'>;
}
```

The API returns one result per requested line. It does not paginate. It may internally fetch products by id and derive the same customer-facing spec options used by product detail and catalog list responses.

The API should include unpublished, archived, missing, and sold-out outcomes as statuses rather than silently omitting lines. The miniapp needs that information to explain why a persisted cart row can no longer be checked out.

## Reconciliation Rules

On restore, the cart service reads local storage, filters expired or malformed rows, and immediately displays snapshot rows. It then calls the resolve API.

For each resolved line:

- `available`: update name, image, spec label, unit price, stock, and delivery modes from the response.
- `quantity_adjusted`: update current facts and reduce quantity to `resolvedQuantity`.
- `sold_out`: keep the row visible, set quantity to the last selected quantity or 1 for display, mark it invalid, and deselect it.
- `product_unavailable`: keep the row visible from snapshot, mark it invalid, and deselect it.
- `spec_unavailable`: keep the row visible from snapshot, mark it invalid, and deselect it. The user must reopen spec selection and choose a valid spec.

Rows with invalid status must not contribute to cart count, selected subtotal, selected fulfillment compatibility, or checkout payload.

The cart should persist the post-reconciliation state so the next app restore does not repeatedly revive an already invalid selected row.

## Timing

### App and Page Restore

The customer miniapp should hydrate the cart early, preferably during app launch or before customer pages compute cart badges. Catalog, search, detail, cart, and custom tabbar badge surfaces should all read from the same hydrated cart service state.

Cart page `onShow` should trigger a background resolve if the cart has not been resolved recently or if a previous resolve failed.

### Pre-Checkout

When the user taps checkout, the cart must run a fresh resolve before navigating to the checkout page.

If the resolve call fails, checkout is blocked with a message such as "商品信息刷新失败，请稍后再试".

If the resolve succeeds but changes any selected row's price, quantity, availability, spec label, or fulfillment modes, checkout stays on the cart page. The cart updates the rows and shows a confirmation message asking the user to review the changes before trying checkout again.

### Order Creation

Order creation must not trust frontend `unitPrice`, `lineTotal`, `specLabel`, or `pricing` values. The backend should re-resolve each submitted `productId/specId/quantity`, compute current line prices and totals, validate fulfillment compatibility, validate stock, and then create the order snapshot.

The frontend may continue to send display snapshots for compatibility, but the server-owned calculation should override them for persisted order records.

## Checkout Cleanup

Payment and order outcomes define cart cleanup:

- Balance payment success: remove the selected rows that were included in the order.
- WeChat payment success and sync success: remove the selected rows that were included in the order.
- WeChat payment cancelled: keep the cart rows.
- Payment start failure or sync failure: keep the cart rows.
- Pending order created but payment not completed: keep the cart rows.

This keeps retry behavior predictable and avoids losing the cart after a user cancels WeChat Pay.

## Error Handling and UX

When the cart is restored from local storage but resolve has not succeeded, the cart can render snapshot rows with an unverified state. Checkout remains blocked until resolve succeeds.

When a selected row becomes invalid, the row stays visible but is deselected. The page should show a specific reason: product removed, product unavailable, sold out, or spec changed.

When quantity is reduced because stock dropped, the row remains selected if the resulting quantity is greater than zero, and the page should tell the user that stock changed.

When price changes, the row remains selected, but checkout should require the user to tap checkout again after seeing the updated price.

## Inventory Scope

The current product model uses product-level stock. The first implementation should reconcile quantity against product-level `stock`.

The storage and resolve contracts should not prevent future spec-level stock. If spec-level stock is added later, the resolver can return stock for the resolved spec while keeping the local cart identity unchanged.

## API Security

The resolve API is not a purchase authority by itself. It can be called by the customer miniapp to refresh display state, but order creation and payment still enforce the final transaction rules.

The order backend should reject missing products, unpublished or archived products, unavailable specs, incompatible fulfillment modes, insufficient stock, invalid quantities, and client totals that differ from server totals.

## Testing Scope

Unit tests should cover:

- Restoring a valid local cart.
- Ignoring unsupported storage schema versions.
- Clearing expired local carts.
- Persisting after every cart mutation.
- Resolving a cart line whose price or label changed.
- Reducing quantity when stock drops.
- Marking rows invalid when the product is unavailable.
- Marking rows invalid when the spec is unavailable.
- Supporting combined spec ids such as `6-inch__salmon`.
- Blocking checkout when resolve fails.
- Blocking first checkout attempt after selected line changes.
- Removing selected rows after successful payment.
- Keeping rows after payment cancellation or failure.

API tests should cover:

- Resolving products by id independent of catalog pagination.
- Returning one result per requested line.
- Recomputing combined spec prices from specs, formulas, and overrides.
- Rejecting stale or tampered order prices during order creation.
- Rejecting unavailable products or specs during order creation.

## Out of Scope

- Cross-device cart sync.
- Server-side abandoned-cart marketing.
- Merchant cart inspection.
- Full SKU table migration.
- Spec-level inventory.
- Reworking the product editor UI.

## Implementation Notes

The work should stay centered on these boundaries:

- Customer miniapp cart service owns local persistence, hydration, mutation persistence, and reconciliation state.
- Customer catalog API owns product-line resolve.
- Customer checkout flow owns pre-checkout blocking behavior.
- Order backend owns final price, stock, spec, and fulfillment validation.

The existing generated miniapp JavaScript files should be regenerated by the normal customer miniapp build after TypeScript changes during implementation.
