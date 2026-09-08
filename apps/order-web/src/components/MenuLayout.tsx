import { MenuList } from '@gatherloop-pos/ui/order';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { TableLayout } from './TableLayout';

export type MenuLayoutProps = {
  children?: ReactNode;
};

// D4: the `getLayout` shared by `t/[code]/index.tsx` and
// `t/[code]/products/[productId].tsx`. `MenuList` has to be lifted out of
// the page component and in here, as a direct, stable child of
// `TableLayout` alongside `children` (the page-specific content — nothing
// for the menu route, `MenuItemDetail` for the product route): the page
// component itself changes identity across that navigation, so anything
// rendered *inside* it would be torn down and remounted with it. Rendering
// `MenuList` at this fixed position instead means it reconciles by type
// across both routes and survives — its scroll position, search text and
// selected category included.
export const MenuLayout = ({ children }: MenuLayoutProps) => {
  const router = useRouter();
  const code = typeof router.query.code === 'string' ? router.query.code : '';

  return (
    <TableLayout>
      <MenuList tableCode={code} />
      {children}
    </TableLayout>
  );
};
