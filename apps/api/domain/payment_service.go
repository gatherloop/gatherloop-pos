package domain

import (
	"context"
	"crypto/subtle"
	"log/slog"
	"time"
)

const statusRequeryFloor = 1 * time.Second

// FR-4: a bounded batch per sweep so one tick of the sweeper cannot run unbounded, matching
// kdsDispatchBatchSize.
const paymentExpiryBatchSize = 50

// FR-6/D5: the DeleteOrphaned backstop's own bound, so one sweeper tick cannot run unbounded
// either — it should always delete zero rows, so the bound only matters when the invariant has
// already broken.
const paymentVerificationOrphanBatchSize = 50

type PaymentService struct {
	transactionRepository         TransactionRepository
	paymentRepository             PaymentRepository
	paymentVerificationRepository PaymentVerificationRepository
	paymentGatewayRepository      PaymentGatewayRepository
	cartRepository                CartRepository
	walletRepository              WalletRepository
	kdsNotificationRepository     KdsNotificationRepository
	availabilityReservation       AvailabilityReservation
	orderPaymentWalletId          int64
	orderPaymentCancelEnabled     bool
	kdsNotificationDispatcher     KdsNotificationDispatcher
}

func NewPaymentService(
	transactionRepository TransactionRepository,
	paymentRepository PaymentRepository,
	paymentVerificationRepository PaymentVerificationRepository,
	paymentGatewayRepository PaymentGatewayRepository,
	cartRepository CartRepository,
	walletRepository WalletRepository,
	kdsNotificationRepository KdsNotificationRepository,
	availabilityReservation AvailabilityReservation,
	orderPaymentWalletId int64,
	orderPaymentCancelEnabled bool,
	kdsNotificationDispatcher KdsNotificationDispatcher,
) PaymentService {
	return PaymentService{
		transactionRepository:         transactionRepository,
		paymentRepository:             paymentRepository,
		paymentVerificationRepository: paymentVerificationRepository,
		paymentGatewayRepository:      paymentGatewayRepository,
		cartRepository:                cartRepository,
		walletRepository:              walletRepository,
		kdsNotificationRepository:     kdsNotificationRepository,
		availabilityReservation:       availabilityReservation,
		orderPaymentWalletId:          orderPaymentWalletId,
		orderPaymentCancelEnabled:     orderPaymentCancelEnabled,
		kdsNotificationDispatcher:     kdsNotificationDispatcher,
	}
}

func (service PaymentService) applyQrisStatus(ctxWithTx context.Context, payment Payment, status QrisStatus) (Payment, ConfirmPaymentOutcome, *Error) {
	if payment.Status == PaymentStatePaid {
		return payment, ConfirmPaymentOutcomeAlreadyPaid, nil
	}

	// D7: a payment the guest cancelled, or that already expired, can still be paid late from a
	// saved QR. Both take the same un-delete + force-reserve route as a plain expired payment.
	payable := payment.Status == PaymentStatePending || payment.Status == PaymentStateExpired || payment.Status == PaymentStateCancelled
	if status.Status == PaymentGatewayStatusPaid && payable {
		if status.PaidAmount != payment.Amount {
			return payment, ConfirmPaymentOutcomeAmountMismatch, nil
		}

		if payment.TransactionId == nil {
			return payment, "", &Error{Type: InternalServerError, Message: "payment has no transaction to pay"}
		}

		outcome := ConfirmPaymentOutcomePaid
		if payment.Status == PaymentStateExpired || payment.Status == PaymentStateCancelled {
			outcome = ConfirmPaymentOutcomePaidLate
		}

		transaction, txErr := service.transactionRepository.GetTransactionById(ctxWithTx, *payment.TransactionId)
		if txErr != nil {
			return payment, "", txErr
		}

		if transaction.DeletedAt != nil {
			if undeleteErr := service.transactionRepository.UndeleteTransactionById(ctxWithTx, transaction.Id); undeleteErr != nil {
				return payment, "", undeleteErr
			}
			transaction.DeletedAt = nil

			if reserveErr := service.availabilityReservation.ForceReserve(ctxWithTx, transaction.TransactionItems); reserveErr != nil {
				return payment, "", reserveErr
			}
		}

		if payErr := payTransaction(ctxWithTx, transaction, service.transactionRepository, service.walletRepository, service.kdsNotificationRepository, service.orderPaymentWalletId, payment.Amount); payErr != nil {
			return payment, "", payErr
		}

		now := time.Now()
		payment.GatewayReferenceNo = status.GatewayReferenceNo
		payment.Status = PaymentStatePaid
		payment.PaidAt = &now
		payment.StatusCheckedAt = &now

		updatedPayment, updateErr := service.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
		if updateErr != nil {
			return payment, "", updateErr
		}

		cart, cartErr := service.cartRepository.GetCartById(ctxWithTx, payment.CartId)
		if cartErr != nil {
			return payment, "", cartErr
		}
		cart.Status = CartStatusConverted
		if _, updateCartErr := service.cartRepository.UpdateCartById(ctxWithTx, cart, cart.Id); updateCartErr != nil {
			return payment, "", updateCartErr
		}

		// D7: the guest may have checked out again on this cart while the first payment sat
		// cancelled or expired — finalise that newer attempt so the cart never ends up with two
		// paid orders.
		if supersedeErr := supersedeLivePayments(ctxWithTx, payment.CartId, payment.Id, service.paymentRepository, service.transactionRepository, service.availabilityReservation, service.kdsNotificationRepository, service.paymentVerificationRepository); supersedeErr != nil {
			return payment, "", supersedeErr
		}

		return updatedPayment, outcome, nil
	}

	if (status.Status == PaymentGatewayStatusExpired || status.Status == PaymentGatewayStatusFailed) && payment.Status == PaymentStatePending {
		outcome := ConfirmPaymentOutcomeExpired
		terminalStatus := PaymentStateExpired
		if status.Status == PaymentGatewayStatusFailed {
			terminalStatus = PaymentStateFailed
			outcome = ConfirmPaymentOutcomeFailed
		}

		updatedPayment, finalizeErr := finalizeUncollectedPayment(ctxWithTx, payment, terminalStatus, nil, service.paymentRepository, service.transactionRepository, service.availabilityReservation, service.kdsNotificationRepository, service.paymentVerificationRepository)
		if finalizeErr != nil {
			return payment, "", finalizeErr
		}

		return updatedPayment, outcome, nil
	}

	return payment, ConfirmPaymentOutcomeIgnored, nil
}

// finalizeUncollectedPayment is the shared tail of giving up on a payment that will never be
// collected: the payment moves to its terminal state, its transaction's availability reservation
// is released, and the transaction itself is soft-deleted — which is what unfreezes the cart.
// reason is non-nil only when terminalStatus is PaymentStateCancelled (D9); it is a free function,
// not a PaymentUsecase method, so TransactionUsecase's settleOrderPayment can share it too. A cash
// payment that lands in cancelled — whether the guest's own cancel or a supersede (D7) — also gets
// the KDS retraction (D16/FR-7). FR-6/D5: the verification photo delete is unconditional — a
// no-op for every method but cod, and for a cod payment that already lost its photo — so every
// exit from "cod, pending, awaiting" keeps the storage invariant without a method check here.
func finalizeUncollectedPayment(ctxWithTx context.Context, payment Payment, terminalStatus PaymentState, reason *PaymentCancelReason, paymentRepository PaymentRepository, transactionRepository TransactionRepository, availabilityReservation AvailabilityReservation, kdsNotificationRepository KdsNotificationRepository, paymentVerificationRepository PaymentVerificationRepository) (Payment, *Error) {
	now := time.Now()
	payment.Status = terminalStatus
	payment.StatusCheckedAt = &now
	if terminalStatus == PaymentStateCancelled {
		payment.CancelledAt = &now
		payment.CancelReason = reason
	}

	updatedPayment, updateErr := paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
	if updateErr != nil {
		return payment, updateErr
	}

	if deleteErr := paymentVerificationRepository.DeleteByPaymentId(ctxWithTx, payment.Id); deleteErr != nil {
		return payment, deleteErr
	}

	if payment.TransactionId != nil {
		transaction, txErr := transactionRepository.GetTransactionById(ctxWithTx, *payment.TransactionId)
		if txErr != nil {
			return payment, txErr
		}

		if releaseErr := availabilityReservation.Release(ctxWithTx, transaction.TransactionItems); releaseErr != nil {
			return payment, releaseErr
		}

		if deleteErr := transactionRepository.DeleteTransactionById(ctxWithTx, *payment.TransactionId); deleteErr != nil {
			return payment, deleteErr
		}

		if terminalStatus == PaymentStateCancelled && payment.Method == PaymentMethodCash {
			if enqueueErr := enqueueCashCancelledNotification(ctxWithTx, transaction, kdsNotificationRepository); enqueueErr != nil {
				return payment, enqueueErr
			}
		}
	}

	return updatedPayment, nil
}

// enqueueCashCancelledNotification is FR-7: a cash order retracted before it ever sent
// cash_pending (the transaction was deleted before Checkout's enqueue landed, in a scenario this
// codebase does not currently produce) has nothing to retract, so it is skipped rather than
// buzzing a KDS device that was never told to expect it.
func enqueueCashCancelledNotification(ctxWithTx context.Context, transaction Transaction, kdsNotificationRepository KdsNotificationRepository) *Error {
	hasCashPending, err := kdsNotificationRepository.HasNotificationForTransaction(ctxWithTx, transaction.Id, KdsNotificationKindCashPending)
	if err != nil {
		return err
	}
	if !hasCashPending {
		return nil
	}

	return kdsNotificationRepository.EnqueueForTransaction(ctxWithTx, transaction, KdsNotificationKindCashCancelled)
}

// supersedeLivePayments is D7's guard against a stale-but-still-pending payment surviving next to
// one that was just paid late: a cart becomes exactly one paid order, so its current pending
// payment — if there is one, and it isn't the payment just paid — is finalised as
// cancelled/superseded instead of staying collectable.
func supersedeLivePayments(ctxWithTx context.Context, cartId int64, exceptPaymentId int64, paymentRepository PaymentRepository, transactionRepository TransactionRepository, availabilityReservation AvailabilityReservation, kdsNotificationRepository KdsNotificationRepository, paymentVerificationRepository PaymentVerificationRepository) *Error {
	pending, err := paymentRepository.GetPendingPaymentByCartId(ctxWithTx, cartId)
	if err != nil {
		if err.Type == NotFound {
			return nil
		}
		return err
	}
	if pending.Id == exceptPaymentId {
		return nil
	}

	slog.WarnContext(ctxWithTx, "superseding a pending payment paid late by another payment on the same cart",
		slog.String("partnerReferenceNo", pending.PartnerReferenceNo),
		slog.Int64("cartId", cartId),
	)

	reason := PaymentCancelReasonSuperseded
	if _, finalizeErr := finalizeUncollectedPayment(ctxWithTx, pending, PaymentStateCancelled, &reason, paymentRepository, transactionRepository, availabilityReservation, kdsNotificationRepository, paymentVerificationRepository); finalizeErr != nil {
		return finalizeErr
	}

	return nil
}

// expirePayment is FR-4's entry point for giving up on a payment on the clock alone (D7) — used
// directly by ExpireStalePayments for cash, and by applyQrisStatus's expired branch for QRIS.
func (service PaymentService) expirePayment(ctxWithTx context.Context, payment Payment) (Payment, *Error) {
	return finalizeUncollectedPayment(ctxWithTx, payment, PaymentStateExpired, nil, service.paymentRepository, service.transactionRepository, service.availabilityReservation, service.kdsNotificationRepository, service.paymentVerificationRepository)
}

func (service PaymentService) expireOne(ctx context.Context, payment Payment, now time.Time) {
	logger := slog.With(
		slog.String("partnerReferenceNo", payment.PartnerReferenceNo),
		slog.String("method", string(payment.Method)),
	)
	if payment.TransactionId != nil {
		logger = logger.With(slog.Int64("transactionId", *payment.TransactionId))
	}

	outcome := ConfirmPaymentOutcomeIgnored

	err := service.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		// D6: the batch read above is a stale snapshot by the time this per-payment transaction
		// opens — a guest may have cancelled it, another tick may already have expired it, or a
		// barista may have approved it (FR-5: approved is never expirable, however late a tick
		// gets to it). Re-read under lock and stand down if it has left pending or expirability.
		locked, lockErr := service.paymentRepository.GetPaymentByPartnerReferenceNoForUpdate(ctxWithTx, payment.PartnerReferenceNo)
		if lockErr != nil {
			return lockErr
		}
		if locked.Status != PaymentStatePending || !locked.IsExpirable() {
			return nil
		}
		payment = locked

		if !payment.RequiresGateway() {
			if _, expireErr := service.expirePayment(ctxWithTx, payment); expireErr != nil {
				return expireErr
			}
			outcome = ConfirmPaymentOutcomeExpired
			return nil
		}

		gatewayStatus, gatewayErr := service.paymentGatewayRepository.QueryQris(ctxWithTx, QueryQrisInput{
			PartnerReferenceNo: payment.PartnerReferenceNo,
			GatewayReferenceNo: payment.GatewayReferenceNo,
		})
		if gatewayErr != nil {
			// leave the row alone for the next tick — a gateway hiccup is not the guest's expiry.
			return nil
		}

		if gatewayStatus.Status == PaymentGatewayStatusPending {
			gatewayStatus.Status = PaymentGatewayStatusExpired
		}

		_, applyOutcome, applyErr := service.applyQrisStatus(ctxWithTx, payment, gatewayStatus)
		if applyErr != nil {
			return applyErr
		}
		outcome = applyOutcome
		return nil
	})

	if err != nil {
		logger.Error("failed to expire stale payment", slog.Any("error", err))
		return
	}

	switch outcome {
	case ConfirmPaymentOutcomeExpired, ConfirmPaymentOutcomeFailed:
		logger.Info("expired stale payment")
	case ConfirmPaymentOutcomePaid, ConfirmPaymentOutcomePaidLate:
		logger.Warn("stale payment was already paid at the gateway", slog.String("outcome", string(outcome)))
		service.kdsNotificationDispatcher.TriggerDispatch()
	}
}

func (service PaymentService) loadPaymentTransaction(ctxWithTx context.Context, payment Payment, out *Transaction) *Error {
	if payment.TransactionId == nil {
		return &Error{Type: InternalServerError, Message: "payment has no transaction"}
	}
	transaction, txErr := service.transactionRepository.GetTransactionById(ctxWithTx, *payment.TransactionId)
	if txErr != nil {
		return txErr
	}
	*out = transaction
	return nil
}

func (service PaymentService) canCancel(payment Payment, sessionId string) bool {
	return service.orderPaymentCancelEnabled && payment.CanBeCancelledBy(sessionId, time.Now())
}

// authorizePaymentAccess is FR-9/D4: the session that paid always has access, and a payment
// carrying an access key also grants access to whoever holds that key — the guest's own phone,
// via the WhatsApp link, whatever browser it is opened in.
func authorizePaymentAccess(payment Payment, sessionId string, accessKey string) bool {
	if payment.SessionId == sessionId {
		return true
	}
	if payment.AccessKey == nil || accessKey == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(*payment.AccessKey), []byte(accessKey)) == 1
}

func (service PaymentService) refreshPendingPaymentStatus(ctxWithTx context.Context, payment Payment, now time.Time) (Payment, ConfirmPaymentOutcome, *Error) {
	if !payment.RequiresGateway() {
		return service.refreshPendingCashPaymentStatus(ctxWithTx, payment, now)
	}

	if payment.StatusCheckedAt != nil && now.Sub(*payment.StatusCheckedAt) < statusRequeryFloor {
		return payment, ConfirmPaymentOutcomeIgnored, nil
	}

	gatewayStatus, gatewayErr := service.paymentGatewayRepository.QueryQris(ctxWithTx, QueryQrisInput{
		PartnerReferenceNo: payment.PartnerReferenceNo,
		GatewayReferenceNo: payment.GatewayReferenceNo,
	})
	if gatewayErr != nil {
		return payment, ConfirmPaymentOutcomeIgnored, nil
	}

	if gatewayStatus.Status == PaymentGatewayStatusPending && !now.Before(payment.ExpiredAt) {
		gatewayStatus.Status = PaymentGatewayStatusExpired
	}

	if gatewayStatus.Status != PaymentGatewayStatusPending {
		return service.applyQrisStatus(ctxWithTx, payment, gatewayStatus)
	}

	payment.StatusCheckedAt = &now
	updated, err := service.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
	return updated, ConfirmPaymentOutcomeIgnored, err
}

// refreshPendingCashPaymentStatus is FR-3/D7: cash has no gateway to ask, so the server clock is
// the whole truth. Past expired_at it shares expirePayment with applyQrisStatus's expired branch
// and the sweeper (FR-4) — one definition of what giving up on a payment does. FR-5: an approved
// COD payment is left untouched, even past its own expired_at — the guest's own status poll must
// never expire an order the bar has started making.
func (service PaymentService) refreshPendingCashPaymentStatus(ctxWithTx context.Context, payment Payment, now time.Time) (Payment, ConfirmPaymentOutcome, *Error) {
	if !payment.IsExpirable() {
		return payment, ConfirmPaymentOutcomeIgnored, nil
	}

	if now.Before(payment.ExpiredAt) {
		payment.StatusCheckedAt = &now
		updated, err := service.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
		return updated, ConfirmPaymentOutcomeIgnored, err
	}

	updatedPayment, expireErr := service.expirePayment(ctxWithTx, payment)
	if expireErr != nil {
		return payment, "", expireErr
	}

	return updatedPayment, ConfirmPaymentOutcomeExpired, nil
}
