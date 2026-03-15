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

func TestTransactionUsecase_GetTransactionList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(txRepo *mock.MockTransactionRepository)
		expectedLen   int
		expectedTotal int64
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().GetTransactionList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.All, nil).
					Return([]domain.Transaction{{Id: 1}, {Id: 2}}, nil)
				txRepo.EXPECT().GetTransactionListTotal(gomock.Any(), "", domain.All, nil).Return(int64(2), nil)
			},
			expectedLen:   2,
			expectedTotal: 2,
		},
		{
			name: "error on GetTransactionList",
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().GetTransactionList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			budgetRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(txRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
			transactions, total, err := usecase.GetTransactionList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.All, nil)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, transactions, tt.expectedLen)
				assert.Equal(t, tt.expectedTotal, total)
			}
		})
	}
}

func TestTransactionUsecase_CreateTransaction(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Transaction
		setupMock     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository)
		expectedTotal float32
		expectedError *domain.Error
	}{
		{
			name: "success — calculates total from variant prices",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 2, DiscountAmount: 0},
				},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 15000}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).Return(domain.Transaction{Id: 1, Total: 30000}, nil)
			},
			expectedTotal: 30000,
		},
		{
			name: "success — applies fixed coupon discount",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 1, DiscountAmount: 0},
				},
				TransactionCoupons: []domain.TransactionCoupon{
					{CouponId: 10},
				},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 20000}, nil)
				couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(10)).Return(domain.Coupon{Id: 10, Type: domain.Fixed, Amount: 5000}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).Return(domain.Transaction{Id: 2, Total: 15000}, nil)
			},
			expectedTotal: 15000,
		},
		{
			name: "variant not found",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{{VariantId: 99, Amount: 1}},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(99)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			budgetRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(txRepo, variantRepo, couponRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
			transaction, err := usecase.CreateTransaction(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedTotal, transaction.Total)
			}
		})
	}
}

func TestTransactionUsecase_DeleteTransactionById(t *testing.T) {
	paidAt := time.Now()
	tests := []struct {
		name          string
		id            int64
		setupMock     func(txRepo *mock.MockTransactionRepository)
		expectedError *domain.Error
	}{
		{
			name: "success — unpaid transaction",
			id:   1,
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, PaidAt: nil}, nil)
				txRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "cannot delete paid transaction",
			id:   2,
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{Id: 2, PaidAt: &paidAt}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "transaction not found",
			id:   99,
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			budgetRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(txRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
			err := usecase.DeleteTransactionById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestTransactionUsecase_UnpayTransaction(t *testing.T) {
	now := time.Now()
	recentPaidAt := now.Add(-1 * time.Hour) // 1 hour ago — within 24h window
	oldPaidAt := now.Add(-25 * time.Hour)   // more than 24h ago
	walletId := int64(1)

	tests := []struct {
		name          string
		id            int64
		setupMock     func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, budgetRepo *mock.MockBudgetRepository)
		expectedError *domain.Error
	}{
		{
			name: "success — within 24h, refunds wallet and budgets",
			id:   1,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, budgetRepo *mock.MockBudgetRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{
					Id: 1, PaidAt: &recentPaidAt, CreatedAt: recentPaidAt.Add(-30 * time.Minute),
					Total: 50000, WalletId: &walletId,
					TransactionItems: []domain.TransactionItem{},
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Name: "Cash", Balance: 100000, PaymentCostPercentage: 0}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				budgetRepo.EXPECT().GetBudgetList(gomock.Any()).Return([]domain.Budget{}, nil)
				txRepo.EXPECT().UnpayTransaction(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "already unpaid",
			id:   2,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, budgetRepo *mock.MockBudgetRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{Id: 2, PaidAt: nil}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "more than 24 hours since creation",
			id:   3,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, budgetRepo *mock.MockBudgetRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(3)).Return(domain.Transaction{
					Id: 3, PaidAt: &oldPaidAt, CreatedAt: oldPaidAt.Add(-1 * time.Hour),
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			budgetRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(txRepo, walletRepo, budgetRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
			err := usecase.UnpayTransaction(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestTransactionUsecase_PayTransaction(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		walletId      int64
		paidAmount    float32
		setupMock     func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, budgetRepo *mock.MockBudgetRepository)
		expectedError *domain.Error
	}{
		{
			name:       "success",
			id:         1,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, budgetRepo *mock.MockBudgetRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{
					Id: 1, Total: 30000, PaidAt: nil,
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{
					Id: 1, Balance: 0, PaymentCostPercentage: 0,
				}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Transaction{}, nil)
				budgetRepo.EXPECT().GetBudgetList(gomock.Any()).Return([]domain.Budget{{Id: 1, Balance: 0, Percentage: 100}}, nil)
				budgetRepo.EXPECT().UpdateBudgetById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Budget{}, nil)
				txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(1)).Return(nil)
			},
		},
		{
			name:       "transaction already paid",
			id:         2,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, budgetRepo *mock.MockBudgetRepository) {
				now := time.Now()
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{
					Id: 2, PaidAt: &now,
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:       "transaction not found",
			id:         99,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, budgetRepo *mock.MockBudgetRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			budgetRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(txRepo, walletRepo, budgetRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
			err := usecase.PayTransaction(context.Background(), tt.walletId, tt.paidAmount, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestTransactionUsecase_UpdateTransactionById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, PaidAt: nil}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 15000}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1}, nil)
			},
		},
		{
			name: "cannot update paid transaction",
			id:   2,
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository) {
				now := time.Now()
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{Id: 2, PaidAt: &now}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "transaction not found",
			id:   99,
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			budgetRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(txRepo, variantRepo, couponRepo)

			transaction := domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 2, DiscountAmount: 0, Note: ""},
				},
				TransactionCoupons: []domain.TransactionCoupon{},
			}
			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
			_, err := usecase.UpdateTransactionById(context.Background(), transaction, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestTransactionUsecase_GetTransactionStatistics(t *testing.T) {
	tests := []struct {
		name          string
		groupBy       string
		setupMock     func(txRepo *mock.MockTransactionRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name:    "success",
			groupBy: "day",
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().GetTransactionStatistics(gomock.Any(), "day").Return([]domain.TransactionStatistic{{Total: 100000}}, nil)
			},
			expectedLen: 1,
		},
		{
			name:    "repo error",
			groupBy: "day",
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().GetTransactionStatistics(gomock.Any(), "day").Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			budgetRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(txRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
			result, err := usecase.GetTransactionStatistics(context.Background(), tt.groupBy)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, result, tt.expectedLen)
			}
		})
	}
}
