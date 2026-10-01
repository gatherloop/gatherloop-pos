import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, TagUpdateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  TagUpdateScreen,
  TagUpdateScreenProps,
} from '../../views/screens/pos/TagUpdateScreen';

export type TagUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  tagUpdateUsecase: TagUpdateUsecase;
};

export const TagUpdateHandler = ({
  authLogoutUsecase,
  tagUpdateUsecase,
}: TagUpdateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const tagUpdate = useUsecase(tagUpdateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (tagUpdate.state.type === 'submitSuccess') {
      toast.show('Update Tag Success');
      router.push('/tags');
    } else if (tagUpdate.state.type === 'submitError') {
      toast.show('Update Tag Error');
    }
  }, [tagUpdate.state.type, toast, router]);

  return (
    <TagUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={tagUpdate.state.values}
      isSubmitDisabled={
        tagUpdate.state.type === 'submitting' ||
        tagUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={tagUpdate.state.type === 'submitting'}
      serverError={
        tagUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) => tagUpdate.dispatch({ type: 'SUBMIT', values })}
      variant={match(tagUpdate.state)
        .returnType<TagUpdateScreenProps['variant']>()
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
          onRetryButtonPress: () => tagUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
