import { ApiAuthRepository, ApiTableRepository } from '../data';
import { AuthLogoutUsecase, TableCreateUsecase } from '../domain';
import { TableCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export function TableCreate() {
  const client = new QueryClient();
  const tableRepository = new ApiTableRepository(client);
  const authRepository = new ApiAuthRepository();

  const tableCreateUsecase = new TableCreateUsecase(tableRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <TableCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      tableCreateUsecase={tableCreateUsecase}
    />
  );
}
