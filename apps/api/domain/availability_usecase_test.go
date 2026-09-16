package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newAvailabilityUsecase(ctrl *gomock.Controller) (domain.AvailabilityUsecase, *mock.MockAvailabilityRepository, *mock.MockProductRepository, *mock.MockVariantRepository) {
	mockAvailabilityRepo := mock.NewMockAvailabilityRepository(ctrl)
	mockProductRepo := mock.NewMockProductRepository(ctrl)
	mockVariantRepo := mock.NewMockVariantRepository(ctrl)
	usecase := domain.NewAvailabilityUsecase(mockAvailabilityRepo, mockProductRepo, mockVariantRepo)
	return usecase, mockAvailabilityRepo, mockProductRepo, mockVariantRepo
}

func expectEmptyAvailabilityProductList(r *mock.MockProductRepository, times int) {
	purchase := domain.SaleTypePurchase
	published := domain.ProductStatusPublished
	r.EXPECT().GetProductList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 0, &purchase, &published).
		Return([]domain.Product{}, nil).Times(times)
}

func TestAvailabilityUsecase_GetAvailabilityList(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	usecase, _, mockProductRepo, mockVariantRepo := newAvailabilityUsecase(ctrl)

	purchase := domain.SaleTypePurchase
	published := domain.ProductStatusPublished

	product := domain.Product{
		Id:                   1,
		Name:                 "Soft Cookies",
		Category:             domain.Category{Id: 10, Name: "Snacks"},
		CategoryId:           10,
		Status:               domain.ProductStatusPublished,
		SaleType:             domain.SaleTypePurchase,
		IsAvailable:          true,
		AvailabilityTracking: domain.AvailabilityTrackingVariant,
	}

	quantity := 3
	variant := domain.Variant{Id: 1, ProductId: 1, Name: "Choco", IsAvailable: true, AvailableQuantity: &quantity}

	mockProductRepo.EXPECT().GetProductList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 0, &purchase, &published).
		Return([]domain.Product{product}, nil)
	mockVariantRepo.EXPECT().GetVariantList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return([]domain.Variant{variant}, nil)

	availabilityProducts, err := usecase.GetAvailabilityList(context.Background())

	assert.Nil(t, err)
	assert.Len(t, availabilityProducts, 1)
	assert.Equal(t, "Soft Cookies", availabilityProducts[0].ProductName)
	assert.Equal(t, "Snacks", availabilityProducts[0].CategoryName)
	assert.Len(t, availabilityProducts[0].Variants, 1)
	assert.Equal(t, "Choco", availabilityProducts[0].Variants[0].VariantName)
	assert.True(t, availabilityProducts[0].Variants[0].IsSellable)
	assert.Equal(t, 3, *availabilityProducts[0].Variants[0].SellableQuantity)
}

func TestAvailabilityUsecase_UpdateAvailability(t *testing.T) {
	falseValue := false
	quantity5 := 5
	negativeQuantity := -1

	tests := []struct {
		name           string
		productUpdates []domain.AvailabilityProductUpdate
		variantUpdates []domain.AvailabilityVariantUpdate
		setupMock      func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository)
		expectedError  *domain.Error
	}{
		{
			name:           "partial product update leaves quantity untouched",
			productUpdates: []domain.AvailabilityProductUpdate{{ProductId: 1, IsAvailable: &falseValue}},
			setupMock: func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
				productRepo.EXPECT().GetProductById(gomock.Any(), int64(1)).
					Return(domain.Product{Id: 1, Name: "Es Kopi Susu", AvailabilityTracking: domain.AvailabilityTrackingNone}, nil)
				availabilityRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				availabilityRepo.EXPECT().UpdateProductAvailability(gomock.Any(), int64(1), &falseValue, (*int)(nil)).Return(nil)
				expectEmptyAvailabilityProductList(productRepo, 1)
			},
		},
		{
			name:           "rejects quantity against tracking = none",
			productUpdates: []domain.AvailabilityProductUpdate{{ProductId: 1, AvailableQuantity: &quantity5}},
			setupMock: func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
				productRepo.EXPECT().GetProductById(gomock.Any(), int64(1)).
					Return(domain.Product{Id: 1, Name: "Es Kopi Susu", AvailabilityTracking: domain.AvailabilityTrackingNone}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:           "rejects a negative product quantity",
			productUpdates: []domain.AvailabilityProductUpdate{{ProductId: 1, AvailableQuantity: &negativeQuantity}},
			setupMock: func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:           "rejects a negative variant quantity",
			variantUpdates: []domain.AvailabilityVariantUpdate{{VariantId: 1, AvailableQuantity: &negativeQuantity}},
			setupMock: func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:           "rejects a variant quantity when tracked at the product level",
			variantUpdates: []domain.AvailabilityVariantUpdate{{VariantId: 1, AvailableQuantity: &quantity5}},
			setupMock: func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).
					Return(domain.Variant{Id: 1, Name: "Choco", Product: domain.Product{AvailabilityTracking: domain.AvailabilityTrackingProduct}}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:           "updates a variant quantity when tracked at the variant level",
			variantUpdates: []domain.AvailabilityVariantUpdate{{VariantId: 1, AvailableQuantity: &quantity5}},
			setupMock: func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).
					Return(domain.Variant{Id: 1, Name: "Choco", Product: domain.Product{AvailabilityTracking: domain.AvailabilityTrackingVariant}}, nil)
				availabilityRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				availabilityRepo.EXPECT().UpdateVariantAvailability(gomock.Any(), int64(1), (*bool)(nil), &quantity5).Return(nil)
				expectEmptyAvailabilityProductList(productRepo, 1)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			usecase, mockAvailabilityRepo, mockProductRepo, mockVariantRepo := newAvailabilityUsecase(ctrl)
			tt.setupMock(mockAvailabilityRepo, mockProductRepo, mockVariantRepo)

			_, err := usecase.UpdateAvailability(context.Background(), tt.productUpdates, tt.variantUpdates)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}
