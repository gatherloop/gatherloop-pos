// eslint-disable-next-line @nx/enforce-module-boundaries
import { authLogin, authLogout } from '../../../../api-contract/src';
import { AuthRepository } from '../../domain';

export class ApiAuthRepository implements AuthRepository {
  login: AuthRepository['login'] = (authLoginForm) => {
    return authLogin(authLoginForm).then();
  };
  logout: AuthRepository['logout'] = () => {
    return authLogout().then();
  };
}
