import { ApiAuthRepository, ApiTableRepository } from '../data';
import {
  AuthLogoutUsecase,
  TableRegenerateCodeUsecase,
  TableUpdateParams,
  TableUpdateUsecase,
} from '../domain';
import { TableUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TableUpdateProps = {
  tableUpdateParams: TableUpdateParams;
};

export function TableUpdate({ tableUpdateParams }: TableUpdateProps) {
  const client = new QueryClient();
  const tableRepository = new ApiTableRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const tableUpdateUsecase = new TableUpdateUsecase(
    tableRepository,
    tableUpdateParams
  );
  const tableRegenerateCodeUsecase = new TableRegenerateCodeUsecase(
    tableRepository
  );

  return (
    <TableUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      tableUpdateUsecase={tableUpdateUsecase}
      tableRegenerateCodeUsecase={tableRegenerateCodeUsecase}
    />
  );
}
