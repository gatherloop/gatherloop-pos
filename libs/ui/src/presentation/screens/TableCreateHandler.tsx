import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, TableCreateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useTableCreateController,
} from '../controllers';
import {
  TableCreateScreen,
  TableCreateScreenProps,
} from './TableCreateScreen';

export type TableCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  tableCreateUsecase: TableCreateUsecase;
};

export const TableCreateHandler = ({
  authLogoutUsecase,
  tableCreateUsecase,
}: TableCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const tableCreate = useTableCreateController(tableCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (tableCreate.state.type === 'submitSuccess') router.push('/tables');
  }, [tableCreate.state.type, router]);

  return (
    <TableCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={tableCreate.state.values}
      isSubmitDisabled={
        tableCreate.state.type === 'submitting' ||
        tableCreate.state.type === 'submitSuccess'
      }
      isSubmitting={tableCreate.state.type === 'submitting'}
      serverError={
        tableCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) => tableCreate.dispatch({ type: 'SUBMIT', values })}
      variant={match(tableCreate.state)
        .returnType<TableCreateScreenProps['variant']>()
        .with({ type: 'loaded' }, () => ({ type: 'loaded' }))
        .with(
          {
            type: P.union('submitting', 'submitSuccess', 'submitError'),
          },
          () => ({
            type: 'loaded',
          })
        )
        .exhaustive()}
    />
  );
};
