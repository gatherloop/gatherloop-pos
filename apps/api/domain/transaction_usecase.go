package domain

import (
	"context"
	"log/slog"
	"time"
)

type TransactionUsecase struct {
	transactionRepository       TransactionRepository
	variantRepository           VariantRepository
	walletRepository            WalletRepository
	paymentRepository           PaymentRepository
	guestNotificationRepository GuestNotificationRepository

	transactionService  TransactionService
	paymentService      PaymentService
	availabilityService AvailabilityService

	kdsNotificationService   KdsNotificationService
	guestNotificationService GuestNotificationService
}

func NewTransactionUsecase(
	transactionRepository TransactionRepository,
	variantRepository VariantRepository,
	walletRepository WalletRepository,
	paymentRepository PaymentRepository,
	guestNotificationRepository GuestNotificationRepository,

	transactionService TransactionService,
	paymentService PaymentService,
	availabilityService AvailabilityService,

	kdsNotificationService KdsNotificationService,
	guestNotificationService GuestNotificationService,
) TransactionUsecase {
	return TransactionUsecase{
		transactionRepository:       transactionRepository,
		variantRepository:           variantRepository,
		walletRepository:            walletRepository,
		paymentRepository:           paymentRepository,
		guestNotificationRepository: guestNotificationRepository,

		transactionService:  transactionService,
		paymentService:      paymentService,
		availabilityService: availabilityService,

		kdsNotificationService:   kdsNotificationService,
		guestNotificationService: guestNotificationService,
	}
}

func (usecase TransactionUsecase) GetTransactionList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, paymentStatus PaymentStatus, walletId *int, source *TransactionSource, fulfillment *TransactionFulfillment) ([]Transaction, int64, *Error) {
	transactions, err := usecase.transactionRepository.GetTransactionList(ctx, query, sortBy, order, skip, limit, paymentStatus, walletId, source, fulfillment)
	if err != nil {
		return []Transaction{}, 0, err
	}

	total, err := usecase.transactionRepository.GetTransactionListTotal(ctx, query, paymentStatus, walletId, source, fulfillment)
	if err != nil {
		return []Transaction{}, 0, err
	}

	return transactions, total, nil
}

func (usecase TransactionUsecase) GetTransactionById(ctx context.Context, id int64) (Transaction, *Error) {
	return usecase.transactionRepository.GetTransactionById(ctx, id)
}

func (usecase TransactionUsecase) CreateTransaction(ctx context.Context, transaction Transaction) (Transaction, *Error) {
	var createdTransaction Transaction

	if !transaction.DiningOption.IsValid() {
		return Transaction{}, &Error{Type: BadRequest, Message: "invalid dining option"}
	}

	if transaction.Source == "" {
		transaction.Source = TransactionSourcePos
	}

	err := usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {

		for index, item := range transaction.TransactionItems {
			variant, err := usecase.variantRepository.GetVariantById(ctxWithTx, item.VariantId)
			if err != nil {
				return err
			}

			subTotal := (variant.Price * item.Amount) - item.DiscountAmount
			transaction.Total += subTotal

			transactionItem := TransactionItem{
				Id:             item.Id,
				TransactionId:  createdTransaction.Id,
				VariantId:      item.VariantId,
				Amount:         item.Amount,
				DiscountAmount: item.DiscountAmount,
				Subtotal:       subTotal,
				Price:          variant.Price,
				Note:           item.Note,
				ProductName:    variant.Product.Name,
				Values:         SnapshotVariantValues(variant),
			}

			transaction.TransactionItems[index] = transactionItem
		}

		if err := usecase.transactionService.ApplyTransactionCoupons(ctxWithTx, &transaction, createdTransaction.Id); err != nil {
			return err
		}

		if err := usecase.availabilityService.Reserve(ctxWithTx, transaction.TransactionItems); err != nil {
			return err
		}

		ct, err := usecase.transactionRepository.CreateTransaction(ctxWithTx, transaction)
		if err != nil {
			return err
		}

		createdTransaction = ct
		return nil
	})

	return createdTransaction, err
}

func (usecase TransactionUsecase) UpdateTransactionById(ctx context.Context, transaction Transaction, id int64) (Transaction, *Error) {
	var updatedTransaction Transaction

	if !transaction.DiningOption.IsValid() {
		return Transaction{}, &Error{Type: BadRequest, Message: "invalid dining option"}
	}

	err := usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existingTransaction, err := usecase.transactionRepository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if existingTransaction.PaidAt != nil {
			return &Error{Type: BadRequest, Message: "cannot update paid transaction"}
		}

		if existingTransaction.Source == TransactionSourceOrder {
			return &Error{Type: BadRequest, Message: "cannot update transaction created from order app"}
		}

		existingItemsById := map[int64]TransactionItem{}
		for _, existingItem := range existingTransaction.TransactionItems {
			existingItemsById[existingItem.Id] = existingItem
		}

		for index, item := range transaction.TransactionItems {
			if existingItem, ok := existingItemsById[item.Id]; ok && existingItem.RentalId != nil {
				subTotal := (existingItem.Price * existingItem.Amount) - item.DiscountAmount
				transaction.Total += subTotal
				transaction.TransactionItems[index] = TransactionItem{
					Id:             existingItem.Id,
					TransactionId:  id,
					VariantId:      existingItem.VariantId,
					Amount:         existingItem.Amount,
					DiscountAmount: item.DiscountAmount,
					Subtotal:       subTotal,
					Price:          existingItem.Price,
					RentalId:       existingItem.RentalId,
					Note:           existingItem.Note,
					ProductName:    existingItem.ProductName,
					Values:         existingItem.Values,
				}
				continue
			}

			variant, err := usecase.variantRepository.GetVariantById(ctxWithTx, item.VariantId)
			if err != nil {
				return err
			}

			subTotal := (variant.Price * item.Amount) - item.DiscountAmount
			transaction.Total += subTotal

			transactionItem := TransactionItem{
				Id:             item.Id,
				TransactionId:  id,
				VariantId:      item.VariantId,
				Amount:         item.Amount,
				DiscountAmount: item.DiscountAmount,
				Subtotal:       subTotal,
				Price:          variant.Price,
				Note:           item.Note,
				ProductName:    variant.Product.Name,
				Values:         SnapshotVariantValues(variant),
			}

			transaction.TransactionItems[index] = transactionItem
		}

		if err := usecase.transactionService.ApplyTransactionCoupons(ctxWithTx, &transaction, id); err != nil {
			return err
		}

		if err := usecase.availabilityService.ApplyDelta(ctxWithTx, existingTransaction.TransactionItems, transaction.TransactionItems); err != nil {
			return err
		}

		ut, err := usecase.transactionRepository.UpdateTransactionById(ctxWithTx, transaction, id)
		if err != nil {
			return err
		}

		updatedTransaction = ut
		return nil
	})

	return updatedTransaction, err
}

func (usecase TransactionUsecase) DeleteTransactionById(ctx context.Context, id int64) *Error {
	return usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		transaction, err := usecase.transactionRepository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if transaction.PaidAt != nil {
			return &Error{Type: BadRequest, Message: "transaction already paid"}
		}

		if err := usecase.availabilityService.Release(ctxWithTx, transaction.TransactionItems); err != nil {
			return err
		}

		return usecase.transactionRepository.DeleteTransactionById(ctxWithTx, id)
	})
}

func (usecase TransactionUsecase) PayTransaction(ctx context.Context, walletId int64, paidAmount float32, id int64) *Error {
	err := usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		transaction, err := usecase.transactionRepository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		// D6/D8: lock the linked payment row, if any, before deciding whether this transaction
		// may still be paid. A POS transaction has no linked payment (NotFound, fall through
		// unguarded); an order transaction whose payment the guest already cancelled must never
		// be resurrected by a cashier working from a stale list. The same locked row is reused
		// below, in settleOrderPayment, rather than read a second time.
		linkedPayment, paymentErr := usecase.paymentRepository.GetPaymentByTransactionIdForUpdate(ctxWithTx, id)
		hasLinkedPayment := paymentErr == nil
		if paymentErr != nil && paymentErr.Type != NotFound {
			return paymentErr
		}
		if hasLinkedPayment && linkedPayment.Status == PaymentStateCancelled {
			return &Error{Type: BadRequest, Message: "order was cancelled by the guest"}
		}
		// FR-5/D9: nothing should be paid for before a barista has confirmed the guest is in the
		// café — approval is what starts the bar making it.
		if hasLinkedPayment && linkedPayment.IsAwaitingCodVerification() {
			return &Error{Type: BadRequest, Message: "verify the order before taking payment"}
		}

		// D23: the sweeper may have soft-deleted this order transaction between the cashier's
		// list fetch and their pressing Pay. Un-delete and re-reserve before paying it — the
		// same late-payment path applyQrisStatus already takes for a QRIS webhook that arrives
		// late. A soft-deleted POS transaction is untouched; nothing sweeps those.
		if transaction.DeletedAt != nil && transaction.Source == TransactionSourceOrder {
			slog.WarnContext(ctxWithTx, "paying a soft-deleted order transaction", slog.Int64("transactionId", transaction.Id), slog.Int64("transactionNumber", transaction.TransactionNumber))

			if undeleteErr := usecase.transactionRepository.UndeleteTransactionById(ctxWithTx, transaction.Id); undeleteErr != nil {
				return undeleteErr
			}
			transaction.DeletedAt = nil

			if reserveErr := usecase.availabilityService.ForceReserve(ctxWithTx, transaction.TransactionItems); reserveErr != nil {
				return reserveErr
			}
		}

		if err := usecase.paymentService.PayTransaction(ctxWithTx, transaction, walletId, paidAmount); err != nil {
			return err
		}

		if !hasLinkedPayment {
			return nil
		}
		return usecase.transactionService.SettleOrderPayment(ctxWithTx, linkedPayment)
	})
	// FR-4: kicked after the commit so the cashier's HTTP response never waits on Expo.
	if err == nil {
		usecase.kdsNotificationService.TriggerDispatch()
	}
	return err
}

func (usecase TransactionUsecase) UnpayTransaction(ctx context.Context, id int64) *Error {
	return usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		transaction, err := usecase.transactionRepository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if transaction.PaidAt == nil {
			return &Error{Type: BadRequest, Message: "transaction already unpaid"}
		}

		now := time.Now()
		if now.Sub(transaction.CreatedAt) > 24*time.Hour {
			return &Error{Type: BadRequest, Message: "cannot unpay if more than 24 hours"}
		}

		paymentWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, *transaction.WalletId)
		if err != nil {
			return err
		}

		paymentCost := transaction.Total * paymentWallet.PaymentCostPercentage / 100
		newBalance := paymentWallet.Balance - (transaction.Total - paymentCost)

		if _, err := usecase.walletRepository.UpdateWalletById(ctxWithTx, Wallet{
			Name:                  paymentWallet.Name,
			PaymentCostPercentage: paymentWallet.PaymentCostPercentage,
			Balance:               newBalance,
			IsCashless:            paymentWallet.IsCashless,
			IsPaymentTarget:       paymentWallet.IsPaymentTarget,
		},
			*transaction.WalletId); err != nil {
			return err
		}

		return usecase.transactionRepository.UnpayTransaction(ctxWithTx, id)
	})
}

func (usecase TransactionUsecase) CompleteTransaction(ctx context.Context, id int64) *Error {
	err := usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		transaction, err := usecase.transactionRepository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if transaction.DeletedAt != nil {
			return &Error{Type: NotFound, Message: "transaction not found"}
		}

		if transaction.Source != TransactionSourceOrder {
			return &Error{Type: BadRequest, Message: "only order transactions can be completed"}
		}

		if transaction.CompletedAt != nil {
			return &Error{Type: BadRequest, Message: "transaction already completed"}
		}

		var sessionId *string
		var whatsappNumber *string
		payment, paymentErr := usecase.paymentRepository.GetPaymentByTransactionId(ctxWithTx, id)
		if paymentErr != nil {
			if paymentErr.Type != NotFound {
				return paymentErr
			}
		} else {
			if payment.IsAwaitingCodVerification() {
				return &Error{Type: BadRequest, Message: "verify the order before marking it ready"}
			}
			sessionId = &payment.SessionId
			whatsappNumber = payment.CustomerWhatsappNumber
		}

		if err := usecase.transactionRepository.CompleteTransaction(ctxWithTx, time.Now(), id); err != nil {
			return err
		}

		return usecase.guestNotificationRepository.EnqueueForCompletedTransaction(ctxWithTx, transaction, sessionId, whatsappNumber)
	})
	if err == nil {
		usecase.guestNotificationService.TriggerDispatch()
	}
	return err
}

func (usecase TransactionUsecase) UncompleteTransaction(ctx context.Context, id int64) *Error {
	return usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		transaction, err := usecase.transactionRepository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if transaction.DeletedAt != nil {
			return &Error{Type: NotFound, Message: "transaction not found"}
		}

		if transaction.Source != TransactionSourceOrder {
			return &Error{Type: BadRequest, Message: "only order transactions can be uncompleted"}
		}

		if transaction.CompletedAt == nil {
			return &Error{Type: BadRequest, Message: "transaction is not completed"}
		}

		return usecase.transactionRepository.UncompleteTransaction(ctxWithTx, id)
	})
}

func (usecase TransactionUsecase) GetTransactionStatistics(ctx context.Context, groupBy string, startDate *time.Time, endDate *time.Time) ([]TransactionStatistic, *Error) {
	if startDate != nil && endDate != nil && startDate.After(*endDate) {
		return []TransactionStatistic{}, &Error{Type: BadRequest, Message: "startDate must be on or before endDate"}
	}

	return usecase.transactionRepository.GetTransactionStatistics(ctx, groupBy, startDate, endDate)
}
