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
  name: 'Electronics',
  createdAt: '2024-01-15T08:00:00.000Z',
};

export const mockCategories: Category[] = [
  { id: 1, name: 'Electronics', createdAt: '2024-01-15T08:00:00.000Z' },
  { id: 2, name: 'Clothing', createdAt: '2024-01-16T08:00:00.000Z' },
  { id: 3, name: 'Food & Beverages', createdAt: '2024-01-17T08:00:00.000Z' },
];

// ─── Material ────────────────────────────────────────────────────────────────

export const mockMaterial: Material = {
  id: 1,
  name: 'Steel',
  price: 50000,
  unit: 'kg',
  description: 'High quality steel',
  weeklyUsage: 10,
  createdAt: '2024-01-15T08:00:00.000Z',
};

export const mockMaterials: Material[] = [
  {
    id: 1,
    name: 'Steel',
    price: 50000,
    unit: 'kg',
    description: 'High quality steel',
    weeklyUsage: 10,
    createdAt: '2024-01-15T08:00:00.000Z',
  },
  {
    id: 2,
    name: 'Aluminum',
    price: 35000,
    unit: 'kg',
    description: 'Lightweight aluminum',
    weeklyUsage: 5,
    createdAt: '2024-01-16T08:00:00.000Z',
  },
  {
    id: 3,
    name: 'Cotton',
    price: 20000,
    unit: 'meter',
    description: 'Premium cotton fabric',
    weeklyUsage: 15,
    createdAt: '2024-01-17T08:00:00.000Z',
  },
];

// ─── Product ─────────────────────────────────────────────────────────────────

export const mockProduct: Product = {
  id: 1,
  name: 'iPhone 14',
  description: 'Latest Apple iPhone with advanced features',
  category: mockCategory,
  imageUrl: 'https://placehold.jp/120x120.png',
  createdAt: '2024-01-15T08:00:00.000Z',
  options: [
    {
      id: 1,
      name: 'Color',
      values: [
        { id: 1, name: 'Blue' },
        { id: 2, name: 'Black' },
        { id: 3, name: 'White' },
      ],
    },
    {
      id: 2,
      name: 'Storage',
      values: [
        { id: 4, name: '128GB' },
        { id: 5, name: '256GB' },
      ],
    },
  ],
  saleType: 'purchase',
};

export const mockProducts: Product[] = [
  mockProduct,
  {
    id: 2,
    name: 'Samsung Galaxy S23',
    description: 'Flagship Samsung smartphone',
    category: mockCategory,
    imageUrl: 'https://placehold.jp/120x120.png',
    createdAt: '2024-01-16T08:00:00.000Z',
    options: [],
    saleType: 'purchase',
  },
  {
    id: 3,
    name: 'Drone DJI Mini 3',
    description: 'Compact aerial drone',
    category: mockCategory,
    imageUrl: 'https://placehold.jp/120x120.png',
    createdAt: '2024-01-17T08:00:00.000Z',
    options: [],
    saleType: 'rental',
  },
];

// ─── OptionValue ─────────────────────────────────────────────────────────────

export const mockOptionValue: OptionValue = { id: 1, name: 'Blue' };

export const mockOptionValues: OptionValue[] = [
  { id: 1, name: 'Blue' },
  { id: 4, name: '128GB' },
];

// ─── Variant ─────────────────────────────────────────────────────────────────

export const mockVariant: Variant = {
  id: 1,
  name: 'iPhone 14 - Blue 128GB',
  price: 15000000,
  description: 'Blue 128GB variant',
  materials: [
    {
      id: 1,
      materialId: 1,
      amount: 2,
      material: mockMaterial,
    },
  ],
  product: mockProduct,
  createdAt: '2024-01-15T08:00:00.000Z',
  values: [
    { id: 1, variantId: 1, optionValueId: 1, optionValue: { id: 1, name: 'Blue' } },
    { id: 2, variantId: 1, optionValueId: 4, optionValue: { id: 4, name: '128GB' } },
  ],
};

export const mockVariants: Variant[] = [
  mockVariant,
  {
    id: 2,
    name: 'iPhone 14 - Black 256GB',
    price: 17000000,
    description: 'Black 256GB variant',
    materials: [],
    product: mockProduct,
    createdAt: '2024-01-16T08:00:00.000Z',
    values: [
      { id: 3, variantId: 2, optionValueId: 2, optionValue: { id: 2, name: 'Black' } },
      { id: 4, variantId: 2, optionValueId: 5, optionValue: { id: 5, name: '256GB' } },
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
  name: 'Operations',
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
    name: 'Logistics',
    percentage: 15,
    balance: 750000,
    createdAt: '2024-01-17T08:00:00.000Z',
  },
];

// ─── Coupon ──────────────────────────────────────────────────────────────────

export const mockCoupon: Coupon = {
  id: 1,
  code: 'DISCOUNT10',
  type: 'percentage',
  amount: 10,
  createdAt: '2024-01-15T08:00:00.000Z',
};

export const mockCoupons: Coupon[] = [
  mockCoupon,
  {
    id: 2,
    code: 'FLAT50K',
    type: 'fixed',
    amount: 50000,
    createdAt: '2024-01-16T08:00:00.000Z',
  },
  {
    id: 3,
    code: 'VIP20',
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
  price: 15000000,
  discountAmount: 0,
  subtotal: 30000000,
  note: '',
};

export const mockTransaction: Transaction = {
  id: 1,
  createdAt: '2024-01-20T10:00:00.000Z',
  name: 'Order #001',
  orderNumber: 1,
  total: 30000000,
  totalIncome: 28000000,
  transactionItems: [mockTransactionItem],
  transactionCoupons: [],
  wallet: mockWallet,
  paidAt: '2024-01-20T10:30:00.000Z',
  paidAmount: 30000000,
};

export const mockTransactions: Transaction[] = [
  mockTransaction,
  {
    id: 2,
    createdAt: '2024-01-21T09:00:00.000Z',
    name: 'Order #002',
    orderNumber: 2,
    total: 17000000,
    totalIncome: 16000000,
    transactionItems: [
      {
        id: 2,
        variant: mockVariants[1],
        amount: 1,
        price: 17000000,
        discountAmount: 0,
        subtotal: 17000000,
        note: 'Gift wrap please',
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
  total: 250000,
  expenseItems: [
    { id: 1, name: 'Office Supplies', unit: 'pcs', price: 50000, amount: 5 },
    { id: 2, name: 'Printer Paper', unit: 'ream', price: 50000, amount: 1 },
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

export const mockRental: Rental = {
  id: 1,
  code: 'RNT-001',
  name: 'John Doe',
  variant: mockVariant,
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
  name: 'PT. Supplier Utama',
  phone: '+6281234567890',
  address: 'Jl. Raya No. 1, Jakarta Selatan',
  mapsLink: 'https://maps.google.com/?q=-6.2,106.8',
  createdAt: '2024-01-15T08:00:00.000Z',
};

export const mockSuppliers: Supplier[] = [
  mockSupplier,
  {
    id: 2,
    name: 'CV. Bahan Prima',
    phone: '+6281298765432',
    address: 'Jl. Industri No. 5, Bandung',
    mapsLink: 'https://maps.google.com/?q=-6.9,107.6',
    createdAt: '2024-01-16T08:00:00.000Z',
  },
];
