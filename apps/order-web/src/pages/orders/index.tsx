import {
  ApiPaymentRepository,
  CookieSessionRepository,
  ORDER_HISTORY_LIMIT,
  resolveSession,
  SESSION_ID_COOKIE_NAME,
} from '@gatherloop-pos/ui';
import { OrderHistory, OrderHistoryProps } from '@gatherloop-pos/ui/order';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<OrderHistoryProps> = async (
  ctx
) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  const sessionRepository = new CookieSessionRepository(sessionId);

  const { payments } = await new ApiPaymentRepository(sessionRepository)
    .fetchPayments({ limit: ORDER_HISTORY_LIMIT, skip: 0 })
    .catch(() => ({ payments: [], total: 0 }));

  return {
    props: { sessionId, payments },
  };
};

export default OrderHistory;
