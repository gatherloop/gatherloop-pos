package domain

import (
	"context"
	"time"
)

type PaymentVerificationUsecase struct {
	paymentRepoPort             PaymentRepoPort
	paymentVerificationRepoPort PaymentVerificationRepoPort
	transactionRepoPort         TransactionRepoPort
	cartRepoPort                CartRepoPort
	kdsNotificationRepoPort     KdsNotificationRepoPort
	paymentVerificationService  PaymentVerificationService
	paymentService              PaymentService
	kdsNotificationService      KdsNotificationService
}

func NewPaymentVerificationUsecase(
	paymentRepoPort PaymentRepoPort,
	paymentVerificationRepoPort PaymentVerificationRepoPort,
	transactionRepoPort TransactionRepoPort,
	cartRepoPort CartRepoPort,
	kdsNotificationRepoPort KdsNotificationRepoPort,
	paymentVerificationService PaymentVerificationService,
	paymentService PaymentService,
	kdsNotificationService KdsNotificationService,
) PaymentVerificationUsecase {
	return PaymentVerificationUsecase{
		paymentRepoPort:             paymentRepoPort,
		paymentVerificationRepoPort: paymentVerificationRepoPort,
		transactionRepoPort:         transactionRepoPort,
		cartRepoPort:                cartRepoPort,
		kdsNotificationRepoPort:     kdsNotificationRepoPort,
		paymentVerificationService:  paymentVerificationService,
		paymentService:              paymentService,
		kdsNotificationService:      kdsNotificationService,
	}
}

func (usecase PaymentVerificationUsecase) GetVerification(ctx context.Context, transactionId int64) (PaymentVerificationPhoto, *Error) {
	payment, err := usecase.paymentRepoPort.GetPaymentByTransactionId(ctx, transactionId)
	if err != nil {
		if err.Type == NotFound {
			return PaymentVerificationPhoto{}, &Error{Type: NotFound, Message: "verification photo not found"}
		}
		return PaymentVerificationPhoto{}, err
	}
	if payment.Method != PaymentMethodCod {
		return PaymentVerificationPhoto{}, &Error{Type: NotFound, Message: "verification photo not found"}
	}

	photo, photoErr := usecase.paymentVerificationRepoPort.GetByPaymentId(ctx, payment.Id)
	if photoErr != nil {
		if photoErr.Type == NotFound {
			return PaymentVerificationPhoto{}, &Error{Type: NotFound, Message: "verification photo not found"}
		}
		return PaymentVerificationPhoto{}, photoErr
	}

	return photo, nil
}

func (usecase PaymentVerificationUsecase) Approve(ctx context.Context, transactionId int64) *Error {
	err := usecase.paymentRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		payment, resolveErr := usecase.paymentVerificationService.ResolveAwaitingCodPayment(ctxWithTx, transactionId)
		if resolveErr != nil {
			return resolveErr
		}

		if payment.TransactionId == nil {
			return &Error{Type: InternalServerError, Message: "payment has no transaction"}
		}

		now := time.Now()
		approved := PaymentVerificationStatusApproved
		payment.VerificationStatus = &approved
		payment.VerifiedAt = &now

		if _, updateErr := usecase.paymentRepoPort.UpdatePaymentById(ctxWithTx, payment, payment.Id); updateErr != nil {
			return updateErr
		}

		if deleteErr := usecase.paymentVerificationRepoPort.DeleteByPaymentId(ctxWithTx, payment.Id); deleteErr != nil {
			return deleteErr
		}

		transaction, txErr := usecase.transactionRepoPort.GetTransactionById(ctxWithTx, *payment.TransactionId)
		if txErr != nil {
			return txErr
		}

		cart, cartErr := usecase.cartRepoPort.GetCartById(ctxWithTx, payment.CartId)
		if cartErr != nil {
			return cartErr
		}
		cart.Status = CartStatusConverted
		if _, updateCartErr := usecase.cartRepoPort.UpdateCartById(ctxWithTx, cart, cart.Id); updateCartErr != nil {
			return updateCartErr
		}

		return usecase.kdsNotificationRepoPort.EnqueueForTransaction(ctxWithTx, transaction, KdsNotificationKindOrderPaid)
	})

	if err == nil {
		usecase.kdsNotificationService.TriggerDispatch()
	}

	return err
}

func (usecase PaymentVerificationUsecase) Reject(ctx context.Context, transactionId int64) *Error {
	return usecase.paymentRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		payment, resolveErr := usecase.paymentVerificationService.ResolveAwaitingCodPayment(ctxWithTx, transactionId)
		if resolveErr != nil {
			return resolveErr
		}

		now := time.Now()
		payment.VerifiedAt = &now

		reason := PaymentCancelReasonRejected
		_, finalizeErr := usecase.paymentService.FinalizeUncollectedPayment(ctxWithTx, payment, PaymentStateCancelled, &reason)
		return finalizeErr
	})
}
