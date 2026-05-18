import { match, P } from 'ts-pattern';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AuthLogoutUsecase, PurchaseList, PurchaseListGetUsecase } from '../../domain';
import { PurchaseTypeFilter } from '../../domain/entities/Material';
import { PurchaseListScreen, PurchaseListScreenProps } from './PurchaseListScreen';
import { useAuthLogoutController, usePurchaseListGetController } from '../controllers';

function readFilterFromUrl(): PurchaseTypeFilter {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'all';
  const param = new URLSearchParams(window.location.search).get('purchaseType');
  if (param === 'online' || param === 'offline' || param === 'delivery') return param;
  return 'all';
}

function writeFilterToUrl(filter: PurchaseTypeFilter) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (filter === 'all') {
    url.searchParams.delete('purchaseType');
  } else {
    url.searchParams.set('purchaseType', filter);
  }
  window.history.replaceState(null, '', url.toString());
}

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
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<PurchaseTypeFilter>('all');

  useEffect(() => {
    setPurchaseTypeFilter(readFilterFromUrl());
  }, []);

  const handlePurchaseTypeFilterChange = (filter: PurchaseTypeFilter) => {
    setPurchaseTypeFilter(filter);
    writeFilterToUrl(filter);
  };

  return (
    <PurchaseListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onRetryButtonPress={() => purchaseListGet.dispatch({ type: 'FETCH' })}
      isRevalidating={purchaseListGet.state.type === 'revalidating'}
      getMaterialEditUrl={(materialId) => `/materials/${materialId}`}
      purchaseTypeFilter={purchaseTypeFilter}
      onPurchaseTypeFilterChange={handlePurchaseTypeFilterChange}
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
