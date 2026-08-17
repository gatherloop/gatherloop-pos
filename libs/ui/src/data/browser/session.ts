import { SessionRepository } from '../../domain/repositories/session';

const SESSION_ID_COOKIE_NAME = 'gl_session_id';
const SESSION_ID_STORAGE_KEY = 'gl_session_id';
const TABLE_CODE_STORAGE_KEY = 'gl_table_code';
const SESSION_ID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidSessionId = (value: string | null): value is string =>
  value !== null && UUID_V4_PATTERN.test(value);

const readCookie = (name: string): string | null => {
  const entry = document.cookie
    .split('; ')
    .find((pair) => pair.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
};

const writeCookie = (
  name: string,
  value: string,
  maxAgeSeconds: number
): void => {
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

// D3 in docs/prd-table-ordering.md: mints an anonymous session id on
// construction — before any cart request can be issued — and reconciles the
// cookie against the localStorage mirror: the cookie wins, and whichever
// storage is missing the id gets rewritten. The localStorage mirror is what
// survives cookie eviction (Safari ITP); it is re-promoted to the cookie on
// the next load.
export class BrowserSessionRepository implements SessionRepository {
  private readonly sessionId: string;

  constructor() {
    this.sessionId = this.resolveSessionId();
  }

  private resolveSessionId(): string {
    const cookieValue = readCookie(SESSION_ID_COOKIE_NAME);
    const storageValue = readLocalStorage(SESSION_ID_STORAGE_KEY);

    if (isValidSessionId(cookieValue)) {
      if (storageValue !== cookieValue) {
        writeLocalStorage(SESSION_ID_STORAGE_KEY, cookieValue);
      }
      return cookieValue;
    }

    if (isValidSessionId(storageValue)) {
      writeCookie(
        SESSION_ID_COOKIE_NAME,
        storageValue,
        SESSION_ID_COOKIE_MAX_AGE_SECONDS
      );
      return storageValue;
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

  getSessionId: SessionRepository['getSessionId'] = () => this.sessionId;

  getTableCode: SessionRepository['getTableCode'] = () =>
    readLocalStorage(TABLE_CODE_STORAGE_KEY);

  setTableCode: SessionRepository['setTableCode'] = (code) => {
    writeLocalStorage(TABLE_CODE_STORAGE_KEY, code);
  };
}
