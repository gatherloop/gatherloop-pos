import { ScrollView } from 'tamagui';
import { TransactionFormView, Layout, VariantList } from '../components';
import {
  useAuthLogoutController,
  useVariantListController,
  useTransactionUpdateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Variant,
  VariantListUsecase,
  TransactionForm,
  TransactionUpdateUsecase,
} from '../../domain';
import { UseFieldArrayReturn } from 'react-hook-form';

export type TransactionUpdateScreenProps = {
  transactionUpdateUsecase: TransactionUpdateUsecase;
  variantListUsecase: VariantListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionUpdateScreen = (
  props: TransactionUpdateScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const transactionUpdateController = useTransactionUpdateController(
    props.transactionUpdateUsecase
  );

  const variantListController = useVariantListController(
    props.variantListUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (transactionUpdateController.state.type === 'submitSuccess')
      router.push('/transactions');
  }, [transactionUpdateController.state.type, router]);

  const onVariantItemPress = (
    variant: Variant,
    fieldArray: UseFieldArrayReturn<TransactionForm, 'transactionItems', 'key'>
  ) => {
    transactionUpdateController.onAddItem(variant, fieldArray);
    variantListController.onSearchValueChange('');
  };

  return (
    <Layout {...authLogoutController} title="Update Transaction" showBackButton>
      <ScrollView>
        <TransactionFormView
          {...transactionUpdateController}
          VariantList={(fieldArray) => (
            <VariantList
              {...variantListController}
              onItemPress={(variant) => onVariantItemPress(variant, fieldArray)}
              isSearchAutoFocus
              numColumns={2}
            />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
