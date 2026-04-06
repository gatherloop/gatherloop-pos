import {
  ChecklistSession,
  ChecklistSessionForm,
  ChecklistSessionItem,
  ChecklistSessionSubItem,
} from '../../domain/entities';
import {
  ChecklistSessionListFilter,
  ChecklistSessionRepository,
} from '../../domain/repositories/checklistSession';

const now = '2024-03-20T00:00:00.000Z';

export const initialChecklistSessions: ChecklistSession[] = [
  {
    id: 1,
    checklistTemplateId: 1,
    checklistTemplate: {
      id: 1,
      name: 'Opening Checklist',
      description: 'Daily opening procedure',
      items: [],
      createdAt: now,
      updatedAt: now,
    },
    date: '2024-03-20',
    completedAt: undefined,
    items: [
      {
        id: 1,
        checklistSessionId: 1,
        checklistTemplateItemId: 1,
        name: 'Turn on lights',
        description: 'Turn on all lights',
        displayOrder: 1,
        completedAt: undefined,
        subItems: [
          {
            id: 1,
            checklistSessionItemId: 1,
            checklistTemplateSubItemId: 1,
            name: 'Bar Lamp',
            displayOrder: 1,
            completedAt: undefined,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 2,
            checklistSessionItemId: 1,
            checklistTemplateSubItemId: 2,
            name: 'Door Lamp',
            displayOrder: 2,
            completedAt: undefined,
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        checklistSessionId: 1,
        checklistTemplateItemId: 2,
        name: 'Turn on music',
        displayOrder: 2,
        completedAt: undefined,
        subItems: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
];

export class MockChecklistSessionRepository
  implements ChecklistSessionRepository
{
  sessions: ChecklistSession[] = initialChecklistSessions.map((s) => ({
    ...s,
    items: s.items.map((i) => ({
      ...i,
      subItems: [...i.subItems],
    })),
  }));
  private nextId = 10;
  private shouldFail = false;
  private duplicateSessionError = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  setDuplicateSessionError(value: boolean) {
    this.duplicateSessionError = value;
  }

  getChecklistSessionList({
    page,
    itemPerPage,
    filter,
  }: {
    page: number;
    itemPerPage: number;
    filter: ChecklistSessionListFilter;
  }): { checklistSessions: ChecklistSession[]; totalItem: number } {
    let filtered = this.sessions;

    if (filter.templateId != null) {
      filtered = filtered.filter(
        (s) => s.checklistTemplateId === filter.templateId
      );
    }
    if (filter.dateFrom != null) {
      filtered = filtered.filter((s) => s.date >= filter.dateFrom!);
    }
    if (filter.dateTo != null) {
      filtered = filtered.filter((s) => s.date <= filter.dateTo!);
    }
    if (filter.status != null) {
      if (filter.status === 'completed') {
        filtered = filtered.filter((s) => s.completedAt != null);
      } else if (filter.status === 'incomplete') {
        filtered = filtered.filter((s) => s.completedAt == null);
      }
    }

    const totalItem = filtered.length;
    const start = (page - 1) * itemPerPage;
    const paged = filtered.slice(start, start + itemPerPage);

    return {
      checklistSessions: paged.map((s) => ({
        ...s,
        items: s.items.map((i) => ({ ...i, subItems: [...i.subItems] })),
      })),
      totalItem,
    };
  }

  async fetchChecklistSessionList({
    page,
    itemPerPage,
    filter,
  }: {
    page: number;
    itemPerPage: number;
    filter: ChecklistSessionListFilter;
  }): Promise<{ checklistSessions: ChecklistSession[]; totalItem: number }> {
    if (this.shouldFail)
      throw new Error('Failed to fetch checklist session list');
    return this.getChecklistSessionList({ page, itemPerPage, filter });
  }

  async fetchChecklistSessionById(
    checklistSessionId: number
  ): Promise<ChecklistSession> {
    if (this.shouldFail) throw new Error('Failed to fetch checklist session');
    const s = this.sessions.find((s) => s.id === checklistSessionId);
    if (!s) throw new Error('Checklist session not found');
    return { ...s, items: s.items.map((i) => ({ ...i, subItems: [...i.subItems] })) };
  }

  async createChecklistSession(
    formValues: ChecklistSessionForm
  ): Promise<ChecklistSession> {
    if (this.shouldFail) throw new Error('Failed to create checklist session');
    if (this.duplicateSessionError)
      throw new Error('Session already exists for this template and date');

    const newSession: ChecklistSession = {
      id: this.nextId++,
      checklistTemplateId: formValues.checklistTemplateId,
      date: formValues.date,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.sessions.push(newSession);
    return { ...newSession };
  }

  async deleteChecklistSessionById(
    checklistSessionId: number
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete checklist session');
    this.sessions = this.sessions.filter((s) => s.id !== checklistSessionId);
  }

  async checkChecklistSessionItem(
    checklistSessionItemId: number
  ): Promise<ChecklistSessionItem> {
    if (this.shouldFail) throw new Error('Failed to check session item');
    for (const session of this.sessions) {
      const item = session.items.find((i) => i.id === checklistSessionItemId);
      if (item) {
        item.completedAt = new Date().toISOString();
        // Check if all items are completed to mark session complete
        const allCompleted = session.items.every((i) => {
          if (i.subItems.length > 0) {
            return i.subItems.every((sub) => sub.completedAt != null);
          }
          return i.completedAt != null;
        });
        if (allCompleted) {
          session.completedAt = new Date().toISOString();
        }
        return { ...item, subItems: [...item.subItems] };
      }
    }
    throw new Error('Session item not found');
  }

  async uncheckChecklistSessionItem(
    checklistSessionItemId: number
  ): Promise<ChecklistSessionItem> {
    if (this.shouldFail) throw new Error('Failed to uncheck session item');
    for (const session of this.sessions) {
      const item = session.items.find((i) => i.id === checklistSessionItemId);
      if (item) {
        item.completedAt = undefined;
        session.completedAt = undefined;
        return { ...item, subItems: [...item.subItems] };
      }
    }
    throw new Error('Session item not found');
  }

  async checkChecklistSessionSubItem(
    checklistSessionSubItemId: number
  ): Promise<ChecklistSessionSubItem> {
    if (this.shouldFail) throw new Error('Failed to check session sub item');
    for (const session of this.sessions) {
      for (const item of session.items) {
        const subItem = item.subItems.find(
          (sub) => sub.id === checklistSessionSubItemId
        );
        if (subItem) {
          subItem.completedAt = new Date().toISOString();
          // Auto-complete parent item if all sub-items done
          const allSubItemsDone = item.subItems.every(
            (sub) => sub.completedAt != null
          );
          if (allSubItemsDone) {
            item.completedAt = new Date().toISOString();
          }
          // Auto-complete session if all items done
          const allItemsDone = session.items.every((i) => {
            if (i.subItems.length > 0) {
              return i.subItems.every((sub) => sub.completedAt != null);
            }
            return i.completedAt != null;
          });
          if (allItemsDone) {
            session.completedAt = new Date().toISOString();
          }
          return { ...subItem };
        }
      }
    }
    throw new Error('Session sub item not found');
  }

  async uncheckChecklistSessionSubItem(
    checklistSessionSubItemId: number
  ): Promise<ChecklistSessionSubItem> {
    if (this.shouldFail) throw new Error('Failed to uncheck session sub item');
    for (const session of this.sessions) {
      for (const item of session.items) {
        const subItem = item.subItems.find(
          (sub) => sub.id === checklistSessionSubItemId
        );
        if (subItem) {
          subItem.completedAt = undefined;
          item.completedAt = undefined;
          session.completedAt = undefined;
          return { ...subItem };
        }
      }
    }
    throw new Error('Session sub item not found');
  }

  reset() {
    this.sessions = initialChecklistSessions.map((s) => ({
      ...s,
      items: s.items.map((i) => ({
        ...i,
        subItems: [...i.subItems],
      })),
    }));
    this.nextId = 10;
    this.shouldFail = false;
    this.duplicateSessionError = false;
  }
}
