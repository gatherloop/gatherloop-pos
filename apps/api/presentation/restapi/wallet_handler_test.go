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

func TestWalletHandler_GetWalletList(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(r *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().GetWalletList(gomock.Any()).Return([]domain.Wallet{{Id: 1, Name: "Cash"}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().GetWalletList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewWalletHandler(domain.NewWalletUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/wallets", nil)
			w := httptest.NewRecorder()
			handler.GetWalletList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestWalletHandler_GetWalletById(t *testing.T) {
	tests := []struct {
		name           string
		walletId       string
		setupMock      func(r *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			walletId: "1",
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Name: "Cash"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "not found",
			walletId: "99",
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().GetWalletById(gomock.Any(), int64(99)).Return(domain.Wallet{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			walletId:       "abc",
			setupMock:      func(r *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewWalletHandler(domain.NewWalletUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/wallets/"+tt.walletId, nil)
			req = mux.SetURLVars(req, map[string]string{"walletId": tt.walletId})
			w := httptest.NewRecorder()
			handler.GetWalletById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestWalletHandler_CreateWallet(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"name": "Cash", "balance": 0, "paymentCostPercentage": 0, "isCashless": false}`,
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().CreateWallet(gomock.Any(), gomock.Any()).Return(domain.Wallet{Id: 1, Name: "Cash"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"name": "Cash", "balance": 0, "paymentCostPercentage": 0, "isCashless": false}`,
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().CreateWallet(gomock.Any(), gomock.Any()).Return(domain.Wallet{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewWalletHandler(domain.NewWalletUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/wallets", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateWallet(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestWalletHandler_UpdateWalletById(t *testing.T) {
	tests := []struct {
		name           string
		walletId       string
		body           string
		setupMock      func(r *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			walletId: "1",
			body:     `{"name": "Debit", "balance": 0, "paymentCostPercentage": 1, "isCashless": true}`,
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Name: "Debit"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			walletId:       "abc",
			body:           `{}`,
			setupMock:      func(r *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "not found",
			walletId: "99",
			body:     `{"name": "Debit", "balance": 0, "paymentCostPercentage": 1, "isCashless": true}`,
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Wallet{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewWalletHandler(domain.NewWalletUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/wallets/"+tt.walletId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"walletId": tt.walletId})
			w := httptest.NewRecorder()
			handler.UpdateWalletById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestWalletHandler_DeleteWalletById(t *testing.T) {
	tests := []struct {
		name           string
		walletId       string
		setupMock      func(r *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			walletId: "1",
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().DeleteWalletById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			walletId:       "abc",
			setupMock:      func(r *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "not found",
			walletId: "99",
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().DeleteWalletById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewWalletHandler(domain.NewWalletUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/wallets/"+tt.walletId, nil)
			req = mux.SetURLVars(req, map[string]string{"walletId": tt.walletId})
			w := httptest.NewRecorder()
			handler.DeleteWalletById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestWalletHandler_GetWalletTransferList(t *testing.T) {
	tests := []struct {
		name           string
		walletId       string
		setupMock      func(r *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			walletId: "1",
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().GetWalletTransferList(gomock.Any(), int64(1), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.WalletTransfer{}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid wallet id",
			walletId:       "abc",
			setupMock:      func(r *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewWalletHandler(domain.NewWalletUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/wallets/"+tt.walletId+"/transfers", nil)
			req = mux.SetURLVars(req, map[string]string{"walletId": tt.walletId})
			w := httptest.NewRecorder()
			handler.GetWalletTransferList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestWalletHandler_CreateWalletTransfer(t *testing.T) {
	tests := []struct {
		name           string
		walletId       string
		body           string
		setupMock      func(r *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			walletId: "1",
			body:     `{"amount": 50000, "toWalletId": 2}`,
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 100000}, nil)
				r.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				r.EXPECT().GetWalletById(gomock.Any(), int64(2)).Return(domain.Wallet{Id: 2, Balance: 0}, nil)
				r.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(2)).Return(domain.Wallet{}, nil)
				r.EXPECT().CreateWalletTransfer(gomock.Any(), gomock.Any(), int64(1)).Return(domain.WalletTransfer{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid wallet id",
			walletId:       "abc",
			body:           `{"amount": 50000, "toWalletId": 2}`,
			setupMock:      func(r *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "insufficient balance",
			walletId: "1",
			body:     `{"amount": 999999, "toWalletId": 2}`,
			setupMock: func(r *mock.MockWalletRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 100}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewWalletHandler(domain.NewWalletUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/wallets/"+tt.walletId+"/transfers", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"walletId": tt.walletId})
			w := httptest.NewRecorder()
			handler.CreateWalletTransfer(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
