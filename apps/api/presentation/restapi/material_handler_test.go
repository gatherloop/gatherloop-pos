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

func TestMaterialHandler_GetMaterialList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMock      func(r *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/materials",
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Material{{Id: 1}}, nil)
				r.EXPECT().GetMaterialListTotal(gomock.Any(), gomock.Any()).Return(int64(1), nil)
				r.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), gomock.Any()).Return(map[int64]float32{1: 0}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid skip param",
			url:            "/materials?skip=abc",
			setupMock:      func(r *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/materials",
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewMaterialHandler(domain.NewMaterialUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetMaterialList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestMaterialHandler_GetMaterialById(t *testing.T) {
	tests := []struct {
		name           string
		materialId     string
		setupMock      func(r *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			materialId: "1",
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{1}).Return(map[int64]float32{1: 0}, nil)
				r.EXPECT().GetMaterialById(gomock.Any(), int64(1)).Return(domain.Material{Id: 1, Name: "Sugar"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:       "not found",
			materialId: "99",
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{99}).Return(map[int64]float32{}, nil)
				r.EXPECT().GetMaterialById(gomock.Any(), int64(99)).Return(domain.Material{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			materialId:     "abc",
			setupMock:      func(r *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewMaterialHandler(domain.NewMaterialUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/materials/"+tt.materialId, nil)
			req = mux.SetURLVars(req, map[string]string{"materialId": tt.materialId})
			w := httptest.NewRecorder()
			handler.GetMaterialById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestMaterialHandler_CreateMaterial(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"name": "Sugar", "price": 15000, "unit": "kg"}`,
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().CreateMaterial(gomock.Any(), gomock.Any()).Return(domain.Material{Id: 1, Name: "Sugar"}, nil)
				r.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{1}).Return(map[int64]float32{1: 0}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"name": "Sugar", "price": 15000, "unit": "kg"}`,
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().CreateMaterial(gomock.Any(), gomock.Any()).Return(domain.Material{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewMaterialHandler(domain.NewMaterialUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/materials", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateMaterial(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestMaterialHandler_UpdateMaterialById(t *testing.T) {
	tests := []struct {
		name           string
		materialId     string
		body           string
		setupMock      func(r *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			materialId: "1",
			body:       `{"name": "Salt", "price": 5000, "unit": "kg"}`,
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().UpdateMaterialById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Material{Id: 1, Name: "Salt"}, nil)
				r.EXPECT().GetMaterialsWeeklyUsage(gomock.Any(), []int64{1}).Return(map[int64]float32{1: 0}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			materialId:     "abc",
			body:           `{}`,
			setupMock:      func(r *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:       "not found",
			materialId: "99",
			body:       `{"name": "Salt", "price": 5000, "unit": "kg"}`,
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().UpdateMaterialById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Material{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewMaterialHandler(domain.NewMaterialUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/materials/"+tt.materialId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"materialId": tt.materialId})
			w := httptest.NewRecorder()
			handler.UpdateMaterialById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestMaterialHandler_DeleteMaterialById(t *testing.T) {
	tests := []struct {
		name           string
		materialId     string
		setupMock      func(r *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			materialId: "1",
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().DeleteMaterialById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			materialId:     "abc",
			setupMock:      func(r *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:       "not found",
			materialId: "99",
			setupMock: func(r *mock.MockMaterialRepository) {
				r.EXPECT().DeleteMaterialById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewMaterialHandler(domain.NewMaterialUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/materials/"+tt.materialId, nil)
			req = mux.SetURLVars(req, map[string]string{"materialId": tt.materialId})
			w := httptest.NewRecorder()
			handler.DeleteMaterialById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
