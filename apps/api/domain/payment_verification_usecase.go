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
	availabilityService           AvailabilityService
	kdsNotificationDispatcher     KdsNotificationDispatcher
}

func NewPaymentVerificationUsecase(
	paymentRepository PaymentRepository,
	paymentVerificationRepository PaymentVerificationRepository,
	transactionRepository TransactionRepository,
	cartRepository CartRepository,
	kdsNotificationRepository KdsNotificationRepository,
	paymentVerificationService PaymentVerificationService,
	availabilityService AvailabilityService,
	kdsNotificationDispatcher KdsNotificationDispatcher,
) PaymentVerificationUsecase {
	return PaymentVerificationUsecase{
		paymentRepository:             paymentRepository,
		paymentVerificationRepository: paymentVerificationRepository,
		transactionRepository:         transactionRepository,
		cartRepository:                cartRepository,
		kdsNotificationRepository:     kdsNotificationRepository,
		paymentVerificationService:    paymentVerificationService,
		availabilityService:           availabilityService,
		kdsNotificationDispatcher:     kdsNotificationDispatcher,
	}
}

// GetVerification is D14: a staff-only read of the presence photo. 404 when the transaction has
// no linked payment, the payment is not COD, or the photo is already gone — decided (approved or
// rejected) or never existed — never distinguishing which, so the barista's next move is always
// the same: refetch the list.
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

// Approve is FR-4: the bar may start making it. It converts the cart so the guest can start a new
// order (D16), enqueues the existing order_paid kind — COD's "start making" signal (D6) — and
// deletes the photo in the same transaction as the decision (D5).
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

	// D6: kicked after the commit so the barista's HTTP response never waits on Expo.
	if err == nil {
		usecase.kdsNotificationDispatcher.TriggerDispatch()
	}

	return err
}

// Reject is FR-4: the barista could not confirm the guest is in the café.
// finalizeUncollectedPayment already moves the payment to cancelled/rejected, releases
// availability, soft-deletes the transaction (D7) and deletes the photo (FR-6/D5) — every exit
// from "cod, pending, awaiting" shares that one function.
func (usecase PaymentVerificationUsecase) Reject(ctx context.Context, transactionId int64) *Error {
	return usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		payment, resolveErr := usecase.paymentVerificationService.ResolveAwaitingCodPayment(ctxWithTx, transactionId)
		if resolveErr != nil {
			return resolveErr
		}

		now := time.Now()
		payment.VerifiedAt = &now

		reason := PaymentCancelReasonRejected
		_, finalizeErr := finalizeUncollectedPayment(ctxWithTx, payment, PaymentStateCancelled, &reason, usecase.paymentRepository, usecase.transactionRepository, usecase.availabilityService, usecase.kdsNotificationRepository, usecase.paymentVerificationRepository)
		return finalizeErr
	})
}
