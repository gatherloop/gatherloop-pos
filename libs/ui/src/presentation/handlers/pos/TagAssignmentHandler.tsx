import { useRouter } from 'solito/router';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import {
  AuthLogoutUsecase,
  TagAssignmentState,
  TagAssignmentUsecase,
  Variant,
} from '../../../domain';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  TagAssignmentScreen,
  TagAssignmentScreenProps,
} from '../../views/screens/pos/TagAssignmentScreen';
import { TagAssignmentCategoryItem } from '../../views/components';

export type TagAssignmentHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  tagAssignmentUsecase: TagAssignmentUsecase;
};

const matchesQuery = (variant: Variant, query: string) =>
  [variant.product.name, variant.product.category.name, variant.name].some(
    (text) => text.toLowerCase().includes(query)
  );

const toCategoryItems = ({
  variants,
  selectedVariantIds,
  query,
}: TagAssignmentState): TagAssignmentCategoryItem[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const categories = new Map<number, TagAssignmentCategoryItem>();

  variants
    .filter((variant) => matchesQuery(variant, normalizedQuery))
    .forEach(({ product }) => {
      const category = categories.get(product.category.id) ?? {
        id: product.category.id,
        name: product.category.name,
        products: [],
      };
      if (!category.products.some(({ id }) => id === product.id)) {
        const productVariants = variants.filter(
          (variant) => variant.product.id === product.id
        );
        const checkedCount = productVariants.filter((variant) =>
          selectedVariantIds.includes(variant.id)
        ).length;
        category.products.push({
          id: product.id,
          name: product.name,
          checkState:
            checkedCount === 0
              ? false
              : checkedCount === productVariants.length
              ? true
              : 'indeterminate',
          variants: productVariants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            isChecked: selectedVariantIds.includes(variant.id),
          })),
        });
      }
      categories.set(category.id, category);
    });

  return [...categories.values()];
};

export const TagAssignmentHandler = ({
  authLogoutUsecase,
  tagAssignmentUsecase,
}: TagAssignmentHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const tagAssignment = useUsecase(tagAssignmentUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (tagAssignment.state.type === 'saveSuccess') {
      toast.show('Assign Tag Success');
      router.push('/tags');
    } else if (tagAssignment.state.type === 'saveError') {
      toast.show('Assign Tag Error');
    }
  }, [tagAssignment.state.type, toast, router]);

  return (
    <TagAssignmentScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      tagName={tagAssignment.state.tag?.name}
      searchValue={tagAssignment.state.query}
      onSearchValueChange={(query) =>
        tagAssignment.dispatch({ type: 'SEARCH', query })
      }
      onRetryButtonPress={() => tagAssignment.dispatch({ type: 'FETCH' })}
      onProductToggle={(productId) =>
        tagAssignment.dispatch({ type: 'TOGGLE_PRODUCT', productId })
      }
      onVariantToggle={(variantId) =>
        tagAssignment.dispatch({ type: 'TOGGLE_VARIANT', variantId })
      }
      selectedVariantCount={tagAssignment.state.selectedVariantIds.length}
      onSavePress={() => tagAssignment.dispatch({ type: 'SAVE' })}
      isSaveDisabled={
        tagAssignment.state.type !== 'loaded' &&
        tagAssignment.state.type !== 'saveError'
      }
      isSaving={tagAssignment.state.type === 'saving'}
      serverError={
        tagAssignment.state.type === 'saveError'
          ? 'Failed to save. Please try again.'
          : undefined
      }
      variant={match(tagAssignment.state)
        .returnType<TagAssignmentScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .with(
          { type: P.union('loaded', 'saving', 'saveSuccess', 'saveError') },
          (state) => {
            const categories = toCategoryItems(state);
            return categories.length > 0
              ? { type: 'loaded', categories }
              : { type: 'empty' };
          }
        )
        .exhaustive()}
    />
  );
};
