import { ApiAuthRepository, ApiTagRepository } from '../../data';
import { AuthLogoutUsecase, TagCreateUsecase } from '../../domain';
import { TagCreateHandler } from '../../presentation';
import { QueryClient } from '@tanstack/react-query';

export function TagCreate() {
  const client = new QueryClient();
  const tagRepository = new ApiTagRepository(client);
  const authRepository = new ApiAuthRepository();

  const tagCreateUsecase = new TagCreateUsecase(tagRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <TagCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      tagCreateUsecase={tagCreateUsecase}
    />
  );
}
