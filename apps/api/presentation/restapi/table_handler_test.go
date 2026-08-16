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

func withTableTransactionMock(r *mock.MockTableRepository) {
	r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
}

func TestTableHandler_GetTableList(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(r *mock.MockTableRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().GetTableList(gomock.Any()).Return([]domain.Table{{Id: 1, Code: "0123456789", Label: "Meja 1"}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().GetTableList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTableHandler(domain.NewTableUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/tables", nil)
			w := httptest.NewRecorder()
			handler.GetTableList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTableHandler_GetTableById(t *testing.T) {
	tests := []struct {
		name           string
		tableId        string
		setupMock      func(r *mock.MockTableRepository)
		expectedStatus int
	}{
		{
			name:    "success",
			tableId: "1",
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().GetTableById(gomock.Any(), int64(1)).Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:    "not found",
			tableId: "99",
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().GetTableById(gomock.Any(), int64(99)).Return(domain.Table{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			tableId:        "abc",
			setupMock:      func(r *mock.MockTableRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTableHandler(domain.NewTableUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/tables/"+tt.tableId, nil)
			req = mux.SetURLVars(req, map[string]string{"tableId": tt.tableId})
			w := httptest.NewRecorder()
			handler.GetTableById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTableHandler_CreateTable(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockTableRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"label": "Meja 1"}`,
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransactionMock(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 1").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTableByCode(gomock.Any(), gomock.Any()).Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().CreateTable(gomock.Any(), gomock.Any()).Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockTableRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "duplicate label",
			body: `{"label": "Meja 1"}`,
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransactionMock(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 1").Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1"}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTableHandler(domain.NewTableUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/tables", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateTable(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTableHandler_UpdateTableById(t *testing.T) {
	tests := []struct {
		name           string
		tableId        string
		body           string
		setupMock      func(r *mock.MockTableRepository)
		expectedStatus int
	}{
		{
			name:    "success",
			tableId: "1",
			body:    `{"label": "Meja 1 Renamed"}`,
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransactionMock(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 1 Renamed").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTableById(gomock.Any(), int64(1)).Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1"}, nil)
				r.EXPECT().UpdateTableById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1 Renamed"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			tableId:        "abc",
			body:           `{}`,
			setupMock:      func(r *mock.MockTableRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid JSON body",
			tableId:        "1",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockTableRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:    "not found",
			tableId: "99",
			body:    `{"label": "Meja 99"}`,
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransactionMock(r)
				r.EXPECT().GetTableByLabel(gomock.Any(), "Meja 99").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().GetTableById(gomock.Any(), int64(99)).Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTableHandler(domain.NewTableUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/tables/"+tt.tableId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"tableId": tt.tableId})
			w := httptest.NewRecorder()
			handler.UpdateTableById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTableHandler_DeleteTableById(t *testing.T) {
	tests := []struct {
		name           string
		tableId        string
		setupMock      func(r *mock.MockTableRepository)
		expectedStatus int
	}{
		{
			name:    "success",
			tableId: "1",
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().DeleteTableById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			tableId:        "abc",
			setupMock:      func(r *mock.MockTableRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:    "not found",
			tableId: "99",
			setupMock: func(r *mock.MockTableRepository) {
				r.EXPECT().DeleteTableById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTableHandler(domain.NewTableUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/tables/"+tt.tableId, nil)
			req = mux.SetURLVars(req, map[string]string{"tableId": tt.tableId})
			w := httptest.NewRecorder()
			handler.DeleteTableById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestTableHandler_RegenerateTableCode(t *testing.T) {
	tests := []struct {
		name           string
		tableId        string
		setupMock      func(r *mock.MockTableRepository)
		expectedStatus int
	}{
		{
			name:    "success",
			tableId: "1",
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransactionMock(r)
				r.EXPECT().GetTableById(gomock.Any(), int64(1)).Return(domain.Table{Id: 1, Code: "0123456789", Label: "Meja 1"}, nil)
				r.EXPECT().GetTableByCode(gomock.Any(), gomock.Any()).Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
				r.EXPECT().UpdateTableById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Table{Id: 1, Code: "ABCDEFGHJK", Label: "Meja 1"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			tableId:        "abc",
			setupMock:      func(r *mock.MockTableRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:    "not found",
			tableId: "99",
			setupMock: func(r *mock.MockTableRepository) {
				withTableTransactionMock(r)
				r.EXPECT().GetTableById(gomock.Any(), int64(99)).Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewTableHandler(domain.NewTableUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/tables/"+tt.tableId+"/regenerate-code", nil)
			req = mux.SetURLVars(req, map[string]string{"tableId": tt.tableId})
			w := httptest.NewRecorder()
			handler.RegenerateTableCode(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
