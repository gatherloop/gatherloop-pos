import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { SessionRepository } from '../domain/repositories/session';
import { BrowserSessionRepository } from '../data/browser/session';
import { registerSessionHeaderInterceptor } from '../data/browser/sessionInterceptor';

const SessionContext = createContext<SessionRepository | null>(null);

export const useSessionRepository = (): SessionRepository => {
  const repository = useContext(SessionContext);
  if (!repository) {
    throw new Error(
      'useSessionRepository must be used within a SessionProvider'
    );
  }
  return repository;
};

export type SessionProviderProps = {
  children: ReactNode;
};

// FR-4 in docs/prd-table-ordering.md: mints/reconciles the anonymous session
// (D3) once for the whole app and registers the `X-Session-Id` axios
// interceptor (D22) before any descendant screen can issue a request.
export const SessionProvider = ({ children }: SessionProviderProps) => {
  const [sessionRepository] = useState<SessionRepository>(
    () => new BrowserSessionRepository()
  );

  useEffect(
    () => registerSessionHeaderInterceptor(sessionRepository),
    [sessionRepository]
  );

  return (
    <SessionContext.Provider value={sessionRepository}>
      {children}
    </SessionContext.Provider>
  );
};
