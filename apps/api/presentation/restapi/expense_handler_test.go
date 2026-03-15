package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newExpenseHandler(t *testing.T, setupMocks func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository)) (restapi.ExpenseHandler, *gomock.Controller) {
	ctrl := gomock.NewController(t)
	expRepo := mock.NewMockExpenseRepository(ctrl)
	budgetRepo := mock.NewMockBudgetRepository(ctrl)
	walletRepo := mock.NewMockWalletRepository(ctrl)
	setupMocks(expRepo, budgetRepo, walletRepo)
	usecase := domain.NewExpenseUsecase(expRepo, budgetRepo, walletRepo)
	return restapi.NewExpenseHandler(usecase), ctrl
}

func TestExpenseHandler_GetExpenseList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMocks     func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/expenses",
			setupMocks: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().GetExpenseList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Expense{{Id: 1}}, nil)
				expRepo.EXPECT().GetExpenseListTotal(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(int64(1), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid skip param",
			url:            "/expenses?skip=abc",
			setupMocks:     func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/expenses",
			setupMocks: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().GetExpenseList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newExpenseHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetExpenseList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestExpenseHandler_GetExpenseById(t *testing.T) {
	tests := []struct {
		name           string
		expenseId      string
		setupMocks     func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			expenseId: "1",
			setupMocks: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().GetExpenseById(gomock.Any(), int64(1)).Return(domain.Expense{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:      "not found",
			expenseId: "99",
			setupMocks: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().GetExpenseById(gomock.Any(), int64(99)).Return(domain.Expense{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			expenseId:      "abc",
			setupMocks:     func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newExpenseHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, "/expenses/"+tt.expenseId, nil)
			req = mux.SetURLVars(req, map[string]string{"expenseId": tt.expenseId})
			w := httptest.NewRecorder()
			handler.GetExpenseById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestExpenseHandler_CreateExpense(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMocks     func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"walletId": 1, "budgetId": 1, "expenseItems": [{"name": "Sugar", "unit": "kg", "price": 15000, "amount": 2}]}`,
			setupMocks: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				budgetRepo.EXPECT().GetBudgetById(gomock.Any(), int64(1)).Return(domain.Budget{Id: 1, Balance: 100000}, nil)
				budgetRepo.EXPECT().UpdateBudgetById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Budget{}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 100000}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				expRepo.EXPECT().CreateExpense(gomock.Any(), gomock.Any()).Return(domain.Expense{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMocks:     func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "budget not found",
			body: `{"walletId": 1, "budgetId": 99, "expenseItems": [{"name": "Sugar", "unit": "kg", "price": 15000, "amount": 2}]}`,
			setupMocks: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				budgetRepo.EXPECT().GetBudgetById(gomock.Any(), int64(99)).Return(domain.Budget{}, &domain.Error{Type: domain.NotFound, Message: "budget not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newExpenseHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPost, "/expenses", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateExpense(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestExpenseHandler_DeleteExpenseById(t *testing.T) {
	tests := []struct {
		name           string
		expenseId      string
		setupMocks     func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			expenseId: "1",
			setupMocks: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				expRepo.EXPECT().GetExpenseById(gomock.Any(), int64(1)).Return(domain.Expense{Id: 1, BudgetId: 1, WalletId: 1, Total: 10000}, nil)
				budgetRepo.EXPECT().GetBudgetById(gomock.Any(), int64(1)).Return(domain.Budget{Id: 1, Balance: 0}, nil)
				budgetRepo.EXPECT().UpdateBudgetById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Budget{}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 0}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				expRepo.EXPECT().DeleteExpenseById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			expenseId:      "abc",
			setupMocks:     func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "not found",
			expenseId: "99",
			setupMocks: func(expRepo *mock.MockExpenseRepository, budgetRepo *mock.MockBudgetRepository, walletRepo *mock.MockWalletRepository) {
				expRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				expRepo.EXPECT().GetExpenseById(gomock.Any(), int64(99)).Return(domain.Expense{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newExpenseHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodDelete, "/expenses/"+tt.expenseId, nil)
			req = mux.SetURLVars(req, map[string]string{"expenseId": tt.expenseId})
			w := httptest.NewRecorder()
			handler.DeleteExpenseById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
