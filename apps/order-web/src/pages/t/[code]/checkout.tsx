import {
  ApiCustomerRepository,
  ApiPublicTableRepository,
  CookieSessionRepository,
  resolveSession,
  SESSION_ID_COOKIE_NAME,
  TableNotFoundError,
} from '@gatherloop-pos/ui';
import { Checkout, CheckoutProps } from '@gatherloop-pos/ui/order';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<CheckoutProps> = async (
  ctx
) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  const code = String(ctx.params?.code ?? '');
  const sessionRepository = new CookieSessionRepository(sessionId);

  const [table, customerName] = await Promise.all([
    new ApiPublicTableRepository()
      .resolveTableByCode(code)
      .catch((error) =>
        error instanceof TableNotFoundError ? null : undefined
      ),
    new ApiCustomerRepository(sessionRepository)
      .fetchCurrentName()
      .catch(() => ''),
  ]);

  return {
    props: { sessionId, code, table, customerName },
  };
};

export default Checkout;
