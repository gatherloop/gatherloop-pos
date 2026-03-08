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
import { MaterialListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type MaterialListProps = {
  materialListParams: MaterialListParams;
};

export function MaterialList({ materialListParams }: MaterialListProps) {
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
    <MaterialListHandler
      authLogoutUsecase={authLogoutUsecase}
      materialListUsecase={materialListUsecase}
      materialDeleteUsecase={materialDeleteUsecase}
    />
  );
}
