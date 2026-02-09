package domain

import (
	"apps/api/utils"
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

func (usecase TransactionUsecase) CreateTransaction(ctx context.Context, transactionRequest Transaction) (int64, *Error) {
	transaction := Transaction{
		CreatedAt:   time.Now(),
		Name:        transactionRequest.Name,
		OrderNumber: transactionRequest.OrderNumber,
		Total:       0,
	}

	err := usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		err := usecase.transactionRepository.CreateTransaction(ctxWithTx, &transaction)
		if err != nil {
			return err
		}

		var transactionItems []TransactionItem

		for _, item := range transactionRequest.TransactionItems {
			variant, err := usecase.variantRepository.GetVariantById(ctxWithTx, item.VariantId)
			if err != nil {
				return err
			}

			subTotal := (variant.Price * item.Amount) - item.DiscountAmount
			transaction.Total += subTotal

			transactionItem := TransactionItem{
				TransactionId:  transaction.Id,
				VariantId:      item.VariantId,
				Amount:         item.Amount,
				DiscountAmount: item.DiscountAmount,
				Subtotal:       subTotal,
				Price:          variant.Price,
				Note:           item.Note,
			}

			transactionItems = append(transactionItems, transactionItem)
		}

		if err := usecase.transactionRepository.CreateTransactionItems(ctxWithTx, transactionItems); err != nil {
			return err
		}

		var transactionCoupons []TransactionCoupon

		for _, transactionCoupon := range transactionRequest.TransactionCoupons {
			couponItem, err := usecase.couponRepository.GetCouponById(ctxWithTx, transactionCoupon.CouponId)
			if err != nil {
				return err
			}

			couponDiscountAmount := 0
			switch couponItem.Type {
			case Fixed:
				couponDiscountAmount = int(couponItem.Amount)
			case Percentage:
				couponDiscountAmount = utils.RoundToNearest500(int(transaction.Total) * int(couponItem.Amount) / 100)
			}

			transaction.Total -= float32(couponDiscountAmount)

			transactionCoupons = append(transactionCoupons, TransactionCoupon{
				CouponId:      transactionCoupon.CouponId,
				Type:          couponItem.Type,
				Amount:        couponItem.Amount,
				TransactionId: transaction.Id,
			})
		}

		if len(transactionCoupons) > 0 {
			if err := usecase.transactionRepository.CreateTransactionCoupons(ctxWithTx, transactionCoupons); err != nil {
				return err
			}
		}

		return usecase.transactionRepository.UpdateTransactionById(ctxWithTx, &Transaction{Total: transaction.Total}, transaction.Id)
	})

	return transaction.Id, err
}

func (usecase TransactionUsecase) UpdateTransactionById(ctx context.Context, transactionRequest Transaction, id int64) *Error {
	return usecase.transactionRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existingTransaction, err := usecase.transactionRepository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if existingTransaction.PaidAt != nil {
			return &Error{Type: BadRequest, Message: "cannot update paid transaction"}
		}

		transaction := Transaction{
			Name:        transactionRequest.Name,
			OrderNumber: transactionRequest.OrderNumber,
			Total:       0,
		}

		var transactionItems []TransactionItem

		for _, item := range transactionRequest.TransactionItems {
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
			}

			transactionItems = append(transactionItems, transactionItem)
		}

		if err := usecase.transactionRepository.CreateTransactionItems(ctxWithTx, transactionItems); err != nil {
			return err
		}

		newIds := make(map[int64]bool)
		for _, item := range transactionItems {
			newIds[item.Id] = true
		}

		for _, item := range existingTransaction.TransactionItems {
			if !newIds[item.Id] {
				if err := usecase.transactionRepository.DeleteTransactionItemById(ctxWithTx, item.Id); err != nil {
					return err
				}
			}
		}

		var transactionCoupons []TransactionCoupon

		for _, transactionCoupon := range transactionRequest.TransactionCoupons {
			couponItem, err := usecase.couponRepository.GetCouponById(ctxWithTx, transactionCoupon.CouponId)
			if err != nil {
				return err
			}

			couponDiscountAmount := 0
			switch couponItem.Type {
			case Fixed:
				couponDiscountAmount = int(couponItem.Amount)
			case Percentage:
				couponDiscountAmount = utils.RoundToNearest500(int(transaction.Total) * int(couponItem.Amount) / 100)
			}

			transaction.Total -= float32(couponDiscountAmount)

			transactionCoupons = append(transactionCoupons, TransactionCoupon{
				CouponId:      transactionCoupon.CouponId,
				Type:          couponItem.Type,
				Amount:        couponItem.Amount,
				TransactionId: id,
				Id:            transactionCoupon.Id,
			})
		}

		if len(transactionCoupons) > 0 {
			if err := usecase.transactionRepository.CreateTransactionCoupons(ctxWithTx, transactionCoupons); err != nil {
				return err
			}
		}

		newTransactionCouponIds := make(map[int64]bool)
		for _, couponitem := range transactionCoupons {
			newTransactionCouponIds[couponitem.Id] = true
		}

		for _, couponItem := range existingTransaction.TransactionCoupons {
			if !newTransactionCouponIds[couponItem.Id] {
				if err := usecase.transactionRepository.DeleteTransactionCouponById(ctxWithTx, couponItem.Id); err != nil {
					return err
				}
			}
		}

		return usecase.transactionRepository.UpdateTransactionById(ctxWithTx, &transaction, id)
	})
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

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, &Wallet{
			Name:                  paymentWallet.Name,
			PaymentCostPercentage: paymentWallet.PaymentCostPercentage,
			Balance:               newBalance,
			IsCashless:            paymentWallet.IsCashless,
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

		if err := usecase.transactionRepository.UpdateTransactionById(ctxWithTx, &Transaction{TotalIncome: totalIncome}, id); err != nil {
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

			if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &Budget{Balance: newBalance}, budgetItem.Id); err != nil {
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

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, &Wallet{
			Name:                  paymentWallet.Name,
			PaymentCostPercentage: paymentWallet.PaymentCostPercentage,
			Balance:               newBalance,
			IsCashless:            paymentWallet.IsCashless,
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

			if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &Budget{Balance: newBalance}, budgetItem.Id); err != nil {
				return err
			}
		}
		return usecase.transactionRepository.UnpayTransaction(ctxWithTx, id)
	})
}

func (usecase TransactionUsecase) GetTransactionStatistics(ctx context.Context, groupBy string) ([]TransactionStatistic, *Error) {
	return usecase.transactionRepository.GetTransactionStatistics(ctx, groupBy)
}
