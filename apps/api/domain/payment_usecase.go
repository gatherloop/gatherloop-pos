package domain

import (
	"context"
	"crypto/subtle"
	"log/slog"
	"time"
)

const statusRequeryFloor = 5 * time.Second

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
	qrisExpirySeconds         int
	cashExpirySeconds         int
	orderPaymentWalletId      int64
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
	qrisExpirySeconds int,
	cashExpirySeconds int,
	orderPaymentWalletId int64,
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
		qrisExpirySeconds:         qrisExpirySeconds,
		cashExpirySeconds:         cashExpirySeconds,
		orderPaymentWalletId:      orderPaymentWalletId,
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

func (usecase PaymentUsecase) Checkout(ctx context.Context, sessionId string, customerName string, method PaymentMethod) (Payment, Transaction, *Error) {
	var resultPayment Payment
	var resultTransaction Transaction
	enqueuedCashPendingNotification := false

	err := usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if err := usecase.validateOrderPaymentWallet(ctxWithTx); err != nil {
			return err
		}

		customer, err := upsertCustomerName(ctxWithTx, usecase.customerRepository, sessionId, customerName)
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
			resultPayment = existingPayment
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
			CartId:             cart.Id,
			SessionId:          sessionId,
			TransactionId:      &createdTransaction.Id,
			PartnerReferenceNo: partnerReferenceNo,
			AccessKey:          &accessKey,
			Method:             method,
			Status:             PaymentStatePending,
			Amount:             total,
			ExpiredAt:          expiredAt,
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
		payment, err := usecase.paymentRepository.GetPaymentByPartnerReferenceNo(ctxWithTx, status.PartnerReferenceNo)
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

	if status.Status == PaymentGatewayStatusPaid && (payment.Status == PaymentStatePending || payment.Status == PaymentStateExpired) {
		if status.PaidAmount != payment.Amount {
			return payment, ConfirmPaymentOutcomeAmountMismatch, nil
		}

		if payment.TransactionId == nil {
			return payment, "", &Error{Type: InternalServerError, Message: "payment has no transaction to pay"}
		}

		outcome := ConfirmPaymentOutcomePaid
		if payment.Status == PaymentStateExpired {
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

		return updatedPayment, outcome, nil
	}

	if (status.Status == PaymentGatewayStatusExpired || status.Status == PaymentGatewayStatusFailed) && payment.Status == PaymentStatePending {
		outcome := ConfirmPaymentOutcomeExpired
		terminalStatus := PaymentStateExpired
		if status.Status == PaymentGatewayStatusFailed {
			terminalStatus = PaymentStateFailed
			outcome = ConfirmPaymentOutcomeFailed
		}

		updatedPayment, finalizeErr := usecase.finalizeUncollectedPayment(ctxWithTx, payment, terminalStatus)
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
func (usecase PaymentUsecase) finalizeUncollectedPayment(ctxWithTx context.Context, payment Payment, terminalStatus PaymentState) (Payment, *Error) {
	now := time.Now()
	payment.Status = terminalStatus
	payment.StatusCheckedAt = &now

	updatedPayment, updateErr := usecase.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
	if updateErr != nil {
		return payment, updateErr
	}

	if payment.TransactionId != nil {
		transaction, txErr := usecase.transactionRepository.GetTransactionById(ctxWithTx, *payment.TransactionId)
		if txErr != nil {
			return payment, txErr
		}

		if releaseErr := usecase.availabilityReservation.Release(ctxWithTx, transaction.TransactionItems); releaseErr != nil {
			return payment, releaseErr
		}

		if deleteErr := usecase.transactionRepository.DeleteTransactionById(ctxWithTx, *payment.TransactionId); deleteErr != nil {
			return payment, deleteErr
		}
	}

	return updatedPayment, nil
}

// expirePayment is FR-4's entry point for giving up on a payment on the clock alone (D7) — used
// directly by ExpireStalePayments for cash, and by applyQrisStatus's expired branch for QRIS.
func (usecase PaymentUsecase) expirePayment(ctxWithTx context.Context, payment Payment) (Payment, *Error) {
	return usecase.finalizeUncollectedPayment(ctxWithTx, payment, PaymentStateExpired)
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
