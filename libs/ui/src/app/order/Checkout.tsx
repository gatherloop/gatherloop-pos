import { ApiPublicTableRepository } from '../../data/api/publicTable';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { PublicTable } from '../../domain/entities/PublicTable';
import { TableResolveUsecase } from '../../domain/usecases/tableResolve';
import { CheckoutHandler } from '../../presentation/handlers/order/CheckoutHandler';

export type CheckoutProps = {
  sessionId: string;
  code: string;
  table?: PublicTable | null;
};

export function Checkout({ sessionId, code, table }: CheckoutProps) {
  const sessionRepository = new CookieSessionRepository(sessionId);
  const publicTableRepository = new ApiPublicTableRepository();

  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
    table,
  });
  const enabled = process.env['NEXT_PUBLIC_ORDER_CHECKOUT_ENABLED'] === 'true';

  return (
    <CheckoutHandler
      tableResolveUsecase={tableResolveUsecase}
      sessionRepository={sessionRepository}
      enabled={enabled}
      tableCode={code}
    />
  );
}
