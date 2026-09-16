export interface SessionRepository {
  getSessionId: () => string;
  getTableCode: () => string | null;
  setTableCode: (code: string) => void;
}
