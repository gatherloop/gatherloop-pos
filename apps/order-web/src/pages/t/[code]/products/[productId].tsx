import { MenuItemDetail } from '@gatherloop-pos/ui/order';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { ReactElement, ReactNode } from 'react';
import { MenuLayout } from '../../../../components/MenuLayout';

// The item detail sheet (FR-6 in docs/prd-table-ordering.md), rendered
// alongside `MenuList` (mounted by `MenuLayout.getLayout`, D4) rather than
// instead of it, so the sheet sits on top of the menu.
const MenuItemDetailPage: NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
} = () => {
  const router = useRouter();
  const productId =
    typeof router.query.productId === 'string'
      ? Number(router.query.productId)
      : NaN;

  return <MenuItemDetail productId={productId} />;
};

MenuItemDetailPage.getLayout = (page) => <MenuLayout>{page}</MenuLayout>;

export default MenuItemDetailPage;
