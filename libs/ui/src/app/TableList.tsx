import { ApiAuthRepository, ApiTableRepository } from '../data';
import {
  TableListUsecase,
  TableDeleteUsecase,
  AuthLogoutUsecase,
  TableListParams,
} from '../domain';
import { TableListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TableListProps = {
  tableListParams: TableListParams;
};

export function TableList({ tableListParams }: TableListProps) {
  const client = new QueryClient();
  const tableRepository = new ApiTableRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const tableDeleteUsecase = new TableDeleteUsecase(tableRepository);
  const tableListUsecase = new TableListUsecase(
    tableRepository,
    tableListParams
  );

  return (
    <TableListHandler
      authLogoutUsecase={authLogoutUsecase}
      tableListUsecase={tableListUsecase}
      tableDeleteUsecase={tableDeleteUsecase}
    />
  );
}
