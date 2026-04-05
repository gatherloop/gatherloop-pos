import {
  ChecklistTemplate,
  ChecklistTemplateForm,
} from '../../domain/entities';
import { ChecklistTemplateRepository } from '../../domain/repositories/checklistTemplate';

const initialChecklistTemplates: ChecklistTemplate[] = [
  {
    id: 1,
    name: 'Opening Checklist',
    description: 'Daily opening procedure',
    items: [
      {
        id: 1,
        name: 'Turn on lights',
        description: 'Turn on all lights',
        displayOrder: 1,
        subItems: [
          {
            id: 1,
            name: 'Bar Lamp',
            displayOrder: 1,
            createdAt: '2024-03-20T00:00:00.000Z',
            updatedAt: '2024-03-20T00:00:00.000Z',
          },
          {
            id: 2,
            name: 'Door Lamp',
            displayOrder: 2,
            createdAt: '2024-03-20T00:00:00.000Z',
            updatedAt: '2024-03-20T00:00:00.000Z',
          },
        ],
        createdAt: '2024-03-20T00:00:00.000Z',
        updatedAt: '2024-03-20T00:00:00.000Z',
      },
      {
        id: 2,
        name: 'Turn on music',
        displayOrder: 2,
        subItems: [],
        createdAt: '2024-03-20T00:00:00.000Z',
        updatedAt: '2024-03-20T00:00:00.000Z',
      },
    ],
    createdAt: '2024-03-20T00:00:00.000Z',
    updatedAt: '2024-03-20T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Closing Checklist',
    description: 'Daily closing procedure',
    items: [
      {
        id: 3,
        name: 'Turn off lights',
        displayOrder: 1,
        subItems: [],
        createdAt: '2024-03-21T00:00:00.000Z',
        updatedAt: '2024-03-21T00:00:00.000Z',
      },
    ],
    createdAt: '2024-03-21T00:00:00.000Z',
    updatedAt: '2024-03-21T00:00:00.000Z',
  },
];

export class MockChecklistTemplateRepository
  implements ChecklistTemplateRepository
{
  checklistTemplates: ChecklistTemplate[] = [...initialChecklistTemplates];
  private nextId = 3;
  private nextItemId = 10;
  private nextSubItemId = 10;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  getChecklistTemplateList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }): { checklistTemplates: ChecklistTemplate[]; totalItem: number } {
    return {
      checklistTemplates: [...this.checklistTemplates],
      totalItem: this.checklistTemplates.length,
    };
  }

  async fetchChecklistTemplateList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }): Promise<{ checklistTemplates: ChecklistTemplate[]; totalItem: number }> {
    if (this.shouldFail)
      throw new Error('Failed to fetch checklist templates');
    return Promise.resolve({
      checklistTemplates: [...this.checklistTemplates],
      totalItem: this.checklistTemplates.length,
    });
  }

  async fetchChecklistTemplateById(
    checklistTemplateId: number
  ): Promise<ChecklistTemplate> {
    if (this.shouldFail)
      throw new Error('Failed to fetch checklist template');
    const t = this.checklistTemplates.find((t) => t.id === checklistTemplateId);
    if (!t) throw new Error('Checklist template not found');
    return { ...t };
  }

  async deleteChecklistTemplateById(
    checklistTemplateId: number
  ): Promise<void> {
    if (this.shouldFail)
      throw new Error('Failed to delete checklist template');
    this.checklistTemplates = this.checklistTemplates.filter(
      (t) => t.id !== checklistTemplateId
    );
  }

  async createChecklistTemplate(
    formValues: ChecklistTemplateForm
  ): Promise<void> {
    if (this.shouldFail)
      throw new Error('Failed to create checklist template');
    this.checklistTemplates.push({
      id: this.nextId++,
      name: formValues.name,
      description: formValues.description,
      items: formValues.items.map((item) => ({
        id: this.nextItemId++,
        name: item.name,
        description: item.description,
        displayOrder: item.displayOrder,
        subItems: item.subItems.map((sub) => ({
          id: this.nextSubItemId++,
          name: sub.name,
          displayOrder: sub.displayOrder,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async updateChecklistTemplate(
    formValues: ChecklistTemplateForm,
    checklistTemplateId: number
  ): Promise<void> {
    if (this.shouldFail)
      throw new Error('Failed to update checklist template');
    const idx = this.checklistTemplates.findIndex(
      (t) => t.id === checklistTemplateId
    );
    if (idx === -1) throw new Error('Checklist template not found');
    this.checklistTemplates[idx] = {
      ...this.checklistTemplates[idx],
      name: formValues.name,
      description: formValues.description,
      items: formValues.items.map((item) => ({
        id: this.nextItemId++,
        name: item.name,
        description: item.description,
        displayOrder: item.displayOrder,
        subItems: item.subItems.map((sub) => ({
          id: this.nextSubItemId++,
          name: sub.name,
          displayOrder: sub.displayOrder,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  reset() {
    this.checklistTemplates = [...initialChecklistTemplates];
    this.nextId = 3;
    this.nextItemId = 10;
    this.nextSubItemId = 10;
    this.shouldFail = false;
  }
}
