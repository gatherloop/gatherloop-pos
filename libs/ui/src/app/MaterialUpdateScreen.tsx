import { ApiAuthRepository, ApiMaterialRepository } from '../data';
import {
  AuthLogoutUsecase,
  MaterialUpdateParams,
  MaterialUpdateUsecase,
} from '../domain';
import { MaterialUpdateScreen as MaterialUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type MaterialUpdateScreenProps = {
  materialUpdateParams: MaterialUpdateParams;
};

export function MaterialUpdateScreen({
  materialUpdateParams,
}: MaterialUpdateScreenProps) {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const materialRepository = new ApiMaterialRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const materialUpdateUsecase = new MaterialUpdateUsecase(
    materialRepository,
    materialUpdateParams
  );

  return (
    <MaterialUpdateScreenView
      materialUpdateUsecase={materialUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
