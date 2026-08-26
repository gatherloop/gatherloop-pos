import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
// Deep imports, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { Category } from '../../domain/entities/Category';
import { Product } from '../../domain/entities/Product';
import { Variant } from '../../domain/entities/Variant';
import { MenuListUsecase } from '../../domain/usecases/menuList';
import { useMenuListController } from '../controllers/MenuListController';
import { MenuListScreen, MenuListScreenProps } from './MenuListScreen';

export type MenuListHandlerProps = {
  menuListUsecase: MenuListUsecase;
  tableCode: string;
};

// D4: grouping is client-side, by the category already embedded on each
// product — there is no `categoryId` filter on the underlying fetch. Only
// categories with at least one matching product are kept, so the chip row
// (FR-5) never offers a category that would render an empty section.
function groupByCategory(products: Product[], categories: Category[]) {
  return categories
    .map((category) => ({
      category,
      products: products.filter(
        (product) => product.category.id === category.id
      ),
    }))
    .filter((group) => group.products.length > 0);
}

// FR-5: the "mulai Rp X" starting price is the lowest price among a
// product's own variants. `variants` carries every variant of every
// published purchase product (menuList.ts), so this is a pure client-side
// reduction, not a second fetch.
function computeStartingPriceByProductId(
  variants: Variant[]
): Record<number, number> {
  return variants.reduce<Record<number, number>>((acc, variant) => {
    const productId = variant.product.id;
    if (acc[productId] === undefined || variant.price < acc[productId]) {
      acc[productId] = variant.price;
    }
    return acc;
  }, {});
}

export const MenuListHandler = ({
  menuListUsecase,
  tableCode,
}: MenuListHandlerProps) => {
  const menuList = useMenuListController(menuListUsecase);
  const router = useRouter();

  const groups = groupByCategory(
    menuList.state.products,
    menuList.state.categories
  );

  const visibleGroups =
    menuList.state.selectedCategoryId === null
      ? groups
      : groups.filter(
          (group) => group.category.id === menuList.state.selectedCategoryId
        );

  const startingPriceByProductId = computeStartingPriceByProductId(
    menuList.state.variants
  );

  return (
    <MenuListScreen
      searchValue={menuList.state.query}
      onSearchValueChange={(query: string) =>
        menuList.dispatch({
          type: 'CHANGE_PARAMS',
          query,
          fetchDebounceDelay: 600,
        })
      }
      isSearching={
        menuList.state.type === 'changingParams' ||
        menuList.state.type === 'revalidating'
      }
      chipCategories={groups.map((group) => group.category)}
      selectedCategoryId={menuList.state.selectedCategoryId}
      onSelectCategory={(categoryId: number | null) =>
        menuList.dispatch({
          type: 'CHANGE_PARAMS',
          selectedCategoryId: categoryId,
          fetchDebounceDelay: 0,
        })
      }
      onRetryButtonPress={() => menuList.dispatch({ type: 'FETCH' })}
      onItemPress={(product: Product) =>
        router.push(`/t/${tableCode}/products/${product.id}`)
      }
      startingPriceByProductId={startingPriceByProductId}
      variant={match(menuList.state)
        .returnType<MenuListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          () => ({
            type: visibleGroups.length > 0 ? 'loaded' : 'empty',
            groups: visibleGroups,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
    />
  );
};
