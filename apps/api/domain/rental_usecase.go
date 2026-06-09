package domain

import (
	"context"
	"fmt"
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

			duration := checkoutAt.Sub(existingRental.CheckinAt)
			result, calcErr := CalculatePrice(existingRental.PricingTiers, duration)
			if calcErr != nil {
				return calcErr
			}
			total += float64(result.Price)

			totalMinutes := int(math.Ceil(duration.Minutes()))
			hours := totalMinutes / 60
			minutes := totalMinutes % 60
			var durationNote string
			if hours > 0 && minutes > 0 {
				durationNote = fmt.Sprintf("%d hour(s) %d minute(s)", hours, minutes)
			} else if hours > 0 {
				durationNote = fmt.Sprintf("%d hour(s)", hours)
			} else {
				durationNote = fmt.Sprintf("%d minute(s)", totalMinutes)
			}

			// Snapshot the product name and option values off the variant so the
			// rental's transaction item keeps a stable record, mirroring how
			// TransactionUsecase.CreateTransaction snapshots regular items. Without
			// this the transaction detail renders rental items with a blank name.
			variant, err := usecase.variantRepository.GetVariantById(ctxWithTx, existingRental.VariantId)
			if err != nil {
				return err
			}

			transactionItems = append(transactionItems, TransactionItem{
				VariantId:      existingRental.VariantId,
				Amount:         1,
				Price:          result.Price,
				DiscountAmount: 0,
				Subtotal:       result.Price,
				RentalId:       &existingRental.Id,
				Note:           durationNote,
				ProductName:    variant.Product.Name,
				Values:         snapshotVariantValues(variant),
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
