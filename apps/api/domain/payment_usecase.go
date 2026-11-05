package domain

import (
	"apps/api/utils"
	"context"
	"encoding/base64"
	"log/slog"
	"strings"
	"time"
)

const maxCustomerNameLength = 60

type PaymentUsecase struct {
	paymentRepoPort             PaymentRepoPort
	paymentGatewayPort          PaymentGatewayPort
	customerRepoPort            CustomerRepoPort
	cartRepoPort                CartRepoPort
	transactionRepoPort         TransactionRepoPort
	variantRepoPort             VariantRepoPort
	walletRepoPort              WalletRepoPort
	kdsNotificationRepoPort     KdsNotificationRepoPort
	paymentVerificationRepoPort PaymentVerificationRepoPort

	paymentService                    PaymentService
	availabilityService               AvailabilityService
	whatsappNumberVerivicationService WhatsappNumberVerificationService
	kdsNotificationService            KdsNotificationService

	qrisExpirySeconds            int
	cashExpirySeconds            int
	codVerificationExpirySeconds int
	orderPaymentWalletId         int64
}

func NewPaymentUsecase(
	paymentRepoPort PaymentRepoPort,
	paymentGatewayPort PaymentGatewayPort,
	customerRepoPort CustomerRepoPort,
	cartRepoPort CartRepoPort,
	transactionRepoPort TransactionRepoPort,
	variantRepoPort VariantRepoPort,
	walletRepoPort WalletRepoPort,
	kdsNotificationRepoPort KdsNotificationRepoPort,
	paymentVerificationRepoPort PaymentVerificationRepoPort,

	paymentService PaymentService,
	availabilityService AvailabilityService,
	whatsappNumberVerivicationService WhatsappNumberVerificationService,
	kdsNotificationService KdsNotificationService,

	qrisExpirySeconds int,
	cashExpirySeconds int,
	codVerificationExpirySeconds int,
	orderPaymentWalletId int64,
) PaymentUsecase {
	return PaymentUsecase{
		paymentRepoPort:                   paymentRepoPort,
		paymentGatewayPort:                paymentGatewayPort,
		customerRepoPort:                  customerRepoPort,
		cartRepoPort:                      cartRepoPort,
		transactionRepoPort:               transactionRepoPort,
		variantRepoPort:                   variantRepoPort,
		walletRepoPort:                    walletRepoPort,
		kdsNotificationRepoPort:           kdsNotificationRepoPort,
		paymentVerificationRepoPort:       paymentVerificationRepoPort,
		paymentService:                    paymentService,
		availabilityService:               availabilityService,
		whatsappNumberVerivicationService: whatsappNumberVerivicationService,
		kdsNotificationService:            kdsNotificationService,
		qrisExpirySeconds:                 qrisExpirySeconds,
		cashExpirySeconds:                 cashExpirySeconds,
		codVerificationExpirySeconds:      codVerificationExpirySeconds,
		orderPaymentWalletId:              orderPaymentWalletId,
	}
}

func (usecase PaymentUsecase) Checkout(ctx context.Context, sessionId string, customerName string, customerWhatsappNumber string, method PaymentMethod, diningOption DiningOption, verificationPhoto string) (Payment, Transaction, bool, *Error) {
	var resultPayment Payment
	var resultTransaction Transaction
	enqueuedNonGatewayNotification := false

	var verificationPhotoBytes []byte
	var verificationPhotoContentType string
	if method == PaymentMethodCod {
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
		normalized, isValid := utils.NormalizeWhatsappNumber(trimmed)
		if !isValid {
			return Payment{}, Transaction{}, false, &Error{
				Type:    BadRequest,
				Message: "customerWhatsappNumber must be a valid WhatsApp number",
				Reason:  ErrorReasonWhatsappNumberInvalid,
			}
		}
		if verifyErr := usecase.whatsappNumberVerivicationService.EnsureRegistered(ctx, normalized); verifyErr != nil {
			return Payment{}, Transaction{}, false, verifyErr
		}
		whatsappNumber = &normalized
	}

	err := usecase.paymentRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		wallet, err := usecase.walletRepoPort.GetWalletById(ctx, usecase.orderPaymentWalletId)
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

		customerName = strings.TrimSpace(customerName)
		if customerName == "" {
			return &Error{Type: BadRequest, Message: "customerName must not be empty"}
		}
		if len([]rune(customerName)) > maxCustomerNameLength {
			return &Error{Type: BadRequest, Message: "customerName must be at most 60 characters"}
		}

		customer, err := usecase.customerRepoPort.UpsertCustomerBySessionId(ctx, sessionId, customerName, whatsappNumber)
		if err != nil {
			return err
		}

		cart, err := usecase.cartRepoPort.GetActiveCartBySessionId(ctxWithTx, sessionId)
		if err != nil {
			if err.Type != NotFound {
				return err
			}
			cart = Cart{SessionId: sessionId, Status: CartStatusActive, Items: []CartItem{}}
		}
		if len(cart.Items) == 0 {
			return &Error{Type: BadRequest, Message: "cart is empty"}
		}
		if cart.TableId == nil {
			return &Error{Type: BadRequest, Message: "table is not set"}
		}

		if existingPayment, err := usecase.paymentRepoPort.GetPendingPaymentByCartId(ctxWithTx, cart.Id); err != nil {
			if err.Type != NotFound {
				return err
			}
		} else if existingPayment.IsAwaitingPayment(time.Now()) {
			if existingPayment.TransactionId == nil {
				return &Error{Type: InternalServerError, Message: "pending payment has no transaction"}
			}
			transaction, txErr := usecase.transactionRepoPort.GetTransactionById(ctxWithTx, *existingPayment.TransactionId)
			if txErr != nil {
				return txErr
			}

			existingPayment.CustomerWhatsappNumber = whatsappNumber
			updatedPayment, updateErr := usecase.paymentRepoPort.UpdatePaymentById(ctxWithTx, existingPayment, existingPayment.Id)
			if updateErr != nil {
				return updateErr
			}

			if diningOption != "" && diningOption != transaction.DiningOption {
				if updateErr := usecase.transactionRepoPort.UpdateTransactionDiningOptionById(ctxWithTx, transaction.Id, diningOption); updateErr != nil {
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
			variant, err := usecase.variantRepoPort.GetVariantById(ctxWithTx, cartItem.VariantId)
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
				Values:         SnapshotVariantValues(variant),
			})
		}

		if err := usecase.availabilityService.Reserve(ctxWithTx, transactionItems); err != nil {
			return err
		}

		createdTransaction, err := usecase.transactionRepoPort.CreateTransaction(ctxWithTx, Transaction{
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

		var verificationStatus *PaymentVerificationStatus
		if method == PaymentMethodCod {
			awaiting := PaymentVerificationStatusAwaiting
			verificationStatus = &awaiting
		}

		createdPayment, err := usecase.paymentRepoPort.CreatePayment(ctxWithTx, Payment{
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
			if createErr := usecase.paymentVerificationRepoPort.Create(ctxWithTx, PaymentVerificationPhoto{
				PaymentId:   createdPayment.Id,
				ContentType: verificationPhotoContentType,
				ByteSize:    len(verificationPhotoBytes),
				Data:        verificationPhotoBytes,
			}); createErr != nil {
				return createErr
			}
		}

		if !createdPayment.RequiresGateway() {
			kind := KdsNotificationKindCashPending
			if method == PaymentMethodCod {
				kind = KdsNotificationKindCodVerification
			}
			if enqueueErr := usecase.kdsNotificationRepoPort.EnqueueForTransaction(ctxWithTx, createdTransaction, kind); enqueueErr != nil {
				return enqueueErr
			}
			enqueuedNonGatewayNotification = true
			return nil
		}

		qrisPayment, gatewayErr := usecase.paymentGatewayPort.GenerateQris(ctxWithTx, GenerateQrisInput{
			PartnerReferenceNo: partnerReferenceNo,
			Amount:             total,
			ExpiredAt:          expiredAt,
		})
		if gatewayErr != nil {
			return &Error{Type: BadGateway, Message: gatewayErr.Message}
		}

		createdPayment.GatewayReferenceNo = qrisPayment.GatewayReferenceNo
		createdPayment.QrContent = qrisPayment.QrContent

		updatedPayment, err := usecase.paymentRepoPort.UpdatePaymentById(ctxWithTx, createdPayment, createdPayment.Id)
		if err != nil {
			return err
		}

		resultPayment = updatedPayment
		return nil
	})

	if err == nil && enqueuedNonGatewayNotification {
		usecase.kdsNotificationService.TriggerDispatch()
	}

	canCancel := usecase.paymentService.CanCancel(resultPayment, sessionId)
	return resultPayment, resultTransaction, canCancel, err
}

func (usecase PaymentUsecase) ConfirmPayment(ctx context.Context, status QrisStatus) (Payment, ConfirmPaymentOutcome, *Error) {
	var resultPayment Payment
	var outcome ConfirmPaymentOutcome

	err := usecase.paymentRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		payment, err := usecase.paymentRepoPort.GetPaymentByPartnerReferenceNoForUpdate(ctxWithTx, status.PartnerReferenceNo)
		if err != nil {
			if err.Type == NotFound {
				outcome = ConfirmPaymentOutcomeUnknownReference
				return nil
			}
			return err
		}

		updatedPayment, transitionOutcome, transitionErr := usecase.paymentService.ApplyQrisStatus(ctxWithTx, payment, status)
		if transitionErr != nil {
			return transitionErr
		}

		resultPayment = updatedPayment
		outcome = transitionOutcome
		return nil
	})

	if err == nil && (outcome == ConfirmPaymentOutcomePaid || outcome == ConfirmPaymentOutcomePaidLate) {
		usecase.kdsNotificationService.TriggerDispatch()
	}

	return resultPayment, outcome, err
}

func (usecase PaymentUsecase) GetPaymentStatus(ctx context.Context, sessionId string, partnerReferenceNo string, accessKey string) (Payment, Transaction, bool, *Error) {
	var resultPayment Payment
	var resultTransaction Transaction
	var outcome ConfirmPaymentOutcome

	err := usecase.paymentRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		payment, err := usecase.paymentRepoPort.GetPaymentByPartnerReferenceNo(ctxWithTx, partnerReferenceNo)
		if err != nil {
			if err.Type == NotFound {
				return &Error{Type: NotFound, Message: "payment not found"}
			}
			return err
		}
		if !usecase.paymentService.AuthorizePaymentAccess(payment, sessionId, accessKey) {
			return &Error{Type: NotFound, Message: "payment not found"}
		}

		if payment.Status == PaymentStatePending {
			refreshed, refreshOutcome, refreshErr := usecase.paymentService.RefreshPendingPaymentStatus(ctxWithTx, payment, time.Now())
			if refreshErr != nil {
				return refreshErr
			}
			payment = refreshed
			outcome = refreshOutcome
		}

		if payment.TransactionId == nil {
			return &Error{Type: InternalServerError, Message: "payment has no transaction"}
		}
		transaction, txErr := usecase.transactionRepoPort.GetTransactionById(ctxWithTx, *payment.TransactionId)
		if txErr != nil {
			return txErr
		}

		resultPayment = payment
		resultTransaction = transaction
		return nil
	})

	if err == nil && (outcome == ConfirmPaymentOutcomePaid || outcome == ConfirmPaymentOutcomePaidLate) {
		usecase.kdsNotificationService.TriggerDispatch()
	}

	canCancel := usecase.paymentService.CanCancel(resultPayment, sessionId)
	return resultPayment, resultTransaction, canCancel, err
}

func (usecase PaymentUsecase) GetPaymentList(ctx context.Context, sessionId string, skip int, limit int) ([]PaymentSummary, int64, *Error) {
	payments, err := usecase.paymentRepoPort.GetPaymentsBySessionId(ctx, sessionId, skip, limit)
	if err != nil {
		return nil, 0, err
	}

	total, err := usecase.paymentRepoPort.GetPaymentsBySessionIdTotal(ctx, sessionId)
	if err != nil {
		return nil, 0, err
	}

	transactionIds := []int64{}
	for _, payment := range payments {
		if payment.TransactionId != nil {
			transactionIds = append(transactionIds, *payment.TransactionId)
		}
	}

	transactionSummaries, err := usecase.transactionRepoPort.GetTransactionSummariesByIds(ctx, transactionIds)
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
	var resultPayment Payment
	var resultTransaction Transaction
	outcome := ConfirmPaymentOutcomeIgnored
	cancelledCash := false

	err := usecase.paymentRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		payment, err := usecase.paymentRepoPort.GetPaymentByPartnerReferenceNoForUpdate(ctxWithTx, partnerReferenceNo)
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
			return usecase.paymentService.LoadPaymentTransaction(ctxWithTx, payment, &resultTransaction)
		}

		if !payment.CanBeCancelledBy(sessionId, time.Now()) {
			return &Error{Type: BadRequest, Message: "order cannot be cancelled once approved"}
		}

		if payment.RequiresGateway() {
			gatewayStatus, gatewayErr := usecase.paymentGatewayPort.QueryQris(ctxWithTx, QueryQrisInput{
				PartnerReferenceNo: payment.PartnerReferenceNo,
				GatewayReferenceNo: payment.GatewayReferenceNo,
			})
			if gatewayErr != nil {
				slog.WarnContext(ctxWithTx, "cancel: doku query failed, proceeding with the cancel",
					slog.String("partnerReferenceNo", partnerReferenceNo),
					slog.Any("error", gatewayErr),
				)
			} else if gatewayStatus.Status == PaymentGatewayStatusPaid {
				updatedPayment, applyOutcome, applyErr := usecase.paymentService.ApplyQrisStatus(ctxWithTx, payment, gatewayStatus)
				if applyErr != nil {
					return applyErr
				}
				outcome = applyOutcome
				resultPayment = updatedPayment
				return usecase.paymentService.LoadPaymentTransaction(ctxWithTx, updatedPayment, &resultTransaction)
			}

			if cancelErr := usecase.paymentGatewayPort.CancelQris(ctxWithTx, CancelQrisInput{
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
		updatedPayment, finalizeErr := usecase.paymentService.FinalizeUncollectedPayment(ctxWithTx, payment, PaymentStateCancelled, &reason)
		if finalizeErr != nil {
			return finalizeErr
		}

		cancelledCash = payment.Method == PaymentMethodCash
		resultPayment = updatedPayment
		return usecase.paymentService.LoadPaymentTransaction(ctxWithTx, updatedPayment, &resultTransaction)
	})

	if err == nil && (outcome == ConfirmPaymentOutcomePaid || outcome == ConfirmPaymentOutcomePaidLate || cancelledCash) {
		usecase.kdsNotificationService.TriggerDispatch()
	}

	canCancel := usecase.paymentService.CanCancel(resultPayment, sessionId)
	return resultPayment, resultTransaction, canCancel, err
}

func (usecase PaymentUsecase) ExpireStalePayments(ctx context.Context) *Error {
	now := time.Now()
	payments, err := usecase.paymentRepoPort.GetExpirablePayments(ctx, now, paymentExpiryBatchSize)
	if err != nil {
		return err
	}

	for _, payment := range payments {
		usecase.paymentService.ExpireOne(ctx, payment, now)
	}

	return nil
}

func (usecase PaymentUsecase) DeleteOrphanedVerificationPhotos(ctx context.Context) *Error {
	deleted, err := usecase.paymentVerificationRepoPort.DeleteOrphaned(ctx, paymentVerificationOrphanBatchSize)
	if err != nil {
		return err
	}

	if deleted > 0 {
		slog.WarnContext(ctx, "deleted orphaned COD verification photos", slog.Int64("count", deleted))
	}

	return nil
}
