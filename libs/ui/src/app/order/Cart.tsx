// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which would bloat the customer bundle with the POS (D6).
import { ApiCartRepository } from '../../data/api/cart';
import { ApiPublicTableRepository } from '../../data/api/publicTable';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { UrlCartQueryRepository } from '../../data/url/cartQuery';
import { CartUsecase } from '../../domain/usecases/cart';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { CartHandler } from '../../presentation/screens/order/CartHandler';

export type CartProps = {
  sessionId: string;
  code: string;
};

// Composition root for the cart screen (FR-7 in
// docs/prd-table-ordering.md). Per D9 in
// docs/trd-order-app-composition-and-ssr.md this now wires up the table
// shell and the item-edit modal too, in addition to the cart itself — the
// whole vertical slice `/t/{code}/cart` renders, structurally identical to
// `app/order/MenuList.tsx` (§3.5).
export function Cart({ sessionId, code }: CartProps) {
  const sessionRepository = new CookieSessionRepository(sessionId);
  const publicTableRepository = new ApiPublicTableRepository();
  const cartRepository = new ApiCartRepository(sessionRepository);
  const cartQueryRepository = new UrlCartQueryRepository();

  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
  });
  const cartUsecase = new CartUsecase(cartRepository, cartQueryRepository);

  return (
    <CartHandler
      tableResolveUsecase={tableResolveUsecase}
      cartUsecase={cartUsecase}
      sessionRepository={sessionRepository}
      tableCode={code}
    />
  );
}
