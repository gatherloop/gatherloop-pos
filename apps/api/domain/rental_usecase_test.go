package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestRentalUsecase_GetRentalList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(rentalRepo *mock.MockRentalRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().GetRentalList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.CheckoutStatusAll).
					Return([]domain.Rental{{Id: 1}, {Id: 2}}, nil)
				rentalRepo.EXPECT().GetRentalListTotal(gomock.Any(), "", domain.CheckoutStatusAll).Return(int64(2), nil)
			},
			expectedLen: 2,
		},
		{
			name: "error",
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().GetRentalList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			rentalRepo := mock.NewMockRentalRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			txRepo := mock.NewMockTransactionRepository(ctrl)
			tt.setupMock(rentalRepo)

			usecase := domain.NewRentalUsecase(rentalRepo, variantRepo, txRepo)
			rentals, _, err := usecase.GetRentalList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.CheckoutStatusAll)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, rentals, tt.expectedLen)
			}
		})
	}
}

func TestRentalUsecase_DeleteRentalById(t *testing.T) {
	checkoutAt := time.Now()
	tests := []struct {
		name          string
		id            int64
		setupMock     func(rentalRepo *mock.MockRentalRepository)
		expectedError *domain.Error
	}{
		{
			name: "success — not checked out",
			id:   1,
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).Return(domain.Rental{Id: 1, CheckoutAt: nil}, nil)
				rentalRepo.EXPECT().DeleteRentalById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "rental already checked out",
			id:   2,
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(2)).Return(domain.Rental{Id: 2, CheckoutAt: &checkoutAt}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "rental not found",
			id:   99,
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(99)).Return(domain.Rental{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			rentalRepo := mock.NewMockRentalRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			txRepo := mock.NewMockTransactionRepository(ctrl)
			tt.setupMock(rentalRepo)

			usecase := domain.NewRentalUsecase(rentalRepo, variantRepo, txRepo)
			err := usecase.DeleteRentalById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestRentalUsecase_CheckinRentals(t *testing.T) {
	tests := []struct {
		name          string
		input         []domain.Rental
		setupMock     func(rentalRepo *mock.MockRentalRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name:  "success",
			input: []domain.Rental{{Code: "A1"}, {Code: "A2"}},
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().CheckinRentals(gomock.Any(), gomock.Any()).
					Return([]domain.Rental{{Id: 1, Code: "A1"}, {Id: 2, Code: "A2"}}, nil)
			},
			expectedLen: 2,
		},
		{
			name:  "repository error",
			input: []domain.Rental{{Code: "A1"}},
			setupMock: func(rentalRepo *mock.MockRentalRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().CheckinRentals(gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			rentalRepo := mock.NewMockRentalRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			txRepo := mock.NewMockTransactionRepository(ctrl)
			tt.setupMock(rentalRepo)

			usecase := domain.NewRentalUsecase(rentalRepo, variantRepo, txRepo)
			rentals, err := usecase.CheckinRentals(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, rentals, tt.expectedLen)
			}
		})
	}
}
