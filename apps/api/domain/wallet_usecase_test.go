package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestWalletUsecase_GetWalletList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockWalletRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().GetWalletList(gomock.Any()).Return([]domain.Wallet{
					{Id: 1, Name: "Cash", Balance: 1000},
					{Id: 2, Name: "Bank", Balance: 5000},
				}, nil)
			},
			expectedLen: 2,
		},
		{
			name: "repository error",
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().GetWalletList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewWalletUsecase(mockRepo)
			wallets, err := usecase.GetWalletList(context.Background())

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, wallets, tt.expectedLen)
			}
		})
	}
}

func TestWalletUsecase_CreateWalletTransfer(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.WalletTransfer
		fromWalletId  int64
		setupMock     func(r *mock.MockWalletRepository)
		expectedError *domain.Error
	}{
		{
			name:         "success — deducts from and credits to",
			fromWalletId: 1,
			input:        domain.WalletTransfer{ToWalletId: 2, Amount: 300},
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				// GetWalletById for fromWallet
				r.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Name: "Cash", Balance: 1000}, nil)
				// UpdateWalletById for fromWallet (deduct)
				r.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				// GetWalletById for toWallet
				r.EXPECT().GetWalletById(gomock.Any(), int64(2)).Return(domain.Wallet{Id: 2, Name: "Bank", Balance: 500}, nil)
				// UpdateWalletById for toWallet (credit)
				r.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(2)).Return(domain.Wallet{}, nil)
				r.EXPECT().CreateWalletTransfer(gomock.Any(), gomock.Any(), int64(1)).Return(domain.WalletTransfer{Id: 1}, nil)
			},
		},
		{
			name:         "insufficient balance",
			fromWalletId: 1,
			input:        domain.WalletTransfer{ToWalletId: 2, Amount: 5000},
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Name: "Cash", Balance: 100}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:         "from wallet not found",
			fromWalletId: 99,
			input:        domain.WalletTransfer{ToWalletId: 2, Amount: 100},
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetWalletById(gomock.Any(), int64(99)).Return(domain.Wallet{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewWalletUsecase(mockRepo)
			_, err := usecase.CreateWalletTransfer(context.Background(), tt.input, tt.fromWalletId)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestWalletUsecase_DeleteWalletById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockWalletRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().DeleteWalletById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().DeleteWalletById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewWalletUsecase(mockRepo)
			err := usecase.DeleteWalletById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
