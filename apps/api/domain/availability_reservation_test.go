package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestAvailabilityReservation_Reserve(t *testing.T) {
	t.Run("decrements a variant-level counter", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
			Id: 1, IsAvailable: true, AvailableQuantity: intPtr(6),
			Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
		}, nil)
		repo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(1), 4).Return(nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{{VariantId: 1, Amount: 2}})

		assert.Nil(t, err)
	})

	t.Run("decrements a product-level counter shared by two variants", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		product := domain.Product{Id: 10, Name: "Pancong", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingProduct, AvailableQuantity: intPtr(5)}

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 10, IsAvailable: true, Product: product}, nil)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, ProductId: 10, IsAvailable: true, Product: product}, nil)
		repo.EXPECT().LockProductById(gomock.Any(), int64(10)).Times(1).Return(product, nil)
		repo.EXPECT().UpdateProductAvailableQuantity(gomock.Any(), int64(10), 2).Return(nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{
			{VariantId: 1, Amount: 2},
			{VariantId: 2, Amount: 1},
		})

		assert.Nil(t, err)
	})

	t.Run("sums the same variant across two lines", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Times(1).Return(domain.Variant{
			Id: 1, IsAvailable: true, AvailableQuantity: intPtr(3),
			Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
		}, nil)
		repo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(1), 1).Return(nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{
			{VariantId: 1, Amount: 1, Note: "less ice"},
			{VariantId: 1, Amount: 1, Note: "no sugar"},
		})

		assert.Nil(t, err)
	})

	t.Run("never touches an untracked item beyond its switches", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
			Id: 1, IsAvailable: true,
			Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingNone},
		}, nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{{VariantId: 1, Amount: 5}})

		assert.Nil(t, err)
	})

	t.Run("rejects a switched-off product naming the item", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
			Id: 1, Name: "Vanilla", IsAvailable: true,
			Product: domain.Product{Name: "Es Kopi Susu", IsAvailable: false, AvailabilityTracking: domain.AvailabilityTrackingNone},
		}, nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{{VariantId: 1, Amount: 1}})

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "Es Kopi Susu Vanilla is sold out", err.Message)
	})

	t.Run("rejects a switched-off variant naming the item", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
			Id: 1, Name: "Choco", IsAvailable: false,
			Product: domain.Product{Name: "Soft Cookies", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
		}, nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{{VariantId: 1, Amount: 1}})

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "Soft Cookies Choco is sold out", err.Message)
	})

	t.Run("rejects a per-variant shortfall naming the remaining count", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
			Id: 1, Name: "Choco", IsAvailable: true, AvailableQuantity: intPtr(2),
			Product: domain.Product{Name: "Soft Cookies", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
		}, nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{{VariantId: 1, Amount: 3}})

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "only 2 Soft Cookies Choco left", err.Message)
	})

	t.Run("rejects a product-level shortfall summed across two variants", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		product := domain.Product{Id: 10, Name: "Pancong", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingProduct, AvailableQuantity: intPtr(3)}

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 10, IsAvailable: true, Product: product}, nil)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, ProductId: 10, IsAvailable: true, Product: product}, nil)
		repo.EXPECT().LockProductById(gomock.Any(), int64(10)).Times(1).Return(product, nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{
			{VariantId: 1, Amount: 2},
			{VariantId: 2, Amount: 2},
		})

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "only 3 Pancong left", err.Message)
	})

	t.Run("a switched-off variant on a product-level counter blocks only that line", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		product := domain.Product{Id: 10, Name: "Pancong", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingProduct, AvailableQuantity: intPtr(5)}

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(3)).Return(domain.Variant{
			Id: 3, Name: "Matcha", ProductId: 10, IsAvailable: false, Product: product,
		}, nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{{VariantId: 3, Amount: 1}})

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "Pancong Matcha is sold out", err.Message)
	})

	t.Run("skips rental items entirely", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		rentalId := int64(7)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{{VariantId: 1, Amount: 1, RentalId: &rentalId}})

		assert.Nil(t, err)
	})

	t.Run("skips a rental-sale-type variant even without a RentalId", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
			Id: 1, IsAvailable: true,
			Product: domain.Product{SaleType: domain.SaleTypeRental, IsAvailable: false, AvailabilityTracking: domain.AvailabilityTrackingProduct, AvailableQuantity: intPtr(0)},
		}, nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Reserve(context.Background(), []domain.TransactionItem{{VariantId: 1, Amount: 1}})

		assert.Nil(t, err)
	})
}

func TestAvailabilityReservation_Release(t *testing.T) {
	t.Run("restores a variant-level counter without checking the switch", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
			Id: 1, IsAvailable: false, AvailableQuantity: intPtr(4),
			Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
		}, nil)
		repo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(1), 6).Return(nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Release(context.Background(), []domain.TransactionItem{{VariantId: 1, Amount: 2}})

		assert.Nil(t, err)
	})

	t.Run("restores a product-level counter shared by two variants", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		product := domain.Product{Id: 10, Name: "Pancong", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingProduct, AvailableQuantity: intPtr(1)}

		repo := mock.NewMockAvailabilityReservationRepository(ctrl)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 10, IsAvailable: true, Product: product}, nil)
		repo.EXPECT().LockVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, ProductId: 10, IsAvailable: true, Product: product}, nil)
		repo.EXPECT().LockProductById(gomock.Any(), int64(10)).Times(1).Return(product, nil)
		repo.EXPECT().UpdateProductAvailableQuantity(gomock.Any(), int64(10), 4).Return(nil)

		reservation := domain.NewAvailabilityReservation(repo)
		err := reservation.Release(context.Background(), []domain.TransactionItem{
			{VariantId: 1, Amount: 2},
			{VariantId: 2, Amount: 1},
		})

		assert.Nil(t, err)
	})
}
