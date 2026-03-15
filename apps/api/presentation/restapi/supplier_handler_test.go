package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestSupplierHandler_GetSupplierList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMock      func(r *mock.MockSupplierRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/suppliers",
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().GetSupplierList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Supplier{{Id: 1}}, nil)
				r.EXPECT().GetSupplierListTotal(gomock.Any(), gomock.Any()).Return(int64(1), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid skip param",
			url:            "/suppliers?skip=abc",
			setupMock:      func(r *mock.MockSupplierRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/suppliers",
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().GetSupplierList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewSupplierHandler(domain.NewSupplierUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetSupplierList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestSupplierHandler_GetSupplierById(t *testing.T) {
	tests := []struct {
		name           string
		supplierId     string
		setupMock      func(r *mock.MockSupplierRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			supplierId: "1",
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().GetSupplierById(gomock.Any(), int64(1)).Return(domain.Supplier{Id: 1, Name: "PT Gula"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:       "not found",
			supplierId: "99",
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().GetSupplierById(gomock.Any(), int64(99)).Return(domain.Supplier{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			supplierId:     "abc",
			setupMock:      func(r *mock.MockSupplierRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewSupplierHandler(domain.NewSupplierUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/suppliers/"+tt.supplierId, nil)
			req = mux.SetURLVars(req, map[string]string{"supplierId": tt.supplierId})
			w := httptest.NewRecorder()
			handler.GetSupplierById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestSupplierHandler_CreateSupplier(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockSupplierRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"name": "PT Gula", "address": "Jakarta", "mapsLink": "https://maps.google.com"}`,
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().CreateSupplier(gomock.Any(), gomock.Any()).Return(domain.Supplier{Id: 1, Name: "PT Gula"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockSupplierRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"name": "PT Gula", "address": "Jakarta", "mapsLink": "https://maps.google.com"}`,
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().CreateSupplier(gomock.Any(), gomock.Any()).Return(domain.Supplier{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewSupplierHandler(domain.NewSupplierUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/suppliers", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateSupplier(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestSupplierHandler_UpdateSupplierById(t *testing.T) {
	tests := []struct {
		name           string
		supplierId     string
		body           string
		setupMock      func(r *mock.MockSupplierRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			supplierId: "1",
			body:       `{"name": "CV Garam", "address": "Surabaya", "mapsLink": "https://maps.google.com"}`,
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().UpdateSupplierById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Supplier{Id: 1, Name: "CV Garam"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			supplierId:     "abc",
			body:           `{}`,
			setupMock:      func(r *mock.MockSupplierRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:       "not found",
			supplierId: "99",
			body:       `{"name": "CV Garam", "address": "Surabaya", "mapsLink": "https://maps.google.com"}`,
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().UpdateSupplierById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Supplier{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewSupplierHandler(domain.NewSupplierUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/suppliers/"+tt.supplierId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"supplierId": tt.supplierId})
			w := httptest.NewRecorder()
			handler.UpdateSupplierById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestSupplierHandler_DeleteSupplierById(t *testing.T) {
	tests := []struct {
		name           string
		supplierId     string
		setupMock      func(r *mock.MockSupplierRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			supplierId: "1",
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().DeleteSupplierById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			supplierId:     "abc",
			setupMock:      func(r *mock.MockSupplierRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:       "not found",
			supplierId: "99",
			setupMock: func(r *mock.MockSupplierRepository) {
				r.EXPECT().DeleteSupplierById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockSupplierRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewSupplierHandler(domain.NewSupplierUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/suppliers/"+tt.supplierId, nil)
			req = mux.SetURLVars(req, map[string]string{"supplierId": tt.supplierId})
			w := httptest.NewRecorder()
			handler.DeleteSupplierById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
