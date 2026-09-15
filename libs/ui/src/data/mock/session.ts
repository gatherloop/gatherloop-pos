import { SessionRepository } from '../../domain/repositories/session';

export class MockSessionRepository implements SessionRepository {
  private tableCode: string | null = null;
  private activeReference: string | null = null;

  constructor(private sessionId = 'mock-session-id') {}

  getSessionId: SessionRepository['getSessionId'] = () => this.sessionId;

  getTableCode: SessionRepository['getTableCode'] = () => this.tableCode;

  setTableCode: SessionRepository['setTableCode'] = (code) => {
    this.tableCode = code;
  };

  getActiveReference: SessionRepository['getActiveReference'] = () =>
    this.activeReference;

  setActiveReference: SessionRepository['setActiveReference'] = (
    reference
  ) => {
    this.activeReference = reference;
  };

  clearActiveReference: SessionRepository['clearActiveReference'] = () => {
    this.activeReference = null;
  };

  reset() {
    this.tableCode = null;
    this.activeReference = null;
  }
}
