import { ApiAuthRepository, ApiMaterialRepository } from '../data';
import { AuthLogoutUsecase, MaterialCreateUsecase } from '../domain';
import { MaterialCreateScreen as MaterialCreateScreenView } from '../presentation';
import { useQueryClient } from '@tanstack/react-query';

export function MaterialCreateScreen() {
  const client = useQueryClient();
  const materialRepository = new ApiMaterialRepository(client);
  const materialUsecase = new MaterialCreateUsecase(materialRepository);

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <MaterialCreateScreenView
      materialCreateUsecase={materialUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
