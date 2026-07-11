export type Budget = {
  id: number;
  name: string;
  percentage: number;
  createdAt: string;
};

export type BudgetForm = {
  name: string;
  percentage: number;
};
