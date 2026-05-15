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

func newTestVariantHandler(ctrl *gomock.Controller, variantRepo *mock.MockVariantRepository, productRepo *mock.MockProductRepository) restapi.VariantHandler {
	return restapi.NewVariantHandler(domain.NewVariantUsecase(variantRepo, productRepo))
}

func TestVariantHandler_GetVariantList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMock      func(r *mock.MockVariantRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/variants",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Variant{{Id: 1}}, nil)
				r.EXPECT().GetVariantListTotal(gomock.Any(), gomock.Any()).Return(int64(1), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid skip param",
			url:            "/variants?skip=abc",
			setupMock:      func(r *mock.MockVariantRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/variants",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(variantRepo)
			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetVariantList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestVariantHandler_GetVariantById(t *testing.T) {
	tests := []struct {
		name           string
		variantId      string
		setupMock      func(r *mock.MockVariantRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			variantId: "1",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Name: "Regular"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:      "not found",
			variantId: "99",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantById(gomock.Any(), int64(99)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			variantId:      "abc",
			setupMock:      func(r *mock.MockVariantRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(variantRepo)
			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodGet, "/variants/"+tt.variantId, nil)
			req = mux.SetURLVars(req, map[string]string{"variantId": tt.variantId})
			w := httptest.NewRecorder()
			handler.GetVariantById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestVariantHandler_CreateVariant(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"productId": 1, "name": "Regular", "price": 15000, "materials": [], "values": []}`,
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {
				pr.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, SaleType: domain.SaleTypePurchase}, nil)
				vr.EXPECT().CreateVariant(gomock.Any(), gomock.Any()).Return(domain.Variant{Id: 1, Name: "Regular"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"productId": 1, "name": "Regular", "price": 15000, "materials": [], "values": []}`,
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {
				pr.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(variantRepo, productRepo)
			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodPost, "/variants", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateVariant(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestVariantHandler_UpdateVariantById(t *testing.T) {
	tests := []struct {
		name           string
		variantId      string
		body           string
		setupMock      func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			variantId: "1",
			body:      `{"productId": 1, "name": "Large", "price": 20000, "materials": [], "values": []}`,
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {
				vr.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				vr.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 1}, nil)
				pr.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, SaleType: domain.SaleTypePurchase}, nil)
				vr.EXPECT().UpdateVariantById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Name: "Large"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			variantId:      "abc",
			body:           `{}`,
			setupMock:      func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "not found",
			variantId: "99",
			body:      `{"productId": 1, "name": "Large", "price": 20000, "materials": [], "values": []}`,
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {
				vr.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				vr.EXPECT().GetVariantById(gomock.Any(), int64(99)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(variantRepo, productRepo)
			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodPut, "/variants/"+tt.variantId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"variantId": tt.variantId})
			w := httptest.NewRecorder()
			handler.UpdateVariantById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestVariantHandler_DeleteVariantById(t *testing.T) {
	tests := []struct {
		name           string
		variantId      string
		setupMock      func(r *mock.MockVariantRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			variantId: "1",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().DeleteVariantById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			variantId:      "abc",
			setupMock:      func(r *mock.MockVariantRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "not found",
			variantId: "99",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().DeleteVariantById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(variantRepo)
			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodDelete, "/variants/"+tt.variantId, nil)
			req = mux.SetURLVars(req, map[string]string{"variantId": tt.variantId})
			w := httptest.NewRecorder()
			handler.DeleteVariantById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
