import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CategoryCreateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  CategoryCreateScreen,
  CategoryCreateScreenProps,
} from '../../views/screens/pos/CategoryCreateScreen';

export type CategoryCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  categoryCreateUsecase: CategoryCreateUsecase;
};

export const CategoryCreateHandler = ({
  authLogoutUsecase,
  categoryCreateUsecase,
}: CategoryCreateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const categoryCreate = useUsecase(categoryCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (categoryCreate.state.type === 'submitSuccess') {
      toast.show('Create Category Success');
      router.push('/categories');
    } else if (categoryCreate.state.type === 'submitError') {
      toast.show('Create Category Error');
    }
  }, [categoryCreate.state.type, toast, router]);

  return (
    <CategoryCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={categoryCreate.state.values}
      isSubmitDisabled={
        categoryCreate.state.type === 'submitting' ||
        categoryCreate.state.type === 'submitSuccess'
      }
      isSubmitting={categoryCreate.state.type === 'submitting'}
      serverError={
        categoryCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) => categoryCreate.dispatch({ type: 'SUBMIT', values })}
      variant={match(categoryCreate.state)
        .returnType<CategoryCreateScreenProps['variant']>()
        .with({ type: 'loaded' }, () => ({ type: 'loaded' }))
        .with(
          {
            type: P.union('submitting', 'submitSuccess', 'submitError'),
          },
          () => ({
            type: 'loaded',
          })
        )
        .exhaustive()}
    />
  );
};
