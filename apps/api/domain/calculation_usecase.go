package domain

import (
	"context"
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

func (usecase CalculationUsecase) CreateCalculation(ctx context.Context, calculation Calculation) (Calculation, *Error) {
	var created Calculation
	err := usecase.calculationRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		// calculate total based on items
		var totalCalculation float32
		for _, item := range calculation.CalculationItems {
			totalCalculation += item.Price * float32(item.Amount)
		}
		calculation.TotalCalculation = totalCalculation

		// calculate total wallet balance for the associated wallet
		wallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, calculation.WalletId)
		if err != nil {
			return err
		}
		calculation.TotalWallet = wallet.Balance

		for i, item := range calculation.CalculationItems {
			subtotal := item.Price * float32(item.Amount)
			calculation.CalculationItems[i].Subtotal = subtotal
		}

		createdCalc, err := usecase.calculationRepository.CreateCalculation(ctxWithTx, calculation)
		if err != nil {
			return err
		}

		created = createdCalc
		return nil
	})
	return created, err
}

func (usecase CalculationUsecase) UpdateCalculationById(ctx context.Context, calculationRequest Calculation, id int64) (Calculation, *Error) {
	var updatedCalc Calculation
	err := usecase.calculationRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		// check if calculation exists and is not completed before allowing update
		existingCalculation, err := usecase.calculationRepository.GetCalculationById(ctxWithTx, id)
		if err != nil {
			return err
		}
		if existingCalculation.CompletedAt != nil {
			return &Error{Type: BadRequest, Message: "cannot update completed calculation"}
		}

		// calculate total based on request data
		var totalCalculation float32
		for _, item := range calculationRequest.CalculationItems {
			totalCalculation += item.Price * float32(item.Amount)
		}
		calculationRequest.TotalCalculation = totalCalculation

		// calculate total wallet balance for the associated wallet
		wallet, err := usecase.walletRepository.GetWalletById(ctxWithTx, calculationRequest.WalletId)
		if err != nil {
			return err
		}
		calculationRequest.TotalWallet = wallet.Balance

		// calculate subtotals for each item
		for index, item := range calculationRequest.CalculationItems {
			subtotal := item.Price * float32(item.Amount)
			calculationRequest.CalculationItems[index].Subtotal = subtotal
		}

		// perform update calculation
		updated, err := usecase.calculationRepository.UpdateCalculationById(ctxWithTx, calculationRequest, id)
		if err != nil {
			return err
		}
		updatedCalc = updated
		return nil
	})

	if err != nil {
		return Calculation{}, err
	}

	return updatedCalc, nil
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
