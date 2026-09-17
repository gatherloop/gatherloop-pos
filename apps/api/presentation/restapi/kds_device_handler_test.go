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

func TestKdsDeviceHandler_RegisterKdsDevice(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockKdsDeviceRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"name": "Andi's phone", "pushToken": "ExponentPushToken[abc]", "platform": "android"}`,
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().RegisterKdsDevice(gomock.Any(), gomock.Any()).Return(domain.KdsDevice{Id: 1, Name: "Andi's phone"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockKdsDeviceRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "missing name",
			body:           `{"pushToken": "ExponentPushToken[abc]", "platform": "android"}`,
			setupMock:      func(r *mock.MockKdsDeviceRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"name": "Andi's phone", "pushToken": "ExponentPushToken[abc]", "platform": "android"}`,
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().RegisterKdsDevice(gomock.Any(), gomock.Any()).Return(domain.KdsDevice{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockKdsDeviceRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewKdsDeviceHandler(domain.NewKdsDeviceUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/kds/devices", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.RegisterKdsDevice(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestKdsDeviceHandler_GetKdsDeviceList(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(r *mock.MockKdsDeviceRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().GetKdsDeviceList(gomock.Any()).Return([]domain.KdsDevice{{Id: 1, Name: "Andi's phone"}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().GetKdsDeviceList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockKdsDeviceRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewKdsDeviceHandler(domain.NewKdsDeviceUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/kds/devices", nil)
			w := httptest.NewRecorder()
			handler.GetKdsDeviceList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestKdsDeviceHandler_DeleteKdsDeviceById(t *testing.T) {
	tests := []struct {
		name           string
		kdsDeviceId    string
		setupMock      func(r *mock.MockKdsDeviceRepository)
		expectedStatus int
	}{
		{
			name:        "success",
			kdsDeviceId: "1",
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().DeleteKdsDeviceById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			kdsDeviceId:    "abc",
			setupMock:      func(r *mock.MockKdsDeviceRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:        "not found",
			kdsDeviceId: "99",
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().DeleteKdsDeviceById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockKdsDeviceRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewKdsDeviceHandler(domain.NewKdsDeviceUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/kds/devices/"+tt.kdsDeviceId, nil)
			req = mux.SetURLVars(req, map[string]string{"kdsDeviceId": tt.kdsDeviceId})
			w := httptest.NewRecorder()
			handler.DeleteKdsDeviceById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
