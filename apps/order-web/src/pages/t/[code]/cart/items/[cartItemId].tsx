import { CartItemEdit } from '@gatherloop-pos/ui/order';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { ReactElement, ReactNode } from 'react';
import { CartLayout } from '../../../../../components/CartLayout';

// The cart-item-edit modal (FR-9 in docs/prd-order-app-ux-improvements.md),
// rendered alongside `Cart` (mounted by `CartLayout.getLayout`, D4) rather
// than instead of it, so the modal sits on top of the cart.
const CartItemEditPage: NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
} = () => {
  const router = useRouter();
  const cartItemId =
    typeof router.query.cartItemId === 'string'
      ? Number(router.query.cartItemId)
      : NaN;

  return <CartItemEdit cartItemId={cartItemId} />;
};

CartItemEditPage.getLayout = (page) => <CartLayout>{page}</CartLayout>;

export default CartItemEditPage;
