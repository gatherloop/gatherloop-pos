import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { match, P } from 'ts-pattern';
import {
  AuthLogoutUsecase,
  AvailabilityListUsecase,
  AvailabilityUpdateUsecase,
} from '../../../domain';
import { buildAvailabilityUpdateForm, toAvailabilityUpdateForm } from '../../../utils';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  AvailabilityScreen,
  AvailabilityScreenProps,
} from '../../views/screens/pos/AvailabilityScreen';

export type AvailabilityHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  availabilityListUsecase: AvailabilityListUsecase;
  availabilityUpdateUsecase: AvailabilityUpdateUsecase;
};

export const AvailabilityHandler = ({
  authLogoutUsecase,
  availabilityListUsecase,
  availabilityUpdateUsecase,
}: AvailabilityHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const availabilityList = useUsecase(availabilityListUsecase);
  const availabilityUpdate = useUsecase(availabilityUpdateUsecase);
  const toast = useToastController();

  useEffect(() => {
    if (availabilityUpdate.state.type === 'submitSuccess') {
      toast.show('Update Availability Success');
    } else if (availabilityUpdate.state.type === 'submitError') {
      toast.show('Update Availability Error');
    }
  }, [availabilityUpdate.state.type, toast]);

  const products =
    availabilityUpdate.state.type === 'submitSuccess'
      ? availabilityUpdate.state.products
      : availabilityList.state.products;

  return (
    <AvailabilityScreen
      products={products}
      defaultValues={toAvailabilityUpdateForm(products)}
      onSubmit={(values) =>
        availabilityUpdate.dispatch({
          type: 'SUBMIT',
          values: buildAvailabilityUpdateForm(products, values),
        })
      }
      isSubmitDisabled={availabilityUpdate.state.type === 'submitting'}
      isSubmitting={availabilityUpdate.state.type === 'submitting'}
      serverError={
        availabilityUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      variant={match(availabilityList.state)
        .returnType<AvailabilityScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: P.union('loaded', 'revalidating') }, () => ({
          type: 'loaded',
        }))
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => availabilityList.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
