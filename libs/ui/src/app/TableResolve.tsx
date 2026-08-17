import { ReactNode } from 'react';
import { ApiPublicTableRepository } from '../data/api/publicTable';
import { TableResolveUsecase } from '../domain/usecases/tableResolve';
import { TableResolveHandler } from '../presentation/screens/TableResolveHandler';
import { useSessionRepository } from './SessionProvider';

export type TableResolveProps = {
  code: string | null;
  children?: ReactNode;
};

// Composition root for the `/order/t/{code}` route shell (D17/FR-4). Renders
// `children` — the menu, once phase 7 lands — once the table resolves.
export function TableResolve({ code, children }: TableResolveProps) {
  const sessionRepository = useSessionRepository();
  const publicTableRepository = new ApiPublicTableRepository();
  const tableResolveUsecase = new TableResolveUsecase(publicTableRepository, {
    code,
  });

  return (
    <TableResolveHandler
      tableResolveUsecase={tableResolveUsecase}
      sessionRepository={sessionRepository}
    >
      {children}
    </TableResolveHandler>
  );
}
