import { ApiAuthRepository, ApiMaterialRepository } from '../data';
import {
  AuthLogoutUsecase,
  MaterialUpdateParams,
  MaterialUpdateUsecase,
} from '../domain';
import { MaterialUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type MaterialUpdateProps = {
  materialUpdateParams: MaterialUpdateParams;
};

export function MaterialUpdate({
  materialUpdateParams,
}: MaterialUpdateProps) {
  const client = new QueryClient();
  const authRepository = new ApiAuthRepository();
  const materialRepository = new ApiMaterialRepository(client);

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const materialUpdateUsecase = new MaterialUpdateUsecase(
    materialRepository,
    materialUpdateParams
  );

  return (
    <MaterialUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      materialUpdateUsecase={materialUpdateUsecase}
    />
  );
}
