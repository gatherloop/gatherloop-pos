import { ApiAuthRepository } from '../data';
import { AuthLoginUsecase } from '../domain';
import { AuthLoginHandler } from '../presentation';

export function AuthLogin() {
  const authRepository = new ApiAuthRepository();
  const authLoginUsecase = new AuthLoginUsecase(authRepository);
  return <AuthLoginHandler authLoginUsecase={authLoginUsecase} />;
}
