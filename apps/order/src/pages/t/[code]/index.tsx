import { NextPage } from 'next';
import { ReactElement, ReactNode } from 'react';
import { MenuLayout } from '../../../components/MenuLayout';

// The menu route (FR-5/FR-7 in docs/prd-table-ordering.md). The page itself
// renders nothing — `MenuList` is rendered by `MenuLayout.getLayout` (D4) so
// it stays mounted across navigation to/from the item detail sheet.
const MenuListPage: NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
} = () => null;

MenuListPage.getLayout = (page) => <MenuLayout>{page}</MenuLayout>;

export default MenuListPage;
