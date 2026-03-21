import type {
  Category,
  Product,
  Material,
  Variant,
  Wallet,
  Budget,
  Coupon,
  Transaction,
  TransactionItem,
  Expense,
  WalletTransfer,
  Calculation,
  Rental,
  Supplier,
  OptionValue,
} from '../../src/domain';

// ─── Category ────────────────────────────────────────────────────────────────

export const mockCategory: Category = {
  id: 1,
  name: 'Beverages',
  createdAt: '2024-01-15T08:00:00.000Z',
};

export const mockCategories: Category[] = [
  { id: 1, name: 'Beverages', createdAt: '2024-01-15T08:00:00.000Z' },
  { id: 2, name: 'Snacks', createdAt: '2024-01-16T08:00:00.000Z' },
  { id: 3, name: 'Merchandise', createdAt: '2024-01-17T08:00:00.000Z' },
];

// ─── Material ────────────────────────────────────────────────────────────────

export const mockMaterial: Material = {
  id: 1,
  name: 'Coffee Bean',
  price: 80000,
  unit: 'kg',
  description: 'Premium Arabica coffee beans',
  weeklyUsage: 20,
  createdAt: '2024-01-15T08:00:00.000Z',
};

export const mockMaterials: Material[] = [
  {
    id: 1,
    name: 'Coffee Bean',
    price: 80000,
    unit: 'kg',
    description: 'Premium Arabica coffee beans',
    weeklyUsage: 20,
    createdAt: '2024-01-15T08:00:00.000Z',
  },
  {
    id: 2,
    name: 'Fresh Milk',
    price: 15000,
    unit: 'liter',
    description: 'Full cream fresh milk',
    weeklyUsage: 50,
    createdAt: '2024-01-16T08:00:00.000Z',
  },
  {
    id: 3,
    name: 'Sugar',
    price: 12000,
    unit: 'kg',
    description: 'Refined white sugar',
    weeklyUsage: 10,
    createdAt: '2024-01-17T08:00:00.000Z',
  },
];

// ─── Product ─────────────────────────────────────────────────────────────────

export const mockProduct: Product = {
  id: 1,
  name: 'Iced Coffee Latte',
  description: 'Refreshing iced coffee with fresh milk',
  category: mockCategory,
  imageUrl: 'https://placehold.jp/120x120.png',
  createdAt: '2024-01-15T08:00:00.000Z',
  options: [
    {
      id: 1,
      name: 'Temperature',
      values: [
        { id: 1, name: 'Iced' },
        { id: 2, name: 'Hot' },
      ],
    },
    {
      id: 2,
      name: 'Size',
      values: [
        { id: 4, name: 'Regular' },
        { id: 5, name: 'Large' },
      ],
    },
  ],
  saleType: 'purchase',
};

export const mockProducts: Product[] = [
  mockProduct,
  {
    id: 2,
    name: 'Cappuccino',
    description: 'Classic Italian espresso with steamed milk foam',
    category: mockCategory,
    imageUrl: 'https://placehold.jp/120x120.png',
    createdAt: '2024-01-16T08:00:00.000Z',
    options: [],
    saleType: 'purchase',
  },
  {
    id: 3,
    name: 'Coffee Equipment Set',
    description: 'Professional coffee equipment for events',
    category: mockCategory,
    imageUrl: 'https://placehold.jp/120x120.png',
    createdAt: '2024-01-17T08:00:00.000Z',
    options: [],
    saleType: 'rental',
  },
];

// ─── OptionValue ─────────────────────────────────────────────────────────────

export const mockOptionValue: OptionValue = { id: 1, name: 'Iced' };

export const mockOptionValues: OptionValue[] = [
  { id: 1, name: 'Iced' },
  { id: 4, name: 'Regular' },
];

// ─── Variant ─────────────────────────────────────────────────────────────────

export const mockVariant: Variant = {
  id: 1,
  name: 'Iced Coffee Latte - Iced Regular',
  price: 35000,
  description: 'Iced version, regular size',
  materials: [
    {
      id: 1,
      materialId: 1,
      amount: 0.015,
      material: mockMaterial,
    },
  ],
  product: mockProduct,
  createdAt: '2024-01-15T08:00:00.000Z',
  values: [
    { id: 1, variantId: 1, optionValueId: 1, optionValue: { id: 1, name: 'Iced' } },
    { id: 2, variantId: 1, optionValueId: 4, optionValue: { id: 4, name: 'Regular' } },
  ],
};

export const mockVariants: Variant[] = [
  mockVariant,
  {
    id: 2,
    name: 'Iced Coffee Latte - Hot Large',
    price: 40000,
    description: 'Hot version, large size',
    materials: [],
    product: mockProduct,
    createdAt: '2024-01-16T08:00:00.000Z',
    values: [
      { id: 3, variantId: 2, optionValueId: 2, optionValue: { id: 2, name: 'Hot' } },
      { id: 4, variantId: 2, optionValueId: 5, optionValue: { id: 5, name: 'Large' } },
    ],
  },
];

// ─── Wallet ──────────────────────────────────────────────────────────────────

export const mockWallet: Wallet = {
  id: 1,
  name: 'Cash',
  balance: 5000000,
  paymentCostPercentage: 0,
  isCashless: false,
  createdAt: '2024-01-15T08:00:00.000Z',
};

export const mockWallets: Wallet[] = [
  mockWallet,
  {
    id: 2,
    name: 'Bank Transfer',
    balance: 25000000,
    paymentCostPercentage: 1.5,
    isCashless: true,
    createdAt: '2024-01-16T08:00:00.000Z',
  },
  {
    id: 3,
    name: 'QRIS',
    balance: 8000000,
    paymentCostPercentage: 0.7,
    isCashless: true,
    createdAt: '2024-01-17T08:00:00.000Z',
  },
];

// ─── Budget ──────────────────────────────────────────────────────────────────

export const mockBudget: Budget = {
  id: 1,
  name: 'Raw Materials',
  percentage: 30,
  balance: 1500000,
  createdAt: '2024-01-15T08:00:00.000Z',
};

export const mockBudgets: Budget[] = [
  mockBudget,
  {
    id: 2,
    name: 'Marketing',
    percentage: 20,
    balance: 1000000,
    createdAt: '2024-01-16T08:00:00.000Z',
  },
  {
    id: 3,
    name: 'Operations',
    percentage: 15,
    balance: 750000,
    createdAt: '2024-01-17T08:00:00.000Z',
  },
];

// ─── Coupon ──────────────────────────────────────────────────────────────────

export const mockCoupon: Coupon = {
  id: 1,
  code: 'COFFEE10',
  type: 'percentage',
  amount: 10,
  createdAt: '2024-01-15T08:00:00.000Z',
};

export const mockCoupons: Coupon[] = [
  mockCoupon,
  {
    id: 2,
    code: 'FLAT5K',
    type: 'fixed',
    amount: 5000,
    createdAt: '2024-01-16T08:00:00.000Z',
  },
  {
    id: 3,
    code: 'MEMBER20',
    type: 'percentage',
    amount: 20,
    createdAt: '2024-01-17T08:00:00.000Z',
  },
];

// ─── Transaction ─────────────────────────────────────────────────────────────

export const mockTransactionItem: TransactionItem = {
  id: 1,
  variant: mockVariant,
  amount: 2,
  price: 35000,
  discountAmount: 0,
  subtotal: 70000,
  note: '',
};

export const mockTransaction: Transaction = {
  id: 1,
  createdAt: '2024-01-20T10:00:00.000Z',
  name: 'Order #001',
  orderNumber: 1,
  total: 70000,
  totalIncome: 60000,
  transactionItems: [mockTransactionItem],
  transactionCoupons: [],
  wallet: mockWallet,
  paidAt: '2024-01-20T10:30:00.000Z',
  paidAmount: 70000,
};

export const mockTransactions: Transaction[] = [
  mockTransaction,
  {
    id: 2,
    createdAt: '2024-01-21T09:00:00.000Z',
    name: 'Order #002',
    orderNumber: 2,
    total: 40000,
    totalIncome: 35000,
    transactionItems: [
      {
        id: 2,
        variant: mockVariants[1],
        amount: 1,
        price: 40000,
        discountAmount: 0,
        subtotal: 40000,
        note: 'Extra hot please',
      },
    ],
    transactionCoupons: [
      {
        id: 1,
        coupon: mockCoupon,
        type: 'percentage',
        amount: 10,
      },
    ],
    wallet: null,
    paidAt: null,
    paidAmount: 0,
  },
];

// ─── Expense ─────────────────────────────────────────────────────────────────

export const mockExpense: Expense = {
  id: 1,
  createdAt: '2024-01-20T10:00:00.000Z',
  wallet: mockWallet,
  budget: mockBudget,
  total: 315000,
  expenseItems: [
    { id: 1, name: 'Coffee Beans', unit: 'kg', price: 80000, amount: 3 },
    { id: 2, name: 'Fresh Milk', unit: 'liter', price: 15000, amount: 5 },
  ],
};

export const mockExpenses: Expense[] = [
  mockExpense,
  {
    id: 2,
    createdAt: '2024-01-21T09:00:00.000Z',
    wallet: mockWallets[1],
    budget: mockBudgets[1],
    total: 500000,
    expenseItems: [
      { id: 3, name: 'Social Media Ads', unit: 'campaign', price: 500000, amount: 1 },
    ],
  },
];

// ─── WalletTransfer ──────────────────────────────────────────────────────────

export const mockWalletTransfer: WalletTransfer = {
  id: 1,
  createdAt: '2024-01-20T10:00:00.000Z',
  amount: 1000000,
  fromWallet: mockWallet,
  toWallet: mockWallets[1],
};

export const mockWalletTransfers: WalletTransfer[] = [
  mockWalletTransfer,
  {
    id: 2,
    createdAt: '2024-01-21T09:00:00.000Z',
    amount: 2500000,
    fromWallet: mockWallets[1],
    toWallet: mockWallets[2],
  },
];

// ─── Calculation ─────────────────────────────────────────────────────────────

export const mockCalculation: Calculation = {
  id: 1,
  createdAt: '2024-01-20T10:00:00.000Z',
  updatedAt: '2024-01-20T10:30:00.000Z',
  completedAt: null,
  wallet: mockWallet,
  totalWallet: 5000000,
  totalCalculation: 4980000,
  calculationItems: [
    { id: 1, price: 100000, amount: 10 },
    { id: 2, price: 50000, amount: 20 },
    { id: 3, price: 20000, amount: 50 },
    { id: 4, price: 10000, amount: 198 },
  ],
};

export const mockCalculationCompleted: Calculation = {
  ...mockCalculation,
  id: 2,
  completedAt: '2024-01-20T11:00:00.000Z',
};

export const mockCalculations: Calculation[] = [
  mockCalculation,
  mockCalculationCompleted,
];

// ─── Rental ──────────────────────────────────────────────────────────────────

const mockRentalVariant: Variant = {
  id: 3,
  name: 'Coffee Equipment Set - Standard Package',
  price: 500000,
  description: 'Complete coffee setup for 2 hours',
  materials: [],
  product: mockProducts[2],
  createdAt: '2024-01-17T08:00:00.000Z',
  values: [],
};

export const mockRental: Rental = {
  id: 1,
  code: 'RNT-001',
  name: 'John Doe',
  variant: mockRentalVariant,
  createdAt: '2024-01-20T10:00:00.000Z',
  checkinAt: '2024-01-20T08:00:00.000Z',
  checkoutAt: null,
};

export const mockRentalCheckedOut: Rental = {
  ...mockRental,
  id: 2,
  code: 'RNT-002',
  name: 'Jane Smith',
  checkoutAt: '2024-01-21T17:00:00.000Z',
};

export const mockRentals: Rental[] = [mockRental, mockRentalCheckedOut];

// ─── Supplier ────────────────────────────────────────────────────────────────

export const mockSupplier: Supplier = {
  id: 1,
  name: 'PT. Kopi Nusantara',
  phone: '+6281234567890',
  address: 'Jl. Raya No. 1, Jakarta Selatan',
  mapsLink: 'https://maps.google.com/?q=-6.2,106.8',
  createdAt: '2024-01-15T08:00:00.000Z',
};

export const mockSuppliers: Supplier[] = [
  mockSupplier,
  {
    id: 2,
    name: 'CV. Susu Segar',
    phone: '+6281298765432',
    address: 'Jl. Peternakan No. 5, Bandung',
    mapsLink: 'https://maps.google.com/?q=-6.9,107.6',
    createdAt: '2024-01-16T08:00:00.000Z',
  },
];
