// eslint-disable-next-line @nx/enforce-module-boundaries
import { authLogin } from '../../../../api-contract/src';
import { AuthRepository } from '../../domain';

export class ApiAuthRepository implements AuthRepository {
  login: AuthRepository['login'] = (authLoginForm) => {
    return authLogin(authLoginForm).then();
  };
}
