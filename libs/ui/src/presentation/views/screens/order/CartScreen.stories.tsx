import type { Meta, StoryObj } from '@storybook/react';
import { CartScreen } from './CartScreen';

const minuman = {
  id: 1,
  name: 'Minuman',
  station: 'BAR' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const esKopiSusu = {
  id: 1,
  name: 'Es Kopi Susu',
  description: 'Kopi susu gula aren dengan es',
  category: minuman,
  imageUrl: '',
  saleType: 'purchase' as const,
  status: 'published' as const,
  options: [],
  createdAt: '2024-03-20T00:00:00.000Z',
  isAvailable: true,
  availabilityTracking: 'none' as const,
  isSellable: true,
};

const variant = {
  id: 1,
  name: 'Es Kopi Susu - Regular',
  price: 18000,
  materials: [],
  product: esKopiSusu,
  createdAt: '2024-03-20T00:00:00.000Z',
  values: [
    {
      id: 1,
      variantId: 1,
      optionValueId: 1,
      optionValue: { id: 1, name: 'Regular' },
    },
  ],
  pricingTiers: [],
  isAvailable: true,
  isSellable: true,
};

const cart = {
  id: 1,
  sessionId: 'session-1',
  tableId: 1,
  table: { id: 1, label: 'Meja 1', floorNumber: 1 },
  status: 'active' as const,
  items: [
    {
      id: 1,
      cartId: 1,
      variantId: 1,
      variant,
      amount: 2,
      note: 'less sugar',
      price: 18000,
      subtotal: 36000,
      createdAt: '2024-03-20T00:00:00.000Z',
    },
  ],
  itemCount: 2,
  total: 36000,
  createdAt: '2024-03-20T00:00:00.000Z',
  pendingPayment: null,
};

const table = { id: 1, label: 'Meja 1', floorNumber: 1 };

const longCart = {
  ...cart,
  items: Array.from({ length: 15 }, (_, index) => ({
    ...cart.items[0],
    id: index + 1,
  })),
  itemCount: 30,
  total: 540000,
};

const meta: Meta<typeof CartScreen> = {
  title: 'Screens/Order/CartScreen',
  component: CartScreen,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    tableVariant: { type: 'resolved', table },
    isMutating: false,
    errorMessage: null,
    isClearConfirmationOpen: false,
    itemEdit: null,
    isCheckoutEnabled: true,
    checkoutErrorMessage: null,
    detailsSheet: null,
    lockedNotice: null,
    cancelConfirmation: {
      isOpen: false,
      method: 'qris',
      isCancelling: false,
      onConfirm: () => {
        // Storybook action stand-in
      },
      onDismiss: () => {
        // Storybook action stand-in
      },
    },
    onAmountChange: () => {
      // Storybook action stand-in
    },
    onRemovePress: () => {
      // Storybook action stand-in
    },
    onEditPress: () => {
      // Storybook action stand-in
    },
    onClearPress: () => {
      // Storybook action stand-in
    },
    onClearConfirm: () => {
      // Storybook action stand-in
    },
    onClearCancel: () => {
      // Storybook action stand-in
    },
    onClearConfirmationOpenChange: () => {
      // Storybook action stand-in
    },
    onAddMoreItemsPress: () => {
      // Storybook action stand-in
    },
    onCheckoutPress: () => {
      // Storybook action stand-in
    },
    onCheckoutRetryPress: () => {
      // Storybook action stand-in
    },
    onRetryButtonPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof CartScreen>;

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Loaded: Story = {
  args: { variant: { type: 'loaded', cart } },
};

export const LongCart: Story = {
  args: { variant: { type: 'loaded', cart: longCart } },
};

export const Mutating: Story = {
  args: { variant: { type: 'loaded', cart }, isMutating: true },
};

export const ClearConfirmationOpen: Story = {
  args: {
    variant: { type: 'loaded', cart },
    isClearConfirmationOpen: true,
  },
};

export const MutationError: Story = {
  args: {
    variant: { type: 'loaded', cart },
    errorMessage: 'Gagal memperbarui keranjang',
  },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const CheckoutDisabled: Story = {
  args: {
    variant: { type: 'loaded', cart },
    isCheckoutEnabled: false,
  },
};

export const SoldOutLine: Story = {
  args: {
    variant: {
      type: 'loaded',
      cart: {
        ...cart,
        items: [
          { ...cart.items[0], variant: { ...variant, isSellable: false } },
        ],
      },
    },
    isCheckoutEnabled: false,
  },
};

export const OverRemainingQuantityLine: Story = {
  args: {
    variant: {
      type: 'loaded',
      cart: {
        ...cart,
        items: [
          {
            ...cart.items[0],
            amount: 5,
            variant: { ...variant, sellableQuantity: 3 },
          },
        ],
      },
    },
    isCheckoutEnabled: false,
  },
};

export const DetailsSheetOpen: Story = {
  args: {
    variant: { type: 'loaded', cart },
    detailsSheet: {
      isOpen: true,
      name: 'Budi',
      nameErrorMessage: null,
      onNameChange: () => {
        // Storybook action stand-in
      },
      whatsappNumber: '0812 3456 7890',
      whatsappNumberErrorMessage: null,
      onWhatsappNumberChange: () => {
        // Storybook action stand-in
      },
      onSubmitPress: () => {
        // Storybook action stand-in
      },
      onCancelPress: () => {
        // Storybook action stand-in
      },
      isCashPaymentEnabled: true,
      method: 'qris',
      onMethodChange: () => {
        // Storybook action stand-in
      },
      cashierLocation: 'Lantai 1',
    },
  },
};

export const DetailsSheetSubmitting: Story = {
  args: {
    variant: { type: 'loaded', cart },
    detailsSheet: {
      isOpen: true,
      name: 'Budi',
      nameErrorMessage: null,
      onNameChange: () => {
        // Storybook action stand-in
      },
      whatsappNumber: '0812 3456 7890',
      whatsappNumberErrorMessage: null,
      onWhatsappNumberChange: () => {
        // Storybook action stand-in
      },
      onSubmitPress: () => {
        // Storybook action stand-in
      },
      onCancelPress: () => {
        // Storybook action stand-in
      },
      isCashPaymentEnabled: true,
      method: 'qris',
      onMethodChange: () => {
        // Storybook action stand-in
      },
      diningOption: 'dine_in',
      onDiningOptionChange: () => {
        // Storybook action stand-in
      },
      cashierLocation: 'Lantai 1',
      isSubmitting: true,
    },
  },
};

export const CheckoutError: Story = {
  args: {
    variant: { type: 'loaded', cart },
    checkoutErrorMessage: 'Failed to create payment',
  },
};

export const WithHistoryButton: Story = {
  args: {
    variant: { type: 'loaded', cart },
    onHistoryPress: () => {
      // Storybook action stand-in
    },
  },
};

export const WithPreparingBadge: Story = {
  args: {
    variant: { type: 'loaded', cart },
    onHistoryPress: () => {
      // Storybook action stand-in
    },
    preparingCount: 2,
  },
};

export const LockedByPendingPayment: Story = {
  args: {
    variant: { type: 'loaded', cart },
    lockedNotice: {
      onContinuePress: () => {
        // Storybook action stand-in
      },
      cancelAction: {
        label: 'Batalkan pembayaran',
        onPress: () => {
          // Storybook action stand-in
        },
      },
    },
  },
};

export const ConfirmingCancel: Story = {
  args: {
    ...LockedByPendingPayment.args,
    cancelConfirmation: {
      isOpen: true,
      method: 'qris',
      isCancelling: false,
      onConfirm: () => {
        // Storybook action stand-in
      },
      onDismiss: () => {
        // Storybook action stand-in
      },
    },
  },
};
