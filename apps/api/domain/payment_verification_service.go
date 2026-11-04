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

	if payment.VerificationStatus == nil || *payment.VerificationStatus != PaymentVerificationStatusAwaiting {
		return Payment{}, &Error{Type: BadRequest, Message: "order already verified"}
	}

	return payment, nil
}
