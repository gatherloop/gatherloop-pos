import { ApiAuthRepository } from '../data';
import { AuthLoginUsecase } from '../domain';
import { AuthLoginScreen as AuthLoginScreenView } from '../presentation';

export function AuthLoginScreen() {
  const repository = new ApiAuthRepository();
  const usecase = new AuthLoginUsecase(repository);
  return <AuthLoginScreenView authLoginUsecase={usecase} />;
}
