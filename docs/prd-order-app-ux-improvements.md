# PRD: Order App UX Improvements & Product/Variant Recipe Field

Follow-up to [`docs/prd-table-ordering.md`](./prd-table-ordering.md). That PRD
delivered the QR ordering flow end to end (`/order/t/{code}` → menu → item
detail → cart → checkout). This one collects the first round of real feedback on
that flow, plus the one data-model change the feedback exposes.

## Problem Statement

Six issues have been raised after using the customer-facing order app
(`apps/order`) on a phone:

1. **The cart bar is not actually floating.** `OrderLayout` renders the cart bar
   as the last child of a flex column whose height is `minHeight: 100%`. On the
   web that percentage resolves against a body with no defined height, so the
   shell grows to fit its content, the inner `ScrollView` never becomes the
   scrolling element, and the bar ends up at the *bottom of the document*
   instead of the bottom of the *viewport*. A guest browsing a long menu has to
   scroll all the way down to reach "Lihat Keranjang".

2. **`description` is being used as a recipe.** Baristas write preparation steps
   into the product/variant `description` (a Markdown editor in the POS forms —
   `ProductFormView.tsx` and `VariantFormView.tsx` both render
   `<MarkdownEditor name="description" />`). But `description` is *also* the only
   text the order app shows a customer: `MenuProductCard.tsx` and
   `MenuItemDetailScreen.tsx` both render `product.description` verbatim. The
   result is that internal recipe text is either shown to customers today, or
   left blank so it isn't — there is no field that is safe to show. There is no
   place to put a real, short, customer-facing description.

3. **"Pilih semua opsi" is a misleading button label.** In
   `MenuItemDetailScreen.tsx` the primary CTA renders `Pilih semua opsi` while
   options are unselected, and switches to `Tambah ke keranjang · Rp…` once a
   variant resolves. The label reads like an action the button performs ("select
   all options"), not like an unmet precondition. The button is also `disabled`
   in that state, so tapping it gives no feedback at all.

4. **"Kosongkan keranjang" is too prominent.** `CartScreen.tsx` renders it as a
   full-width, 44px-tall, red-themed outlined button directly above the checkout
   bar. It has the visual weight of a primary action and sits exactly where a
   thumb rests, so it reads as an invitation. It also fires
   `CLEAR` immediately — there is no confirmation step.

5. **The cart row controls are oversized.** `AmountStepper` renders 44×44 circular
   `+`/`−` buttons and `CartLineItem` renders a 44×44 circular trash button. In
   the cart, where several rows stack, those three controls dominate each row and
   crowd out the product name, options and subtotal. The delete button is also
   neutral-themed, so it doesn't read as destructive.

6. **The order app header shows only the table label.** `TableResolveScreen.tsx`
   renders `<Text fontWeight="bold">{table.label}</Text>` and nothing else. The
   `tables` master has carried a `floor_number` since migration
   `000021_add_table_floor_number`, and the POS already shows it
   (`TableListItem.tsx` renders `Floor {n} · {code}`) — but the customer-facing
   payload does not carry it: `ToApiPublicTable` strips everything but `id` and
   `label`. In a multi-floor venue a guest who scans a QR has no way to confirm
   from the app that they are seated where the app thinks they are, and a
   duplicated label across floors ("Meja 3" on both floor 1 and floor 2) is
   indistinguishable in the app.

---

## Context: Existing System

### Order app shell & cart bar

- `libs/ui/src/presentation/components/base/OrderLayout.tsx` — mobile shell:
  `PortalProvider` → `YStack flex={1} minHeight="100%" maxWidth={480}` →
  `{header}` / `ScrollView` / `{footer}`.
- `libs/ui/src/app/TableResolve.tsx` — composition root; builds the `CartBar`
  and passes it as `footer` when the cart is non-empty and `hideCartBar` is not
  set. The cart and checkout routes pass `hideCartBar` because those screens
  render their own bottom bar.
- `libs/ui/src/presentation/components/cart/CartBar.tsx` — `XStack` with a single
  full-width blue button (`{n} item · Rp… · Lihat Keranjang`).
- `libs/ui/src/presentation/screens/TableResolveScreen.tsx` — only the `resolved`
  variant passes `footer` down to `OrderLayout`.
- `apps/order/index.html` — viewport meta is `width=device-width, initial-scale=1`
  (no `viewport-fit=cover`), and `apps/order/src/styles.css` is empty, so
  `html`/`body` carry no height rules.
- Existing sticky precedent: `MenuListScreen.tsx` (search + chips, `top: 0`) and
  `CartScreen.tsx` (checkout bar, `bottom: 0`) both use a `@ts-expect-error`'d
  `position="sticky"`, since Tamagui's types don't include it.

### Product / variant description

| Layer | Product | Variant |
|---|---|---|
| DB | `products.description TEXT NULL` (`000001_initial_schema.up.sql`) | `variants.description TEXT NULL` |
| Go domain | `domain.Product.Description *string` | `domain.Variant.Description *string` |
| Go persistence | `data/mysql/product_entity.go`, `product_transformer.go` | `data/mysql/variant_entity.go`, `variant_transformer.go` |
| Go REST | `presentation/restapi/product_transformer.go` (`ToApiProduct`, `ToProduct`) | `presentation/restapi/variant_transformer.go` (`ToApiVariant`, `ToVariant`) |
| Contract | `Product.description`, `ProductRequest.description` in `libs/api-contract/src/api.yaml` | `Variant.description`, `VariantRequest.description` |
| TS entity | `libs/ui/src/domain/entities/Product.ts` (`Product`, `ProductForm`) | `libs/ui/src/domain/entities/Variant.ts` (`Variant`, `VariantForm`) |
| TS transformer | `libs/ui/src/data/api/product.transformer.ts` | `libs/ui/src/data/api/variant.transformer.ts` |
| TS usecases | `productCreate.ts`, `productUpdate.ts` | `variantCreate.ts`, `variantUpdate.ts` |
| Form schema | `ProductCreateController.tsx`, `ProductUpdateController.tsx` (`description: z.string()`) | `VariantCreateController.tsx`, `VariantUpdateController.tsx` |
| POS form UI | `ProductFormView.tsx` — a "Description" tab holding `<MarkdownEditor name="description" />` | `VariantFormView.tsx` — same, as one of the tabs |
| Customer UI | `MenuProductCard.tsx` (`numberOfLines`-capped), `MenuItemDetailScreen.tsx` (`<Paragraph>`) | not rendered anywhere in the order app |
| Seeds | `apps/api/seeds/product_seeder.go` | `apps/api/seeds/variant_seeder.go` |

**Nothing in the POS reads product/variant `description` back for staff** — no
list, no detail screen, no kitchen slip renders it. The only way to read a
"recipe" written into `description` today is to open the edit form.

**Public API reuses the private transformers.** `presentation/restapi/public_handler.go`
serves `/public/products`, `/public/products/{id}` and `/public/variants` by
calling `ToApiProduct` / `ToApiVariant` — the same functions the authenticated
routes use. Any field added to those transformers is immediately readable by
anonymous guests. `ProductFindByIdResponse` / `VariantListResponse` are shared
schemas, so this is a transformer-level concern, not a schema-level one.

**Naming collision to be aware of.** `docs-site/catalog/products.md` and
`variants.md` already use the word "recipe" informally to describe a variant's
**materials** (its bill of materials — what the drink consumes from inventory).
The new field is *preparation instructions*, not the BoM. See Open Question 1.

### Cart screen

- `libs/ui/src/presentation/screens/CartScreen.tsx` — line items, "Tambah menu
  lainnya", totals, "Kosongkan keranjang", sticky checkout bar.
- `libs/ui/src/presentation/screens/CartHandler.tsx` — `onClearPress` dispatches
  `{ type: 'CLEAR' }` with no confirmation.
- `libs/ui/src/presentation/components/cart/CartLineItem.tsx` — thumbnail, name,
  option values, note, `AmountStepper`, subtotal, 44×44 trash button.
- `libs/ui/src/presentation/components/menu/AmountStepper.tsx` — shared by the
  cart line *and* the item detail sheet. `min` defaults to `1` and the decrement
  button disables at the floor.
- `libs/ui/src/presentation/components/base/ConfirmationAlert/` — existing
  Tamagui `AlertDialog` wrapper (`title`, `description`, `confirmText`,
  `cancelText`, `isOpen`, `onConfirm`). Pure Tamagui, no solito/next imports, so
  it is safe to use from the order bundle (D20).

### Table identity in the order app

- `apps/api/migrations/000021_add_table_floor_number.up.sql` —
  `ALTER TABLE tables ADD COLUMN floor_number INT NOT NULL DEFAULT 1;`. Every
  pre-existing table therefore reads as floor `1`.
- `apps/api/domain/table_entity.go` — `FloorNumber int`; `table_usecase.go`
  validates `FloorNumber >= 1` on both create and update.
- `apps/api/presentation/restapi/table_transformer.go` — `ToApiTable` maps
  `FloorNumber`; **`ToApiPublicTable` deliberately does not**, with the comment
  *"strips everything but id and label — the only fields a resolved QR code may
  hand back to a customer (FR-1)"*.
- `libs/api-contract/src/api.yaml` — `PublicTable` is `{ id, label }`, both
  required. `Table` carries `floorNumber`.
- `libs/ui/src/domain/entities/PublicTable.ts` — `{ id, label }`, with a comment
  citing D2/D6 of the table-ordering PRD.
- `libs/ui/src/data/api/publicTable.transformer.ts`,
  `libs/ui/src/data/mock/publicTable.ts` — both mirror the two-field shape.
- `libs/ui/src/presentation/screens/TableResolveScreen.tsx` — the `resolved`
  variant's header is a single bold `{table.label}`.
- POS rendering for reference: `TableListItem.tsx` → `Floor {floorNumber} · {code}`.

**`PublicTable` is also embedded in the cart response.**
`apps/api/presentation/restapi/cart_transformer.go:79` builds the cart's `table`
field via `ToApiPublicTable`, so any field added to that schema also appears on
`GET /carts/current`. That is consistent rather than harmful, but it means the
change has two consumers, not one.

**What D6 actually protects.** The minimal public payload exists so that a
resolved QR can never hand back the table **code** (a reusable off-premise
ordering key) and so the endpoint can never be used to enumerate the table list.
A floor number for the one table the guest is physically sitting at is neither:
it is information the guest can read off the wall. See FR-8.

### Tests that will need updating

- `apps/order-e2e/src/utils/selectors.ts` — `Lihat Keranjang`, `Kosongkan keranjang`,
  `Hapus {product} dari keranjang`.
- `apps/order-e2e/src/table-ordering.spec.ts:187` — asserts the `Pilih semua opsi`
  button.
- `libs/ui/src/presentation/screens/CartHandler.test.tsx` — clear-cart flow.
- `libs/ui/src/presentation/screens/MenuItemDetailHandler.test.tsx:60` — CTA label.

---

## Proposed Solution

Seven independent changes. Only FR-3 depends on FR-2; everything else can ship in
any order.

### Confirmed Product Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Cart bar mechanism | Give the order shell a **definite viewport height** (`height: 100dvh`) so its inner `ScrollView` becomes the scrolling element and the existing `footer` slot is genuinely pinned. Do **not** introduce `position: fixed`. | Keeps one layout mechanism, keeps the bar inside the 480px column, and fixes the sticky checkout bar on the cart screen for free. `fixed` would escape the centered column on desktop and would need its own width math. |
| Safe area | Add `viewport-fit=cover` to `apps/order/index.html` and pad the footer by `env(safe-area-inset-bottom)`. | Without it the bar sits under the iOS home indicator once it is genuinely pinned. |
| New field name | **`recipe`** on both Product and Variant, `TEXT NULL`, Markdown, staff-only. | The user's term, and the term already in use verbally. Disambiguated in the docs site against "materials". |
| `description` after the change | Stays `TEXT NULL` in the DB; becomes a **single-line plain-text input** in the POS forms, validated to **≤ 160 characters, no newlines**. | Keeping the column type avoids a lossy narrowing migration and keeps the down-migration trivial. The constraint is a product rule enforced in the form schema and the API. |
| Migrating existing content | The migration **moves** `description` → `recipe` and then **nulls `description`**, for both products and variants. | This is what the field actually contains today. Leaving it in place would keep leaking recipe text to customers. |
| Recovering the old value | The `down` migration copies `recipe` back into `description` where `description IS NULL`, then drops the columns. | Makes the move reversible in one step if someone objects to the blanket move. |
| Is `recipe` public? | **No.** `/public/*` responses must omit it entirely (not empty-string it). | It is internal operational content. A `""` would still tell a guest the field exists and would round-trip badly. |
| Where staff read the recipe | This iteration: **the POS product/variant edit form only** (a "Recipe" tab, where it already effectively lives). | Matches today's behavior. A read-only recipe view for baristas is a separate feature (Non-Goal 3). |
| Variant description in the order app | **Not shown.** Only `product.description` is customer-facing, as today. | Variant descriptions are per-size notes; the detail sheet already names the selected options. |
| Add-to-cart CTA | Label is **always** `Tambah ke Keranjang`. The button stays **enabled** when options are unselected, and pressing it surfaces an inline error naming the missing option group(s). | Removes the misleading label, and turns a dead tap into feedback. |
| CTA while resolving | Keep the existing `Menghitung harga...` state (disabled). | That one *is* a genuine transient, and the label already describes it. |
| CTA when price is known | `Tambah ke Keranjang · Rp…` (price suffix retained). | Price confirmation before adding is the whole point of the suffix. |
| Where "Kosongkan keranjang" goes | A **small text button in the cart screen header row**, right-aligned, next to a "Keranjang" title. Not full-width, not at the bottom. | Destructive-but-rare actions belong out of the thumb zone and away from the primary CTA. |
| Clear-cart confirmation | Required. Reuse `ConfirmationAlert` with Bahasa Indonesia copy. | It destroys the whole order with one tap. |
| Stepper size in the cart | Compact variant: **32×32** buttons, `size="$2"`, still circular. Item detail sheet keeps **44×44**. | The cart stacks many rows; the sheet has one stepper and it is the primary interaction on that screen. |
| Stepper API | Add a `size?: 'sm' \| 'md'` prop to `AmountStepper`, default `'md'`. | One component, no fork. Callers opt in. |
| Delete button in the cart | 32×32 circular, `theme="red"`, red icon, `chromeless`/`variant="outlined"` — visually subordinate to the stepper but unmistakably destructive. | Feedback asks for smaller *and* red. |
| Delete confirmation | **None** for a single line item. | Removing one item is cheap to undo by re-adding; a dialog per row would be noise. Clearing the whole cart is the destructive one. |
| Accessibility floor | Every shrunk control keeps its `accessibilityLabel`, and no control goes below a **32px** hit target with `hitSlop` padding to ≥44px where Tamagui supports it. | 44px is the ideal; 32px + hit slop is the accepted floor for secondary controls in a dense list. |
| Exposing `floorNumber` publicly | **Yes** — add it to the `PublicTable` schema (required, `int32`). | D6's minimal payload exists to protect the table **code** and to prevent enumerating the table list. The floor of the table a guest is sitting at is neither secret nor useful to an attacker. The `code` stays stripped. |
| Header format | `{label}` bold, then a muted `· Lantai {floorNumber}` on the same row. Wraps to a second muted line below the label on a narrow screen. | The label is what the guest and staff both say out loud; the floor is the disambiguator, not the identity. |
| Floor 1 in a single-floor venue | **Always show it.** No "hide when 1" rule. | Every pre-existing table defaults to floor `1` (migration `000021`), so a hide-when-1 rule would silently hide the floor for every venue that has not curated its table master — exactly the venues most likely to have duplicate labels. See Open Question 5. |
| Missing `floorNumber` from a stale API | The frontend transformer defaults to `1`. | An additive contract field against an older deployed API must never render `Lantai undefined`. |

### Core Rules

1. **`recipe` never crosses the public boundary.** Any new public endpoint or
   transformer must be written so `recipe` is absent from the JSON. This is
   asserted by a test in `public_handler_test.go`, not just by review.
2. **The migration is data-moving and must be reversible.** `up` copies then
   nulls; `down` restores then drops. Both are idempotent enough to re-run after
   a partial failure.
3. **No new bottom bar.** The cart bar, the cart screen's checkout bar, and the
   item sheet's CTA are three separate bottom surfaces that must never be
   visible at the same time. `hideCartBar` remains the mechanism.
4. **`AmountStepper` stays one component** shared between the sheet and the cart,
   parameterized by size — no `CartAmountStepper` fork.
5. **All customer-facing copy is Bahasa Indonesia** (D15 in the table-ordering
   PRD). All POS-facing copy stays English, matching the existing forms.
6. **Screens stay presentational.** Validation state for the Add-to-cart error is
   derived in the handler/usecase and passed down as a prop — no `if` chains
   added to `MenuItemDetailScreen`.

---

## Feature Requirements

### FR-1: The cart bar floats at the bottom of the viewport

**Behavior:** on any order-app route, once the cart is non-empty, the cart bar is
visible at the bottom edge of the screen without scrolling, and stays there while
the content scrolls behind it.

- `OrderLayout` gets a definite height (`height: 100dvh` with a `100vh`
  fallback for older browsers) and `overflow: hidden`, so the inner `ScrollView`
  owns the scroll.
- The footer slot gets `paddingBottom` = `env(safe-area-inset-bottom)` (falling
  back to `$3`), and `apps/order/index.html` gets `viewport-fit=cover`.
- The scroll content gets bottom padding equal to the footer height so the last
  menu item is never trapped under the bar.
- The sticky search/chips header in `MenuListScreen` must still stick correctly
  once the scrolling element changes from the document to the `ScrollView`.
- The sticky checkout bar in `CartScreen` must still stick correctly for the
  same reason. If `position: sticky` misbehaves inside the now-scrolling
  `ScrollView`, move that bar into `OrderLayout`'s `footer` slot instead (the
  cart route already passes `hideCartBar`, so the slot is free).
- `MenuItemDetailScreen`'s `Sheet` must still open full-height over the shell.

### FR-2: `recipe` field on Product and Variant

**Data model.** New nullable `TEXT` column `recipe` on `products` and `variants`,
threaded through every layer listed in the Context table.

**Migration** (`000022_add_product_variant_recipe`):

```sql
-- up
ALTER TABLE `products` ADD COLUMN `recipe` TEXT NULL AFTER `description`;
ALTER TABLE `variants` ADD COLUMN `recipe` TEXT NULL AFTER `description`;

UPDATE `products` SET `recipe` = `description`
  WHERE `description` IS NOT NULL AND `description` <> '';
UPDATE `variants` SET `recipe` = `description`
  WHERE `description` IS NOT NULL AND `description` <> '';

UPDATE `products` SET `description` = NULL;
UPDATE `variants` SET `description` = NULL;
```

```sql
-- down
UPDATE `products` SET `description` = `recipe` WHERE `description` IS NULL;
UPDATE `variants` SET `description` = `recipe` WHERE `description` IS NULL;
ALTER TABLE `products` DROP COLUMN `recipe`;
ALTER TABLE `variants` DROP COLUMN `recipe`;
```

**Contract.** `recipe: { type: string }` added to `Product`, `ProductRequest`,
`Variant`, `VariantRequest` — optional in all four (not added to any `required`
list, matching how `description` is declared today). `description` gains
`maxLength: 160` in both request schemas.

**Validation (API).** Reject a `description` that exceeds 160 characters or
contains a newline, with the existing validation-error shape. `recipe` is
unvalidated free text.

### FR-3: POS forms — Recipe tab, single-line Description

**`ProductFormView.tsx`:**
- The `description` field moves out of the tab strip and into the header `Card`,
  as a plain `<Field name="description" label="Description"><InputText /></Field>`
  with helper text: *"One short line shown to customers in the order app."*
- The first tab becomes **Recipe**, holding
  `<MarkdownEditor name="recipe" defaultMode={form.getValues('recipe') === '' ? 'edit' : 'preview'} />`,
  with helper text: *"Internal preparation steps. Never shown to customers."*
- `Tabs defaultValue` becomes `"recipe"`.

**`VariantFormView.tsx`:** same treatment — the `description` tab becomes a
`recipe` tab (`<MarkdownEditor name="recipe" defaultMode="edit" />`), and a
single-line `description` field joins the header fields.

**Form schemas** (`ProductCreateController`, `ProductUpdateController`,
`VariantCreateController`, `VariantUpdateController`):

```ts
description: z.string().max(160).refine((v) => !v.includes('\n'), {
  message: 'Description must be a single line',
}),
recipe: z.string(),
```

**Entities/usecases/transformers:** `recipe?: string` added to `Product`,
`ProductForm`, `Variant`, `VariantForm`; mapped in both directions in
`product.transformer.ts` / `variant.transformer.ts`; defaulted to `''` in the
create usecases and seeded from the fetched entity in the update usecases,
exactly as `description` is today.

### FR-4: `recipe` is never exposed publicly

- Add `ToPublicApiProduct(product)` and `ToPublicApiVariant(variant)` to the REST
  transformers. Each delegates to the existing `ToApiProduct`/`ToApiVariant` and
  then clears `Recipe` — including the nested `Variant.Product.Recipe`.
- `public_handler.go` uses the public transformers in `GetProductList`,
  `GetProductById` and `GetVariantList`.
- `public_handler_test.go` asserts, on the marshalled JSON, that the string
  `"recipe"` does not appear in any `/public/*` response, for a product and a
  variant whose recipe is non-empty.

### FR-5: Add-to-cart CTA label and validation error

`MenuItemDetailScreen`'s primary CTA:

| State | Label | Enabled |
|---|---|---|
| Options incomplete | `Tambah ke Keranjang` | **yes** |
| Resolving variant | `Menghitung harga...` | no |
| Variant resolved | `Tambah ke Keranjang · Rp{price × amount}` | yes |

- Pressing the CTA while options are incomplete does **not** add to the cart. It
  shows an inline error above the CTA: `Pilih {nama opsi} dulu ya` for a single
  missing group, or `Lengkapi pilihan {opsi A} dan {opsi B}` when more than one
  is missing.
- The error message clears as soon as the missing option is selected.
- The un-selected option group(s) are visually marked (red group label) so the
  guest can see *where* to look, not just read that something is missing.
- The screen receives this as props (`missingOptionNames: string[]`,
  `validationMessage: string | null`) computed by `MenuItemDetailHandler` from the
  usecase state — the screen does not derive it.
- `isAddToCartEnabled` is replaced by an explicit `ctaState:
  'ready' | 'incomplete' | 'resolving'` so the three cases stay exhaustive.
- The variant-resolution error (`variantErrorMessage`, e.g. a combination with no
  variant) keeps its current, separate rendering — it is a server outcome, not a
  form-validation outcome.

### FR-6: Relocate "Kosongkan keranjang" and confirm it

- `CartScreen`'s `loaded` variant gains a header row:
  `[ "Keranjang" (bold) ............... "Kosongkan" (small red text button) ]`.
- The full-width red outlined button at the bottom is removed.
- The "Kosongkan" control is `size="$2"`, `chromeless`, `theme="red"`, with
  `accessibilityLabel="Kosongkan keranjang"` — so the existing e2e selector keeps
  matching by accessible name while the visible label shortens.
- Pressing it opens a `ConfirmationAlert`:
  - title: `Kosongkan keranjang?`
  - description: `Semua item di keranjang akan dihapus.`
  - confirm: `Kosongkan` · cancel: `Batal`
- Only the confirm action dispatches `CLEAR`. Dialog open/close state lives in
  `CartHandler`, not `CartScreen` — `CartScreen` receives
  `isClearConfirmationOpen` and the callbacks.
- The control is disabled while `isMutating`.

### FR-7: Compact, correctly-themed cart row controls

- `AmountStepper` gains `size?: 'sm' | 'md'` (default `'md'`). `'sm'` renders
  32×32 buttons with `size="$2"` and `gap="$2"`; `'md'` is today's 44×44.
- `CartLineItem` passes `size="sm"`.
- `MenuItemDetailScreen` keeps the default (44×44).
- `CartLineItem`'s trash button becomes 32×32, `size="$2"`, `theme="red"` with a
  red icon, keeping its `accessibilityLabel` unchanged
  (`Hapus {product} dari keranjang`).
- Both shrunk controls keep an effective ≥44px touch target via padding/`hitSlop`.
- The freed horizontal space goes to the product name / option line, which keeps
  `numberOfLines={1}`.

### FR-8: Show the table's floor number in the order app header

**Behavior:** once a QR resolves, the order app header reads
`Meja 3 · Lantai 2` instead of `Meja 3`.

**Contract**
- `PublicTable` gains `floorNumber: { type: integer, format: int32 }`, added to
  its `required` list (it is `NOT NULL DEFAULT 1` in the DB, so it is always
  present server-side).
- `ToApiPublicTable` maps `FloorNumber`, and its doc comment is updated: it
  strips the table **code**, not "everything but id and label".
- The same field consequently appears on the cart's embedded `table`
  (`GET /carts/current`) — intended, and asserted rather than left implicit.

**Frontend**
- `PublicTable` entity gains `floorNumber: number`; the comment is updated to
  say the `code` is what is never echoed back.
- `publicTable.transformer.ts` maps it with a `?? 1` fallback (see the decision
  table); `data/mock/publicTable.ts` fixtures gain floors, including one table on
  floor 2 so the multi-floor case is exercised in Storybook and tests.
- `TableResolveScreen.tsx`'s `resolved` header renders the label bold plus a
  muted `· Lantai {floorNumber}`, wrapping to a second line when the row is too
  narrow.

**Copy:** `Lantai {n}`, Bahasa Indonesia, per D15. The POS keeps `Floor {n}`.

**Not in scope here:** showing the floor anywhere else in the order app (cart,
checkout, order confirmation), or letting a guest pick/change their floor.

---

## Non-Goals

1. **Rich text in `description`.** It becomes plain single-line text. No Markdown,
   no line breaks.
2. **Backfilling a *good* description.** The migration nulls `description`;
   writing real customer-facing one-liners for the existing catalog is a content
   task for staff, done through the POS form after this ships.
3. **A read-only recipe view for baristas** (kitchen slip, station screen, product
   detail page). Recipes stay editable-only in the product/variant form.
4. **Recipe versioning, per-station recipes, or recipe images.**
5. **Reworking the checkout screen** (`CheckoutScreen.tsx`) — untouched here
   beyond whatever FR-1's layout change implies.
6. **Changing `AmountStepper` behavior** — the `min: 1` floor and the disabled
   decrement stay exactly as they are.
7. **Localizing the POS forms.** They stay English.

---

## Risks

| Risk | Mitigation |
|---|---|
| The migration nulls a `description` that was genuinely customer-facing (some seeded ones are — "Rich and bold espresso shot"). | The `down` migration restores it. Take a DB snapshot before running (standard for this repo's migrations), and announce the change so staff know to re-enter descriptions. |
| FR-1's `height: 100dvh` breaks the sticky header/footer that currently rely on document scrolling. | FR-1 explicitly re-verifies both sticky surfaces, and has a documented fallback (move the checkout bar into the `footer` slot). Storybook + e2e both cover these screens. |
| `recipe` leaks publicly via a future endpoint that reuses `ToApiProduct`. | FR-4 asserts absence on the marshalled JSON, so a new endpoint that forgets the public transformer fails the test only if it is added to that test — noted in the `ToApiProduct` doc comment as well. |
| Enabling the CTA when options are incomplete lets a double-tap race the variant resolution. | The `resolving` state stays disabled, so the only enabled-but-not-ready state is `incomplete`, which never dispatches an add. |
| Shrinking controls hurts tap accuracy. | 32px floor + hit slop, and the item-detail stepper (the one used most) stays 44px. |
| Widening `PublicTable` sets a precedent for leaking more table fields to guests. | The `ToApiPublicTable` doc comment is rewritten to state the actual rule — the table `code` is never returned — and the public handler test asserts `code` is absent, so the boundary is enforced by a test rather than by the field count. |
| The order app ships before the API redeploys and renders `Lantai undefined`. | The frontend transformer defaults `floorNumber` to `1`, so a stale API degrades to "floor 1" rather than to broken copy. |

---

## Open Questions

1. **Is `recipe` the right name given `materials`?** The docs site already calls a
   variant's materials its "recipe". Proposal: keep `recipe` for the new
   free-text field (it is what staff call it) and rename the docs-site prose to
   "ingredients" / "bill of materials" where it means `materials`. Alternative if
   the collision is unacceptable: `preparationNotes`.
2. **Should `recipe` live on the product, the variant, or both?** This PRD says
   both, mirroring `description`, because per-size preparation genuinely differs.
   If in practice only variants carry recipes, the product-level field is dead
   weight — but adding it later is a second migration.
3. **Description max length: 160 characters?** Chosen to fit two lines on a 375px
   card. Confirm against the longest real description staff want to write.
4. **Should the cart bar also show on the checkout screen?** Today both cart and
   checkout pass `hideCartBar`. Unchanged here, but worth confirming that a guest
   on the checkout screen never wants to go back to the cart via the bar (there
   is a back affordance).
5. **Suppress "Lantai 1" in a single-floor venue?** This PRD always shows the
   floor. The alternative — hide it when the venue has exactly one distinct
   floor — needs a venue-level setting or an extra query, and would hide the
   floor for every un-curated table master (all of which default to floor `1`).
   Revisit if the copy reads as noise in a one-floor cafe.
6. **Does staff-side order routing need the floor too?** FR-8 only changes what
   the guest sees. If a barista reading an incoming order also needs "Lantai 2"
   on the slip, that is a separate change to the POS transaction/kitchen views —
   the field is now available to them either way.

---

## Implementation Phases

Nine PRs. Phase 2 → Phase 3 → Phase 4 is the only hard chain; Phases 1, 5, 6, 7
and 8 are independent of everything and of each other, and can be merged in any
order or in parallel. Phase 9 (docs) comes last.

---

### Phase 1 — Order shell: make the cart bar float

**Goal:** FR-1.

**Frontend**
- `libs/ui/src/presentation/components/base/OrderLayout.tsx`: definite height
  (`100dvh` with a `100vh` fallback), `overflow: hidden`, footer wrapper with
  safe-area bottom padding, and bottom padding on the scroll content.
- `apps/order/index.html`: `viewport-fit=cover` on the viewport meta.
- `apps/order/src/styles.css`: `html, body, #root { height: 100%; margin: 0; }`.
- Verify (and fix if needed) the sticky header in `MenuListScreen.tsx` and the
  sticky checkout bar in `CartScreen.tsx` against the new scrolling element.
- `OrderLayout.stories.tsx`: add a story with long content + a footer.

**Backend:** none.

**Acceptance**
- On a 375×667 viewport with 30+ menu items, the cart bar is visible without
  scrolling and stays fixed while the menu scrolls.
- The last menu card is fully readable — not covered by the bar.
- The search field and category chips still stick to the top while scrolling.
- The checkout bar on the cart screen still sticks to the bottom.
- The item detail `Sheet` still opens over the full screen.
- On iOS Safari the bar clears the home indicator.
- `apps/order-e2e` passes unchanged.

**Estimated diff:** ~60–120 LoC.

---

### Phase 2 — Backend: `recipe` column, migration, contract

**Goal:** FR-2 + FR-4. No visible product change; this is the enabling PR.

**Backend**
- `apps/api/migrations/000022_add_product_variant_recipe.{up,down}.sql` — as
  specified in FR-2.
- `apps/api/domain/product_entity.go`, `variant_entity.go`: `Recipe *string`.
- `apps/api/data/mysql/product_entity.go`, `variant_entity.go`: `Recipe *string`;
  both transformers map it in both directions.
- `apps/api/presentation/restapi/product_transformer.go`,
  `variant_transformer.go`: map `Recipe` in `ToApiProduct`/`ToProduct` and
  `ToApiVariant`/`ToVariant`; add `ToPublicApiProduct` / `ToPublicApiVariant`
  that strip it (including the nested product on a variant).
- `apps/api/presentation/restapi/public_handler.go`: use the public transformers.
- `description` length/newline validation in the product and variant usecases.
- `apps/api/seeds/product_seeder.go`, `variant_seeder.go`: split the existing
  seed text — a short one-line `Description` plus a Markdown `Recipe` for at
  least two products and two variants, so the feature is visible in a seeded DB.
- `libs/api-contract/src/api.yaml`: `recipe` on `Product`, `ProductRequest`,
  `Variant`, `VariantRequest`; `maxLength: 160` on both request `description`s.
- Regenerate clients: `nx run api-contract:generate:go` and
  `nx run api-contract:generate:ts`.
- Tests: `product_usecase_test.go`, `variant_usecase_test.go` (round-trip +
  description validation), `product_handler_test.go`, `variant_handler_test.go`,
  and a `public_handler_test.go` case asserting `"recipe"` is absent from the
  marshalled `/public/products`, `/public/products/{id}` and `/public/variants`
  responses.

**Frontend:** none. Generated TS types gain `recipe`; unused this phase.

**Acceptance**
- Migration applies on a populated DB: every product/variant that had a
  `description` now has that exact text in `recipe`, and `description IS NULL`.
- `down` restores the text into `description` and drops the columns.
- `GET`/`POST`/`PUT` on `/products` and `/variants` read and write `recipe`.
- A `description` longer than 160 chars or containing `\n` is rejected with a
  validation error.
- No `/public/*` response contains `recipe`.
- Full Go test suite passes.

**Estimated diff:** ~350–450 LoC (excluding generated clients).

---

### Phase 3 — POS: Recipe tab + single-line Description

**Goal:** FR-3.

**Frontend**
- `libs/ui/src/domain/entities/Product.ts`, `Variant.ts`: `recipe?: string` on
  the entity and the form type.
- `libs/ui/src/data/api/product.transformer.ts`, `variant.transformer.ts`: map
  `recipe` in both directions (including `variant.product.recipe`).
- `libs/ui/src/domain/usecases/productCreate.ts`, `productUpdate.ts`,
  `variantCreate.ts`, `variantUpdate.ts`: default `recipe: ''` on create, seed
  from the fetched entity on update, send it on submit.
- `ProductCreateController.tsx`, `ProductUpdateController.tsx`,
  `VariantCreateController.tsx`, `VariantUpdateController.tsx`: schema per FR-3.
- `ProductFormView.tsx`, `VariantFormView.tsx`: single-line `description` in the
  header card with helper text; `recipe` Markdown editor as the first tab with
  helper text; `defaultValue="recipe"`.
- Stories: `ProductFormView.stories.tsx`, `VariantFormView.stories.tsx`,
  `ProductUpdateScreen.stories.tsx`, `VariantUpdateScreen.stories.tsx` — add
  `recipe` to fixtures, plus a story with a long Markdown recipe.
- Tests: `productCreate/Update`, `variantCreate/Update` usecase tests assert
  `recipe` round-trips; add a controller test for the single-line/160-char rule.

**Backend:** none.

**Acceptance**
- Editing a product/variant shows the previously-written recipe text in the
  Recipe tab (this is the migrated content) and an empty Description field.
- Saving a recipe persists it and it reloads intact, Markdown preserved.
- Typing >160 chars or pasting a newline into Description shows a field error and
  blocks submit.
- Existing product/variant create/edit flows are otherwise unregressed.

**Estimated diff:** ~250–350 LoC.

**Dependency:** Phase 2 merged and deployed.

---

### Phase 4 — Order app: show the real description

**Goal:** close the loop on feedback 2 — verify the customer-facing surfaces now
render a clean one-liner, and stop them from ever rendering anything else.

**Frontend**
- `MenuProductCard.tsx`: already caps the description at `numberOfLines={2}` — no
  change needed; keep the cap as a guard against an over-long description.
- `MenuItemDetailScreen.tsx`: description stays a single `<Paragraph>`; confirm
  it never receives `recipe` (it cannot — the public payload omits it).
- Stories/fixtures across the menu components updated to short one-line
  descriptions rather than the current recipe-ish text.
- Add a Storybook case for the empty-description product (already exists in
  `MenuProductCard.stories.tsx`) to confirm the layout does not collapse.

**Backend:** none.

**Acceptance**
- The menu card and the item detail sheet show only the short description.
- A product with no description renders no empty gap.

**Estimated diff:** ~40–80 LoC. Mostly fixtures.

**Dependency:** Phase 2 (public payload shape). Cosmetically independent of
Phase 3.

---

### Phase 5 — Item detail: `Tambah ke Keranjang` + inline validation

**Goal:** FR-5.

**Frontend**
- `libs/ui/src/presentation/screens/MenuItemDetailScreen.tsx`: replace
  `isAddToCartEnabled` with `ctaState`; always-`Tambah ke Keranjang` label;
  inline error text above the CTA; red group labels for missing options.
- `libs/ui/src/presentation/components/menu/OptionValueChipGroup.tsx`: accept
  `hasError?: boolean` and tint the group label.
- `libs/ui/src/presentation/screens/MenuItemDetailHandler.tsx`: derive
  `missingOptionNames` from `product.options` vs `selectedOptionValueIds`; hold
  the "user pressed while incomplete" flag; clear it on any option selection.
- Stories: incomplete-with-error, incomplete-untouched, resolving, ready.
- Tests: `MenuItemDetailHandler.test.tsx` — the CTA reads `Tambah ke Keranjang`
  while incomplete; pressing it shows the error and does **not** call
  `onAddToCart`; selecting the option clears the error; pressing again adds.
- `apps/order-e2e/src/table-ordering.spec.ts:187` and
  `apps/order-e2e/src/utils/selectors.ts`: update for the new label/behavior.

**Backend:** none.

**Acceptance**
- The CTA never reads `Pilih semua opsi`.
- Pressing it with an unselected option group shows a message naming that group,
  and nothing is added to the cart.
- Two missing groups produce the combined message.
- Once all options are chosen and the price resolves, the CTA reads
  `Tambah ke Keranjang · Rp…` and adds the item.

**Estimated diff:** ~150–220 LoC.

---

### Phase 6 — Cart: relocate and confirm "Kosongkan keranjang"

**Goal:** FR-6.

**Frontend**
- `CartScreen.tsx`: header row with title + small red text button; remove the
  full-width clear button; render `ConfirmationAlert` driven by new props.
- `CartHandler.tsx`: own the dialog open state; dispatch `CLEAR` only on confirm.
- Stories: `CartScreen.stories.tsx` — loaded, and loaded-with-dialog-open.
- Tests: `CartHandler.test.tsx` — pressing "Kosongkan" opens the dialog and does
  **not** dispatch; confirming dispatches `CLEAR`; cancelling does not.
- `apps/order-e2e/src/utils/selectors.ts` and the cart spec: the selector matches
  by accessible name (`Kosongkan keranjang`) and the flow now goes through the
  confirmation dialog.

**Backend:** none.

**Acceptance**
- The bottom of the cart screen contains only the totals and the checkout bar.
- Clearing takes two deliberate taps and can be cancelled.
- The control is disabled while a cart mutation is in flight.

**Estimated diff:** ~120–180 LoC.

---

### Phase 7 — Cart: compact stepper and destructive delete

**Goal:** FR-7.

**Frontend**
- `libs/ui/src/presentation/components/menu/AmountStepper.tsx`: add
  `size?: 'sm' | 'md'` (default `'md'`); `'sm'` = 32×32, `size="$2"`, `gap="$2"`.
- `libs/ui/src/presentation/components/cart/CartLineItem.tsx`: pass `size="sm"`;
  trash button to 32×32, `size="$2"`, `theme="red"`, red icon; keep the
  `accessibilityLabel`.
- Stories: `AmountStepper.stories.tsx` gains an `sm` story;
  `CartLineItem.stories.tsx` refreshed (long name, with note, disabled).

**Backend:** none.

**Acceptance**
- Cart rows are visibly denser; the product name and options have more room.
- The delete button is red and unmistakably destructive.
- The item detail sheet's stepper is unchanged at 44×44.
- Existing e2e selectors (`Hapus {product} dari keranjang`) still match.
- Every control still has an effective ≥44px touch target.

**Estimated diff:** ~80–140 LoC.

---

### Phase 8 — Table floor number in the order app header

**Goal:** FR-8.

Unlike the `recipe` field, this ships as **one** PR rather than a backend/frontend
split: it is a single additive contract field with no migration and no data
move, and the `?? 1` fallback in the transformer means the order app renders
correctly even if it reaches a browser before the API is redeployed.

**Backend**
- `libs/api-contract/src/api.yaml`: add `floorNumber` (`integer`, `int32`) to
  `PublicTable` and to its `required` list.
- Regenerate clients: `nx run api-contract:generate:go` and
  `nx run api-contract:generate:ts`.
- `apps/api/presentation/restapi/table_transformer.go`: map `FloorNumber` in
  `ToApiPublicTable`; rewrite the doc comment to say it strips the table
  **code** (the thing D6 actually protects), not "everything but id and label".
- `apps/api/presentation/restapi/public_handler_test.go`: assert
  `/public/tables/{code}` returns `floorNumber`, and — unchanged but now worth
  re-asserting explicitly — that it still never returns `code`.
- `apps/api/presentation/restapi/cart_handler_test.go`: assert the cart's
  embedded `table` carries `floorNumber` too.

**Frontend**
- `libs/ui/src/domain/entities/PublicTable.ts`: add `floorNumber: number`; update
  the comment.
- `libs/ui/src/data/api/publicTable.transformer.ts`: `floorNumber: table.floorNumber ?? 1`.
- `libs/ui/src/data/mock/publicTable.ts`: fixtures gain `floorNumber`, with at
  least one table on floor 2.
- `libs/ui/src/presentation/screens/TableResolveScreen.tsx`: header renders
  `{label}` bold + muted `· Lantai {floorNumber}`, wrapping on narrow rows.
- `TableResolveScreen.stories.tsx`: resolved-floor-1, resolved-floor-2, and a
  long-label case to prove the wrap.
- `libs/ui/src/presentation/screens/TableResolveHandler.test.tsx`: assert the
  floor renders.
- `apps/order-e2e`: the table header assertion (if any) updated for the new copy.

**Acceptance**
- Scanning a QR for a table on floor 2 shows `Meja 3 · Lantai 2` in the header.
- A table on floor 1 shows `Meja 1 · Lantai 1` — the floor is never hidden.
- The public endpoint still never returns the table `code`.
- A long table label wraps rather than pushing the floor off-screen.
- `GET /carts/current` includes `floorNumber` on its embedded table.

**Estimated diff:** ~90–140 LoC (excluding generated clients).

---

### Phase 9 (optional) — Documentation

**Goal:** keep `docs-site` truthful about the new field and the new header.

- `docs-site/catalog/products.md` and `variants.md`: document `recipe` as
  staff-only preparation notes, `description` as the customer-facing one-liner,
  and disambiguate the informal "recipe" prose that currently means `materials`
  (Open Question 1).
- `docs-site/sales/table-ordering.md`: note that the order app shows
  `description` only, and that the table header now shows the floor number.

**Estimated diff:** ~40–60 LoC of prose.

**Dependency:** Phases 2–4 and 8 merged.
