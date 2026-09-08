import {
  resolveSession,
  SESSION_ID_COOKIE_NAME,
} from '@gatherloop-pos/ui';
import { CartItemEdit } from '@gatherloop-pos/ui/order';
import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { ReactElement, ReactNode } from 'react';
import { CartLayout } from '../../../../../components/CartLayout';

export type CartItemEditPageProps = { sessionId: string };

// D3 in docs/trd-order-app-composition-and-ssr.md: resolves the session and
// nothing else — no seeding yet (P6).
export const getServerSideProps: GetServerSideProps<
  CartItemEditPageProps
> = async (ctx) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  return { props: { sessionId } };
};

// The cart-item-edit modal (FR-9 in docs/prd-order-app-ux-improvements.md),
// rendered alongside `Cart` (mounted by `CartLayout.getLayout`, D4) rather
// than instead of it, so the modal sits on top of the cart.
const CartItemEditPage: NextPage<CartItemEditPageProps> & {
  getLayout?: (
    page: ReactElement,
    pageProps: CartItemEditPageProps
  ) => ReactNode;
} = () => {
  const router = useRouter();
  const cartItemId =
    typeof router.query.cartItemId === 'string'
      ? Number(router.query.cartItemId)
      : NaN;

  return <CartItemEdit cartItemId={cartItemId} />;
};

CartItemEditPage.getLayout = (page, pageProps) => (
  <CartLayout sessionId={pageProps.sessionId}>{page}</CartLayout>
);

export default CartItemEditPage;
