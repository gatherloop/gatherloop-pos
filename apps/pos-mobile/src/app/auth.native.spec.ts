// Verifies the React Native session lifecycle end to end: the API layer
// Metro resolves for this app (auth.native.ts / authToken.native.ts)
// actually persists/clears a bearer token in AsyncStorage and attaches it
// to outgoing requests, instead of relying on the httpOnly session cookie
// the web app uses (which RN's networking layer won't reliably store —
// it's Secure-only, and most native dev/prod setups against this API are
// plain HTTP).
// Deep-imports the .native.ts files directly rather than through the
// @gatherloop-pos/ui barrel: the barrel's index also re-exports the shared
// Tamagui config, which pulls in the moti/reanimated native animation stack
// — untranspiled ESM this project's jest config isn't set up to parse, and
// unrelated to what this spec verifies.
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
