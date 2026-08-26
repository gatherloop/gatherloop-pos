import { NextPage } from 'next';
import { ReactElement, ReactNode } from 'react';
import { CartLayout } from '../../../../components/CartLayout';

// The cart route (FR-7 in docs/prd-table-ordering.md). The page itself
// renders nothing — `Cart` is rendered by `CartLayout.getLayout` (D4) so it
// stays mounted across navigation to/from the cart-item-edit modal.
const CartPage: NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
} = () => null;

CartPage.getLayout = (page) => <CartLayout>{page}</CartLayout>;

export default CartPage;
