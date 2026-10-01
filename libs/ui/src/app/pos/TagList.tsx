import { ApiAuthRepository, ApiTagRepository } from '../../data';
import {
  TagListUsecase,
  TagDeleteUsecase,
  AuthLogoutUsecase,
  TagListParams,
} from '../../domain';
import { TagListHandler } from '../../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TagListProps = {
  tagListParams: TagListParams;
};

export function TagList({ tagListParams }: TagListProps) {
  const client = new QueryClient();
  const tagRepository = new ApiTagRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const tagDeleteUsecase = new TagDeleteUsecase(tagRepository);
  const tagListUsecase = new TagListUsecase(
    tagRepository,
    tagListParams
  );

  return (
    <TagListHandler
      authLogoutUsecase={authLogoutUsecase}
      tagListUsecase={tagListUsecase}
      tagDeleteUsecase={tagDeleteUsecase}
    />
  );
}
