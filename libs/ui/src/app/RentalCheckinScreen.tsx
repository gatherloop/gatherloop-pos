import {
  ApiAuthRepository,
  ApiVariantRepository,
  ApiRentalRepository,
  ApiProductRepository,
} from '../data';
import {
  AuthLogoutUsecase,
  RentalCheckinUsecase,
  TransactionItemSelectUsecase,
  TransactionItemSelectParams,
} from '../domain';
import { RentalCheckinScreen as RentalCheckinScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type RentalCheckinScreenProps = {
  transactionItemSelectParams: TransactionItemSelectParams;
};

export function RentalCheckinScreen({
  transactionItemSelectParams,
}: RentalCheckinScreenProps) {
  const client = new QueryClient();
  const rentalRepository = new ApiRentalRepository(client);
  const variantRepository = new ApiVariantRepository(client);
  const productRepository = new ApiProductRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const rentalCheckinUsecase = new RentalCheckinUsecase(rentalRepository);

  const transactionItemSelectUsecase = new TransactionItemSelectUsecase(
    productRepository,
    variantRepository,
    { ...transactionItemSelectParams, saleType: 'rental' }
  );

  return (
    <RentalCheckinScreenView
      transactionItemSelectUsecase={transactionItemSelectUsecase}
      rentalCheckinUsecase={rentalCheckinUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
