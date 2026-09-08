// Shared by resolveSession (server) and CookieSessionRepository (browser),
// so the two agree on the exact cookie/storage keys and shape (D3/D4 in
// docs/trd-order-app-composition-and-ssr.md).
export const SESSION_ID_COOKIE_NAME = 'gl_session_id';
export const SESSION_ID_STORAGE_KEY = 'gl_session_id';
export const TABLE_CODE_STORAGE_KEY = 'gl_table_code';
export const SESSION_ID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

export const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
