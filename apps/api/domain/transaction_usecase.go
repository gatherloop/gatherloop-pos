package domain

import (
	"context"
	"time"
)

type TransactionUsecase struct {
	transactionRepository       TransactionRepository
	variantRepository           VariantRepository
	couponRepository            CouponRepository
	walletRepository            WalletRepository
	availabilityReservation     AvailabilityReservation
	kdsNotificationRepository   KdsNotificationRepository
	kdsNotificationDispatcher   KdsNotificationDispatcher
	paymentRepository           PaymentRepository
	guestNotificationRepository GuestNotificationRepository
	guestNotificationDispatcher GuestNotificationDispatcher
}

func NewTransactionUsecase(transactionRepository TransactionRepository, variantRepository VariantRepository, couponRepository CouponRepository, walletRepository WalletRepository, availabilityReservation AvailabilityReservation, kdsNotificationRepository KdsNotificationRepository, kdsNotificationDispatcher KdsNotificationDispatcher, paymentRepository PaymentRepository, guestNotificationRepository GuestNotificationRepository, guestNotificationDispatcher GuestNotificationDispatcher) TransactionUsecase {
	return TransactionUsecase{
		transactionRepository:       transactionRepository,
		variantRepository:           variantRepository,
		couponRepository:            couponRepository,
		walletRepository:            walletRepository,
		availabilityReservation:     availabilityReservation,
		kdsNotificationRepository:   kdsNotificationRepository,
		kdsNotificationDispatcher:   kdsNotificationDispatcher,
		paymentRepository:           paymentRepository,
		guestNotificationRepository: guestNotificationRepository,
		guestNotificationDispatcher: guestNotificationDispatcher,
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
				Values:         snapshotVariantValues(variant),
			}

			transaction.TransactionItems[index] = transactionItem
		}

		if err := usecase.applyTransactionCoupons(ctxWithTx, &transaction, createdTransaction.Id); err != nil {
			return err
		}

		if err := usecase.availabilityReservation.Reserve(ctxWithTx, transaction.TransactionItems); err != nil {
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

	err := usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existingTransaction, err := usecase.transactionRepository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if existingTransaction.PaidAt != nil {
			return &Error{Type: BadRequest, Message: "cannot update paid transaction"}
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
				Values:         snapshotVariantValues(variant),
			}

			transaction.TransactionItems[index] = transactionItem
		}

		if err := usecase.applyTransactionCoupons(ctxWithTx, &transaction, id); err != nil {
			return err
		}

		if err := usecase.availabilityReservation.ApplyDelta(ctxWithTx, existingTransaction.TransactionItems, transaction.TransactionItems); err != nil {
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

		if err := usecase.availabilityReservation.Release(ctxWithTx, transaction.TransactionItems); err != nil {
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
		return payTransaction(ctxWithTx, transaction, usecase.transactionRepository, usecase.walletRepository, usecase.kdsNotificationRepository, walletId, paidAmount)
	})
	// FR-4: kicked after the commit so the cashier's HTTP response never waits on Expo.
	if err == nil {
		usecase.kdsNotificationDispatcher.TriggerDispatch()
	}
	return err
}

func payTransaction(ctx context.Context, transaction Transaction, transactionRepository TransactionRepository, walletRepository WalletRepository, kdsNotificationRepository KdsNotificationRepository, walletId int64, paidAmount float32) *Error {
	if transaction.PaidAt != nil {
		return &Error{Type: BadRequest, Message: "transaction already paid"}
	}

	id := transaction.Id

	paymentWallet, err := walletRepository.GetWalletById(ctx, walletId)
	if err != nil {
		return err
	}

	if !paymentWallet.IsPaymentTarget {
		return &Error{Type: BadRequest, Message: "wallet cannot receive transaction payments"}
	}

	paymentCost := transaction.Total * paymentWallet.PaymentCostPercentage / 100
	newBalance := paymentWallet.Balance + transaction.Total - paymentCost

	if _, err := walletRepository.UpdateWalletById(ctx, Wallet{
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

	if _, err := transactionRepository.UpdateTransactionById(ctx, Transaction{TotalIncome: totalIncome}, id); err != nil {
		return err
	}

	// FR-1: enqueued after the wallet and income writes succeed, atomic with the payment (D5).
	if err := kdsNotificationRepository.EnqueueForTransaction(ctx, transaction, KdsNotificationKindOrderPaid); err != nil {
		return err
	}

	return transactionRepository.PayTransaction(ctx, walletId, time.Now(), paidAmount, id)
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

		if err := usecase.transactionRepository.CompleteTransaction(ctxWithTx, time.Now(), id); err != nil {
			return err
		}

		// FR-2: no payment for the transaction is tolerated as a skipped notification, not a
		// failed completion the barista already performed.
		var sessionId *string
		payment, paymentErr := usecase.paymentRepository.GetPaymentByTransactionId(ctxWithTx, id)
		if paymentErr != nil {
			if paymentErr.Type != NotFound {
				return paymentErr
			}
		} else {
			sessionId = &payment.SessionId
		}

		return usecase.guestNotificationRepository.EnqueueForCompletedTransaction(ctxWithTx, transaction, sessionId)
	})
	// FR-4/Phase 5: kicked after the commit so the barista's HTTP response never waits on a push service.
	if err == nil {
		usecase.guestNotificationDispatcher.TriggerDispatch()
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

		if err := usecase.transactionRepository.UncompleteTransaction(ctxWithTx, id); err != nil {
			return err
		}

		// D7: the correction removed the fact the outbox row recorded, so a re-completion must
		// enqueue fresh rather than be suppressed by the unique key.
		return usecase.guestNotificationRepository.DeleteGuestNotificationByTransactionId(ctxWithTx, id)
	})
}

func (usecase TransactionUsecase) GetTransactionStatistics(ctx context.Context, groupBy string, startDate *time.Time, endDate *time.Time) ([]TransactionStatistic, *Error) {
	if startDate != nil && endDate != nil && startDate.After(*endDate) {
		return []TransactionStatistic{}, &Error{Type: BadRequest, Message: "startDate must be on or before endDate"}
	}

	return usecase.transactionRepository.GetTransactionStatistics(ctx, groupBy, startDate, endDate)
}

func (usecase TransactionUsecase) applyTransactionCoupons(ctx context.Context, transaction *Transaction, transactionId int64) *Error {
	itemIndexById := map[int64]int{}
	for index, item := range transaction.TransactionItems {
		itemIndexById[item.Id] = index
	}

	usedItemIds := map[int64]bool{}
	wholeBillCoupons := []Coupon{}

	for index, transactionCoupon := range transaction.TransactionCoupons {
		coupon, err := usecase.couponRepository.GetCouponById(ctx, transactionCoupon.CouponId)
		if err != nil {
			return err
		}

		if transactionCoupon.TransactionItemId == nil {
			wholeBillCoupons = append(wholeBillCoupons, coupon)
		} else {
			itemId := *transactionCoupon.TransactionItemId

			if usedItemIds[itemId] {
				return &Error{Type: BadRequest, Message: "only one coupon allowed per transaction item"}
			}
			usedItemIds[itemId] = true

			itemIndex, ok := itemIndexById[itemId]
			if !ok {
				return &Error{Type: BadRequest, Message: "transaction item not found for coupon"}
			}

			item := &transaction.TransactionItems[itemIndex]
			base := item.Price * item.Amount

			discount, err := ApplyCouponToBase(base, coupon)
			if err != nil {
				return err
			}

			newSubtotal := base - discount
			transaction.Total += newSubtotal - item.Subtotal
			item.DiscountAmount = discount
			item.Subtotal = newSubtotal
		}

		transaction.TransactionCoupons[index] = TransactionCoupon{
			Id:                transactionCoupon.Id,
			TransactionId:     transactionId,
			CouponId:          transactionCoupon.CouponId,
			Type:              coupon.Type,
			Amount:            coupon.Amount,
			TransactionItemId: transactionCoupon.TransactionItemId,
		}
	}

	for _, coupon := range wholeBillCoupons {
		discount, err := ApplyCouponToBase(transaction.Total, coupon)
		if err != nil {
			return err
		}
		transaction.Total -= discount
	}

	return nil
}

func snapshotVariantValues(variant Variant) []TransactionItemValue {
	optionNamesById := map[int64]string{}
	for _, opt := range variant.Product.Options {
		optionNamesById[opt.Id] = opt.Name
	}

	values := []TransactionItemValue{}
	for _, vv := range variant.VariantValues {
		values = append(values, TransactionItemValue{
			OptionName:      optionNamesById[vv.OptionValue.OptionId],
			OptionValueName: vv.OptionValue.Name,
		})
	}
	return values
}
