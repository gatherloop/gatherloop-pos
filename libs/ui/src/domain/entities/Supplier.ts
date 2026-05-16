export type Supplier = {
  id: number;
  name: string;
  phone?: string;
  address: string;
  mapsLink: string;
  isOnline: boolean;
  createdAt: string;
};

export type SupplierForm = {
  name: string;
  phone?: string;
  address: string;
  mapsLink: string;
  isOnline: boolean;
};
