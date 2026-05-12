package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newVariantUsecase(ctrl *gomock.Controller, variantRepo *mock.MockVariantRepository, productRepo *mock.MockProductRepository, tierRepo *mock.MockPricingTierRepository) domain.VariantUsecase {
	return domain.NewVariantUsecase(variantRepo, productRepo, tierRepo)
}

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

			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tierRepo := mock.NewMockPricingTierRepository(ctrl)
			tt.setupMock(variantRepo)

			usecase := newVariantUsecase(ctrl, variantRepo, productRepo, tierRepo)
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

			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tierRepo := mock.NewMockPricingTierRepository(ctrl)
			tt.setupMock(variantRepo)

			usecase := newVariantUsecase(ctrl, variantRepo, productRepo, tierRepo)
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

func TestVariantUsecase_CreateVariant(t *testing.T) {
	validPurchaseVariant := domain.Variant{ProductId: 1, Name: "Regular", Price: 10000}
	validRentalVariant := domain.Variant{
		ProductId: 2,
		Name:      "Hourly",
		PricingTiers: []domain.PricingTier{
			{UpToMinutes: 60, Price: 15000},
			{UpToMinutes: 120, Price: 30000},
		},
	}

	tests := []struct {
		name          string
		input         domain.Variant
		setupMock     func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository)
		expectedError *domain.Error
		checkResult   func(t *testing.T, v domain.Variant)
	}{
		{
			name:  "success — purchase variant",
			input: validPurchaseVariant,
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				pr.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, SaleType: domain.SaleTypePurchase}, nil)
				vr.EXPECT().CreateVariant(gomock.Any(), gomock.Any()).Return(domain.Variant{Id: 10, Name: "Regular", Price: 10000}, nil)
			},
			checkResult: func(t *testing.T, v domain.Variant) {
				assert.Equal(t, float32(10000), v.Price)
				assert.Empty(t, v.PricingTiers)
			},
		},
		{
			name:  "success — rental variant with tiers",
			input: validRentalVariant,
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				pr.EXPECT().GetProductById(gomock.Any(), int64(2)).Return(domain.Product{Id: 2, SaleType: domain.SaleTypeRental}, nil)
				vr.EXPECT().CreateVariant(gomock.Any(), gomock.Any()).Return(domain.Variant{Id: 20, Name: "Hourly", Price: 0}, nil)
				tr.EXPECT().ReplaceTiersForVariant(gomock.Any(), int64(20), gomock.Any()).Return(nil)
			},
			checkResult: func(t *testing.T, v domain.Variant) {
				assert.Equal(t, float32(0), v.Price)
				assert.Len(t, v.PricingTiers, 2)
			},
		},
		{
			name:  "reject — purchase variant with price = 0",
			input: domain.Variant{ProductId: 1, Name: "Bad", Price: 0},
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				pr.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, SaleType: domain.SaleTypePurchase}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "reject — purchase variant with pricing tiers",
			input: domain.Variant{
				ProductId:    1,
				Name:         "Bad",
				Price:        5000,
				PricingTiers: []domain.PricingTier{{UpToMinutes: 60, Price: 15000}},
			},
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				pr.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, SaleType: domain.SaleTypePurchase}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "reject — rental variant with no tiers",
			input: domain.Variant{ProductId: 2, Name: "Bad"},
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				pr.EXPECT().GetProductById(gomock.Any(), int64(2)).Return(domain.Product{Id: 2, SaleType: domain.SaleTypeRental}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "reject — rental variant with non-ascending tier minutes",
			input: domain.Variant{
				ProductId: 2,
				Name:      "Bad",
				PricingTiers: []domain.PricingTier{
					{UpToMinutes: 120, Price: 30000},
					{UpToMinutes: 60, Price: 15000},
				},
			},
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				pr.EXPECT().GetProductById(gomock.Any(), int64(2)).Return(domain.Product{Id: 2, SaleType: domain.SaleTypeRental}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tierRepo := mock.NewMockPricingTierRepository(ctrl)
			tt.setupMock(variantRepo, productRepo, tierRepo)

			usecase := newVariantUsecase(ctrl, variantRepo, productRepo, tierRepo)
			result, err := usecase.CreateVariant(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				if tt.checkResult != nil {
					tt.checkResult(t, result)
				}
			}
		})
	}
}

func TestVariantUsecase_UpdateVariantById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		input         domain.Variant
		setupMock     func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository)
		expectedName  string
		expectedError *domain.Error
	}{
		{
			name:  "success — purchase variant",
			id:    1,
			input: domain.Variant{Name: "Medium", Price: 8000},
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				vr.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error {
						return cb(ctx)
					})
				vr.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 10}, nil)
				pr.EXPECT().GetProductById(gomock.Any(), int64(10)).Return(domain.Product{Id: 10, SaleType: domain.SaleTypePurchase}, nil)
				vr.EXPECT().UpdateVariantById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Name: "Medium", Price: 8000}, nil)
			},
			expectedName: "Medium",
		},
		{
			name: "success — rental variant with tiers",
			id:   2,
			input: domain.Variant{
				Name: "Hourly",
				PricingTiers: []domain.PricingTier{
					{UpToMinutes: 60, Price: 15000},
					{UpToMinutes: 120, Price: 30000},
				},
			},
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				vr.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error {
						return cb(ctx)
					})
				vr.EXPECT().GetVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, ProductId: 20}, nil)
				pr.EXPECT().GetProductById(gomock.Any(), int64(20)).Return(domain.Product{Id: 20, SaleType: domain.SaleTypeRental}, nil)
				vr.EXPECT().UpdateVariantById(gomock.Any(), gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, Name: "Hourly", Price: 0}, nil)
				tr.EXPECT().ReplaceTiersForVariant(gomock.Any(), int64(2), gomock.Any()).Return(nil)
			},
			expectedName: "Hourly",
		},
		{
			name:  "not found inside transaction",
			id:    99,
			input: domain.Variant{Name: "Medium", Price: 5000},
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				vr.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error {
						return cb(ctx)
					})
				vr.EXPECT().GetVariantById(gomock.Any(), int64(99)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name:  "reject — purchase variant with price = 0",
			id:    1,
			input: domain.Variant{Name: "Bad", Price: 0},
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				vr.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error {
						return cb(ctx)
					})
				vr.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 10}, nil)
				pr.EXPECT().GetProductById(gomock.Any(), int64(10)).Return(domain.Product{Id: 10, SaleType: domain.SaleTypePurchase}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:  "reject — rental variant with no tiers",
			id:    2,
			input: domain.Variant{Name: "Bad"},
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository, tr *mock.MockPricingTierRepository) {
				vr.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error {
						return cb(ctx)
					})
				vr.EXPECT().GetVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, ProductId: 20}, nil)
				pr.EXPECT().GetProductById(gomock.Any(), int64(20)).Return(domain.Product{Id: 20, SaleType: domain.SaleTypeRental}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tierRepo := mock.NewMockPricingTierRepository(ctrl)
			tt.setupMock(variantRepo, productRepo, tierRepo)

			usecase := newVariantUsecase(ctrl, variantRepo, productRepo, tierRepo)
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

			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tierRepo := mock.NewMockPricingTierRepository(ctrl)
			tt.setupMock(variantRepo)

			usecase := newVariantUsecase(ctrl, variantRepo, productRepo, tierRepo)
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
