import {
  ApiAuthRepository,
  ApiMaterialRepository,
  UrlMaterialListQueryRepository,
} from '../data';
import {
  MaterialListUsecase,
  MaterialDeleteUsecase,
  AuthLogoutUsecase,
  MaterialListParams,
} from '../domain';
import { MaterialListScreen as MaterialListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type MaterialListScreenProps = {
  materialListParams: MaterialListParams;
};

export function MaterialListScreen({
  materialListParams,
}: MaterialListScreenProps) {
  const client = new QueryClient();
  const materialRepository = new ApiMaterialRepository(client);
  const materialListQueryRepository = new UrlMaterialListQueryRepository();
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const materialDeleteUsecase = new MaterialDeleteUsecase(materialRepository);
  const materialListUsecase = new MaterialListUsecase(
    materialRepository,
    materialListQueryRepository,
    materialListParams
  );

  return (
    <MaterialListScreenView
      materialDeleteUsecase={materialDeleteUsecase}
      materialListUsecase={materialListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
