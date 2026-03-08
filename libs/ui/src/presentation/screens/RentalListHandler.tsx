import {
  AuthLogoutUsecase,
  RentalDeleteUsecase,
  RentalListUsecase,
} from '../../domain';
import { RentalListScreen, RentalListScreenProps } from './RentalListScreen';
import { match, P } from 'ts-pattern';
import { useEffect, useRef, useCallback } from 'react';
import {
  useAuthLogoutController,
  useRentalDeleteController,
  useRentalListController,
} from '../controllers';

export type RentalListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  rentalListUsecase: RentalListUsecase;
  rentalDeleteUsecase: RentalDeleteUsecase;
};

export const RentalListHandler = ({
  authLogoutUsecase,
  rentalListUsecase,
  rentalDeleteUsecase,
}: RentalListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const rentalList = useRentalListController(rentalListUsecase);
  const rentalDelete = useRentalDeleteController(rentalDeleteUsecase);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    match(rentalDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        rentalList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // noop
      });
  }, [rentalDelete.state, rentalList]);

  const onSearchValueChange = useCallback(
    (query: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        rentalList.dispatch({
          type: 'CHANGE_PARAMS',
          query,
          page: 1,
          fetchDebounceDelay: 0,
        });
      }, 300);
    },
    [rentalList]
  );

  return (
    <RentalListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onDeleteMenuPress={(rental) =>
        rentalDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          rentalId: rental.id,
        })
      }
      onRetryButtonPress={() => rentalList.dispatch({ type: 'FETCH' })}
      variant={match(rentalList.state)
        .returnType<RentalListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          () => ({ type: 'loaded' })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      rentals={rentalList.state.rentals}
      searchValue={rentalList.state.query}
      onSearchValueChange={onSearchValueChange}
      checkoutStatus={rentalList.state.checkoutStatus}
      onCheckoutStatusChange={(checkoutStatus) =>
        rentalList.dispatch({
          type: 'CHANGE_PARAMS',
          checkoutStatus,
          page: 1,
          fetchDebounceDelay: 600,
        })
      }
      currentPage={rentalList.state.page}
      onPageChange={(page: number) =>
        rentalList.dispatch({ type: 'CHANGE_PARAMS', page })
      }
      totalItem={rentalList.state.totalItem}
      itemPerPage={rentalList.state.itemPerPage}
      isDeleteModalOpen={match(rentalDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={rentalDelete.state.type === 'deleting'}
      onDeleteCancel={() =>
        rentalDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() => rentalDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
