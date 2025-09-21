package reservation

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

func (usecase Usecase) GetReservationList(ctx context.Context, query string, sortBy base.SortBy, order base.Order, skip int, limit int, checkoutStatus CheckoutStatus) ([]Reservation, int64, *base.Error) {
	reservations, err := usecase.repository.GetReservationList(ctx, query, sortBy, order, skip, limit, checkoutStatus)
	if err != nil {
		return []Reservation{}, 0, err
	}

	total, err := usecase.repository.GetReservationListTotal(ctx, query, checkoutStatus)
	if err != nil {
		return []Reservation{}, 0, err
	}

	return reservations, total, nil
}

func (usecase Usecase) GetReservationById(ctx context.Context, id int64) (Reservation, *base.Error) {
	return usecase.repository.GetReservationById(ctx, id)
}

func (usecase Usecase) DeleteReservationById(ctx context.Context, id int64) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		reservation, err := usecase.repository.GetReservationById(ctxWithTx, id)
		if err != nil {
			return err
		}

		if reservation.CheckoutAt != nil {
			return &base.Error{Type: base.BadRequest, Message: "reservation already checked out"}
		}

		return usecase.repository.DeleteReservationById(ctxWithTx, id)
	})
}

func (usecase Usecase) CheckinReservations(ctx context.Context, reservationRequests []Reservation) *base.Error {
	return usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {
		for index := range reservationRequests {
			reservationRequests[index].CheckinAt = time.Now()
			reservationRequests[index].CreatedAt = time.Now()
		}
		return usecase.repository.CheckinReservations(ctxWithTx, reservationRequests)
	})
}

func (usecase Usecase) CheckoutReservations(ctx context.Context, reservationIds []int64) (int64, *base.Error) {
	checkoutAt := time.Now()

	transactionData := transaction.Transaction{
		CreatedAt:   checkoutAt,
		Name:        "",
		OrderNumber: 0,
	}

	err := usecase.repository.BeginTransaction(ctx, func(ctxWithTx context.Context) *base.Error {

		var total float64 = 0
		transactionItems := []transaction.TransactionItem{}

		for _, reservationId := range reservationIds {
			existingReservation, err := usecase.repository.GetReservationById(ctxWithTx, reservationId)
			if err != nil {
				return err
			}

			if existingReservation.CheckoutAt != nil {
				return &base.Error{Type: base.BadRequest, Message: "cannot checkout reservation, already checked out"}
			}

			if err := usecase.repository.CheckoutReservation(ctxWithTx, reservationId); err != nil {
				return err
			}

			variant, err := usecase.variantRepository.GetVariantById(ctxWithTx, existingReservation.VariantId)
			if err != nil {
				return err
			}

			// TODO: set these from DB
			MAX_HOUR := 6.0

			duration := checkoutAt.Sub(existingReservation.CheckinAt)
			hours := int(duration.Hours())
			remainder := duration % time.Hour
			if remainder >= 15*time.Minute {
				hours++
			}

			resolvedHours := math.Min(float64(hours), MAX_HOUR)
			checkoutPrice := float64(variant.Price) * resolvedHours
			total += checkoutPrice

			transactionItems = append(transactionItems, transaction.TransactionItem{
				VariantId:      existingReservation.VariantId,
				Amount:         float32(resolvedHours),
				Price:          variant.Price,
				DiscountAmount: 0,
				Subtotal:       variant.Price * float32(resolvedHours),
			})
		}

		transactionData.Total = float32(total)
		transactionData.TransactionItems = transactionItems

		return usecase.transactionRepository.CreateTransaction(ctxWithTx, &transactionData)
	})

	return transactionData.Id, err
}
