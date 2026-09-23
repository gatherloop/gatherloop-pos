import { ApiCartRepository } from '../../data/api/cart';
import { ApiPaymentRepository } from '../../data/api/payment';
import { ApiPublicTableRepository } from '../../data/api/publicTable';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { UrlCartQueryRepository } from '../../data/url/cartQuery';
import { PublicTable } from '../../domain/entities/PublicTable';
import { CartUsecase } from '../../domain/usecases/cart';
import { CheckoutUsecase } from '../../domain/usecases/checkout';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { CartHandler } from '../../presentation/handlers/order/CartHandler';

export type CartProps = {
  sessionId: string;
  code: string;
  table?: PublicTable | null;
  customerName?: string;
  customerWhatsappNumber?: string;
  preparingCount?: number;
};

export function Cart({
  sessionId,
  code,
  table,
  customerName,
  customerWhatsappNumber,
  preparingCount,
}: CartProps) {
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
    customerWhatsappNumber,
  });
  const enabled = process.env['NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED'] === 'true';
  const isCashPaymentEnabled =
    process.env['NEXT_PUBLIC_ORDER_CASH_PAYMENT_ENABLED'] === 'true';
  const cashierLocation =
    process.env['NEXT_PUBLIC_ORDER_CASHIER_LOCATION'] || 'Lantai 1';

  return (
    <CartHandler
      tableResolveUsecase={tableResolveUsecase}
      cartUsecase={cartUsecase}
      checkoutUsecase={checkoutUsecase}
      sessionRepository={sessionRepository}
      enabled={enabled}
      isCashPaymentEnabled={isCashPaymentEnabled}
      cashierLocation={cashierLocation}
      tableCode={code}
      preparingCount={preparingCount}
    />
  );
}
