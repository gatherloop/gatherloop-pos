import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Tag,
  TagDeleteUsecase,
  TagListUsecase,
} from '../../../domain';
import { TagListScreen, TagListScreenProps } from '../../views/screens/pos/TagListScreen';
import { match, P } from 'ts-pattern';
import { useCallback, useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import { useFocusEffect } from '../../../utils';

export type TagListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  tagListUsecase: TagListUsecase;
  tagDeleteUsecase: TagDeleteUsecase;
};

export const TagListHandler = ({
  authLogoutUsecase,
  tagListUsecase,
  tagDeleteUsecase,
}: TagListHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const tagList = useUsecase(tagListUsecase);
  const tagDelete = useUsecase(tagDeleteUsecase);
  const router = useRouter();
  const toast = useToastController();

  useFocusEffect(
    useCallback(() => {
      tagList.dispatch({ type: 'FETCH' });
    }, [tagList.dispatch])
  );

  useEffect(() => {
    match(tagDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        toast.show('Delete Tag Success');
        tagList.dispatch({ type: 'FETCH' });
      })
      .with({ type: 'deletingError' }, () => {
        toast.show('Delete Tag Error');
      })
      .otherwise(() => {
        // nothing to do
      });
  }, [tagDelete.state, tagList, toast]);

  return (
    <TagListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(tag: Tag) =>
        router.push(`/tags/${tag.id}`)
      }
      onAssignMenuPress={(tag: Tag) =>
        router.push(`/tags/${tag.id}/assign`)
      }
      onItemPress={(tag: Tag) =>
        router.push(`/tags/${tag.id}`)
      }
      onDeleteMenuPress={(tag: Tag) =>
        tagDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          tagId: tag.id,
        })
      }
      onEmptyActionPress={() => router.push('/tags/create')}
      onRetryButtonPress={() => tagList.dispatch({ type: 'FETCH' })}
      isRevalidating={tagList.state.type === 'revalidating'}
      variant={match(tagList.state)
        .returnType<TagListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: P.union('loaded', 'revalidating') }, ({ tags }) => ({
          type: tags.length > 0 ? 'loaded' : 'empty',
          tags,
        }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      isDeleteButtonDisabled={tagDelete.state.type === 'deleting'}
      deleteVariantCount={
        tagList.state.tags.find((tag) => tag.id === tagDelete.state.tagId)
          ?.variantCount
      }
      isDeleteModalOpen={match(tagDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      onDeleteCancel={() =>
        tagDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() => tagDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
