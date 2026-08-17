import { randomUUID } from 'crypto';
import { BrowserSessionRepository } from './session';

// jest-environment-jsdom's bundled jsdom predates `crypto.randomUUID`, even
// though every real browser BrowserSessionRepository targets has it (D3).
// Polyfilled here for the test environment only — production code is
// unchanged.
if (typeof globalThis.crypto.randomUUID !== 'function') {
  globalThis.crypto.randomUUID =
    randomUUID as typeof globalThis.crypto.randomUUID;
}

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// jsdom's cookie jar silently drops `Secure` cookies on its default
// http://localhost test origin, which would make every write in
// BrowserSessionRepository a no-op. This stub keeps the real name=value
// read/write semantics BrowserSessionRepository actually depends on,
// without enforcing a browser transport policy these tests aren't about.
const installCookieJarStub = () => {
  let store: Record<string, string> = {};

  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () =>
      Object.entries(store)
        .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
        .join('; '),
    set: (raw: string) => {
      const [pair] = raw.split(';');
      const separatorIndex = pair.indexOf('=');
      const name = pair.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(pair.slice(separatorIndex + 1));
      store[name] = value;
    },
  });

  return {
    clear: () => {
      store = {};
    },
  };
};

describe('BrowserSessionRepository', () => {
  const cookieJar = installCookieJarStub();

  beforeEach(() => {
    cookieJar.clear();
    window.localStorage.clear();
  });

  describe('session id mint/reconcile', () => {
    it('mints a fresh session id when neither cookie nor localStorage has one', () => {
      const repository = new BrowserSessionRepository();
      const sessionId = repository.getSessionId();

      expect(sessionId).toMatch(UUID_V4_PATTERN);
      expect(document.cookie).toContain(`gl_session_id=${sessionId}`);
      expect(window.localStorage.getItem('gl_session_id')).toBe(sessionId);
    });

    it('reuses a valid cookie session id and mirrors it into localStorage', () => {
      const existing = '11111111-1111-4111-8111-111111111111';
      document.cookie = `gl_session_id=${existing}`;

      const repository = new BrowserSessionRepository();

      expect(repository.getSessionId()).toBe(existing);
      expect(window.localStorage.getItem('gl_session_id')).toBe(existing);
    });

    it('prefers the cookie over a different localStorage value', () => {
      const cookieId = '11111111-1111-4111-8111-111111111111';
      const storageId = '22222222-2222-4222-8222-222222222222';
      document.cookie = `gl_session_id=${cookieId}`;
      window.localStorage.setItem('gl_session_id', storageId);

      const repository = new BrowserSessionRepository();

      expect(repository.getSessionId()).toBe(cookieId);
      expect(window.localStorage.getItem('gl_session_id')).toBe(cookieId);
    });

    it('falls back to localStorage and re-promotes it to the cookie when the cookie is missing', () => {
      const storageId = '22222222-2222-4222-8222-222222222222';
      window.localStorage.setItem('gl_session_id', storageId);

      const repository = new BrowserSessionRepository();

      expect(repository.getSessionId()).toBe(storageId);
      expect(document.cookie).toContain(`gl_session_id=${storageId}`);
    });

    it('mints a fresh id when the stored values are not valid UUIDv4s', () => {
      document.cookie = 'gl_session_id=not-a-uuid';
      window.localStorage.setItem('gl_session_id', 'also-not-a-uuid');

      const repository = new BrowserSessionRepository();

      expect(repository.getSessionId()).toMatch(UUID_V4_PATTERN);
      expect(repository.getSessionId()).not.toBe('not-a-uuid');
    });
  });

  describe('table code', () => {
    it('returns null when no table code has been set', () => {
      const repository = new BrowserSessionRepository();
      expect(repository.getTableCode()).toBeNull();
    });

    it('persists a table code across instances', () => {
      const repository = new BrowserSessionRepository();
      repository.setTableCode('3F7H9K2M5P');

      expect(repository.getTableCode()).toBe('3F7H9K2M5P');
      expect(new BrowserSessionRepository().getTableCode()).toBe(
        '3F7H9K2M5P'
      );
    });
  });
});
