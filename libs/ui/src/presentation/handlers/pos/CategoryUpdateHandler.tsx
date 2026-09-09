import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CategoryUpdateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  CategoryUpdateScreen,
  CategoryUpdateScreenProps,
} from '../../views/screens/pos/CategoryUpdateScreen';

export type CategoryUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  categoryUpdateUsecase: CategoryUpdateUsecase;
};

export const CategoryUpdateHandler = ({
  authLogoutUsecase,
  categoryUpdateUsecase,
}: CategoryUpdateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const categoryUpdate = useUsecase(categoryUpdateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (categoryUpdate.state.type === 'submitSuccess') {
      toast.show('Update Category Success');
      router.push('/categories');
    } else if (categoryUpdate.state.type === 'submitError') {
      toast.show('Update Category Error');
    }
  }, [categoryUpdate.state.type, toast, router]);

  return (
    <CategoryUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={categoryUpdate.state.values}
      isSubmitDisabled={
        categoryUpdate.state.type === 'submitting' ||
        categoryUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={categoryUpdate.state.type === 'submitting'}
      serverError={
        categoryUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) => categoryUpdate.dispatch({ type: 'SUBMIT', values })}
      variant={match(categoryUpdate.state)
        .returnType<CategoryUpdateScreenProps['variant']>()
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
          onRetryButtonPress: () => categoryUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
