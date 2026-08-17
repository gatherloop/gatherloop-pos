// D3/FR-4 in docs/prd-table-ordering.md: the anonymous session id is the
// bearer of the cart (D8), minted client-side since there is no server to
// mint it (D18). This port hides where it and the last-resolved table code
// live (cookie + localStorage) from domain and presentation.
export interface SessionRepository {
  getSessionId: () => string;
  getTableCode: () => string | null;
  setTableCode: (code: string) => void;
}
