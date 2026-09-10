package domain

import (
	"context"
	"time"
)

const statusRequeryFloor = 10 * time.Second

type PaymentUsecase struct {
	paymentRepository        PaymentRepository
	paymentGatewayRepository PaymentGatewayRepository
	customerRepository       CustomerRepository
	cartRepository           CartRepository
	transactionRepository    TransactionRepository
	variantRepository        VariantRepository
	walletRepository         WalletRepository
	qrisExpirySeconds        int
	orderPaymentWalletId     int64
}

func NewPaymentUsecase(
	paymentRepository PaymentRepository,
	paymentGatewayRepository PaymentGatewayRepository,
	customerRepository CustomerRepository,
	cartRepository CartRepository,
	transactionRepository TransactionRepository,
	variantRepository VariantRepository,
	walletRepository WalletRepository,
	qrisExpirySeconds int,
	orderPaymentWalletId int64,
) PaymentUsecase {
	return PaymentUsecase{
		paymentRepository:        paymentRepository,
		paymentGatewayRepository: paymentGatewayRepository,
		customerRepository:       customerRepository,
		cartRepository:           cartRepository,
		transactionRepository:    transactionRepository,
		variantRepository:        variantRepository,
		walletRepository:         walletRepository,
		qrisExpirySeconds:        qrisExpirySeconds,
		orderPaymentWalletId:     orderPaymentWalletId,
	}
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

func (usecase PaymentUsecase) Checkout(ctx context.Context, sessionId string, customerName string) (Payment, Transaction, *Error) {
	var resultPayment Payment
	var resultTransaction Transaction

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

		createdTransaction, err := usecase.transactionRepository.CreateTransaction(ctxWithTx, Transaction{
			Name:               customer.Name,
			Source:             TransactionSourceOrder,
			CartId:             &cart.Id,
			OrderNumber:        0,
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

		expiredAt := time.Now().Add(time.Duration(usecase.qrisExpirySeconds) * time.Second)

		createdPayment, err := usecase.paymentRepository.CreatePayment(ctxWithTx, Payment{
			CartId:             cart.Id,
			SessionId:          sessionId,
			TransactionId:      &createdTransaction.Id,
			PartnerReferenceNo: partnerReferenceNo,
			Method:             PaymentMethodQris,
			Status:             PaymentStatePending,
			Amount:             total,
			ExpiredAt:          expiredAt,
		})
		if err != nil {
			return err
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
		resultTransaction = createdTransaction
		return nil
	})

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
		}

		if payErr := payTransaction(ctxWithTx, transaction, usecase.transactionRepository, usecase.walletRepository, usecase.orderPaymentWalletId, payment.Amount); payErr != nil {
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
		payment.Status = PaymentStateExpired
		if status.Status == PaymentGatewayStatusFailed {
			payment.Status = PaymentStateFailed
			outcome = ConfirmPaymentOutcomeFailed
		}

		now := time.Now()
		payment.StatusCheckedAt = &now

		updatedPayment, updateErr := usecase.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
		if updateErr != nil {
			return payment, "", updateErr
		}

		if payment.TransactionId != nil {
			if deleteErr := usecase.transactionRepository.DeleteTransactionById(ctxWithTx, *payment.TransactionId); deleteErr != nil {
				return payment, "", deleteErr
			}
		}

		return updatedPayment, outcome, nil
	}

	return payment, ConfirmPaymentOutcomeIgnored, nil
}

func (usecase PaymentUsecase) GetPaymentStatus(ctx context.Context, sessionId string, partnerReferenceNo string) (Payment, Transaction, *Error) {
	var resultPayment Payment
	var resultTransaction Transaction

	err := usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		payment, err := usecase.paymentRepository.GetPaymentByPartnerReferenceNo(ctxWithTx, partnerReferenceNo)
		if err != nil {
			if err.Type == NotFound {
				return &Error{Type: NotFound, Message: "payment not found"}
			}
			return err
		}
		if payment.SessionId != sessionId {
			return &Error{Type: NotFound, Message: "payment not found"}
		}

		if payment.Status == PaymentStatePending {
			refreshed, refreshErr := usecase.refreshPendingPaymentStatus(ctxWithTx, payment, time.Now())
			if refreshErr != nil {
				return refreshErr
			}
			payment = refreshed
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

	return resultPayment, resultTransaction, err
}

func (usecase PaymentUsecase) refreshPendingPaymentStatus(ctxWithTx context.Context, payment Payment, now time.Time) (Payment, *Error) {
	if payment.StatusCheckedAt != nil && now.Sub(*payment.StatusCheckedAt) < statusRequeryFloor {
		return payment, nil
	}

	gatewayStatus, gatewayErr := usecase.paymentGatewayRepository.QueryQris(ctxWithTx, QueryQrisInput{
		PartnerReferenceNo: payment.PartnerReferenceNo,
		GatewayReferenceNo: payment.GatewayReferenceNo,
	})
	if gatewayErr != nil {
		return payment, nil
	}

	if gatewayStatus.Status == PaymentGatewayStatusPending && !now.Before(payment.ExpiredAt) {
		gatewayStatus.Status = PaymentGatewayStatusExpired
	}

	if gatewayStatus.Status != PaymentGatewayStatusPending {
		updated, _, err := usecase.applyQrisStatus(ctxWithTx, payment, gatewayStatus)
		return updated, err
	}

	payment.StatusCheckedAt = &now
	return usecase.paymentRepository.UpdatePaymentById(ctxWithTx, payment, payment.Id)
}
