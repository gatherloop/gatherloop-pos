import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CategoryCreateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCategoryCreateController,
} from '../controllers';
import {
  CategoryCreateScreen,
  CategoryCreateScreenProps,
} from './CategoryCreateScreen';

export type CategoryCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  categoryCreateUsecase: CategoryCreateUsecase;
};

export const CategoryCreateHandler = ({
  authLogoutUsecase,
  categoryCreateUsecase,
}: CategoryCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const categoryCreate = useCategoryCreateController(categoryCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (categoryCreate.state.type === 'submitSuccess')
      router.push('/categories');
  }, [categoryCreate.state.type, router]);

  return (
    <CategoryCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      form={categoryCreate.form}
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
