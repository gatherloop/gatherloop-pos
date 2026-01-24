import { ScrollView } from 'tamagui';
import {
  RentalCheckinFormView,
  TransactionItemSelect,
  Layout,
} from '../components';
import {
  useAuthLogoutController,
  useRentalCheckinController,
  useTransactionItemSelectController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  RentalCheckinUsecase,
  TransactionItemSelectUsecase,
} from '../../domain';

export type RentalCheckinScreenProps = {
  rentalCheckinUsecase: RentalCheckinUsecase;
  transactionItemSelectUsecase: TransactionItemSelectUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const RentalCheckinScreen = (props: RentalCheckinScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const rentalCheckinController = useRentalCheckinController(
    props.rentalCheckinUsecase
  );

  const transactionItemSelectController = useTransactionItemSelectController(
    props.transactionItemSelectUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (
      transactionItemSelectController.state.type === 'loadingVariantSuccess' &&
      transactionItemSelectController.state.selectedVariant
    ) {
      rentalCheckinController.onAddItem(
        transactionItemSelectController.state.selectedVariant,
        transactionItemSelectController.state.amount
      );
    }
  }, [
    rentalCheckinController,
    transactionItemSelectController.state.amount,
    transactionItemSelectController.state.selectedVariant,
    transactionItemSelectController.state.type,
  ]);

  useEffect(() => {
    if (rentalCheckinController.state.type === 'submitSuccess') {
      router.push(`/rentals`);
    }
  }, [rentalCheckinController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Checkin Rental" showBackButton>
      <ScrollView>
        <RentalCheckinFormView
          {...rentalCheckinController}
          RentalItemSelect={() => (
            <TransactionItemSelect {...transactionItemSelectController} />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
