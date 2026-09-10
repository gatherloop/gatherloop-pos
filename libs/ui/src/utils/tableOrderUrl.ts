export function getTableOrderUrl(code: string): string {
  const baseUrl = process.env['NEXT_PUBLIC_ORDER_APP_BASE_URL'] ?? '';
  return `${baseUrl}/t/${code}`;
}
