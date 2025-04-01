import { Calculation, CalculationForm } from '../entities';

export interface CalculationRepository {
  getCalculationByIdServerParams: () => number | null;

  getCalculationList: () => Calculation[];

  getCalculationById: (calculationId: number) => Calculation | null;

  fetchCalculationList: () => Promise<Calculation[]>;

  fetchCalculationById: (calculationId: number) => Promise<Calculation>;

  deleteCalculationById: (calculationId: number) => Promise<void>;

  createCalculation: (formValues: CalculationForm) => Promise<void>;

  updateCalculation: (
    formValues: CalculationForm,
    calculationId: number
  ) => Promise<void>;
}
