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

func TestBudgetHandler_GetBudgetList(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(r *mock.MockBudgetRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().GetBudgetList(gomock.Any()).Return([]domain.Budget{{Id: 1, Name: "Operations"}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().GetBudgetList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewBudgetHandler(domain.NewBudgetUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/budgets", nil)
			w := httptest.NewRecorder()
			handler.GetBudgetList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestBudgetHandler_GetBudgetById(t *testing.T) {
	tests := []struct {
		name           string
		budgetId       string
		setupMock      func(r *mock.MockBudgetRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			budgetId: "1",
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().GetBudgetById(gomock.Any(), int64(1)).Return(domain.Budget{Id: 1, Name: "Operations"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "not found",
			budgetId: "99",
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().GetBudgetById(gomock.Any(), int64(99)).Return(domain.Budget{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			budgetId:       "abc",
			setupMock:      func(r *mock.MockBudgetRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewBudgetHandler(domain.NewBudgetUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/budgets/"+tt.budgetId, nil)
			req = mux.SetURLVars(req, map[string]string{"budgetId": tt.budgetId})
			w := httptest.NewRecorder()
			handler.GetBudgetById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestBudgetHandler_CreateBudget(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockBudgetRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"name": "Operations", "balance": 0, "percentage": 50}`,
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().CreateBudget(gomock.Any(), gomock.Any()).Return(domain.Budget{Id: 1, Name: "Operations"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockBudgetRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"name": "Operations", "balance": 0, "percentage": 50}`,
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().CreateBudget(gomock.Any(), gomock.Any()).Return(domain.Budget{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewBudgetHandler(domain.NewBudgetUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/budgets", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateBudget(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestBudgetHandler_UpdateBudgetById(t *testing.T) {
	tests := []struct {
		name           string
		budgetId       string
		body           string
		setupMock      func(r *mock.MockBudgetRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			budgetId: "1",
			body:     `{"name": "Operations", "balance": 100, "percentage": 50}`,
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().UpdateBudgetById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Budget{Id: 1, Name: "Operations"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			budgetId:       "abc",
			body:           `{}`,
			setupMock:      func(r *mock.MockBudgetRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "not found",
			budgetId: "99",
			body:     `{"name": "Operations", "balance": 100, "percentage": 50}`,
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().UpdateBudgetById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Budget{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewBudgetHandler(domain.NewBudgetUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/budgets/"+tt.budgetId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"budgetId": tt.budgetId})
			w := httptest.NewRecorder()
			handler.UpdateBudgetById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestBudgetHandler_DeleteBudgetById(t *testing.T) {
	tests := []struct {
		name           string
		budgetId       string
		setupMock      func(r *mock.MockBudgetRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			budgetId: "1",
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().DeleteBudgetById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			budgetId:       "abc",
			setupMock:      func(r *mock.MockBudgetRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "not found",
			budgetId: "99",
			setupMock: func(r *mock.MockBudgetRepository) {
				r.EXPECT().DeleteBudgetById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockBudgetRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewBudgetHandler(domain.NewBudgetUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/budgets/"+tt.budgetId, nil)
			req = mux.SetURLVars(req, map[string]string{"budgetId": tt.budgetId})
			w := httptest.NewRecorder()
			handler.DeleteBudgetById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
