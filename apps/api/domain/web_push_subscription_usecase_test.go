package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestWebPushSubscriptionUsecase_GetWebPushConfig(t *testing.T) {
	usecase := domain.NewWebPushSubscriptionUsecase(nil, "vapid-public-key")
	config := usecase.GetWebPushConfig(context.Background())
	assert.Equal(t, "vapid-public-key", config.VapidPublicKey)
}

func TestWebPushSubscriptionUsecase_SubscribeWebPush(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.WebPushSubscription
		setupMock     func(r *mock.MockWebPushSubscriptionRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name: "success",
			input: domain.WebPushSubscription{
				SessionId: "8ba7e0c4-1d3b-4b1a-9d3e-1b2c3d4e5f60",
				Endpoint:  "https://fcm.googleapis.com/fcm/send/abc",
				P256dhKey: "p256dh-key",
				AuthKey:   "auth-key",
			},
			setupMock: func(r *mock.MockWebPushSubscriptionRepository) {
				r.EXPECT().SubscribeWebPush(gomock.Any(), gomock.Any()).Return(domain.WebPushSubscription{Id: 1}, nil)
			},
			expectedId: 1,
		},
		{
			name: "re-subscribe with the same endpoint updates the existing row",
			input: domain.WebPushSubscription{
				SessionId: "8ba7e0c4-1d3b-4b1a-9d3e-1b2c3d4e5f60",
				Endpoint:  "https://fcm.googleapis.com/fcm/send/abc",
				P256dhKey: "p256dh-key-renewed",
				AuthKey:   "auth-key-renewed",
			},
			setupMock: func(r *mock.MockWebPushSubscriptionRepository) {
				r.EXPECT().SubscribeWebPush(gomock.Any(), gomock.Any()).Return(domain.WebPushSubscription{Id: 1}, nil)
			},
			expectedId: 1,
		},
		{
			name: "malformed endpoint",
			input: domain.WebPushSubscription{
				SessionId: "8ba7e0c4-1d3b-4b1a-9d3e-1b2c3d4e5f60",
				Endpoint:  "not-a-url",
				P256dhKey: "p256dh-key",
				AuthKey:   "auth-key",
			},
			setupMock:     func(r *mock.MockWebPushSubscriptionRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "missing p256dh key",
			input: domain.WebPushSubscription{
				SessionId: "8ba7e0c4-1d3b-4b1a-9d3e-1b2c3d4e5f60",
				Endpoint:  "https://fcm.googleapis.com/fcm/send/abc",
				AuthKey:   "auth-key",
			},
			setupMock:     func(r *mock.MockWebPushSubscriptionRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "missing auth key",
			input: domain.WebPushSubscription{
				SessionId: "8ba7e0c4-1d3b-4b1a-9d3e-1b2c3d4e5f60",
				Endpoint:  "https://fcm.googleapis.com/fcm/send/abc",
				P256dhKey: "p256dh-key",
			},
			setupMock:     func(r *mock.MockWebPushSubscriptionRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "repository error",
			input: domain.WebPushSubscription{
				SessionId: "8ba7e0c4-1d3b-4b1a-9d3e-1b2c3d4e5f60",
				Endpoint:  "https://fcm.googleapis.com/fcm/send/abc",
				P256dhKey: "p256dh-key",
				AuthKey:   "auth-key",
			},
			setupMock: func(r *mock.MockWebPushSubscriptionRepository) {
				r.EXPECT().SubscribeWebPush(gomock.Any(), gomock.Any()).Return(domain.WebPushSubscription{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockWebPushSubscriptionRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewWebPushSubscriptionUsecase(mockRepo, "vapid-public-key")
			subscription, err := usecase.SubscribeWebPush(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, subscription.Id)
			}
		})
	}
}

func TestWebPushSubscriptionUsecase_UnsubscribeWebPush(t *testing.T) {
	tests := []struct {
		name          string
		sessionId     string
		endpoint      string
		setupMock     func(r *mock.MockWebPushSubscriptionRepository)
		expectedError *domain.Error
	}{
		{
			name:      "success",
			sessionId: "8ba7e0c4-1d3b-4b1a-9d3e-1b2c3d4e5f60",
			endpoint:  "https://fcm.googleapis.com/fcm/send/abc",
			setupMock: func(r *mock.MockWebPushSubscriptionRepository) {
				r.EXPECT().UnsubscribeWebPush(gomock.Any(), "8ba7e0c4-1d3b-4b1a-9d3e-1b2c3d4e5f60", "https://fcm.googleapis.com/fcm/send/abc").Return(nil)
			},
		},
		{
			name:      "endpoint belonging to another session is a no-op",
			sessionId: "00000000-0000-4000-8000-000000000000",
			endpoint:  "https://fcm.googleapis.com/fcm/send/abc",
			setupMock: func(r *mock.MockWebPushSubscriptionRepository) {
				r.EXPECT().UnsubscribeWebPush(gomock.Any(), "00000000-0000-4000-8000-000000000000", "https://fcm.googleapis.com/fcm/send/abc").Return(nil)
			},
		},
		{
			name:          "missing endpoint",
			sessionId:     "8ba7e0c4-1d3b-4b1a-9d3e-1b2c3d4e5f60",
			endpoint:      "",
			setupMock:     func(r *mock.MockWebPushSubscriptionRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockWebPushSubscriptionRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewWebPushSubscriptionUsecase(mockRepo, "vapid-public-key")
			err := usecase.UnsubscribeWebPush(context.Background(), tt.sessionId, tt.endpoint)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
