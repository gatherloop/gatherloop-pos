// Mirrors libs/ui/src/utils/currency.ts's formatRupiah() exactly (D15 in
// docs/prd-table-ordering.md), kept as a small local copy rather than an
// import — every other e2e spec in this repo asserts against literal
// strings rather than reaching into the app's source, and the SPA's `libs/ui`
// entry point (D20) pulls in Tamagui/React, which this Node-side test file
// has no business resolving.
export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}Rp ${Math.abs(rounded).toLocaleString('id')}`;
}
