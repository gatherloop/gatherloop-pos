import { match, P } from 'ts-pattern';
import { CalculationListUsecase } from '../../domain';
import { useController } from './controller';
import { CalculationListProps } from '../components';

export const useCalculationListController = (
  usecase: CalculationListUsecase
) => {
  const { state, dispatch } = useController(usecase);

  const onRetryButtonPress = () => dispatch({ type: 'FETCH' });

  const variant = match(state)
    .returnType<CalculationListProps['variant']>()
    .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
    .with({ type: P.union('loaded', 'revalidating') }, ({ calculations }) => ({
      type: 'loaded',
      items: calculations,
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
