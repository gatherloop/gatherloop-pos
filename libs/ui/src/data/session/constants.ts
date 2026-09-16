export const SESSION_ID_COOKIE_NAME = 'gl_session_id';
export const SESSION_ID_STORAGE_KEY = 'gl_session_id';
export const TABLE_CODE_STORAGE_KEY = 'gl_table_code';
// 400 days: the RFC 6265bis cap Chrome and Firefox enforce; asking for more gets clamped, not extended.
export const SESSION_ID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
