import { useCallback } from 'react';
import { CouponListUsecase } from '../../domain';
import { useController } from './controller';
import { useFocusEffect } from '../../utils';
import { match, P } from 'ts-pattern';
import { CouponListProps } from '../components';

export const useCouponListController = (usecase: CouponListUsecase) => {
  const { state, dispatch } = useController(usecase);

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'FETCH' });
    }, [dispatch])
  );

  const onRetryButtonPress = () => {
    dispatch({ type: 'FETCH' });
  };

  const variant = match(state)
    .returnType<CouponListProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'revalidating') }, ({ coupons }) => ({
      type: coupons.length > 0 ? 'loaded' : 'empty',
      coupons,
    }))
    .with({ type: 'error' }, () => ({ type: 'error' }))
    .exhaustive();

  return {
    state,
    dispatch,
    onRetryButtonPress,
    variant,
  };
};
