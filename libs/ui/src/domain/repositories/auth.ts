import { AuthLoginForm } from '../entities';

export interface AuthRepository {
  login: (formValues: AuthLoginForm) => Promise<void>;
  logout: () => Promise<void>;
}
