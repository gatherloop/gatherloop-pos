import {
  ApiPublicTableRepository,
  resolveSession,
  SESSION_ID_COOKIE_NAME,
  TableNotFoundError,
} from '@gatherloop-pos/ui';
import { Cart, CartProps } from '@gatherloop-pos/ui/order';
import { GetServerSideProps } from 'next';

// P6 in docs/trd-order-app-composition-and-ssr.md: resolves the session
// and the table (D5 keeps the cart itself unseeded), so menu → cart shows
// no "Memuat meja…" on the first response.
export const getServerSideProps: GetServerSideProps<CartProps> = async (
  ctx
) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  const code = String(ctx.params?.code ?? '');
  // `undefined` (an unexpected transport error) keeps today's client-only
  // retry path instead of failing the whole page; `null` (a known-bad
  // code) seeds `notFound` directly.
  const table = await new ApiPublicTableRepository()
    .resolveTableByCode(code)
    .catch((error) =>
      error instanceof TableNotFoundError ? null : undefined
    );

  return {
    props: { sessionId, code, table },
  };
};

export default Cart;
