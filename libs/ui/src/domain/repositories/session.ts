export interface SessionRepository {
  getSessionId: () => string;
  getTableCode: () => string | null;
  setTableCode: (code: string) => void;
  getActiveReference: () => string | null;
  setActiveReference: (reference: string) => void;
  clearActiveReference: () => void;
}
