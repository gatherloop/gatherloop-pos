import { AuthLoginForm } from '../../domain/entities';
import { AuthRepository } from '../../domain/repositories/auth';

export class MockAuthRepository implements AuthRepository {
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async login(_formValues: AuthLoginForm): Promise<void> {
    if (this.shouldFail) throw new Error('Login failed');
  }

  async logout(): Promise<void> {
    if (this.shouldFail) throw new Error('Logout failed');
  }

  reset() {
    this.shouldFail = false;
  }
}
