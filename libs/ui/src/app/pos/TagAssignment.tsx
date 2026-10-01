import {
  ApiAuthRepository,
  ApiTagRepository,
  ApiVariantRepository,
} from '../../data';
import {
  AuthLogoutUsecase,
  TagAssignmentParams,
  TagAssignmentUsecase,
} from '../../domain';
import { TagAssignmentHandler } from '../../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TagAssignmentProps = {
  tagAssignmentParams: TagAssignmentParams;
};

export function TagAssignment({ tagAssignmentParams }: TagAssignmentProps) {
  const client = new QueryClient();
  const tagRepository = new ApiTagRepository(client);
  const variantRepository = new ApiVariantRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const tagAssignmentUsecase = new TagAssignmentUsecase(
    tagRepository,
    variantRepository,
    tagAssignmentParams
  );

  return (
    <TagAssignmentHandler
      authLogoutUsecase={authLogoutUsecase}
      tagAssignmentUsecase={tagAssignmentUsecase}
    />
  );
}
