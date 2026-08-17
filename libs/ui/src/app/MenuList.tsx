import { QueryClient } from '@tanstack/react-query';
// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which drags solito/next into a Vite build.
import { ApiMenuRepository } from '../data/api/menu';
import { MenuListUsecase } from '../domain/usecases/menuList';
import { MenuListHandler } from '../presentation/screens/MenuListHandler';

export type MenuListProps = {
  tableCode: string;
};

// Composition root for the menu discovery screen (FR-5/FR-7 phase 7 in
// docs/prd-table-ordering.md). Mounted as `children` of `TableResolve` once
// the table code resolves, so it never has to resolve the table itself.
export function MenuList({ tableCode }: MenuListProps) {
  const client = new QueryClient();
  const menuRepository = new ApiMenuRepository(client);
  const menuListUsecase = new MenuListUsecase(menuRepository, {
    products: [],
    categories: [],
  });

  return (
    <MenuListHandler menuListUsecase={menuListUsecase} tableCode={tableCode} />
  );
}
