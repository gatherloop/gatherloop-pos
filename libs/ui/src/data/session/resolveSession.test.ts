import { randomUUID } from 'crypto';
import { resolveSession } from './resolveSession';

if (typeof globalThis.crypto.randomUUID !== 'function') {
  globalThis.crypto.randomUUID =
    randomUUID as typeof globalThis.crypto.randomUUID;
}

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('resolveSession', () => {
  it('reuses a valid cookie value with no Set-Cookie header', () => {
    const existing = '11111111-1111-4111-8111-111111111111';

    const result = resolveSession(existing);

    expect(result.sessionId).toBe(existing);
    expect(result.setCookie).toBeUndefined();
  });

  it('mints a fresh session id and a Set-Cookie header when no cookie is given', () => {
    const result = resolveSession(undefined);

    expect(result.sessionId).toMatch(UUID_V4_PATTERN);
    expect(result.setCookie).toContain(`gl_session_id=${result.sessionId}`);
    expect(result.setCookie).toContain('Max-Age=');
    expect(result.setCookie).toContain('Path=/');
    expect(result.setCookie).toContain('SameSite=Lax');
    expect(result.setCookie).toContain('Secure');
  });

  it('mints a fresh session id when the cookie value is not a valid UUIDv4', () => {
    const result = resolveSession('not-a-uuid');

    expect(result.sessionId).toMatch(UUID_V4_PATTERN);
    expect(result.sessionId).not.toBe('not-a-uuid');
    expect(result.setCookie).toContain(`gl_session_id=${result.sessionId}`);
  });
});
