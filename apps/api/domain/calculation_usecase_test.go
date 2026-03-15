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

func TestCalculationUsecase_CreateCalculation(t *testing.T) {
	tests := []struct {
		name                    string
		input                   domain.Calculation
		setupMock               func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository)
		expectedTotalCalculation float32
		expectedTotalWallet     float32
		expectedError           *domain.Error
	}{
		{
			name: "success — computes totals from items and wallet balance",
			input: domain.Calculation{
				WalletId: 1,
				CalculationItems: []domain.CalculationItem{
					{Price: 5000, Amount: 2},
					{Price: 3000, Amount: 1},
				},
			},
			setupMock: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 100000}, nil)
				calcRepo.EXPECT().CreateCalculation(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, calc domain.Calculation) (domain.Calculation, *domain.Error) {
						return calc, nil
					})
			},
			expectedTotalCalculation: 13000, // 5000*2 + 3000*1
			expectedTotalWallet:      100000,
		},
		{
			name: "wallet not found",
			input: domain.Calculation{
				WalletId:         99,
				CalculationItems: []domain.CalculationItem{{Price: 5000, Amount: 1}},
			},
			setupMock: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(99)).Return(domain.Wallet{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			calcRepo := mock.NewMockCalculationRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(calcRepo, walletRepo)

			usecase := domain.NewCalculationUsecase(calcRepo, walletRepo)
			calc, err := usecase.CreateCalculation(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedTotalCalculation, calc.TotalCalculation)
				assert.Equal(t, tt.expectedTotalWallet, calc.TotalWallet)
			}
		})
	}
}

func TestCalculationUsecase_UpdateCalculationById(t *testing.T) {
	completedAt := time.Now()
	tests := []struct {
		name          string
		id            int64
		input         domain.Calculation
		setupMock     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository)
		expectedError *domain.Error
	}{
		{
			name:  "success — not yet completed",
			id:    1,
			input: domain.Calculation{WalletId: 1, CalculationItems: []domain.CalculationItem{{Price: 1000, Amount: 2}}},
			setupMock: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(1)).Return(domain.Calculation{Id: 1, CompletedAt: nil}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 50000}, nil)
				calcRepo.EXPECT().UpdateCalculationById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Calculation{Id: 1}, nil)
			},
		},
		{
			name:  "cannot update completed calculation",
			id:    2,
			input: domain.Calculation{WalletId: 1, CalculationItems: []domain.CalculationItem{}},
			setupMock: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(2)).Return(domain.Calculation{Id: 2, CompletedAt: &completedAt}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			calcRepo := mock.NewMockCalculationRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(calcRepo, walletRepo)

			usecase := domain.NewCalculationUsecase(calcRepo, walletRepo)
			_, err := usecase.UpdateCalculationById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestCalculationUsecase_DeleteCalculationById(t *testing.T) {
	completedAt := time.Now()
	tests := []struct {
		name          string
		id            int64
		setupMock     func(calcRepo *mock.MockCalculationRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(calcRepo *mock.MockCalculationRepository) {
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(1)).Return(domain.Calculation{Id: 1, CompletedAt: nil}, nil)
				calcRepo.EXPECT().DeleteCalculationById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "cannot delete completed calculation",
			id:   2,
			setupMock: func(calcRepo *mock.MockCalculationRepository) {
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(2)).Return(domain.Calculation{Id: 2, CompletedAt: &completedAt}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(calcRepo *mock.MockCalculationRepository) {
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(99)).Return(domain.Calculation{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			calcRepo := mock.NewMockCalculationRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(calcRepo)

			usecase := domain.NewCalculationUsecase(calcRepo, walletRepo)
			err := usecase.DeleteCalculationById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
