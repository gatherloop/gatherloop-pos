package domain

import (
	"context"
	"time"
)

type CalculationUsecase struct {
	calculationRepository CalculationRepository
	walletRepository      WalletRepository
}

func NewCalculationUsecase(calculationRepository CalculationRepository, walletRepository WalletRepository) CalculationUsecase {
	return CalculationUsecase{
		calculationRepository: calculationRepository,
		walletRepository:      walletRepository,
	}
}

func (usecase CalculationUsecase) GetCalculationList(ctx context.Context, sortBy SortBy, order Order, skip int, limit int) ([]Calculation, *Error) {
	return usecase.calculationRepository.GetCalculationList(ctx, sortBy, order, skip, limit)
}

func (usecase CalculationUsecase) GetCalculationById(ctx context.Context, id int64) (Calculation, *Error) {
	return usecase.calculationRepository.GetCalculationById(ctx, id)
}

func (usecase CalculationUsecase) CreateCalculation(ctx context.Context, calculationRequest Calculation) *Error {
	return usecase.calculationRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
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

func (usecase CalculationUsecase) UpdateCalculationById(ctx context.Context, calculationRequest Calculation, id int64) *Error {
	return usecase.calculationRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existingCalculation, err := usecase.calculationRepository.GetCalculationById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if existingCalculation.CompletedAt != nil {
			return &Error{Type: BadRequest, Message: "cannot update completed calculation"}
		}

		var totalCalculation float32
		for _, item := range calculationRequest.CalculationItems {
			totalCalculation += item.Price * float32(item.Amount)
		}

		wallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, calculationRequest.WalletId)
		if err != nil {
			return err
		}

		calculation := Calculation{
			UpdatedAt:        time.Now(),
			TotalCalculation: totalCalculation,
			TotalWallet:      wallet.Balance,
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

func (usecase CalculationUsecase) DeleteCalculationById(ctx context.Context, id int64) *Error {
	existingCalculation, err := usecase.calculationRepository.GetCalculationById(ctx, id)
	if err != nil {
		return err
	}

	if existingCalculation.CompletedAt != nil {
		return &Error{Type: BadRequest, Message: "cannot delete completed calculation"}
	}

	return usecase.calculationRepository.DeleteCalculationById(ctx, id)
}

func (usecase CalculationUsecase) CompleteCalculationById(ctx context.Context, id int64) *Error {
	return usecase.calculationRepository.CompleteCalculationById(ctx, id)
}
