import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CategoryUpdateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCategoryUpdateController,
} from '../controllers';
import {
  CategoryUpdateScreen,
  CategoryUpdateScreenProps,
} from './CategoryUpdateScreen';

export type CategoryUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  categoryUpdateUsecase: CategoryUpdateUsecase;
};

export const CategoryUpdateHandler = ({
  authLogoutUsecase,
  categoryUpdateUsecase,
}: CategoryUpdateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const categoryUpdate = useCategoryUpdateController(categoryUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (categoryUpdate.state.type === 'submitSuccess')
      router.push('/categories');
  }, [categoryUpdate.state.type, router]);

  return (
    <CategoryUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      form={categoryUpdate.form}
      isSubmitDisabled={
        categoryUpdate.state.type === 'submitting' ||
        categoryUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={categoryUpdate.state.type === 'submitting'}
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
