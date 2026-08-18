// Deep imports, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import {
  MenuItemDetailState,
  MenuItemDetailUsecase,
} from '../../domain/usecases/menuItemDetail';
import { useMenuItemDetailController } from '../controllers/MenuItemDetailController';
import { useNavigation } from '../navigation';
import {
  MenuItemDetailScreen,
  MenuItemDetailScreenProps,
} from './MenuItemDetailScreen';

export type MenuItemDetailHandlerProps = {
  menuItemDetailUsecase: MenuItemDetailUsecase;
  onAddToCart: (params: {
    variantId: number;
    amount: number;
    note: string;
  }) => void;
};

// `product` is `Product | null` in the state's type regardless of `type`
// (the machine's own invariant — every non-loading, non-fetch-failed state
// has a product — isn't expressible in the discriminated union). A plain
// function reads better here than forcing ts-pattern to prove exhaustiveness
// over a combination the type system can't actually rule out.
function toScreenVariant(
  state: MenuItemDetailState
): MenuItemDetailScreenProps['variant'] {
  if (state.type === 'idle' || state.type === 'loadingProduct') {
    return { type: 'loading' };
  }
  if (!state.product) {
    return { type: 'error' };
  }
  return {
    type: 'ready',
    product: state.product,
    isResolvingVariant: state.type === 'resolvingVariant',
    price: state.variant?.price ?? null,
    variantErrorMessage: state.type === 'error' ? state.errorMessage : null,
  };
}

// FR-6 in docs/prd-table-ordering.md. The Add-to-cart CTA calls
// `onAddToCart` rather than a cart repository directly — phase 9 supplies a
// real implementation from the cart composition root; this phase (8) wires
// a no-op so the sheet is fully reviewable without the cart existing yet.
export const MenuItemDetailHandler = ({
  menuItemDetailUsecase,
  onAddToCart,
}: MenuItemDetailHandlerProps) => {
  const menuItemDetail = useMenuItemDetailController(menuItemDetailUsecase);
  const navigation = useNavigation();

  const closeSheet = () => navigation.back();

  return (
    <MenuItemDetailScreen
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) closeSheet();
      }}
      variant={toScreenVariant(menuItemDetail.state)}
      selectedOptionValueIds={menuItemDetail.state.selectedOptionValueIds}
      onSelectOptionValue={(optionId, optionValueId) =>
        menuItemDetail.dispatch({
          type: 'SELECT_OPTION_VALUE',
          optionId,
          optionValueId,
        })
      }
      amount={menuItemDetail.state.amount}
      onAmountChange={(amount) =>
        menuItemDetail.dispatch({ type: 'CHANGE_AMOUNT', amount })
      }
      note={menuItemDetail.state.note}
      onNoteChange={(note) =>
        menuItemDetail.dispatch({ type: 'CHANGE_NOTE', note })
      }
      isAddToCartEnabled={menuItemDetail.state.type === 'ready'}
      onAddToCartPress={() => {
        const { variant, amount, note } = menuItemDetail.state;
        if (!variant) return;
        onAddToCart({ variantId: variant.id, amount, note });
        closeSheet();
      }}
      onRetryButtonPress={() => menuItemDetail.dispatch({ type: 'FETCH' })}
    />
  );
};
