export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}Rp ${Math.abs(rounded).toLocaleString('id')}`;
}
