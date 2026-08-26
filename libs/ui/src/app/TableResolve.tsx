import { ReactNode } from 'react';
import { useRouter } from 'solito/router';
import { ApiPublicTableRepository } from '../data/api/publicTable';
import { TableResolveUsecase } from '../domain/usecases/tableResolve';
import { CartBar } from '../presentation/components/cart/CartBar';
import { TableResolveHandler } from '../presentation/screens/TableResolveHandler';
import { useCart } from './CartProvider';
import { useSessionRepository } from './SessionProvider';

export type TableResolveProps = {
  code: string | null;
  children?: ReactNode;
  // The cart screen (FR-7 phase 10) renders its own sticky Checkout bar in
  // the same footer position — showing the floating cart bar there too
  // would stack two bottom bars on top of each other.
  hideCartBar?: boolean;
};

// Composition root for the `/order/t/{code}` route shell (D17/FR-4). Renders
// `children` — the menu, once phase 7 lands — once the table resolves, plus
// the floating cart bar (FR-7 phase 10) whenever the app-wide cart (D14) is
// non-empty, since every menu/detail/cart route mounts through here.
export function TableResolve({
  code,
  children,
  hideCartBar,
}: TableResolveProps) {
  const sessionRepository = useSessionRepository();
  const publicTableRepository = new ApiPublicTableRepository();
  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
  });
  const cart = useCart();
  const router = useRouter();

  const currentCart = cart.state.cart;
  const footer =
    !hideCartBar && code !== null && currentCart && currentCart.itemCount > 0 ? (
      <CartBar
        itemCount={currentCart.itemCount}
        total={currentCart.total}
        onPress={() => router.push(`/t/${code}/cart`)}
      />
    ) : null;

  return (
    <TableResolveHandler
      tableResolveUsecase={tableResolveUsecase}
      sessionRepository={sessionRepository}
      footer={footer}
    >
      {children}
    </TableResolveHandler>
  );
}
