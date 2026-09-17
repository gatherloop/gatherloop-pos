package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
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

			usecase := domain.NewKdsDeviceUsecase(mockRepo)
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

			usecase := domain.NewKdsDeviceUsecase(mockRepo)
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

			usecase := domain.NewKdsDeviceUsecase(mockRepo)
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
