package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newProductUsecase(ctrl *gomock.Controller) (domain.ProductUsecase, *mock.MockProductRepository, *mock.MockVariantRepository) {
	mockRepo := mock.NewMockProductRepository(ctrl)
	mockVariantRepo := mock.NewMockVariantRepository(ctrl)
	return domain.NewProductUsecase(mockRepo, mockVariantRepo), mockRepo, mockVariantRepo
}

func expectNoVariants(r *mock.MockVariantRepository, times int) {
	r.EXPECT().GetVariantList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return([]domain.Variant{}, nil).Times(times)
}

func TestProductUsecase_GetProductList(t *testing.T) {
	draft := domain.ProductStatusDraft

	tests := []struct {
		name              string
		status            *domain.ProductStatus
		setupMock         func(r *mock.MockProductRepository)
		setupVariantsMock func(r *mock.MockVariantRepository)
		expectedLen       int
		expectedError     *domain.Error
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil, nil).
					Return([]domain.Product{{Id: 1, Name: "Coffee"}, {Id: 2, Name: "Tea"}}, nil)
				r.EXPECT().GetProductListTotal(gomock.Any(), "", nil, nil).Return(int64(2), nil)
			},
			setupVariantsMock: func(r *mock.MockVariantRepository) { expectNoVariants(r, 2) },
			expectedLen:       2,
		},
		{
			name:   "filters by status",
			status: &draft,
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil, &draft).
					Return([]domain.Product{{Id: 1, Name: "Coffee", Status: domain.ProductStatusDraft}}, nil)
				r.EXPECT().GetProductListTotal(gomock.Any(), "", nil, &draft).Return(int64(1), nil)
			},
			setupVariantsMock: func(r *mock.MockVariantRepository) { expectNoVariants(r, 1) },
			expectedLen:       1,
		},
		{
			name: "error on list",
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, mockRepo, mockVariantRepo := newProductUsecase(ctrl)
			tt.setupMock(mockRepo)
			if tt.setupVariantsMock != nil {
				tt.setupVariantsMock(mockVariantRepo)
			}

			products, _, err := usecase.GetProductList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil, tt.status)

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

func TestProductUsecase_GetProductList_resolvesAvailability(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	usecase, mockRepo, mockVariantRepo := newProductUsecase(ctrl)

	product := domain.Product{
		Id:                   1,
		Name:                 "Es Kopi Susu",
		Status:               domain.ProductStatusPublished,
		SaleType:             domain.SaleTypePurchase,
		IsAvailable:          true,
		AvailabilityTracking: domain.AvailabilityTrackingNone,
	}

	mockRepo.EXPECT().GetProductList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil, nil).
		Return([]domain.Product{product}, nil)
	mockRepo.EXPECT().GetProductListTotal(gomock.Any(), "", nil, nil).Return(int64(1), nil)
	mockVariantRepo.EXPECT().GetVariantList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return([]domain.Variant{{Id: 1, ProductId: 1, Product: product, IsAvailable: true}}, nil)

	products, _, err := usecase.GetProductList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, nil, nil)

	assert.Nil(t, err)
	assert.True(t, products[0].IsSellable)
	assert.Nil(t, products[0].RemainingQuantity)
}

func TestProductUsecase_GetProductById(t *testing.T) {
	tests := []struct {
		name              string
		id                int64
		setupMock         func(r *mock.MockProductRepository)
		setupVariantsMock func(r *mock.MockVariantRepository)
		expectedName      string
		expectedError     *domain.Error
	}{
		{
			name: "success",
			id:   1,
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, Name: "Coffee"}, nil)
			},
			setupVariantsMock: func(r *mock.MockVariantRepository) { expectNoVariants(r, 1) },
			expectedName:      "Coffee",
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

			usecase, mockRepo, mockVariantRepo := newProductUsecase(ctrl)
			tt.setupMock(mockRepo)
			if tt.setupVariantsMock != nil {
				tt.setupVariantsMock(mockVariantRepo)
			}

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

func TestProductUsecase_CreateProduct(t *testing.T) {
	tests := []struct {
		name              string
		input             domain.Product
		setupMock         func(r *mock.MockProductRepository)
		setupVariantsMock func(r *mock.MockVariantRepository)
		expectedName      string
		expectedError     *domain.Error
	}{
		{
			name:  "success",
			input: domain.Product{Name: "Espresso", Description: ptrString("Rich and bold espresso shot")},
			setupMock: func(r *mock.MockProductRepository) {
				r.EXPECT().CreateProduct(gomock.Any(), gomock.Any()).Return(domain.Product{Id: 1, Name: "Espresso"}, nil)
			},
			setupVariantsMock: func(r *mock.MockVariantRepository) { expectNoVariants(r, 1) },
			expectedName:      "Espresso",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, mockRepo, mockVariantRepo := newProductUsecase(ctrl)
			tt.setupMock(mockRepo)
			if tt.setupVariantsMock != nil {
				tt.setupVariantsMock(mockVariantRepo)
			}

			product, err := usecase.CreateProduct(context.Background(), tt.input)

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
		name              string
		id                int64
		input             domain.Product
		setupMock         func(r *mock.MockProductRepository)
		setupVariantsMock func(r *mock.MockVariantRepository)
		expectedName      string
		expectedError     *domain.Error
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
			setupVariantsMock: func(r *mock.MockVariantRepository) { expectNoVariants(r, 1) },
			expectedName:      "Espresso",
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

			usecase, mockRepo, mockVariantRepo := newProductUsecase(ctrl)
			tt.setupMock(mockRepo)
			if tt.setupVariantsMock != nil {
				tt.setupVariantsMock(mockVariantRepo)
			}

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

			usecase, mockRepo, _ := newProductUsecase(ctrl)
			tt.setupMock(mockRepo)

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
