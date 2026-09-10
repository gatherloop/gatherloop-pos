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

// P6 in docs/trd-order-app-composition-and-ssr.md: resolves the session,
// the table and (D24) the guest's known name, so menu → cart → checkout
// shows no "Memuat meja…" on the first response and the name sheet opens
// prefilled instead of after a client fetch.
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
    // `undefined` (an unexpected transport error) keeps today's client-only
    // retry path instead of failing the whole page; `null` (a known-bad
    // code) seeds `notFound` directly.
    new ApiPublicTableRepository()
      .resolveTableByCode(code)
      .catch((error) =>
        error instanceof TableNotFoundError ? null : undefined
      ),
    // A failed fetch just leaves the name sheet unprefilled — the guest
    // still types it themselves, the same fallback the client-only path
    // already has.
    new ApiCustomerRepository(sessionRepository)
      .fetchCurrentName()
      .catch(() => ''),
  ]);

  return {
    props: { sessionId, code, table, customerName },
  };
};

export default Checkout;
