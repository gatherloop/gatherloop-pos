package transaction

import (
	"apps/api/domain/base"
	"apps/api/domain/budget"
	"apps/api/domain/coupon"
	"apps/api/domain/variant"
	"apps/api/domain/wallet"
	"apps/api/utils"
	"context"
	"time"
)

type Usecase struct {
	repository        Repository
	variantRepository variant.Repository
	couponRepository  coupon.Repository
	walletRepository  wallet.Repository
	budgetRepository  budget.Repository
}

func NewUsecase(repository Repository, variantRepository variant.Repository, couponRepository coupon.Repository, walletRepository wallet.Repository, budgetRepository budget.Repository) Usecase {
	return Usecase{
		repository:        repository,
		variantRepository: variantRepository,
		couponRepository:  couponRepository,
		walletRepository:  walletRepository,
		budgetRepository:  budgetRepository,
	}
}

func (usecase Usecase) GetTransactionList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, paymentStatus PaymentStatus, walletId *int) ([]Transaction, int64, *base.Error) {
	transactions, err := usecase.repository.GetTransactionList(ctx, query, sortBy, order, skip, limit, paymentStatus, walletId)
	if err != nil {
		return []Transaction{}, 0, err
	}

	total, err := usecase.repository.GetTransactionListTotal(ctx, query, paymentStatus, walletId)
	if err != nil {
		return []Transaction{}, 0, err
	}

	return transactions, total, nil
}

func (usecase Usecase) GetTransactionById(ctx context.Context, id int64) (Transaction, *base.Error) {
	return usecase.repository.GetTransactionById(ctx, id)
}

func (usecase Usecase) CreateTransaction(ctx context.Context, transactionRequest Transaction) (int64, *base.Error) {
	transaction := Transaction{
		CreatedAt:   time.Now(),
		Name:        transactionRequest.Name,
		OrderNumber: transactionRequest.OrderNumber,
		Total:       0,
	}

	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		err := usecase.repository.CreateTransaction(ctxWithTx, &transaction)
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

		if err := usecase.repository.CreateTransactionItems(ctxWithTx, transactionItems); err != nil {
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
			case coupon.Fixed:
				couponDiscountAmount = int(couponItem.Amount)
			case coupon.Percentage:
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
			if err := usecase.repository.CreateTransactionCoupons(ctxWithTx, transactionCoupons); err != nil {
				return err
			}
		}

		return usecase.repository.UpdateTransactionById(ctxWithTx, &Transaction{Total: transaction.Total}, transaction.Id)
	})

	return transaction.Id, err
}

func (usecase Usecase) UpdateTransactionById(ctx context.Context, transactionRequest Transaction, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		existingTransaction, err := usecase.repository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if existingTransaction.PaidAt != nil {
			return &base.Error{Type: base.BadRequest, Message: "cannot update paid transaction"}
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

		if err := usecase.repository.CreateTransactionItems(ctxWithTx, transactionItems); err != nil {
			return err
		}

		newIds := make(map[int64]bool)
		for _, item := range transactionItems {
			newIds[item.Id] = true
		}

		for _, item := range existingTransaction.TransactionItems {
			if !newIds[item.Id] {
				if err := usecase.repository.DeleteTransactionItemById(ctxWithTx, item.Id); err != nil {
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
			case coupon.Fixed:
				couponDiscountAmount = int(couponItem.Amount)
			case coupon.Percentage:
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
			if err := usecase.repository.CreateTransactionCoupons(ctxWithTx, transactionCoupons); err != nil {
				return err
			}
		}

		newTransactionCouponIds := make(map[int64]bool)
		for _, couponitem := range transactionCoupons {
			newTransactionCouponIds[couponitem.Id] = true
		}

		for _, couponItem := range existingTransaction.TransactionCoupons {
			if !newTransactionCouponIds[couponItem.Id] {
				if err := usecase.repository.DeleteTransactionCouponById(ctxWithTx, couponItem.Id); err != nil {
					return err
				}
			}
		}

		return usecase.repository.UpdateTransactionById(ctxWithTx, &transaction, id)
	})
}

func (usecase Usecase) DeleteTransactionById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		transaction, err := usecase.repository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if transaction.PaidAt != nil {
			return &base.Error{Type: base.BadRequest, Message: "transaction already paid"}
		}

		return usecase.repository.DeleteTranscationById(ctxWithTx, id)
	})
}

func (usecase Usecase) PayTransaction(ctx context.Context, walletId int64, paidAmount float32, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		transaction, err := usecase.repository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if transaction.PaidAt != nil {
			return &base.Error{Type: base.BadRequest, Message: "transaction already paid"}
		}

		paymentWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, walletId)
		if err != nil {
			return err
		}

		paymentCost := transaction.Total * paymentWallet.PaymentCostPercentage / 100
		newBalance := paymentWallet.Balance + transaction.Total - paymentCost

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, &wallet.Wallet{
			Name:                  paymentWallet.Name,
			PaymentCostPercentage: paymentWallet.PaymentCostPercentage,
			Balance:               newBalance,
			IsCashless:            paymentWallet.IsCashless,
		},
			walletId); err != nil {
			return err
		}

		variantMaterials := []variant.VariantMaterial{}

		for _, item := range transaction.TransactionItems {
			variantMaterials = append(variantMaterials, item.Variant.Materials...)
		}

		var foodCost float32
		for _, variantMaterial := range variantMaterials {
			foodCost += variantMaterial.Amount * variantMaterial.Material.Price
		}

		totalIncome := transaction.Total - paymentCost - foodCost

		if err := usecase.repository.UpdateTransactionById(ctxWithTx, &Transaction{TotalIncome: totalIncome}, id); err != nil {
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

			if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &budget.Budget{Balance: newBalance}, budgetItem.Id); err != nil {
				return err
			}
		}
		return usecase.repository.PayTransaction(ctxWithTx, walletId, time.Now(), paidAmount, id)
	})
}

func (usecase Usecase) UnpayTransaction(ctx context.Context, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		transaction, err := usecase.repository.GetTransactionById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if transaction.PaidAt == nil {
			return &base.Error{Type: base.BadRequest, Message: "transaction already unpaid"}
		}

		now := time.Now()
		if now.Sub(transaction.CreatedAt) > 24*time.Hour {
			return &base.Error{Type: base.BadRequest, Message: "cannot unpay if more than 24 hours"}
		}

		paymentWallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, *transaction.WalletId)
		if err != nil {
			return err
		}

		paymentCost := transaction.Total * paymentWallet.PaymentCostPercentage / 100
		newBalance := paymentWallet.Balance - (transaction.Total - paymentCost)

		if err := usecase.walletRepository.UpdateWalletById(ctxWithTx, &wallet.Wallet{
			Name:                  paymentWallet.Name,
			PaymentCostPercentage: paymentWallet.PaymentCostPercentage,
			Balance:               newBalance,
			IsCashless:            paymentWallet.IsCashless,
		},
			*transaction.WalletId); err != nil {
			return err
		}

		variantMaterials := []variant.VariantMaterial{}

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

			if err := usecase.budgetRepository.UpdateBudgetById(ctxWithTx, &budget.Budget{Balance: newBalance}, budgetItem.Id); err != nil {
				return err
			}
		}
		return usecase.repository.UnpayTransaction(ctxWithTx, id)
	})
}

func (usecase Usecase) GetTransactionStatistics(ctx context.Context, groupBy string) ([]TransactionStatistic, *base.Error) {
	return usecase.repository.GetTransactionStatistics(ctx, groupBy)
}
