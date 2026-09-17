import { ApiAuthRepository } from '../../data/api/auth';
import { AuthLoginUsecase } from '../../domain/usecases/authLogin';
import { AuthLoginHandler } from '../../presentation/handlers/kds/AuthLoginHandler';

export function AuthLogin() {
  const authRepository = new ApiAuthRepository();
  const authLoginUsecase = new AuthLoginUsecase(authRepository);
  return <AuthLoginHandler authLoginUsecase={authLoginUsecase} />;
}
