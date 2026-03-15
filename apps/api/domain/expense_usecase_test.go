package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestExpenseUsecase_GetExpenseList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(expRepo *mock.MockExpenseRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(expRepo *mock.MockExpenseRepository) {
				expRepo.EXPECT().GetExpenseList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil, nil).
					Return([]domain.Expense{{Id: 1, Total: 200}, {Id: 2, Total: 300}}, nil)
				expRepo.EXPECT().GetExpenseListTotal(gomock.Any(), "", nil, nil).Return(int64(2), nil)
			},
			expectedLen: 2,
		},
		{
			name: "error on list",
			setupMock: func(expRepo *mock.MockExpenseRepository) {
				expRepo.EXPECT().GetExpenseList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			expRepo := mock.NewMockExpenseRepository(ctrl)
			budgetRepo := mock.NewMockBudgetRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(expRepo)

			usecase := domain.NewExpenseUsecase(expRepo, budgetRepo, walletRepo)
			expenses, _, err := usecase.GetExpenseList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil, nil)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, expenses, tt.expectedLen)
			}
		})
	}
}

func TestExpenseUsecase_CreateExpense(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Expense
		setupMock     func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name:  "success",
			input: domain.Expense{Total: 100, BudgetId: 1, WalletId: 1},
			setupMock: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				budgetRepo.EXPECT().GetBudgetById(gomock.Any(), int64(1)).Return(domain.Budget{Id: 1, Balance: 500}, nil)
				budgetRepo.EXPECT().UpdateBudgetById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Budget{}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 500}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				expRepo.EXPECT().CreateExpense(gomock.Any(), gomock.Any()).Return(domain.Expense{Id: 1, Total: 100}, nil)
			},
			expectedId: 1,
		},
		{
			name:  "budget balance insufficient",
			input: domain.Expense{Total: 1000, BudgetId: 1, WalletId: 1},
			setupMock: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				budgetRepo.EXPECT().GetBudgetById(gomock.Any(), int64(1)).Return(domain.Budget{Id: 1, Balance: 50}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "wallet balance insufficient",
			input: domain.Expense{Total: 500, BudgetId: 1, WalletId: 1},
			setupMock: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				budgetRepo.EXPECT().GetBudgetById(gomock.Any(), int64(1)).Return(domain.Budget{Id: 1, Balance: 1000}, nil)
				budgetRepo.EXPECT().UpdateBudgetById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Budget{}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 10}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "budget not found",
			input: domain.Expense{Total: 100, BudgetId: 99, WalletId: 1},
			setupMock: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				budgetRepo.EXPECT().GetBudgetById(gomock.Any(), int64(99)).Return(domain.Budget{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			expRepo := mock.NewMockExpenseRepository(ctrl)
			budgetRepo := mock.NewMockBudgetRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(expRepo, budgetRepo, walletRepo)

			usecase := domain.NewExpenseUsecase(expRepo, budgetRepo, walletRepo)
			expense, err := usecase.CreateExpense(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, expense.Id)
			}
		})
	}
}

func TestExpenseUsecase_DeleteExpenseById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository)
		expectedError *domain.Error
	}{
		{
			name: "success — refunds budget and wallet",
			id:   1,
			setupMock: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				existing := domain.Expense{Id: 1, Total: 200, BudgetId: 1, WalletId: 1}
				expRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				expRepo.EXPECT().GetExpenseById(gomock.Any(), int64(1)).Return(existing, nil)
				budgetRepo.EXPECT().GetBudgetById(gomock.Any(), int64(1)).Return(domain.Budget{Id: 1, Balance: 300}, nil)
				budgetRepo.EXPECT().UpdateBudgetById(gomock.Any(), domain.Budget{Balance: 500}, int64(1)).Return(domain.Budget{}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 800, Name: "Cash"}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				expRepo.EXPECT().DeleteExpenseById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "expense not found",
			id:   99,
			setupMock: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				expRepo.EXPECT().GetExpenseById(gomock.Any(), int64(99)).Return(domain.Expense{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			expRepo := mock.NewMockExpenseRepository(ctrl)
			budgetRepo := mock.NewMockBudgetRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(expRepo, budgetRepo, walletRepo)

			usecase := domain.NewExpenseUsecase(expRepo, budgetRepo, walletRepo)
			err := usecase.DeleteExpenseById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
