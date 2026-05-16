import { match, P } from 'ts-pattern';
import { AuthLogoutUsecase, PurchaseList, PurchaseListGetUsecase } from '../../domain';
import { PurchaseListScreen, PurchaseListScreenProps } from './PurchaseListScreen';
import { useAuthLogoutController, usePurchaseListGetController } from '../controllers';

export type PurchaseListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  purchaseListGetUsecase: PurchaseListGetUsecase;
};

export const PurchaseListHandler = ({
  authLogoutUsecase,
  purchaseListGetUsecase,
}: PurchaseListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const purchaseListGet = usePurchaseListGetController(purchaseListGetUsecase);

  return (
    <PurchaseListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onRetryButtonPress={() => purchaseListGet.dispatch({ type: 'FETCH' })}
      isRevalidating={purchaseListGet.state.type === 'revalidating'}
      variant={match(purchaseListGet.state)
        .returnType<PurchaseListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          {
            type: P.union('loaded', 'revalidating'),
            purchaseList: P.not(P.nullish),
          },
          ({ purchaseList }) => ({
            type:
              (purchaseList as PurchaseList).items.length > 0
                ? 'loaded'
                : 'empty',
            purchaseList: purchaseList as PurchaseList,
            stockCheckDate: (purchaseList as PurchaseList).stockCheckDate,
            totalEstimatedCost: (purchaseList as PurchaseList).totalEstimatedCost,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .otherwise(() => ({ type: 'loading' }))}
    />
  );
};
