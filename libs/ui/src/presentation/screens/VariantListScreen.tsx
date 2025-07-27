import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { VariantDeleteAlert, VariantList, Layout } from '../components';
import {
  AuthLogoutUsecase,
  Variant,
  VariantDeleteUsecase,
  VariantListUsecase,
} from '../../domain';
import {
  useAuthLogoutController,
  useVariantDeleteController,
  useVariantListController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

export type VariantListScreenProps = {
  variantListUsecase: VariantListUsecase;
  variantDeleteUsecase: VariantDeleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const VariantListScreen = (props: VariantListScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const variantListController = useVariantListController(
    props.variantListUsecase
  );
  const variantDeleteController = useVariantDeleteController(
    props.variantDeleteUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (variantDeleteController.state.type === 'deletingSuccess')
      variantListController.dispatch({ type: 'FETCH' });
  }, [variantDeleteController.state.type, variantListController]);

  const onEditMenuPress = (variant: Variant) => {
    router.push(`/variants/${variant.id}`);
  };

  const onItemPress = (variant: Variant) => {
    router.push(`/variants/${variant.id}`);
  };

  const onDeleteMenuPress = (variant: Variant) => {
    variantDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      variantId: variant.id,
    });
  };

  return (
    <Layout
      {...authLogoutController}
      title="Variants"
      rightActionItem={
        <Link href="/variants/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <VariantList
        {...variantListController}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <VariantDeleteAlert {...variantDeleteController} />
    </Layout>
  );
};
