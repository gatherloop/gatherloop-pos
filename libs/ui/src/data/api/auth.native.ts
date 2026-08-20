// eslint-disable-next-line @nx/enforce-module-boundaries
import { authLogin, authLogout } from '../../../../api-contract/src';
import { AuthRepository } from '../../domain';
import { clearStoredAuthToken, setStoredAuthToken } from './authToken';

export class ApiAuthRepository implements AuthRepository {
  login: AuthRepository['login'] = (authLoginForm) => {
    return authLogin(authLoginForm).then((response) =>
      setStoredAuthToken(response.data)
    );
  };
  logout: AuthRepository['logout'] = () => {
    return authLogout().then(() => clearStoredAuthToken());
  };
}
