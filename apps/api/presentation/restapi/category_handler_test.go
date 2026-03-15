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

func TestCategoryHandler_GetCategoryList(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(r *mock.MockCategoryRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().GetCategoryList(gomock.Any()).Return([]domain.Category{{Id: 1, Name: "Food"}, {Id: 2, Name: "Drink"}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().GetCategoryList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockCategoryRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewCategoryHandler(domain.NewCategoryUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/categories", nil)
			w := httptest.NewRecorder()
			handler.GetCategoryList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCategoryHandler_GetCategoryById(t *testing.T) {
	tests := []struct {
		name           string
		categoryId     string
		setupMock      func(r *mock.MockCategoryRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			categoryId: "1",
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().GetCategoryById(gomock.Any(), int64(1)).Return(domain.Category{Id: 1, Name: "Food"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:       "not found",
			categoryId: "99",
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().GetCategoryById(gomock.Any(), int64(99)).Return(domain.Category{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			categoryId:     "abc",
			setupMock:      func(r *mock.MockCategoryRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockCategoryRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewCategoryHandler(domain.NewCategoryUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/categories/"+tt.categoryId, nil)
			req = mux.SetURLVars(req, map[string]string{"categoryId": tt.categoryId})
			w := httptest.NewRecorder()
			handler.GetCategoryById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCategoryHandler_CreateCategory(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockCategoryRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"name": "Snacks"}`,
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().CreateCategory(gomock.Any(), gomock.Any()).Return(domain.Category{Id: 3, Name: "Snacks"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid json`,
			setupMock:      func(r *mock.MockCategoryRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"name": "Snacks"}`,
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().CreateCategory(gomock.Any(), gomock.Any()).Return(domain.Category{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockCategoryRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewCategoryHandler(domain.NewCategoryUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/categories", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateCategory(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCategoryHandler_UpdateCategoryById(t *testing.T) {
	tests := []struct {
		name           string
		categoryId     string
		body           string
		setupMock      func(r *mock.MockCategoryRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			categoryId: "2",
			body:       `{"name": "Beverages"}`,
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().UpdateCategoryById(gomock.Any(), gomock.Any(), int64(2)).Return(domain.Category{Id: 2, Name: "Beverages"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			categoryId:     "abc",
			body:           `{"name": "Beverages"}`,
			setupMock:      func(r *mock.MockCategoryRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:       "not found",
			categoryId: "99",
			body:       `{"name": "Beverages"}`,
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().UpdateCategoryById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Category{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockCategoryRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewCategoryHandler(domain.NewCategoryUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/categories/"+tt.categoryId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"categoryId": tt.categoryId})
			w := httptest.NewRecorder()
			handler.UpdateCategoryById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCategoryHandler_DeleteCategoryById(t *testing.T) {
	tests := []struct {
		name           string
		categoryId     string
		setupMock      func(r *mock.MockCategoryRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			categoryId: "1",
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().DeleteCategoryById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			categoryId:     "abc",
			setupMock:      func(r *mock.MockCategoryRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:       "not found",
			categoryId: "99",
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().DeleteCategoryById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockCategoryRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewCategoryHandler(domain.NewCategoryUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/categories/"+tt.categoryId, nil)
			req = mux.SetURLVars(req, map[string]string{"categoryId": tt.categoryId})
			w := httptest.NewRecorder()
			handler.DeleteCategoryById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
