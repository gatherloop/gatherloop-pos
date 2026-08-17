// eslint-disable-next-line @nx/enforce-module-boundaries
import { axiosInstance } from '../../../../api-contract/src/client';
import { SessionRepository } from '../../domain/repositories/session';

// D22 in docs/prd-table-ordering.md: the order app sends no auth cookie —
// the session travels as a header instead — so credentials buy nothing and
// only widen the CORS surface. Registered once by SessionProvider; returns
// an unregister function so effect cleanup (including React StrictMode's
// double-invoke in dev) never stacks duplicate interceptors.
export const registerSessionHeaderInterceptor = (
  sessionRepository: SessionRepository
): (() => void) => {
  axiosInstance.defaults.withCredentials = false;

  const interceptorId = axiosInstance.interceptors.request.use((config) => {
    config.headers.set('X-Session-Id', sessionRepository.getSessionId());
    return config;
  });

  return () => axiosInstance.interceptors.request.eject(interceptorId);
};
