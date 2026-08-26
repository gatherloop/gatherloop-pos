import { Cart } from '@gatherloop-pos/ui/order';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { TableLayout } from './TableLayout';

export type CartLayoutProps = {
  children?: ReactNode;
};

// D4: the `getLayout` shared by `t/[code]/cart/index.tsx` and
// `t/[code]/cart/items/[cartItemId].tsx`. `Cart` is lifted out of the page
// component and in here, as a direct, stable child of `TableLayout` alongside
// `children` (nothing for the cart route, `CartItemEdit` for the edit-modal
// route) — the same reasoning as `MenuLayout` for the menu/item-sheet pair:
// rendering `Cart` at this fixed position means it reconciles by type across
// both routes instead of remounting behind the edit modal.
export const CartLayout = ({ children }: CartLayoutProps) => {
  const router = useRouter();
  const code = typeof router.query.code === 'string' ? router.query.code : '';

  return (
    <TableLayout hideCartBar>
      <Cart tableCode={code} />
      {children}
    </TableLayout>
  );
};
