// The customer-facing shape of a table (D2/D6 in
// docs/prd-table-ordering.md): only what a guest needs to see their table's
// name. The non-guessable `code` that got them here is never echoed back.
export type PublicTable = {
  id: number;
  label: string;
};
