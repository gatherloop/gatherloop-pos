import { PaymentMethod } from '../../../../domain/entities/Payment';
import { ConfirmationAlert } from '../base/ConfirmationAlert/ConfirmationAlert';

export type PaymentCancelAlertProps = {
  isOpen: boolean;
  method: PaymentMethod;
  isCancelling: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
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
    description="Jika dibatalkan, Pesanan akan kembali ke keranjang. Anda bisa memilih metode pembayaran lain."
    confirmText="Ya"
    cancelText="Tidak"
    isOpen={isOpen}
    isConfirming={isCancelling}
    onConfirm={onConfirm}
    onCancel={onDismiss}
    onOpenChange={(nextIsOpen) => {
      if (!nextIsOpen) onDismiss();
    }}
  />
);
