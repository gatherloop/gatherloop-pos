package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestStockCheckUsecase_GetStockCheckList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().GetStockCheckList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.StockCheck{{Id: 1}, {Id: 2}}, nil)
				sc.EXPECT().GetStockCheckListTotal(gomock.Any()).Return(int64(2), nil)
			},
			expectedLen: 2,
		},
		{
			name: "repo error",
			setupMock: func(sc *mock.MockStockCheckRepository, m *mock.MockMaterialRepository) {
				sc.EXPECT().GetStockCheckList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			scRepo := mock.NewMockStockCheckRepository(ctrl)
			matRepo := mock.NewMockMaterialRepository(ctrl)
			tt.setupMock(scRepo, matRepo)
			usecase := domain.NewStockCheckUsecase(scRepo, matRepo)
			result, _, err := usecase.GetStockCheckList(context.Background(), domain.CreatedAt, domain.Descending, 0, 10)
			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, result, tt.expectedLen)
			}
		})
	}
}

func TestStockCheckUsecase_CreateStockCheck_SnapshotsMaterialFields(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	scRepo := mock.NewMockStockCheckRepository(ctrl)
	matRepo := mock.NewMockMaterialRepository(ctrl)

	matRepo.EXPECT().GetMaterialList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Material{
		{
			Id:               1,
			Name:             "Tepung",
			Price:            15,
			PurchaseUnit:     "Kg",
			PurchaseUnitSize: 1000,
			MinimumStock:     1,
			NormalStock:      5,
		},
	}, nil)

	var captured domain.StockCheck
	scRepo.EXPECT().CreateStockCheck(gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, sc domain.StockCheck) (domain.StockCheck, *domain.Error) {
		captured = sc
		return domain.StockCheck{Id: 1, Items: sc.Items}, nil
	})

	usecase := domain.NewStockCheckUsecase(scRepo, matRepo)
	_, err := usecase.CreateStockCheck(context.Background(), []domain.StockCheckItemRequest{
		{MaterialId: 1, CurrentStock: 3},
	})

	assert.Nil(t, err)
	assert.Len(t, captured.Items, 1)
	assert.Equal(t, int64(3), captured.Items[0].CurrentStock)
	assert.Equal(t, "Tepung", captured.Items[0].MaterialName)
	assert.Equal(t, float32(15), captured.Items[0].Price)
	assert.Equal(t, "Kg", captured.Items[0].PurchaseUnit)
	assert.Equal(t, float32(1000), captured.Items[0].PurchaseUnitSize)
	assert.Equal(t, int64(1), captured.Items[0].MinimumStock)
	assert.Equal(t, int64(5), captured.Items[0].NormalStock)
}

func TestStockCheckUsecase_CreateStockCheck_DefaultsToZeroForMissingItems(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	scRepo := mock.NewMockStockCheckRepository(ctrl)
	matRepo := mock.NewMockMaterialRepository(ctrl)

	matRepo.EXPECT().GetMaterialList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Material{
		{Id: 1, Name: "Tepung"},
		{Id: 2, Name: "Susu"},
	}, nil)

	var captured domain.StockCheck
	scRepo.EXPECT().CreateStockCheck(gomock.Any(), gomock.Any()).DoAndReturn(func(_ context.Context, sc domain.StockCheck) (domain.StockCheck, *domain.Error) {
		captured = sc
		return domain.StockCheck{Id: 1, Items: sc.Items}, nil
	})

	usecase := domain.NewStockCheckUsecase(scRepo, matRepo)
	// Only provide currentStock for material 1; material 2 should default to 0
	_, err := usecase.CreateStockCheck(context.Background(), []domain.StockCheckItemRequest{
		{MaterialId: 1, CurrentStock: 5},
	})

	assert.Nil(t, err)
	assert.Len(t, captured.Items, 2)
	assert.Equal(t, int64(5), captured.Items[0].CurrentStock) // material 1
	assert.Equal(t, int64(0), captured.Items[1].CurrentStock) // material 2 defaults to 0
}

func TestStockCheckUsecase_GetPurchaseList(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	scRepo := mock.NewMockStockCheckRepository(ctrl)
	matRepo := mock.NewMockMaterialRepository(ctrl)

	scRepo.EXPECT().GetStockCheckById(gomock.Any(), int64(1)).Return(domain.StockCheck{
		Id: 1,
		Items: []domain.StockCheckItem{
			{
				MaterialId:       1,
				MaterialName:     "Tepung",
				CurrentStock:     0,
				Price:            15,
				PurchaseUnit:     "Kg",
				PurchaseUnitSize: 1000,
				MinimumStock:     1,
				NormalStock:      5,
			},
			{
				MaterialId:       2,
				MaterialName:     "Susu",
				CurrentStock:     3,
				Price:            20,
				PurchaseUnit:     "L",
				PurchaseUnitSize: 1000,
				MinimumStock:     0,
				NormalStock:      0, // unconfigured — excluded
			},
		},
	}, nil)

	usecase := domain.NewStockCheckUsecase(scRepo, matRepo)
	pl, err := usecase.GetPurchaseList(context.Background(), 1)

	assert.Nil(t, err)
	assert.Equal(t, int64(1), pl.StockCheckId)
	assert.Len(t, pl.Items, 1)

	item := pl.Items[0]
	assert.Equal(t, int64(1), item.MaterialId)
	assert.Equal(t, int64(5), item.PurchaseQuantity)
	assert.InDelta(t, float64(5*1000*15), item.EstimatedCost, 0.01) // 75000
	assert.InDelta(t, float64(5*1000*15), pl.TotalEstimatedCost, 0.01)
}

func TestStockCheckUsecase_GetPurchaseList_ExcludesUnconfiguredPolicy(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	scRepo := mock.NewMockStockCheckRepository(ctrl)
	matRepo := mock.NewMockMaterialRepository(ctrl)

	scRepo.EXPECT().GetStockCheckById(gomock.Any(), int64(1)).Return(domain.StockCheck{
		Id: 1,
		Items: []domain.StockCheckItem{
			{
				MaterialId:   1,
				CurrentStock: 0,
				MinimumStock: 0,
				NormalStock:  0, // normal_stock <= minimum_stock → excluded
			},
		},
	}, nil)

	usecase := domain.NewStockCheckUsecase(scRepo, matRepo)
	pl, err := usecase.GetPurchaseList(context.Background(), 1)

	assert.Nil(t, err)
	assert.Empty(t, pl.Items)
	assert.Equal(t, float64(0), pl.TotalEstimatedCost)
}
