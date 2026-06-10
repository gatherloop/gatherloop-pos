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

func int64Ptr(v int64) *int64 { return &v }

// setupUpdateTransactionMocks wires the mocks shared by item-coupon update
// tests: BeginTransaction passthrough, GetTransactionById returning the
// existing transaction, and UpdateTransactionById echoing back whatever the
// usecase saved (so callers can assert on the resulting items/coupons/total).
func setupUpdateTransactionMocks(ctrl *gomock.Controller, id int64, existing domain.Transaction) (*mock.MockTransactionRepository, *mock.MockVariantRepository, *mock.MockCouponRepository, *mock.MockWalletRepository, *mock.MockBudgetRepository) {
	txRepo := mock.NewMockTransactionRepository(ctrl)
	variantRepo := mock.NewMockVariantRepository(ctrl)
	couponRepo := mock.NewMockCouponRepository(ctrl)
	walletRepo := mock.NewMockWalletRepository(ctrl)
	budgetRepo := mock.NewMockBudgetRepository(ctrl)

	txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
	txRepo.EXPECT().GetTransactionById(gomock.Any(), id).Return(existing, nil)
	txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), id).DoAndReturn(
		func(ctx context.Context, tx domain.Transaction, id int64) (domain.Transaction, *domain.Error) {
			return tx, nil
		}).AnyTimes()

	return txRepo, variantRepo, couponRepo, walletRepo, budgetRepo
}

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
		input         domain.Transaction
		setupMock     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository)
		expectedTotal float32
		expectedItems []domain.TransactionItem
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 2, DiscountAmount: 0, Note: ""},
				},
				TransactionCoupons: []domain.TransactionCoupon{},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, PaidAt: nil}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 15000}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1}, nil)
			},
		},
		{
			name: "rental item keeps checkout price and rental link",
			id:   3,
			input: domain.Transaction{
				// The update screen submits the rental item with no Price/RentalId,
				// matching what the frontend actually sends back.
				TransactionItems: []domain.TransactionItem{
					{Id: 10, VariantId: 1, Amount: 1, DiscountAmount: 0, Note: "edited note"},
				},
				TransactionCoupons: []domain.TransactionCoupon{},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository) {
				rentalId := int64(7)
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(3)).Return(domain.Transaction{
					Id: 3, PaidAt: nil,
					TransactionItems: []domain.TransactionItem{
						{Id: 10, VariantId: 1, Amount: 1, Price: 25000, Subtotal: 25000, RentalId: &rentalId, Note: "2 hour(s)"},
					},
				}, nil)
				// No GetVariantById call expected: the rental item must not be recalculated.
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(3)).DoAndReturn(
					func(ctx context.Context, tx domain.Transaction, id int64) (domain.Transaction, *domain.Error) {
						return tx, nil
					})
			},
			expectedTotal: 25000,
			expectedItems: []domain.TransactionItem{
				{Id: 10, TransactionId: 3, VariantId: 1, Amount: 1, Price: 25000, Subtotal: 25000, RentalId: int64Ptr(7), Note: "2 hour(s)"},
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

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
			updated, err := usecase.UpdateTransactionById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				if tt.expectedItems != nil {
					assert.Equal(t, tt.expectedTotal, updated.Total)
					assert.Equal(t, tt.expectedItems, updated.TransactionItems)
				}
			}
		})
	}
}

// TestTransactionUsecase_UpdateTransactionById_ItemCoupons covers the
// per-item coupon application (Phase 3 of the rental-coupons plan): a coupon
// with TransactionItemId set discounts that line's DiscountAmount/Subtotal
// (recomputed from Price so it never compounds across edits) and adjusts the
// running Total, while a whole-bill coupon (TransactionItemId == nil)
// continues to subtract from Total as before.
func TestTransactionUsecase_UpdateTransactionById_ItemCoupons(t *testing.T) {
	t.Run("FREE 1 HOUR on a 30K rental item discounts the line (FR-4 #1)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		rentalId := int64(100)
		txRepo, variantRepo, couponRepo, walletRepo, budgetRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{
			Id: 1, PaidAt: nil,
			TransactionItems: []domain.TransactionItem{
				{Id: 10, VariantId: 1, Amount: 1, Price: 30000, Subtotal: 30000, RentalId: &rentalId, Note: "2 hour(s)"},
			},
		})
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(domain.Coupon{Id: 50, Type: domain.Fixed, Amount: 15000}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 10, VariantId: 1, Amount: 1, DiscountAmount: 0, Note: "2 hour(s)"},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 50, TransactionItemId: int64Ptr(10)},
			},
		}, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(15000), updated.Total)
		assert.Equal(t, float32(15000), updated.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(15000), updated.TransactionItems[0].Subtotal)
		assert.Equal(t, &rentalId, updated.TransactionItems[0].RentalId)
		assert.Equal(t, []domain.TransactionCoupon{
			{CouponId: 50, Type: domain.Fixed, Amount: 15000, TransactionId: 1, TransactionItemId: int64Ptr(10)},
		}, updated.TransactionCoupons)
	})

	t.Run("re-saving the same rental coupon does not compound the discount", func(t *testing.T) {
		rentalId := int64(101)
		coupon := domain.Coupon{Id: 50, Type: domain.Fixed, Amount: 15000}
		input := domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 11, VariantId: 1, Amount: 1, DiscountAmount: 0, Note: "2 hour(s)"},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 50, TransactionItemId: int64Ptr(11)},
			},
		}

		// First save: rental item still carries its checkout-time price/subtotal.
		ctrl1 := gomock.NewController(t)
		txRepo1, variantRepo1, couponRepo1, walletRepo1, budgetRepo1 := setupUpdateTransactionMocks(ctrl1, 1, domain.Transaction{
			Id: 1, PaidAt: nil,
			TransactionItems: []domain.TransactionItem{
				{Id: 11, VariantId: 1, Amount: 1, Price: 30000, Subtotal: 30000, RentalId: &rentalId, Note: "2 hour(s)"},
			},
		})
		couponRepo1.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(coupon, nil)
		usecase1 := domain.NewTransactionUsecase(txRepo1, variantRepo1, couponRepo1, walletRepo1, budgetRepo1)
		firstSave, err := usecase1.UpdateTransactionById(context.Background(), input, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(15000), firstSave.Total)
		assert.Equal(t, float32(15000), firstSave.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(15000), firstSave.TransactionItems[0].Subtotal)

		// Second save: the stored item now reflects the first save's discount;
		// re-deriving the base from the unchanged Price must not compound it.
		ctrl2 := gomock.NewController(t)
		txRepo2, variantRepo2, couponRepo2, walletRepo2, budgetRepo2 := setupUpdateTransactionMocks(ctrl2, 1, domain.Transaction{
			Id: 1, PaidAt: nil,
			TransactionItems: []domain.TransactionItem{
				{Id: 11, VariantId: 1, Amount: 1, Price: 30000, Subtotal: 15000, DiscountAmount: 15000, RentalId: &rentalId, Note: "2 hour(s)"},
			},
		})
		couponRepo2.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(coupon, nil)
		usecase2 := domain.NewTransactionUsecase(txRepo2, variantRepo2, couponRepo2, walletRepo2, budgetRepo2)
		secondSave, err := usecase2.UpdateTransactionById(context.Background(), input, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(15000), secondSave.Total)
		assert.Equal(t, float32(15000), secondSave.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(15000), secondSave.TransactionItems[0].Subtotal)
	})

	t.Run("FREE 2 HOUR on a 15K rental item clamps to the base (FR-4 #4)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		rentalId := int64(102)
		txRepo, variantRepo, couponRepo, walletRepo, budgetRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{
			Id: 1, PaidAt: nil,
			TransactionItems: []domain.TransactionItem{
				{Id: 12, VariantId: 1, Amount: 1, Price: 15000, Subtotal: 15000, RentalId: &rentalId, Note: "1 hour(s)"},
			},
		})
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(51)).Return(domain.Coupon{Id: 51, Type: domain.Fixed, Amount: 30000}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 12, VariantId: 1, Amount: 1, DiscountAmount: 0, Note: "1 hour(s)"},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 51, TransactionItemId: int64Ptr(12)},
			},
		}, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(0), updated.Total)
		assert.Equal(t, float32(15000), updated.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(0), updated.TransactionItems[0].Subtotal)
	})

	t.Run("STUDENT DISCOUNT 40% on a 30K item (FR-4 #5)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo, variantRepo, couponRepo, walletRepo, budgetRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{Id: 1, PaidAt: nil})
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, Price: 30000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(52)).Return(domain.Coupon{Id: 52, Type: domain.Percentage, Amount: 40}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 30, VariantId: 2, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 52, TransactionItemId: int64Ptr(30)},
			},
		}, 1)

		assert.Nil(t, err)
		// 30000 * 40% = 12000 (already a multiple of 500, see coupon_calculator_test.go row5).
		assert.Equal(t, float32(18000), updated.Total)
		assert.Equal(t, float32(12000), updated.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(18000), updated.TransactionItems[0].Subtotal)
	})

	t.Run("multi-item: STUDENT on the middle ticket only discounts that ticket (FR-5)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo, variantRepo, couponRepo, walletRepo, budgetRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{Id: 1, PaidAt: nil})
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 20000}, nil)
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, Price: 30000}, nil)
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(3)).Return(domain.Variant{Id: 3, Price: 25000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(52)).Return(domain.Coupon{Id: 52, Type: domain.Percentage, Amount: 40}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 40, VariantId: 1, Amount: 1, DiscountAmount: 0},
				{Id: 41, VariantId: 2, Amount: 1, DiscountAmount: 0},
				{Id: 42, VariantId: 3, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 52, TransactionItemId: int64Ptr(41)},
			},
		}, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(63000), updated.Total) // 20000 + 18000 + 25000
		assert.Equal(t, float32(0), updated.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(20000), updated.TransactionItems[0].Subtotal)
		assert.Equal(t, float32(12000), updated.TransactionItems[1].DiscountAmount)
		assert.Equal(t, float32(18000), updated.TransactionItems[1].Subtotal)
		assert.Equal(t, float32(0), updated.TransactionItems[2].DiscountAmount)
		assert.Equal(t, float32(25000), updated.TransactionItems[2].Subtotal)
	})

	t.Run("whole-bill coupon still subtracts from Total", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo, variantRepo, couponRepo, walletRepo, budgetRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{Id: 1, PaidAt: nil})
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 20000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(60)).Return(domain.Coupon{Id: 60, Type: domain.Fixed, Amount: 5000}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 50, VariantId: 1, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 60},
			},
		}, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(15000), updated.Total)
		assert.Equal(t, []domain.TransactionCoupon{
			{CouponId: 60, Type: domain.Fixed, Amount: 5000, TransactionId: 1, TransactionItemId: nil},
		}, updated.TransactionCoupons)
	})

	t.Run("rejects more than one coupon on the same line (D4)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo, variantRepo, couponRepo, walletRepo, budgetRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{Id: 1, PaidAt: nil})
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 30000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(domain.Coupon{Id: 50, Type: domain.Fixed, Amount: 15000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(60)).Return(domain.Coupon{Id: 60, Type: domain.Percentage, Amount: 40}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
		_, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 60, VariantId: 1, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 50, TransactionItemId: int64Ptr(60)},
				{CouponId: 60, TransactionItemId: int64Ptr(60)},
			},
		}, 1)

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("rejects a coupon targeting an unknown transaction item", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo, variantRepo, couponRepo, walletRepo, budgetRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{Id: 1, PaidAt: nil})
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 30000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(domain.Coupon{Id: 50, Type: domain.Fixed, Amount: 15000}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
		_, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 70, VariantId: 1, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 50, TransactionItemId: int64Ptr(999)},
			},
		}, 1)

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})
}

// TestTransactionUsecase_CreateTransaction_ItemCoupon covers the same
// item-linked coupon math on the create path (non-rental, FR-3).
func TestTransactionUsecase_CreateTransaction_ItemCoupon(t *testing.T) {
	t.Run("item-linked coupon discounts a single line on a new transaction", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		budgetRepo := mock.NewMockBudgetRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 20000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(domain.Coupon{Id: 50, Type: domain.Fixed, Amount: 15000}, nil)
		txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
				return tx, nil
			})

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, budgetRepo)
		created, err := usecase.CreateTransaction(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 1, VariantId: 1, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 50, TransactionItemId: int64Ptr(1)},
			},
		})

		assert.Nil(t, err)
		assert.Equal(t, float32(5000), created.Total)
		assert.Equal(t, float32(15000), created.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(5000), created.TransactionItems[0].Subtotal)
		assert.Equal(t, []domain.TransactionCoupon{
			{CouponId: 50, Type: domain.Fixed, Amount: 15000, TransactionId: 0, TransactionItemId: int64Ptr(1)},
		}, created.TransactionCoupons)
	})
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
