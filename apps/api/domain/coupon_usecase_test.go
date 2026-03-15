package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestCouponUsecase_GetCouponList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockCouponRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().GetCouponList(gomock.Any()).Return([]domain.Coupon{
					{Id: 1, Code: "DISC10", Type: domain.Percentage, Amount: 10},
					{Id: 2, Code: "FLAT50", Type: domain.Fixed, Amount: 50000},
				}, nil)
			},
			expectedLen: 2,
		},
		{
			name: "repository error",
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().GetCouponList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockCouponRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewCouponUsecase(mockRepo)
			coupons, err := usecase.GetCouponList(context.Background())

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, coupons, tt.expectedLen)
			}
		})
	}
}

func TestCouponUsecase_GetCouponById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockCouponRepository)
		expectedCode  string
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().GetCouponById(gomock.Any(), int64(1)).Return(domain.Coupon{Id: 1, Code: "DISC10", Type: domain.Percentage, Amount: 10}, nil)
			},
			expectedCode: "DISC10",
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().GetCouponById(gomock.Any(), int64(99)).Return(domain.Coupon{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockCouponRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewCouponUsecase(mockRepo)
			coupon, err := usecase.GetCouponById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedCode, coupon.Code)
			}
		})
	}
}

func TestCouponUsecase_CreateCoupon(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Coupon
		setupMock     func(r *mock.MockCouponRepository)
		expectedId    int64
		expectedError *domain.Error
	}{
		{
			name:  "success",
			input: domain.Coupon{Code: "NEWCODE", Type: domain.Fixed, Amount: 25000},
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().CreateCoupon(gomock.Any(), gomock.Any()).Return(domain.Coupon{Id: 3, Code: "NEWCODE"}, nil)
			},
			expectedId: 3,
		},
		{
			name:  "repository error",
			input: domain.Coupon{Code: "NEWCODE"},
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().CreateCoupon(gomock.Any(), gomock.Any()).Return(domain.Coupon{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockCouponRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewCouponUsecase(mockRepo)
			coupon, err := usecase.CreateCoupon(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, coupon.Id)
			}
		})
	}
}

func TestCouponUsecase_UpdateCouponById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		input         domain.Coupon
		setupMock     func(r *mock.MockCouponRepository)
		expectedCode  string
		expectedError *domain.Error
	}{
		{
			name:  "success",
			id:    1,
			input: domain.Coupon{Code: "UPDATED", Type: domain.Percentage, Amount: 20},
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().UpdateCouponById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Coupon{Id: 1, Code: "UPDATED"}, nil)
			},
			expectedCode: "UPDATED",
		},
		{
			name:  "not found",
			id:    99,
			input: domain.Coupon{Code: "UPDATED"},
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().UpdateCouponById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Coupon{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockCouponRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewCouponUsecase(mockRepo)
			coupon, err := usecase.UpdateCouponById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedCode, coupon.Code)
			}
		})
	}
}

func TestCouponUsecase_DeleteCouponById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockCouponRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().DeleteCouponById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().DeleteCouponById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockCouponRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewCouponUsecase(mockRepo)
			err := usecase.DeleteCouponById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
