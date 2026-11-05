package domain

import (
	"context"
)

type CalculationUsecase struct {
	calculationRepoPort CalculationRepoPort
	walletRepoPort      WalletRepoPort
}

func NewCalculationUsecase(calculationRepoPort CalculationRepoPort, walletRepoPort WalletRepoPort) CalculationUsecase {
	return CalculationUsecase{
		calculationRepoPort: calculationRepoPort,
		walletRepoPort:      walletRepoPort,
	}
}

func (usecase CalculationUsecase) GetCalculationList(ctx context.Context, sortBy SortBy, order Order, skip int, limit int) ([]Calculation, *Error) {
	return usecase.calculationRepoPort.GetCalculationList(ctx, sortBy, order, skip, limit)
}

func (usecase CalculationUsecase) GetCalculationById(ctx context.Context, id int64) (Calculation, *Error) {
	return usecase.calculationRepoPort.GetCalculationById(ctx, id)
}

func (usecase CalculationUsecase) CreateCalculation(ctx context.Context, calculation Calculation) (Calculation, *Error) {
	var created Calculation
	err := usecase.calculationRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		var totalCalculation float32
		for _, item := range calculation.CalculationItems {
			totalCalculation += item.Price * float32(item.Amount)
		}
		calculation.TotalCalculation = totalCalculation

		wallet, err := usecase.walletRepoPort.GetWalletById(ctxWithTx, calculation.WalletId)
		if err != nil {
			return err
		}
		calculation.TotalWallet = wallet.Balance

		for i, item := range calculation.CalculationItems {
			subtotal := item.Price * float32(item.Amount)
			calculation.CalculationItems[i].Subtotal = subtotal
		}

		createdCalc, err := usecase.calculationRepoPort.CreateCalculation(ctxWithTx, calculation)
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
	err := usecase.calculationRepoPort.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		existingCalculation, err := usecase.calculationRepoPort.GetCalculationById(ctxWithTx, id)
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
		calculationRequest.TotalCalculation = totalCalculation

		wallet, err := usecase.walletRepoPort.GetWalletById(ctxWithTx, calculationRequest.WalletId)
		if err != nil {
			return err
		}
		calculationRequest.TotalWallet = wallet.Balance

		for index, item := range calculationRequest.CalculationItems {
			subtotal := item.Price * float32(item.Amount)
			calculationRequest.CalculationItems[index].Subtotal = subtotal
		}

		updated, err := usecase.calculationRepoPort.UpdateCalculationById(ctxWithTx, calculationRequest, id)
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
	existingCalculation, err := usecase.calculationRepoPort.GetCalculationById(ctx, id)
	if err != nil {
		return err
	}

	if existingCalculation.CompletedAt != nil {
		return &Error{Type: BadRequest, Message: "cannot delete completed calculation"}
	}

	return usecase.calculationRepoPort.DeleteCalculationById(ctx, id)
}

func (usecase CalculationUsecase) CompleteCalculationById(ctx context.Context, id int64) *Error {
	return usecase.calculationRepoPort.CompleteCalculationById(ctx, id)
}
