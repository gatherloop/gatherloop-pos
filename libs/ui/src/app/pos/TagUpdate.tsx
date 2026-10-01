import { ApiAuthRepository, ApiTagRepository } from '../../data';
import {
  AuthLogoutUsecase,
  TagUpdateParams,
  TagUpdateUsecase,
} from '../../domain';
import { TagUpdateHandler } from '../../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TagUpdateProps = {
  tagUpdateParams: TagUpdateParams;
};

export function TagUpdate({
  tagUpdateParams,
}: TagUpdateProps) {
  const client = new QueryClient();
  const tagRepository = new ApiTagRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const tagUpdateUsecase = new TagUpdateUsecase(
    tagRepository,
    tagUpdateParams
  );

  return (
    <TagUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      tagUpdateUsecase={tagUpdateUsecase}
    />
  );
}
