import {
  ApiPaymentRepository,
  CookieSessionRepository,
  PaymentNotFoundError,
  resolveSession,
  SESSION_ID_COOKIE_NAME,
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

  const reference = String(ctx.params?.reference ?? '');
  const sessionRepository = new CookieSessionRepository(sessionId);

  const payment = await new ApiPaymentRepository(sessionRepository)
    .fetchPayment(reference)
    .catch((error) =>
      error instanceof PaymentNotFoundError ? null : undefined
    );

  return {
    props: { sessionId, reference, payment },
  };
};

export default OrderStatus;
