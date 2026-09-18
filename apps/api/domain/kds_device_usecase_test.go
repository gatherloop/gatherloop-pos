package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func TestKdsDeviceUsecase_RegisterKdsDevice(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.KdsDevice
		setupMock     func(r *mock.MockKdsDeviceRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name:  "success",
			input: domain.KdsDevice{Name: "Andi's phone", PushToken: "ExponentPushToken[abc]", Platform: domain.KdsPlatformAndroid},
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().RegisterKdsDevice(gomock.Any(), gomock.Any()).Return(domain.KdsDevice{Id: 1, Name: "Andi's phone"}, nil)
			},
			expectedId: 1,
		},
		{
			name:  "re-register with the same token updates the existing row",
			input: domain.KdsDevice{Name: "Andi's phone (renamed)", PushToken: "ExponentPushToken[abc]", Platform: domain.KdsPlatformAndroid},
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().RegisterKdsDevice(gomock.Any(), gomock.Any()).Return(domain.KdsDevice{Id: 1, Name: "Andi's phone (renamed)"}, nil)
			},
			expectedId: 1,
		},
		{
			name:          "missing name",
			input:         domain.KdsDevice{PushToken: "ExponentPushToken[abc]", Platform: domain.KdsPlatformAndroid},
			setupMock:     func(r *mock.MockKdsDeviceRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "missing token",
			input:         domain.KdsDevice{Name: "Andi's phone", Platform: domain.KdsPlatformAndroid},
			setupMock:     func(r *mock.MockKdsDeviceRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:          "invalid platform",
			input:         domain.KdsDevice{Name: "Andi's phone", PushToken: "ExponentPushToken[abc]", Platform: "windows"},
			setupMock:     func(r *mock.MockKdsDeviceRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "repository error",
			input: domain.KdsDevice{Name: "Andi's phone", PushToken: "ExponentPushToken[abc]", Platform: domain.KdsPlatformAndroid},
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().RegisterKdsDevice(gomock.Any(), gomock.Any()).Return(domain.KdsDevice{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockKdsDeviceRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewKdsDeviceUsecase(mockRepo, nil, "default")
			device, err := usecase.RegisterKdsDevice(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, device.Id)
			}
		})
	}
}

func TestKdsDeviceUsecase_GetKdsDeviceList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockKdsDeviceRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().GetKdsDeviceList(gomock.Any()).Return([]domain.KdsDevice{
					{Id: 1, Name: "Andi's phone"},
					{Id: 2, Name: "Counter tablet"},
				}, nil)
			},
			expectedLen: 2,
		},
		{
			name: "repository error",
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().GetKdsDeviceList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockKdsDeviceRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewKdsDeviceUsecase(mockRepo, nil, "default")
			devices, err := usecase.GetKdsDeviceList(context.Background())

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, devices, tt.expectedLen)
			}
		})
	}
}

func TestKdsDeviceUsecase_DeleteKdsDeviceById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockKdsDeviceRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().DeleteKdsDeviceById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockKdsDeviceRepository) {
				r.EXPECT().DeleteKdsDeviceById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockKdsDeviceRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewKdsDeviceUsecase(mockRepo, nil, "default")
			err := usecase.DeleteKdsDeviceById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestKdsDeviceUsecase_SendTestNotification(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockKdsDeviceRepository, g *mock.MockKdsPushGatewayRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockKdsDeviceRepository, g *mock.MockKdsPushGatewayRepository) {
				r.EXPECT().GetKdsDeviceById(gomock.Any(), int64(1)).Return(domain.KdsDevice{Id: 1, PushToken: "ExponentPushToken[abc]"}, nil)
				g.EXPECT().Send(gomock.Any(), gomock.Any()).Return([]domain.KdsPushReceipt{{Status: domain.KdsPushReceiptStatusOk}}, nil)
			},
		},
		{
			name: "device not found",
			id:   99,
			setupMock: func(r *mock.MockKdsDeviceRepository, g *mock.MockKdsPushGatewayRepository) {
				r.EXPECT().GetKdsDeviceById(gomock.Any(), int64(99)).Return(domain.KdsDevice{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "gateway unreachable maps to BadGateway",
			id:   1,
			setupMock: func(r *mock.MockKdsDeviceRepository, g *mock.MockKdsPushGatewayRepository) {
				r.EXPECT().GetKdsDeviceById(gomock.Any(), int64(1)).Return(domain.KdsDevice{Id: 1, PushToken: "ExponentPushToken[abc]"}, nil)
				g.EXPECT().Send(gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.BadGateway, Message: "failed to reach Expo push service"})
			},
			expectedError: &domain.Error{Type: domain.BadGateway},
		},
		{
			name: "gateway error receipt maps to BadGateway",
			id:   1,
			setupMock: func(r *mock.MockKdsDeviceRepository, g *mock.MockKdsPushGatewayRepository) {
				r.EXPECT().GetKdsDeviceById(gomock.Any(), int64(1)).Return(domain.KdsDevice{Id: 1, PushToken: "ExponentPushToken[dead]"}, nil)
				g.EXPECT().Send(gomock.Any(), gomock.Any()).Return([]domain.KdsPushReceipt{{Status: domain.KdsPushReceiptStatusError, Message: "not a registered push notification recipient", ErrorCode: domain.KdsPushErrorCodeDeviceNotRegistered}}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadGateway},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockKdsDeviceRepository(ctrl)
			mockGateway := mock.NewMockKdsPushGatewayRepository(ctrl)
			tt.setupMock(mockRepo, mockGateway)

			usecase := domain.NewKdsDeviceUsecase(mockRepo, mockGateway, "default")
			err := usecase.SendTestNotification(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestKdsDeviceUsecase_SendTestNotification_SendsPriorityHigh(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockRepo := mock.NewMockKdsDeviceRepository(ctrl)
	mockGateway := mock.NewMockKdsPushGatewayRepository(ctrl)

	mockRepo.EXPECT().GetKdsDeviceById(gomock.Any(), int64(1)).
		Return(domain.KdsDevice{Id: 1, PushToken: "ExponentPushToken[abc]"}, nil)

	var sent []domain.KdsPushMessage
	mockGateway.EXPECT().Send(gomock.Any(), gomock.Any()).
		DoAndReturn(func(_ context.Context, messages []domain.KdsPushMessage) ([]domain.KdsPushReceipt, *domain.Error) {
			sent = messages
			return []domain.KdsPushReceipt{{Status: domain.KdsPushReceiptStatusOk}}, nil
		})

	usecase := domain.NewKdsDeviceUsecase(mockRepo, mockGateway, "default")
	err := usecase.SendTestNotification(context.Background(), 1)

	assert.Nil(t, err)
	require.Len(t, sent, 1)
	assert.Equal(t, domain.KdsPushPriorityHigh, sent[0].Priority)
}
