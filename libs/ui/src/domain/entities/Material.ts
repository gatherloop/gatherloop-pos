export type Material = {
  id: number;
  name: string;
  price: number;
  unit: string;
  description?: string;
  createdAt: string;
};

export type MaterialForm = {
  name: string;
  price: number;
  unit: string;
  description?: string;
};
