import {
  ApiPaymentRepository,
  ApiPublicTableRepository,
  CookieSessionRepository,
  PaymentNotFoundError,
  resolveSession,
  SESSION_ID_COOKIE_NAME,
  TableNotFoundError,
} from '@gatherloop-pos/ui';
import { OrderStatus, OrderStatusProps } from '@gatherloop-pos/ui/order';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<OrderStatusProps> = async (
  ctx
) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  const code = String(ctx.params?.code ?? '');
  const reference = String(ctx.query?.ref ?? '');
  const sessionRepository = new CookieSessionRepository(sessionId);

  const [table, payment] = await Promise.all([
    // undefined keeps the client-only retry path; null seeds notFound.
    new ApiPublicTableRepository()
      .resolveTableByCode(code)
      .catch((error) =>
        error instanceof TableNotFoundError ? null : undefined
      ),
    new ApiPaymentRepository(sessionRepository)
      .fetchPayment(reference)
      .catch((error) =>
        error instanceof PaymentNotFoundError ? null : undefined
      ),
  ]);

  return {
    props: { sessionId, code, reference, table, payment },
  };
};

export default OrderStatus;
