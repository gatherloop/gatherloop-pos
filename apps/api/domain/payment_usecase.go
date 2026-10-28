package domain

import (
	"context"
	"encoding/base64"
	"log/slog"
	"strings"
	"time"
)

type PaymentUsecase struct {
	paymentRepository             PaymentRepository
	paymentGatewayRepository      PaymentGatewayRepository
	customerRepository            CustomerRepository
	cartRepository                CartRepository
	transactionRepository         TransactionRepository
	variantRepository             VariantRepository
	walletRepository              WalletRepository
	availabilityReservation       AvailabilityReservation
	kdsNotificationRepository     KdsNotificationRepository
	kdsNotificationDispatcher     KdsNotificationDispatcher
	whatsappNumberVerifier        WhatsappNumberVerifier
	paymentVerificationRepository PaymentVerificationRepository
	qrisExpirySeconds             int
	cashExpirySeconds             int
	codVerificationExpirySeconds  int
	orderPaymentWalletId          int64
	orderPaymentCancelEnabled     bool
	orderCodPaymentEnabled        bool

	service PaymentService
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
	paymentVerificationRepository PaymentVerificationRepository,
	qrisExpirySeconds int,
	cashExpirySeconds int,
	codVerificationExpirySeconds int,
	orderPaymentWalletId int64,
	orderPaymentCancelEnabled bool,
	orderCodPaymentEnabled bool,
) PaymentUsecase {
	return PaymentUsecase{
		paymentRepository:             paymentRepository,
		paymentGatewayRepository:      paymentGatewayRepository,
		customerRepository:            customerRepository,
		cartRepository:                cartRepository,
		transactionRepository:         transactionRepository,
		variantRepository:             variantRepository,
		walletRepository:              walletRepository,
		availabilityReservation:       availabilityReservation,
		kdsNotificationRepository:     kdsNotificationRepository,
		kdsNotificationDispatcher:     kdsNotificationDispatcher,
		whatsappNumberVerifier:        whatsappNumberVerifier,
		paymentVerificationRepository: paymentVerificationRepository,
		qrisExpirySeconds:             qrisExpirySeconds,
		cashExpirySeconds:             cashExpirySeconds,
		codVerificationExpirySeconds:  codVerificationExpirySeconds,
		orderPaymentWalletId:          orderPaymentWalletId,
		orderPaymentCancelEnabled:     orderPaymentCancelEnabled,
		orderCodPaymentEnabled:        orderCodPaymentEnabled,
		service: PaymentService{
			paymentRepository:             paymentRepository,
			paymentGatewayRepository:      paymentGatewayRepository,
			cartRepository:                cartRepository,
			transactionRepository:         transactionRepository,
			walletRepository:              walletRepository,
			availabilityReservation:       availabilityReservation,
			kdsNotificationRepository:     kdsNotificationRepository,
			kdsNotificationDispatcher:     kdsNotificationDispatcher,
			paymentVerificationRepository: paymentVerificationRepository,
			orderPaymentWalletId:          orderPaymentWalletId,
			orderPaymentCancelEnabled:     orderPaymentCancelEnabled,
		},
	}
}

func (usecase PaymentUsecase) Checkout(ctx context.Context, sessionId string, customerName string, customerWhatsappNumber string, method PaymentMethod, diningOption DiningOption, verificationPhoto string) (Payment, Transaction, bool, *Error) {
	var resultPayment Payment
	var resultTransaction Transaction
	enqueuedNonGatewayNotification := false

	var verificationPhotoBytes []byte
	var verificationPhotoContentType string
	if method == PaymentMethodCod {
		if !usecase.orderCodPaymentEnabled {
			return Payment{}, Transaction{}, false, &Error{Type: BadRequest, Message: "payment method is not available"}
		}

		decoded, decodeErr := base64.StdEncoding.DecodeString(verificationPhoto)
		if decodeErr != nil {
			return Payment{}, Transaction{}, false, &Error{Type: BadRequest, Message: "verification photo must be valid base64"}
		}

		contentType, validateErr := ValidateVerificationPhoto(decoded)
		if validateErr != nil {
			return Payment{}, Transaction{}, false, validateErr
		}

		verificationPhotoBytes = decoded
		verificationPhotoContentType = contentType
	}

	var whatsappNumber *string
	if trimmed := strings.TrimSpace(customerWhatsappNumber); trimmed != "" {
		normalized, normErr := NormalizeWhatsappNumber(trimmed)
		if normErr != nil {
			return Payment{}, Transaction{}, false, normErr
		}
		if verifyErr := usecase.whatsappNumberVerifier.EnsureRegistered(ctx, normalized); verifyErr != nil {
			return Payment{}, Transaction{}, false, verifyErr
		}
		whatsappNumber = &normalized
	}

	err := usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		wallet, err := usecase.walletRepository.GetWalletById(ctx, usecase.orderPaymentWalletId)
		if err != nil {
			if err.Type == NotFound {
				return &Error{Type: InternalServerError, Message: "order payment wallet is not configured"}
			}
			return err
		}
		if wallet.DeletedAt != nil {
			return &Error{Type: InternalServerError, Message: "ORDER_PAYMENT_WALLET_ID points at a deleted wallet"}
		}
		if !wallet.IsPaymentTarget {
			return &Error{Type: InternalServerError, Message: "ORDER_PAYMENT_WALLET_ID points at a wallet that is not a payment target"}
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

			existingPayment.CustomerWhatsappNumber = whatsappNumber
			updatedPayment, updateErr := usecase.paymentRepository.UpdatePaymentById(ctxWithTx, existingPayment, existingPayment.Id)
			if updateErr != nil {
				return updateErr
			}

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

		expirySeconds := 0
		switch method {
		case PaymentMethodCash:
			expirySeconds = usecase.cashExpirySeconds
		case PaymentMethodCod:
			expirySeconds = usecase.codVerificationExpirySeconds
		default:
			expirySeconds = usecase.qrisExpirySeconds
		}

		expiredAt := time.Now().Add(time.Duration(expirySeconds) * time.Second)

		// D2: verification is the presence axis, orthogonal to status — a cod payment starts
		// pending + awaiting, exactly like every other axis pairing this domain snapshots at
		// creation.
		var verificationStatus *PaymentVerificationStatus
		if method == PaymentMethodCod {
			awaiting := PaymentVerificationStatusAwaiting
			verificationStatus = &awaiting
		}

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
			VerificationStatus:     verificationStatus,
		})
		if err != nil {
			return err
		}

		resultPayment = createdPayment
		resultTransaction = createdTransaction

		if method == PaymentMethodCod {
			// FR-3: the photo row is created in the same transaction as the payment, keeping D5's
			// invariant true from the instant the payment exists.
			if createErr := usecase.paymentVerificationRepository.Create(ctxWithTx, PaymentVerificationPhoto{
				PaymentId:   createdPayment.Id,
				ContentType: verificationPhotoContentType,
				ByteSize:    len(verificationPhotoBytes),
				Data:        verificationPhotoBytes,
			}); createErr != nil {
				return createErr
			}
		}

		if !createdPayment.RequiresGateway() {
			// FR-5/FR-9: buzzes the KDS before any money moves, so a barista walks to the till (cash)
			// or looks at the photo (cod) rather than the guest arriving to nothing happening.
			kind := KdsNotificationKindCashPending
			if method == PaymentMethodCod {
				kind = KdsNotificationKindCodVerification
			}
			if enqueueErr := usecase.kdsNotificationRepository.EnqueueForTransaction(ctxWithTx, createdTransaction, kind); enqueueErr != nil {
				return enqueueErr
			}
			enqueuedNonGatewayNotification = true
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
	if err == nil && enqueuedNonGatewayNotification {
		usecase.kdsNotificationDispatcher.TriggerDispatch()
	}

	canCancel := usecase.service.canCancel(resultPayment, sessionId)
	return resultPayment, resultTransaction, canCancel, err
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

		updatedPayment, transitionOutcome, transitionErr := usecase.service.applyQrisStatus(ctxWithTx, payment, status)
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

func (usecase PaymentUsecase) GetPaymentStatus(ctx context.Context, sessionId string, partnerReferenceNo string, accessKey string) (Payment, Transaction, bool, *Error) {
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
			refreshed, refreshOutcome, refreshErr := usecase.service.refreshPendingPaymentStatus(ctxWithTx, payment, time.Now())
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

	canCancel := usecase.service.canCancel(resultPayment, sessionId)
	return resultPayment, resultTransaction, canCancel, err
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

func (usecase PaymentUsecase) CancelPayment(ctx context.Context, sessionId string, partnerReferenceNo string) (Payment, Transaction, bool, *Error) {
	if !usecase.orderPaymentCancelEnabled {
		return Payment{}, Transaction{}, false, &Error{Type: BadRequest, Message: "payment cancellation is not available"}
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
			return usecase.service.loadPaymentTransaction(ctxWithTx, payment, &resultTransaction)
		}

		// FR-5/D10: an approved COD order is being made — the guest may no longer cancel it
		// themselves. Session ownership and pending-ness are already established above, so this
		// is exactly CanBeCancelledBy's remaining condition.
		if !payment.CanBeCancelledBy(sessionId, time.Now()) {
			return &Error{Type: BadRequest, Message: "order cannot be cancelled once approved"}
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
				updatedPayment, applyOutcome, applyErr := usecase.service.applyQrisStatus(ctxWithTx, payment, gatewayStatus)
				if applyErr != nil {
					return applyErr
				}
				outcome = applyOutcome
				resultPayment = updatedPayment
				return usecase.service.loadPaymentTransaction(ctxWithTx, updatedPayment, &resultTransaction)
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
		updatedPayment, finalizeErr := finalizeUncollectedPayment(ctxWithTx, payment, PaymentStateCancelled, &reason, usecase.paymentRepository, usecase.transactionRepository, usecase.availabilityReservation, usecase.kdsNotificationRepository, usecase.paymentVerificationRepository)
		if finalizeErr != nil {
			return finalizeErr
		}

		cancelledCash = payment.Method == PaymentMethodCash
		resultPayment = updatedPayment
		return usecase.service.loadPaymentTransaction(ctxWithTx, updatedPayment, &resultTransaction)
	})

	// FR-4: a cancel that discovers the payment was already paid at DOKU (D4) triggers the KDS
	// exactly as ConfirmPayment and GetPaymentStatus do. FR-7: so does a cash cancel that may have
	// just enqueued cash_cancelled — the guest's HTTP response must not wait on Expo either way.
	if err == nil && (outcome == ConfirmPaymentOutcomePaid || outcome == ConfirmPaymentOutcomePaidLate || cancelledCash) {
		usecase.kdsNotificationDispatcher.TriggerDispatch()
	}

	canCancel := usecase.service.canCancel(resultPayment, sessionId)
	return resultPayment, resultTransaction, canCancel, err
}

func (usecase PaymentUsecase) ExpireStalePayments(ctx context.Context) *Error {
	now := time.Now()
	payments, err := usecase.paymentRepository.GetExpirablePayments(ctx, now, paymentExpiryBatchSize)
	if err != nil {
		return err
	}

	for _, payment := range payments {
		usecase.service.expireOne(ctx, payment, now)
	}

	return nil
}

func (usecase PaymentUsecase) DeleteOrphanedVerificationPhotos(ctx context.Context) *Error {
	deleted, err := usecase.paymentVerificationRepository.DeleteOrphaned(ctx, paymentVerificationOrphanBatchSize)
	if err != nil {
		return err
	}

	if deleted > 0 {
		slog.WarnContext(ctx, "deleted orphaned COD verification photos", slog.Int64("count", deleted))
	}

	return nil
}
