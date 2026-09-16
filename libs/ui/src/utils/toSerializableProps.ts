// Next.js refuses to serialize `undefined` anywhere inside getServerSideProps'
// returned props, but the optional availability fields on Product/Variant are
// `undefined` for any untracked item — which is the default (D16 in
// docs/prd-product-availability.md). Round-tripping through JSON drops those
// keys the same way `undefined` already does client-side, so a page later
// reading `product.sellableQuantity === undefined` sees identical behavior.
export function toSerializableProps<T>(props: T): T {
  return JSON.parse(JSON.stringify(props)) as T;
}
