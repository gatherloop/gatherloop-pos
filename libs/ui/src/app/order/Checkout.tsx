import { ApiCartRepository } from '../../data/api/cart';
import { ApiPaymentRepository } from '../../data/api/payment';
import { ApiPublicTableRepository } from '../../data/api/publicTable';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { UrlCartQueryRepository } from '../../data/url/cartQuery';
import { PublicTable } from '../../domain/entities/PublicTable';
import { CartUsecase } from '../../domain/usecases/cart';
import { CheckoutUsecase } from '../../domain/usecases/checkout';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { CheckoutHandler } from '../../presentation/handlers/order/CheckoutHandler';

export type CheckoutProps = {
  sessionId: string;
  code: string;
  table?: PublicTable | null;
  customerName?: string;
};

export function Checkout({
  sessionId,
  code,
  table,
  customerName,
}: CheckoutProps) {
  const sessionRepository = new CookieSessionRepository(sessionId);
  const publicTableRepository = new ApiPublicTableRepository();
  const cartRepository = new ApiCartRepository(sessionRepository);
  const cartQueryRepository = new UrlCartQueryRepository();
  const paymentRepository = new ApiPaymentRepository(sessionRepository);

  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
    table,
  });
  const cartUsecase = new CartUsecase(cartRepository, cartQueryRepository);
  const checkoutUsecase = new CheckoutUsecase(paymentRepository, {
    customerName,
  });
  const enabled = process.env['NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED'] === 'true';

  return (
    <CheckoutHandler
      tableResolveUsecase={tableResolveUsecase}
      cartUsecase={cartUsecase}
      checkoutUsecase={checkoutUsecase}
      sessionRepository={sessionRepository}
      enabled={enabled}
      tableCode={code}
    />
  );
}
