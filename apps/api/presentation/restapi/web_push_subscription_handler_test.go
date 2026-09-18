package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

const testWebPushSessionId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"

func TestWebPushSubscriptionHandler_SubscribeWebPush(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockWebPushSubscriptionRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"endpoint": "https://fcm.googleapis.com/fcm/send/abc", "p256dhKey": "p256dh", "authKey": "auth"}`,
			setupMock: func(r *mock.MockWebPushSubscriptionRepository) {
				r.EXPECT().SubscribeWebPush(gomock.Any(), gomock.Any()).Return(domain.WebPushSubscription{Id: 1, Endpoint: "https://fcm.googleapis.com/fcm/send/abc"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockWebPushSubscriptionRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "malformed endpoint",
			body:           `{"endpoint": "not-a-url", "p256dhKey": "p256dh", "authKey": "auth"}`,
			setupMock:      func(r *mock.MockWebPushSubscriptionRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"endpoint": "https://fcm.googleapis.com/fcm/send/abc", "p256dhKey": "p256dh", "authKey": "auth"}`,
			setupMock: func(r *mock.MockWebPushSubscriptionRepository) {
				r.EXPECT().SubscribeWebPush(gomock.Any(), gomock.Any()).Return(domain.WebPushSubscription{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockWebPushSubscriptionRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewWebPushSubscriptionHandler(domain.NewWebPushSubscriptionUsecase(mockRepo, "vapid-public-key"))
			req := httptest.NewRequest(http.MethodPost, "/web-push/subscriptions", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-Session-Id", testWebPushSessionId)
			w := httptest.NewRecorder()
			handler.SubscribeWebPush(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestWebPushSubscriptionHandler_UnsubscribeWebPush(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockWebPushSubscriptionRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"endpoint": "https://fcm.googleapis.com/fcm/send/abc"}`,
			setupMock: func(r *mock.MockWebPushSubscriptionRepository) {
				r.EXPECT().UnsubscribeWebPush(gomock.Any(), testWebPushSessionId, "https://fcm.googleapis.com/fcm/send/abc").Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockWebPushSubscriptionRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "missing endpoint",
			body:           `{}`,
			setupMock:      func(r *mock.MockWebPushSubscriptionRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "endpoint belonging to another session is still a success no-op",
			body: `{"endpoint": "https://fcm.googleapis.com/fcm/send/abc"}`,
			setupMock: func(r *mock.MockWebPushSubscriptionRepository) {
				r.EXPECT().UnsubscribeWebPush(gomock.Any(), testWebPushSessionId, "https://fcm.googleapis.com/fcm/send/abc").Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockWebPushSubscriptionRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewWebPushSubscriptionHandler(domain.NewWebPushSubscriptionUsecase(mockRepo, "vapid-public-key"))
			req := httptest.NewRequest(http.MethodDelete, "/web-push/subscriptions", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-Session-Id", testWebPushSessionId)
			w := httptest.NewRecorder()
			handler.UnsubscribeWebPush(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestWebPushSubscriptionRouter_RequireSessionId(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		path           string
		handlerFunc    func(handler restapi.WebPushSubscriptionHandler) http.HandlerFunc
		expectedStatus int
	}{
		{
			name:           "subscribe without X-Session-Id is rejected",
			method:         http.MethodPost,
			path:           "/web-push/subscriptions",
			handlerFunc:    func(handler restapi.WebPushSubscriptionHandler) http.HandlerFunc { return handler.SubscribeWebPush },
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "unsubscribe without X-Session-Id is rejected",
			method:         http.MethodDelete,
			path:           "/web-push/subscriptions",
			handlerFunc:    func(handler restapi.WebPushSubscriptionHandler) http.HandlerFunc { return handler.UnsubscribeWebPush },
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockWebPushSubscriptionRepository(ctrl)
			handler := restapi.NewWebPushSubscriptionHandler(domain.NewWebPushSubscriptionUsecase(mockRepo, "vapid-public-key"))

			req := httptest.NewRequest(tt.method, tt.path, bytes.NewBufferString(`{}`))
			w := httptest.NewRecorder()

			restapi.RequireSessionId(tt.handlerFunc(handler)).ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
