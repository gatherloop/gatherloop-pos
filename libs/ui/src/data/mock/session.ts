import { SessionRepository } from '../../domain/repositories/session';

// In-memory stand-in for BrowserSessionRepository (FR-4), so cart and
// table-resolution usecase tests run without a DOM.
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
