import { PaymentMethod } from '../../../../domain/entities/Payment';
import { ConfirmationAlert } from '../base/ConfirmationAlert/ConfirmationAlert';

export type PaymentCancelAlertProps = {
  isOpen: boolean;
  method: PaymentMethod;
  isCancelling: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

const DESCRIPTION_BY_METHOD: Record<PaymentMethod, string> = {
  qris: 'Jika Anda sudah membayar, jangan batalkan — tunggu beberapa saat hingga pembayaran terkonfirmasi. Jika dibatalkan, QR ini tidak berlaku lagi dan pesanan kembali ke keranjang. Anda bisa memilih metode pembayaran lain.',
  cash: 'Pesanan Anda akan dibatalkan dan kasir tidak lagi menunggu pembayaran Anda. Isi keranjang tetap tersimpan, dan Anda bisa memilih metode pembayaran lain.',
};

export const PaymentCancelAlert = ({
  isOpen,
  method,
  isCancelling,
  onConfirm,
  onDismiss,
}: PaymentCancelAlertProps) => (
  <ConfirmationAlert
    title="Batalkan pembayaran?"
    description={DESCRIPTION_BY_METHOD[method]}
    confirmText="Ya, batalkan"
    cancelText="Lanjutkan pembayaran"
    isOpen={isOpen}
    isConfirming={isCancelling}
    onConfirm={onConfirm}
    onCancel={onDismiss}
    onOpenChange={(nextIsOpen) => {
      if (!nextIsOpen) onDismiss();
    }}
  />
);
