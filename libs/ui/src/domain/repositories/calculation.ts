import { Calculation, CalculationForm } from '../entities';

export interface CalculationRepository {
  fetchCalculationList: () => Promise<Calculation[]>;

  fetchCalculationById: (calculationId: number) => Promise<Calculation>;

  deleteCalculationById: (calculationId: number) => Promise<void>;

  createCalculation: (formValues: CalculationForm) => Promise<void>;

  updateCalculation: (
    formValues: CalculationForm,
    calculationId: number
  ) => Promise<void>;

  completeCalculationById: (calculationId: number) => Promise<void>;
}
