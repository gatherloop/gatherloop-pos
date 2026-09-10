import {
  SESSION_ID_COOKIE_MAX_AGE_SECONDS,
  SESSION_ID_COOKIE_NAME,
  UUID_V4_PATTERN,
} from './constants';

export type ResolvedSession = {
  sessionId: string;
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

export const resolveSession = (cookieValue?: string): ResolvedSession => {
  if (isValidSessionId(cookieValue)) {
    return { sessionId: cookieValue };
  }

  const sessionId = crypto.randomUUID();
  return { sessionId, setCookie: buildSetCookie(sessionId) };
};
