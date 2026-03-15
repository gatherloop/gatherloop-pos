package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestProductUsecase_GetProductList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(r *mock.MockProductRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil).
					Return([]domain.Product{{Id: 1, Name: "Coffee"}, {Id: 2, Name: "Tea"}}, nil)
				r.EXPECT().GetProductListTotal(gomock.Any(), "", nil).Return(int64(2), nil)
			},
			expectedLen: 2,
		},
		{
			name: "error on list",
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewProductUsecase(mockRepo)
			products, _, err := usecase.GetProductList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, products, tt.expectedLen)
			}
		})
	}
}

func TestProductUsecase_GetProductById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockProductRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, Name: "Coffee"}, nil)
			},
			expectedName: "Coffee",
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductById(gomock.Any(), int64(99)).Return(domain.Product{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewProductUsecase(mockRepo)
			product, err := usecase.GetProductById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, product.Name)
			}
		})
	}
}

func TestProductUsecase_UpdateProductById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		input         domain.Product
		setupMock     func(r *mock.MockProductRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name:  "success — uses BeginTransaction",
			id:    1,
			input: domain.Product{Name: "Espresso"},
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().UpdateProductById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Product{Id: 1, Name: "Espresso"}, nil)
			},
			expectedName: "Espresso",
		},
		{
			name:  "not found inside transaction",
			id:    99,
			input: domain.Product{Name: "Espresso"},
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				r.EXPECT().UpdateProductById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Product{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewProductUsecase(mockRepo)
			product, err := usecase.UpdateProductById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedName, product.Name)
			}
		})
	}
}

func TestProductUsecase_DeleteProductById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		setupMock     func(r *mock.MockProductRepository)
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().DeleteProductById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "not found",
			id:   99,
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().DeleteProductById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(mockRepo)

			usecase := domain.NewProductUsecase(mockRepo)
			err := usecase.DeleteProductById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
