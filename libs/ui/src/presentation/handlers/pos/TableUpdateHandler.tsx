import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  TableRegenerateCodeUsecase,
  TableUpdateUsecase,
} from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  TableUpdateScreen,
  TableUpdateScreenProps,
} from '../../views/screens/pos/TableUpdateScreen';

export type TableUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  tableUpdateUsecase: TableUpdateUsecase;
  tableRegenerateCodeUsecase: TableRegenerateCodeUsecase;
};

export const TableUpdateHandler = ({
  authLogoutUsecase,
  tableUpdateUsecase,
  tableRegenerateCodeUsecase,
}: TableUpdateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const tableUpdate = useUsecase(tableUpdateUsecase);
  const tableRegenerateCode = useUsecase(tableRegenerateCodeUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (tableUpdate.state.type === 'submitSuccess') {
      toast.show('Update Table Success');
      router.push('/tables');
    } else if (tableUpdate.state.type === 'submitError') {
      toast.show('Update Table Error');
    }
  }, [tableUpdate.state.type, toast, router]);

  useEffect(() => {
    match(tableRegenerateCode.state)
      .with({ type: 'regeneratingSuccess' }, () => {
        toast.show('Regenerate Table Code Success');
        // Picks up the new code by refetching the table (loaded -> loading
        // -> loaded), rather than trusting the client to merge it in.
        tableUpdate.dispatch({ type: 'FETCH' });
      })
      .with({ type: 'regeneratingError' }, () => {
        toast.show('Regenerate Table Code Error');
      })
      .otherwise(() => {
        // noop
      });
  }, [tableRegenerateCode.state, tableUpdate, toast]);

  return (
    <TableUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={tableUpdate.state.values}
      isSubmitDisabled={
        tableUpdate.state.type === 'submitting' ||
        tableUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={tableUpdate.state.type === 'submitting'}
      serverError={
        tableUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) => tableUpdate.dispatch({ type: 'SUBMIT', values })}
      variant={match(tableUpdate.state)
        .returnType<TableUpdateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitError',
              'submitSuccess',
              'submitting'
            ),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => tableUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
      table={tableUpdate.state.table}
      onPrintPress={() => {
        if (
          typeof window !== 'undefined' &&
          typeof window.print === 'function'
        ) {
          window.print();
        }
      }}
      onRegenerateCodePress={() =>
        tableRegenerateCode.dispatch({
          type: 'SHOW_CONFIRMATION',
          tableId: tableUpdateUsecase.params.tableId,
        })
      }
      isRegenerateAlertOpen={match(tableRegenerateCode.state.type)
        .with(
          P.union(
            'shown',
            'regenerating',
            'regeneratingError',
            'regeneratingSuccess'
          ),
          () => true
        )
        .otherwise(() => false)}
      isRegenerateButtonDisabled={
        tableRegenerateCode.state.type === 'regenerating'
      }
      onRegenerateCancel={() =>
        tableRegenerateCode.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onRegenerateConfirm={() =>
        tableRegenerateCode.dispatch({ type: 'REGENERATE' })
      }
    />
  );
};
