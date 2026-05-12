package domain

import (
	"context"
	"time"
)

type RentalUsecase struct {
	rentalRepository      RentalRepository
	variantRepository     VariantRepository
	transactionRepository TransactionRepository
}

func NewRentalUsecase(rentalRepository RentalRepository, variantRepository VariantRepository, transactionRepository TransactionRepository) RentalUsecase {
	return RentalUsecase{
		rentalRepository:      rentalRepository,
		variantRepository:     variantRepository,
		transactionRepository: transactionRepository,
	}
}

func (usecase RentalUsecase) GetRentalList(ctx context.Context, query string, sortBy SortBy, order Order, skip int, limit int, checkoutStatus CheckoutStatus) ([]Rental, int64, *Error) {
	rentals, err := usecase.rentalRepository.GetRentalList(ctx, query, sortBy, order, skip, limit, checkoutStatus)
	if err != nil {
		return []Rental{}, 0, err
	}

	total, err := usecase.rentalRepository.GetRentalListTotal(ctx, query, checkoutStatus)
	if err != nil {
		return []Rental{}, 0, err
	}

	return rentals, total, nil
}

func (usecase RentalUsecase) GetRentalById(ctx context.Context, id int64) (Rental, *Error) {
	return usecase.rentalRepository.GetRentalById(ctx, id)
}

func (usecase RentalUsecase) DeleteRentalById(ctx context.Context, id int64) *Error {
	return usecase.rentalRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		rental, err := usecase.rentalRepository.GetRentalById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if rental.CheckoutAt != nil {
			return &Error{Type: BadRequest, Message: "rental already checked out"}
		}

		return usecase.rentalRepository.DeleteRentalById(ctxWithTx, id)
	})
}

func (usecase RentalUsecase) CheckinRentals(ctx context.Context, rentalRequests []Rental) ([]Rental, *Error) {
	var createdRentals []Rental

	err := usecase.rentalRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		for index := range rentalRequests {
			variant, err := usecase.variantRepository.GetVariantById(ctxWithTx, rentalRequests[index].VariantId)
			if err != nil {
				return err
			}
			if len(variant.PricingTiers) == 0 {
				return &Error{Type: BadRequest, Message: "rental variant has no pricing tiers"}
			}
			rentalRequests[index].PricingTiers = variant.PricingTiers
			rentalRequests[index].CreatedAt = time.Now()
		}
		cr, err := usecase.rentalRepository.CheckinRentals(ctxWithTx, rentalRequests)
		if err != nil {
			return err
		}
		createdRentals = cr
		return nil
	})

	return createdRentals, err
}

func (usecase RentalUsecase) CheckoutRentals(ctx context.Context, rentalIds []int64) (Transaction, *Error) {
	checkoutAt := time.Now()

	transactionData := Transaction{
		CreatedAt:   checkoutAt,
		Name:        "",
		OrderNumber: 0,
	}

	err := usecase.rentalRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {

		var total float64 = 0
		transactionItems := []TransactionItem{}

		for _, rentalId := range rentalIds {
			existingRental, err := usecase.rentalRepository.GetRentalById(ctxWithTx, rentalId)
			if err != nil {
				return err
			}

			if existingRental.CheckoutAt != nil {
				return &Error{Type: BadRequest, Message: "cannot checkout rental, already checked out"}
			}

			if err := usecase.rentalRepository.CheckoutRental(ctxWithTx, rentalId); err != nil {
				return err
			}

			result, calcErr := CalculatePrice(existingRental.PricingTiers, checkoutAt.Sub(existingRental.CheckinAt))
			if calcErr != nil {
				return calcErr
			}
			total += float64(result.Price)

			transactionItems = append(transactionItems, TransactionItem{
				VariantId:      existingRental.VariantId,
				Amount:         1,
				Price:          result.Price,
				DiscountAmount: 0,
				Subtotal:       result.Price,
				RentalId:       &existingRental.Id,
			})

			transactionData.Name = existingRental.Name
		}

		transactionData.Total = float32(total)
		transactionData.TransactionItems = transactionItems

		ct, err := usecase.transactionRepository.CreateTransaction(ctxWithTx, transactionData)
		if err != nil {
			return err
		}
		transactionData = ct
		return nil
	})

	return transactionData, err
}
