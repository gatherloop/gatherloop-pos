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

// P6 in docs/trd-order-app-composition-and-ssr.md: resolves the session,
// the table and (FR-10) the payment by reference, so the first paint is the
// real order and not a spinner.
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
    // `undefined` (an unexpected transport error) keeps today's client-only
    // retry path instead of failing the whole page; `null` (a known-bad
    // code) seeds `notFound` directly.
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
