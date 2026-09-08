import { Checkout } from '@gatherloop-pos/ui/order';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { ReactElement, ReactNode } from 'react';
import { TableLayout } from '../../../components/TableLayout';

// The checkout route (FR-8 in docs/prd-table-ordering.md). Unlike the
// menu/cart pairs, checkout has no sibling route to share a mount with, so
// `Checkout` is rendered by the page itself rather than lifted into the
// layout — `TableLayout` is still shared by reference with every other
// `/t/[code]/**` page (D4), which is what keeps the table resolved once per
// visit across menu -> cart -> checkout.
const CheckoutPage: NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
} = () => {
  const router = useRouter();
  const code = typeof router.query.code === 'string' ? router.query.code : '';

  return <Checkout tableCode={code} />;
};

CheckoutPage.getLayout = (page) => <TableLayout hideCartBar>{page}</TableLayout>;

export default CheckoutPage;
