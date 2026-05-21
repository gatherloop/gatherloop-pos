import { match, P } from 'ts-pattern';
import {
  AuthLogoutUsecase,
  PurchaseList,
  PurchaseListGetUsecase,
} from '../../domain';
import {
  PurchaseListScreen,
  PurchaseListScreenProps,
} from './PurchaseListScreen';
import {
  useAuthLogoutController,
  usePurchaseListGetController,
} from '../controllers';
import { usePrinter } from '../../utils';

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
  const { print } = usePrinter();

  return (
    <PurchaseListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onRetryButtonPress={() => purchaseListGet.dispatch({ type: 'FETCH' })}
      isRevalidating={purchaseListGet.state.type === 'revalidating'}
      getMaterialEditUrl={(materialId) => `/materials/${materialId}`}
      purchaseTypeFilter={purchaseListGet.state.purchaseTypeFilter}
      onPurchaseTypeFilterChange={(filter) =>
        purchaseListGet.dispatch({
          type: 'CHANGE_PURCHASE_TYPE_FILTER',
          filter,
        })
      }
      onPrintButtonPress={() => {
        if (
          purchaseListGet.state.type === 'loaded' &&
          purchaseListGet.state.purchaseList
        ) {
          print({
            type: 'PURCHASE_LIST',
            purchaseList: {
              stockCheckDate: purchaseListGet.state.purchaseList.stockCheckDate,
              totalEstimatedCost:
                purchaseListGet.state.purchaseList.totalEstimatedCost,
              supplierNames: purchaseListGet.state.purchaseList.items.map(
                (item) => item.suppliers[0]?.supplier?.name
              ),
              items: purchaseListGet.state.purchaseList.items.map((item) => ({
                materialName: item.materialName,
                purchaseQuantity: item.purchaseQuantity,
                purchaseUnit: item.purchaseUnit,
                estimatedCost: item.estimatedCost,
                supplierName: item.suppliers[0]?.supplier?.name,
              })),
            },
          });
        }
      }}
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
            totalEstimatedCost: (purchaseList as PurchaseList)
              .totalEstimatedCost,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .otherwise(() => ({ type: 'loading' }))}
    />
  );
};
