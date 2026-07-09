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

func TestStockCheckHandler_GetStockCheckList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMock      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/stock-checks",
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().GetStockCheckList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.StockCheck{{Id: 1}}, nil)
				sc.EXPECT().GetStockCheckListTotal(gomock.Any()).Return(int64(1), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid skip param",
			url:            "/stock-checks?skip=abc",
			setupMock:      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/stock-checks",
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().GetStockCheckList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			scRepo := mock.NewMockStockCheckRepository(ctrl)
			matRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(scRepo, matRepo)
			handler := restapi.NewStockCheckHandler(domain.NewStockCheckUsecase(scRepo, matRepo))
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetStockCheckList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestStockCheckHandler_GetStockCheckById(t *testing.T) {
	tests := []struct {
		name           string
		stockCheckId   string
		setupMock      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name:         "success",
			stockCheckId: "1",
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().GetStockCheckById(gomock.Any(), int64(1)).Return(domain.StockCheck{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:         "not found",
			stockCheckId: "99",
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().GetStockCheckById(gomock.Any(), int64(99)).Return(domain.StockCheck{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			stockCheckId:   "abc",
			setupMock:      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			scRepo := mock.NewMockStockCheckRepository(ctrl)
			matRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(scRepo, matRepo)
			handler := restapi.NewStockCheckHandler(domain.NewStockCheckUsecase(scRepo, matRepo))
			req := httptest.NewRequest(http.MethodGet, "/stock-checks/"+tt.stockCheckId, nil)
			req = mux.SetURLVars(req, map[string]string{"stockCheckId": tt.stockCheckId})
			w := httptest.NewRecorder()
			handler.GetStockCheckById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestStockCheckHandler_CreateStockCheck(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"items": [{"materialId": 1, "currentStock": 3}]}`,
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				m.EXPECT().GetMaterialList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Material{{Id: 1, Name: "Tepung"}}, nil)
				sc.EXPECT().CreateStockCheck(gomock.Any(), gomock.Any()).Return(domain.StockCheck{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"items": []}`,
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				m.EXPECT().GetMaterialList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Material{}, nil)
				sc.EXPECT().CreateStockCheck(gomock.Any(), gomock.Any()).Return(domain.StockCheck{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			scRepo := mock.NewMockStockCheckRepository(ctrl)
			matRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(scRepo, matRepo)
			handler := restapi.NewStockCheckHandler(domain.NewStockCheckUsecase(scRepo, matRepo))
			req := httptest.NewRequest(http.MethodPost, "/stock-checks", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateStockCheck(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestStockCheckHandler_UpdateStockCheckById(t *testing.T) {
	tests := []struct {
		name           string
		stockCheckId   string
		body           string
		setupMock      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name:         "success",
			stockCheckId: "1",
			body:         `{"items": [{"materialId": 1, "currentStock": 5}]}`,
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().GetStockCheckById(gomock.Any(), int64(1)).Return(domain.StockCheck{
					Id:    1,
					Items: []domain.StockCheckItem{{Id: 10, MaterialId: 1, CurrentStock: 3}},
				}, nil)
				sc.EXPECT().UpdateStockCheckById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.StockCheck{Id: 1}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			stockCheckId:   "abc",
			body:           `{}`,
			setupMock:      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:         "not found",
			stockCheckId: "99",
			body:         `{"items": []}`,
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().GetStockCheckById(gomock.Any(), int64(99)).Return(domain.StockCheck{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			scRepo := mock.NewMockStockCheckRepository(ctrl)
			matRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(scRepo, matRepo)
			handler := restapi.NewStockCheckHandler(domain.NewStockCheckUsecase(scRepo, matRepo))
			req := httptest.NewRequest(http.MethodPut, "/stock-checks/"+tt.stockCheckId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"stockCheckId": tt.stockCheckId})
			w := httptest.NewRecorder()
			handler.UpdateStockCheckById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestStockCheckHandler_DeleteStockCheckById(t *testing.T) {
	tests := []struct {
		name           string
		stockCheckId   string
		setupMock      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name:         "success",
			stockCheckId: "1",
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().DeleteStockCheckById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			stockCheckId:   "abc",
			setupMock:      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:         "not found",
			stockCheckId: "99",
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().DeleteStockCheckById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			scRepo := mock.NewMockStockCheckRepository(ctrl)
			matRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(scRepo, matRepo)
			handler := restapi.NewStockCheckHandler(domain.NewStockCheckUsecase(scRepo, matRepo))
			req := httptest.NewRequest(http.MethodDelete, "/stock-checks/"+tt.stockCheckId, nil)
			req = mux.SetURLVars(req, map[string]string{"stockCheckId": tt.stockCheckId})
			w := httptest.NewRecorder()
			handler.DeleteStockCheckById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestStockCheckHandler_GetPurchaseList(t *testing.T) {
	tests := []struct {
		name           string
		stockCheckId   string
		setupMock      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository)
		expectedStatus int
	}{
		{
			name:         "success with items meeting threshold",
			stockCheckId: "1",
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().GetStockCheckById(gomock.Any(), int64(1)).Return(domain.StockCheck{
					Id: 1,
					Items: []domain.StockCheckItem{
						{
							MaterialId:       1,
							MaterialName:     "Tepung",
							CurrentStock:     0,
							Price:            15,
							PurchaseUnit:     "Kg",
							PurchaseUnitSize: 1000,
							MinimumStock:     1,
							NormalStock:      5,
						},
					},
				}, nil)
				m.EXPECT().GetMaterialById(gomock.Any(), int64(1)).Return(domain.Material{Id: 1, Suppliers: []domain.MaterialSupplier{}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:         "not found",
			stockCheckId: "99",
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().GetStockCheckById(gomock.Any(), int64(99)).Return(domain.StockCheck{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			stockCheckId:   "abc",
			setupMock:      func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			scRepo := mock.NewMockStockCheckRepository(ctrl)
			matRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(scRepo, matRepo)
			handler := restapi.NewStockCheckHandler(domain.NewStockCheckUsecase(scRepo, matRepo))
			req := httptest.NewRequest(http.MethodGet, "/stock-checks/"+tt.stockCheckId+"/purchase-list", nil)
			req = mux.SetURLVars(req, map[string]string{"stockCheckId": tt.stockCheckId})
			w := httptest.NewRecorder()
			handler.GetPurchaseList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
