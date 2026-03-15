import { Calculation, CalculationForm } from '../../domain/entities';
import { CalculationRepository } from '../../domain/repositories/calculation';

const mockWallet = {
  id: 1,
  name: 'Cash',
  balance: 1000,
  paymentCostPercentage: 0,
  isCashless: false,
  createdAt: '2024-03-20T00:00:00.000Z',
};

export class MockCalculationRepository implements CalculationRepository {
  calculations: Calculation[] = [
    {
      id: 1,
      createdAt: '2024-03-20T00:00:00.000Z',
      updatedAt: '2024-03-20T00:00:00.000Z',
      completedAt: null,
      wallet: mockWallet,
      totalWallet: 1000,
      totalCalculation: 500,
      calculationItems: [{ id: 1, price: 250, amount: 2 }],
    },
    {
      id: 2,
      createdAt: '2024-03-21T00:00:00.000Z',
      updatedAt: '2024-03-21T00:00:00.000Z',
      completedAt: null,
      wallet: mockWallet,
      totalWallet: 2000,
      totalCalculation: 1000,
      calculationItems: [{ id: 2, price: 500, amount: 2 }],
    },
  ];

  private nextId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchCalculationList(): Promise<Calculation[]> {
    if (this.shouldFail) throw new Error('Failed to fetch calculations');
    return [...this.calculations];
  }

  async fetchCalculationById(calculationId: number): Promise<Calculation> {
    if (this.shouldFail) throw new Error('Failed to fetch calculation');
    const calculation = this.calculations.find((c) => c.id === calculationId);
    if (!calculation) throw new Error('Calculation not found');
    return { ...calculation };
  }

  async deleteCalculationById(calculationId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete calculation');
    this.calculations = this.calculations.filter((c) => c.id !== calculationId);
  }

  async createCalculation(_formValues: CalculationForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create calculation');
    this.calculations.push({
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      wallet: mockWallet,
      totalWallet: _formValues.totalWallet,
      totalCalculation: 0,
      calculationItems: [],
    });
  }

  async updateCalculation(
    _formValues: CalculationForm,
    calculationId: number
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update calculation');
    const idx = this.calculations.findIndex((c) => c.id === calculationId);
    if (idx === -1) throw new Error('Calculation not found');
    this.calculations[idx] = {
      ...this.calculations[idx],
      totalWallet: _formValues.totalWallet,
    };
  }

  async completeCalculationById(calculationId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to complete calculation');
    const idx = this.calculations.findIndex((c) => c.id === calculationId);
    if (idx === -1) throw new Error('Calculation not found');
    this.calculations[idx] = {
      ...this.calculations[idx],
      completedAt: new Date().toISOString(),
    };
  }

  reset() {
    this.calculations = [
      {
        id: 1,
        createdAt: '2024-03-20T00:00:00.000Z',
        updatedAt: '2024-03-20T00:00:00.000Z',
        completedAt: null,
        wallet: mockWallet,
        totalWallet: 1000,
        totalCalculation: 500,
        calculationItems: [{ id: 1, price: 250, amount: 2 }],
      },
      {
        id: 2,
        createdAt: '2024-03-21T00:00:00.000Z',
        updatedAt: '2024-03-21T00:00:00.000Z',
        completedAt: null,
        wallet: mockWallet,
        totalWallet: 2000,
        totalCalculation: 1000,
        calculationItems: [{ id: 2, price: 500, amount: 2 }],
      },
    ];
    this.nextId = 3;
    this.shouldFail = false;
  }
}
