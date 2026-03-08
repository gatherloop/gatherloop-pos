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
import { RentalCheckinHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type RentalCheckinProps = {
  transactionItemSelectParams: TransactionItemSelectParams;
};

export function RentalCheckin({
  transactionItemSelectParams,
}: RentalCheckinProps) {
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
    <RentalCheckinHandler
      rentalCheckinUsecase={rentalCheckinUsecase}
      transactionItemSelectUsecase={transactionItemSelectUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
