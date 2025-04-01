package calculation

import (
	"apps/api/domain/base"
	"apps/api/domain/wallet"
	"context"
	"time"
)

type Usecase struct {
	calculationRepository Repository
	walletRepository      wallet.Repository
}

func NewUsecase(calculationRepository Repository, walletRepository wallet.Repository) Usecase {
	return Usecase{
		calculationRepository: calculationRepository,
		walletRepository:      walletRepository,
	}
}

func (usecase Usecase) GetCalculationList(ctx context.Context, sortBy base.SortBy, order base.Order, skip int, limit int) ([]Calculation, *base.Error) {
	return usecase.calculationRepository.GetCalculationList(ctx, sortBy, order, skip, limit)
}

func (usecase Usecase) GetCalculationById(ctx context.Context, id int64) (Calculation, *base.Error) {
	return usecase.calculationRepository.GetCalculationById(ctx, id)
}

func (usecase Usecase) CreateCalculation(ctx context.Context, calculationRequest Calculation) *base.Error {
	return usecase.calculationRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		var totalCalculation float32
		for _, item := range calculationRequest.CalculationItems {
			totalCalculation += item.Price * float32(item.Amount)
		}

		wallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, calculationRequest.WalletId)
		if err != nil {
			return err
		}

		calculation := Calculation{
			CreatedAt:        time.Now(),
			UpdatedAt:        time.Now(),
			WalletId:         calculationRequest.WalletId,
			TotalWallet:      wallet.Balance,
			TotalCalculation: totalCalculation,
		}
		if err := usecase.calculationRepository.CreateCalculation(ctxWithTx, &calculation); err != nil {
			return err
		}

		var calculationItems []CalculationItem

		for _, item := range calculationRequest.CalculationItems {
			subtotal := item.Price * float32(item.Amount)
			calculationItems = append(calculationItems, CalculationItem{
				CalculationId: calculation.Id,
				Price:         item.Price,
				Amount:        item.Amount,
				Subtotal:      subtotal,
			})
		}

		return usecase.calculationRepository.CreateCalculationItems(ctxWithTx, calculationItems)
	})
}

func (usecase Usecase) UpdateCalculationById(ctx context.Context, calculationRequest Calculation, id int64) *base.Error {
	return usecase.calculationRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		existingCalculation, err := usecase.calculationRepository.GetCalculationById(ctxWithTx, id)
		if err != nil {
			return err
		}

		var totalCalculation float32
		for _, item := range calculationRequest.CalculationItems {
			totalCalculation += item.Price * float32(item.Amount)
		}

		calculation := Calculation{
			UpdatedAt:        time.Now(),
			TotalCalculation: totalCalculation,
		}

		if err := usecase.calculationRepository.UpdateCalculationById(ctxWithTx, &calculation, id); err != nil {
			return err
		}

		var calculationItems []CalculationItem

		for _, item := range calculationRequest.CalculationItems {
			subtotal := item.Price * float32(item.Amount)
			calculationItems = append(calculationItems, CalculationItem{
				Id:            item.Id,
				CalculationId: id,
				Price:         item.Price,
				Amount:        item.Amount,
				Subtotal:      subtotal,
			})
		}

		if err := usecase.calculationRepository.CreateCalculationItems(ctxWithTx, calculationItems); err != nil {
			return err
		}

		newIds := make(map[int64]bool)
		for _, calculationRequestItem := range calculationItems {
			newIds[calculationRequestItem.Id] = true
		}

		for _, item := range existingCalculation.CalculationItems {
			if !newIds[item.Id] {
				if err := usecase.calculationRepository.DeleteCalculationItemById(ctxWithTx, item.Id); err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (usecase Usecase) DeleteCalculationById(ctx context.Context, id int64) *base.Error {
	return usecase.calculationRepository.DeleteCalculationById(ctx, id)
}
