package rental

import (
	"apps/api/domain/base"
	"apps/api/domain/transaction"
	"apps/api/domain/variant"
	"context"
	"math"
	"time"
)

type Usecase struct {
	repository            Repository
	variantRepository     variant.Repository
	transactionRepository transaction.Repository
}

func NewUsecase(repository Repository, variantRepository variant.Repository, transactionRepository transaction.Repository) Usecase {
	return Usecase{
		repository:            repository,
		variantRepository:     variantRepository,
		transactionRepository: transactionRepository,
	}
}

func (usecase Usecase) GetRentalList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, checkoutStatus CheckoutStatus) ([]Rental, int64, *base.Error) {
	rentals, err := usecase.repository.GetRentalList(ctx, query, sortBy, order, skip, limit, checkoutStatus)
	if err != nil {
		return []Rental{}, 0, err
	}

	total, err := usecase.repository.GetRentalListTotal(ctx, query, checkoutStatus)
	if err != nil {
		return []Rental{}, 0, err
	}

	return rentals, total, nil
}

func (usecase Usecase) GetRentalById(ctx context.Context, id int64) (Rental, *base.Error) {
	return usecase.repository.GetRentalById(ctx, id)
}

func (usecase Usecase) DeleteRentalById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		rental, err := usecase.repository.GetRentalById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if rental.CheckoutAt != nil {
			return &base.Error{Type: base.BadRequest, Message: "rental already checked out"}
		}

		return usecase.repository.DeleteRentalById(ctxWithTx, id)
	})
}

func (usecase Usecase) CheckinRentals(ctx context.Context, rentalRequests []Rental) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		for index := range rentalRequests {
			rentalRequests[index].CreatedAt = time.Now()
		}
		return usecase.repository.CheckinRentals(ctxWithTx, rentalRequests)
	})
}

func (usecase Usecase) CheckoutRentals(ctx context.Context, rentalIds []int64) (int64, *base.Error) {
	checkoutAt := time.Now()

	transactionData := transaction.Transaction{
		CreatedAt:   checkoutAt,
		Name:        "",
		OrderNumber: 0,
	}

	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {

		var total float64 = 0
		transactionItems := []transaction.TransactionItem{}

		for _, rentalId := range rentalIds {
			existingRental, err := usecase.repository.GetRentalById(ctxWithTx, rentalId)
			if err != nil {
				return err
			}

			if existingRental.CheckoutAt != nil {
				return &base.Error{Type: base.BadRequest, Message: "cannot checkout rental, already checked out"}
			}

			if err := usecase.repository.CheckoutRental(ctxWithTx, rentalId); err != nil {
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

			transactionItems = append(transactionItems, transaction.TransactionItem{
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
