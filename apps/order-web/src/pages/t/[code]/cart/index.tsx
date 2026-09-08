import {
  resolveSession,
  SESSION_ID_COOKIE_NAME,
} from '@gatherloop-pos/ui';
import { GetServerSideProps, NextPage } from 'next';
import { ReactElement, ReactNode } from 'react';
import { CartLayout } from '../../../../components/CartLayout';

export type CartPageProps = { sessionId: string };

// D3 in docs/trd-order-app-composition-and-ssr.md: resolves the session and
// nothing else — no seeding yet (P6).
export const getServerSideProps: GetServerSideProps<CartPageProps> = async (
  ctx
) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  return { props: { sessionId } };
};

// The cart route (FR-7 in docs/prd-table-ordering.md). The page itself
// renders nothing — `Cart` is rendered by `CartLayout.getLayout` (D4) so it
// stays mounted across navigation to/from the cart-item-edit modal.
const CartPage: NextPage<CartPageProps> & {
  getLayout?: (page: ReactElement, pageProps: CartPageProps) => ReactNode;
} = () => null;

CartPage.getLayout = (page, pageProps) => (
  <CartLayout sessionId={pageProps.sessionId}>{page}</CartLayout>
);

export default CartPage;
