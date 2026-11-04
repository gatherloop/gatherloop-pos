package domain

import (
	"context"
	"time"
)

type PaymentVerificationUsecase struct {
	paymentRepository             PaymentRepository
	paymentVerificationRepository PaymentVerificationRepository
	transactionRepository         TransactionRepository
	cartRepository                CartRepository
	kdsNotificationRepository     KdsNotificationRepository
	paymentVerificationService    PaymentVerificationService
	paymentService                PaymentService
	kdsNotificationDispatcher     KdsNotificationDispatcher
}

func NewPaymentVerificationUsecase(
	paymentRepository PaymentRepository,
	paymentVerificationRepository PaymentVerificationRepository,
	transactionRepository TransactionRepository,
	cartRepository CartRepository,
	kdsNotificationRepository KdsNotificationRepository,
	paymentVerificationService PaymentVerificationService,
	paymentService PaymentService,
	kdsNotificationDispatcher KdsNotificationDispatcher,
) PaymentVerificationUsecase {
	return PaymentVerificationUsecase{
		paymentRepository:             paymentRepository,
		paymentVerificationRepository: paymentVerificationRepository,
		transactionRepository:         transactionRepository,
		cartRepository:                cartRepository,
		kdsNotificationRepository:     kdsNotificationRepository,
		paymentVerificationService:    paymentVerificationService,
		paymentService:                paymentService,
		kdsNotificationDispatcher:     kdsNotificationDispatcher,
	}
}

func (usecase PaymentVerificationUsecase) GetVerification(ctx context.Context, transactionId int64) (PaymentVerificationPhoto, *Error) {
	payment, err := usecase.paymentRepository.GetPaymentByTransactionId(ctx, transactionId)
	if err != nil {
		if err.Type == NotFound {
			return PaymentVerificationPhoto{}, &Error{Type: NotFound, Message: "verification photo not found"}
		}
		return PaymentVerificationPhoto{}, err
	}
	if payment.Method != PaymentMethodCod {
		return PaymentVerificationPhoto{}, &Error{Type: NotFound, Message: "verification photo not found"}
	}

	photo, photoErr := usecase.paymentVerificationRepository.GetByPaymentId(ctx, payment.Id)
	if photoErr != nil {
		if photoErr.Type == NotFound {
			return PaymentVerificationPhoto{}, &Error{Type: NotFound, Message: "verification photo not found"}
		}
		return PaymentVerificationPhoto{}, photoErr
	}

	return photo, nil
}

func (usecase PaymentVerificationUsecase) Approve(ctx context.Context, transactionId int64) *Error {
	err := usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
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

		if _, updateErr := usecase.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id); updateErr != nil {
			return updateErr
		}

		if deleteErr := usecase.paymentVerificationRepository.DeleteByPaymentId(ctxWithTx, payment.Id); deleteErr != nil {
			return deleteErr
		}

		transaction, txErr := usecase.transactionRepository.GetTransactionById(ctxWithTx, *payment.TransactionId)
		if txErr != nil {
			return txErr
		}

		cart, cartErr := usecase.cartRepository.GetCartById(ctxWithTx, payment.CartId)
		if cartErr != nil {
			return cartErr
		}
		cart.Status = CartStatusConverted
		if _, updateCartErr := usecase.cartRepository.UpdateCartById(ctxWithTx, cart, cart.Id); updateCartErr != nil {
			return updateCartErr
		}

		return usecase.kdsNotificationRepository.EnqueueForTransaction(ctxWithTx, transaction, KdsNotificationKindOrderPaid)
	})

	if err == nil {
		usecase.kdsNotificationDispatcher.TriggerDispatch()
	}

	return err
}

func (usecase PaymentVerificationUsecase) Reject(ctx context.Context, transactionId int64) *Error {
	return usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
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
