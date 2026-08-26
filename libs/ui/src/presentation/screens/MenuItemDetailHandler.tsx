import { useState } from 'react';
import { useRouter } from 'solito/router';
// Deep imports, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { Product } from '../../domain/entities/Product';
import {
  MenuItemDetailState,
  MenuItemDetailUsecase,
} from '../../domain/usecases/menuItemDetail';
import { useMenuItemDetailController } from '../controllers/MenuItemDetailController';
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
    price: state.variant?.price ?? null,
    variantErrorMessage: state.type === 'error' ? state.errorMessage : null,
  };
}

// FR-5 in docs/prd-order-app-ux-improvements.md.
function toCtaState(
  state: MenuItemDetailState
): 'ready' | 'incomplete' | 'resolving' {
  if (state.type === 'resolvingVariant') return 'resolving';
  if (state.type === 'ready') return 'ready';
  return 'incomplete';
}

function getMissingOptionNames(
  product: Product | null,
  selectedOptionValueIds: number[]
): string[] {
  if (!product) return [];
  return product.options
    .filter(
      (option) =>
        !option.values.some((value) =>
          selectedOptionValueIds.includes(value.id)
        )
    )
    .map((option) => option.name);
}

function buildValidationMessage(missingOptionNames: string[]): string | null {
  if (missingOptionNames.length === 0) return null;
  if (missingOptionNames.length === 1) {
    return `Pilih ${missingOptionNames[0]} dulu ya`;
  }
  const last = missingOptionNames[missingOptionNames.length - 1];
  const rest = missingOptionNames.slice(0, -1).join(', ');
  return `Lengkapi pilihan ${rest} dan ${last}`;
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
  const router = useRouter();
  // FR-5: set once the guest presses the CTA while options are incomplete.
  // Recomputing `missingOptionNames` from live state on every render means
  // the message shrinks or clears the moment a missing option is selected,
  // with no separate reset needed.
  const [showValidationError, setShowValidationError] = useState(false);

  const closeSheet = () => router.back();

  const missingOptionNames = getMissingOptionNames(
    menuItemDetail.state.product,
    menuItemDetail.state.selectedOptionValueIds
  );

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
      ctaState={toCtaState(menuItemDetail.state)}
      missingOptionNames={missingOptionNames}
      validationMessage={
        showValidationError ? buildValidationMessage(missingOptionNames) : null
      }
      onAddToCartPress={() => {
        if (missingOptionNames.length > 0) {
          setShowValidationError(true);
          return;
        }
        const { variant, amount, note } = menuItemDetail.state;
        if (!variant) return;
        onAddToCart({ variantId: variant.id, amount, note });
        closeSheet();
      }}
      onRetryButtonPress={() => menuItemDetail.dispatch({ type: 'FETCH' })}
    />
  );
};
