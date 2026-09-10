import { ReactNode } from 'react';
import { match } from 'ts-pattern';
import { Button, Paragraph, Text, YStack } from 'tamagui';
// Deep imports, not the `domain`/`components/base` barrels (D20): those
// barrels also re-export POS-only components and every POS usecase — dead
// weight the customer bundle does not ship (D6).
import { Cart } from '../../../../domain/entities/Cart';
import { Payment } from '../../../../domain/entities/Payment';
import { EmptyView } from '../../components/base/EmptyView';
import { ErrorView } from '../../components/base/ErrorView';
import { LoadingView } from '../../components/base/LoadingView';
import { CheckoutSummaryView } from '../../components/checkout/CheckoutSummaryView';
import { CustomerNameSheet } from '../../components/checkout/CustomerNameSheet';
import { PaymentSuccessView } from '../../components/checkout/PaymentSuccessView';
import { QrisPaymentView } from '../../components/checkout/QrisPaymentView';
import {
  TableResolveScreen,
  TableResolveScreenProps,
} from './TableResolveScreen';

export type CheckoutScreenVariant =
  | { type: 'disabled' }
  // The cart the summary recaps is fetched independently of
  // `CheckoutUsecase` (which only ever knows about a `Payment`, per FR-8) —
  // these three mirror `CartScreen`'s own loading/error/empty and gate the
  // `summary`/`askingName`/`creatingPayment` variants below, which all
  // assume a loaded, non-empty cart.
  | { type: 'loadingCart' }
  | { type: 'cartError'; onRetryPress: () => void }
  | { type: 'emptyCart' }
  | { type: 'summary'; cart: Cart; onPayPress: () => void }
  | {
      type: 'askingName';
      cart: Cart;
      name: string;
      nameErrorMessage: string | null;
      onNameChange: (name: string) => void;
      onSubmitPress: () => void;
      onCancelPress: () => void;
    }
  | { type: 'creatingPayment'; cart: Cart }
  | { type: 'awaitingPayment'; payment: Payment; onCountdownElapsed: () => void }
  | { type: 'paid'; payment: Payment }
  | { type: 'expired'; onRetryPress: () => void }
  | { type: 'error'; onRetryPress: () => void };

export type CheckoutScreenProps = {
  // D9 in docs/trd-order-app-composition-and-ssr.md: this screen renders its
  // own table shell now (formerly `TableResolve`, a wrapper root) — the same
  // shape `CartScreen`/`MenuListScreen` render it in. No footer (unlike
  // `MenuListScreen`): the floating cart bar has no place on this screen,
  // the same way `CartScreen` renders none.
  tableVariant: TableResolveScreenProps['variant'];
  variant: CheckoutScreenVariant;
  onBackToCartPress: () => void;
};

// FR-9 in docs/prd-order-checkout-qris-doku.md: `/t/{code}/checkout`.
// `variant` mirrors `CheckoutUsecase`'s own state one-for-one (plus
// `disabled`, the flag's kill switch, D20), so `CheckoutHandler`'s mapping
// is an exhaustive `match` rather than a second source of truth for what
// states exist.
export const CheckoutScreen = ({
  tableVariant,
  variant,
  onBackToCartPress,
}: CheckoutScreenProps) => (
  <TableResolveScreen variant={tableVariant}>
    {match(variant)
      .returnType<ReactNode>()
      .with({ type: 'disabled' }, () => (
        <EmptyView
          title="Checkout belum tersedia"
          subtitle="Fitur ini belum diaktifkan untuk meja Anda."
          actionLabel="Kembali ke keranjang"
          onActionPress={onBackToCartPress}
        />
      ))
      .with({ type: 'loadingCart' }, () => (
        <LoadingView title="Memuat pesanan..." />
      ))
      .with({ type: 'cartError' }, ({ onRetryPress }) => (
        <ErrorView
          title="Gagal memuat pesanan"
          subtitle="Terjadi kesalahan. Silakan coba lagi."
          onRetryButtonPress={onRetryPress}
        />
      ))
      .with({ type: 'emptyCart' }, () => (
        <EmptyView
          title="Keranjang kosong"
          subtitle="Tambahkan menu ke keranjang sebelum checkout."
          actionLabel="Kembali ke keranjang"
          onActionPress={onBackToCartPress}
        />
      ))
      .with({ type: 'summary' }, ({ cart, onPayPress }) => (
        <CheckoutSummaryView
          cart={cart}
          isPaying={false}
          onPayPress={onPayPress}
        />
      ))
      .with(
        { type: 'askingName' },
        ({
          cart,
          name,
          nameErrorMessage,
          onNameChange,
          onSubmitPress,
          onCancelPress,
        }) => (
          <>
            <CheckoutSummaryView
              cart={cart}
              isPaying={false}
              onPayPress={() => {
                // No-op: the name sheet is already open.
              }}
            />
            <CustomerNameSheet
              isOpen
              name={name}
              errorMessage={nameErrorMessage}
              onNameChange={onNameChange}
              onSubmitPress={onSubmitPress}
              onCancelPress={onCancelPress}
            />
          </>
        )
      )
      .with({ type: 'creatingPayment' }, ({ cart }) => (
        <CheckoutSummaryView
          cart={cart}
          isPaying
          onPayPress={() => {
            // No-op: the pay button is disabled while `isPaying`.
          }}
        />
      ))
      .with({ type: 'awaitingPayment' }, ({ payment, onCountdownElapsed }) => (
        <QrisPaymentView
          qrContent={payment.qrContent}
          amount={payment.amount}
          expiredAt={payment.expiredAt}
          reference={payment.reference}
          onCountdownElapsed={onCountdownElapsed}
        />
      ))
      .with({ type: 'paid' }, ({ payment }) => (
        <PaymentSuccessView
          amount={payment.amount}
          customerName={payment.customerName}
        />
      ))
      .with({ type: 'expired' }, ({ onRetryPress }) => (
        // FR-9: unlike every other empty/error state, this one needs two
        // actions — retry (skips the name prompt, D17) and a way back to
        // the cart — so it renders inline instead of through `EmptyView`,
        // which only ever has one.
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
          <Text fontWeight="bold" fontSize="$6" textAlign="center">
            Waktu pembayaran habis
          </Text>
          <Paragraph textAlign="center">
            Keranjang Anda masih tersimpan.
          </Paragraph>
          <Button theme="blue" size="$5" minHeight={44} onPress={onRetryPress}>
            Coba bayar lagi
          </Button>
          <Button chromeless onPress={onBackToCartPress}>
            Kembali ke keranjang
          </Button>
        </YStack>
      ))
      .with({ type: 'error' }, ({ onRetryPress }) => (
        <ErrorView
          title="Gagal membuat pembayaran"
          subtitle="Terjadi kesalahan. Silakan coba lagi."
          onRetryButtonPress={onRetryPress}
        />
      ))
      .exhaustive()}
  </TableResolveScreen>
);
