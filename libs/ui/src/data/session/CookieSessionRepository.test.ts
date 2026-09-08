import { randomUUID } from 'crypto';
import { CookieSessionRepository } from './CookieSessionRepository';

// jest-environment-jsdom's bundled jsdom predates `crypto.randomUUID`, even
// though every real browser CookieSessionRepository targets has it (D3/D4).
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
// CookieSessionRepository a no-op. This stub keeps the real name=value
// read/write semantics CookieSessionRepository actually depends on, without
// enforcing a browser transport policy these tests aren't about.
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

describe('CookieSessionRepository', () => {
  const cookieJar = installCookieJarStub();

  beforeEach(() => {
    cookieJar.clear();
    window.localStorage.clear();
  });

  describe('getSessionId', () => {
    it('returns the constructor-seeded id when nothing is in localStorage', () => {
      const seeded = '11111111-1111-4111-8111-111111111111';
      const repository = new CookieSessionRepository(seeded);

      expect(repository.getSessionId()).toBe(seeded);
      expect(window.localStorage.getItem('gl_session_id')).toBe(seeded);
    });

    it('prefers a different, valid localStorage id over the constructor-seeded one (D4)', () => {
      const seeded = '11111111-1111-4111-8111-111111111111';
      const stored = '22222222-2222-4222-8222-222222222222';
      window.localStorage.setItem('gl_session_id', stored);

      const repository = new CookieSessionRepository(seeded);

      expect(repository.getSessionId()).toBe(stored);
      expect(document.cookie).toContain(`gl_session_id=${stored}`);
    });

    it('mints a fresh id when constructed with none and localStorage is empty', () => {
      const repository = new CookieSessionRepository();
      const sessionId = repository.getSessionId();

      expect(sessionId).toMatch(UUID_V4_PATTERN);
      expect(document.cookie).toContain(`gl_session_id=${sessionId}`);
      expect(window.localStorage.getItem('gl_session_id')).toBe(sessionId);
    });

    it('reconciles once and caches the result across repeated calls', () => {
      const stored = '22222222-2222-4222-8222-222222222222';
      window.localStorage.setItem('gl_session_id', stored);

      const repository = new CookieSessionRepository(
        '11111111-1111-4111-8111-111111111111'
      );

      expect(repository.getSessionId()).toBe(stored);

      // A later, unrelated localStorage change should not un-cache the
      // already-reconciled id.
      window.localStorage.setItem(
        'gl_session_id',
        '33333333-3333-4333-8333-333333333333'
      );
      expect(repository.getSessionId()).toBe(stored);
    });
  });

  describe('table code', () => {
    it('returns null when no table code has been set', () => {
      const repository = new CookieSessionRepository('id');
      expect(repository.getTableCode()).toBeNull();
    });

    it('persists a table code across instances', () => {
      const repository = new CookieSessionRepository('id');
      repository.setTableCode('3F7H9K2M5P');

      expect(repository.getTableCode()).toBe('3F7H9K2M5P');
      expect(new CookieSessionRepository('id').getTableCode()).toBe(
        '3F7H9K2M5P'
      );
    });
  });
});
