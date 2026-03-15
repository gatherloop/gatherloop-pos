package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestVariantUsecase_GetVariantList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockVariantRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil, []int{}).
					Return([]domain.Variant{{Id: 1, Name: "Small"}, {Id: 2, Name: "Large"}}, nil)
				r.EXPECT().GetVariantListTotal(gomock.Any(), "").Return(int64(2), nil)
			},
			expectedLen: 2,
		},
		{
			name: "error on list",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockVariantRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewVariantUsecase(mockRepo)
			variants, _, err := usecase.GetVariantList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil, []int{})

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, variants, tt.expectedLen)
			}
		})
	}
}

func TestVariantUsecase_GetVariantById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockVariantRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Name: "Small"}, nil)
			},
			expectedName: "Small",
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantById(gomock.Any(), int64(99)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockVariantRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewVariantUsecase(mockRepo)
			variant, err := usecase.GetVariantById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, variant.Name)
			}
		})
	}
}

func TestVariantUsecase_UpdateVariantById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		input         domain.Variant
		setupMock     func(r *mock.MockVariantRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name:  "success",
			id:    1,
			input: domain.Variant{Name: "Medium"},
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error {
						return cb(ctx)
					})
				r.EXPECT().UpdateVariantById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Name: "Medium"}, nil)
			},
			expectedName: "Medium",
		},
		{
			name:  "not found inside transaction",
			id:    99,
			input: domain.Variant{Name: "Medium"},
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error {
						return cb(ctx)
					})
				r.EXPECT().UpdateVariantById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockVariantRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewVariantUsecase(mockRepo)
			variant, err := usecase.UpdateVariantById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, variant.Name)
			}
		})
	}
}

func TestVariantUsecase_DeleteVariantById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockVariantRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().DeleteVariantById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().DeleteVariantById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockVariantRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewVariantUsecase(mockRepo)
			err := usecase.DeleteVariantById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
