package domain

import (
	"context"
	"crypto/subtle"
	"log/slog"
	"strings"
	"time"
)

const statusRequeryFloor = 1 * time.Second

// FR-4: a bounded batch per sweep so one tick of the sweeper cannot run unbounded, matching
// kdsDispatchBatchSize.
const paymentExpiryBatchSize = 50

type PaymentUsecase struct {
	paymentRepository         PaymentRepository
	paymentGatewayRepository  PaymentGatewayRepository
	customerRepository        CustomerRepository
	cartRepository            CartRepository
	transactionRepository     TransactionRepository
	variantRepository         VariantRepository
	walletRepository          WalletRepository
	availabilityReservation   AvailabilityReservation
	kdsNotificationRepository KdsNotificationRepository
	kdsNotificationDispatcher KdsNotificationDispatcher
	whatsappNumberVerifier    WhatsappNumberVerifier
	qrisExpirySeconds         int
	cashExpirySeconds         int
	orderPaymentWalletId      int64
	orderPaymentCancelEnabled bool
}

func NewPaymentUsecase(
	paymentRepository PaymentRepository,
	paymentGatewayRepository PaymentGatewayRepository,
	customerRepository CustomerRepository,
	cartRepository CartRepository,
	transactionRepository TransactionRepository,
	variantRepository VariantRepository,
	walletRepository WalletRepository,
	availabilityReservation AvailabilityReservation,
	kdsNotificationRepository KdsNotificationRepository,
	kdsNotificationDispatcher KdsNotificationDispatcher,
	whatsappNumberVerifier WhatsappNumberVerifier,
	qrisExpirySeconds int,
	cashExpirySeconds int,
	orderPaymentWalletId int64,
	orderPaymentCancelEnabled bool,
) PaymentUsecase {
	return PaymentUsecase{
		paymentRepository:         paymentRepository,
		paymentGatewayRepository:  paymentGatewayRepository,
		customerRepository:        customerRepository,
		cartRepository:            cartRepository,
		transactionRepository:     transactionRepository,
		variantRepository:         variantRepository,
		walletRepository:          walletRepository,
		availabilityReservation:   availabilityReservation,
		kdsNotificationRepository: kdsNotificationRepository,
		kdsNotificationDispatcher: kdsNotificationDispatcher,
		whatsappNumberVerifier:    whatsappNumberVerifier,
		qrisExpirySeconds:         qrisExpirySeconds,
		cashExpirySeconds:         cashExpirySeconds,
		orderPaymentWalletId:      orderPaymentWalletId,
		orderPaymentCancelEnabled: orderPaymentCancelEnabled,
	}
}

func (usecase PaymentUsecase) expirySecondsFor(method PaymentMethod) int {
	if method == PaymentMethodCash {
		return usecase.cashExpirySeconds
	}
	return usecase.qrisExpirySeconds
}

func (usecase PaymentUsecase) validateOrderPaymentWallet(ctx context.Context) *Error {
	wallet, err := usecase.walletRepository.GetWalletById(ctx, usecase.orderPaymentWalletId)
	if err != nil {
		if err.Type == NotFound {
			return &Error{Type: InternalServerError, Message: "order payment wallet is not configured"}
		}
		return err
	}
	return ValidateOrderPaymentWallet(wallet)
}

func (usecase PaymentUsecase) Checkout(ctx context.Context, sessionId string, customerName string, customerWhatsappNumber string, method PaymentMethod, diningOption DiningOption) (Payment, Transaction, *Error) {
	var resultPayment Payment
	var resultTransaction Transaction
	enqueuedCashPendingNotification := false

	// FR-2/D5: absent (empty) is left nil so the customer's stored number and an idempotent
	// pending payment's snapshot stay unchanged; only a non-empty value is normalized and
	// verified. Both run before BeginTransaction, never inside it (D5): a Fonnte round trip
	// must never hold the checkout's row locks.
	var whatsappNumber *string
	if trimmed := strings.TrimSpace(customerWhatsappNumber); trimmed != "" {
		normalized, normErr := NormalizeWhatsappNumber(trimmed)
		if normErr != nil {
			return Payment{}, Transaction{}, normErr
		}
		if verifyErr := usecase.whatsappNumberVerifier.EnsureRegistered(ctx, normalized); verifyErr != nil {
			return Payment{}, Transaction{}, verifyErr
		}
		whatsappNumber = &normalized
	}

	err := usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if err := usecase.validateOrderPaymentWallet(ctxWithTx); err != nil {
			return err
		}

		if !diningOption.IsValid() {
			return &Error{Type: BadRequest, Message: "invalid dining option"}
		}

		customer, err := upsertCustomer(ctxWithTx, usecase.customerRepository, sessionId, customerName, whatsappNumber)
		if err != nil {
			return err
		}

		cart, err := usecase.cartRepository.GetActiveCartBySessionId(ctxWithTx, sessionId)
		if err != nil {
			if err.Type != NotFound {
				return err
			}
			cart = emptyCart(sessionId)
		}
		if len(cart.Items) == 0 {
			return &Error{Type: BadRequest, Message: "cart is empty"}
		}
		if cart.TableId == nil {
			return &Error{Type: BadRequest, Message: "table is not set"}
		}

		if existingPayment, err := usecase.paymentRepository.GetPendingPaymentByCartId(ctxWithTx, cart.Id); err != nil {
			if err.Type != NotFound {
				return err
			}
		} else if existingPayment.IsAwaitingPayment(time.Now()) {
			if existingPayment.TransactionId == nil {
				return &Error{Type: InternalServerError, Message: "pending payment has no transaction"}
			}
			transaction, txErr := usecase.transactionRepository.GetTransactionById(ctxWithTx, *existingPayment.TransactionId)
			if txErr != nil {
				return txErr
			}

			// FR-3: the pending payment is reused, but its snapshot moves to the number just
			// submitted — a guest who retries checkout with a corrected number is heard.
			existingPayment.CustomerWhatsappNumber = whatsappNumber
			updatedPayment, updateErr := usecase.paymentRepository.UpdatePaymentById(ctxWithTx, existingPayment, existingPayment.Id)
			if updateErr != nil {
				return updateErr
			}

			// D8: a guest who backs out and switches dining option must be heard the same way as
			// FR-3's WhatsApp number — but only a non-empty, changed value writes, so a retry from
			// an old client that never sends the field can't clobber an earlier takeaway choice.
			if diningOption != "" && diningOption != transaction.DiningOption {
				if updateErr := usecase.transactionRepository.UpdateTransactionDiningOptionById(ctxWithTx, transaction.Id, diningOption); updateErr != nil {
					return updateErr
				}
				transaction.DiningOption = diningOption
			}

			resultPayment = updatedPayment
			resultTransaction = transaction
			return nil
		}

		transactionItems := []TransactionItem{}
		var total float32
		for _, cartItem := range cart.Items {
			variant, err := usecase.variantRepository.GetVariantById(ctxWithTx, cartItem.VariantId)
			if err != nil {
				return err
			}

			subtotal := variant.Price * cartItem.Amount
			total += subtotal

			transactionItems = append(transactionItems, TransactionItem{
				VariantId:      cartItem.VariantId,
				Amount:         cartItem.Amount,
				Note:           cartItem.Note,
				DiscountAmount: 0,
				Subtotal:       subtotal,
				Price:          variant.Price,
				ProductName:    variant.Product.Name,
				Values:         snapshotVariantValues(variant),
			})
		}

		if err := usecase.availabilityReservation.Reserve(ctxWithTx, transactionItems); err != nil {
			return err
		}

		createdTransaction, err := usecase.transactionRepository.CreateTransaction(ctxWithTx, Transaction{
			Name:               customer.Name,
			Source:             TransactionSourceOrder,
			DiningOption:       diningOption,
			CartId:             &cart.Id,
			PagerNumber:        0,
			Total:              total,
			TransactionItems:   transactionItems,
			TransactionCoupons: []TransactionCoupon{},
		})
		if err != nil {
			return err
		}

		partnerReferenceNo, genErr := GeneratePartnerReferenceNo()
		if genErr != nil {
			return &Error{Type: InternalServerError, Message: "failed to generate payment reference"}
		}

		accessKey, genErr := GenerateOrderAccessKey()
		if genErr != nil {
			return &Error{Type: InternalServerError, Message: "failed to generate payment access key"}
		}

		expiredAt := time.Now().Add(time.Duration(usecase.expirySecondsFor(method)) * time.Second)

		createdPayment, err := usecase.paymentRepository.CreatePayment(ctxWithTx, Payment{
			CartId:                 cart.Id,
			SessionId:              sessionId,
			CustomerWhatsappNumber: whatsappNumber,
			TransactionId:          &createdTransaction.Id,
			PartnerReferenceNo:     partnerReferenceNo,
			AccessKey:              &accessKey,
			Method:                 method,
			Status:                 PaymentStatePending,
			Amount:                 total,
			ExpiredAt:              expiredAt,
		})
		if err != nil {
			return err
		}

		resultPayment = createdPayment
		resultTransaction = createdTransaction

		if !createdPayment.RequiresGateway() {
			// FR-5: buzzes the KDS before any money moves, so a barista walks to the till
			// rather than the guest arriving to an unstaffed one.
			if enqueueErr := usecase.kdsNotificationRepository.EnqueueForTransaction(ctxWithTx, createdTransaction, KdsNotificationKindCashPending); enqueueErr != nil {
				return enqueueErr
			}
			enqueuedCashPendingNotification = true
			return nil
		}

		qrisPayment, gatewayErr := usecase.paymentGatewayRepository.GenerateQris(ctxWithTx, GenerateQrisInput{
			PartnerReferenceNo: partnerReferenceNo,
			Amount:             total,
			ExpiredAt:          expiredAt,
		})
		if gatewayErr != nil {
			return &Error{Type: BadGateway, Message: gatewayErr.Message}
		}

		createdPayment.GatewayReferenceNo = qrisPayment.GatewayReferenceNo
		createdPayment.QrContent = qrisPayment.QrContent

		updatedPayment, err := usecase.paymentRepository.UpdatePaymentById(ctxWithTx, createdPayment, createdPayment.Id)
		if err != nil {
			return err
		}

		resultPayment = updatedPayment
		return nil
	})

	// FR-5: kicked after the commit, exactly as PayTransaction and ConfirmPayment already do —
	// the guest's HTTP response never waits on Expo.
	if err == nil && enqueuedCashPendingNotification {
		usecase.kdsNotificationDispatcher.TriggerDispatch()
	}

	return resultPayment, resultTransaction, err
}

func (usecase PaymentUsecase) ConfirmPayment(ctx context.Context, status QrisStatus) (Payment, ConfirmPaymentOutcome, *Error) {
	var resultPayment Payment
	var outcome ConfirmPaymentOutcome

	err := usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		// D6: locks the row so a concurrent guest cancel or cashier settle serialises against this
		// webhook instead of racing it to a terminal state.
		payment, err := usecase.paymentRepository.GetPaymentByPartnerReferenceNoForUpdate(ctxWithTx, status.PartnerReferenceNo)
		if err != nil {
			if err.Type == NotFound {
				outcome = ConfirmPaymentOutcomeUnknownReference
				return nil
			}
			return err
		}

		updatedPayment, transitionOutcome, transitionErr := usecase.applyQrisStatus(ctxWithTx, payment, status)
		if transitionErr != nil {
			return transitionErr
		}

		resultPayment = updatedPayment
		outcome = transitionOutcome
		return nil
	})

	// FR-4: kicked after the commit — this is the DOKU webhook path into payTransaction.
	if err == nil && (outcome == ConfirmPaymentOutcomePaid || outcome == ConfirmPaymentOutcomePaidLate) {
		usecase.kdsNotificationDispatcher.TriggerDispatch()
	}

	return resultPayment, outcome, err
}

func (usecase PaymentUsecase) applyQrisStatus(ctxWithTx context.Context, payment Payment, status QrisStatus) (Payment, ConfirmPaymentOutcome, *Error) {
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

		transaction, txErr := usecase.transactionRepository.GetTransactionById(ctxWithTx, *payment.TransactionId)
		if txErr != nil {
			return payment, "", txErr
		}

		if transaction.DeletedAt != nil {
			if undeleteErr := usecase.transactionRepository.UndeleteTransactionById(ctxWithTx, transaction.Id); undeleteErr != nil {
				return payment, "", undeleteErr
			}
			transaction.DeletedAt = nil

			if reserveErr := usecase.availabilityReservation.ForceReserve(ctxWithTx, transaction.TransactionItems); reserveErr != nil {
				return payment, "", reserveErr
			}
		}

		if payErr := payTransaction(ctxWithTx, transaction, usecase.transactionRepository, usecase.walletRepository, usecase.kdsNotificationRepository, usecase.orderPaymentWalletId, payment.Amount); payErr != nil {
			return payment, "", payErr
		}

		now := time.Now()
		payment.GatewayReferenceNo = status.GatewayReferenceNo
		payment.Status = PaymentStatePaid
		payment.PaidAt = &now
		payment.StatusCheckedAt = &now

		updatedPayment, updateErr := usecase.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
		if updateErr != nil {
			return payment, "", updateErr
		}

		cart, cartErr := usecase.cartRepository.GetCartById(ctxWithTx, payment.CartId)
		if cartErr != nil {
			return payment, "", cartErr
		}
		cart.Status = CartStatusConverted
		if _, updateCartErr := usecase.cartRepository.UpdateCartById(ctxWithTx, cart, cart.Id); updateCartErr != nil {
			return payment, "", updateCartErr
		}

		// D7: the guest may have checked out again on this cart while the first payment sat
		// cancelled or expired — finalise that newer attempt so the cart never ends up with two
		// paid orders.
		if supersedeErr := supersedeLivePayments(ctxWithTx, payment.CartId, payment.Id, usecase.paymentRepository, usecase.transactionRepository, usecase.availabilityReservation, usecase.kdsNotificationRepository); supersedeErr != nil {
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

		updatedPayment, finalizeErr := finalizeUncollectedPayment(ctxWithTx, payment, terminalStatus, nil, usecase.paymentRepository, usecase.transactionRepository, usecase.availabilityReservation, usecase.kdsNotificationRepository)
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
// the KDS retraction (D16/FR-7).
func finalizeUncollectedPayment(ctxWithTx context.Context, payment Payment, terminalStatus PaymentState, reason *PaymentCancelReason, paymentRepository PaymentRepository, transactionRepository TransactionRepository, availabilityReservation AvailabilityReservation, kdsNotificationRepository KdsNotificationRepository) (Payment, *Error) {
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
func supersedeLivePayments(ctxWithTx context.Context, cartId int64, exceptPaymentId int64, paymentRepository PaymentRepository, transactionRepository TransactionRepository, availabilityReservation AvailabilityReservation, kdsNotificationRepository KdsNotificationRepository) *Error {
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
	if _, finalizeErr := finalizeUncollectedPayment(ctxWithTx, pending, PaymentStateCancelled, &reason, paymentRepository, transactionRepository, availabilityReservation, kdsNotificationRepository); finalizeErr != nil {
		return finalizeErr
	}

	return nil
}

// expirePayment is FR-4's entry point for giving up on a payment on the clock alone (D7) — used
// directly by ExpireStalePayments for cash, and by applyQrisStatus's expired branch for QRIS.
func (usecase PaymentUsecase) expirePayment(ctxWithTx context.Context, payment Payment) (Payment, *Error) {
	return finalizeUncollectedPayment(ctxWithTx, payment, PaymentStateExpired, nil, usecase.paymentRepository, usecase.transactionRepository, usecase.availabilityReservation, usecase.kdsNotificationRepository)
}

// ExpireStalePayments claims up to paymentExpiryBatchSize pending payments past their expired_at,
// oldest first, and gives up on each in its own transaction so one bad row cannot poison the batch
// (FR-4). Cash trusts the server clock alone (D7). QRIS confirms with DOKU first, because DOKU may
// already hold money we do not know about (QRIS D12a): a paid result runs the full late-payment
// path (D5's un-delete included), anything else expires, and a gateway error leaves the row for
// the next tick.
func (usecase PaymentUsecase) ExpireStalePayments(ctx context.Context) *Error {
	now := time.Now()
	payments, err := usecase.paymentRepository.GetExpirablePayments(ctx, now, paymentExpiryBatchSize)
	if err != nil {
		return err
	}

	for _, payment := range payments {
		usecase.expireOne(ctx, payment, now)
	}

	return nil
}

func (usecase PaymentUsecase) expireOne(ctx context.Context, payment Payment, now time.Time) {
	logger := slog.With(
		slog.String("partnerReferenceNo", payment.PartnerReferenceNo),
		slog.String("method", string(payment.Method)),
	)
	if payment.TransactionId != nil {
		logger = logger.With(slog.Int64("transactionId", *payment.TransactionId))
	}

	outcome := ConfirmPaymentOutcomeIgnored

	err := usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		// D6: the batch read above is a stale snapshot by the time this per-payment transaction
		// opens — a guest may have cancelled it, or another tick may already have expired it.
		// Re-read under lock and stand down if it has already left pending.
		locked, lockErr := usecase.paymentRepository.GetPaymentByPartnerReferenceNoForUpdate(ctxWithTx, payment.PartnerReferenceNo)
		if lockErr != nil {
			return lockErr
		}
		if locked.Status != PaymentStatePending {
			return nil
		}
		payment = locked

		if !payment.RequiresGateway() {
			if _, expireErr := usecase.expirePayment(ctxWithTx, payment); expireErr != nil {
				return expireErr
			}
			outcome = ConfirmPaymentOutcomeExpired
			return nil
		}

		gatewayStatus, gatewayErr := usecase.paymentGatewayRepository.QueryQris(ctxWithTx, QueryQrisInput{
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

		_, applyOutcome, applyErr := usecase.applyQrisStatus(ctxWithTx, payment, gatewayStatus)
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
		usecase.kdsNotificationDispatcher.TriggerDispatch()
	}
}

// CancelPayment is the guest's own entry point into finalizeUncollectedPayment (FR-3). Unlike
// GetPaymentStatus, an access key never authorises it (D3) — only the session that checked out.
// The response is always the payment's resulting state, never an error for a payment that had
// already left pending: paid, expired and failed are all returned as-is (D3).
func (usecase PaymentUsecase) CancelPayment(ctx context.Context, sessionId string, partnerReferenceNo string) (Payment, Transaction, *Error) {
	if !usecase.orderPaymentCancelEnabled {
		return Payment{}, Transaction{}, &Error{Type: BadRequest, Message: "payment cancellation is not available"}
	}

	var resultPayment Payment
	var resultTransaction Transaction
	outcome := ConfirmPaymentOutcomeIgnored
	cancelledCash := false

	err := usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		payment, err := usecase.paymentRepository.GetPaymentByPartnerReferenceNoForUpdate(ctxWithTx, partnerReferenceNo)
		if err != nil {
			if err.Type == NotFound {
				return &Error{Type: NotFound, Message: "payment not found"}
			}
			return err
		}
		if payment.SessionId != sessionId {
			return &Error{Type: NotFound, Message: "payment not found"}
		}

		if payment.Status != PaymentStatePending {
			resultPayment = payment
			return usecase.loadPaymentTransaction(ctxWithTx, payment, &resultTransaction)
		}

		if payment.RequiresGateway() {
			gatewayStatus, gatewayErr := usecase.paymentGatewayRepository.QueryQris(ctxWithTx, QueryQrisInput{
				PartnerReferenceNo: payment.PartnerReferenceNo,
				GatewayReferenceNo: payment.GatewayReferenceNo,
			})
			if gatewayErr != nil {
				slog.WarnContext(ctxWithTx, "cancel: doku query failed, proceeding with the cancel",
					slog.String("partnerReferenceNo", partnerReferenceNo),
					slog.Any("error", gatewayErr),
				)
			} else if gatewayStatus.Status == PaymentGatewayStatusPaid {
				updatedPayment, applyOutcome, applyErr := usecase.applyQrisStatus(ctxWithTx, payment, gatewayStatus)
				if applyErr != nil {
					return applyErr
				}
				outcome = applyOutcome
				resultPayment = updatedPayment
				return usecase.loadPaymentTransaction(ctxWithTx, updatedPayment, &resultTransaction)
			}

			// Best-effort: cancelling the QR at DOKU (D5, phase 9) shrinks D7's late-payment window,
			// but nothing here depends on it succeeding.
			if cancelErr := usecase.paymentGatewayRepository.CancelQris(ctxWithTx, CancelQrisInput{
				PartnerReferenceNo: payment.PartnerReferenceNo,
				GatewayReferenceNo: payment.GatewayReferenceNo,
			}); cancelErr != nil {
				slog.WarnContext(ctxWithTx, "cancel: doku qr cancel failed, proceeding with the local cancel",
					slog.String("partnerReferenceNo", partnerReferenceNo),
					slog.Any("error", cancelErr),
				)
			}
		}

		reason := PaymentCancelReasonGuest
		updatedPayment, finalizeErr := finalizeUncollectedPayment(ctxWithTx, payment, PaymentStateCancelled, &reason, usecase.paymentRepository, usecase.transactionRepository, usecase.availabilityReservation, usecase.kdsNotificationRepository)
		if finalizeErr != nil {
			return finalizeErr
		}

		cancelledCash = payment.Method == PaymentMethodCash
		resultPayment = updatedPayment
		return usecase.loadPaymentTransaction(ctxWithTx, updatedPayment, &resultTransaction)
	})

	// FR-4: a cancel that discovers the payment was already paid at DOKU (D4) triggers the KDS
	// exactly as ConfirmPayment and GetPaymentStatus do. FR-7: so does a cash cancel that may have
	// just enqueued cash_cancelled — the guest's HTTP response must not wait on Expo either way.
	if err == nil && (outcome == ConfirmPaymentOutcomePaid || outcome == ConfirmPaymentOutcomePaidLate || cancelledCash) {
		usecase.kdsNotificationDispatcher.TriggerDispatch()
	}

	return resultPayment, resultTransaction, err
}

func (usecase PaymentUsecase) loadPaymentTransaction(ctxWithTx context.Context, payment Payment, out *Transaction) *Error {
	if payment.TransactionId == nil {
		return &Error{Type: InternalServerError, Message: "payment has no transaction"}
	}
	transaction, txErr := usecase.transactionRepository.GetTransactionById(ctxWithTx, *payment.TransactionId)
	if txErr != nil {
		return txErr
	}
	*out = transaction
	return nil
}

// CanCancel is D10's eligibility rule as the API computes it: the flag, and the payment's own
// eligibility for this requester. The transformer calls it for every payment response, so a
// payment read through GET or through Cancel itself always carries the same answer.
func (usecase PaymentUsecase) CanCancel(payment Payment, sessionId string) bool {
	return usecase.orderPaymentCancelEnabled && payment.CanBeCancelledBy(sessionId, time.Now())
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

func (usecase PaymentUsecase) GetPaymentStatus(ctx context.Context, sessionId string, partnerReferenceNo string, accessKey string) (Payment, Transaction, *Error) {
	var resultPayment Payment
	var resultTransaction Transaction
	var outcome ConfirmPaymentOutcome

	err := usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		payment, err := usecase.paymentRepository.GetPaymentByPartnerReferenceNo(ctxWithTx, partnerReferenceNo)
		if err != nil {
			if err.Type == NotFound {
				return &Error{Type: NotFound, Message: "payment not found"}
			}
			return err
		}
		if !authorizePaymentAccess(payment, sessionId, accessKey) {
			return &Error{Type: NotFound, Message: "payment not found"}
		}

		if payment.Status == PaymentStatePending {
			refreshed, refreshOutcome, refreshErr := usecase.refreshPendingPaymentStatus(ctxWithTx, payment, time.Now())
			if refreshErr != nil {
				return refreshErr
			}
			payment = refreshed
			outcome = refreshOutcome
		}

		if payment.TransactionId == nil {
			return &Error{Type: InternalServerError, Message: "payment has no transaction"}
		}
		transaction, txErr := usecase.transactionRepository.GetTransactionById(ctxWithTx, *payment.TransactionId)
		if txErr != nil {
			return txErr
		}

		resultPayment = payment
		resultTransaction = transaction
		return nil
	})

	// FR-4: kicked after the commit — this is the guest's status page re-querying DOKU and
	// observing the payment before the webhook does (System Design Overview, "the path").
	if err == nil && (outcome == ConfirmPaymentOutcomePaid || outcome == ConfirmPaymentOutcomePaidLate) {
		usecase.kdsNotificationDispatcher.TriggerDispatch()
	}

	return resultPayment, resultTransaction, err
}

func (usecase PaymentUsecase) GetPaymentList(ctx context.Context, sessionId string, skip int, limit int) ([]PaymentSummary, int64, *Error) {
	payments, err := usecase.paymentRepository.GetPaymentsBySessionId(ctx, sessionId, skip, limit)
	if err != nil {
		return nil, 0, err
	}

	total, err := usecase.paymentRepository.GetPaymentsBySessionIdTotal(ctx, sessionId)
	if err != nil {
		return nil, 0, err
	}

	transactionIds := []int64{}
	for _, payment := range payments {
		if payment.TransactionId != nil {
			transactionIds = append(transactionIds, *payment.TransactionId)
		}
	}

	transactionSummaries, err := usecase.transactionRepository.GetTransactionSummariesByIds(ctx, transactionIds)
	if err != nil {
		return nil, 0, err
	}

	transactionSummaryById := map[int64]TransactionSummary{}
	for _, transactionSummary := range transactionSummaries {
		transactionSummaryById[transactionSummary.Id] = transactionSummary
	}

	paymentSummaries := []PaymentSummary{}
	for _, payment := range payments {
		var transactionSummary TransactionSummary
		if payment.TransactionId != nil {
			transactionSummary = transactionSummaryById[*payment.TransactionId]
		}
		paymentSummaries = append(paymentSummaries, ToPaymentSummary(payment, transactionSummary))
	}

	return paymentSummaries, total, nil
}

func (usecase PaymentUsecase) refreshPendingPaymentStatus(ctxWithTx context.Context, payment Payment, now time.Time) (Payment, ConfirmPaymentOutcome, *Error) {
	if !payment.RequiresGateway() {
		return usecase.refreshPendingCashPaymentStatus(ctxWithTx, payment, now)
	}

	if payment.StatusCheckedAt != nil && now.Sub(*payment.StatusCheckedAt) < statusRequeryFloor {
		return payment, ConfirmPaymentOutcomeIgnored, nil
	}

	gatewayStatus, gatewayErr := usecase.paymentGatewayRepository.QueryQris(ctxWithTx, QueryQrisInput{
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
		return usecase.applyQrisStatus(ctxWithTx, payment, gatewayStatus)
	}

	payment.StatusCheckedAt = &now
	updated, err := usecase.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
	return updated, ConfirmPaymentOutcomeIgnored, err
}

// refreshPendingCashPaymentStatus is FR-3/D7: cash has no gateway to ask, so the server clock is
// the whole truth. Past expired_at it shares expirePayment with applyQrisStatus's expired branch
// and the sweeper (FR-4) — one definition of what giving up on a payment does.
func (usecase PaymentUsecase) refreshPendingCashPaymentStatus(ctxWithTx context.Context, payment Payment, now time.Time) (Payment, ConfirmPaymentOutcome, *Error) {
	if now.Before(payment.ExpiredAt) {
		payment.StatusCheckedAt = &now
		updated, err := usecase.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
		return updated, ConfirmPaymentOutcomeIgnored, err
	}

	updatedPayment, expireErr := usecase.expirePayment(ctxWithTx, payment)
	if expireErr != nil {
		return payment, "", expireErr
	}

	return updatedPayment, ConfirmPaymentOutcomeExpired, nil
}
