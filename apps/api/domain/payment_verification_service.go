package domain

import "context"

type PaymentVerificationService struct {
	paymentRepository PaymentRepository
}

func NewPaymentVerificationService(paymentRepository PaymentRepository) PaymentVerificationService {
	return PaymentVerificationService{
		paymentRepository: paymentRepository,
	}
}

// resolveAwaitingCodPayment is Approve's and Reject's shared guard: it locks the payment row with
// the same lock PayTransaction takes (GetPaymentByTransactionIdForUpdate), so a barista's decision,
// a guest cancel and the sweeper serialise on it instead of racing to a terminal state (Cancel D6),
// and names the state a 400 refuses in.
func (service PaymentVerificationService) ResolveAwaitingCodPayment(ctxWithTx context.Context, transactionId int64) (Payment, *Error) {
	payment, err := service.paymentRepository.GetPaymentByTransactionIdForUpdate(ctxWithTx, transactionId)
	if err != nil {
		if err.Type == NotFound {
			return Payment{}, &Error{Type: NotFound, Message: "order not found"}
		}
		return Payment{}, err
	}

	if payment.Method != PaymentMethodCod {
		return Payment{}, &Error{Type: BadRequest, Message: "order is not a cod order"}
	}

	if payment.Status != PaymentStatePending {
		switch payment.Status {
		case PaymentStatePaid:
			return Payment{}, &Error{Type: BadRequest, Message: "order already paid"}
		case PaymentStateCancelled:
			return Payment{}, &Error{Type: BadRequest, Message: "order was cancelled"}
		default:
			return Payment{}, &Error{Type: BadRequest, Message: "order is no longer awaiting verification"}
		}
	}

	// D19: past expired_at but not yet reached by the sweeper is still approvable — the lock above
	// makes it a clean race, and the barista's decision beats a sweeper that is late by a tick.
	if payment.VerificationStatus == nil || *payment.VerificationStatus != PaymentVerificationStatusAwaiting {
		return Payment{}, &Error{Type: BadRequest, Message: "order already verified"}
	}

	return payment, nil
}
