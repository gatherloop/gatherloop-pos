import { ApiCartRepository } from '../../data/api/cart';
import { ApiPublicTableRepository } from '../../data/api/publicTable';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { UrlCartQueryRepository } from '../../data/url/cartQuery';
import { PublicTable } from '../../domain/entities/PublicTable';
import { CartUsecase } from '../../domain/usecases/cart';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { CartHandler } from '../../presentation/handlers/order/CartHandler';

export type CartProps = {
  sessionId: string;
  code: string;
  table?: PublicTable | null;
};

export function Cart({ sessionId, code, table }: CartProps) {
  const sessionRepository = new CookieSessionRepository(sessionId);
  const publicTableRepository = new ApiPublicTableRepository();
  const cartRepository = new ApiCartRepository(sessionRepository);
  const cartQueryRepository = new UrlCartQueryRepository();

  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
    table,
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
