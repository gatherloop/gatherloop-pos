import {
  resolveSession,
  SESSION_ID_COOKIE_NAME,
} from '@gatherloop-pos/ui';
import { Checkout } from '@gatherloop-pos/ui/order';
import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { ReactElement, ReactNode } from 'react';
import { TableLayout } from '../../../components/TableLayout';

export type CheckoutPageProps = { sessionId: string };

// D3 in docs/trd-order-app-composition-and-ssr.md: resolves the session and
// nothing else — no seeding yet (P6).
export const getServerSideProps: GetServerSideProps<
  CheckoutPageProps
> = async (ctx) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  return { props: { sessionId } };
};

// The checkout route (FR-8 in docs/prd-table-ordering.md). Unlike the
// menu/cart pairs, checkout has no sibling route to share a mount with, so
// `Checkout` is rendered by the page itself rather than lifted into the
// layout — `TableLayout` is still shared by reference with every other
// `/t/[code]/**` page (D4), which is what keeps the table resolved once per
// visit across menu -> cart -> checkout.
const CheckoutPage: NextPage<CheckoutPageProps> & {
  getLayout?: (page: ReactElement, pageProps: CheckoutPageProps) => ReactNode;
} = () => {
  const router = useRouter();
  const code = typeof router.query.code === 'string' ? router.query.code : '';

  return <Checkout tableCode={code} />;
};

CheckoutPage.getLayout = (page, pageProps) => (
  <TableLayout sessionId={pageProps.sessionId} hideCartBar>
    {page}
  </TableLayout>
);

export default CheckoutPage;
