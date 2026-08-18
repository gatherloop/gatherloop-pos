// D15 in docs/prd-table-ordering.md: the customer app formats every price
// through this helper instead of the ad-hoc `Rp. ${x.toLocaleString('id')}`
// found in TransactionListItem, so the currency string is consistent
// everywhere it renders.
export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}Rp ${Math.abs(rounded).toLocaleString('id')}`;
}
