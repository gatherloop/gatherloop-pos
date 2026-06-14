package domain

import (
	"context"
	"time"
)

type TransactionUsecase struct {
	transactionRepository TransactionRepository
	variantRepository     VariantRepository
	couponRepository      CouponRepository
	walletRepository      WalletRepository
	budgetRepository      BudgetRepository
}

func NewTransactionUsecase(transactionRepository TransactionRepository, variantRepository VariantRepository, couponRepository CouponRepository, walletRepository WalletRepository, budgetRepository BudgetRepository) TransactionUsecase {
	return TransactionUsecase{
		transactionRepository: transactionRepository,
		variantRepository:     variantRepository,
		couponRepository:      couponRepository,
		walletRepository:      walletRepository,
		budgetRepository:      budgetRepository,
	}
}

func (usecase TransactionUsecase) GetTransactionList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, paymentStatus PaymentStatus, walletId *int) ([]Transaction, int64, *Error) {
	transactions, err := usecase.transactionRepository.GetTransactionList(ctx, query, sortBy, order, skip, limit, paymentStatus, walletId)
	if err != nil {
		return []Transaction{}, 0, err
	}

	total, err := usecase.transactionRepository.GetTransactionListTotal(ctx, query, paymentStatus, walletId)
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

	err := usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {

		// Calculate total
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

		// Apply whole-bill and item-linked coupons
		if err := usecase.applyTransactionCoupons(ctxWithTx, &transaction, createdTransaction.Id); err != nil {
			return err
		}

		// Create transaction
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

		// Index existing items so rental-linked items keep the duration-based
		// price/subtotal that was calculated at checkout. The update request
		// payload does not carry Price or RentalId, so recalculating these
		// items from the variant's base price would corrupt their values and
		// drop the rental link.
		existingItemsById := map[int64]TransactionItem{}
		for _, existingItem := range existingTransaction.TransactionItems {
			existingItemsById[existingItem.Id] = existingItem
		}

		for index, item := range transaction.TransactionItems {
			if existingItem, ok := existingItemsById[item.Id]; ok && existingItem.RentalId != nil {
				// Preserve the duration-based Price and the rental link (#131):
				// the update payload carries neither, and recalculating from the
				// variant's base price would corrupt them. The DiscountAmount,
				// however, must come from the request so a per-item coupon can be
				// removed — otherwise the discount baked in at apply time would be
				// re-preserved here forever. Subtotal is re-derived from the
				// preserved Price; if a coupon row still targets this item,
				// applyTransactionCoupons overwrites both below.
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

		// Apply whole-bill and item-linked coupons
		if err := usecase.applyTransactionCoupons(ctxWithTx, &transaction, id); err != nil {
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

		return usecase.transactionRepository.DeleteTransactionById(ctxWithTx, id)
	})
}

func (usecase TransactionUsecase) PayTransaction(ctx context.Context, walletId int64, paidAmount float32, id int64) *Error {
	return usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		transaction, err := usecase.transactionRepository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if transaction.PaidAt != nil {
			return &Error{Type: BadRequest, Message: "transaction already paid"}
		}

		paymentWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, walletId)
		if err != nil {
			return err
		}

		paymentCost := transaction.Total * paymentWallet.PaymentCostPercentage / 100
		newBalance := paymentWallet.Balance + transaction.Total - paymentCost

		if _, err := usecase.walletRepository.UpdateWalletById(ctxWithTx, Wallet{
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

		if _, err := usecase.transactionRepository.UpdateTransactionById(ctxWithTx, Transaction{TotalIncome: totalIncome}, id); err != nil {
			return err
		}

		budgetList, err := usecase.budgetRepository.GetBudgetList(ctxWithTx)
		if err != nil {
			return err
		}

		for _, budgetItem := range budgetList {
			var restockBudgetId int64 = 4

			var newBalance float32

			if budgetItem.Id == restockBudgetId {
				newBalance = budgetItem.Balance + foodCost
			} else {
				addition := totalIncome * budgetItem.Percentage / 100
				newBalance = budgetItem.Balance + addition
			}

			if _, err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, Budget{Balance: newBalance}, budgetItem.Id); err != nil {
				return err
			}
		}
		return usecase.transactionRepository.PayTransaction(ctxWithTx, walletId, time.Now(), paidAmount, id)
	})
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

		variantMaterials := []VariantMaterial{}

		for _, item := range transaction.TransactionItems {
			variantMaterials = append(variantMaterials, item.Variant.Materials...)
		}

		var foodCost float32
		for _, variantMaterial := range variantMaterials {
			foodCost += variantMaterial.Amount * variantMaterial.Material.Price
		}

		totalIncome := transaction.Total - paymentCost - foodCost

		budgetList, err := usecase.budgetRepository.GetBudgetList(ctxWithTx)
		if err != nil {
			return err
		}

		for _, budgetItem := range budgetList {
			var restockBudgetId int64 = 4

			var newBalance float32

			if budgetItem.Id == restockBudgetId {
				newBalance = budgetItem.Balance - foodCost
			} else {
				addition := totalIncome * budgetItem.Percentage / 100
				newBalance = budgetItem.Balance - addition
			}

			if _, err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, Budget{Balance: newBalance}, budgetItem.Id); err != nil {
				return err
			}
		}
		return usecase.transactionRepository.UnpayTransaction(ctxWithTx, id)
	})
}

func (usecase TransactionUsecase) GetTransactionStatistics(ctx context.Context, groupBy string) ([]TransactionStatistic, *Error) {
	return usecase.transactionRepository.GetTransactionStatistics(ctx, groupBy)
}

// applyTransactionCoupons resolves each TransactionCoupon against the coupon
// repository and applies its discount via ApplyCouponToBase.
//
// A coupon with TransactionItemId set discounts that line: the discount is
// computed against the line's pre-discount base (Price * Amount, which #131
// keeps stable across edits for rental items) and written to the item's
// DiscountAmount/Subtotal, with transaction.Total adjusted by the resulting
// delta. Item-linked coupons are applied first so that a whole-bill coupon
// (TransactionItemId == nil) is computed against the item-adjusted Total, per
// the PRD's Total = Σ item.Subtotal − whole-bill discounts.
//
// Every TransactionCoupon is rewritten with a {type, amount, transactionItemId}
// snapshot of the coupon at apply time.
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

// snapshotVariantValues copies the currently selected option / option-value
// names off the variant so the transaction item keeps a stable record even if
// the product's options are later edited or deleted. The variant must have
// Product.Options and VariantValues.OptionValue preloaded.
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
