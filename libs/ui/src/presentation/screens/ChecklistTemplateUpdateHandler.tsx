import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, ChecklistTemplateUpdateUsecase } from '../../domain';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useChecklistTemplateUpdateController,
} from '../controllers';
import {
  ChecklistTemplateUpdateScreen,
  ChecklistTemplateUpdateScreenProps,
} from './ChecklistTemplateUpdateScreen';
import { match, P } from 'ts-pattern';

export type ChecklistTemplateUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  checklistTemplateUpdateUsecase: ChecklistTemplateUpdateUsecase;
};

export const ChecklistTemplateUpdateHandler = ({
  authLogoutUsecase,
  checklistTemplateUpdateUsecase,
}: ChecklistTemplateUpdateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const checklistTemplateUpdate = useChecklistTemplateUpdateController(
    checklistTemplateUpdateUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (checklistTemplateUpdate.state.type === 'submitSuccess') {
      router.push('/checklist-templates');
    }
  }, [checklistTemplateUpdate.state.type, router]);

  return (
    <ChecklistTemplateUpdateScreen
      form={checklistTemplateUpdate.form}
      onSubmit={(values) =>
        checklistTemplateUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        checklistTemplateUpdate.state.type === 'submitting' ||
        checklistTemplateUpdate.state.type === 'submitError' ||
        checklistTemplateUpdate.state.type === 'submitSuccess'
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onRetryButtonPress={() =>
        checklistTemplateUpdate.dispatch({ type: 'FETCH' })
      }
      variant={match(checklistTemplateUpdate.state)
        .returnType<ChecklistTemplateUpdateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union('loaded', 'submitting', 'submitSuccess', 'submitError'),
          },
          () => ({ type: 'loaded' })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
    />
  );
};
