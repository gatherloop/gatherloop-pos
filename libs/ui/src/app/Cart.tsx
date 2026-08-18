import { CartHandler } from '../presentation/screens/CartHandler';
import { useCart } from './CartProvider';

export type CartProps = {
  tableCode: string;
};

// Composition root for the cart screen (FR-7 phase 10 in
// docs/prd-table-ordering.md), mounted at `/order/t/{code}/cart`. Reads the
// app-wide `CartProvider` controller (D14) rather than owning a
// `CartUsecase` itself — the same machine backs the floating bar and the
// item detail sheet's Add-to-cart CTA (phase 9).
export function Cart({ tableCode }: CartProps) {
  const cart = useCart();
  return <CartHandler cart={cart} tableCode={tableCode} />;
}
