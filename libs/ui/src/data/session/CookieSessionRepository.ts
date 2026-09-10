import { SessionRepository } from '../../domain/repositories/session';
import {
  SESSION_ID_COOKIE_MAX_AGE_SECONDS,
  SESSION_ID_COOKIE_NAME,
  SESSION_ID_STORAGE_KEY,
  TABLE_CODE_STORAGE_KEY,
  UUID_V4_PATTERN,
} from './constants';

const isValidSessionId = (value: string | null): value is string =>
  value !== null && UUID_V4_PATTERN.test(value);

const writeCookie = (name: string, value: string, maxAgeSeconds: number): void => {
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'SameSite=Lax',
    'Secure',
  ].join('; ');
};

const readLocalStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocalStorage = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private browsing, quota) — the cookie
    // (or, worst case, a fresh mint next load) is the fallback (D3).
  }
};

export class CookieSessionRepository implements SessionRepository {
  private sessionId: string | null;
  private reconciled = false;

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? null;
  }

  getSessionId: SessionRepository['getSessionId'] = () => {
    if (typeof window !== 'undefined' && !this.reconciled) {
      this.reconciled = true;
      this.sessionId = this.reconcile();
    }

    return this.sessionId ?? '';
  };

  private reconcile(): string {
    const stored = readLocalStorage(SESSION_ID_STORAGE_KEY);

    if (isValidSessionId(stored) && stored !== this.sessionId) {
      writeCookie(
        SESSION_ID_COOKIE_NAME,
        stored,
        SESSION_ID_COOKIE_MAX_AGE_SECONDS
      );
      return stored;
    }

    if (isValidSessionId(this.sessionId)) {
      if (stored !== this.sessionId) {
        writeLocalStorage(SESSION_ID_STORAGE_KEY, this.sessionId);
      }
      return this.sessionId;
    }

    const minted = crypto.randomUUID();
    writeCookie(
      SESSION_ID_COOKIE_NAME,
      minted,
      SESSION_ID_COOKIE_MAX_AGE_SECONDS
    );
    writeLocalStorage(SESSION_ID_STORAGE_KEY, minted);
    return minted;
  }

  getTableCode: SessionRepository['getTableCode'] = () =>
    readLocalStorage(TABLE_CODE_STORAGE_KEY);

  setTableCode: SessionRepository['setTableCode'] = (code) => {
    writeLocalStorage(TABLE_CODE_STORAGE_KEY, code);
  };
}
