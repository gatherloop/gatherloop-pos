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
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newRentalHandler(t *testing.T, setupMocks func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository)) (restapi.RentalHandler, *gomock.Controller) {
	ctrl := gomock.NewController(t)
	rentalRepo := mock.NewMockRentalRepository(ctrl)
	variantRepo := mock.NewMockVariantRepository(ctrl)
	txRepo := mock.NewMockTransactionRepository(ctrl)
	setupMocks(rentalRepo, variantRepo, txRepo)
	usecase := domain.NewRentalUsecase(rentalRepo, variantRepo, txRepo)
	return restapi.NewRentalHandler(usecase), ctrl
}

func TestRentalHandler_GetRentalList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMocks     func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/rentals",
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
				rentalRepo.EXPECT().GetRentalList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Rental{{Id: 1}}, nil)
				rentalRepo.EXPECT().GetRentalListTotal(gomock.Any(), gomock.Any(), gomock.Any()).Return(int64(1), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "invalid skip param",
			url:  "/rentals?skip=abc",
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/rentals",
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
				rentalRepo.EXPECT().GetRentalList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newRentalHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetRentalList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestRentalHandler_GetRentalById(t *testing.T) {
	tests := []struct {
		name           string
		rentalId       string
		setupMocks     func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			rentalId: "1",
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).Return(domain.Rental{Id: 1, Name: "John"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "not found",
			rentalId: "99",
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(99)).Return(domain.Rental{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:     "invalid id",
			rentalId: "abc",
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newRentalHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodGet, "/rentals/"+tt.rentalId, nil)
			req = mux.SetURLVars(req, map[string]string{"rentalId": tt.rentalId})
			w := httptest.NewRecorder()
			handler.GetRentalById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestRentalHandler_CheckinRentals(t *testing.T) {
	checkinAt := time.Now().UTC().Format(time.RFC3339)
	tests := []struct {
		name           string
		body           string
		setupMocks     func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `[{"code": "R001", "name": "John", "variantId": 1, "checkinAt": "` + checkinAt + `"}]`,
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().CheckinRentals(gomock.Any(), gomock.Any()).Return([]domain.Rental{{Id: 1, Name: "John"}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "invalid JSON body",
			body: `{invalid`,
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `[{"code": "R001", "name": "John", "variantId": 1, "checkinAt": "` + checkinAt + `"}]`,
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().CheckinRentals(gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newRentalHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPost, "/rentals/checkin", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CheckinRentals(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestRentalHandler_CheckoutRentals(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMocks     func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `[1]`,
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).Return(domain.Rental{Id: 1, Name: "John", VariantId: 1, CheckinAt: time.Now().Add(-2 * time.Hour)}, nil)
				rentalRepo.EXPECT().CheckoutRental(gomock.Any(), int64(1)).Return(nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 10000}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).Return(domain.Transaction{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "invalid JSON body",
			body: `{invalid`,
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "rental not found",
			body: `[99]`,
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(99)).Return(domain.Rental{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newRentalHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodPost, "/rentals/checkout", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CheckoutRentals(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestRentalHandler_DeleteRentalById(t *testing.T) {
	tests := []struct {
		name           string
		rentalId       string
		setupMocks     func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			rentalId: "1",
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(1)).Return(domain.Rental{Id: 1, Name: "John"}, nil)
				rentalRepo.EXPECT().DeleteRentalById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "invalid id",
			rentalId: "abc",
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "not found",
			rentalId: "99",
			setupMocks: func(rentalRepo *mock.MockRentalRepository, variantRepo *mock.MockVariantRepository, txRepo *mock.MockTransactionRepository) {
				rentalRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				rentalRepo.EXPECT().GetRentalById(gomock.Any(), int64(99)).Return(domain.Rental{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newRentalHandler(t, tt.setupMocks)
			defer ctrl.Finish()
			req := httptest.NewRequest(http.MethodDelete, "/rentals/"+tt.rentalId, nil)
			req = mux.SetURLVars(req, map[string]string{"rentalId": tt.rentalId})
			w := httptest.NewRecorder()
			handler.DeleteRentalById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
