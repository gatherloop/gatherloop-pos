import { TableResolveScreen } from './TableResolveScreen';

// D10 in docs/trd-order-app-composition-and-ssr.md: `/` and the unmatched-
// route fallback both land on the "scan the QR at your table" screen (D17 in
// docs/prd-table-ordering.md). There is no code to resolve — `code` is
// always `null` here and `TableResolveUsecase` never leaves `noCode` for
// that params — so this renders the outcome directly instead of running a
// usecase and a handler hook for a state that can never change.
export const TableScanScreen = () => (
  <TableResolveScreen variant={{ type: 'noQr' }} />
);
