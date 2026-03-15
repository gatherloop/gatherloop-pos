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

func newCalculationHandler(t *testing.T, setupMocks func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository)) (restapi.CalculationHandler, *gomock.Controller) {
	ctrl := gomock.NewController(t)
	calcRepo := mock.NewMockCalculationRepository(ctrl)
	walletRepo := mock.NewMockWalletRepository(ctrl)
	setupMocks(calcRepo, walletRepo)
	usecase := domain.NewCalculationUsecase(calcRepo, walletRepo)
	return restapi.NewCalculationHandler(usecase), ctrl
}

func TestCalculationHandler_GetCalculationList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMocks     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/calculations",
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().GetCalculationList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Calculation{{Id: 1}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid skip param",
			url:            "/calculations?skip=abc",
			setupMocks:     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/calculations",
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().GetCalculationList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newCalculationHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetCalculationList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCalculationHandler_GetCalculationById(t *testing.T) {
	tests := []struct {
		name           string
		calculationId  string
		setupMocks     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			calculationId: "1",
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(1)).Return(domain.Calculation{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:          "not found",
			calculationId: "99",
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(99)).Return(domain.Calculation{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			calculationId:  "abc",
			setupMocks:     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newCalculationHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, "/calculations/"+tt.calculationId, nil)
			req = mux.SetURLVars(req, map[string]string{"calculationId": tt.calculationId})
			w := httptest.NewRecorder()
			handler.GetCalculationById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCalculationHandler_CreateCalculation(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMocks     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"walletId": 1, "calculationItems": [{"price": 15000, "amount": 2}]}`,
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 100000}, nil)
				calcRepo.EXPECT().CreateCalculation(gomock.Any(), gomock.Any()).Return(domain.Calculation{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMocks:     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "wallet not found",
			body: `{"walletId": 99, "calculationItems": [{"price": 15000, "amount": 2}]}`,
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(99)).Return(domain.Wallet{}, &domain.Error{Type: domain.NotFound, Message: "wallet not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newCalculationHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPost, "/calculations", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateCalculation(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCalculationHandler_UpdateCalculationById(t *testing.T) {
	tests := []struct {
		name           string
		calculationId  string
		body           string
		setupMocks     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			calculationId: "1",
			body:          `{"walletId": 1, "calculationItems": [{"price": 20000, "amount": 1}]}`,
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(1)).Return(domain.Calculation{Id: 1}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Balance: 100000}, nil)
				calcRepo.EXPECT().UpdateCalculationById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Calculation{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			calculationId:  "abc",
			body:           `{}`,
			setupMocks:     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "not found",
			calculationId: "99",
			body:          `{"walletId": 1, "calculationItems": [{"price": 20000, "amount": 1}]}`,
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(99)).Return(domain.Calculation{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newCalculationHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPut, "/calculations/"+tt.calculationId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"calculationId": tt.calculationId})
			w := httptest.NewRecorder()
			handler.UpdateCalculationById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCalculationHandler_DeleteCalculationById(t *testing.T) {
	tests := []struct {
		name           string
		calculationId  string
		setupMocks     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			calculationId: "1",
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(1)).Return(domain.Calculation{Id: 1}, nil)
				calcRepo.EXPECT().DeleteCalculationById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			calculationId:  "abc",
			setupMocks:     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "not found",
			calculationId: "99",
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().GetCalculationById(gomock.Any(), int64(99)).Return(domain.Calculation{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newCalculationHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodDelete, "/calculations/"+tt.calculationId, nil)
			req = mux.SetURLVars(req, map[string]string{"calculationId": tt.calculationId})
			w := httptest.NewRecorder()
			handler.DeleteCalculationById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCalculationHandler_CompleteCalculationById(t *testing.T) {
	tests := []struct {
		name           string
		calculationId  string
		setupMocks     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			calculationId: "1",
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().CompleteCalculationById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			calculationId:  "abc",
			setupMocks:     func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "not found",
			calculationId: "99",
			setupMocks: func(calcRepo *mock.MockCalculationRepository, walletRepo *mock.MockWalletRepository) {
				calcRepo.EXPECT().CompleteCalculationById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newCalculationHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPost, "/calculations/"+tt.calculationId+"/complete", nil)
			req = mux.SetURLVars(req, map[string]string{"calculationId": tt.calculationId})
			w := httptest.NewRecorder()
			handler.CompleteCalculationById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
