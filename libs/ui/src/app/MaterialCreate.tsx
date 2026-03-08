import { ApiAuthRepository, ApiMaterialRepository } from '../data';
import { AuthLogoutUsecase, MaterialCreateUsecase } from '../domain';
import { MaterialCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export function MaterialCreate() {
  const client = new QueryClient();
  const materialRepository = new ApiMaterialRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const materialCreateUsecase = new MaterialCreateUsecase(materialRepository);

  return (
    <MaterialCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      materialCreateUsecase={materialCreateUsecase}
    />
  );
}
