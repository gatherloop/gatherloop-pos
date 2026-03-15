package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestCategoryUsecase_GetCategoryList(t *testing.T) {
	tests := []struct {
		name               string
		setupMock          func(r *mock.MockCategoryRepository)
		expectedLen        int
		expectedFirstName  string
		expectedSecondName string
		expectedError      *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().GetCategoryList(gomock.Any()).Return([]domain.Category{
					{Id: 1, Name: "Food"},
					{Id: 2, Name: "Drink"},
				}, nil)
			},
			expectedLen:        2,
			expectedFirstName:  "Food",
			expectedSecondName: "Drink",
		},
		{
			name: "repository error",
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().GetCategoryList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockCategoryRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewCategoryUsecase(mockRepo)
			categories, err := usecase.GetCategoryList(context.Background())

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, categories, tt.expectedLen)
				assert.Equal(t, tt.expectedFirstName, categories[0].Name)
			}
		})
	}
}

func TestCategoryUsecase_GetCategoryById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockCategoryRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().GetCategoryById(gomock.Any(), int64(1)).Return(domain.Category{Id: 1, Name: "Food"}, nil)
			},
			expectedName: "Food",
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().GetCategoryById(gomock.Any(), int64(99)).Return(domain.Category{}, &domain.Error{Type: domain.NotFound, Message: "Category not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockCategoryRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewCategoryUsecase(mockRepo)
			category, err := usecase.GetCategoryById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
				assert.Equal(t, int64(0), category.Id)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, category.Name)
			}
		})
	}
}

func TestCategoryUsecase_CreateCategory(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Category
		setupMock     func(r *mock.MockCategoryRepository)
		expectedId    int64
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name:  "success",
			input: domain.Category{Name: "Snacks"},
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().CreateCategory(gomock.Any(), domain.Category{Name: "Snacks"}).Return(domain.Category{Id: 3, Name: "Snacks"}, nil)
			},
			expectedId:   3,
			expectedName: "Snacks",
		},
		{
			name:  "repository error",
			input: domain.Category{Name: "Snacks"},
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().CreateCategory(gomock.Any(), gomock.Any()).Return(domain.Category{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockCategoryRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewCategoryUsecase(mockRepo)
			category, err := usecase.CreateCategory(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, category.Id)
				assert.Equal(t, tt.expectedName, category.Name)
			}
		})
	}
}

func TestCategoryUsecase_UpdateCategoryById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		input         domain.Category
		setupMock     func(r *mock.MockCategoryRepository)
		expectedId    int64
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name:  "success",
			id:    2,
			input: domain.Category{Name: "Beverages"},
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().UpdateCategoryById(gomock.Any(), domain.Category{Name: "Beverages"}, int64(2)).Return(domain.Category{Id: 2, Name: "Beverages"}, nil)
			},
			expectedId:   2,
			expectedName: "Beverages",
		},
		{
			name:  "not found",
			id:    99,
			input: domain.Category{Name: "Beverages"},
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().UpdateCategoryById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Category{}, &domain.Error{Type: domain.NotFound, Message: "Category not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockCategoryRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewCategoryUsecase(mockRepo)
			category, err := usecase.UpdateCategoryById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedId, category.Id)
				assert.Equal(t, tt.expectedName, category.Name)
			}
		})
	}
}

func TestCategoryUsecase_DeleteCategoryById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockCategoryRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().DeleteCategoryById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockCategoryRepository) {
				r.EXPECT().DeleteCategoryById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "Category not found"})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockCategoryRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewCategoryUsecase(mockRepo)
			err := usecase.DeleteCategoryById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
