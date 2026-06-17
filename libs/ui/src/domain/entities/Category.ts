export type CategoryStation = 'KITCHEN' | 'BAR' | 'NONE';

export type Category = {
  id: number;
  name: string;
  station: CategoryStation;
  createdAt: string;
};

export type CategoryForm = {
  name: string;
  station: CategoryStation;
};
