import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, TagCreateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  TagCreateScreen,
  TagCreateScreenProps,
} from '../../views/screens/pos/TagCreateScreen';

export type TagCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  tagCreateUsecase: TagCreateUsecase;
};

export const TagCreateHandler = ({
  authLogoutUsecase,
  tagCreateUsecase,
}: TagCreateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const tagCreate = useUsecase(tagCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (tagCreate.state.type === 'submitSuccess') {
      toast.show('Create Tag Success');
      router.push('/tags');
    } else if (tagCreate.state.type === 'submitError') {
      toast.show('Create Tag Error');
    }
  }, [tagCreate.state.type, toast, router]);

  return (
    <TagCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={tagCreate.state.values}
      isSubmitDisabled={
        tagCreate.state.type === 'submitting' ||
        tagCreate.state.type === 'submitSuccess'
      }
      isSubmitting={tagCreate.state.type === 'submitting'}
      serverError={
        tagCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) => tagCreate.dispatch({ type: 'SUBMIT', values })}
      variant={match(tagCreate.state)
        .returnType<TagCreateScreenProps['variant']>()
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
