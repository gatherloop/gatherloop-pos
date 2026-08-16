import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  TableRegenerateCodeUsecase,
  TableUpdateUsecase,
} from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useTableRegenerateCodeController,
  useTableUpdateController,
} from '../controllers';
import {
  TableUpdateScreen,
  TableUpdateScreenProps,
} from './TableUpdateScreen';

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
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const tableUpdate = useTableUpdateController(tableUpdateUsecase);
  const tableRegenerateCode = useTableRegenerateCodeController(
    tableRegenerateCodeUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (tableUpdate.state.type === 'submitSuccess') router.push('/tables');
  }, [tableUpdate.state.type, router]);

  useEffect(() => {
    match(tableRegenerateCode.state)
      .with({ type: 'regeneratingSuccess' }, () => {
        // Picks up the new code by refetching the table (loaded -> loading
        // -> loaded), rather than trusting the client to merge it in.
        tableUpdate.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // noop
      });
  }, [tableRegenerateCode.state, tableUpdate]);

  return (
    <TableUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      form={tableUpdate.form}
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
