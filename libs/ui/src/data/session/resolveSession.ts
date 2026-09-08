import {
  SESSION_ID_COOKIE_MAX_AGE_SECONDS,
  SESSION_ID_COOKIE_NAME,
  UUID_V4_PATTERN,
} from './constants';

export type ResolvedSession = {
  sessionId: string;
  // Present only when the incoming cookie was missing or malformed — the
  // caller (a page's getServerSideProps) is expected to forward this as a
  // `Set-Cookie` response header.
  setCookie?: string;
};

const isValidSessionId = (value: string | undefined): value is string =>
  value !== undefined && UUID_V4_PATTERN.test(value);

const buildSetCookie = (sessionId: string): string =>
  [
    `${SESSION_ID_COOKIE_NAME}=${sessionId}`,
    `Max-Age=${SESSION_ID_COOKIE_MAX_AGE_SECONDS}`,
    'Path=/',
    'SameSite=Lax',
    'Secure',
  ].join('; ');

// D3 in docs/trd-order-app-composition-and-ssr.md: pure — takes and returns
// strings, so it carries no `next` dependency and runs identically inside
// getServerSideProps for every route. Mints a fresh id only when the
// incoming cookie is missing or fails the same UUIDv4 check
// CookieSessionRepository uses, so server and client never disagree about
// what counts as a valid session id.
export const resolveSession = (cookieValue?: string): ResolvedSession => {
  if (isValidSessionId(cookieValue)) {
    return { sessionId: cookieValue };
  }

  const sessionId = crypto.randomUUID();
  return { sessionId, setCookie: buildSetCookie(sessionId) };
};
