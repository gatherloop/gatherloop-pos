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
	availabilityService           AvailabilityService
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
	availabilityService AvailabilityService,
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
		availabilityService:           availabilityService,
		orderPaymentWalletId:          orderPaymentWalletId,
		orderPaymentCancelEnabled:     orderPaymentCancelEnabled,
		kdsNotificationDispatcher:     kdsNotificationDispatcher,
	}
}

func (service PaymentService) ApplyQrisStatus(ctxWithTx context.Context, payment Payment, status QrisStatus) (Payment, ConfirmPaymentOutcome, *Error) {
	if payment.Status == PaymentStatePaid {
		return payment, ConfirmPaymentOutcomeAlreadyPaid, nil
	}

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

			if reserveErr := service.availabilityService.ForceReserve(ctxWithTx, transaction.TransactionItems); reserveErr != nil {
				return payment, "", reserveErr
			}
		}

		if payErr := service.PayTransaction(ctxWithTx, transaction, service.orderPaymentWalletId, payment.Amount); payErr != nil {
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

		if supersedeErr := service.SupersedeLivePayments(ctxWithTx, payment.CartId, payment.Id); supersedeErr != nil {
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

		updatedPayment, finalizeErr := service.FinalizeUncollectedPayment(ctxWithTx, payment, terminalStatus, nil)
		if finalizeErr != nil {
			return payment, "", finalizeErr
		}

		return updatedPayment, outcome, nil
	}

	return payment, ConfirmPaymentOutcomeIgnored, nil
}

func (service PaymentService) FinalizeUncollectedPayment(ctxWithTx context.Context, payment Payment, terminalStatus PaymentState, reason *PaymentCancelReason) (Payment, *Error) {
	now := time.Now()
	payment.Status = terminalStatus
	payment.StatusCheckedAt = &now
	if terminalStatus == PaymentStateCancelled {
		payment.CancelledAt = &now
		payment.CancelReason = reason
	}

	updatedPayment, updateErr := service.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
	if updateErr != nil {
		return payment, updateErr
	}

	if deleteErr := service.paymentVerificationRepository.DeleteByPaymentId(ctxWithTx, payment.Id); deleteErr != nil {
		return payment, deleteErr
	}

	if payment.TransactionId != nil {
		transaction, txErr := service.transactionRepository.GetTransactionById(ctxWithTx, *payment.TransactionId)
		if txErr != nil {
			return payment, txErr
		}

		if releaseErr := service.availabilityService.Release(ctxWithTx, transaction.TransactionItems); releaseErr != nil {
			return payment, releaseErr
		}

		if deleteErr := service.transactionRepository.DeleteTransactionById(ctxWithTx, *payment.TransactionId); deleteErr != nil {
			return payment, deleteErr
		}

		if terminalStatus == PaymentStateCancelled && payment.Method == PaymentMethodCash {
			if enqueueErr := service.EnqueueCashCancelledNotification(ctxWithTx, transaction); enqueueErr != nil {
				return payment, enqueueErr
			}
		}
	}

	return updatedPayment, nil
}

func (service PaymentService) EnqueueCashCancelledNotification(ctxWithTx context.Context, transaction Transaction) *Error {
	hasCashPending, err := service.kdsNotificationRepository.HasNotificationForTransaction(ctxWithTx, transaction.Id, KdsNotificationKindCashPending)
	if err != nil {
		return err
	}
	if !hasCashPending {
		return nil
	}

	return service.kdsNotificationRepository.EnqueueForTransaction(ctxWithTx, transaction, KdsNotificationKindCashCancelled)
}

// supersedeLivePayments is D7's guard against a stale-but-still-pending payment surviving next to
// one that was just paid late: a cart becomes exactly one paid order, so its current pending
// payment — if there is one, and it isn't the payment just paid — is finalised as
// cancelled/superseded instead of staying collectable.
func (service PaymentService) SupersedeLivePayments(ctxWithTx context.Context, cartId int64, exceptPaymentId int64) *Error {
	pending, err := service.paymentRepository.GetPendingPaymentByCartId(ctxWithTx, cartId)
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
	if _, finalizeErr := service.FinalizeUncollectedPayment(ctxWithTx, pending, PaymentStateCancelled, &reason); finalizeErr != nil {
		return finalizeErr
	}

	return nil
}

// expirePayment is FR-4's entry point for giving up on a payment on the clock alone (D7) — used
// directly by ExpireStalePayments for cash, and by applyQrisStatus's expired branch for QRIS.
func (service PaymentService) ExpirePayment(ctxWithTx context.Context, payment Payment) (Payment, *Error) {
	return service.FinalizeUncollectedPayment(ctxWithTx, payment, PaymentStateExpired, nil)
}

func (service PaymentService) ExpireOne(ctx context.Context, payment Payment, now time.Time) {
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
			if _, expireErr := service.ExpirePayment(ctxWithTx, payment); expireErr != nil {
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

		_, applyOutcome, applyErr := service.ApplyQrisStatus(ctxWithTx, payment, gatewayStatus)
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

func (service PaymentService) LoadPaymentTransaction(ctxWithTx context.Context, payment Payment, out *Transaction) *Error {
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

func (service PaymentService) CanCancel(payment Payment, sessionId string) bool {
	return service.orderPaymentCancelEnabled && payment.CanBeCancelledBy(sessionId, time.Now())
}

func (service PaymentService) AuthorizePaymentAccess(payment Payment, sessionId string, accessKey string) bool {
	if payment.SessionId == sessionId {
		return true
	}
	if payment.AccessKey == nil || accessKey == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(*payment.AccessKey), []byte(accessKey)) == 1
}

func (service PaymentService) RefreshPendingPaymentStatus(ctxWithTx context.Context, payment Payment, now time.Time) (Payment, ConfirmPaymentOutcome, *Error) {
	if !payment.RequiresGateway() {
		return service.RefreshPendingCashPaymentStatus(ctxWithTx, payment, now)
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
		return service.ApplyQrisStatus(ctxWithTx, payment, gatewayStatus)
	}

	payment.StatusCheckedAt = &now
	updated, err := service.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
	return updated, ConfirmPaymentOutcomeIgnored, err
}

func (service PaymentService) RefreshPendingCashPaymentStatus(ctxWithTx context.Context, payment Payment, now time.Time) (Payment, ConfirmPaymentOutcome, *Error) {
	if !payment.IsExpirable() {
		return payment, ConfirmPaymentOutcomeIgnored, nil
	}

	if now.Before(payment.ExpiredAt) {
		payment.StatusCheckedAt = &now
		updated, err := service.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
		return updated, ConfirmPaymentOutcomeIgnored, err
	}

	updatedPayment, expireErr := service.ExpirePayment(ctxWithTx, payment)
	if expireErr != nil {
		return payment, "", expireErr
	}

	return updatedPayment, ConfirmPaymentOutcomeExpired, nil
}

func (service PaymentService) PayTransaction(ctx context.Context, transaction Transaction, walletId int64, paidAmount float32) *Error {
	if transaction.PaidAt != nil {
		return &Error{Type: BadRequest, Message: "transaction already paid"}
	}

	id := transaction.Id

	paymentWallet, err := service.walletRepository.GetWalletById(ctx, walletId)
	if err != nil {
		return err
	}

	if !paymentWallet.IsPaymentTarget {
		return &Error{Type: BadRequest, Message: "wallet cannot receive transaction payments"}
	}

	paymentCost := transaction.Total * paymentWallet.PaymentCostPercentage / 100
	newBalance := paymentWallet.Balance + transaction.Total - paymentCost

	if _, err := service.walletRepository.UpdateWalletById(ctx, Wallet{
		Name:                  paymentWallet.Name,
		PaymentCostPercentage: paymentWallet.PaymentCostPercentage,
		Balance:               newBalance,
		IsCashless:            paymentWallet.IsCashless,
		IsPaymentTarget:       paymentWallet.IsPaymentTarget,
	},
		walletId); err != nil {
		return err
	}

	variantMaterials := []VariantMaterial{}

	for _, item := range transaction.TransactionItems {
		variantMaterials = append(variantMaterials, item.Variant.Materials...)
	}

	var foodCost float32
	for _, variantMaterial := range variantMaterials {
		foodCost += variantMaterial.Amount * variantMaterial.Material.Price
	}

	totalIncome := transaction.Total - paymentCost - foodCost

	if _, err := service.transactionRepository.UpdateTransactionById(ctx, Transaction{TotalIncome: totalIncome}, id); err != nil {
		return err
	}

	// FR-1: enqueued after the wallet and income writes succeed, atomic with the payment (D5).
	if err := service.kdsNotificationRepository.EnqueueForTransaction(ctx, transaction, KdsNotificationKindOrderPaid); err != nil {
		return err
	}

	return service.transactionRepository.PayTransaction(ctx, walletId, time.Now(), paidAmount, id)
}
