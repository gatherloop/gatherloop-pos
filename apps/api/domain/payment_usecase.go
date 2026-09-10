package domain

import (
	"context"
	"time"
)

// PaymentUsecase is FR-6's checkout endpoint: cart → QRIS payment → unpaid
// order Transaction. It depends on repositories rather than other usecases,
// the same way every usecase in this package does (see cart_usecase.go,
// rental_usecase.go): PaymentRepository.BeginTransaction is the one
// transaction boundary Checkout opens, and every write inside it must reach
// the database through that same ambient tx (data/mysql's
// GetDbFromCtx) rather than opening a second, uncoordinated one — which is
// exactly what would happen if this depended on TransactionUsecase, whose
// own CreateTransaction calls TransactionRepository.BeginTransaction itself.
// CustomerUsecase is the one exception: it never opens a transaction of its
// own (see customer_repository.go), which is what makes composing
// CustomerUsecase.UpsertCustomerName into this one safe.
type PaymentUsecase struct {
	paymentRepository        PaymentRepository
	paymentGatewayRepository PaymentGatewayRepository
	customerUsecase          CustomerUsecase
	cartRepository           CartRepository
	transactionRepository    TransactionRepository
	variantRepository        VariantRepository
	qrisExpirySeconds        int
}

func NewPaymentUsecase(
	paymentRepository PaymentRepository,
	paymentGatewayRepository PaymentGatewayRepository,
	customerUsecase CustomerUsecase,
	cartRepository CartRepository,
	transactionRepository TransactionRepository,
	variantRepository VariantRepository,
	qrisExpirySeconds int,
) PaymentUsecase {
	return PaymentUsecase{
		paymentRepository:        paymentRepository,
		paymentGatewayRepository: paymentGatewayRepository,
		customerUsecase:          customerUsecase,
		cartRepository:           cartRepository,
		transactionRepository:    transactionRepository,
		variantRepository:        variantRepository,
		qrisExpirySeconds:        qrisExpirySeconds,
	}
}

// Checkout is FR-6's POST /carts/current/checkout, steps 1-8. It returns the
// payment together with the order transaction it pays for — the transaction
// carries what the API response needs beyond the payment row itself: the
// frozen customer name, the priced line items and, through its cart, the
// table (D7).
func (usecase PaymentUsecase) Checkout(ctx context.Context, sessionId string, customerName string) (Payment, Transaction, *Error) {
	var resultPayment Payment
	var resultTransaction Transaction

	err := usecase.paymentRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		// Step 1: validate and upsert the name (D17, FR-4). CustomerUsecase
		// does its own trimming and length validation, so this usecase adds
		// none of its own — the transaction below is named after the
		// trimmed result, not the raw input, so it never freezes stray
		// whitespace into the record the POS searches on.
		customer, err := usecase.customerUsecase.UpsertCustomerName(ctxWithTx, sessionId, customerName)
		if err != nil {
			return err
		}

		// Step 2: load the session's active cart. A session with no cart at
		// all is, for checkout's purposes, the same as an empty one.
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

		// Step 3: idempotent re-checkout (D11) — a pending, unexpired
		// payment on this cart is returned as-is rather than minting a
		// second QR. The name upsert above still ran, so a corrected name
		// is saved for next time even though this QR is reused.
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

		// Step 4-5: price the cart from current variant prices (D9) and
		// create the unpaid order transaction, snapshotting price, product
		// name and option values exactly as a POS-created transaction does
		// (transaction_usecase.go's CreateTransaction). orderNumber stays 0
		// (D16); transactionCoupons stays empty (Non-Goals).
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

		// Step 6: mint the reference (D18) and insert the pending payment.
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

		// Step 7: call the gateway. Any failure rolls back the whole
		// transaction — no orphan transaction or payment row, nothing to
		// reconcile — and is reported as a gateway failure (502), not a
		// generic 500.
		qrisPayment, gatewayErr := usecase.paymentGatewayRepository.GenerateQris(ctxWithTx, GenerateQrisInput{
			PartnerReferenceNo: partnerReferenceNo,
			Amount:             total,
			ExpiredAt:          expiredAt,
		})
		if gatewayErr != nil {
			return &Error{Type: BadGateway, Message: gatewayErr.Message}
		}

		// Step 8: store the QR and gateway reference.
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
