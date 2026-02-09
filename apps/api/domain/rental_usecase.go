package domain

import (
	"context"
	"math"
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

func (usecase RentalUsecase) CheckinRentals(ctx context.Context, rentalRequests []Rental) *Error {
	return usecase.rentalRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		for index := range rentalRequests {
			rentalRequests[index].CreatedAt = time.Now()
		}
		return usecase.rentalRepository.CheckinRentals(ctxWithTx, rentalRequests)
	})
}

func (usecase RentalUsecase) CheckoutRentals(ctx context.Context, rentalIds []int64) (int64, *Error) {
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

			variant, err := usecase.variantRepository.GetVariantById(ctxWithTx, existingRental.VariantId)
			if err != nil {
				return err
			}

			// TODO: set these from DB
			MAX_HOUR := 6.0

			duration := checkoutAt.Sub(existingRental.CheckinAt)
			hours := int(duration.Hours())
			remainder := duration % time.Hour
			if remainder >= 15*time.Minute {
				hours++
			}

			resolvedHours := math.Min(float64(hours), MAX_HOUR)
			checkoutPrice := float64(variant.Price) * resolvedHours
			total += checkoutPrice

			transactionItems = append(transactionItems, TransactionItem{
				VariantId:      existingRental.VariantId,
				Amount:         float32(resolvedHours),
				Price:          variant.Price,
				DiscountAmount: 0,
				Subtotal:       variant.Price * float32(resolvedHours),
				RentalId:       &existingRental.Id,
			})

			transactionData.Name = existingRental.Name
		}

		transactionData.Total = float32(total)
		transactionData.TransactionItems = transactionItems

		return usecase.transactionRepository.CreateTransaction(ctxWithTx, &transactionData)
	})

	return transactionData.Id, err
}
