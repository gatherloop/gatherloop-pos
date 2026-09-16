import { SessionRepository } from '../../domain/repositories/session';

export class MockSessionRepository implements SessionRepository {
  private tableCode: string | null = null;

  constructor(private sessionId = 'mock-session-id') {}

  getSessionId: SessionRepository['getSessionId'] = () => this.sessionId;

  getTableCode: SessionRepository['getTableCode'] = () => this.tableCode;

  setTableCode: SessionRepository['setTableCode'] = (code) => {
    this.tableCode = code;
  };

  reset() {
    this.tableCode = null;
  }
}
