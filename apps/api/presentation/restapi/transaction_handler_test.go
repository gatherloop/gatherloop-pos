package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"context"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func newTransactionHandler(t *testing.T, setupMocks func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository)) (restapi.TransactionHandler, *gomock.Controller) {
	ctrl := gomock.NewController(t)
	txRepo := mock.NewMockTransactionRepository(ctrl)
	variantRepo := mock.NewMockVariantRepository(ctrl)
	couponRepo := mock.NewMockCouponRepository(ctrl)
	walletRepo := mock.NewMockWalletRepository(ctrl)
	setupMocks(txRepo, variantRepo, couponRepo, walletRepo)
	usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo)
	return restapi.NewTransactionHandler(usecase), ctrl
}

func TestTransactionHandler_GetTransactionList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMocks     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/transactions",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().GetTransactionList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Transaction{{Id: 1, Source: domain.TransactionSourcePos}}, nil)
				txRepo.EXPECT().GetTransactionListTotal(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(int64(1), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "invalid skip param",
			url:  "/transactions?skip=abc",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/transactions",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().GetTransactionList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newTransactionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetTransactionList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTransactionHandler_GetTransactionList_SerializesSource(t *testing.T) {
	handler, ctrl := newTransactionHandler(t, func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
		txRepo.EXPECT().GetTransactionList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
			Return([]domain.Transaction{{Id: 1, Source: domain.TransactionSourcePos}}, nil)
		txRepo.EXPECT().GetTransactionListTotal(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(int64(1), nil)
	})
	defer ctrl.Finish()

	req := httptest.NewRequest(http.MethodGet, "/transactions", nil)
	w := httptest.NewRecorder()
	handler.GetTransactionList(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var response apiContract.TransactionListResponse
	require.NoError(t, json.NewDecoder(w.Body).Decode(&response))
	require.Len(t, response.Data, 1)
	assert.Equal(t, "pos", response.Data[0].Source)
	assert.Nil(t, response.Data[0].Table)
}

func TestTransactionHandler_GetTransactionList_FilterBySource(t *testing.T) {
	orderSource := domain.TransactionSourceOrder

	handler, ctrl := newTransactionHandler(t, func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
		txRepo.EXPECT().GetTransactionList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), &orderSource).
			Return([]domain.Transaction{{Id: 2, Source: domain.TransactionSourceOrder}}, nil)
		txRepo.EXPECT().GetTransactionListTotal(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), &orderSource).Return(int64(1), nil)
	})
	defer ctrl.Finish()

	req := httptest.NewRequest(http.MethodGet, "/transactions?source=order", nil)
	w := httptest.NewRecorder()
	handler.GetTransactionList(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var response apiContract.TransactionListResponse
	require.NoError(t, json.NewDecoder(w.Body).Decode(&response))
	require.Len(t, response.Data, 1)
	assert.Equal(t, "order", response.Data[0].Source)
}

func TestTransactionHandler_GetTransactionById(t *testing.T) {
	tests := []struct {
		name           string
		transactionId  string
		setupMocks     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			transactionId: "1",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:          "not found",
			transactionId: "99",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:          "invalid id",
			transactionId: "abc",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newTransactionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, "/transactions/"+tt.transactionId, nil)
			req = mux.SetURLVars(req, map[string]string{"transactionId": tt.transactionId})
			w := httptest.NewRecorder()
			handler.GetTransactionById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTransactionHandler_CreateTransaction(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMocks     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"name": "Order 1", "orderNumber": 1, "transactionItems": [{"variantId": 1, "amount": 2, "note": "", "discountAmount": 0}], "transactionCoupons": []}`,
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 10000}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).Return(domain.Transaction{Id: 1, Total: 20000}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "invalid JSON body",
			body: `{invalid`,
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "variant not found",
			body: `{"name": "Order 1", "orderNumber": 1, "transactionItems": [{"variantId": 99, "amount": 1, "note": "", "discountAmount": 0}], "transactionCoupons": []}`,
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(99)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound, Message: "variant not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newTransactionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPost, "/transactions", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateTransaction(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTransactionHandler_CreateTransaction_DefaultsToPos(t *testing.T) {
	handler, ctrl := newTransactionHandler(t, func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 10000}, nil)
		txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
				assert.Equal(t, domain.TransactionSourcePos, tx.Source)
				tx.Id = 1
				return tx, nil
			})
	})
	defer ctrl.Finish()

	body := `{"name": "Order 1", "orderNumber": 1, "transactionItems": [{"variantId": 1, "amount": 2, "note": "", "discountAmount": 0}], "transactionCoupons": []}`
	req := httptest.NewRequest(http.MethodPost, "/transactions", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.CreateTransaction(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var response apiContract.TransactionCreateResponse
	require.NoError(t, json.NewDecoder(w.Body).Decode(&response))
	assert.Equal(t, "pos", response.Data.Source)
}

func TestTransactionHandler_UpdateTransactionById(t *testing.T) {
	tests := []struct {
		name           string
		transactionId  string
		body           string
		setupMocks     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			transactionId: "1",
			body:          `{"name": "Order 1", "orderNumber": 1, "transactionItems": [{"variantId": 1, "amount": 1, "note": "", "discountAmount": 0}], "transactionCoupons": []}`,
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, PaidAt: nil}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 10000}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, Total: 10000}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:          "invalid id",
			transactionId: "abc",
			body:          `{}`,
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "cannot update paid transaction",
			transactionId: "2",
			body:          `{"name": "Order 1", "orderNumber": 1, "transactionItems": [], "transactionCoupons": []}`,
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				paidAt := time.Now()
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{Id: 2, PaidAt: &paidAt}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newTransactionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPut, "/transactions/"+tt.transactionId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"transactionId": tt.transactionId})
			w := httptest.NewRecorder()
			handler.UpdateTransactionById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTransactionHandler_DeleteTransactionById(t *testing.T) {
	tests := []struct {
		name           string
		transactionId  string
		setupMocks     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			transactionId: "1",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, PaidAt: nil}, nil)
				txRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:          "invalid id",
			transactionId: "abc",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "not found",
			transactionId: "99",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newTransactionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodDelete, "/transactions/"+tt.transactionId, nil)
			req = mux.SetURLVars(req, map[string]string{"transactionId": tt.transactionId})
			w := httptest.NewRecorder()
			handler.DeleteTransactionById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTransactionHandler_PayTransaction(t *testing.T) {
	tests := []struct {
		name           string
		transactionId  string
		body           string
		setupMocks     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			transactionId: "1",
			body:          `{"walletId": 1, "paidAmount": 20000}`,
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, PaidAt: nil, Total: 20000, TransactionItems: []domain.TransactionItem{}}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Name: "Cash", Balance: 0, PaymentCostPercentage: 0}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Transaction{}, nil)
				txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(20000), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:          "invalid id",
			transactionId: "abc",
			body:          `{"walletId": 1, "paidAmount": 20000}`,
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "already paid",
			transactionId: "2",
			body:          `{"walletId": 1, "paidAmount": 20000}`,
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				paidAt := time.Now()
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{Id: 2, PaidAt: &paidAt}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newTransactionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPost, "/transactions/"+tt.transactionId+"/pay", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"transactionId": tt.transactionId})
			w := httptest.NewRecorder()
			handler.PayTransaction(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTransactionHandler_UnpayTransaction(t *testing.T) {
	tests := []struct {
		name           string
		transactionId  string
		setupMocks     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:          "already unpaid",
			transactionId: "1",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, PaidAt: nil}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "invalid id",
			transactionId: "abc",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newTransactionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPost, "/transactions/"+tt.transactionId+"/unpay", nil)
			req = mux.SetURLVars(req, map[string]string{"transactionId": tt.transactionId})
			w := httptest.NewRecorder()
			handler.UnpayTransaction(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTransactionHandler_GetTransactionStatistics(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMocks     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/transactions/statistics",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().GetTransactionStatistics(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.TransactionStatistic{{Date: "2024-01", Total: 10000}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			url:  "/transactions/statistics",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().GetTransactionStatistics(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name: "valid range",
			url:  "/transactions/statistics?startDate=2024-01-01&endDate=2024-01-31",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().GetTransactionStatistics(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.TransactionStatistic{{Date: "2024-01", Total: 10000}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "malformed startDate",
			url:  "/transactions/statistics?startDate=not-a-date",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "malformed endDate",
			url:  "/transactions/statistics?endDate=not-a-date",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "startDate after endDate",
			url:  "/transactions/statistics?startDate=2024-02-01&endDate=2024-01-01",
			setupMocks: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, walletRepo *mock.MockWalletRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newTransactionHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetTransactionStatistics(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
