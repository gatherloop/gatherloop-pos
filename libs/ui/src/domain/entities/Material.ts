export type Material = {
  id: number;
  name: string;
  price: number;
  unit: string;
  description?: string;
  weeklyUsage: number;
  createdAt: string;
};

export type MaterialForm = {
  name: string;
  price: number;
  unit: string;
  description?: string;
};
