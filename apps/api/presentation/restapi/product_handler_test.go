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

func TestProductHandler_GetProductList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMock      func(r *mock.MockProductRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/products",
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Product{{Id: 1}}, nil)
				r.EXPECT().GetProductListTotal(gomock.Any(), gomock.Any(), gomock.Any()).Return(int64(1), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid skip param",
			url:            "/products?skip=abc",
			setupMock:      func(r *mock.MockProductRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/products",
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewProductHandler(domain.NewProductUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetProductList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestProductHandler_GetProductById(t *testing.T) {
	tests := []struct {
		name           string
		productId      string
		setupMock      func(r *mock.MockProductRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			productId: "1",
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, Name: "Nasi Goreng"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:      "not found",
			productId: "99",
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductById(gomock.Any(), int64(99)).Return(domain.Product{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			productId:      "abc",
			setupMock:      func(r *mock.MockProductRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewProductHandler(domain.NewProductUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/products/"+tt.productId, nil)
			req = mux.SetURLVars(req, map[string]string{"productId": tt.productId})
			w := httptest.NewRecorder()
			handler.GetProductById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestProductHandler_CreateProduct(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockProductRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"categoryId": 1, "name": "Nasi Goreng", "imageUrl": "", "options": [], "saleType": "retail"}`,
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().CreateProduct(gomock.Any(), gomock.Any()).Return(domain.Product{Id: 1, Name: "Nasi Goreng"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockProductRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"categoryId": 1, "name": "Nasi Goreng", "imageUrl": "", "options": [], "saleType": "retail"}`,
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().CreateProduct(gomock.Any(), gomock.Any()).Return(domain.Product{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewProductHandler(domain.NewProductUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/products", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateProduct(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestProductHandler_UpdateProductById(t *testing.T) {
	tests := []struct {
		name           string
		productId      string
		body           string
		setupMock      func(r *mock.MockProductRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			productId: "1",
			body:      `{"categoryId": 1, "name": "Mie Goreng", "imageUrl": "", "options": [], "saleType": "retail"}`,
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().UpdateProductById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Product{Id: 1, Name: "Mie Goreng"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			productId:      "abc",
			body:           `{}`,
			setupMock:      func(r *mock.MockProductRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "not found",
			productId: "99",
			body:      `{"categoryId": 1, "name": "Mie Goreng", "imageUrl": "", "options": [], "saleType": "retail"}`,
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().UpdateProductById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Product{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewProductHandler(domain.NewProductUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/products/"+tt.productId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"productId": tt.productId})
			w := httptest.NewRecorder()
			handler.UpdateProductById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestProductHandler_DeleteProductById(t *testing.T) {
	tests := []struct {
		name           string
		productId      string
		setupMock      func(r *mock.MockProductRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			productId: "1",
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().DeleteProductById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			productId:      "abc",
			setupMock:      func(r *mock.MockProductRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "not found",
			productId: "99",
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().DeleteProductById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewProductHandler(domain.NewProductUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/products/"+tt.productId, nil)
			req = mux.SetURLVars(req, map[string]string{"productId": tt.productId})
			w := httptest.NewRecorder()
			handler.DeleteProductById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
