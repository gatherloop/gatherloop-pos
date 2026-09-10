// eslint-disable-next-line @nx/enforce-module-boundaries
import { ApiAuthRepository } from '../../../../libs/ui/src/data/api/auth.native';
import {
  getStoredAuthToken,
  registerAuthTokenInterceptor,
  // eslint-disable-next-line @nx/enforce-module-boundaries
} from '../../../../libs/ui/src/data/api/authToken.native';

const mockAuthLogin = jest.fn();
const mockAuthLogout = jest.fn();

jest.mock('../../../../libs/api-contract/src', () => ({
  authLogin: (...args: unknown[]) => mockAuthLogin(...args),
  authLogout: (...args: unknown[]) => mockAuthLogout(...args),
}));

jest.mock('../../../../libs/api-contract/src/client', () => ({
  axiosInstance: {
    defaults: {},
    interceptors: { request: { use: jest.fn(() => 1), eject: jest.fn() } },
  },
}));

describe('ApiAuthRepository (native)', () => {
  beforeEach(() => {
    mockAuthLogin.mockReset();
    mockAuthLogout.mockReset();
  });

  it('persists the token returned by the login response', async () => {
    mockAuthLogin.mockResolvedValue({ data: 'jwt-token' });
    const repository = new ApiAuthRepository();

    await repository.login({ username: 'admin', password: 'secret' });

    await expect(getStoredAuthToken()).resolves.toBe('jwt-token');
  });

  it('clears the stored token once logout succeeds', async () => {
    mockAuthLogin.mockResolvedValue({ data: 'jwt-token' });
    mockAuthLogout.mockResolvedValue({ data: { success: true } });
    const repository = new ApiAuthRepository();
    await repository.login({ username: 'admin', password: 'secret' });

    await repository.logout();

    await expect(getStoredAuthToken()).resolves.toBeNull();
  });

  it('keeps the stored token when the logout request fails', async () => {
    mockAuthLogin.mockResolvedValue({ data: 'jwt-token' });
    mockAuthLogout.mockRejectedValue(new Error('network error'));
    const repository = new ApiAuthRepository();
    await repository.login({ username: 'admin', password: 'secret' });

    await expect(repository.logout()).rejects.toThrow();

    await expect(getStoredAuthToken()).resolves.toBe('jwt-token');
  });
});

describe('registerAuthTokenInterceptor', () => {
  it('returns an unregister function', () => {
    const unregister = registerAuthTokenInterceptor();
    expect(typeof unregister).toBe('function');
    unregister();
  });
});
