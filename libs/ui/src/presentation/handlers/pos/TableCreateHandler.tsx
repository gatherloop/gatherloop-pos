import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, TableCreateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  TableCreateScreen,
  TableCreateScreenProps,
} from '../../views/screens/pos/TableCreateScreen';

export type TableCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  tableCreateUsecase: TableCreateUsecase;
};

export const TableCreateHandler = ({
  authLogoutUsecase,
  tableCreateUsecase,
}: TableCreateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const tableCreate = useUsecase(tableCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (tableCreate.state.type === 'submitSuccess') {
      toast.show('Create Table Success');
      router.push('/tables');
    } else if (tableCreate.state.type === 'submitError') {
      toast.show('Create Table Error');
    }
  }, [tableCreate.state.type, toast, router]);

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
